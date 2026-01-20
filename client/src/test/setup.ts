/**
 * Global test setup for Vitest
 *
 * This file is run before all test files.
 * It sets up global mocks for Firebase, Firestore, and storage modules
 * to ensure tests don't require actual Firebase connections.
 */

import '@testing-library/jest-dom';
import { vi, expect } from 'vitest';

// Custom snapshot serializer to normalize Radix UI generated IDs in DOM snapshots
expect.addSnapshotSerializer({
  test: (val) => {
    return val && val instanceof HTMLElement;
  },
  serialize: (val, config, indentation, depth, refs, printer) => {
    // Clone the element to avoid modifying the original
    const clone = val.cloneNode(true) as HTMLElement;

    // Find all elements with Radix IDs and normalize them
    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_ELEMENT, null);

    const elements = [clone];
    let node;
    while ((node = walker.nextNode())) {
      elements.push(node as HTMLElement);
    }

    elements.forEach((el) => {
      if (el instanceof HTMLElement) {
        // Normalize id attribute
        if (el.id && el.id.match(/^radix-/)) {
          el.id = el.id.replace(/radix-[^-]+-/g, 'radix-STABLE-ID-');
        }
        // Normalize aria-controls attribute
        if (el.hasAttribute('aria-controls')) {
          const ariaControls = el.getAttribute('aria-controls') || '';
          if (ariaControls.match(/^radix-/)) {
            el.setAttribute(
              'aria-controls',
              ariaControls.replace(/radix-[^-]+-/g, 'radix-STABLE-ID-')
            );
          }
        }
        // Normalize aria-labelledby attribute
        if (el.hasAttribute('aria-labelledby')) {
          const ariaLabelledby = el.getAttribute('aria-labelledby') || '';
          if (ariaLabelledby.match(/^radix-/)) {
            el.setAttribute(
              'aria-labelledby',
              ariaLabelledby.replace(/radix-[^-]+-/g, 'radix-STABLE-ID-')
            );
          }
        }
      }
    });

    // Use the default HTML serialization
    return clone.outerHTML.replace(/\s+/g, ' ').replace(/>\s+</g, '>\n<').trim();
  },
});

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
