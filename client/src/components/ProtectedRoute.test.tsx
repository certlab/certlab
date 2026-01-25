import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

// Mock the auth-provider module to control authentication state
const mockUseAuth = vi.fn();
vi.mock('@/lib/auth-provider', async () => {
  const actual = await vi.importActual('@/lib/auth-provider');
  return {
    ...actual,
    useAuth: () => mockUseAuth(),
  };
});

// Mock other dependencies using inline mocks (avoid hoisting issues)
vi.mock('@/lib/firebase', () => ({
  isFirebaseConfigured: vi.fn().mockReturnValue(true),
  initializeFirebase: vi.fn().mockReturnValue(true),
  onFirebaseAuthStateChanged: vi.fn((callback) => {
    setTimeout(() => callback(null), 0);
    return () => {};
  }),
  signOutFromGoogle: vi.fn().mockResolvedValue(undefined),
  getCurrentFirebaseUser: vi.fn().mockReturnValue(null),
}));

vi.mock('@/lib/storage-factory', () => ({
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

vi.mock('@/lib/client-auth', () => ({
  clientAuth: {
    getCurrentUser: vi.fn().mockResolvedValue(null),
    logout: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('@/lib/errors', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner when authentication is loading', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
    });

    render(
      <MemoryRouter initialEntries={['/app']}>
        <Routes>
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Loading application...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to landing page when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    });

    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <Routes>
          <Route path="/" element={<div>Landing Page</div>} />
          <Route
            path="/app/dashboard"
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    // Should redirect to landing page
    expect(screen.getByText('Landing Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: '1', email: 'test@example.com', role: 'user', tenantId: 1 },
    });

    render(
      <MemoryRouter initialEntries={['/app']}>
        <Routes>
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('saves the attempted location in navigation state when redirecting', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    });

    interface LocationState {
      from?: string;
    }

    let capturedState: LocationState | undefined;

    function LandingPage() {
      // Access location state using useLocation hook from react-router-dom
      const { state } = useLocation();
      capturedState = state as LocationState | undefined;
      return <div>Landing Page</div>;
    }

    render(
      <MemoryRouter initialEntries={['/app/profile']}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/app/profile"
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    // Should redirect to landing page
    expect(screen.getByText('Landing Page')).toBeInTheDocument();

    // Verify the state contains the original path
    expect(capturedState).toBeDefined();
    expect(capturedState?.from).toBe('/app/profile');
  });

  it('renders multiple children correctly', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: '1', email: 'test@example.com', role: 'user', tenantId: 1 },
    });

    render(
      <MemoryRouter initialEntries={['/app']}>
        <Routes>
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <div>First Child</div>
                <div>Second Child</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('First Child')).toBeInTheDocument();
    expect(screen.getByText('Second Child')).toBeInTheDocument();
  });
});
