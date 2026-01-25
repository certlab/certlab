import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock all the required modules
const mockUseAuth = vi.fn();
const mockUseLocation = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => mockUseLocation(),
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Navigate: ({ to }: { to: string }) => (
      <div data-testid="navigate" data-to={to}>
        Redirecting to {to}...
      </div>
    ),
  };
});

vi.mock('@/lib/auth-provider', async () => {
  const actual = await vi.importActual('@/lib/auth-provider');
  return {
    ...actual,
    useAuth: () => mockUseAuth(),
    AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
  logInfo: vi.fn(),
}));

vi.mock('@/lib/config-validator', () => ({
  validateRequiredConfiguration: () => ({ isValid: true, errors: [] }),
}));

vi.mock('@/lib/seed-data', () => ({
  ensureDataSeeded: vi.fn(),
}));

vi.mock('@/hooks/use-mobile-keyboard', () => ({
  useMobileKeyboard: () => {},
}));

vi.mock('@/lib/theme-provider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    QueryClientProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

vi.mock('@/components/ui/toaster', () => ({
  Toaster: () => null,
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/UnhandledRejectionHandler', () => ({
  UnhandledRejectionHandler: () => null,
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
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock ProtectedRoute
vi.mock('@/components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock AuthenticatedLayout
vi.mock('@/components/AuthenticatedLayout', () => ({
  AuthenticatedLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Import App after all mocks are set up
import App from './App';

// Test the actual Router component behavior through the App component
describe('App Router - Authentication Flash Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default location to root path
    mockUseLocation.mockReturnValue({ pathname: '/' });
  });

  it('shows loading state on root path when auth is loading', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
    });

    render(<App />);

    // Should show session loading state with proper message
    await waitFor(() => {
      expect(screen.getByText('Initializing application...')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('landing-page')).not.toBeInTheDocument();
  });

  it('shows landing page on root path when auth is not loading and user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    });

    render(<App />);

    // Should show landing page
    await waitFor(() => {
      expect(screen.getByTestId('landing-page')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('page-loader')).not.toBeInTheDocument();
  });

  it('redirects to /app when authenticated user visits root path', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: '1', email: 'test@example.com', role: 'user', tenantId: 1 },
    });

    render(<App />);

    // Should redirect to /app instead of showing landing page
    await waitFor(() => {
      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/app');
    });
    expect(screen.queryByTestId('landing-page')).not.toBeInTheDocument();
  });
});
