/**
 * Tests for Firestore Storage with Offline Queue
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFirestoreStorageWithQueue } from './firestore-storage-queued';
import { offlineQueue } from './offline-queue';
import type { IClientStorage } from '@shared/storage-interface';

// Mock storage implementation
const createMockStorage = (): Partial<IClientStorage> => ({
  createQuiz: vi.fn().mockResolvedValue({ id: '123', name: 'Test Quiz' }),
  updateQuiz: vi.fn().mockResolvedValue({ id: '123', name: 'Updated Quiz' }),
  deleteQuestion: vi.fn().mockResolvedValue(undefined),
  getUserQuizzes: vi.fn().mockResolvedValue([]),
});

describe('createFirestoreStorageWithQueue', () => {
  let mockStorage: Partial<IClientStorage>;
  let queuedStorage: IClientStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = createMockStorage();
    queuedStorage = createFirestoreStorageWithQueue(mockStorage as IClientStorage);

    // Clear the offline queue
    offlineQueue.clearQueue();

    // Mock navigator.onLine
    Object.defineProperty(global.navigator, 'onLine', {
      writable: true,
      value: true,
    });
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

  describe('when online', () => {
    it('should execute write operations directly', async () => {
      const result = await queuedStorage.createQuiz({ name: 'Test Quiz' } as any);

      expect(mockStorage.createQuiz).toHaveBeenCalledWith({ name: 'Test Quiz' });
      expect(result).toEqual({ id: '123', name: 'Test Quiz' });
    });

    it('should execute read operations directly', async () => {
      await queuedStorage.getUserQuizzes('user123', 1);

      expect(mockStorage.getUserQuizzes).toHaveBeenCalledWith('user123', 1);
    });

    it('should not queue operations when they succeed', async () => {
      await queuedStorage.createQuiz({ name: 'Test Quiz' } as any);

      const state = offlineQueue.getState();
      expect(state.total).toBe(0);
    });
  });

  describe('when offline', () => {
    beforeEach(() => {
      (global.navigator as any).onLine = false;
    });

    it('should queue create operations', async () => {
      // Make the operation fail with network error
      vi.mocked(mockStorage.createQuiz!).mockRejectedValueOnce(new Error('Network error'));

      const result = await queuedStorage.createQuiz({ name: 'Test Quiz' } as any);

      // Should return optimistic result
      expect((result as any)._queued).toBe(true);
      expect((result as any)._queueId).toBeTruthy();

      // Should have queued the operation
      const state = offlineQueue.getState();
      expect(state.total).toBe(1);
      expect(state.pending).toBeGreaterThanOrEqual(0);
    });

    it('should queue update operations', async () => {
      vi.mocked(mockStorage.updateQuiz!).mockRejectedValueOnce(new Error('Failed to fetch'));

      const result = await queuedStorage.updateQuiz(123, { name: 'Updated' } as any);

      expect((result as any)._queued).toBe(true);

      const state = offlineQueue.getState();
      expect(state.total).toBe(1);
    });

    it('should queue delete operations', async () => {
      vi.mocked(mockStorage.deleteQuestion!).mockRejectedValueOnce(new Error('Connection refused'));

      const result = await queuedStorage.deleteQuestion(456);

      expect((result as any)._queued).toBe(true);

      const state = offlineQueue.getState();
      expect(state.total).toBe(1);
    });
  });

  describe('network error handling', () => {
    it('should queue operations on network errors even when navigator says online', async () => {
      (global.navigator as any).onLine = true;

      // Simulate a network error even though browser thinks we're online
      vi.mocked(mockStorage.createQuiz!).mockRejectedValueOnce(new Error('Network request failed'));

      const result = await queuedStorage.createQuiz({ name: 'Test Quiz' } as any);

      expect((result as any)._queued).toBe(true);

      const state = offlineQueue.getState();
      expect(state.total).toBe(1);
    });

    it('should not queue non-network errors', async () => {
      // Simulate a validation error (not a network error)
      vi.mocked(mockStorage.createQuiz!).mockRejectedValueOnce(
        new Error('Validation failed: name is required')
      );

      await expect(queuedStorage.createQuiz({} as any)).rejects.toThrow('Validation failed');

      // Should not queue
      const state = offlineQueue.getState();
      expect(state.total).toBe(0);
    });
  });

  describe('optimistic results', () => {
    beforeEach(() => {
      (global.navigator as any).onLine = false;
    });

    it('should return optimistic result for create operations', async () => {
      vi.mocked(mockStorage.createQuiz!).mockRejectedValueOnce(new Error('Network error'));

      const result = await queuedStorage.createQuiz({
        name: 'Test Quiz',
        userId: 'user123',
      } as any);

      expect((result as any).name).toBe('Test Quiz');
      expect((result as any).userId).toBe('user123');
      expect((result as any).id).toBeTruthy(); // Should have temporary ID
      expect((result as any)._queued).toBe(true);
    });

    it('should use provided ID if available', async () => {
      vi.mocked(mockStorage.createQuiz!).mockRejectedValueOnce(new Error('Network error'));

      const result = await queuedStorage.createQuiz({
        id: 'my-custom-id',
        name: 'Test Quiz',
      } as any);

      expect((result as any).id).toBe('my-custom-id');
      expect((result as any)._queued).toBe(true);
    });

    it('should return optimistic result for update operations', async () => {
      vi.mocked(mockStorage.updateQuiz!).mockRejectedValueOnce(new Error('Network error'));

      const result = await queuedStorage.updateQuiz(123, {
        name: 'Updated Name',
      } as any);

      // Should have the ID and updates
      expect((result as any).id).toBe(123);
      expect((result as any).name).toBe('Updated Name');

      // Should be marked as queued
      expect((result as any)._queued).toBe(true);
    });
  });

  describe('read operations', () => {
    it('should not intercept read operations', async () => {
      // Read operations should always execute directly
      await queuedStorage.getUserQuizzes('user123', 1);

      expect(mockStorage.getUserQuizzes).toHaveBeenCalled();

      // Should not queue
      const state = offlineQueue.getState();
      expect(state.total).toBe(0);
    });
  });

  describe('queued operation execution', () => {
    it('should execute queued operations when processed', async () => {
      (global.navigator as any).onLine = false;

      // First call fails and queues
      vi.mocked(mockStorage.createQuiz!)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ id: 123, name: 'Test Quiz' } as any);

      await queuedStorage.createQuiz({ name: 'Test Quiz' } as any);

      // Operation should be queued
      const stateBefore = offlineQueue.getState();
      expect(stateBefore.total).toBe(1);

      // Go online and process queue
      (global.navigator as any).onLine = true;
      await offlineQueue.processQueue();

      // Operation should have executed
      expect(mockStorage.createQuiz).toHaveBeenCalledTimes(2); // Once for initial attempt, once for retry

      // Should be marked as completed
      const stateAfter = offlineQueue.getState();
      expect(stateAfter.completed).toBe(1);
    }, 5000); // Add 5 second timeout
  });
});
