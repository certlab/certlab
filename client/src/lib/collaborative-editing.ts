/**
 * Collaborative Editing Service
 *
 * Provides real-time collaborative editing functionality for quizzes and materials using Firestore.
 * Features:
 * - Real-time presence tracking (who's editing what)
 * - Document locking with optimistic concurrency control
 * - Conflict detection and resolution
 * - Edit operation tracking for operational transformation
 * - Automatic sync and recovery on network reconnect
 *
 * @module collaborative-editing
 */

import {
  getFirestoreInstance,
  Timestamp,
  timestampToDate,
  dateToTimestamp,
} from './firestore-service';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  increment,
  type Unsubscribe,
} from 'firebase/firestore';
import { logError } from './errors';
import type {
  EditorPresence,
  EditSession,
  DocumentLock,
  EditOperation,
  EditConflict,
} from '@shared/schema';

// ============================================================================
// Color Assignment for Editors
// ============================================================================

const EDITOR_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
];

/**
 * Get a consistent color for a user ID using a hash-based approach
 * This ensures the same user always gets the same color across sessions
 */
function getUserColor(userId: string): string {
  // Simple hash function to map userId to a color
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % EDITOR_COLORS.length;
  return EDITOR_COLORS[index];
}

// ============================================================================
// Presence Management
// ============================================================================

/**
 * Set editor presence in Firestore
 * Creates or updates a presence document showing this user is actively editing
 */
export async function setEditorPresence(
  userId: string,
  userName: string,
  documentType: 'quiz' | 'quizTemplate' | 'lecture' | 'material',
  documentId: string,
  options?: {
    userEmail?: string;
    profileImageUrl?: string;
    editingSection?: string;
  }
): Promise<EditorPresence> {
  try {
    const db = getFirestoreInstance();
    const presenceRef = doc(db, 'presence', documentType, documentId, 'editors', userId);

    const presence: EditorPresence = {
      userId,
      userName,
      userEmail: options?.userEmail,
      profileImageUrl: options?.profileImageUrl,
      color: getUserColor(userId),
      lastSeen: new Date(),
      isActive: true,
      documentType,
      documentId,
      editingSection: options?.editingSection,
    };

    await setDoc(presenceRef, {
      ...presence,
      lastSeen: serverTimestamp(),
    });

    return presence;
  } catch (error) {
    logError('setEditorPresence', error, { userId, documentType, documentId });
    throw error;
  }
}

/**
 * Update editor presence (heartbeat)
 * Call this periodically to keep the presence active
 */
export async function updateEditorPresence(
  userId: string,
  documentType: 'quiz' | 'quizTemplate' | 'lecture' | 'material',
  documentId: string,
  updates?: {
    editingSection?: string;
    cursorPosition?: { fieldId: string; offset: number };
  }
): Promise<void> {
  try {
    const db = getFirestoreInstance();
    const presenceRef = doc(db, 'presence', documentType, documentId, 'editors', userId);

    await updateDoc(presenceRef, {
      lastSeen: serverTimestamp(),
      isActive: true,
      ...updates,
    });
  } catch (error) {
    logError('updateEditorPresence', error, { userId, documentType, documentId });
    throw error;
  }
}

/**
 * Remove editor presence
 * Call when user stops editing or leaves the page
 */
export async function removeEditorPresence(
  userId: string,
  documentType: 'quiz' | 'quizTemplate' | 'lecture' | 'material',
  documentId: string
): Promise<void> {
  try {
    const db = getFirestoreInstance();
    const presenceRef = doc(db, 'presence', documentType, documentId, 'editors', userId);

    await updateDoc(presenceRef, {
      isActive: false,
      lastSeen: serverTimestamp(),
    });
  } catch (error) {
    logError('removeEditorPresence', error, { userId, documentType, documentId });
  }
}

/**
 * Subscribe to active editors for a document
 * Returns unsubscribe function
 */
