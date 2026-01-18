/**
 * Firebase mocking utilities for tests
 * Provides consistent Firebase, Auth, and Firestore mocks across all tests
 */
import { vi } from 'vitest';

/**
 * Creates a mock Firebase Auth user
 */
export const createMockFirebaseUser = (
  overrides?: Partial<{
    uid: string;
    email: string;
    displayName: string;
    photoURL: string;
  }>
) => ({
  uid: overrides?.uid || 'test-uid',
  email: overrides?.email || 'test@example.com',
  displayName: overrides?.displayName || 'Test User',
  photoURL: overrides?.photoURL || null,
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  refreshToken: 'test-refresh-token',
  tenantId: null,
  delete: vi.fn().mockResolvedValue(undefined),
  getIdToken: vi.fn().mockResolvedValue('test-id-token'),
  getIdTokenResult: vi.fn().mockResolvedValue({ token: 'test-id-token' }),
  reload: vi.fn().mockResolvedValue(undefined),
  toJSON: vi.fn().mockReturnValue({}),
  phoneNumber: null,
  providerId: 'firebase',
});

/**
 * Mock Firebase module with configurable auth state
 */
export const mockFirebase = (options?: {
  isConfigured?: boolean;
  currentUser?: ReturnType<typeof createMockFirebaseUser> | null;
  onAuthStateChanged?: (callback: (user: any) => void) => () => void;
}) => {
  const currentUser = options?.currentUser !== undefined ? options.currentUser : null;
  const isConfigured = options?.isConfigured !== undefined ? options.isConfigured : true;

  const defaultOnAuthStateChanged = (callback: (user: any) => void) => {
    setTimeout(() => callback(currentUser), 0);
    return () => {};
  };

  return {
    isFirebaseConfigured: vi.fn().mockReturnValue(isConfigured),
    initializeFirebase: vi.fn().mockReturnValue(isConfigured),
    onFirebaseAuthStateChanged: vi.fn(options?.onAuthStateChanged || defaultOnAuthStateChanged),
    signOutFromGoogle: vi.fn().mockResolvedValue(undefined),
    getCurrentFirebaseUser: vi.fn().mockReturnValue(currentUser),
  };
};

/**
 * Mock storage-factory module
 */
export const mockStorageFactory = (options?: { user?: any; cloudSyncAvailable?: boolean }) => ({
  initializeStorage: vi.fn().mockResolvedValue(undefined),
  setStorageMode: vi.fn().mockResolvedValue(undefined),
  isCloudSyncAvailable: vi.fn().mockReturnValue(options?.cloudSyncAvailable ?? false),
  storage: {
    getUser: vi.fn().mockResolvedValue(options?.user || null),
    createUser: vi.fn().mockResolvedValue(null),
    setCurrentUserId: vi.fn().mockResolvedValue(undefined),
    clearCurrentUser: vi.fn().mockResolvedValue(undefined),
    updateUser: vi.fn().mockResolvedValue(null),
    getQuizzes: vi.fn().mockResolvedValue([]),
    createQuiz: vi.fn().mockResolvedValue(null),
    updateQuiz: vi.fn().mockResolvedValue(null),
    getCategories: vi.fn().mockResolvedValue([]),
    getQuestions: vi.fn().mockResolvedValue([]),
  },
});

/**
 * Mock client-auth module
 */
export const mockClientAuth = (options?: { currentUser?: any; logoutSuccess?: boolean }) => ({
  clientAuth: {
    getCurrentUser: vi.fn().mockResolvedValue(options?.currentUser || null),
    logout: vi.fn().mockResolvedValue({
      success: options?.logoutSuccess !== undefined ? options.logoutSuccess : true,
    }),
    signInWithGoogle: vi.fn().mockResolvedValue({ success: true }),
  },
});

/**
 * Mock errors module
 */
export const mockErrors = () => ({
  logError: vi.fn(),
  ErrorCategory: {
    AUTHENTICATION: 'authentication',
    STORAGE: 'storage',
    NETWORK: 'network',
    VALIDATION: 'validation',
  },
});

/**
 * Mock dynatrace module
 */
export const mockDynatrace = () => ({
  identifyUser: vi.fn(),
  endSession: vi.fn(),
  trackEvent: vi.fn(),
});

/**
 * Sets up all common Firebase-related mocks
 *
 * NOTE: Due to Vitest's hoisting of vi.mock calls, this function CANNOT be used
 * directly in vi.mock() calls. Instead, copy the inline mock definitions from your
 * test file into your vi.mock() calls at the top level.
 *
 * This function is useful for:
 * - Setting up mocks in beforeEach/beforeAll hooks
 * - Reconfiguring mocks during tests
 * - Non-vi.mock scenarios
 *
 * @example
 * // In your test file, use inline mocks at top level:
 * vi.mock('@/lib/firebase', () => ({
 *   isFirebaseConfigured: vi.fn().mockReturnValue(true),
 *   // ... other mocks
 * }));
 *
 * @deprecated Use inline mock definitions in vi.mock() calls instead
 */
export const setupFirebaseMocks = (mockOptions?: {
  isConfigured?: boolean;
  currentUser?: ReturnType<typeof createMockFirebaseUser> | null;
  storageUser?: any;
  cloudSyncAvailable?: boolean;
}) => {
  // This function is kept for documentation purposes but should not be used
  // in vi.mock() calls due to hoisting issues
  throw new Error(
    'setupFirebaseMocks should not be used in vi.mock() calls. ' +
      'Use inline mock definitions instead. See the function documentation for details.'
  );
};
