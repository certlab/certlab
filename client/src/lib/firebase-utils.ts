/**
 * Firebase utility functions
 *
 * Shared utilities for Firebase/Firestore operations
 */

/**
 * Check if an error is a Firestore permission denied error
 *
 * Permission denied errors are expected in certain scenarios:
 * - First-time user sign-up (profile doesn't exist yet)
 * - Attempting to read a non-existent document
 *
 * @param error - The error to check
 * @returns true if the error is a permission denied error
 */
export function isFirestorePermissionError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes('Missing or insufficient permissions') ||
      error.message.includes('permission-denied'))
  );
}