export function subscribeToEditors(
  documentType: 'quiz' | 'quizTemplate' | 'lecture' | 'material',
  documentId: string,
  callback: (editors: EditorPresence[]) => void
): Unsubscribe {
  try {
    const db = getFirestoreInstance();
    const editorsRef = collection(db, 'presence', documentType, documentId, 'editors');
    const q = query(editorsRef, where('isActive', '==', true));

    return onSnapshot(q, (snapshot) => {
      const editors = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          lastSeen: timestampToDate(data.lastSeen),
        } as EditorPresence;
      });
      callback(editors);
    });
  } catch (error) {
    logError('subscribeToEditors', error, { documentType, documentId });
    return () => {};
  }
}

// ============================================================================
// Document Locking and Version Control
// ============================================================================

/**
 * Initialize or get document lock
 * Uses optimistic locking by default (last-write-wins with conflict detection)
 */
export async function getDocumentLock(
  documentType: 'quiz' | 'quizTemplate' | 'lecture' | 'material',
  documentId: string,
  userId: string
): Promise<DocumentLock> {
  try {
    const db = getFirestoreInstance();
    const lockRef = doc(db, 'locks', documentType, documentId);
    const lockSnap = await getDoc(lockRef);

    if (lockSnap.exists()) {
      const data = lockSnap.data();
      return {
        ...data,
        lockedAt: data.lockedAt ? timestampToDate(data.lockedAt) : undefined,
        lockExpiry: data.lockExpiry ? timestampToDate(data.lockExpiry) : undefined,
        lastModifiedAt: timestampToDate(data.lastModifiedAt),
      } as DocumentLock;
    }

    // Create new lock with version 0
    const newLock: DocumentLock = {
      documentType,
      documentId,
      lockMode: 'optimistic',
      version: 0,
      lastModifiedBy: userId,
      lastModifiedAt: new Date(),
    };

    await setDoc(lockRef, {
      ...newLock,
      lastModifiedAt: serverTimestamp(),
    });

    return newLock;
  } catch (error) {
    logError('getDocumentLock', error, { documentType, documentId });
    throw error;
  }
}

/**
 * Update document lock version after successful edit
 * Increments version and updates last modified metadata
 */
export async function updateDocumentVersion(
  documentType: 'quiz' | 'quizTemplate' | 'lecture' | 'material',
  documentId: string,
  userId: string,
  expectedVersion?: number
): Promise<{ success: boolean; currentVersion: number; conflict?: boolean }> {
  try {
    const db = getFirestoreInstance();
    const lockRef = doc(db, 'locks', documentType, documentId);

    // Get current lock to check version
    const currentLock = await getDocumentLock(documentType, documentId, userId);

    // Check for version conflict if expected version is provided
    if (expectedVersion !== undefined && currentLock.version !== expectedVersion) {
      return {
        success: false,
        currentVersion: currentLock.version,
        conflict: true,
      };
    }

    // Update version and metadata
    await updateDoc(lockRef, {
      version: increment(1),
      lastModifiedBy: userId,
      lastModifiedAt: serverTimestamp(),
    });

    return {
      success: true,
      currentVersion: currentLock.version + 1,
    };
  } catch (error) {
    logError('updateDocumentVersion', error, { documentType, documentId });
    throw error;
  }
}

/**
 * Subscribe to document lock changes
 * Useful for detecting when other users make changes
 */
export function subscribeToDocumentLock(
  documentType: 'quiz' | 'quizTemplate' | 'lecture' | 'material',
  documentId: string,
  callback: (lock: DocumentLock) => void
): Unsubscribe {
  try {
    const db = getFirestoreInstance();
    const lockRef = doc(db, 'locks', documentType, documentId);

    return onSnapshot(lockRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback({
          ...data,
          lockedAt: data.lockedAt ? timestampToDate(data.lockedAt) : undefined,
          lockExpiry: data.lockExpiry ? timestampToDate(data.lockExpiry) : undefined,
          lastModifiedAt: timestampToDate(data.lastModifiedAt),
        } as DocumentLock);
      }
    });
  } catch (error) {
    logError('subscribeToDocumentLock', error, { documentType, documentId });
    return () => {};
  }
}

