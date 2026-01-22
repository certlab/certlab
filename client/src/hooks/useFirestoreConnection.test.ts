/**
 * Tests for useFirestoreConnection hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useFirestoreConnection } from './useFirestoreConnection';
import * as firestoreService from '@/lib/firestore-service';
import * as authProvider from '@/lib/auth-provider';

// Mock Firebase/Firestore modules with a factory function
vi.mock('firebase/firestore', () => {
  // Create default mock implementations
  const createMockOnSnapshot = () => {
    return vi.fn((query, onNext, onError) => {
      // Default: call onNext immediately with a successful snapshot
      setTimeout(() => {
        onNext({
          metadata: { fromCache: false, hasPendingWrites: false },
        });
      }, 0);
      return vi.fn(); // Return unsubscribe function
    });
  };

  return {
    getFirestore: vi.fn(() => ({ type: 'mock-firestore' })),
    collection: vi.fn((db, path) => ({ type: 'collection', path })),
    query: vi.fn((ref, ...constraints) => ({ type: 'query', ref, constraints })),
    limit: vi.fn((n) => ({ type: 'limit', value: n })),
    onSnapshot: createMockOnSnapshot(),
  };
});

describe('useFirestoreConnection', () => {
  // Store original navigator.onLine
  const originalOnLine = navigator.onLine;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Get fresh reference to mocked onSnapshot and reset it
    const { onSnapshot } = await import('firebase/firestore');
    const mockOnSnapshot = onSnapshot as unknown as ReturnType<typeof vi.fn>;
    mockOnSnapshot.mockImplementation((query: any, onNext: any, onError: any) => {
      setTimeout(() => {
        onNext({
          metadata: { fromCache: false, hasPendingWrites: false },
        });
      }, 0);
      return vi.fn(); // Return unsubscribe function
    });

    // Mock Firestore as initialized by default
    vi.spyOn(firestoreService, 'isFirestoreInitialized').mockReturnValue(true);

    // Mock auth as enabled with a user
    vi.spyOn(authProvider, 'useAuth').mockReturnValue({
      isCloudSyncEnabled: true,
      firebaseUser: { email: 'test@example.com', uid: 'test-uid' } as any,
    } as any);

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    // Restore navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: originalOnLine,
    });
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with disabled state when Firestore is not initialized', () => {
      vi.spyOn(firestoreService, 'isFirestoreInitialized').mockReturnValue(false);

      const { result } = renderHook(() => useFirestoreConnection());

      expect(result.current.status).toBe('disabled');
      expect(result.current.debugInfo.isFirestoreInitialized).toBe(false);
    });

    it('should initialize with disabled state when cloud sync is not enabled', () => {
      vi.spyOn(authProvider, 'useAuth').mockReturnValue({
        isCloudSyncEnabled: false,
        firebaseUser: null,
      } as any);

      const { result } = renderHook(() => useFirestoreConnection());

      expect(result.current.status).toBe('disabled');
    });

    it('should initialize with offline state when browser is offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const { result } = renderHook(() => useFirestoreConnection());

      expect(result.current.status).toBe('offline');
      expect(result.current.isOnline).toBe(false);
    });
  });

  describe('Connection Status', () => {
    it('should transition to connected state when Firestore snapshot succeeds', async () => {
      const { result } = renderHook(() => useFirestoreConnection());

      await waitFor(
        () => {
          expect(result.current.status).toBe('connected');
        },
        { timeout: 3000 }
      );

      expect(result.current.error).toBeNull();
      expect(result.current.debugInfo.lastSuccessfulSync).toBeInstanceOf(Date);
    });

    it('should handle snapshot errors and transition to error state', async () => {
      const mockError = new Error('Firestore connection failed');
      const { onSnapshot } = await import('firebase/firestore');
      const mockOnSnapshot = onSnapshot as unknown as ReturnType<typeof vi.fn>;

      mockOnSnapshot.mockImplementation((query: any, onNext: any, onError: any) => {
        setTimeout(() => {
          if (onError) onError(mockError);
        }, 0);
        return vi.fn();
      });

      const { result } = renderHook(() => useFirestoreConnection());

      await waitFor(
        () => {
          expect(result.current.status).toBe('error');
        },
        { timeout: 3000 }
      );

      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toContain('Firestore connection failed');
    });
  });

  describe('Network Events', () => {
    it('should handle browser going offline', async () => {
      const { result } = renderHook(() => useFirestoreConnection());

      // Wait for initial connection
      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      // Simulate browser going offline
      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false,
        });
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(result.current.status).toBe('offline');
        expect(result.current.isOnline).toBe(false);
      });
    });

    it('should handle browser coming back online', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const { result } = renderHook(() => useFirestoreConnection());

      expect(result.current.status).toBe('offline');

      // Come back online
      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: true,
        });
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
        // Status should transition to reconnecting or connected
        expect(['reconnecting', 'connected']).toContain(result.current.status);
      });
    });
  });

  describe('Manual Connection Check', () => {
    it('should allow manual connection checks', async () => {
      const { result } = renderHook(() => useFirestoreConnection());

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      // Call manual check
      await act(async () => {
        await result.current.checkConnection();
      });

      expect(result.current.status).toBe('connected');
      expect(result.current.error).toBeNull();
    });

    it('should handle errors during manual check', async () => {
      const { result } = renderHook(() => useFirestoreConnection());

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      // Simulate network going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      // Call manual check
      await act(async () => {
        await result.current.checkConnection();
      });

      expect(result.current.status).toBe('offline');
    });
  });

  describe('Debug Information', () => {
    it('should provide accurate debug information', async () => {
      const { result } = renderHook(() => useFirestoreConnection());

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      expect(result.current.debugInfo).toMatchObject({
        isFirestoreInitialized: true,
        isAuthenticated: true,
        browserOnline: true,
        reconnectAttempts: 0,
      });
      expect(result.current.debugInfo.lastSuccessfulSync).toBeInstanceOf(Date);
      expect(result.current.debugInfo.lastError).toBeNull();
    });

    it('should track reconnect attempts', async () => {
      const mockError = new Error('Connection failed');
      const { onSnapshot } = await import('firebase/firestore');
      const mockOnSnapshot = onSnapshot as unknown as ReturnType<typeof vi.fn>;

      mockOnSnapshot.mockImplementation((query: any, onNext: any, onError: any) => {
        setTimeout(() => {
          if (onError) onError(mockError);
        }, 0);
        return vi.fn();
      });

      const { result } = renderHook(() => useFirestoreConnection());

      await waitFor(
        () => {
          expect(result.current.status).toBe('error');
        },
        { timeout: 3000 }
      );

      // Reconnect attempts should be tracked
      await waitFor(
        () => {
          expect(result.current.debugInfo.reconnectAttempts).toBeGreaterThan(0);
        },
        { timeout: 6000 }
      );
    });
  });

  describe('Syncing State', () => {
    it('should indicate when syncing is in progress', async () => {
      const { result } = renderHook(() => useFirestoreConnection());

      // Initially may be syncing
      const wasSyncing = result.current.isSyncing;

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      // After connection, syncing should be false
      expect(result.current.isSyncing).toBe(false);
    });
  });

  describe('Cached Data Detection', () => {
    it('should handle data coming from cache', async () => {
      const { onSnapshot } = await import('firebase/firestore');
      const mockOnSnapshot = onSnapshot as unknown as ReturnType<typeof vi.fn>;

      mockOnSnapshot.mockImplementation((query: any, onNext: any, onError: any) => {
        setTimeout(() => {
          onNext({
            metadata: { fromCache: true, hasPendingWrites: false },
          });
        }, 0);
        return vi.fn();
      });

      const { result } = renderHook(() => useFirestoreConnection());

      // Should still initialize, but might not be marked as fully connected
      await waitFor(
        () => {
          expect(['connected', 'offline', 'reconnecting', 'disabled']).toContain(
            result.current.status
          );
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Cleanup', () => {
    it('should clean up listeners on unmount', async () => {
      const unsubscribe = vi.fn();
      const { onSnapshot } = await import('firebase/firestore');
      const mockOnSnapshot = onSnapshot as unknown as ReturnType<typeof vi.fn>;

      mockOnSnapshot.mockImplementation((query: any, onNext: any, onError: any) => {
        setTimeout(() => {
          onNext({
            metadata: { fromCache: false, hasPendingWrites: false },
          });
        }, 0);
        return unsubscribe;
      });

      const { unmount } = renderHook(() => useFirestoreConnection());

      await waitFor(
        () => {
          expect(mockOnSnapshot).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      unmount();

      // Unsubscribe should be called
      await waitFor(
        () => {
          expect(unsubscribe).toHaveBeenCalled();
        },
        { timeout: 1000 }
      );
    });
  });
});
