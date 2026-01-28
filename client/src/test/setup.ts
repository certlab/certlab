/**
 * Global test setup for Vitest
 *
 * This file is run before all test files.
 * It sets up global mocks for Firebase, Firestore, and storage modules
 * to ensure tests don't require actual Firebase connections.
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Set test environment variables to prevent long retry delays that cause CI timeouts
if (typeof process !== 'undefined') {
  process.env.NODE_ENV = 'test';
  process.env.VITEST = 'true';
  process.env.CI = 'true';

  // Configure minimal retry delays for tests to avoid timeouts
  // These are used by retry-utils.ts to provide fast-test configuration
  // Reduced from previous values to prevent test timeouts in CI
  process.env.OFFLINE_QUEUE_MAX_ATTEMPTS = '2';
  process.env.OFFLINE_QUEUE_INITIAL_DELAY = '5'; // ms (reduced from 10ms)
  process.env.OFFLINE_QUEUE_MAX_RETRY_DELAY = '50'; // ms (reduced from 100ms)
}

// Set CI environment variable for fast-mock mode in tests
// This enables CI fast-mock mode by default to speed up test execution
//
// IMPORTANT: Tests that need to verify non-CI behavior (e.g. real connection logic)
// MUST override this in their beforeEach:
//   beforeEach(() => {
//     const originalCI = process.env.CI;
//     delete process.env.CI;
//     // ... test code ...
//     afterEach(() => {
//       if (originalCI !== undefined) process.env.CI = originalCI;
//     });
//   })
//
// See useFirestoreConnection.test.ts for an example of properly handling CI mode overrides

// Mock Firebase configuration to avoid real connections
vi.mock('@/lib/firebase', () => ({
  isFirebaseConfigured: vi.fn().mockReturnValue(false),
  initializeFirebase: vi.fn().mockResolvedValue(false),
  onFirebaseAuthStateChanged: vi.fn((callback) => {
    setTimeout(() => callback(null), 0);
    return () => {};
  }),
  signOutFromGoogle: vi.fn().mockResolvedValue(undefined),
  getCurrentFirebaseUser: vi.fn().mockReturnValue(null),
  signInWithGoogle: vi.fn().mockResolvedValue({ user: null }),
  signInWithEmail: vi.fn().mockResolvedValue({ user: null }),
  signUpWithEmail: vi.fn().mockResolvedValue({ user: null }),
  sendPasswordReset: vi.fn().mockResolvedValue(undefined),
  getFirebaseAuth: vi.fn().mockReturnValue(null),
}));

// Mock Firestore service to avoid real connections
vi.mock('@/lib/firestore-service', () => ({
  initializeFirestoreService: vi.fn().mockResolvedValue(false),
  isFirestoreInitialized: vi.fn().mockReturnValue(false),
  getFirestoreInstance: vi.fn().mockImplementation(() => {
    throw new Error('Firestore not initialized in test environment');
  }),
}));

// Mock storage-factory to avoid Firestore dependencies
vi.mock('@/lib/storage-factory', () => {
  const mockStorage = {
    getUser: vi.fn().mockResolvedValue(null),
    getUserById: vi.fn().mockResolvedValue(null),
    createUser: vi.fn().mockResolvedValue(null),
    updateUser: vi.fn().mockResolvedValue(null),
    setCurrentUserId: vi.fn().mockResolvedValue(undefined),
    clearCurrentUser: vi.fn().mockResolvedValue(undefined),
    getCurrentUserId: vi.fn().mockResolvedValue(null),
    getCategories: vi.fn().mockResolvedValue([]),
    getSubcategories: vi.fn().mockResolvedValue([]),
    getQuestions: vi.fn().mockResolvedValue([]),
    getQuestion: vi.fn().mockResolvedValue(null),
    getQuestionsByCategories: vi.fn().mockResolvedValue([]),
    getUserQuizzes: vi.fn().mockResolvedValue([]),
    getUserProgress: vi.fn().mockResolvedValue([]),
    getUserStats: vi.fn().mockResolvedValue({}),
    getUserMasteryScores: vi.fn().mockResolvedValue([]),
    getBadges: vi.fn().mockResolvedValue([]),
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
    isCloudSyncAvailable: vi.fn().mockReturnValue(false),
    isUsingCloudSync: vi.fn().mockReturnValue(false),
    getStorageMode: vi.fn().mockReturnValue('cloud'),
  };
});

// Mock client-auth module
vi.mock('@/lib/client-auth', () => ({
  clientAuth: {
    getCurrentUser: vi.fn().mockResolvedValue(null),
    logout: vi.fn().mockResolvedValue({ success: true }),
    signInWithGoogle: vi.fn().mockResolvedValue({ success: true, user: null }),
  },
}));

// Note: errors module is NOT mocked globally because many tests need the real implementation
// Tests that need logError mocked should do so individually

// Mock dynatrace module with all necessary exports
vi.mock('@/lib/dynatrace', () => ({
  reportError: vi.fn(),
  identifyUser: vi.fn(),
  endSession: vi.fn(),
  trackAction: vi.fn(() => -1),
  completeAction: vi.fn(),
  isDynatraceAvailable: vi.fn(() => false),
  getDynatraceConfig: vi.fn(() => null),
  initializeDynatrace: vi.fn(() => false),
  sendBeacon: vi.fn(() => false),
  now: vi.fn(() => Date.now()),
  trackAsyncAction: vi.fn(async (name, fn) => await fn()),
  trackSyncAction: vi.fn((name, fn) => fn()),
}));

// Mock gamification service
vi.mock('@/lib/gamification-service', () => ({
  gamificationService: {
    processDailyLogin: vi.fn().mockResolvedValue({ shouldShowReward: false, day: 1 }),
  },
}));
