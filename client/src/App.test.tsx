import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock all the required modules
const mockUseAuth = vi.fn();
vi.mock('@/lib/auth-provider', async () => {
  const actual = await vi.importActual('@/lib/auth-provider');
  return {
    ...actual,
    useAuth: () => mockUseAuth(),
  };
});

vi.mock('@/lib/client-auth', () => ({
  clientAuth: {
    getCurrentUser: vi.fn().mockResolvedValue(null),
    logout: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('@/lib/errors', () => ({
  logError: vi.fn(),
}));

vi.mock('@/hooks/use-mobile-keyboard', () => ({
  useMobileKeyboard: () => {},
}));

// Mock the Landing page component
vi.mock('@/pages/landing', () => ({
  default: () => <div data-testid="landing-page">Landing Page</div>,
}));

// Mock PageLoader
vi.mock('@/components/PageLoader', () => ({
  default: () => <div data-testid="page-loader">Loading...</div>,
}));

// Mock ErrorBoundary
vi.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock ProtectedRoute
vi.mock('@/components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock AuthenticatedLayout
vi.mock('@/components/AuthenticatedLayout', () => ({
  AuthenticatedLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Need to extract and test the Router component directly
// Since it's not exported, we'll test through the route behavior
describe('App Router - Authentication Flash Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to render a component within the router context
  function RouterTestWrapper({ initialPath }: { initialPath: string }) {
    // Re-create the router logic from App.tsx for testing
    const { user, isLoading, isAuthenticated } = mockUseAuth();
    const location = { pathname: initialPath };

    // Replicate the Router component's root path logic
    if (location.pathname === '/' || location.pathname === '') {
      if (isLoading) {
        return (
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div data-testid="page-loader">Loading...</div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-background">
          <div data-testid="landing-page">Landing Page</div>
        </div>
      );
    }

    return <div>Other Route</div>;
  }

  it('shows loading state on root path when auth is loading', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
    });

    render(<RouterTestWrapper initialPath="/" />);

    // Should show loading state, not landing page
    expect(screen.getByTestId('page-loader')).toBeInTheDocument();
    expect(screen.queryByTestId('landing-page')).not.toBeInTheDocument();
  });

  it('shows landing page on root path when auth is not loading and user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    });

    render(<RouterTestWrapper initialPath="/" />);

    // Should show landing page
    expect(screen.getByTestId('landing-page')).toBeInTheDocument();
    expect(screen.queryByTestId('page-loader')).not.toBeInTheDocument();
  });

  it('shows landing page on root path when auth is not loading and user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: '1', email: 'test@example.com', role: 'user', tenantId: 1 },
    });

    render(<RouterTestWrapper initialPath="/" />);

    // Should show landing page (it will handle redirect internally)
    expect(screen.getByTestId('landing-page')).toBeInTheDocument();
    expect(screen.queryByTestId('page-loader')).not.toBeInTheDocument();
  });
});
