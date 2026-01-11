/**
 * Structured error types for client-side error handling
 * Provides specific, user-friendly error messages with debugging context
 */

import { reportError as reportErrorToDynatrace } from './dynatrace';

/**
 * Error categories for comprehensive error handling
 */
export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTH = 'auth',
  STORAGE = 'storage',
  PERMISSION = 'permission',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  UNKNOWN = 'unknown',
}

/**
 * Options for creating enhanced errors
 */
export interface ErrorOptions {
  category: ErrorCategory;
  code?: string;
  statusCode?: number;
  context?: Record<string, unknown>;
  retryable?: boolean;
  userMessage?: string;
}

/**
 * Sensitive field patterns to exclude from error logging
 */
const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /api[_-]?key/i,
  /^auth$/i,
  /auth[_-]?token/i,
  /authorization/i,
  /credential/i,
  /ssn/i,
  /credit[_-]?card/i,
  /cvv/i,
];

/**
 * Sanitize context object by removing sensitive data
 * @param context - The context object to sanitize
 * @returns Sanitized context with sensitive fields masked
 */
export function sanitizeContext(
  context?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!context) return undefined;

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(context)) {
    // Check if key matches sensitive patterns
    const isSensitive = SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(key));

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (Array.isArray(value)) {
      // Recursively sanitize arrays
      sanitized[key] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? sanitizeContext(item as Record<string, unknown>)
          : item
      );
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeContext(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Base application error class with enhanced features
 */
export class AppError extends Error {
  readonly category: ErrorCategory;
  readonly code?: string;
  readonly statusCode?: number;
  readonly context?: Record<string, unknown>;
  readonly retryable: boolean;
  readonly timestamp: string;

  constructor(message: string, options: ErrorOptions) {
    super(message);
    this.name = 'AppError';
    this.category = options.category;
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.context = sanitizeContext(options.context);
    this.retryable = options.retryable ?? false;
    this.timestamp = new Date().toISOString();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Network-related errors (timeouts, connection failures, etc.)
 */
export class NetworkError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, {
      category: ErrorCategory.NETWORK,
      code: 'NETWORK_ERROR',
      context,
      retryable: true,
    });
    this.name = 'NetworkError';
  }
}

/**
 * Validation errors (invalid input, format errors, etc.)
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, {
      category: ErrorCategory.VALIDATION,
      code: 'VALIDATION_ERROR',
      context,
      retryable: false,
    });
    this.name = 'ValidationError';
  }
}

/**
 * Storage-related errors (quota exceeded, IndexedDB failures, etc.)
 */
export class StorageError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, {
      category: ErrorCategory.STORAGE,
      code: 'STORAGE_ERROR',
      context,
      retryable: false,
    });
    this.name = 'StorageError';
  }
}

/**
 * Permission/authorization errors
 */
export class PermissionError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, {
      category: ErrorCategory.PERMISSION,
      code: 'PERMISSION_ERROR',
      context,
      retryable: false,
    });
    this.name = 'PermissionError';
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, {
      category: ErrorCategory.NOT_FOUND,
      code: 'NOT_FOUND',
      statusCode: 404,
      context,
      retryable: false,
    });
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict errors (duplicate resources, version conflicts, etc.)
 */
export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, {
      category: ErrorCategory.CONFLICT,
      code: 'CONFLICT',
      statusCode: 409,
      context,
      retryable: false,
    });
    this.name = 'ConflictError';
  }
}

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
export class AuthError extends AppError {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, context?: Record<string, unknown>) {
    super(AUTH_ERROR_MESSAGES[code], {
      category: ErrorCategory.AUTH,
      code,
      context,
      retryable: code === AuthErrorCode.STORAGE_ERROR || code === AuthErrorCode.LOGIN_FAILED,
    });
    this.name = 'AuthError';
    this.code = code;
  }
}

