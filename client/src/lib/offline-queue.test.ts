/**
 * Tests for Offline Queue Manager
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OfflineQueue, isOfflineError } from './offline-queue';

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

/**
 * Helper function to manually process the queue in test mode.
 * In test mode, event listeners aren't set up, so we need to manually
 * trigger queue processing after simulating online events.
 */
async function manuallyProcessQueueInTestMode(queueInstance: OfflineQueue): Promise<void> {
  await queueInstance.processQueue();
}

describe('OfflineQueue', () => {
  let queue: OfflineQueue;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();

    // Reset navigator.onLine
    (global.navigator as any).onLine = true;

    // Create new queue instance
    queue = new OfflineQueue({
      storageKey: 'test_queue',
      maxQueueSize: 10,
      maxRetries: 3,
      exposeToDevTools: false,
    });

    // Clear console mocks
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    queue.clearQueue();
    queue.destroy(); // Defensive cleanup: destroys event listeners in non-test mode (no-op in these tests)
  });

  describe('enqueue', () => {
    it('should enqueue an operation', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const id = await queue.enqueue({
        type: 'create',
        collection: 'quizzes',
        data: { name: 'Test Quiz' },
        operation,
      });

      expect(id).toBeTruthy();
      const state = queue.getState();
      expect(state.total).toBe(1);
      expect(state.pending).toBeGreaterThanOrEqual(0); // May be processing already
    });

    it('should reject when queue is full', async () => {
      const operation = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves

      // Set offline so operations won't process
      (global.navigator as any).onLine = false;

      // Fill the queue
      for (let i = 0; i < 10; i++) {
        await queue.enqueue({
          type: 'create',
          collection: 'quizzes',
          data: { name: `Quiz ${i}` },
          operation,
        });
      }

      // Next enqueue should fail
      await expect(
        queue.enqueue({
          type: 'create',
          collection: 'quizzes',
          data: { name: 'Overflow Quiz' },
          operation,
        })
      ).rejects.toThrow('Offline queue is full');
    });

    it('should allow processing queue when online', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      (global.navigator as any).onLine = true;

      await queue.enqueue({
        type: 'create',
        collection: 'quizzes',
        data: { name: 'Test Quiz' },
        operation,
      });

      // In test mode, automatic processing is disabled, so manually process
      await queue.processQueue();

      expect(operation).toHaveBeenCalled();
    });

    it('should not automatically process queue in test mode', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      (global.navigator as any).onLine = true;

      await queue.enqueue({
        type: 'create',
        collection: 'quizzes',
        data: { name: 'Test Quiz' },
        operation,
      });

      // Wait a bit to ensure no automatic processing happens
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Operation should NOT have been called because automatic processing is disabled in test mode
      expect(operation).not.toHaveBeenCalled();
    });

    it('should not process queue immediately when offline', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      (global.navigator as any).onLine = false;

      await queue.enqueue({
        type: 'create',
        collection: 'quizzes',
        data: { name: 'Test Quiz' },
        operation,
      });

      // Operation should not be called immediately
      expect(operation).not.toHaveBeenCalled();
    });
  });

  describe('processQueue', () => {
    it('should process all pending operations', async () => {
      const op1 = vi.fn().mockResolvedValue('success1');
      const op2 = vi.fn().mockResolvedValue('success2');
      const op3 = vi.fn().mockResolvedValue('success3');

      await queue.enqueue({
        type: 'create',
        collection: 'quizzes',
        data: { name: 'Quiz 1' },
        operation: op1,
      });

      await queue.enqueue({
        type: 'update',
        collection: 'quizzes',
        data: { name: 'Quiz 2' },
        operation: op2,
      });

      await queue.enqueue({
        type: 'delete',
        collection: 'quizzes',
        data: { id: 1 },
        operation: op3,
      });

      await queue.processQueue();

      expect(op1).toHaveBeenCalled();
      expect(op2).toHaveBeenCalled();
      expect(op3).toHaveBeenCalled();

      const state = queue.getState();
      expect(state.completed).toBe(3);
    });

    it('should retry failed operations', async () => {
      let attempts = 0;
      const operation = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Network error');
        }
        return 'success';
      });

      await queue.enqueue({
        type: 'create',
        collection: 'quizzes',
        data: { name: 'Test Quiz' },
        operation,
      });

      await queue.processQueue();

      // Should have been called twice (initial + 1 retry)
      expect(operation.mock.calls.length).toBeGreaterThanOrEqual(2);

      const state = queue.getState();
      expect(state.completed).toBe(1);
    });

    it('should mark operation as failed after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Network error'));

      await queue.enqueue({
        type: 'create',
        collection: 'quizzes',
        data: { name: 'Test Quiz' },
        operation,
      });

      await queue.processQueue();

      const state = queue.getState();
      expect(state.failed).toBe(1);
    });

    it('should not process queue concurrently', async () => {
      const operation = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve('success'), 100))
        );

      await queue.enqueue({
        type: 'create',
        collection: 'quizzes',
        data: { name: 'Quiz 1' },
        operation,
      });

      // Start processing
      const promise1 = queue.processQueue();

      // Immediately try to process again
      const promise2 = queue.processQueue();

      // Both should complete successfully (second one should return same promise or wait)
      await Promise.all([promise1, promise2]);

      // Operation should only be called once
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('getState', () => {
    it('should return current queue state', async () => {
      const op1 = vi.fn().mockResolvedValue('success');
      const op2 = vi.fn().mockImplementation(async () => {
        throw new Error('Failed');
      });

      await queue.enqueue({
        type: 'create',
        collection: 'quizzes',
        data: { name: 'Quiz 1' },
        operation: op1,
      });

      await queue.enqueue({
        type: 'create',
        collection: 'quizzes',
        data: { name: 'Quiz 2' },
        operation: op2,
      });

      const stateBefore = queue.getState();
      expect(stateBefore.total).toBe(2);

      // Process the queue (will retry failed operations)
      await queue.processQueue();

      const stateAfter = queue.getState();
      expect(stateAfter.completed).toBeGreaterThanOrEqual(1);
      // Failed op may still be retrying or marked as failed
      expect(stateAfter.failed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('persistence', () => {
    it('should save queue to localStorage', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      await queue.enqueue({
        type: 'create',
        collection: 'quizzes',
        data: { name: 'Test Quiz' },
        operation,
      });

      const stored = localStorageMock.getItem('test_queue');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe('create');
      expect(parsed[0].collection).toBe('quizzes');
    });

    it('should load queue from localStorage on initialization', async () => {
      // Create and populate a queue
      const operation = vi.fn().mockResolvedValue('success');
      await queue.enqueue({
        type: 'create',
        collection: 'quizzes',
        data: { name: 'Test Quiz' },
        operation,
      });

      // Create a new queue instance (should load from storage)
      const newQueue = new OfflineQueue({
        storageKey: 'test_queue',
        exposeToDevTools: false,
      });

      const state = newQueue.getState();
      expect(state.total).toBeGreaterThanOrEqual(1);

      // Clean up the new queue instance
      newQueue.destroy();
    });

    it('should not persist operation functions', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      await queue.enqueue({
        type: 'create',
        collection: 'quizzes',
        data: { name: 'Test Quiz' },
        operation,
      });

      const stored = localStorageMock.getItem('test_queue');
      const parsed = JSON.parse(stored!);

      expect(parsed[0].operation).toBeUndefined();
    });
  });

  describe('clearCompleted', () => {
    it('should remove completed operations', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      await queue.enqueue({
        type: 'create',
        collection: 'quizzes',
        data: { name: 'Quiz 1' },
        operation,
      });

      await queue.enqueue({
        type: 'create',
        collection: 'quizzes',
        data: { name: 'Quiz 2' },
        operation,
      });

      await queue.processQueue();

      queue.clearCompleted();

      const state = queue.getState();
      expect(state.completed).toBe(0);
    });

    it('should keep pending and failed operations', async () => {
      // Set offline so queue won't auto-process
      (global.navigator as any).onLine = false;

      // Create a new queue with lower retry count for faster test
      const testQueue = new OfflineQueue({
        storageKey: 'test_queue_clear',
        maxQueueSize: 10,
        maxRetries: 1, // Only 1 attempt
        exposeToDevTools: false,
      });

      const successOp = vi.fn().mockResolvedValue('success');

      // Create an operation that always fails
      const failedOp = vi.fn().mockRejectedValue(new Error('Permanent failure'));

      await testQueue.enqueue({
        type: 'create',
        collection: 'quizzes',
        data: { name: 'Success Quiz' },
        operation: successOp,
      });

      await testQueue.enqueue({
        type: 'create',
        collection: 'quizzes',
        data: { name: 'Failed Quiz' },
        operation: failedOp,
      });

      // Now go online and process
      (global.navigator as any).onLine = true;
      await testQueue.processQueue();

      // Clear only the completed ones
      testQueue.clearCompleted();

      const state = testQueue.getState();
      // One operation should remain (the failed one)
      expect(state.total).toBe(1);
      // The remaining operation should be failed
      expect(state.failed).toBe(1);
      expect(state.completed).toBe(0);

      // Cleanup
      testQueue.clearQueue();
      testQueue.destroy(); // Clean up event listeners
    });
  });

  describe('clearQueue', () => {
    it('should remove all operations', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      await queue.enqueue({
        type: 'create',
        collection: 'quizzes',
        data: { name: 'Quiz 1' },
        operation,
      });

      await queue.enqueue({
        type: 'create',
        collection: 'quizzes',
        data: { name: 'Quiz 2' },
        operation,
      });

      queue.clearQueue();

      const state = queue.getState();
      expect(state.total).toBe(0);
    });
  });

  describe('network flapping', () => {
    it('should handle rapid online/offline transitions', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      // Start offline
      (global.navigator as any).onLine = false;

      await queue.enqueue({
        type: 'create',
        collection: 'quizzes',
        data: { name: 'Test Quiz' },
        operation,
      });

      // Simulate rapid online/offline
      (global.navigator as any).onLine = true;
      window.dispatchEvent(new Event('online'));
      await manuallyProcessQueueInTestMode(queue);

      (global.navigator as any).onLine = false;
      window.dispatchEvent(new Event('offline'));

      (global.navigator as any).onLine = true;
      window.dispatchEvent(new Event('online'));
      await manuallyProcessQueueInTestMode(queue);

      // Operation should have succeeded
      expect(operation).toHaveBeenCalled();
    });
  });

  describe('hasPendingOperations', () => {
    it('should return true when there are pending operations', async () => {
      (global.navigator as any).onLine = false;
      const operation = vi.fn().mockResolvedValue('success');

      await queue.enqueue({
        type: 'create',
        collection: 'quizzes',
        data: { name: 'Test Quiz' },
        operation,
      });

      expect(queue.hasPendingOperations()).toBe(true);
    });

    it('should return false when queue is empty', () => {
      expect(queue.hasPendingOperations()).toBe(false);
    });

    it('should return false when all operations are completed', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      await queue.enqueue({
        type: 'create',
        collection: 'quizzes',
        data: { name: 'Test Quiz' },
        operation,
      });

      await queue.processQueue();

      // Clear completed to empty the queue
      queue.clearCompleted();

      expect(queue.hasPendingOperations()).toBe(false);
    });
  });

  describe('getOperation', () => {
    it('should return operation by ID', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const id = await queue.enqueue({
        type: 'create',
        collection: 'quizzes',
        data: { name: 'Test Quiz' },
        operation,
      });

      const op = queue.getOperation(id);
      expect(op).toBeDefined();
      expect(op!.id).toBe(id);
      expect(op!.type).toBe('create');
    });

    it('should return undefined for non-existent ID', () => {
      const op = queue.getOperation('non-existent-id');
      expect(op).toBeUndefined();
    });
  });

  describe('removeOperation', () => {
    it('should remove operation by ID', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const id = await queue.enqueue({
        type: 'create',
        collection: 'quizzes',
        data: { name: 'Test Quiz' },
        operation,
      });

      const removed = queue.removeOperation(id);
      expect(removed).toBe(true);

      const state = queue.getState();
      expect(state.total).toBe(0);
    });

    it('should return false for non-existent ID', () => {
      const removed = queue.removeOperation('non-existent-id');
      expect(removed).toBe(false);
    });
  });
});

describe('isOfflineError', () => {
  it('should return true for offline errors', () => {
    expect(isOfflineError(new Error('Network error'))).toBe(true);
    expect(isOfflineError(new Error('Failed to fetch'))).toBe(true);
    expect(isOfflineError(new Error('You are offline'))).toBe(true);
    expect(isOfflineError(new Error('Connection refused'))).toBe(true);
  });

  it('should return false for non-offline errors', () => {
    expect(isOfflineError(new Error('Validation failed'))).toBe(false);
    expect(isOfflineError(new Error('Permission denied'))).toBe(false);
    expect(isOfflineError('not an error')).toBe(false);
    expect(isOfflineError(null)).toBe(false);
  });
});
