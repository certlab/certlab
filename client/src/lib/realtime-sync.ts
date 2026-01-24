/**
 * Real-Time Sync Manager for Firestore
 *
 * Manages real-time subscriptions to Firestore collections and handles
 * edge cases for multi-client synchronization.
 *
 * Features:
 * - Real-time listeners with automatic cleanup
 * - Conflict detection and resolution
 * - Deletion propagation across clients
 * - Rollback support for failed operations
 * - Optimistic updates with version checking
 *
 * @module realtime-sync
 */

import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy as firestoreOrderBy,
  limit as firestoreLimit,
  type Unsubscribe,
  type DocumentSnapshot,
  type QuerySnapshot,
  type DocumentData,
  writeBatch,
  runTransaction,
  serverTimestamp,
  type Transaction,
} from 'firebase/firestore';
import { logError, logInfo } from './errors';

/**
 * Callback for document changes
 */
export type DocumentChangeCallback<T = any> = (
  data: T | null,
  metadata: {
    fromCache: boolean;
    hasPendingWrites: boolean;
    isDeleted: boolean;
  }
) => void;

/**
 * Callback for collection changes
 */
export type CollectionChangeCallback<T = any> = (
  data: T[],
  metadata: {
    fromCache: boolean;
    hasPendingWrites: boolean;
    changes: Array<{ type: 'added' | 'modified' | 'removed'; doc: T }>;
  }
) => void;

/**
 * Subscription options
 */
export interface SubscriptionOptions {
  /**
   * Whether to include metadata about the snapshot source
   */
  includeMetadataChanges?: boolean;

  /**
   * Error handler for the subscription
   */
  onError?: (error: Error) => void;
}

/**
 * Real-time subscription manager
 */
class RealtimeSyncManager {
  private subscriptions = new Map<string, Unsubscribe>();
  private operationHistory = new Map<
    string,
    Array<{ operation: string; data: any; timestamp: Date }>
  >();
  private subscriptionCounter = 0;

  /**
   * Generate a unique subscription ID
   */
  private generateSubscriptionId(prefix: string): string {
    this.subscriptionCounter++;
    return `${prefix}:${Date.now()}:${this.subscriptionCounter}`;
  }

  /**
   * Subscribe to a single document
   */
  subscribeToDocument<T = DocumentData>(
    path: string,
    callback: DocumentChangeCallback<T>,
    options: SubscriptionOptions = {}
  ): string {
    try {
      const db = getFirestore();
      const docRef = doc(db, path);
      const subscriptionId = this.generateSubscriptionId(`doc:${path}`);

      const unsubscribe = onSnapshot(
        docRef,
        {
          includeMetadataChanges: options.includeMetadataChanges ?? true,
        },
        (snapshot: DocumentSnapshot) => {
          const rawData = snapshot.exists() ? (snapshot.data() as T & { deleted?: boolean }) : null;
          const isSoftDeleted = !!rawData && rawData.deleted === true;
          const data = snapshot.exists() ? (rawData as T) : null;
          const metadata = {
            fromCache: snapshot.metadata.fromCache,
            hasPendingWrites: snapshot.metadata.hasPendingWrites,
            // Treat both hard deletes (no document) and soft deletes (deleted === true) as deleted
            isDeleted: !snapshot.exists() || isSoftDeleted,
          };

          callback(data, metadata);
        },
        (error: Error) => {
          logError('subscribeToDocument', error);
          if (options.onError) {
            options.onError(error);
          }
        }
      );

      this.subscriptions.set(subscriptionId, unsubscribe);
      logInfo('subscribeToDocument', { path, subscriptionId });

      return subscriptionId;
    } catch (error) {
      logError('subscribeToDocument', error);
      throw error;
    }
  }

