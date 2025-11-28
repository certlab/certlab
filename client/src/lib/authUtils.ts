/**
 * Authentication Utilities
 * 
 * Helper functions for handling authentication-related error checking.
 * 
 * @module authUtils
 */

/**
 * Checks if an error represents an unauthorized (401) response.
 * 
 * This function examines the error message to determine if it matches
 * the pattern for a 401 Unauthorized HTTP response. This is useful
 * for handling authentication failures in API calls.
 * 
 * @param error - The error object to check
 * @returns `true` if the error indicates a 401 Unauthorized response, `false` otherwise
 * 
 * @example
 * try {
 *   await fetchProtectedResource();
 * } catch (error) {
 *   if (isUnauthorizedError(error)) {
 *     redirectToLogin();
 *   }
 * }
 */
export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}