// ============================================================================
// Edit Session Management
// ============================================================================

/**
 * Start an edit session
 * Tracks user's editing activity for a document
 */
export async function startEditSession(
  userId: string,
  documentType: 'quiz' | 'quizTemplate' | 'lecture' | 'material',
  documentId: string
): Promise<EditSession> {
  try {
    const db = getFirestoreInstance();
    const sessionId = `${userId}_${documentType}_${documentId}_${Date.now()}`;
    const sessionRef = doc(db, 'users', userId, 'editSessions', sessionId);

    const session: EditSession = {
      id: sessionId,
      userId,
      documentType,
      documentId,
      startedAt: new Date(),
      lastActivityAt: new Date(),
      isActive: true,
      editCount: 0,
      conflictsResolved: 0,
    };

    await setDoc(sessionRef, {
      ...session,
      startedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    });

    return session;
  } catch (error) {
    logError('startEditSession', error, { userId, documentType, documentId });
    throw error;
  }
}

/**
 * Update edit session activity
 * Call this after each edit to track progress
 */
export async function updateEditSession(
  userId: string,
  sessionId: string,
  incrementEdits: boolean = true
): Promise<void> {
  try {
    const db = getFirestoreInstance();
    const sessionRef = doc(db, 'users', userId, 'editSessions', sessionId);

    const updates: any = {
      lastActivityAt: serverTimestamp(),
    };

    if (incrementEdits) {
      updates.editCount = increment(1);
    }

    await updateDoc(sessionRef, updates);
  } catch (error) {
    logError('updateEditSession', error, { userId, sessionId });
  }
}

/**
 * End an edit session
 * Call when user finishes editing or leaves
 */
export async function endEditSession(userId: string, sessionId: string): Promise<void> {
  try {
    const db = getFirestoreInstance();
    const sessionRef = doc(db, 'users', userId, 'editSessions', sessionId);

    await updateDoc(sessionRef, {
      endedAt: serverTimestamp(),
      isActive: false,
    });
  } catch (error) {
    logError('endEditSession', error, { userId, sessionId });
  }
}

// ============================================================================
// Edit Operations and Conflict Detection
// ============================================================================

/**
 * Record an edit operation for potential conflict resolution
 */
export async function recordEditOperation(
  sessionId: string,
  userId: string,
  documentType: 'quiz' | 'quizTemplate' | 'lecture' | 'material',
  documentId: string,
  operation: 'insert' | 'delete' | 'update' | 'replace',
  fieldPath: string,
  baseVersion: number,
  options?: {
    oldValue?: any;
    newValue?: any;
    position?: number;
    length?: number;
  }
): Promise<EditOperation> {
  try {
    const db = getFirestoreInstance();
    const operationId = `${sessionId}_${Date.now()}`;
    const operationRef = doc(db, 'editOperations', operationId);

    const editOp: EditOperation = {
      id: operationId,
      sessionId,
      userId,
      documentType,
      documentId,
      timestamp: new Date(),
      operation,
      fieldPath,
      oldValue: options?.oldValue,
      newValue: options?.newValue,
      position: options?.position,
      length: options?.length,
      baseVersion,
      applied: false,
      conflicted: false,
    };

    await setDoc(operationRef, {
      ...editOp,
      timestamp: serverTimestamp(),
    });

    return editOp;
  } catch (error) {
    logError('recordEditOperation', error, { sessionId, documentId, operation });
    throw error;
  }
}

/**
 * Detect conflicts between edit operations
 * Returns true if operations conflict with each other
 */