  /**
   * Subscribe to a collection or query
   */
  subscribeToCollection<T = DocumentData>(
    collectionPath: string,
    callback: CollectionChangeCallback<T>,
    options: SubscriptionOptions & {
      filters?: Array<{ field: string; operator: any; value: any }>;
      orderBy?: { field: string; direction?: 'asc' | 'desc' };
      limit?: number;
    } = {}
  ): string {
    try {
      const db = getFirestore();
      let collectionRef: any = collection(db, collectionPath);

      // Apply filters
      if (options.filters && options.filters.length > 0) {
        const constraints = options.filters.map((f) => where(f.field, f.operator, f.value));
        collectionRef = query(collectionRef, ...constraints);
      }

      // Apply ordering
      if (options.orderBy) {
        collectionRef = query(
          collectionRef,
          firestoreOrderBy(options.orderBy.field, options.orderBy.direction || 'asc')
        );
      }

      // Apply limit
      if (options.limit) {
        collectionRef = query(collectionRef, firestoreLimit(options.limit));
      }

      const subscriptionId = this.generateSubscriptionId(`col:${collectionPath}`);

      const unsubscribe = onSnapshot(
        collectionRef,
        {
          includeMetadataChanges: options.includeMetadataChanges ?? true,
        },
        (snapshot: QuerySnapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as T[];

          const changes = snapshot.docChanges().map((change) => ({
            type: change.type,
            doc: {
              id: change.doc.id,
              ...change.doc.data(),
            } as T,
          }));

          const metadata = {
            fromCache: snapshot.metadata.fromCache,
            hasPendingWrites: snapshot.metadata.hasPendingWrites,
            changes,
          };

          callback(data, metadata);
        },
        (error: Error) => {
          logError('subscribeToCollection', error);
          if (options.onError) {
            options.onError(error);
          }
        }
      );

      this.subscriptions.set(subscriptionId, unsubscribe);
      logInfo('subscribeToCollection', { collectionPath, subscriptionId });

      return subscriptionId;
    } catch (error) {
      logError('subscribeToCollection', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from a specific subscription
   */
  unsubscribe(subscriptionId: string): void {
    const unsubscribe = this.subscriptions.get(subscriptionId);
    if (unsubscribe) {
      unsubscribe();
      this.subscriptions.delete(subscriptionId);
      logInfo('unsubscribe', { subscriptionId });
    }
  }

  /**
   * Unsubscribe from all subscriptions
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach((unsubscribe, id) => {
      unsubscribe();
      logInfo('unsubscribe', { subscriptionId: id });
    });
    this.subscriptions.clear();
  }

  /**
   * Get count of active subscriptions
   */
  getActiveSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Execute a transaction with automatic rollback on failure
   */
  async executeTransaction<T>(transactionFn: (transaction: Transaction) => Promise<T>): Promise<T> {
    try {
      const db = getFirestore();
      const result = await runTransaction(db, transactionFn);
      logInfo('executeTransaction', { success: true });
      return result;
    } catch (error) {
      logError('executeTransaction', error);
      throw error;
    }
  }

  /**
   * Execute a batch write operation
   */
  async executeBatch(
    operations: Array<{
      type: 'set' | 'update' | 'delete';
      path: string;
      data?: any;
      merge?: boolean;
    }>
  ): Promise<void> {
    try {
      const db = getFirestore();
      const batch = writeBatch(db);

      for (const op of operations) {
        const docRef = doc(db, op.path);

        switch (op.type) {
          case 'set':
            if (!op.data) {
              throw new Error(`data is required for 'set' operation on path: ${op.path}`);
            }
            batch.set(
              docRef,
              { ...op.data, updatedAt: serverTimestamp() },
              { merge: op.merge ?? false }
            );
            break;
          case 'update':
            if (!op.data) {
              throw new Error(`data is required for 'update' operation on path: ${op.path}`);
            }
            batch.update(docRef, { ...op.data, updatedAt: serverTimestamp() });
            break;
          case 'delete':
            batch.delete(docRef);
            break;
        }
      }

      await batch.commit();
      logInfo('executeBatch', { operationCount: operations.length });
    } catch (error) {
      logError('executeBatch', error);
      throw error;
    }
  }

  /**
   * Record an operation in history for potential rollback
   */
  recordOperation(documentPath: string, operation: string, data: any): void {
    const history = this.operationHistory.get(documentPath) || [];
    history.push({
      operation,
      data,
      timestamp: new Date(),
    });

    // Keep only last 10 operations per document
    if (history.length > 10) {
      history.shift();
    }

    this.operationHistory.set(documentPath, history);
  }

  /**
   * Get operation history for a document
   */
  getOperationHistory(
    documentPath: string
  ): Array<{ operation: string; data: any; timestamp: Date }> {
    return this.operationHistory.get(documentPath) || [];
  }

  /**
   * Clear operation history for a document
   */
  clearOperationHistory(documentPath: string): void {
    this.operationHistory.delete(documentPath);
  }

  /**
   * Clear all operation history
   */
  clearAllHistory(): void {
    this.operationHistory.clear();
  }
}

// Export singleton instance
export const realtimeSyncManager = new RealtimeSyncManager();

/**
 * Helper function to create a versioned document update with conflict detection
 */
export async function updateWithVersionCheck(
  documentPath: string,
  updates: any,
  expectedVersion?: number
): Promise<void> {
  const db = getFirestore();
  const docRef = doc(db, documentPath);

  await runTransaction(db, async (transaction) => {
    const docSnap = await transaction.get(docRef);

    if (!docSnap.exists()) {
      throw new Error('Document does not exist');
    }

    const currentData = docSnap.data();
    const currentVersion = currentData.version || 0;

    // Check for version conflict
    if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
      throw new Error(`Version conflict: expected ${expectedVersion}, got ${currentVersion}`);
    }

    // Update with new version
    transaction.update(docRef, {
      ...updates,
      version: currentVersion + 1,
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * Helper function for soft delete (marks as deleted instead of removing)
 */
export async function softDelete(documentPath: string): Promise<void> {
  const db = getFirestore();
  const docRef = doc(db, documentPath);

  await runTransaction(db, async (transaction) => {
    const docSnap = await transaction.get(docRef);

    if (!docSnap.exists()) {
      return; // Already deleted
    }

    const currentData = docSnap.data();
    const currentVersion = currentData.version || 0;

    transaction.update(docRef, {
      deleted: true,
      deletedAt: serverTimestamp(),
      version: currentVersion + 1,
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * Helper function to restore a soft-deleted document
 */
export async function restoreDeleted(documentPath: string): Promise<void> {
  const db = getFirestore();
  const docRef = doc(db, documentPath);

  await runTransaction(db, async (transaction) => {
    const docSnap = await transaction.get(docRef);

    if (!docSnap.exists()) {
      throw new Error('Document does not exist');
    }

    const currentData = docSnap.data();
    const currentVersion = currentData.version || 0;

    transaction.update(docRef, {
      deleted: false,
      deletedAt: null,
      restoredAt: serverTimestamp(),
      version: currentVersion + 1,
      updatedAt: serverTimestamp(),
    });
  });
}
