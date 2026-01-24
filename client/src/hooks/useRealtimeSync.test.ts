/**
 * Tests for useRealtimeSync hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useRealtimeDocument,
  useRealtimeCollection,
  useRealtimeUserQuizzes,
  useRealtimeUserProgress,
  useRealtimeUserBadges,
} from './useRealtimeSync';
import * as realtimeSync from '@/lib/realtime-sync';

// Mock the realtime-sync module
vi.mock('@/lib/realtime-sync', () => {
  const mockUnsubscribe = vi.fn();

  return {
    realtimeSyncManager: {
      subscribeToDocument: vi.fn((path, callback) => {
        setTimeout(() => {
          callback(
            { id: '123', name: 'Test Document' },
            { fromCache: false, hasPendingWrites: false, isDeleted: false }
          );
        }, 0);
        return `doc:${path}:${Date.now()}`;
      }),
      subscribeToCollection: vi.fn((path, callback) => {
        setTimeout(() => {
          callback(
            [
              { id: '1', name: 'Item 1' },
              { id: '2', name: 'Item 2' },
            ],
            {
              fromCache: false,
              hasPendingWrites: false,
              changes: [{ type: 'added', doc: { id: '1', name: 'Item 1' } }],
            }
          );
        }, 0);
        return `col:${path}:${Date.now()}`;
      }),
      unsubscribe: mockUnsubscribe,
    },
  };
});

describe('useRealtimeSync Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useRealtimeDocument', () => {
    it('should subscribe to document and return data', async () => {
      const { result } = renderHook(() => useRealtimeDocument('users/123'));

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual({ id: '123', name: 'Test Document' });
      expect(result.current.error).toBeNull();
      expect(result.current.fromCache).toBe(false);
      expect(result.current.hasPendingWrites).toBe(false);
    });

    it('should not subscribe when path is null', () => {
      const { result } = renderHook(() => useRealtimeDocument(null));

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeNull();
      expect(realtimeSync.realtimeSyncManager.subscribeToDocument).not.toHaveBeenCalled();
    });

    it('should not subscribe when enabled is false', () => {
      const { result } = renderHook(() => useRealtimeDocument('users/123', { enabled: false }));

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeNull();
      expect(realtimeSync.realtimeSyncManager.subscribeToDocument).not.toHaveBeenCalled();
    });

    it('should unsubscribe on unmount', async () => {
      const { unmount } = renderHook(() => useRealtimeDocument('users/123'));

      await waitFor(() => {
        expect(realtimeSync.realtimeSyncManager.subscribeToDocument).toHaveBeenCalled();
      });

      unmount();

      expect(realtimeSync.realtimeSyncManager.unsubscribe).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const testError = new Error('Subscription failed');
      vi.mocked(realtimeSync.realtimeSyncManager.subscribeToDocument).mockImplementationOnce(
        (path, callback, options) => {
          setTimeout(() => {
            if (options?.onError) {
              options.onError(testError);
            }
          }, 0);
          return `doc:${path}:${Date.now()}`;
        }
      );

      const { result } = renderHook(() => useRealtimeDocument('users/123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(testError);
    });

    it('should resubscribe when path changes', async () => {
      const { result, rerender } = renderHook(({ path }) => useRealtimeDocument(path), {
        initialProps: { path: 'users/123' },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const callCount = vi.mocked(realtimeSync.realtimeSyncManager.subscribeToDocument).mock.calls
        .length;

      rerender({ path: 'users/456' });

      await waitFor(() => {
        expect(
          vi.mocked(realtimeSync.realtimeSyncManager.subscribeToDocument).mock.calls.length
        ).toBeGreaterThan(callCount);
      });
    });

    it('should reset state when path becomes null', async () => {
      const { result, rerender } = renderHook(({ path }) => useRealtimeDocument(path), {
        initialProps: { path: 'users/123' },
      });

      // Wait for initial subscription to load data
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.data).toBeTruthy();
      });

      // Change path to null
      rerender({ path: null });

      // State should be reset
      await waitFor(() => {
        expect(result.current.data).toBeNull();
        expect(result.current.error).toBeNull();
        expect(result.current.fromCache).toBe(false);
        expect(result.current.hasPendingWrites).toBe(false);
        expect(result.current.loading).toBe(false);
      });

      // Should unsubscribe
      expect(realtimeSync.realtimeSyncManager.unsubscribe).toHaveBeenCalled();
    });

    it('should reset state when enabled becomes false', async () => {
      const { result, rerender } = renderHook(
        ({ enabled }) => useRealtimeDocument('users/123', { enabled }),
        {
          initialProps: { enabled: true },
        }
      );

      // Wait for initial subscription to load data
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.data).toBeTruthy();
      });

      // Disable hook
      rerender({ enabled: false });

      // State should be reset
      await waitFor(() => {
        expect(result.current.data).toBeNull();
        expect(result.current.error).toBeNull();
        expect(result.current.fromCache).toBe(false);
        expect(result.current.hasPendingWrites).toBe(false);
        expect(result.current.loading).toBe(false);
      });

      // Should unsubscribe
      expect(realtimeSync.realtimeSyncManager.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('useRealtimeCollection', () => {
    it('should subscribe to collection and return data', async () => {
      const { result } = renderHook(() => useRealtimeCollection('quizzes'));

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual([
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ]);
      expect(result.current.error).toBeNull();
      expect(result.current.fromCache).toBe(false);
      expect(result.current.hasPendingWrites).toBe(false);
      expect(result.current.changes).toHaveLength(1);
    });

    it('should not subscribe when path is null', () => {
      const { result } = renderHook(() => useRealtimeCollection(null));

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual([]);
      expect(realtimeSync.realtimeSyncManager.subscribeToCollection).not.toHaveBeenCalled();
    });

    it('should not subscribe when enabled is false', () => {
      const { result } = renderHook(() => useRealtimeCollection('quizzes', { enabled: false }));

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual([]);
      expect(realtimeSync.realtimeSyncManager.subscribeToCollection).not.toHaveBeenCalled();
    });

    it('should pass filters to subscription', async () => {
      const filters = [{ field: 'userId', operator: '==', value: 'user123' }];

      renderHook(() => useRealtimeCollection('quizzes', { filters }));

      await waitFor(() => {
        expect(realtimeSync.realtimeSyncManager.subscribeToCollection).toHaveBeenCalledWith(
          'quizzes',
          expect.any(Function),
          expect.objectContaining({ filters })
        );
      });
    });

    it('should pass orderBy to subscription', async () => {
      const orderBy = { field: 'createdAt', direction: 'desc' as const };

      renderHook(() => useRealtimeCollection('quizzes', { orderBy }));

      await waitFor(() => {
        expect(realtimeSync.realtimeSyncManager.subscribeToCollection).toHaveBeenCalledWith(
          'quizzes',
          expect.any(Function),
          expect.objectContaining({ orderBy })
        );
      });
    });

    it('should unsubscribe on unmount', async () => {
      const { unmount } = renderHook(() => useRealtimeCollection('quizzes'));

      await waitFor(() => {
        expect(realtimeSync.realtimeSyncManager.subscribeToCollection).toHaveBeenCalled();
      });

      unmount();

      expect(realtimeSync.realtimeSyncManager.unsubscribe).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const testError = new Error('Subscription failed');
      vi.mocked(realtimeSync.realtimeSyncManager.subscribeToCollection).mockImplementationOnce(
        (path, callback, options) => {
          setTimeout(() => {
            if (options?.onError) {
              options.onError(testError);
            }
          }, 0);
          return `col:${path}:${Date.now()}`;
        }
      );

      const { result } = renderHook(() => useRealtimeCollection('quizzes'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(testError);
    });

    it('should reset state when path becomes null', async () => {
      const { result, rerender } = renderHook(({ path }) => useRealtimeCollection(path), {
        initialProps: { path: 'quizzes' },
      });

      // Wait for initial subscription to load data
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.data).toBeTruthy();
      });

      // Change path to null
      rerender({ path: null });

      // State should be reset
      await waitFor(() => {
        expect(result.current.data).toEqual([]);
        expect(result.current.changes).toEqual([]);
        expect(result.current.error).toBeNull();
        expect(result.current.fromCache).toBe(false);
        expect(result.current.hasPendingWrites).toBe(false);
        expect(result.current.loading).toBe(false);
      });

      // Should unsubscribe
      expect(realtimeSync.realtimeSyncManager.unsubscribe).toHaveBeenCalled();
    });

    it('should reset state when enabled becomes false', async () => {
      const { result, rerender } = renderHook(
        ({ enabled }) => useRealtimeCollection('quizzes', { enabled }),
        {
          initialProps: { enabled: true },
        }
      );

      // Wait for initial subscription to load data
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.data).toBeTruthy();
      });

      // Disable hook
      rerender({ enabled: false });

      // State should be reset
      await waitFor(() => {
        expect(result.current.data).toEqual([]);
        expect(result.current.changes).toEqual([]);
        expect(result.current.error).toBeNull();
        expect(result.current.fromCache).toBe(false);
        expect(result.current.hasPendingWrites).toBe(false);
        expect(result.current.loading).toBe(false);
      });

      // Should unsubscribe
      expect(realtimeSync.realtimeSyncManager.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('useRealtimeUserQuizzes', () => {
    it('should subscribe to user quizzes', async () => {
      const { result } = renderHook(() => useRealtimeUserQuizzes('user123'));

      await waitFor(() => {
        expect(realtimeSync.realtimeSyncManager.subscribeToCollection).toHaveBeenCalledWith(
          'users/user123/quizzes',
          expect.any(Function),
          expect.objectContaining({
            orderBy: { field: 'createdAt', direction: 'desc' },
          })
        );
      });

      expect(result.current.data).toHaveLength(2);
    });

    it('should not subscribe when userId is null', () => {
      renderHook(() => useRealtimeUserQuizzes(null));

      expect(realtimeSync.realtimeSyncManager.subscribeToCollection).not.toHaveBeenCalled();
    });
  });

  describe('useRealtimeUserProgress', () => {
    it('should subscribe to user progress', async () => {
      const { result } = renderHook(() => useRealtimeUserProgress('user123'));

      await waitFor(() => {
        expect(realtimeSync.realtimeSyncManager.subscribeToCollection).toHaveBeenCalledWith(
          'users/user123/userProgress',
          expect.any(Function),
          expect.objectContaining({
            orderBy: { field: 'lastUpdated', direction: 'desc' },
          })
        );
      });

      await waitFor(() => {
        expect(result.current.data).toHaveLength(2);
      });
    });

    it('should not subscribe when userId is null', () => {
      renderHook(() => useRealtimeUserProgress(null));

      expect(realtimeSync.realtimeSyncManager.subscribeToCollection).not.toHaveBeenCalled();
    });
  });

  describe('useRealtimeUserBadges', () => {
    it('should subscribe to user badges', async () => {
      const { result } = renderHook(() => useRealtimeUserBadges('user123'));

      await waitFor(() => {
        expect(realtimeSync.realtimeSyncManager.subscribeToCollection).toHaveBeenCalledWith(
          'users/user123/userBadges',
          expect.any(Function),
          expect.objectContaining({
            orderBy: { field: 'earnedAt', direction: 'desc' },
          })
        );
      });

      await waitFor(() => {
        expect(result.current.data).toHaveLength(2);
      });
    });

    it('should not subscribe when userId is null', () => {
      renderHook(() => useRealtimeUserBadges(null));

      expect(realtimeSync.realtimeSyncManager.subscribeToCollection).not.toHaveBeenCalled();
    });
  });
});
