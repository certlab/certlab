/**
 * Results Page Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Results from './results';
import type { Quiz, Category } from '@shared/schema';

// Mock dependencies
const mockUseAuth = vi.fn();
vi.mock('@/lib/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/lib/storage-factory', () => ({
  storage: {
    getUserCertificates: vi.fn(),
  },
}));

vi.mock('@/lib/certificate-generator', () => ({
  generateVerificationId: vi.fn(() => 'TEST-123-456'),
  printCertificate: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock components
vi.mock('@/components/DetailedResultsAnalysis', () => ({
  default: () => <div data-testid="detailed-results">Detailed Results Analysis</div>,
}));

vi.mock('@/components/PrintButton', () => ({
  default: () => <button data-testid="print-button">Print</button>,
}));

describe('Results Page', () => {
  let queryClient: QueryClient;

  const mockQuiz: Quiz = {
    id: 1,
    userId: 'user-123',
    categoryId: 1,
    questionCount: 10,
    score: 85,
    timeSpent: 600,
    completedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockCategory: Category = {
    id: 1,
    name: 'CISSP',
    description: 'CISSP certification',
    tenantId: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com', firstName: 'Test', lastName: 'User' },
      tenantId: 1,
      isAuthenticated: true,
      isLoading: false,
    });

    // Mock query data
    queryClient.setQueryData(['quiz', 'detail', 1], mockQuiz);
    queryClient.setQueryData(['categories', 'all'], [mockCategory]);
    queryClient.setQueryData(['certificate', 'quiz', 1], null);
  });

  it('should show loading state initially', () => {
    const emptyQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={emptyQueryClient}>
        <MemoryRouter initialEntries={['/results/1']}>
          <Routes>
            <Route path="/results/:id" element={<Results />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should display quiz results', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/results/1']}>
          <Routes>
            <Route path="/results/:id" element={<Results />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/85%/)).toBeInTheDocument();
    });
  });

  it('should show error for invalid quiz ID', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/results/invalid']}>
          <Routes>
            <Route path="/results/:id" element={<Results />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText(/Invalid quiz ID/i)).toBeInTheDocument();
  });

  it('should handle missing quiz data', async () => {
    queryClient.setQueryData(['quiz', 'detail', 1], null);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/results/1']}>
          <Routes>
            <Route path="/results/:id" element={<Results />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Quiz not found/i)).toBeInTheDocument();
    });
  });

  it('should display print button', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/results/1']}>
          <Routes>
            <Route path="/results/:id" element={<Results />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('print-button')).toBeInTheDocument();
    });
  });

  it('should render detailed results analysis', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/results/1']}>
          <Routes>
            <Route path="/results/:id" element={<Results />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('detailed-results')).toBeInTheDocument();
    });
  });

  it('should show certificate generation option for high scores', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/results/1']}>
          <Routes>
            <Route path="/results/:id" element={<Results />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('detailed-results')).toBeInTheDocument();
    });
  });

  it('should handle quiz without completion date', async () => {
    const incompleteQuiz = { ...mockQuiz, completedAt: null };
    queryClient.setQueryData(['quiz', 'detail', 1], incompleteQuiz);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/results/1']}>
          <Routes>
            <Route path="/results/:id" element={<Results />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/85%/)).toBeInTheDocument();
    });
  });
});
