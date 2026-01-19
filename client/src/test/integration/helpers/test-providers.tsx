/**
 * Integration Test Providers
 *
 * Provides wrapped components with mocked services for integration testing.
 * These providers use realistic mocks that maintain state across operations.
 */

import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { firebaseMock, createFirebaseMock } from '../mocks/firebase-mock';
import { firestoreMock, createFirestoreMock } from '../mocks/firestore-mock';

// Mock the Firebase module for integration tests
vi.mock('@/lib/firebase', () => createFirebaseMock());

// Mock the Firestore service for integration tests
vi.mock('@/lib/firestore-service', () => createFirestoreMock());

// Mock errors module
vi.mock('@/lib/errors', () => ({
  logError: vi.fn((context, error) => {
    console.error(`[${context}]`, error);
  }),
  logInfo: vi.fn((context, message) => {
    console.log(`[${context}]`, message);
  }),
}));

// Mock dynatrace module
vi.mock('@/lib/dynatrace', () => ({
  identifyUser: vi.fn(),
  endSession: vi.fn(),
  trackEvent: vi.fn(),
  isDynatraceConfigured: vi.fn().mockReturnValue(false),
}));

// Mock gamification service
vi.mock('@/lib/gamification-service', () => ({
  gamificationService: {
    processDailyLogin: vi.fn().mockResolvedValue({ shouldShowReward: false, day: 1 }),
  },
}));

/**
 * Create a fresh QueryClient for each test
 * Prevents cache pollution between tests
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface IntegrationTestProviderProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

/**
 * Integration Test Provider
 *
 * Wraps components with necessary providers for integration testing:
 * - QueryClientProvider with fresh QueryClient
 * - Mocked Firebase and Firestore services
 *
 * Usage:
 * ```typescript
 * render(
 *   <IntegrationTestProvider>
 *     <YourComponent />
 *   </IntegrationTestProvider>
 * );
 * ```
 */
export function IntegrationTestProvider({
  children,
  queryClient,
}: IntegrationTestProviderProps): React.JSX.Element {
  const testQueryClient = queryClient || createTestQueryClient();

  return <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>;
}

/**
 * Get the current state of mocks for assertions
 */
export function getIntegrationMockState() {
  return {
    firebase: {
      currentUser: firebaseMock.getUser(),
      isConfigured: firebaseMock.isFirebaseConfigured(),
    },
    firestore: {
      isInitialized: firestoreMock.isFirestoreInitialized(),
      currentUserId: firestoreMock.getCurrentUserId(),
    },
  };
}

/**
 * Export mocks for direct manipulation in tests
 * Note: These are re-exported from the mock modules for convenience
 */
export { firebaseMock } from '../mocks/firebase-mock';
export { firestoreMock } from '../mocks/firestore-mock';
