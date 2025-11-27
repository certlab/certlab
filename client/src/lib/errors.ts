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
  [AuthErrorCode.INVALID_EMAIL]: 'Please enter a valid email address.',
  [AuthErrorCode.INVALID_PASSWORD]: 'Password is incorrect.',
  [AuthErrorCode.USER_EXISTS]: 'An account with this email already exists.',
  [AuthErrorCode.USER_NOT_FOUND]: 'No account found with this email.',
  [AuthErrorCode.INVALID_CREDENTIALS]: 'Invalid email or password.',
  [AuthErrorCode.PASSWORD_REQUIRED]: 'This account requires a password.',
  [AuthErrorCode.PASSWORD_TOO_SHORT]: 'Password must be at least 8 characters.',
  [AuthErrorCode.NOT_AUTHENTICATED]: 'Please log in to continue.',
  [AuthErrorCode.REGISTRATION_FAILED]: 'Unable to create account. Please try again.',
  [AuthErrorCode.LOGIN_FAILED]: 'Unable to log in. Please try again.',
  [AuthErrorCode.LOGOUT_FAILED]: 'Unable to log out. Please try again.',
  [AuthErrorCode.PROFILE_UPDATE_FAILED]: 'Unable to update profile. Please try again.',
  [AuthErrorCode.PASSWORD_CHANGE_FAILED]: 'Unable to change password. Please try again.',
  [AuthErrorCode.STORAGE_ERROR]: 'Unable to access local storage. Please check browser settings.',
  [AuthErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
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
}

/**
 * Log an error with context for debugging.
 * 
 * @param operation - The name of the operation that failed (e.g., 'login', 'register')
 * @param error - The error object to log
 * @param context - Additional context about the operation (e.g., { email: 'user@example.com' })
 * 
 * @example
 * logError('login', error, { email: 'user@example.com', hasPassword: true });
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
    return error.message;
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
    const messageLower = error.message.toLowerCase();
    return (
      error.name === 'QuotaExceededError' ||
      error.name === 'SecurityError' ||
      messageLower.includes('indexeddb') ||
      messageLower.includes('storage')
    );
  }
  return false;
}

/**
 * Get a user-friendly error title based on the error code.
 * Used for displaying toast notifications and error messages.
 * 
 * @param errorCode - The error code to get a title for
 * @param defaultTitle - The default title to return if the error code is not recognized
 * @returns A user-friendly error title
 */
export function getErrorTitle(errorCode: AuthErrorCode | undefined, defaultTitle: string): string {
  switch (errorCode) {
    case AuthErrorCode.INVALID_CREDENTIALS:
      return "Invalid Credentials";
    case AuthErrorCode.INVALID_EMAIL:
      return "Invalid Email";
    case AuthErrorCode.INVALID_PASSWORD:
      return "Invalid Password";
    case AuthErrorCode.PASSWORD_TOO_SHORT:
      return "Password Too Short";
    case AuthErrorCode.USER_EXISTS:
      return "Account Exists";
    case AuthErrorCode.USER_NOT_FOUND:
      return "Account Not Found";
    case AuthErrorCode.PASSWORD_REQUIRED:
      return "Password Required";
    case AuthErrorCode.NOT_AUTHENTICATED:
      return "Not Authenticated";
    case AuthErrorCode.STORAGE_ERROR:
      return "Storage Error";
    case AuthErrorCode.REGISTRATION_FAILED:
      return "Registration Failed";
    case AuthErrorCode.LOGIN_FAILED:
      return "Login Failed";
    case AuthErrorCode.LOGOUT_FAILED:
      return "Logout Failed";
    case AuthErrorCode.PROFILE_UPDATE_FAILED:
      return "Profile Update Failed";
    case AuthErrorCode.PASSWORD_CHANGE_FAILED:
      return "Password Change Failed";
    case AuthErrorCode.UNKNOWN_ERROR:
      return "Error";
    default:
      return defaultTitle;
  }
}