/**
 * Log an error with context for debugging and monitoring.
 * Automatically sanitizes sensitive data and reports to DynaTrace in production.
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
  // Determine error category
  const category = categorizeError(error);

  // Build error info with sanitized context
  const errorInfo = {
    operation,
    category,
    timestamp: new Date().toISOString(),
    context: sanitizeContext(context),
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            ...(error instanceof AppError && {
              code: error.code,
              statusCode: error.statusCode,
              retryable: error.retryable,
              errorContext: error.context,
            }),
            ...(error instanceof AuthError && {
              code: error.code,
              errorContext: error.context,
            }),
          }
        : { value: String(error) },
  };

  // Console logging for development/debugging
  console.error(`[CertLab Error] ${operation}:`, errorInfo);

  // Report to DynaTrace for production monitoring
  try {
    if (error instanceof Error) {
      reportErrorToDynatrace(error);
    } else {
      // Convert non-Error objects to Error for DynaTrace
      const syntheticError = new Error(`${operation}: ${String(error)}`);
      reportErrorToDynatrace(syntheticError);
    }
  } catch (dynatraceError) {
    // Silently fail DynaTrace reporting - don't let monitoring errors break app
    console.warn('[CertLab] Failed to report error to DynaTrace:', dynatraceError);
  }
}

/**
 * Log informational messages (non-error events) for audit and monitoring
 * Use for security-relevant events like permission checks, user actions, etc.
 *
 * @param operation - The operation being logged (e.g., 'permissionCheck', 'userLogin')
 * @param context - Additional context about the operation
 *
 * @example
 * logInfo('permissionCheck', { action: 'edit', resource: 'quiz', userId: '123', granted: true });
 */
export function logInfo(operation: string, context?: Record<string, unknown>): void {
  const logInfo = {
    operation,
    timestamp: new Date().toISOString(),
    context: sanitizeContext(context),
  };

  // Console logging for development/debugging
  console.info(`[CertLab Info] ${operation}:`, logInfo);
}

/**
 * Categorize an error into one of the standard categories
 * @param error - The error to categorize
 * @returns The error category
 */
export function categorizeError(error: unknown): ErrorCategory {
  if (error instanceof AppError) {
    return error.category;
  }

  if (error instanceof Error) {
    const errorName = error.name.toLowerCase();
    const errorMessage = error.message.toLowerCase();

    // Network errors
    if (
      errorName.includes('network') ||
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('offline')
    ) {
      return ErrorCategory.NETWORK;
    }

    // Storage errors
    if (
      errorName === 'quotaexceedederror' ||
      errorName.includes('storage') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('storage') ||
      errorMessage.includes('indexeddb')
    ) {
      return ErrorCategory.STORAGE;
    }

    // Permission/Security errors
    if (
      errorName === 'securityerror' ||
      errorName.includes('permission') ||
      errorMessage.includes('permission') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden') ||
      errorMessage.includes('access denied')
    ) {
      return ErrorCategory.PERMISSION;
    }

    // Validation errors
    if (
      errorName.includes('validation') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('validation')
    ) {
      return ErrorCategory.VALIDATION;
    }

    // Not found errors
    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      return ErrorCategory.NOT_FOUND;
    }

    // Conflict errors
    if (
      errorMessage.includes('conflict') ||
      errorMessage.includes('duplicate') ||
      errorMessage.includes('already exists') ||
      errorMessage.includes('409')
    ) {
      return ErrorCategory.CONFLICT;
    }
  }

  return ErrorCategory.UNKNOWN;
}

/**
 * User-friendly error messages by category
 */
const CATEGORY_ERROR_MESSAGES: Record<
  ErrorCategory,
  { title: string; message: string; action?: string }
> = {
  [ErrorCategory.NETWORK]: {
    title: 'Connection Problem',
    message: 'Unable to connect to the server. Please check your internet connection.',
    action: 'Check your connection and try again',
  },
  [ErrorCategory.VALIDATION]: {
    title: 'Invalid Input',
    message: 'Please check your input and try again.',
    action: 'Review the form fields and correct any errors',
  },
  [ErrorCategory.AUTH]: {
    title: 'Authentication Error',
    message: 'There was a problem with authentication.',
    action: 'Please log in again',
  },
  [ErrorCategory.STORAGE]: {
    title: 'Storage Error',
    message: 'Unable to save data. Your browser storage may be full.',
    action: 'Clear browser data or free up storage space',
  },
  [ErrorCategory.PERMISSION]: {
    title: 'Access Denied',
    message: "You don't have permission to perform this action.",
    action: 'Contact support if you believe this is an error',
  },
  [ErrorCategory.NOT_FOUND]: {
    title: 'Not Found',
    message: 'The requested resource could not be found.',
    action: 'Check the URL or navigate from the main menu',
  },
  [ErrorCategory.CONFLICT]: {
    title: 'Conflict',
    message: 'This action conflicts with existing data.',
    action: 'Refresh the page and try again',
  },
  [ErrorCategory.UNKNOWN]: {
    title: 'Unexpected Error',
    message: 'An unexpected error occurred.',
    action: 'Try again or contact support if the problem persists',
  },
};

