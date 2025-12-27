import React, { useEffect, useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './auth-provider';

// Mock the Firebase module
vi.mock('./firebase', () => ({
  isFirebaseConfigured: vi.fn().mockReturnValue(true),
  initializeFirebase: vi.fn().mockReturnValue(true),
  onFirebaseAuthStateChanged: vi.fn((callback) => {
    // Immediately call the callback with null (no user) to simulate no auth
    setTimeout(() => callback(null), 0);
    return () => {}; // Return cleanup function
  }),
  signOutFromGoogle: vi.fn().mockResolvedValue(undefined),
  getCurrentFirebaseUser: vi.fn().mockReturnValue(null),
}));

// Mock the storage-factory module
vi.mock('./storage-factory', () => ({
  initializeStorage: vi.fn().mockResolvedValue(undefined),
  setStorageMode: vi.fn().mockResolvedValue(undefined),
  isCloudSyncAvailable: vi.fn().mockReturnValue(false),
  storage: {
    getUser: vi.fn().mockResolvedValue(null),
    createUser: vi.fn().mockResolvedValue(null),
    setCurrentUserId: vi.fn().mockResolvedValue(undefined),
    clearCurrentUser: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock the client-auth module
vi.mock('./client-auth', () => ({
  clientAuth: {
    getCurrentUser: vi.fn().mockResolvedValue(null),
    logout: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock the errors module
vi.mock('./errors', () => ({
  logError: vi.fn(),
}));

// Mock the dynatrace module
vi.mock('./dynatrace', () => ({
  identifyUser: vi.fn(),
  endSession: vi.fn(),
}));

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('provides auth context to children', async () => {
    function TestComponent() {
      const { isLoading, user, isAuthenticated } = useAuth();
      return (
        <div>
          <span data-testid="loading">{String(isLoading)}</span>
          <span data-testid="user">{user ? user.email : 'null'}</span>
          <span data-testid="authenticated">{String(isAuthenticated)}</span>
        </div>
      );
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initially loading is true
    expect(screen.getByTestId('loading')).toHaveTextContent('true');

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
  });

  it('throws error when useAuth is used outside AuthProvider', () => {
    function TestComponent() {
      useAuth();
      return <div>Test</div>;
    }

    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });

  it('memoizes callback functions between renders', async () => {
    const logoutRefs: Array<() => Promise<void>> = [];
    const refreshUserRefs: Array<() => Promise<void>> = [];
    const switchTenantRefs: Array<(tenantId: number) => Promise<void>> = [];

    function TestComponent() {
      const { logout, refreshUser, switchTenant, isLoading } = useAuth();
      const [, setRenderCount] = useState(0);

      useEffect(() => {
        logoutRefs.push(logout);
        refreshUserRefs.push(refreshUser);
        switchTenantRefs.push(switchTenant);
      }, [logout, refreshUser, switchTenant]);

      return (
        <div>
          <span data-testid="loading">{String(isLoading)}</span>
          <button onClick={() => setRenderCount((c) => c + 1)}>Rerender</button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    // Trigger a re-render
    await act(async () => {
      screen.getByRole('button').click();
    });

    // Check that logout and refreshUser maintain the same reference
    // (logout and refreshUser have empty dependency arrays)
    expect(logoutRefs.length).toBe(1);
    expect(refreshUserRefs.length).toBe(1);

    // switchTenant may change if user changes, but if user is null it should remain stable
    expect(switchTenantRefs.length).toBe(1);
  });

  it('context value is memoized when state does not change', async () => {
    const contextRefs: Array<ReturnType<typeof useAuth>> = [];
    let renderCount = 0;

    function TestComponent() {
      const context = useAuth();
      const [localRenderCount, setRenderCount] = useState(0);

      renderCount++;

      useEffect(() => {
        contextRefs.push(context);
      });

      return (
        <div>
          <span data-testid="loading">{String(context.isLoading)}</span>
          <span data-testid="render-count">{localRenderCount}</span>
          <button onClick={() => setRenderCount((c) => c + 1)}>Rerender</button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    // Clear refs and trigger re-renders to capture new context values
    contextRefs.length = 0;
    const renderCountBeforeClicks = renderCount;

    // Trigger multiple re-renders
    await act(async () => {
      screen.getByRole('button').click();
    });

    // Verify first re-render happened
    expect(screen.getByTestId('render-count')).toHaveTextContent('1');

    await act(async () => {
      screen.getByRole('button').click();
    });

    // Verify second re-render happened
    expect(screen.getByTestId('render-count')).toHaveTextContent('2');

    // Verify that re-renders actually occurred
    expect(renderCount).toBeGreaterThan(renderCountBeforeClicks);

    // All context refs should be the same object (referential equality)
    expect(contextRefs.length).toBeGreaterThan(0);

    // Check that all captured contexts are the same reference
    for (let i = 1; i < contextRefs.length; i++) {
      expect(contextRefs[i]).toBe(contextRefs[0]);
    }
  });
});
