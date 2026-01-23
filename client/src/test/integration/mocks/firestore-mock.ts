/**
 * Firestore Mock for Integration Tests
 *
 * Provides an in-memory implementation of Firestore that simulates:
 * - Document CRUD operations
 * - Collections and subcollections
 * - Queries with where/orderBy
 * - Multi-tenant data isolation
 * - Realistic async behavior
 *
 * This mock maintains state across operations to support integration testing
 * of data flow and persistence.
 */

import { vi } from 'vitest';

interface MockDocument {
  id: string;
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface MockCollection {
  documents: Map<string, MockDocument>;
  subcollections: Map<string, MockCollection>;
}

class FirestoreMockService {
  private collections: Map<string, MockCollection> = new Map();
  private isInitialized = false;
  private currentUserId: string | null = null;

  /**
   * Initialize Firestore mock
   */
  async initialize(): Promise<boolean> {
    this.isInitialized = true;

    // In CI/test environments, seed default categories collection for health checks
    // This prevents timeouts in useFirestoreConnection hook
    if (
      !this.collections.has('categories') ||
      this.getCollection('categories').documents.size === 0
    ) {
      this.seedDefaultCategories();
    }

    return true;
  }

  /**
   * Check if initialized
   */
  isFirestoreInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Set current user ID
   */
  setCurrentUserId(userId: string): void {
    this.currentUserId = userId;
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * Clear current user
   */
  clearCurrentUser(): void {
    this.currentUserId = null;
  }

  /**
   * Get or create a collection
   */
  private getCollection(path: string): MockCollection {
    if (!this.collections.has(path)) {
      this.collections.set(path, {
        documents: new Map(),
        subcollections: new Map(),
      });
    }
    return this.collections.get(path)!;
  }

  /**
   * Get a document from a collection
   */
  async getDocument(collectionPath: string, documentId: string): Promise<MockDocument | null> {
    const collection = this.getCollection(collectionPath);
    return collection.documents.get(documentId) || null;
  }

  /**
   * Get all documents from a collection
   */
  async getDocuments(
    collectionPath: string,
    filters?: {
      where?: Array<[string, string, any]>;
      orderBy?: Array<[string, 'asc' | 'desc']>;
      limit?: number;
    }
  ): Promise<MockDocument[]> {
    const collection = this.getCollection(collectionPath);
    let documents = Array.from(collection.documents.values());

    // Apply where filters
    if (filters?.where) {
      filters.where.forEach(([field, operator, value]) => {
        documents = documents.filter((doc) => {
          const fieldValue = this.getNestedValue(doc.data, field);
          switch (operator) {
            case '==':
              return fieldValue === value;
            case '!=':
              return fieldValue !== value;
            case '>':
              return fieldValue > value;
            case '>=':
              return fieldValue >= value;
            case '<':
              return fieldValue < value;
            case '<=':
              return fieldValue <= value;
            case 'in':
              return Array.isArray(value) && value.includes(fieldValue);
            case 'array-contains':
              return Array.isArray(fieldValue) && fieldValue.includes(value);
            default:
              return true;
          }
        });
      });
    }

    // Apply orderBy
    if (filters?.orderBy) {
      filters.orderBy.forEach(([field, direction]) => {
        documents.sort((a, b) => {
          const aVal = this.getNestedValue(a.data, field);
          const bVal = this.getNestedValue(b.data, field);
          const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return direction === 'desc' ? -comparison : comparison;
        });
      });
    }

    // Apply limit
    if (filters?.limit) {
      documents = documents.slice(0, filters.limit);
    }

    return documents;
  }

  /**
   * Set a document in a collection
   */
  async setDocument(
    collectionPath: string,
    documentId: string,
    data: Record<string, any>,
    merge = false
  ): Promise<void> {
    const collection = this.getCollection(collectionPath);
    const existing = collection.documents.get(documentId);

    const document: MockDocument = {
      id: documentId,
      data: merge && existing ? { ...existing.data, ...data } : data,
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    collection.documents.set(documentId, document);
  }

  /**
   * Update a document in a collection
   */
  async updateDocument(
    collectionPath: string,
    documentId: string,
    updates: Record<string, any>
  ): Promise<void> {
    const collection = this.getCollection(collectionPath);
    const existing = collection.documents.get(documentId);

    if (!existing) {
      throw new Error(`Document ${documentId} not found in ${collectionPath}`);
    }

    const document: MockDocument = {
      ...existing,
      data: { ...existing.data, ...updates },
      updatedAt: new Date(),
    };

    collection.documents.set(documentId, document);
  }

  /**
   * Delete a document from a collection
   */
  async deleteDocument(collectionPath: string, documentId: string): Promise<void> {
    const collection = this.getCollection(collectionPath);
    collection.documents.delete(documentId);
  }

  /**
   * Get subcollection documents
   */
  async getSubcollectionDocuments(
    parentPath: string,
    parentId: string,
    subcollectionName: string
  ): Promise<MockDocument[]> {
    const path = `${parentPath}/${parentId}/${subcollectionName}`;
    return this.getDocuments(path);
  }

  /**
   * Set subcollection document
   */
  async setSubcollectionDocument(
    parentPath: string,
    parentId: string,
    subcollectionName: string,
    documentId: string,
    data: Record<string, any>
  ): Promise<void> {
    const path = `${parentPath}/${parentId}/${subcollectionName}`;
    await this.setDocument(path, documentId, data);
  }

  /**
   * Helper to get nested values from objects
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Seed default categories collection for health checks
   * This ensures Firestore always has data for connection verification
   */
  private seedDefaultCategories(): void {
    const categoriesCollection: MockCollection = {
      documents: new Map(),
      subcollections: new Map(),
    };
    categoriesCollection.documents.set('test-category-1', {
      id: 'test-category-1',
      data: {
        id: 1,
        name: 'Test Category',
        description: 'Default category for tests',
        tenantId: 1,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.collections.set('categories', categoriesCollection);
  }

  /**
   * Reset mock to initial state
   */
  reset(): void {
    this.collections.clear();
    this.isInitialized = false;
    this.currentUserId = null;

    // After reset, ensure default categories exist for health checks
    this.seedDefaultCategories();
  }

  /**
   * Seed mock data for testing
   */
  async seedData(data: {
    users?: Array<{ id: string; data: any }>;
    categories?: Array<{ id: string; data: any }>;
    questions?: Array<{ id: string; data: any }>;
    [key: string]: Array<{ id: string; data: any }> | undefined;
  }): Promise<void> {
    for (const [collectionName, documents] of Object.entries(data)) {
      if (!documents) continue;
      for (const { id, data: docData } of documents) {
        await this.setDocument(collectionName, id, docData);
      }
    }
  }
}

// Singleton instance
export const firestoreMock = new FirestoreMockService();

/**
 * Create mocked Firestore service for integration tests
 */
export function createFirestoreMock() {
  return {
    initializeFirestoreService: vi.fn(async () => firestoreMock.initialize()),
    isFirestoreInitialized: vi.fn(() => firestoreMock.isFirestoreInitialized()),
    getFirestoreInstance: vi.fn(() => {
      if (!firestoreMock.isFirestoreInitialized()) {
        throw new Error('Firestore not initialized');
      }
      return {}; // Return mock Firestore instance
    }),
    getUserDocument: vi.fn(async (userId: string, collection: string, docId: string) => {
      const doc = await firestoreMock.getDocument(`users/${userId}/${collection}`, docId);
      return doc ? doc.data : null;
    }),
    getUserDocuments: vi.fn(async (userId: string, collection: string) => {
      const docs = await firestoreMock.getDocuments(`users/${userId}/${collection}`);
      return docs.map((doc) => ({ id: doc.id, ...doc.data }));
    }),
    setUserDocument: vi.fn(async (userId: string, collection: string, docId: string, data: any) => {
      await firestoreMock.setDocument(`users/${userId}/${collection}`, docId, data);
    }),
    getSharedDocument: vi.fn(async (collection: string, docId: string) => {
      const doc = await firestoreMock.getDocument(collection, docId);
      return doc ? doc.data : null;
    }),
    getSharedDocuments: vi.fn(async (collection: string) => {
      const docs = await firestoreMock.getDocuments(collection);
      return docs.map((doc) => ({ id: doc.id, ...doc.data }));
    }),
    setSharedDocument: vi.fn(async (collection: string, docId: string, data: any) => {
      await firestoreMock.setDocument(collection, docId, data);
    }),
    getUserProfile: vi.fn(async (userId: string) => {
      const doc = await firestoreMock.getDocument('users', userId);
      return doc ? doc.data : null;
    }),
    setUserProfile: vi.fn(async (userId: string, data: any) => {
      await firestoreMock.setDocument('users', userId, data);
    }),
    updateUserProfile: vi.fn(async (userId: string, updates: any) => {
      await firestoreMock.updateDocument('users', userId, updates);
    }),
  };
}