/**
 * Extract a user-friendly message from an error
 * Returns a clear, actionable message without technical details
 *
 * @param error - The error to extract a message from
 * @returns User-friendly error message
 */
export function getUserFriendlyMessage(error: unknown): string {
  // Handle AppError with specific messages
  if (error instanceof AppError) {
    return error.message;
  }

  // Handle AuthError with specific messages
  if (error instanceof AuthError) {
    return error.message;
  }

  if (error instanceof Error) {
    // Check for common browser errors
    if (error.name === 'QuotaExceededError') {
      return 'Storage is full. Please clear some browser data and try again.';
    }
    if (error.name === 'SecurityError') {
      return 'Access denied. Please check your browser settings and ensure cookies are enabled.';
    }
    if (error.name === 'NetworkError' || error.message.toLowerCase().includes('network')) {
      return 'Network error. Please check your internet connection and try again.';
    }

    // For other errors, use the category-based message (without action)
    const category = categorizeError(error);
    const categoryInfo = CATEGORY_ERROR_MESSAGES[category];

    return categoryInfo.message;
  }

  return CATEGORY_ERROR_MESSAGES[ErrorCategory.UNKNOWN].message;
}

/**
 * Get detailed error information including title, message, and action
 * Useful for displaying rich error notifications
 *
 * @param error - The error to get information for
 * @returns Object with title, message, and optional action
 */
export function getErrorInfo(error: unknown): {
  title: string;
  message: string;
  action?: string;
  retryable: boolean;
} {
  let title = 'Error';
  let message = 'An unexpected error occurred.';
  let action: string | undefined;
  let retryable = false;

  if (error instanceof AppError) {
    const categoryInfo = CATEGORY_ERROR_MESSAGES[error.category];
    title = categoryInfo.title;
    message = error.message;
    action = categoryInfo.action;
    retryable = error.retryable;
  } else if (error instanceof AuthError) {
    const categoryInfo = CATEGORY_ERROR_MESSAGES[ErrorCategory.AUTH];
    title = categoryInfo.title;
    message = error.message;
    action = categoryInfo.action;
    retryable = error.retryable;
  } else if (error instanceof Error) {
    const category = categorizeError(error);
    const categoryInfo = CATEGORY_ERROR_MESSAGES[category];
    title = categoryInfo.title;
    message = getUserFriendlyMessage(error);
    action = categoryInfo.action;
    retryable = category === ErrorCategory.NETWORK;
  }

  return { title, message, action, retryable };
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
      return 'Invalid Credentials';
    case AuthErrorCode.INVALID_EMAIL:
      return 'Invalid Email';
    case AuthErrorCode.INVALID_PASSWORD:
      return 'Invalid Password';
    case AuthErrorCode.PASSWORD_TOO_SHORT:
      return 'Password Too Short';
    case AuthErrorCode.USER_EXISTS:
      return 'Account Exists';
    case AuthErrorCode.USER_NOT_FOUND:
      return 'Account Not Found';
    case AuthErrorCode.PASSWORD_REQUIRED:
      return 'Password Required';
    case AuthErrorCode.NOT_AUTHENTICATED:
      return 'Not Authenticated';
    case AuthErrorCode.STORAGE_ERROR:
      return 'Storage Error';
    case AuthErrorCode.REGISTRATION_FAILED:
      return 'Registration Failed';
    case AuthErrorCode.LOGIN_FAILED:
      return 'Login Failed';
    case AuthErrorCode.LOGOUT_FAILED:
      return 'Logout Failed';
    case AuthErrorCode.PROFILE_UPDATE_FAILED:
      return 'Profile Update Failed';
    case AuthErrorCode.PASSWORD_CHANGE_FAILED:
      return 'Password Change Failed';
    case AuthErrorCode.UNKNOWN_ERROR:
      return 'Error';
    default:
      return defaultTitle;
  }
}
