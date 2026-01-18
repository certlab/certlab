/**
 * Provider mocking utilities for tests
 * Provides wrappers and mocks for React Query, Router, and Auth contexts
 */
import React from 'react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth-provider';

/**
 * Creates a test QueryClient with sensible defaults for testing
 */
export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  });
};

/**
 * Wrapper component that provides all common test providers
 */
interface TestProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

export const TestProviders: React.FC<TestProvidersProps> = ({ children, queryClient }) => {
  const client = queryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

/**
 * Wrapper with AuthProvider included
 * Note: Firebase mocks should be set up before using this
 */
export const TestProvidersWithAuth: React.FC<TestProvidersProps> = ({ children, queryClient }) => {
  const client = queryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <BrowserRouter>{children}</BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

/**
 * Mock useAuth hook for testing components that use authentication
 */
export const createMockUseAuth = (overrides?: {
  isAuthenticated?: boolean;
  isLoading?: boolean;
  user?: any;
}) => {
  return vi.fn(() => ({
    isAuthenticated: overrides?.isAuthenticated ?? false,
    isLoading: overrides?.isLoading ?? false,
    user: overrides?.user || null,
    signInWithGoogle: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
  }));
};

/**
 * Mock useLocation hook from react-router-dom
 */
export const createMockUseLocation = (initialLocation = '/') => {
  const location = { pathname: initialLocation, search: '', hash: '', state: null, key: 'default' };
  return vi.fn(() => location);
};

/**
 * Mock useNavigate hook from react-router-dom
 */
export const createMockUseNavigate = () => {
  return vi.fn();
};
