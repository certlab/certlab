/**
 * Firebase Configuration for CertLab
 *
 * This module initializes Firebase for client-side Google authentication and Firestore storage.
 * Firebase configuration is REQUIRED - the app will not function without it.
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
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  type Auth,
  type User as FirebaseUser,
  type UserCredential,
} from 'firebase/auth';

// Firebase configuration from environment variables
// NOTE: These values are intentionally bundled into the client-side JavaScript.
// Firebase API keys are designed to be used client-side and are safe to expose publicly.
// Firebase Security Rules (configured in Firebase Console) protect actual data access.
// See: https://firebase.google.com/docs/projects/api-keys
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
    // Provide detailed error messages based on Firebase error codes
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      // Firebase errors have a 'code' property we can check
      const errorCode = 'code' in error ? (error as { code: string }).code : undefined;

      // Log the full error for debugging
      console.error('[Firebase] Google sign-in error:', {
        code: errorCode,
        message: error.message,
        config: {
          apiKey: firebaseConfig.apiKey ? '(set)' : '(not set)',
          authDomain: firebaseConfig.authDomain,
          projectId: firebaseConfig.projectId,
        },
      });

      // Provide user-friendly error messages based on error codes
      if (
        errorCode === 'auth/unauthorized-domain' ||
        errorMessage.includes('unauthorized-domain')
      ) {
        throw new Error(
          `This domain is not authorized for Google Sign-In. ` +
            `Please add "${window.location.hostname}" to the authorized domains in Firebase Console ` +
            `(Authentication > Settings > Authorized domains).`
        );
      }

      if (
        errorCode === 'auth/operation-not-allowed' ||
        errorMessage.includes('operation-not-allowed')
      ) {
        throw new Error(
          'Google Sign-In is not enabled in Firebase Console. ' +
            'Please enable it in Authentication > Sign-in method > Google.'
        );
      }

      if (errorCode === 'auth/popup-blocked' || errorMessage.includes('popup-blocked')) {
        throw new Error(
          'Sign-in popup was blocked by your browser. ' +
            'Please allow popups for this site and try again.'
        );
      }

      if (errorCode === 'auth/popup-closed-by-user' || errorMessage.includes('popup-closed')) {
        throw new Error('Google sign-in was cancelled.');
      }

      if (errorCode === 'auth/network-request-failed' || errorMessage.includes('network')) {
        throw new Error(
          'Network error occurred. Please check your internet connection and try again.'
        );
      }

      if (errorCode === 'auth/invalid-api-key' || errorMessage.includes('api-key')) {
        throw new Error('Firebase API key is invalid. Please check the Firebase configuration.');
      }

      // For other errors, include the original message
      throw new Error(`Google sign-in failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Sign up with email and password
 * @param email User's email address
 * @param password User's password
 * @param displayName Optional display name
 * @returns UserCredential on success
 * @throws Error if Firebase is not configured or sign-up fails
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<UserCredential> {
  if (!auth) {
    throw new Error('Firebase is not initialized. Please set the required environment variables.');
  }

  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);

    // Update display name if provided
    if (displayName && result.user) {
      await updateProfile(result.user, { displayName });
    }

    // Send email verification
    if (result.user) {
      await sendEmailVerification(result.user);
    }

    return result;
  } catch (error) {
    if (error instanceof Error) {
      const errorCode = 'code' in error ? (error as { code: string }).code : undefined;

      console.error('[Firebase] Email sign-up error:', {
        code: errorCode,
        message: error.message,
      });

      if (errorCode === 'auth/email-already-in-use') {
        throw new Error('An account with this email already exists.');
      }
      if (errorCode === 'auth/invalid-email') {
        throw new Error('Invalid email address.');
      }
      if (errorCode === 'auth/weak-password') {
        throw new Error('Password is too weak. Please use at least 6 characters.');
      }

      throw new Error(`Sign-up failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Sign in with email and password
 * @param email User's email address
 * @param password User's password
 * @returns UserCredential on success
 * @throws Error if Firebase is not configured or sign-in fails
 */
export async function signInWithEmail(email: string, password: string): Promise<UserCredential> {
  if (!auth) {
    throw new Error('Firebase is not initialized. Please set the required environment variables.');
  }

  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result;
  } catch (error) {
    if (error instanceof Error) {
      const errorCode = 'code' in error ? (error as { code: string }).code : undefined;

      console.error('[Firebase] Email sign-in error:', {
        code: errorCode,
        message: error.message,
      });

      if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
        throw new Error('Invalid email or password.');
      }
      if (errorCode === 'auth/invalid-email') {
        throw new Error('Invalid email address.');
      }
      if (errorCode === 'auth/user-disabled') {
        throw new Error('This account has been disabled.');
      }

      throw new Error(`Sign-in failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Send password reset email
 * @param email User's email address
 * @throws Error if Firebase is not configured or operation fails
 */
export async function sendPasswordReset(email: string): Promise<void> {
  if (!auth) {
    throw new Error('Firebase is not initialized. Please set the required environment variables.');
  }

  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    if (error instanceof Error) {
      const errorCode = 'code' in error ? (error as { code: string }).code : undefined;

      console.error('[Firebase] Password reset error:', {
        code: errorCode,
        message: error.message,
      });

      if (errorCode === 'auth/user-not-found') {
        throw new Error('No account found with this email address.');
      }
      if (errorCode === 'auth/invalid-email') {
        throw new Error('Invalid email address.');
      }

      throw new Error(`Password reset failed: ${error.message}`);
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
