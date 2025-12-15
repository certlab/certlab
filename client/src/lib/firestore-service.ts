/**
 * Cloud Firestore Service for CertLab
 *
 * This module provides a Firestore wrapper that implements data operations
 * for user data, quizzes, progress tracking, and shared content.
 *
 * ## Architecture
 *
 * - Per-user collections: /users/{userId}/{collection}
 * - Shared content: /categories, /questions, /badges, /lectures
 * - Offline support: Firestore SDK handles offline persistence automatically
 * - Security: Firestore rules enforce per-user data isolation
 *
 * ## Usage
 *
 * ```typescript
 * import { firestoreService } from './firestore-service';
 *
 * // Initialize Firestore (call once on app startup)
 * await firestoreService.initialize();
 *
 * // Get user's quizzes
 * const quizzes = await firestoreService.getUserQuizzes(userId);
 *
 * // Create a quiz
 * const quiz = await firestoreService.createQuiz(userId, quizData);
 * ```
 *
 * @module firestore-service
 */

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  type Firestore,
  type DocumentData,
  type QueryConstraint,
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
  initializeFirestore,
} from 'firebase/firestore';
import { getFirebaseAuth, isFirebaseConfigured, initializeFirebase } from './firebase';
import { logError } from './errors';

let firestoreInstance: Firestore | null = null;

/**
 * Check if Firestore is initialized and configured
 */
export function isFirestoreInitialized(): boolean {
  return firestoreInstance !== null;
}

/**
 * Get the Firestore instance
 * @throws Error if Firestore is not initialized
 */
export function getFirestoreInstance(): Firestore {
  if (!firestoreInstance) {
    throw new Error('Firestore is not initialized. Call initializeFirestoreService() first.');
  }
  return firestoreInstance;
}

/**
 * Initialize Firestore with offline persistence
 * @returns true if successful, false if Firebase is not configured
 */
export async function initializeFirestoreService(): Promise<boolean> {
  // Check if Firebase is configured
  if (!isFirebaseConfigured()) {
    console.log('[Firestore] Firebase not configured, skipping Firestore initialization');
    return false;
  }

  // Initialize Firebase if not already done
  const firebaseInitialized = initializeFirebase();
  if (!firebaseInitialized) {
    return false;
  }

  try {
    // Get Firestore instance
    const auth = getFirebaseAuth();

    // Initialize Firestore with settings for offline persistence
    firestoreInstance = initializeFirestore(auth.app, {
      ignoreUndefinedProperties: true,
    });

    // Connect to emulator if enabled
    const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';
    if (useEmulator) {
      console.log('[Firestore] Connecting to Firebase Emulator Suite');
      connectFirestoreEmulator(firestoreInstance, 'localhost', 8080);
    }

    // Enable offline persistence
    try {
      await enableIndexedDbPersistence(firestoreInstance);
      console.log('[Firestore] Offline persistence enabled');
    } catch (err) {
      const error = err as { code?: string };
      if (error?.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time.
        console.warn('[Firestore] Multiple tabs open, offline persistence disabled');
      } else if (error?.code === 'unimplemented') {
        // The current browser doesn't support offline persistence
        console.warn('[Firestore] Browser does not support offline persistence');
      } else {
        logError('initializeFirestoreService', err);
      }
    }

    console.log('[Firestore] Initialized successfully');
    return true;
  } catch (error) {
    logError('initializeFirestoreService', error);
    return false;
  }
}

/**
 * Helper to convert Firestore Timestamp to Date
 */
