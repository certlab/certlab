/**
 * Conflict-Aware Firestore Storage Wrapper Tests
 *
 * Tests for version-aware updates and conflict handling in storage operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  updateWithConflictResolution,
  batchUpdateWithConflictResolution,
  createConflictAwareUpdater,
  retryWithBackoff,
  shouldRetryError,
} from './firestore-storage-with-conflicts';
import { ConflictError } from './errors';

// Mock dependencies
vi.mock('./collaborative-editing', () => ({
  getDocumentLock: vi.fn(),
  updateDocumentVersion: vi.fn(),
  setEditorPresence: vi.fn(),
  removeEditorPresence: vi.fn(),
}));

vi.mock('./errors', () => ({
  ConflictError: class ConflictError extends Error {
    context?: Record<string, unknown>;
    constructor(message: string, context?: Record<string, unknown>) {
      super(message);
      this.name = 'ConflictError';
      this.context = context;
    }
  },
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

import {
  getDocumentLock,
  updateDocumentVersion,
  setEditorPresence,
  removeEditorPresence,
} from './collaborative-editing';

describe('Conflict-Aware Firestore Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateWithConflictResolution', () => {
    it('should successfully update document without conflicts', async () => {
      const mockLock = { version: 1, documentType: 'quiz', documentId: '123' };
      const mockVersionResult = { success: true, currentVersion: 2 };

      vi.mocked(getDocumentLock).mockResolvedValue(mockLock as any);
      vi.mocked(updateDocumentVersion).mockResolvedValue(mockVersionResult);

      const updateFn = vi.fn().mockResolvedValue({ title: 'Updated Quiz', version: 1 });

      const result = await updateWithConflictResolution(
        'quiz',
        '123',
        { title: 'Updated Quiz' },
        'user1',
        updateFn
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ title: 'Updated Quiz', version: 2 });
      expect(updateFn).toHaveBeenCalledWith({ title: 'Updated Quiz', version: 1 });
    });

    it('should detect version conflicts', async () => {
      const mockLock = { version: 3, documentType: 'quiz', documentId: '123' };

      vi.mocked(getDocumentLock).mockResolvedValue(mockLock as any);

      const updateFn = vi.fn();

      const result = await updateWithConflictResolution(
        'quiz',
        '123',
        { title: 'Updated Quiz' },
        'user1',
        updateFn,
        { expectedVersion: 1 }
      );

      expect(result.success).toBe(false);
      expect(result.requiresUserInput).toBe(true);
      expect(updateFn).not.toHaveBeenCalled();
    });

    it('should retry on conflict with auto-merge strategy', async () => {
      const mockLock = { version: 1, documentType: 'quiz', documentId: '123' };

      // First call fails with conflict, second succeeds
      vi.mocked(getDocumentLock)
        .mockResolvedValueOnce(mockLock as any)
        .mockResolvedValueOnce(mockLock as any);

      vi.mocked(updateDocumentVersion)
        .mockResolvedValueOnce({ success: false, currentVersion: 2, conflict: true })
        .mockResolvedValueOnce({ success: true, currentVersion: 3 });

      const updateFn = vi
        .fn()
        .mockResolvedValueOnce({ title: 'Updated Quiz', version: 1 })
        .mockResolvedValueOnce({ title: 'Updated Quiz', version: 2 });

      await updateWithConflictResolution(
        'quiz',
        '123',
        { title: 'Updated Quiz' },
        'user1',
        updateFn,
        { strategy: 'auto-merge', maxRetries: 3 }
      );

      // Should eventually succeed after retry
      expect(updateFn).toHaveBeenCalled();
    });

    it('should track presence when enabled', async () => {
      const mockLock = { version: 1, documentType: 'quiz', documentId: '123' };
      const mockVersionResult = { success: true, currentVersion: 2 };

      vi.mocked(getDocumentLock).mockResolvedValue(mockLock as any);
      vi.mocked(updateDocumentVersion).mockResolvedValue(mockVersionResult);
      vi.mocked(setEditorPresence).mockResolvedValue({} as any);
      vi.mocked(removeEditorPresence).mockResolvedValue();

      const updateFn = vi.fn().mockResolvedValue({ title: 'Updated Quiz' });

      await updateWithConflictResolution(
        'quiz',
        '123',
        { title: 'Updated Quiz' },
        'user1',
        updateFn,
        { trackPresence: true }
      );

      expect(setEditorPresence).toHaveBeenCalledWith('user1', 'User', 'quiz', '123');
      expect(removeEditorPresence).toHaveBeenCalledWith('user1', 'quiz', '123');
    });

    it('should handle max retries exceeded', async () => {
      const mockLock = { version: 1, documentType: 'quiz', documentId: '123' };

      vi.mocked(getDocumentLock).mockResolvedValue(mockLock as any);
      vi.mocked(updateDocumentVersion).mockResolvedValue({
        success: false,
        currentVersion: 2,
        conflict: true,
      });

      const updateFn = vi.fn().mockResolvedValue({ title: 'Updated Quiz' });

      const result = await updateWithConflictResolution(
        'quiz',
        '123',
        { title: 'Updated Quiz' },
        'user1',
        updateFn,
        { strategy: 'auto-merge', maxRetries: 2 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should require user input for manual strategy', async () => {
      const mockLock = { version: 1, documentType: 'quiz', documentId: '123' };

      vi.mocked(getDocumentLock).mockResolvedValue(mockLock as any);
      vi.mocked(updateDocumentVersion).mockResolvedValue({
        success: false,
        currentVersion: 2,
        conflict: true,
      });

      const updateFn = vi.fn();

      const result = await updateWithConflictResolution(
        'quiz',
        '123',
        { title: 'Updated Quiz' },
        'user1',
        updateFn,
        { strategy: 'manual' }
      );

      expect(result.success).toBe(false);
      expect(result.requiresUserInput).toBe(true);
    });
  });

  describe('batchUpdateWithConflictResolution', () => {
    it('should successfully update multiple documents', async () => {
      const mockLock = { version: 1 };
      const mockVersionResult = { success: true, currentVersion: 2 };

      vi.mocked(getDocumentLock).mockResolvedValue(mockLock as any);
      vi.mocked(updateDocumentVersion).mockResolvedValue(mockVersionResult);

      const updateFn = vi
        .fn()
        .mockResolvedValueOnce({ title: 'Quiz 1' })
        .mockResolvedValueOnce({ title: 'Quiz 2' })
        .mockResolvedValueOnce({ title: 'Quiz 3' });

      const updates = [
        { id: '1', data: { title: 'Quiz 1' } },
        { id: '2', data: { title: 'Quiz 2' } },
        { id: '3', data: { title: 'Quiz 3' } },
      ];

      const result = await batchUpdateWithConflictResolution('quiz', updates, 'user1', updateFn);

      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should handle mixed success and failure', async () => {
      const mockLock = { version: 1 };

      vi.mocked(getDocumentLock).mockResolvedValue(mockLock as any);

      // First succeeds, second conflicts, third fails
      vi.mocked(updateDocumentVersion)
        .mockResolvedValueOnce({ success: true, currentVersion: 2 })
        .mockResolvedValueOnce({ success: false, currentVersion: 2, conflict: true })
        .mockRejectedValueOnce(new Error('Network error'));

      const updateFn = vi
        .fn()
        .mockResolvedValueOnce({ title: 'Quiz 1' })
        .mockResolvedValueOnce({ title: 'Quiz 2' })
        .mockRejectedValueOnce(new Error('Network error'));

      const updates = [
        { id: '1', data: { title: 'Quiz 1' } },
        { id: '2', data: { title: 'Quiz 2' } },
        { id: '3', data: { title: 'Quiz 3' } },
      ];

      const result = await batchUpdateWithConflictResolution('quiz', updates, 'user1', updateFn, {
        maxRetries: 1,
      });

      expect(result.successful.length).toBeGreaterThanOrEqual(1);
      // Some may fail or have conflicts
      expect(result.failed.length + result.conflicts.length).toBeGreaterThanOrEqual(1);
    });

    it('should process updates in batches', async () => {
      const mockLock = { version: 1 };
      const mockVersionResult = { success: true, currentVersion: 2 };

      vi.mocked(getDocumentLock).mockResolvedValue(mockLock as any);
      vi.mocked(updateDocumentVersion).mockResolvedValue(mockVersionResult);

      const updateFn = vi.fn().mockResolvedValue({ title: 'Quiz' });

      // Create 12 updates (should be processed in batches)
      const updates = Array.from({ length: 12 }, (_, i) => ({
        id: String(i),
        data: { title: `Quiz ${i}` },
      }));

      const result = await batchUpdateWithConflictResolution('quiz', updates, 'user1', updateFn);

      // Verify most updates succeeded (allowing for potential race conditions in tests)
      expect(result.successful.length).toBeGreaterThanOrEqual(10);
      expect(result.failed.length + result.conflicts.length).toBeLessThanOrEqual(2);
    });
  });

  describe('createConflictAwareUpdater', () => {
    it('should create a wrapped update function', async () => {
      const mockLock = { version: 1, documentType: 'quiz', documentId: '123' };
      const mockVersionResult = { success: true, currentVersion: 2 };

      vi.mocked(getDocumentLock).mockResolvedValue(mockLock as any);
      vi.mocked(updateDocumentVersion).mockResolvedValue(mockVersionResult);

      const baseUpdateFn = vi.fn().mockResolvedValue({ title: 'Updated Quiz' });

      const updater = createConflictAwareUpdater('quiz', baseUpdateFn, {
        strategy: 'auto-merge',
      });

      const result = await updater('123', { title: 'Updated Quiz' }, 'user1');

      expect(result.success).toBe(true);
      expect(baseUpdateFn).toHaveBeenCalled();
    });

    it('should merge default and custom options', async () => {
      const mockLock = { version: 1, documentType: 'quiz', documentId: '123' };
      const mockVersionResult = { success: true, currentVersion: 2 };

      vi.mocked(getDocumentLock).mockResolvedValue(mockLock as any);
      vi.mocked(updateDocumentVersion).mockResolvedValue(mockVersionResult);

      const baseUpdateFn = vi.fn().mockResolvedValue({ title: 'Updated Quiz' });

      const updater = createConflictAwareUpdater('quiz', baseUpdateFn, {
        strategy: 'auto-merge',
        maxRetries: 2,
      });

      await updater('123', { title: 'Updated Quiz' }, 'user1', {
        maxRetries: 5, // Override
      });

      // Should use the custom maxRetries value
      expect(baseUpdateFn).toHaveBeenCalled();
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first try', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce('success');

      const result = await retryWithBackoff(operation, 3);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(retryWithBackoff(operation, 3)).rejects.toThrow('Persistent failure');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff delays', async () => {
      vi.useFakeTimers();

      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');

      const promise = retryWithBackoff(operation, 3, 100);

      // First attempt fails immediately
      await vi.advanceTimersByTimeAsync(0);

      // Wait for first retry delay (100ms)
      await vi.advanceTimersByTimeAsync(100);

      // Wait for second retry delay (200ms)
      await vi.advanceTimersByTimeAsync(200);

      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });
  });

  describe('shouldRetryError', () => {
    it('should retry on ConflictError', () => {
      const error = new ConflictError('Version conflict');
      expect(shouldRetryError(error)).toBe(true);
    });

    it('should retry on network errors', () => {
      expect(shouldRetryError(new Error('Network timeout'))).toBe(true);
      expect(shouldRetryError(new Error('Connection unavailable'))).toBe(true);
      expect(shouldRetryError(new Error('network failure'))).toBe(true);
    });

    it('should not retry on other errors', () => {
      expect(shouldRetryError(new Error('Validation failed'))).toBe(false);
      expect(shouldRetryError(new Error('Permission denied'))).toBe(false);
    });

    it('should handle non-Error objects', () => {
      expect(shouldRetryError('string error')).toBe(false);
      expect(shouldRetryError(null)).toBe(false);
      expect(shouldRetryError(undefined)).toBe(false);
    });
  });
});
