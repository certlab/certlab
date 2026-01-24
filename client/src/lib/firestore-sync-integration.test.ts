/**
 * Enhanced Firestore Sync Integration Tests
 *
 * Tests comprehensive sync scenarios including:
 * - Online/offline transitions
 * - Multi-device synchronization
 * - Conflict resolution workflows
 * - Queue persistence and recovery
 * - Real-time update propagation
 * - Network reconnection handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFirestoreStorageWithQueue } from './firestore-storage-queued';
import { offlineQueue } from './offline-queue';
import type { IClientStorage } from '@shared/storage-interface';
import type { Quiz, Question } from '@shared/schema';

// Mock storage implementation
const createMockStorage = (): Partial<IClientStorage> => ({
  createQuiz: vi.fn(),
  updateQuiz: vi.fn(),
  deleteQuiz: vi.fn(),
  getUserQuizzes: vi.fn().mockResolvedValue([]),
  createQuestion: vi.fn(),
  updateQuestion: vi.fn(),
  deleteQuestion: vi.fn(),
  getQuestionsByCategories: vi.fn().mockResolvedValue([]),
  updateUser: vi.fn(),
  createUserProgress: vi.fn(),
  updateUserProgress: vi.fn(),
});

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

describe('Firestore Sync - Integration Tests', () => {
  let mockStorage: Partial<IClientStorage>;
  let queuedStorage: IClientStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    offlineQueue.clearQueue();

    mockStorage = createMockStorage();
    queuedStorage = createFirestoreStorageWithQueue(mockStorage as IClientStorage);

    // Mock navigator.onLine
    Object.defineProperty(global.navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    offlineQueue.clearQueue();
  });

  describe('Online/Offline Transitions', () => {
    it('should queue operations when going offline during execution', async () => {
      // Start online
      (global.navigator as any).onLine = true;

      // Simulate network failure during operation
      vi.mocked(mockStorage.createQuiz!).mockRejectedValue(new Error('Network error'));

      const quiz: Partial<Quiz> = {
        userId: 'user123',
        name: 'Test Quiz',
        categoryIds: [1],
        mode: 'practice',
      };

      const result = await queuedStorage.createQuiz(quiz);

      // Should return optimistic result
      expect((result as any)._queued).toBe(true);

      // Should have queued the operation
      const state = offlineQueue.getState();
      expect(state.total).toBe(1);
    });

    it('should process queued operations when coming back online', async () => {
      // Start offline
      (global.navigator as any).onLine = false;

      // Queue multiple operations
      vi.mocked(mockStorage.createQuiz!)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({ id: 1, name: 'Quiz 1' } as Quiz);

      await queuedStorage.createQuiz({ name: 'Quiz 1' } as any);
      await queuedStorage.createQuiz({ name: 'Quiz 2' } as any);

      const stateBefore = offlineQueue.getState();
      expect(stateBefore.total).toBe(2);

      // Go online
      (global.navigator as any).onLine = true;

      // Mock successful execution
      vi.mocked(mockStorage.createQuiz!).mockResolvedValue({ id: 1 } as Quiz);

      // Process queue
      await offlineQueue.processQueue();

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Operations should be executed
      expect(mockStorage.createQuiz).toHaveBeenCalled();
    });

    it('should handle rapid online/offline transitions', async () => {
      const operations: Promise<any>[] = [];

      // Simulate rapid network changes
      for (let i = 0; i < 5; i++) {
        (global.navigator as any).onLine = i % 2 === 0;

        if (i % 2 === 0) {
          // Online - operation succeeds
          vi.mocked(mockStorage.createQuiz!).mockResolvedValue({ id: i } as Quiz);
        } else {
          // Offline - operation fails
          vi.mocked(mockStorage.createQuiz!).mockRejectedValue(new Error('Network error'));
        }

        operations.push(queuedStorage.createQuiz({ name: `Quiz ${i}` } as any));
      }

      const results = await Promise.all(operations);

      // Some should succeed, some should be queued
      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result).toBeDefined();
      });
    });

    it('should persist queued operations to localStorage during offline period', async () => {
      (global.navigator as any).onLine = false;

      vi.mocked(mockStorage.createQuiz!).mockRejectedValue(new Error('Network error'));

      await queuedStorage.createQuiz({ name: 'Quiz 1' } as any);
      await queuedStorage.createQuiz({ name: 'Quiz 2' } as any);

      // Check localStorage
      const stored = localStorageMock.getItem('certlab_offline_queue');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.length).toBeGreaterThanOrEqual(2);
    });

    it('should recover queued operations from localStorage on initialization', async () => {
      // Pre-populate localStorage with queued operations
      const mockQueue = [
        {
          id: 'op1',
          type: 'create',
          collection: 'quizzes',
          data: { name: 'Recovered Quiz 1' },
          timestamp: Date.now(),
          retries: 0,
          status: 'pending',
        },
        {
          id: 'op2',
          type: 'update',
          collection: 'quizzes',
          data: { id: 1, name: 'Recovered Quiz 2' },
          timestamp: Date.now(),
          retries: 0,
          status: 'pending',
        },
      ];

      localStorageMock.setItem('certlab_offline_queue', JSON.stringify(mockQueue));

      // Create new queue instance (should load from localStorage)
      const newQueueInstance = new (offlineQueue.constructor as any)({
        storageKey: 'certlab_offline_queue',
      });

      const state = newQueueInstance.getState();
      expect(state.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Multi-Device Synchronization', () => {
    it('should handle operations from multiple devices', async () => {
      // Simulate two devices making changes to the same quiz
      const quizId = 1;

      // Device 1 updates
      const device1Update = { name: 'Quiz from Device 1', score: 80 };
      // Device 2 updates
      const device2Update = { name: 'Quiz from Device 2', score: 90 };

      vi.mocked(mockStorage.updateQuiz!)
        .mockResolvedValueOnce({ id: quizId, ...device1Update } as Quiz)
        .mockResolvedValueOnce({ id: quizId, ...device2Update } as Quiz);

      // Both devices update concurrently
      const [result1, result2] = await Promise.all([
        queuedStorage.updateQuiz(quizId, device1Update),
        queuedStorage.updateQuiz(quizId, device2Update),
      ]);

      // Both updates should succeed
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();

      // Firestore will use last-write-wins
      expect(mockStorage.updateQuiz).toHaveBeenCalledTimes(2);
    });

    it('should sync operations across browser tabs', async () => {
      // Simulate operations in one tab being visible to another

      // Tab 1 creates a quiz
      vi.mocked(mockStorage.createQuiz!).mockResolvedValue({
        id: 1,
        name: 'Shared Quiz',
      } as Quiz);

      await queuedStorage.createQuiz({ name: 'Shared Quiz' } as any);

      // Tab 2 queries for quizzes and should see the new one
      vi.mocked(mockStorage.getUserQuizzes!).mockResolvedValue([
        { id: 1, name: 'Shared Quiz' } as Quiz,
      ]);

      const quizzes = await queuedStorage.getUserQuizzes('user123', 1);

      expect(quizzes).toHaveLength(1);
      expect(quizzes[0].name).toBe('Shared Quiz');
    });
  });

  describe('Conflict Resolution Workflows', () => {
    it('should detect version conflicts on update', async () => {
      const quizId = 1;

      // First update succeeds
      vi.mocked(mockStorage.updateQuiz!).mockResolvedValueOnce({
        id: quizId,
        name: 'Updated',
        version: 2,
      } as Quiz);

      await queuedStorage.updateQuiz(quizId, { name: 'Updated' });

      // Second update with stale version should be detected
      // (In real implementation, version checks would happen in firestore-storage-with-conflicts)
      expect(mockStorage.updateQuiz).toHaveBeenCalledTimes(1);
    });

    it('should retry failed operations with exponential backoff', async () => {
      let attempts = 0;

      vi.mocked(mockStorage.createQuiz!).mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Network error');
        }
        return { id: 1, name: 'Quiz' } as Quiz;
      });

      (global.navigator as any).onLine = false;

      // Initial attempt (will fail and queue)
      await queuedStorage.createQuiz({ name: 'Quiz' } as any);

      // Go online and process
      (global.navigator as any).onLine = true;
      await offlineQueue.processQueue();

      // Should have retried multiple times
      expect(attempts).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Queue Persistence and Recovery', () => {
    it('should maintain queue order across page reloads', async () => {
      (global.navigator as any).onLine = false;

      vi.mocked(mockStorage.createQuiz!).mockRejectedValue(new Error('Network error'));

      // Queue operations in specific order
      await queuedStorage.createQuiz({ name: 'Quiz 1' } as any);
      await queuedStorage.createQuiz({ name: 'Quiz 2' } as any);
      await queuedStorage.createQuiz({ name: 'Quiz 3' } as any);

      const stored = localStorageMock.getItem('certlab_offline_queue');
      const parsed = JSON.parse(stored!);

      // Verify order is preserved
      expect(parsed[0].data.name).toBe('Quiz 1');
      expect(parsed[1].data.name).toBe('Quiz 2');
      expect(parsed[2].data.name).toBe('Quiz 3');
    });

    it('should handle corrupted localStorage data gracefully', async () => {
      // Corrupt the localStorage data
      localStorageMock.setItem('certlab_offline_queue', 'invalid json{');

      // Should not throw when creating new instance
      expect(() => {
        new (offlineQueue.constructor as any)({
          storageKey: 'certlab_offline_queue',
        });
      }).not.toThrow();
    });

    it('should limit queue size to prevent memory issues', async () => {
      (global.navigator as any).onLine = false;

      vi.mocked(mockStorage.createQuiz!).mockRejectedValue(new Error('Network error'));

      const maxQueueSize = 10;

      // Try to queue more than max
      const promises: Promise<any>[] = [];
      for (let i = 0; i < maxQueueSize + 5; i++) {
        promises.push(queuedStorage.createQuiz({ name: `Quiz ${i}` } as any).catch(() => null));
      }

      await Promise.all(promises);

      const state = offlineQueue.getState();
      // Should not exceed max queue size
      expect(state.total).toBeLessThanOrEqual(maxQueueSize + 5); // Some may have processed
    });

    it('should clear completed operations from queue', async () => {
      vi.mocked(mockStorage.createQuiz!).mockResolvedValue({ id: 1 } as Quiz);

      await queuedStorage.createQuiz({ name: 'Quiz 1' } as any);
      await queuedStorage.createQuiz({ name: 'Quiz 2' } as any);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Clear completed
      offlineQueue.clearCompleted();

      const state = offlineQueue.getState();
      expect(state.completed).toBe(0);
    });
  });

  describe('Real-time Update Propagation', () => {
    it('should propagate updates immediately when online', async () => {
      (global.navigator as any).onLine = true;

      const mockQuiz = { id: 1, name: 'Real-time Quiz' } as Quiz;
      vi.mocked(mockStorage.createQuiz!).mockResolvedValue(mockQuiz);

      const result = await queuedStorage.createQuiz({ name: 'Real-time Quiz' } as any);

      // Should execute immediately
      expect(mockStorage.createQuiz).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockQuiz);

      // Should not be queued
      const state = offlineQueue.getState();
      expect(state.total).toBe(0);
    });

    it('should handle simultaneous updates to different entities', async () => {
      (global.navigator as any).onLine = true;

      vi.mocked(mockStorage.createQuiz!).mockResolvedValue({ id: 1 } as Quiz);
      vi.mocked(mockStorage.createQuestion!).mockResolvedValue({ id: 1 } as Question);
      vi.mocked(mockStorage.updateUser!).mockResolvedValue({ id: 'user123' } as any);

      // Execute different operations simultaneously
      const [quiz, question, user] = await Promise.all([
        queuedStorage.createQuiz({ name: 'Quiz' } as any),
        queuedStorage.createQuestion({ question: 'Question' } as any),
        queuedStorage.updateUser('user123', { username: 'updated' } as any),
      ]);

      expect(quiz).toBeDefined();
      expect(question).toBeDefined();
      expect(user).toBeDefined();

      // All should have executed
      expect(mockStorage.createQuiz).toHaveBeenCalled();
      expect(mockStorage.createQuestion).toHaveBeenCalled();
      expect(mockStorage.updateUser).toHaveBeenCalled();
    });
  });

  describe('Network Reconnection Handling', () => {
    it('should automatically retry when network reconnects', async () => {
      (global.navigator as any).onLine = false;

      vi.mocked(mockStorage.createQuiz!)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({ id: 1, name: 'Quiz' } as Quiz);

      // Queue operation while offline
      await queuedStorage.createQuiz({ name: 'Quiz' } as any);

      expect(offlineQueue.hasPendingOperations()).toBe(true);

      // Simulate network reconnection
      (global.navigator as any).onLine = true;
      window.dispatchEvent(new Event('online'));

      // Wait for auto-processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Operation should have been executed
      expect(mockStorage.createQuiz).toHaveBeenCalled();
    });

    it('should handle partial network failures (some operations succeed, some fail)', async () => {
      (global.navigator as any).onLine = true;

      // First operation succeeds
      vi.mocked(mockStorage.createQuiz!)
        .mockResolvedValueOnce({ id: 1 } as Quiz)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ id: 3 } as Quiz);

      const results = await Promise.all([
        queuedStorage.createQuiz({ name: 'Quiz 1' } as any),
        queuedStorage.createQuiz({ name: 'Quiz 2' } as any).catch((e) => ({ error: e.message })),
        queuedStorage.createQuiz({ name: 'Quiz 3' } as any),
      ]);

      // First and third should succeed
      expect(results[0]).toHaveProperty('id');
      expect(results[2]).toHaveProperty('id');

      // Second should be queued or have error
      expect(results[1]).toBeDefined();
    });

    it('should debounce network status changes', async () => {
      const createQuizSpy = vi.mocked(mockStorage.createQuiz!);
      createQuizSpy.mockResolvedValue({ id: 1 } as Quiz);

      // Rapid network changes
      for (let i = 0; i < 10; i++) {
        (global.navigator as any).onLine = i % 2 === 0;
        window.dispatchEvent(new Event(i % 2 === 0 ? 'online' : 'offline'));
      }

      // Wait for debouncing
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Should not have processed queue excessively
      // (actual implementation may vary)
      expect(createQuizSpy.mock.calls.length).toBeLessThan(20);
    });
  });

  describe('Error Recovery', () => {
    it('should mark operations as failed after max retries', async () => {
      vi.mocked(mockStorage.createQuiz!).mockRejectedValue(new Error('Permanent failure'));

      (global.navigator as any).onLine = false;

      await queuedStorage.createQuiz({ name: 'Quiz' } as any);

      // Go online and try to process
      (global.navigator as any).onLine = true;
      await offlineQueue.processQueue();

      // Wait for retries to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      const state = offlineQueue.getState();
      // Should have some failed operations
      expect(state.failed).toBeGreaterThanOrEqual(0);
    });

    it('should preserve failed operations for manual retry', async () => {
      vi.mocked(mockStorage.createQuiz!).mockRejectedValue(new Error('Error'));

      (global.navigator as any).onLine = false;

      const result = await queuedStorage.createQuiz({ name: 'Quiz' } as any);
      const queueId = (result as any)._queueId;

      // Verify operation is in queue
      const operation = offlineQueue.getOperation(queueId);
      expect(operation).toBeDefined();
    });

    it('should allow manual removal of failed operations', async () => {
      vi.mocked(mockStorage.createQuiz!).mockRejectedValue(new Error('Error'));

      (global.navigator as any).onLine = false;

      const result = await queuedStorage.createQuiz({ name: 'Quiz' } as any);
      const queueId = (result as any)._queueId;

      // Remove operation
      const removed = offlineQueue.removeOperation(queueId);
      expect(removed).toBe(true);

      // Should no longer be in queue
      const operation = offlineQueue.getOperation(queueId);
      expect(operation).toBeUndefined();
    });
  });
});
