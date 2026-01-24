/**
 * Tests for Real-Time Sync Manager
 *
 * Covers edge cases for multi-client synchronization including:
 * - Real-time document and collection subscriptions
 * - Deletion propagation
 * - Conflict detection and resolution
 * - Rollback scenarios
 * - Transaction support
 * - Batch operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  realtimeSyncManager,
  updateWithVersionCheck,
  softDelete,
  restoreDeleted,
  type DocumentChangeCallback,
  type CollectionChangeCallback,
} from './realtime-sync';

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => {
  const mockUnsubscribe = vi.fn();

  return {
    getFirestore: vi.fn(() => ({ type: 'mock-firestore' })),
    collection: vi.fn((db, path) => ({ type: 'collection', path })),
    doc: vi.fn((db, ...pathSegments) => ({
      type: 'doc',
      path: pathSegments.join('/'),
    })),
    query: vi.fn((ref, ...constraints) => ({
      type: 'query',
      ref,
      constraints,
    })),
    where: vi.fn((field, operator, value) => ({
      type: 'where',
      field,
      operator,
      value,
    })),
    orderBy: vi.fn((field, direction) => ({
      type: 'orderBy',
      field,
      direction,
    })),
    limit: vi.fn((n) => ({ type: 'limit', value: n })),
    onSnapshot: vi.fn((ref, optionsOrCallback, callbackOrError, errorCallback) => {
      // Handle different call signatures
      let callback: any;

      if (typeof optionsOrCallback === 'function') {
        callback = optionsOrCallback;
      } else {
        callback = callbackOrError;
      }

      // Simulate successful snapshot after a short delay
      setTimeout(() => {
        if (ref.type === 'doc') {
          // Document snapshot
          callback({
            exists: () => true,
            data: () => ({ id: '123', name: 'Test' }),
            metadata: {
              fromCache: false,
              hasPendingWrites: false,
            },
          });
        } else {
          // Collection snapshot
          callback({
            docs: [
              {
                id: '1',
                data: () => ({ name: 'Item 1' }),
              },
              {
                id: '2',
                data: () => ({ name: 'Item 2' }),
              },
            ],
            docChanges: () => [
              {
                type: 'added',
                doc: {
                  id: '1',
                  data: () => ({ name: 'Item 1' }),
                },
              },
            ],
            metadata: {
              fromCache: false,
              hasPendingWrites: false,
            },
          });
        }
      }, 0);

      return mockUnsubscribe;
    }),
    writeBatch: vi.fn(() => ({
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    })),
    runTransaction: vi.fn(async (db, transactionFn) => {
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({ version: 1, name: 'Test' }),
        }),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };
      return transactionFn(mockTransaction);
    }),
    serverTimestamp: vi.fn(() => ({ type: 'serverTimestamp' })),
  };
});

describe('RealtimeSyncManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    realtimeSyncManager.unsubscribeAll();
    realtimeSyncManager.clearAllHistory();
  });

  describe('Document Subscriptions', () => {
    it('should subscribe to a document and receive updates', async () => {
      const callback = vi.fn();
      const subscriptionId = realtimeSyncManager.subscribeToDocument(
        'users/123',
        callback as DocumentChangeCallback
      );

      expect(subscriptionId).toMatch(/^doc:users\/123:\d+:\d+$/);

      // Wait for async callback
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ id: '123', name: 'Test' }),
        expect.objectContaining({
          fromCache: false,
          hasPendingWrites: false,
          isDeleted: false,
        })
      );
    });

    it('should handle document deletion', async () => {
      const { onSnapshot } = await import('firebase/firestore');
      const mockOnSnapshot = onSnapshot as unknown as ReturnType<typeof vi.fn>;

      mockOnSnapshot.mockImplementationOnce((ref: any, opts: any, callback: any) => {
        setTimeout(() => {
          callback({
            exists: () => false,
            data: () => null,
            metadata: { fromCache: false, hasPendingWrites: false },
          });
        }, 0);
        return vi.fn();
      });

      const callback = vi.fn();
      realtimeSyncManager.subscribeToDocument('users/123', callback as DocumentChangeCallback);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({ isDeleted: true }));
    });

    it('should detect soft-deleted documents', async () => {
      const { onSnapshot } = await import('firebase/firestore');
      const mockOnSnapshot = onSnapshot as unknown as ReturnType<typeof vi.fn>;

      mockOnSnapshot.mockImplementationOnce((ref: any, opts: any, callback: any) => {
        setTimeout(() => {
          callback({
            exists: () => true,
            data: () => ({ id: '123', name: 'Test', deleted: true }),
            metadata: { fromCache: false, hasPendingWrites: false },
          });
        }, 0);
        return vi.fn();
      });

      const callback = vi.fn();
      realtimeSyncManager.subscribeToDocument('users/123', callback as DocumentChangeCallback);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ id: '123', name: 'Test', deleted: true }),
        expect.objectContaining({ isDeleted: true })
      );
    });

    it('should handle subscription errors', async () => {
      const { onSnapshot } = await import('firebase/firestore');
      const mockOnSnapshot = onSnapshot as unknown as ReturnType<typeof vi.fn>;

      const testError = new Error('Connection failed');
      mockOnSnapshot.mockImplementationOnce(
        (ref: any, opts: any, callback: any, errorCallback: any) => {
          setTimeout(() => {
            errorCallback(testError);
          }, 0);
          return vi.fn();
        }
      );

      const errorHandler = vi.fn();
      const callback = vi.fn();

      realtimeSyncManager.subscribeToDocument('users/123', callback as DocumentChangeCallback, {
        onError: errorHandler,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(errorHandler).toHaveBeenCalledWith(testError);
    });

    it('should unsubscribe from document', () => {
      const callback = vi.fn();
      const subscriptionId = realtimeSyncManager.subscribeToDocument(
        'users/123',
        callback as DocumentChangeCallback
      );

      expect(realtimeSyncManager.getActiveSubscriptionCount()).toBe(1);

      realtimeSyncManager.unsubscribe(subscriptionId);

      expect(realtimeSyncManager.getActiveSubscriptionCount()).toBe(0);
    });
  });

  describe('Collection Subscriptions', () => {
    it('should subscribe to a collection and receive updates', async () => {
      const callback = vi.fn();
      const subscriptionId = realtimeSyncManager.subscribeToCollection(
        'users',
        callback as CollectionChangeCallback
      );

      expect(subscriptionId).toMatch(/^col:users:\d+:\d+$/);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: '1', name: 'Item 1' }),
          expect.objectContaining({ id: '2', name: 'Item 2' }),
        ]),
        expect.objectContaining({
          fromCache: false,
          hasPendingWrites: false,
          changes: expect.arrayContaining([expect.objectContaining({ type: 'added' })]),
        })
      );
    });

    it('should support collection filters', async () => {
      const { where } = await import('firebase/firestore');
      const mockWhere = where as unknown as ReturnType<typeof vi.fn>;

      const callback = vi.fn();
      realtimeSyncManager.subscribeToCollection('quizzes', callback as CollectionChangeCallback, {
        filters: [
          { field: 'userId', operator: '==', value: 'user123' },
          { field: 'status', operator: '==', value: 'completed' },
        ],
      });

      expect(mockWhere).toHaveBeenCalledWith('userId', '==', 'user123');
      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'completed');
    });

    it('should support collection ordering', async () => {
      const { orderBy } = await import('firebase/firestore');
      const mockOrderBy = orderBy as unknown as ReturnType<typeof vi.fn>;

      const callback = vi.fn();
      realtimeSyncManager.subscribeToCollection('quizzes', callback as CollectionChangeCallback, {
        orderBy: { field: 'createdAt', direction: 'desc' },
      });

      expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });

    it('should support collection limit for pagination', async () => {
      const { limit } = await import('firebase/firestore');
      const mockLimit = limit as unknown as ReturnType<typeof vi.fn>;

      const callback = vi.fn();
      realtimeSyncManager.subscribeToCollection('quizzes', callback as CollectionChangeCallback, {
        limit: 20,
      });

      expect(mockLimit).toHaveBeenCalledWith(20);
    });

    it('should unsubscribe from all subscriptions', async () => {
      const callback = vi.fn();

      realtimeSyncManager.subscribeToDocument('users/1', callback as DocumentChangeCallback);
      realtimeSyncManager.subscribeToDocument('users/2', callback as DocumentChangeCallback);
      realtimeSyncManager.subscribeToCollection('quizzes', callback as CollectionChangeCallback);

      expect(realtimeSyncManager.getActiveSubscriptionCount()).toBe(3);

      realtimeSyncManager.unsubscribeAll();

      expect(realtimeSyncManager.getActiveSubscriptionCount()).toBe(0);
    });
  });

  describe('Transactions', () => {
    it('should execute transaction successfully', async () => {
      const { runTransaction } = await import('firebase/firestore');
      const mockRunTransaction = runTransaction as unknown as ReturnType<typeof vi.fn>;

      const result = await realtimeSyncManager.executeTransaction(async (transaction) => {
        return { success: true };
      });

      expect(result).toEqual({ success: true });
      expect(mockRunTransaction).toHaveBeenCalled();
    });

    it('should handle transaction errors', async () => {
      const { runTransaction } = await import('firebase/firestore');
      const mockRunTransaction = runTransaction as unknown as ReturnType<typeof vi.fn>;

      const testError = new Error('Transaction failed');
      mockRunTransaction.mockRejectedValueOnce(testError);

      await expect(
        realtimeSyncManager.executeTransaction(async () => {
          throw testError;
        })
      ).rejects.toThrow('Transaction failed');
    });
  });

  describe('Batch Operations', () => {
    it('should execute batch write operations', async () => {
      const { writeBatch } = await import('firebase/firestore');
      const mockBatch = {
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      };
      (writeBatch as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockBatch);

      await realtimeSyncManager.executeBatch([
        { type: 'set', path: 'users/1', data: { name: 'User 1' } },
        { type: 'update', path: 'users/2', data: { name: 'User 2' } },
        { type: 'delete', path: 'users/3' },
      ]);

      expect(mockBatch.set).toHaveBeenCalledTimes(1);
      expect(mockBatch.update).toHaveBeenCalledTimes(1);
      expect(mockBatch.delete).toHaveBeenCalledTimes(1);
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });

    it('should handle batch operation errors', async () => {
      const { writeBatch } = await import('firebase/firestore');
      const mockBatch = {
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        commit: vi.fn().mockRejectedValue(new Error('Batch failed')),
      };
      (writeBatch as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockBatch);

      await expect(
        realtimeSyncManager.executeBatch([
          { type: 'set', path: 'users/1', data: { name: 'User 1' } },
        ])
      ).rejects.toThrow('Batch failed');
    });

    it('should validate data is required for set operations', async () => {
      await expect(
        realtimeSyncManager.executeBatch([{ type: 'set', path: 'users/1' } as any])
      ).rejects.toThrow("data is required for 'set' operation on path: users/1");
    });

    it('should validate data is required for update operations', async () => {
      await expect(
        realtimeSyncManager.executeBatch([{ type: 'update', path: 'users/1' } as any])
      ).rejects.toThrow("data is required for 'update' operation on path: users/1");
    });
  });

  describe('Operation History', () => {
    it('should record operations', () => {
      realtimeSyncManager.recordOperation('users/123', 'update', { name: 'Test' });

      const history = realtimeSyncManager.getOperationHistory('users/123');

      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        operation: 'update',
        data: { name: 'Test' },
        timestamp: expect.any(Date),
      });
    });

    it('should limit history to 10 operations', () => {
      for (let i = 0; i < 15; i++) {
        realtimeSyncManager.recordOperation('users/123', 'update', { count: i });
      }

      const history = realtimeSyncManager.getOperationHistory('users/123');

      expect(history).toHaveLength(10);
      expect(history[0].data.count).toBe(5); // First 5 should be removed
      expect(history[9].data.count).toBe(14);
    });

    it('should clear history for specific document', () => {
      realtimeSyncManager.recordOperation('users/123', 'update', { name: 'Test' });
      realtimeSyncManager.recordOperation('users/456', 'update', { name: 'Test' });

      realtimeSyncManager.clearOperationHistory('users/123');

      expect(realtimeSyncManager.getOperationHistory('users/123')).toHaveLength(0);
      expect(realtimeSyncManager.getOperationHistory('users/456')).toHaveLength(1);
    });

    it('should clear all history', () => {
      realtimeSyncManager.recordOperation('users/123', 'update', { name: 'Test' });
      realtimeSyncManager.recordOperation('users/456', 'update', { name: 'Test' });

      realtimeSyncManager.clearAllHistory();

      expect(realtimeSyncManager.getOperationHistory('users/123')).toHaveLength(0);
      expect(realtimeSyncManager.getOperationHistory('users/456')).toHaveLength(0);
    });
  });

  describe('Version-based Updates', () => {
    it('should update with version check', async () => {
      await expect(
        updateWithVersionCheck('users/123', { name: 'Updated' }, 1)
      ).resolves.toBeUndefined();
    });

    it('should detect version conflicts', async () => {
      const { runTransaction } = await import('firebase/firestore');
      const mockRunTransaction = runTransaction as unknown as ReturnType<typeof vi.fn>;

      mockRunTransaction.mockImplementationOnce(async (db: any, transactionFn: any) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ version: 5 }), // Different version
          }),
          update: vi.fn(),
        };
        return transactionFn(mockTransaction);
      });

      await expect(updateWithVersionCheck('users/123', { name: 'Updated' }, 1)).rejects.toThrow(
        'Version conflict'
      );
    });

    it('should handle non-existent documents', async () => {
      const { runTransaction } = await import('firebase/firestore');
      const mockRunTransaction = runTransaction as unknown as ReturnType<typeof vi.fn>;

      mockRunTransaction.mockImplementationOnce(async (db: any, transactionFn: any) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => false,
          }),
          update: vi.fn(),
        };
        return transactionFn(mockTransaction);
      });

      await expect(updateWithVersionCheck('users/123', { name: 'Updated' })).rejects.toThrow(
        'Document does not exist'
      );
    });
  });

  describe('Soft Delete', () => {
    it('should soft delete document', async () => {
      const { runTransaction } = await import('firebase/firestore');
      const mockUpdate = vi.fn();
      const mockRunTransaction = runTransaction as unknown as ReturnType<typeof vi.fn>;

      mockRunTransaction.mockImplementationOnce(async (db: any, transactionFn: any) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ version: 1 }),
          }),
          update: mockUpdate,
        };
        return transactionFn(mockTransaction);
      });

      await softDelete('users/123');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          deleted: true,
          version: 2,
        })
      );
    });

    it('should handle already deleted documents', async () => {
      const { runTransaction } = await import('firebase/firestore');
      const mockRunTransaction = runTransaction as unknown as ReturnType<typeof vi.fn>;

      mockRunTransaction.mockImplementationOnce(async (db: any, transactionFn: any) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => false,
          }),
          update: vi.fn(),
        };
        return transactionFn(mockTransaction);
      });

      await expect(softDelete('users/123')).resolves.toBeUndefined();
    });
  });

  describe('Restore Deleted', () => {
    it('should restore soft-deleted document', async () => {
      const { runTransaction } = await import('firebase/firestore');
      const mockUpdate = vi.fn();
      const mockRunTransaction = runTransaction as unknown as ReturnType<typeof vi.fn>;

      mockRunTransaction.mockImplementationOnce(async (db: any, transactionFn: any) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ version: 1, deleted: true }),
          }),
          update: mockUpdate,
        };
        return transactionFn(mockTransaction);
      });

      await restoreDeleted('users/123');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          deleted: false,
          deletedAt: null,
          version: 2,
        })
      );
    });

    it('should handle non-existent documents', async () => {
      const { runTransaction } = await import('firebase/firestore');
      const mockRunTransaction = runTransaction as unknown as ReturnType<typeof vi.fn>;

      mockRunTransaction.mockImplementationOnce(async (db: any, transactionFn: any) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => false,
          }),
          update: vi.fn(),
        };
        return transactionFn(mockTransaction);
      });

      await expect(restoreDeleted('users/123')).rejects.toThrow('Document does not exist');
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple concurrent subscriptions to same document', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const sub1 = realtimeSyncManager.subscribeToDocument(
        'users/123',
        callback1 as DocumentChangeCallback
      );
      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 1));
      const sub2 = realtimeSyncManager.subscribeToDocument(
        'users/123',
        callback2 as DocumentChangeCallback
      );

      expect(sub1).not.toBe(sub2);
      expect(realtimeSyncManager.getActiveSubscriptionCount()).toBe(2);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should handle subscription to non-existent collection', async () => {
      const { onSnapshot } = await import('firebase/firestore');
      const mockOnSnapshot = onSnapshot as unknown as ReturnType<typeof vi.fn>;

      mockOnSnapshot.mockImplementationOnce((ref: any, opts: any, callback: any) => {
        setTimeout(() => {
          callback({
            docs: [],
            docChanges: () => [],
            metadata: { fromCache: false, hasPendingWrites: false },
          });
        }, 0);
        return vi.fn();
      });

      const callback = vi.fn();
      realtimeSyncManager.subscribeToCollection(
        'nonexistent',
        callback as CollectionChangeCallback
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith([], expect.anything());
    });

    it('should handle rapid subscribe/unsubscribe cycles', () => {
      const callback = vi.fn();

      for (let i = 0; i < 10; i++) {
        const sub = realtimeSyncManager.subscribeToDocument(
          `users/${i}`,
          callback as DocumentChangeCallback
        );
        realtimeSyncManager.unsubscribe(sub);
      }

      expect(realtimeSyncManager.getActiveSubscriptionCount()).toBe(0);
    });
  });
});