export function detectConflict(op1: EditOperation, op2: EditOperation): boolean {
  // Operations on different fields don't conflict
  if (op1.fieldPath !== op2.fieldPath) {
    return false;
  }

  // Operations by same user don't conflict (sequential edits)
  if (op1.userId === op2.userId) {
    return false;
  }

  // Both operations are based on different versions - potential conflict
  if (op1.baseVersion !== op2.baseVersion) {
    return true;
  }

  // Operations on the same field at overlapping positions conflict
  if (op1.position !== undefined && op2.position !== undefined) {
    const op1End = op1.position + (op1.length || 0);
    const op2End = op2.position + (op2.length || 0);

    // Check for overlap
    if (
      (op1.position <= op2.position && op1End > op2.position) ||
      (op2.position <= op1.position && op2End > op1.position)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Create a conflict record when conflicts are detected
 */
export async function createConflictRecord(
  documentType: 'quiz' | 'quizTemplate' | 'lecture' | 'material',
  documentId: string,
  conflictingOperations: EditOperation[]
): Promise<EditConflict> {
  try {
    const db = getFirestoreInstance();
    const conflictId = `conflict_${documentType}_${documentId}_${Date.now()}`;
    const conflictRef = doc(db, 'conflicts', conflictId);

    const conflict: EditConflict = {
      id: conflictId,
      documentType,
      documentId,
      detectedAt: new Date(),
      status: 'detected',
      conflictingOperations: conflictingOperations.map((op) => op.id),
      affectedUsers: Array.from(new Set(conflictingOperations.map((op) => op.userId))),
    };

    await setDoc(conflictRef, {
      ...conflict,
      detectedAt: serverTimestamp(),
    });

    return conflict;
  } catch (error) {
    logError('createConflictRecord', error, { documentType, documentId });
    throw error;
  }
}

/**
 * Resolve a conflict using specified strategy
 */
export async function resolveConflict(
  conflictId: string,
  resolvedBy: string,
  strategy: 'manual' | 'last-write-wins' | 'first-write-wins' | 'merge' | 'reject',
  options?: {
    selectedOperation?: string;
    mergedResult?: any;
  }
): Promise<void> {
  try {
    const db = getFirestoreInstance();
    const conflictRef = doc(db, 'conflicts', conflictId);

    await updateDoc(conflictRef, {
      status: 'resolved',
      resolvedAt: serverTimestamp(),
      resolution: {
        strategy,
        resolvedBy,
        selectedOperation: options?.selectedOperation,
        mergedResult: options?.mergedResult,
      },
    });
  } catch (error) {
    logError('resolveConflict', error, { conflictId, strategy });
    throw error;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Cleanup stale presence records
 * Remove presence records that haven't been updated in the last 5 minutes
 */
export async function cleanupStalePresence(
  documentType: 'quiz' | 'quizTemplate' | 'lecture' | 'material',
  documentId: string
): Promise<void> {
  try {
    const db = getFirestoreInstance();
    const editorsRef = collection(db, 'presence', documentType, documentId, 'editors');
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const staleQuery = query(editorsRef, where('lastSeen', '<', fiveMinutesAgo));
    const staleSnap = await getDocs(staleQuery);

    const deletePromises = staleSnap.docs.map((doc) => updateDoc(doc.ref, { isActive: false }));

    await Promise.all(deletePromises);
  } catch (error) {
    logError('cleanupStalePresence', error, { documentType, documentId });
  }
}

/**
 * Get all active edit sessions for a document
 */
export async function getActiveEditSessions(
  documentType: 'quiz' | 'quizTemplate' | 'lecture' | 'material',
  documentId: string
): Promise<EditSession[]> {
  try {
    const db = getFirestoreInstance();

    // This would require a collection group query across all users
    // For now, we'll return empty array and track sessions client-side
    // In production, consider creating a shared editSessions collection
    return [];
  } catch (error) {
    logError('getActiveEditSessions', error, { documentType, documentId });
    return [];
  }
}
