/**
 * Firebase Configuration for CertLab
 *
 * This module initializes Firebase for client-side Google authentication.
 * Firebase config values are read from environment variables prefixed with VITE_FIREBASE_.
 *
 * Required environment variables:
 * - VITE_FIREBASE_API_KEY
 * - VITE_FIREBASE_AUTH_DOMAIN
 * - VITE_FIREBASE_PROJECT_ID
 *
 * Optional environment variables:
 * - VITE_FIREBASE_STORAGE_BUCKET
 * - VITE_FIREBASE_MESSAGING_SENDER_ID
 * - VITE_FIREBASE_APP_ID
 *
 * @module firebase
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type Auth,
  type User as FirebaseUser,
  type UserCredential,
} from 'firebase/auth';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

/**
 * Check if Firebase is configured with required credentials
 */
export function isFirebaseConfigured(): boolean {
  return !!(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId);
}

// Initialize Firebase app only if configured
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

/**
 * Initialize Firebase if configured
 * Returns true if Firebase was successfully initialized
 */
export function initializeFirebase(): boolean {
  if (!isFirebaseConfigured()) {
    return false;
  }

  // Only initialize once
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();

  // Add additional scopes if needed
  googleProvider.addScope('email');
  googleProvider.addScope('profile');

  return true;
}

/**
 * Get the Firebase Auth instance
 * @throws Error if Firebase is not initialized
 */
export function getFirebaseAuth(): Auth {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized. Call initializeFirebase() first.');
  }
  return auth;
}

/**
 * Sign in with Google using popup
 * @returns UserCredential on success
 * @throws Error if Firebase is not configured or sign-in fails
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  if (!auth || !googleProvider) {
    throw new Error(
      'Firebase is not initialized. Please set the required environment variables: ' +
        'VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, and VITE_FIREBASE_PROJECT_ID.'
    );
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  } catch (error) {
    // Re-throw with more context
    if (error instanceof Error) {
      throw new Error(`Google sign-in failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Sign out from Firebase
 */
export async function signOutFromGoogle(): Promise<void> {
  if (auth) {
    await firebaseSignOut(auth);
  }
}

/**
 * Subscribe to Firebase auth state changes
 * @param callback Function called when auth state changes
 * @returns Unsubscribe function
 */
export function onFirebaseAuthStateChanged(
  callback: (user: FirebaseUser | null) => void
): () => void {
  if (!auth) {
    // Return a no-op unsubscribe if Firebase is not initialized
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
}

/**
 * Get the currently signed-in Firebase user
 * @returns The current Firebase user or null
 */
export function getCurrentFirebaseUser(): FirebaseUser | null {
  return auth?.currentUser ?? null;
}

// Export types for consumers
export type { FirebaseUser, UserCredential };
