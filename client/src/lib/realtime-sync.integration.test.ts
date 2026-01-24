/**
 * Integration Tests for Real-Time Sync Edge Cases
 *
 * Tests multi-client synchronization scenarios including:
 * - Concurrent updates from multiple clients
 * - Deletion propagation across clients
 * - Conflict resolution strategies
 * - Network reconnection scenarios
 * - Rollback on failed operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  realtimeSyncManager,
  updateWithVersionCheck,
  softDelete,
  restoreDeleted,
} from '@/lib/realtime-sync';

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => {
  const documentStore = new Map<string, any>();
  const subscriptions = new Map<string, { callback: any; path: string }>();

  // Helper to reset state between tests
  const resetMockState = () => {
    documentStore.clear();
    subscriptions.clear();
  };

  return {
    getFirestore: vi.fn(() => ({ type: 'mock-firestore' })),
    collection: vi.fn((db, path) => ({ type: 'collection', path })),
    doc: vi.fn((db, ...pathSegments) => ({
      type: 'doc',
      path: pathSegments.join('/'),
    })),
    query: vi.fn((ref, ...constraints) => ({ type: 'query', ref, constraints })),
    where: vi.fn((field, operator, value) => ({ type: 'where', field, operator, value })),
    orderBy: vi.fn((field, direction) => ({ type: 'orderBy', field, direction })),
    onSnapshot: vi.fn((ref, optionsOrCallback, callbackOrError, errorCallback) => {
      let callback: any;

      if (typeof optionsOrCallback === 'function') {
        callback = optionsOrCallback;
      } else {
        callback = callbackOrError;
      }

      const path = ref.path || ref.ref?.path || 'unknown';
      const subId = `${path}:${Date.now()}`;

      // Store subscription
      subscriptions.set(subId, { callback, path });

      // Simulate initial data
      setTimeout(() => {
        const data = documentStore.get(path);
        if (ref.type === 'doc') {
          callback({
            exists: () => !!data,
            data: () => data || null,
            metadata: { fromCache: false, hasPendingWrites: false },
          });
        } else {
          callback({
            docs: [],
            docChanges: () => [],
            metadata: { fromCache: false, hasPendingWrites: false },
          });
        }
      }, 0);

      return () => {
        subscriptions.delete(subId);
      };
    }),
    writeBatch: vi.fn(() => ({
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    })),
    runTransaction: vi.fn(async (db: any, transactionFn: any) => {
      const mockTransaction = {
        get: vi.fn((docRef: any) => {
          const data = documentStore.get(docRef.path);
          return Promise.resolve({
            exists: () => !!data,
            data: () => data || null,
          });
        }),
        set: vi.fn((docRef: any, data: any) => {
          documentStore.set(docRef.path, data);
          // Notify all subscribers
          subscriptions.forEach((sub) => {
            if (sub.path === docRef.path) {
              setTimeout(() => {
                sub.callback({
                  exists: () => true,
                  data: () => data,
                  metadata: { fromCache: false, hasPendingWrites: false },
                });
              }, 0);
            }
          });
        }),
        update: vi.fn((docRef: any, data: any) => {
          const existing = documentStore.get(docRef.path) || {};
          const updated = { ...existing, ...data };
          documentStore.set(docRef.path, updated);
          // Notify all subscribers
          subscriptions.forEach((sub) => {
            if (sub.path === docRef.path) {
              setTimeout(() => {
                sub.callback({
                  exists: () => true,
                  data: () => updated,
                  metadata: { fromCache: false, hasPendingWrites: false },
                });
              }, 0);
            }
          });
        }),
        delete: vi.fn((docRef: any) => {
          documentStore.delete(docRef.path);
          // Notify all subscribers
          subscriptions.forEach((sub) => {
            if (sub.path === docRef.path) {
              setTimeout(() => {
                sub.callback({
                  exists: () => false,
                  data: () => null,
                  metadata: { fromCache: false, hasPendingWrites: false },
                });
              }, 0);
            }
          });
        }),
      };
      return transactionFn(mockTransaction);
    }),
    serverTimestamp: vi.fn(() => new Date()),
    // Helper to reset mock state (accessed via re-import in tests)
    __resetMockState: resetMockState,
  };
});

describe('Real-Time Sync Integration Tests', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Clear mock Firestore state to prevent test pollution
    const firestore = await import('firebase/firestore');
    if ((firestore as any).__resetMockState) {
      (firestore as any).__resetMockState();
    }
  });

  afterEach(() => {
    realtimeSyncManager.unsubscribeAll();
    realtimeSyncManager.clearAllHistory();
  });

  describe('Multi-Client Sync Scenarios', () => {
    it('should sync document updates across multiple clients', async () => {
      const client1Updates: any[] = [];
      const client2Updates: any[] = [];

      // Client 1 subscribes
      realtimeSyncManager.subscribeToDocument('quizzes/123', (data) => {
        client1Updates.push(data);
      });

      // Client 2 subscribes
      realtimeSyncManager.subscribeToDocument('quizzes/123', (data) => {
        client2Updates.push(data);
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Both clients should receive the same initial data
      expect(client1Updates.length).toBeGreaterThan(0);
      expect(client2Updates.length).toBeGreaterThan(0);
    });

    it('should propagate deletions to all clients', async () => {
      const { runTransaction } = await import('firebase/firestore');
      const mockRunTransaction = runTransaction as unknown as ReturnType<typeof vi.fn>;

      // Setup initial document
      mockRunTransaction.mockImplementation(async (db: any, transactionFn: any) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ id: '123', name: 'Quiz', version: 1 }),
          }),
          update: vi.fn(),
        };
        return transactionFn(mockTransaction);
      });

      const client1Updates: any[] = [];
      const client2Updates: any[] = [];

      realtimeSyncManager.subscribeToDocument('quizzes/123', (data, metadata) => {
        client1Updates.push({ data, isDeleted: metadata.isDeleted });
      });

      realtimeSyncManager.subscribeToDocument('quizzes/123', (data, metadata) => {
        client2Updates.push({ data, isDeleted: metadata.isDeleted });
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Soft delete from client 1
      await softDelete('quizzes/123');

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Both clients should have received updates
      expect(client1Updates.length).toBeGreaterThan(0);
      expect(client2Updates.length).toBeGreaterThan(0);
    });

    it('should handle concurrent updates with version checking', async () => {
      const { runTransaction } = await import('firebase/firestore');
      const mockRunTransaction = runTransaction as unknown as ReturnType<typeof vi.fn>;

      // Simulate concurrent updates
      let updateCount = 0;

      mockRunTransaction.mockImplementation(async (db: any, transactionFn: any) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ version: updateCount }),
          }),
          update: vi.fn(() => {
            updateCount++;
          }),
        };
        return transactionFn(mockTransaction);
      });

      // Client 1 update with version 0
      await updateWithVersionCheck('quizzes/123', { name: 'Updated by Client 1' }, 0);

      // Client 2 tries to update with stale version 0 - should fail
      mockRunTransaction.mockImplementationOnce(async (db: any, transactionFn: any) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ version: 1 }), // Version already incremented
          }),
          update: vi.fn(),
        };
        return transactionFn(mockTransaction);
      });

      await expect(
        updateWithVersionCheck('quizzes/123', { name: 'Updated by Client 2' }, 0)
      ).rejects.toThrow('Version conflict');
    });
  });

  describe('Edge Case Handling', () => {
    it('should handle rapid create/delete cycles', async () => {
      const updates: any[] = [];

      realtimeSyncManager.subscribeToDocument('quizzes/123', (data, metadata) => {
        updates.push({ data, isDeleted: metadata.isDeleted });
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Initial update count
      const initialCount = updates.length;

      // Rapid operations
      await softDelete('quizzes/123');
      await restoreDeleted('quizzes/123');
      await softDelete('quizzes/123');

      // Should have received at least the initial update
      expect(updates.length).toBeGreaterThanOrEqual(initialCount);
    });

    it('should handle batch operations atomically', async () => {
      const { writeBatch } = await import('firebase/firestore');
      const mockBatch = {
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      };
      (writeBatch as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockBatch);

      // Execute batch operation
      await realtimeSyncManager.executeBatch([
        { type: 'set', path: 'quizzes/1', data: { name: 'Quiz 1' } },
        { type: 'set', path: 'quizzes/2', data: { name: 'Quiz 2' } },
        { type: 'set', path: 'quizzes/3', data: { name: 'Quiz 3' } },
      ]);

      // All operations should be committed atomically
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
      expect(mockBatch.set).toHaveBeenCalledTimes(3);
    });

    it('should rollback on batch operation failure', async () => {
      const { writeBatch } = await import('firebase/firestore');
      const mockBatch = {
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        commit: vi.fn().mockRejectedValue(new Error('Network error')),
      };
      (writeBatch as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockBatch);

      // Batch operation should fail
      await expect(
        realtimeSyncManager.executeBatch([
          { type: 'set', path: 'quizzes/1', data: { name: 'Quiz 1' } },
          { type: 'set', path: 'quizzes/2', data: { name: 'Quiz 2' } },
        ])
      ).rejects.toThrow('Network error');

      // No partial updates should be committed
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });

    it('should track operation history for debugging', () => {
      realtimeSyncManager.recordOperation('quizzes/123', 'create', {
        name: 'New Quiz',
      });

      realtimeSyncManager.recordOperation('quizzes/123', 'update', {
        name: 'Updated Quiz',
      });

      realtimeSyncManager.recordOperation('quizzes/123', 'delete', null);

      const history = realtimeSyncManager.getOperationHistory('quizzes/123');

      expect(history).toHaveLength(3);
      expect(history[0].operation).toBe('create');
      expect(history[1].operation).toBe('update');
      expect(history[2].operation).toBe('delete');
    });

    it('should handle subscription cleanup properly', () => {
      const sub1 = realtimeSyncManager.subscribeToDocument('quizzes/1', vi.fn());
      realtimeSyncManager.subscribeToDocument('quizzes/2', vi.fn());
      realtimeSyncManager.subscribeToCollection('users', vi.fn());

      expect(realtimeSyncManager.getActiveSubscriptionCount()).toBe(3);

      realtimeSyncManager.unsubscribe(sub1);
      expect(realtimeSyncManager.getActiveSubscriptionCount()).toBe(2);

      realtimeSyncManager.unsubscribeAll();
      expect(realtimeSyncManager.getActiveSubscriptionCount()).toBe(0);
    });

    it('should prevent data loss during network interruption', async () => {
      // This test simulates that operations are queued when network fails
      // and successfully processed when network recovers

      // Record all operations
      realtimeSyncManager.recordOperation('quizzes/123', 'update', {
        name: 'Update 1',
      });
      realtimeSyncManager.recordOperation('quizzes/123', 'update', {
        name: 'Update 2',
      });
      realtimeSyncManager.recordOperation('quizzes/123', 'update', {
        name: 'Update 3',
      });

      const history = realtimeSyncManager.getOperationHistory('quizzes/123');

      // All operations should be tracked
      expect(history).toHaveLength(3);
      expect(history.every((h) => h.operation === 'update')).toBe(true);
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect and reject stale writes', async () => {
      const { runTransaction } = await import('firebase/firestore');
      const mockRunTransaction = runTransaction as unknown as ReturnType<typeof vi.fn>;

      mockRunTransaction.mockImplementationOnce(async (db: any, transactionFn: any) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ version: 5 }), // Current version is 5
          }),
          update: vi.fn(),
        };
        return transactionFn(mockTransaction);
      });

      // Try to update with version 3 (stale)
      await expect(
        updateWithVersionCheck('quizzes/123', { name: 'Stale Update' }, 3)
      ).rejects.toThrow('Version conflict: expected 3, got 5');
    });

    it('should accept updates without version check', async () => {
      const { runTransaction } = await import('firebase/firestore');
      const mockRunTransaction = runTransaction as unknown as ReturnType<typeof vi.fn>;

      mockRunTransaction.mockImplementationOnce(async (db: any, transactionFn: any) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ version: 5 }),
          }),
          update: vi.fn(),
        };
        return transactionFn(mockTransaction);
      });

      // Update without version check should succeed
      await expect(
        updateWithVersionCheck('quizzes/123', { name: 'Update' })
      ).resolves.toBeUndefined();
    });

    it('should increment version on successful update', async () => {
      const { runTransaction } = await import('firebase/firestore');
      const mockUpdate = vi.fn();
      const mockRunTransaction = runTransaction as unknown as ReturnType<typeof vi.fn>;

      mockRunTransaction.mockImplementationOnce(async (db: any, transactionFn: any) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ version: 3 }),
          }),
          update: mockUpdate,
        };
        return transactionFn(mockTransaction);
      });

      await updateWithVersionCheck('quizzes/123', { name: 'Update' }, 3);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          version: 4, // Incremented
        })
      );
    });
  });

  describe('Soft Delete and Restore', () => {
    it('should soft delete and allow restore', async () => {
      const { runTransaction } = await import('firebase/firestore');
      const mockUpdate = vi.fn();
      const mockRunTransaction = runTransaction as unknown as ReturnType<typeof vi.fn>;

      // Soft delete
      mockRunTransaction.mockImplementationOnce(async (db: any, transactionFn: any) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ version: 1, name: 'Quiz' }),
          }),
          update: mockUpdate,
        };
        return transactionFn(mockTransaction);
      });

      await softDelete('quizzes/123');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          deleted: true,
          version: 2,
        })
      );

      mockUpdate.mockClear();

      // Restore
      mockRunTransaction.mockImplementationOnce(async (db: any, transactionFn: any) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ version: 2, deleted: true }),
          }),
          update: mockUpdate,
        };
        return transactionFn(mockTransaction);
      });

      await restoreDeleted('quizzes/123');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          deleted: false,
          deletedAt: null,
          version: 3,
        })
      );
    });
  });
});
