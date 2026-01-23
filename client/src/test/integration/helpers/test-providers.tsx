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

// Mock storage-factory for integration tests with Firestore mock implementation
vi.mock('@/lib/storage-factory', () => {
  const mockStorage = {
    getUser: vi.fn(async (userId: string) => {
      return firestoreMock.getDocument('users', userId).then((doc) => doc?.data || null);
    }),
    getUserById: vi.fn(async (userId: string) => {
      return firestoreMock.getDocument('users', userId).then((doc) => doc?.data || null);
    }),
    createUser: vi.fn(async (userData: any) => {
      await firestoreMock.setDocument('users', userData.id, userData);
      return userData;
    }),
    updateUser: vi.fn(async (userId: string, updates: any) => {
      await firestoreMock.updateDocument('users', userId, updates);
      const updatedDoc = await firestoreMock.getDocument('users', userId);
      return updatedDoc?.data || null;
    }),
    setCurrentUserId: vi.fn(async (userId: string) => {
      firestoreMock.setCurrentUserId(userId);
    }),
    clearCurrentUser: vi.fn(async () => {
      firestoreMock.clearCurrentUser();
    }),
    getCurrentUserId: vi.fn(async () => {
      return firestoreMock.getCurrentUserId();
    }),
    getCategories: vi.fn(async () => {
      const docs = await firestoreMock.getDocuments('categories');
      return docs.map((doc) => ({ ...doc.data, id: Number(doc.id) }));
    }),
    getSubcategories: vi.fn(async () => {
      const docs = await firestoreMock.getDocuments('subcategories');
      return docs.map((doc) => ({ ...doc.data, id: Number(doc.id) }));
    }),
    getQuestions: vi.fn(async () => {
      const docs = await firestoreMock.getDocuments('questions');
      return docs.map((doc) => ({ ...doc.data, id: Number(doc.id) }));
    }),
    getQuestion: vi.fn(async (questionId: number) => {
      const doc = await firestoreMock.getDocument('questions', questionId.toString());
      return doc ? { ...doc.data, id: Number(doc.id) } : null;
    }),
    getQuestionsByCategories: vi.fn(
      async (
        categoryIds: number[],
        subcategoryIds?: number[],
        difficultyLevels?: number[],
        tenantId?: number
      ) => {
        const docs = await firestoreMock.getDocuments('questions');
        return docs
          .map((doc) => ({ ...doc.data, id: Number(doc.id) }))
          .filter((q) => {
            const matchesCategory = categoryIds.includes(q.categoryId);
            const matchesSubcategory = !subcategoryIds || subcategoryIds.includes(q.subcategoryId);
            const matchesDifficulty =
              !difficultyLevels || difficultyLevels.includes(q.difficultyLevel || 1);
            const matchesTenant = !tenantId || q.tenantId === tenantId;
            return matchesCategory && matchesSubcategory && matchesDifficulty && matchesTenant;
          });
      }
    ),
    getUserQuizzes: vi.fn(async (userId: string) => {
      const docs = await firestoreMock.getSubcollectionDocuments('users', userId, 'quizzes');
      return docs.map((doc) => ({ ...doc.data, id: Number(doc.id) }));
    }),
    getUserProgress: vi.fn(async (userId: string) => {
      const docs = await firestoreMock.getSubcollectionDocuments('users', userId, 'progress');
      return docs.map((doc) => ({ ...doc.data, id: Number(doc.id) }));
    }),
    getUserStats: vi.fn().mockResolvedValue({}),
    getUserMasteryScores: vi.fn().mockResolvedValue([]),
    getBadges: vi.fn(async () => {
      const docs = await firestoreMock.getDocuments('badges');
      return docs.map((doc) => ({ ...doc.data, id: Number(doc.id) }));
    }),
    getUserBadges: vi.fn().mockResolvedValue([]),
    getUserGameStats: vi.fn().mockResolvedValue(null),
    getChallenges: vi.fn().mockResolvedValue([]),
    getStudyGroups: vi.fn().mockResolvedValue([]),
    getPracticeTests: vi.fn().mockResolvedValue([]),
    getUserThemePreferences: vi.fn().mockResolvedValue(null),
    getOrganizationBranding: vi.fn().mockResolvedValue(null),
    setOrganizationBranding: vi.fn().mockResolvedValue(undefined),
  };

  return {
    storage: mockStorage,
    initializeStorage: vi.fn().mockResolvedValue(undefined),
    isCloudSyncAvailable: vi.fn().mockReturnValue(true),
    isUsingCloudSync: vi.fn().mockReturnValue(true),
    getStorageMode: vi.fn().mockReturnValue('cloud'),
  };
});

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
