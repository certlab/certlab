/**
 * Structured error types for client-side error handling
 * Provides specific, user-friendly error messages with debugging context
 */

/**
 * Error codes for authentication operations
 */
export const AuthErrorCode = {
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  USER_EXISTS: 'USER_EXISTS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  PASSWORD_REQUIRED: 'PASSWORD_REQUIRED',
  PASSWORD_TOO_SHORT: 'PASSWORD_TOO_SHORT',
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  REGISTRATION_FAILED: 'REGISTRATION_FAILED',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT_FAILED: 'LOGOUT_FAILED',
  PROFILE_UPDATE_FAILED: 'PROFILE_UPDATE_FAILED',
  PASSWORD_CHANGE_FAILED: 'PASSWORD_CHANGE_FAILED',
  STORAGE_ERROR: 'STORAGE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type AuthErrorCode = (typeof AuthErrorCode)[keyof typeof AuthErrorCode];

/**
 * User-friendly messages for each error code
 */
const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  [AuthErrorCode.INVALID_EMAIL]: 'Please enter a valid email address',
  [AuthErrorCode.INVALID_PASSWORD]: 'Password is incorrect',
  [AuthErrorCode.USER_EXISTS]: 'An account with this email already exists',
  [AuthErrorCode.USER_NOT_FOUND]: 'No account found with this email',
  [AuthErrorCode.INVALID_CREDENTIALS]: 'Invalid email or password',
  [AuthErrorCode.PASSWORD_REQUIRED]: 'This account requires a password',
  [AuthErrorCode.PASSWORD_TOO_SHORT]: 'Password must be at least 8 characters',
  [AuthErrorCode.NOT_AUTHENTICATED]: 'Please log in to continue',
  [AuthErrorCode.REGISTRATION_FAILED]: 'Unable to create account. Please try again',
  [AuthErrorCode.LOGIN_FAILED]: 'Unable to log in. Please try again',
  [AuthErrorCode.LOGOUT_FAILED]: 'Unable to log out. Please try again',
  [AuthErrorCode.PROFILE_UPDATE_FAILED]: 'Unable to update profile. Please try again',
  [AuthErrorCode.PASSWORD_CHANGE_FAILED]: 'Unable to change password. Please try again',
  [AuthErrorCode.STORAGE_ERROR]: 'Unable to access local storage. Please check browser settings',
  [AuthErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again',
};

/**
 * Structured authentication error
 */
export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly context?: Record<string, unknown>;

  constructor(code: AuthErrorCode, context?: Record<string, unknown>) {
    super(AUTH_ERROR_MESSAGES[code]);
    this.name = 'AuthError';
    this.code = code;
    this.context = context;
  }

  /**
   * Get user-friendly message for display
   */
  get userMessage(): string {
    return this.message;
  }
}

/**
 * Log an error with context for debugging
 */
export function logError(
  operation: string,
  error: unknown,
  context?: Record<string, unknown>
): void {
  const errorInfo = {
    operation,
    timestamp: new Date().toISOString(),
    context,
    error: error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          ...(error instanceof AuthError && { code: error.code, errorContext: error.context }),
        }
      : { value: String(error) },
  };

  console.error(`[CertLab Error] ${operation}:`, errorInfo);
}

/**
 * Extract a user-friendly message from an error
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof AuthError) {
    return error.userMessage;
  }
  
  if (error instanceof Error) {
    // Check for common browser errors
    if (error.name === 'QuotaExceededError') {
      return 'Storage is full. Please clear some browser data';
    }
    if (error.name === 'SecurityError') {
      return 'Access denied. Please check your browser settings';
    }
  }
  
  return AUTH_ERROR_MESSAGES[AuthErrorCode.UNKNOWN_ERROR];
}

/**
 * Check if an error is a storage-related error
 */
export function isStorageError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.name === 'QuotaExceededError' ||
      error.name === 'SecurityError' ||
      error.message.includes('IndexedDB') ||
      error.message.includes('storage')
    );
  }
  return false;
}