export function timestampToDate(timestamp: Timestamp | Date | string | null | undefined): Date {
  if (!timestamp) {
    return new Date();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  return new Date();
}

/**
 * Helper to convert Date to Firestore Timestamp
 */
export function dateToTimestamp(date: Date | string | null | undefined): Timestamp {
  if (!date) {
    return Timestamp.now();
  }
  if (typeof date === 'string') {
    return Timestamp.fromDate(new Date(date));
  }
  return Timestamp.fromDate(date);
}

/**
 * Get a document from a user's collection
 */
export async function getUserDocument<T>(
  userId: string,
  collectionName: string,
  documentId: string
): Promise<T | null> {
  try {
    const db = getFirestoreInstance();
    const docRef = doc(db, 'users', userId, collectionName, documentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  } catch (error) {
    logError('getUserDocument', error, { userId, collectionName, documentId });
    throw error;
  }
}

/**
 * Get all documents from a user's collection
 */
export async function getUserDocuments<T>(
  userId: string,
  collectionName: string,
  constraints?: QueryConstraint[]
): Promise<T[]> {
  try {
    const db = getFirestoreInstance();
    const collectionRef = collection(db, 'users', userId, collectionName);

    const q =
      constraints && constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as T);
  } catch (error) {
    logError('getUserDocuments', error, { userId, collectionName });
    throw error;
  }
}

/**
 * Set a document in a user's collection
 */
export async function setUserDocument<T extends DocumentData>(
  userId: string,
  collectionName: string,
  documentId: string,
  data: T
): Promise<void> {
  try {
    const db = getFirestoreInstance();
    const docRef = doc(db, 'users', userId, collectionName, documentId);
    await setDoc(docRef, data);
  } catch (error) {
    logError('setUserDocument', error, { userId, collectionName, documentId });
    throw error;
  }
}

/**
 * Update a document in a user's collection
 */
export async function updateUserDocument<T extends DocumentData>(
  userId: string,
  collectionName: string,
  documentId: string,
  data: Partial<T>
): Promise<void> {
  try {
    const db = getFirestoreInstance();
    const docRef = doc(db, 'users', userId, collectionName, documentId);
    await updateDoc(docRef, data as any);
  } catch (error) {
    logError('updateUserDocument', error, { userId, collectionName, documentId });
    throw error;
  }
}

/**
 * Delete a document from a user's collection
 */
export async function deleteUserDocument(
  userId: string,
  collectionName: string,
  documentId: string
): Promise<void> {
  try {
    const db = getFirestoreInstance();
    const docRef = doc(db, 'users', userId, collectionName, documentId);
    await deleteDoc(docRef);
  } catch (error) {
    logError('deleteUserDocument', error, { userId, collectionName, documentId });
    throw error;
  }
}

/**
 * Get a document from a shared collection (categories, questions, etc.)
 */
export async function getSharedDocument<T>(
  collectionName: string,
  documentId: string
): Promise<T | null> {
  try {
    const db = getFirestoreInstance();
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  } catch (error) {
    logError('getSharedDocument', error, { collectionName, documentId });
    throw error;
  }
}

/**
 * Get all documents from a shared collection
 */
export async function getSharedDocuments<T>(
  collectionName: string,
  constraints?: QueryConstraint[]
): Promise<T[]> {
  try {
    const db = getFirestoreInstance();
    const collectionRef = collection(db, collectionName);

    const q =
      constraints && constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as T);
  } catch (error) {
    logError('getSharedDocuments', error, { collectionName });
    throw error;
  }
}

/**
 * Set a document in a shared collection (admin only)
 */
export async function setSharedDocument<T extends DocumentData>(
  collectionName: string,
  documentId: string,
  data: T
): Promise<void> {
  try {
    const db = getFirestoreInstance();
    const docRef = doc(db, collectionName, documentId);
    await setDoc(docRef, data);
  } catch (error) {
    logError('setSharedDocument', error, { collectionName, documentId });
    throw error;
  }
}

/**
 * Get user profile document
 */
export async function getUserProfile(userId: string): Promise<DocumentData | null> {
  try {
    const db = getFirestoreInstance();
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    // Don't log permission denied errors - this is expected when user doesn't exist yet (first sign-up)
    const isPermissionError =
      error instanceof Error &&
      (error.message.includes('Missing or insufficient permissions') ||
        error.message.includes('permission-denied'));

    if (!isPermissionError) {
      logError('getUserProfile', error, { userId });
    }
    throw error;
  }
}

/**
 * Set user profile document
 */
export async function setUserProfile(userId: string, data: DocumentData): Promise<void> {
  try {
    const db = getFirestoreInstance();
    const docRef = doc(db, 'users', userId);
    await setDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    logError('setUserProfile', error, { userId });
    throw error;
  }
}

/**
 * Update user profile document
 */
export async function updateUserProfile(
  userId: string,
  data: Partial<DocumentData>
): Promise<void> {
  try {
    const db = getFirestoreInstance();
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    logError('updateUserProfile', error, { userId });
    throw error;
  }
}

// Export Firestore utilities for use in other modules
export { query, where, orderBy, limit, Timestamp, type QueryConstraint };
