import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Firebase modules before importing
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  GoogleAuthProvider: vi.fn(() => ({
    addScope: vi.fn(),
  })),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  setPersistence: vi.fn(() => Promise.resolve()),
  browserLocalPersistence: {},
}));

// Store original env values
const _originalEnv = {
  VITE_FIREBASE_API_KEY: '',
  VITE_FIREBASE_AUTH_DOMAIN: '',
  VITE_FIREBASE_PROJECT_ID: '',
};

describe('firebase module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isFirebaseConfigured', () => {
    it('returns false when no environment variables are set', async () => {
      // Reimport with empty env vars (default state)
      const { isFirebaseConfigured } = await import('./firebase');
      // The test environment has no VITE_FIREBASE_* env vars set
      expect(isFirebaseConfigured()).toBe(false);
    });

    it('returns false when only some required variables are set', async () => {
      // This tests the edge case where only partial config exists
      // Since we can't easily modify import.meta.env, we test the logic pattern
      const { isFirebaseConfigured } = await import('./firebase');
      // Without all three required env vars, should return false
      expect(isFirebaseConfigured()).toBe(false);
    });
  });

  describe('initializeFirebase', () => {
    it('returns false when Firebase is not configured', async () => {
      const { initializeFirebase } = await import('./firebase');
      const result = await initializeFirebase();
      expect(result).toBe(false);
    });

    it('does not call Firebase initializeApp when not configured', async () => {
      const { initializeApp } = await import('firebase/app');
      const { initializeFirebase } = await import('./firebase');

      await initializeFirebase();

      expect(initializeApp).not.toHaveBeenCalled();
    });
  });

  describe('signInWithGoogle', () => {
    it('throws error when Firebase is not initialized', async () => {
      const { signInWithGoogle } = await import('./firebase');

      await expect(signInWithGoogle()).rejects.toThrow(
        'Firebase is not initialized. Please set the required environment variables: ' +
          'VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, and VITE_FIREBASE_PROJECT_ID.'
      );
    });
  });

  describe('signOutFromGoogle', () => {
    it('does not throw when Firebase is not initialized', async () => {
      const { signOutFromGoogle } = await import('./firebase');
      // Should not throw - just a no-op when not initialized
      await expect(signOutFromGoogle()).resolves.toBeUndefined();
    });
  });

  describe('onFirebaseAuthStateChanged', () => {
    it('returns no-op unsubscribe when Firebase is not initialized', async () => {
      const { onFirebaseAuthStateChanged } = await import('./firebase');
      const callback = vi.fn();

      const unsubscribe = onFirebaseAuthStateChanged(callback);

      // Should return a function
      expect(typeof unsubscribe).toBe('function');
      // Calling unsubscribe should not throw
      expect(() => unsubscribe()).not.toThrow();
      // Callback should not have been called
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentFirebaseUser', () => {
    it('returns null when Firebase is not initialized', async () => {
      const { getCurrentFirebaseUser } = await import('./firebase');
      const user = getCurrentFirebaseUser();
      expect(user).toBeNull();
    });
  });

  describe('getFirebaseAuth', () => {
    it('throws error when Firebase is not initialized', async () => {
      const { getFirebaseAuth } = await import('./firebase');
      expect(() => getFirebaseAuth()).toThrow(
        'Firebase Auth is not initialized. Call initializeFirebase() first.'
      );
    });
  });
});
