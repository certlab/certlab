import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UserRolesPage from './user-roles';

// Mock storage
vi.mock('@/lib/storage-factory', () => ({
  storage: {
    getAllUsers: vi.fn().mockResolvedValue([]),
    updateUser: vi.fn().mockResolvedValue({}),
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('UserRolesPage', () => {
  it('renders the page title', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <UserRolesPage />
      </QueryClientProvider>
    );

    expect(screen.getByText('User Roles Management')).toBeInTheDocument();
  });

  it('renders the stats cards', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <UserRolesPage />
      </QueryClientProvider>
    );

    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('Administrators')).toBeInTheDocument();
    expect(screen.getByText('Regular Users')).toBeInTheDocument();
  });
});
