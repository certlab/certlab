/**
 * Integration Tests for Offline Queue with Firestore Storage
 *
 * Tests the complete offline queue system with realistic scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { offlineQueue } from './offline-queue';
import { createFirestoreStorageWithQueue } from './firestore-storage-queued';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock navigator.onLine
Object.defineProperty(global.navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('Offline Queue Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    offlineQueue.clearQueue();
    (global.navigator as any).onLine = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    // Clear the queue first to prevent new operations
    offlineQueue.clearQueue();

    // Try to process any remaining operations with a timeout guard
    // Use try-catch to prevent unhandled rejections from failing the test runner
    try {
      await Promise.race([
        offlineQueue.processQueue(),
        new Promise<void>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  'offlineQueue.processQueue() did not complete within 1000ms during test cleanup.'
                )
              ),
            1000
          )
        ),
      ]);
    } catch (error) {
      // Log the error but don't fail - we're in cleanup
      console.error('[afterEach] Queue processing timeout during cleanup:', error);
      // Force clear the queue state to prevent test pollution
      offlineQueue.clearQueue();
    }

    // Flush any remaining microtasks without relying on arbitrary timeouts
    await Promise.resolve();
    await Promise.resolve();

    // Clean up mocks
    vi.clearAllMocks();
  });

  describe('Offline/Online Transitions', () => {
    it('should queue operations when offline and sync when back online', async () => {
      // Create a mock storage
      let operationCount = 0;
      const mockStorage = {
        createQuiz: vi.fn().mockImplementation(async (data) => {
          operationCount++;
          if (!navigator.onLine) {
            throw new Error('Network error: offline');
          }
          return { id: operationCount, ...data };
        }),
        updateQuiz: vi.fn().mockResolvedValue({ id: 1, name: 'Updated' }),
      };

      const queuedStorage = createFirestoreStorageWithQueue(mockStorage as any);

      // Go offline
      (global.navigator as any).onLine = false;

      // Try to create quizzes while offline
      const result1 = await queuedStorage.createQuiz({ name: 'Quiz 1' } as any);
      const result2 = await queuedStorage.createQuiz({ name: 'Quiz 2' } as any);

      // Should return optimistic results
      expect(result1._queued).toBe(true);
      expect(result2._queued).toBe(true);

      // Operations should be queued
      const offlineState = offlineQueue.getState();
      expect(offlineState.total).toBeGreaterThanOrEqual(2);

      // Go back online
      (global.navigator as any).onLine = true;

      // Process the queue - should complete quickly with reduced retry delays
      await offlineQueue.processQueue();

      // Operations should have executed
      expect(mockStorage.createQuiz).toHaveBeenCalledTimes(4); // 2 initial + 2 retries

      // Queue should be completed
      const onlineState = offlineQueue.getState();
      expect(onlineState.completed).toBe(2);
    }, 5000); // Reduced timeout from 10000ms to 5000ms

    it('should handle network flapping gracefully', async () => {
      const mockStorage = {
        createQuiz: vi.fn().mockImplementation(async (data) => {
          if (!navigator.onLine) {
            throw new Error('Network error');
          }
          return { id: 1, ...data };
        }),
      };

      const queuedStorage = createFirestoreStorageWithQueue(mockStorage as any);

      // Simulate rapid online/offline transitions
      (global.navigator as any).onLine = false;
      await queuedStorage.createQuiz({ name: 'Quiz 1' } as any);

      (global.navigator as any).onLine = true;
      window.dispatchEvent(new Event('online'));
      // In test mode, event listeners aren't set up, so manually process
      await offlineQueue.processQueue();

      (global.navigator as any).onLine = false;
      window.dispatchEvent(new Event('offline'));

      (global.navigator as any).onLine = true;
      window.dispatchEvent(new Event('online'));
      // In test mode, event listeners aren't set up, so manually process
      await offlineQueue.processQueue();

      // Operation should have succeeded
      const state = offlineQueue.getState();
      expect(state.completed).toBeGreaterThanOrEqual(1);
    }, 5000); // Reduced timeout from 10000ms to 5000ms
  });

  describe('Queue Persistence', () => {
    it('should persist queue across page reloads', async () => {
      // Create operations
      await offlineQueue.enqueue({
        type: 'create',
        collection: 'quizzes',
        data: { name: 'Quiz 1' },
        operation: vi.fn().mockResolvedValue({ id: 1 }),
      });

      await offlineQueue.enqueue({
        type: 'update',
        collection: 'quizzes',
        data: { id: 1, name: 'Updated' },
        operation: vi.fn().mockResolvedValue({ id: 1 }),
      });

      // Verify queue has items
      const stateBefore = offlineQueue.getState();
      expect(stateBefore.total).toBeGreaterThanOrEqual(2);

      // Verify localStorage has the data
      const stored = localStorageMock.getItem('certlab_offline_queue');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.length).toBeGreaterThanOrEqual(2);

      // Simulate page reload by creating new queue instance
      // (Operation functions won't be restored from storage)
      const newQueue = offlineQueue; // In reality, this would be a fresh instance

      const stateAfter = newQueue.getState();
      expect(stateAfter.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Error Handling', () => {
    it('should distinguish between network and validation errors', async () => {
      const mockStorage = {
        createQuiz: vi
          .fn()
          .mockRejectedValueOnce(new Error('Validation failed: name required'))
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValue({ id: 1, name: 'Quiz' }),
      };

      const queuedStorage = createFirestoreStorageWithQueue(mockStorage as any);

      // Validation error should not be queued
      await expect(queuedStorage.createQuiz({} as any)).rejects.toThrow('Validation');

      let state = offlineQueue.getState();
      expect(state.total).toBe(0);

      // Network error should be queued
      const result = await queuedStorage.createQuiz({ name: 'Quiz' } as any);
      expect(result._queued).toBe(true);

      state = offlineQueue.getState();
      expect(state.total).toBe(1);
    });

    it('should retry failed operations with exponential backoff', async () => {
      // Note: This test uses the retry logic from retry-utils.ts which is configured
      // with fast defaults in test environment (5ms initial, 50ms max, 2 attempts)
      // to prevent CI timeouts. See client/src/test/setup.ts for environment config.
      let attempts = 0;
      const operation = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          // Throw a network error that will be retried
          throw new Error('Network request failed');
        }
        return 'success';
      });

      await offlineQueue.enqueue({
        type: 'create',
        collection: 'quizzes',
        data: { name: 'Quiz' },
        operation,
      });

      // Process queue - with fast test defaults, this completes quickly (~10-20ms)
      await offlineQueue.processQueue();

      // Should have retried exactly twice (initial + 1 retry)
      expect(operation.mock.calls.length).toBe(2);

      // Should eventually succeed
      const state = offlineQueue.getState();
      expect(state.completed).toBeGreaterThanOrEqual(1);
    }, 3000); // Reduced timeout to 3000ms
  });

  describe('Dev Tools Integration', () => {
    it('should expose queue state to Dev Tools', () => {
      // Check that window object has the debug interface
      const debugInterface = (window as any).__CERTLAB_OFFLINE_QUEUE__;
      expect(debugInterface).toBeDefined();
      expect(typeof debugInterface.getState).toBe('function');
      expect(typeof debugInterface.getQueue).toBe('function');
      expect(typeof debugInterface.processQueue).toBe('function');
      expect(typeof debugInterface.clearQueue).toBe('function');
    });

    it('should provide queue state through Dev Tools', async () => {
      const debugInterface = (window as any).__CERTLAB_OFFLINE_QUEUE__;

      // Add some operations
      await offlineQueue.enqueue({
        type: 'create',
        collection: 'quizzes',
        data: { name: 'Quiz 1' },
        operation: vi.fn().mockResolvedValue({ id: 1 }),
      });

      // Get state through Dev Tools
      const state = debugInterface.getState();
      expect(state.total).toBeGreaterThanOrEqual(1);

      // Get queue details
      const queue = debugInterface.getQueue();
      expect(queue.length).toBeGreaterThanOrEqual(1);
      expect(queue[0].type).toBe('create');
      expect(queue[0].collection).toBe('quizzes');
    });
  });

  describe('Optimistic Updates', () => {
    it('should return optimistic results for create operations', async () => {
      const mockStorage = {
        createQuiz: vi.fn().mockRejectedValue(new Error('Network error')),
      };

      const queuedStorage = createFirestoreStorageWithQueue(mockStorage as any);

      const result = await queuedStorage.createQuiz({
        name: 'New Quiz',
        description: 'Test description',
      } as any);

      // Should have the data we passed in
      expect(result.name).toBe('New Quiz');
      expect(result.description).toBe('Test description');

      // Should have a temporary ID
      expect(result.id).toBeTruthy();

      // Should be marked as queued
      expect(result._queued).toBe(true);
      expect(result._queueId).toBeTruthy();
    });

    it('should return optimistic results for update operations', async () => {
      const mockStorage = {
        updateQuiz: vi.fn().mockRejectedValue(new Error('Network error')),
      };

      const queuedStorage = createFirestoreStorageWithQueue(mockStorage as any);

      const result = await queuedStorage.updateQuiz(123, {
        name: 'Updated Name',
      } as any);

      // Should have the ID and updates
      expect(result.id).toBe(123);
      expect(result.name).toBe('Updated Name');

      // Should be marked as queued
      expect(result._queued).toBe(true);
    });
  });

  describe('Read Operations', () => {
    it('should not queue read operations', async () => {
      const mockStorage = {
        getUserQuizzes: vi.fn().mockResolvedValue([
          { id: 1, name: 'Quiz 1' },
          { id: 2, name: 'Quiz 2' },
        ]),
      };

      const queuedStorage = createFirestoreStorageWithQueue(mockStorage as any);

      const result = await queuedStorage.getUserQuizzes('user123', 1);

      // Should return the results directly
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);

      // Should not be queued
      const state = offlineQueue.getState();
      expect(state.total).toBe(0);
    });
  });
});
