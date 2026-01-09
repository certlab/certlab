/**
 * Tests for error handling utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AppError,
  NetworkError,
  ValidationError,
  StorageError,
  PermissionError,
  NotFoundError,
  ConflictError,
  AuthError,
  AuthErrorCode,
  ErrorCategory,
  sanitizeContext,
  categorizeError,
  getUserFriendlyMessage,
  getErrorInfo,
  logError,
} from './errors';

describe('sanitizeContext', () => {
  it('should redact sensitive fields', () => {
    const context = {
      email: 'test@example.com',
      password: 'secret123',
      token: 'abc123',
      apiKey: 'key123',
      username: 'testuser',
    };

    const sanitized = sanitizeContext(context);

    expect(sanitized).toEqual({
      email: 'test@example.com',
      password: '[REDACTED]',
      token: '[REDACTED]',
      apiKey: '[REDACTED]',
      username: 'testuser',
    });
  });

  it('should handle nested objects', () => {
    const context = {
      user: {
        email: 'test@example.com',
        password: 'secret123',
      },
      metadata: {
        timestamp: Date.now(),
      },
    };

    const sanitized = sanitizeContext(context);

    expect(sanitized).toEqual({
      user: {
        email: 'test@example.com',
        password: '[REDACTED]',
      },
      metadata: {
        timestamp: context.metadata.timestamp,
      },
    });
  });

  it('should handle undefined context', () => {
    expect(sanitizeContext(undefined)).toBeUndefined();
  });

  it('should handle empty context', () => {
    expect(sanitizeContext({})).toEqual({});
  });

  it('should sanitize arrays with sensitive data', () => {
    const context = {
      tokens: ['token1', 'token2'],
      users: [
        { email: 'user1@example.com', password: 'secret1' },
        { email: 'user2@example.com', password: 'secret2' },
      ],
      ids: [1, 2, 3],
    };

    const sanitized = sanitizeContext(context);

    expect(sanitized).toEqual({
      tokens: '[REDACTED]',
      users: [
        { email: 'user1@example.com', password: '[REDACTED]' },
        { email: 'user2@example.com', password: '[REDACTED]' },
      ],
      ids: [1, 2, 3],
    });
  });

  it('should not over-redact fields containing "auth" substring', () => {
    const context = {
      author: 'John Doe',
      authorId: 123,
      auth: 'sensitive',
      authToken: 'secret',
      authorization: 'Bearer token',
    };

    const sanitized = sanitizeContext(context);

    expect(sanitized).toEqual({
      author: 'John Doe',
      authorId: 123,
      auth: '[REDACTED]',
      authToken: '[REDACTED]',
      authorization: '[REDACTED]',
    });
  });
});

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create an error with all properties', () => {
      const error = new AppError('Test error', {
        category: ErrorCategory.NETWORK,
        code: 'TEST_ERROR',
        statusCode: 500,
        context: { test: 'value' },
        retryable: true,
      });

      expect(error.name).toBe('AppError');
      expect(error.message).toBe('Test error');
      expect(error.category).toBe(ErrorCategory.NETWORK);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.context).toEqual({ test: 'value' });
      expect(error.retryable).toBe(true);
      expect(error.timestamp).toBeDefined();
    });

    it('should sanitize context on creation', () => {
      const error = new AppError('Test error', {
        category: ErrorCategory.AUTH,
        context: { password: 'secret' },
      });

      expect(error.context).toEqual({ password: '[REDACTED]' });
    });

    it('should default retryable to false', () => {
      const error = new AppError('Test error', {
        category: ErrorCategory.VALIDATION,
      });

      expect(error.retryable).toBe(false);
    });
  });

  describe('NetworkError', () => {
    it('should create a network error with correct properties', () => {
      const error = new NetworkError('Connection failed', { url: '/api/test' });

      expect(error.name).toBe('NetworkError');
      expect(error.category).toBe(ErrorCategory.NETWORK);
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.retryable).toBe(true);
      expect(error.context).toEqual({ url: '/api/test' });
    });
  });

  describe('ValidationError', () => {
    it('should create a validation error with correct properties', () => {
      const error = new ValidationError('Invalid email', { field: 'email' });

      expect(error.name).toBe('ValidationError');
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.retryable).toBe(false);
    });
  });

  describe('StorageError', () => {
    it('should create a storage error with correct properties', () => {
      const error = new StorageError('Quota exceeded');

      expect(error.name).toBe('StorageError');
      expect(error.category).toBe(ErrorCategory.STORAGE);
      expect(error.code).toBe('STORAGE_ERROR');
      expect(error.retryable).toBe(false);
    });
  });

  describe('PermissionError', () => {
    it('should create a permission error with correct properties', () => {
      const error = new PermissionError('Access denied');

      expect(error.name).toBe('PermissionError');
      expect(error.category).toBe(ErrorCategory.PERMISSION);
      expect(error.retryable).toBe(false);
    });
  });

  describe('NotFoundError', () => {
    it('should create a not found error with correct properties', () => {
      const error = new NotFoundError('Resource not found');

      expect(error.name).toBe('NotFoundError');
      expect(error.category).toBe(ErrorCategory.NOT_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error.retryable).toBe(false);
    });
  });

  describe('ConflictError', () => {
    it('should create a conflict error with correct properties', () => {
      const error = new ConflictError('Duplicate entry');

      expect(error.name).toBe('ConflictError');
      expect(error.category).toBe(ErrorCategory.CONFLICT);
      expect(error.statusCode).toBe(409);
      expect(error.retryable).toBe(false);
    });
  });

  describe('AuthError', () => {
    it('should create an auth error with correct properties', () => {
      const error = new AuthError(AuthErrorCode.INVALID_CREDENTIALS);

      expect(error.name).toBe('AuthError');
      expect(error.category).toBe(ErrorCategory.AUTH);
      expect(error.code).toBe(AuthErrorCode.INVALID_CREDENTIALS);
      expect(error.message).toBe('Invalid email or password.');
    });

    it('should mark storage errors as retryable', () => {
      const error = new AuthError(AuthErrorCode.STORAGE_ERROR);

      expect(error.retryable).toBe(true);
    });

    it('should mark login failures as retryable', () => {
      const error = new AuthError(AuthErrorCode.LOGIN_FAILED);

      expect(error.retryable).toBe(true);
    });
  });
});

describe('categorizeError', () => {
  it('should categorize AppError correctly', () => {
    const error = new NetworkError('Test');
    expect(categorizeError(error)).toBe(ErrorCategory.NETWORK);
  });

  it('should categorize network errors', () => {
    const error = new Error('Network request failed');
    expect(categorizeError(error)).toBe(ErrorCategory.NETWORK);
  });

  it('should categorize storage errors', () => {
    const error = new Error('QuotaExceededError');
    error.name = 'QuotaExceededError';
    expect(categorizeError(error)).toBe(ErrorCategory.STORAGE);
  });

  it('should categorize permission errors', () => {
    const error = new Error('Access denied');
    expect(categorizeError(error)).toBe(ErrorCategory.PERMISSION);
  });

  it('should categorize validation errors', () => {
    const error = new Error('Invalid input');
    expect(categorizeError(error)).toBe(ErrorCategory.VALIDATION);
  });

  it('should categorize not found errors', () => {
    const error = new Error('Resource not found');
    expect(categorizeError(error)).toBe(ErrorCategory.NOT_FOUND);
  });

  it('should categorize conflict errors', () => {
    const error = new Error('Duplicate entry');
    expect(categorizeError(error)).toBe(ErrorCategory.CONFLICT);
  });

  it('should default to UNKNOWN for unrecognized errors', () => {
    const error = new Error('Some random error');
    expect(categorizeError(error)).toBe(ErrorCategory.UNKNOWN);
  });

  it('should handle non-Error objects', () => {
    expect(categorizeError('string error')).toBe(ErrorCategory.UNKNOWN);
    expect(categorizeError(null)).toBe(ErrorCategory.UNKNOWN);
    expect(categorizeError(undefined)).toBe(ErrorCategory.UNKNOWN);
  });
});

describe('getUserFriendlyMessage', () => {
  it('should return AppError message', () => {
    const error = new NetworkError('Connection failed');
    expect(getUserFriendlyMessage(error)).toBe('Connection failed');
  });

  it('should return AuthError message', () => {
    const error = new AuthError(AuthErrorCode.INVALID_EMAIL);
    expect(getUserFriendlyMessage(error)).toBe('Please enter a valid email address.');
  });

  it('should handle QuotaExceededError', () => {
    const error = new Error('Storage quota exceeded');
    error.name = 'QuotaExceededError';
    const message = getUserFriendlyMessage(error);
    expect(message).toContain('Storage is full');
  });

  it('should handle SecurityError', () => {
    const error = new Error('Access denied');
    error.name = 'SecurityError';
    const message = getUserFriendlyMessage(error);
    expect(message).toContain('Access denied');
  });

  it('should handle NetworkError', () => {
    const error = new Error('Network request failed');
    error.name = 'NetworkError';
    const message = getUserFriendlyMessage(error);
    expect(message).toContain('Network error');
  });

  it('should provide category-based messages for other errors', () => {
    const error = new Error('Invalid input');
    const message = getUserFriendlyMessage(error);
    expect(message).toBeTruthy();
    expect(message.length).toBeGreaterThan(0);
  });

  it('should handle non-Error objects', () => {
    const message = getUserFriendlyMessage('string error');
    expect(message).toBe('An unexpected error occurred.');
  });
});

describe('getErrorInfo', () => {
  it('should return complete info for AppError', () => {
    const error = new NetworkError('Connection failed');
    const info = getErrorInfo(error);

    expect(info.title).toBe('Connection Problem');
    expect(info.message).toBe('Connection failed');
    expect(info.action).toBeTruthy();
    expect(info.retryable).toBe(true);
  });

  it('should return complete info for AuthError', () => {
    const error = new AuthError(AuthErrorCode.INVALID_CREDENTIALS);
    const info = getErrorInfo(error);

    expect(info.title).toBe('Authentication Error'); // Uses category-based title
    expect(info.message).toBe('Invalid email or password.');
    expect(info.retryable).toBe(false);
  });

  it('should handle standard Error objects', () => {
    const error = new Error('Network timeout');
    const info = getErrorInfo(error);

    expect(info.title).toBeTruthy();
    expect(info.message).toBeTruthy();
    expect(info.retryable).toBe(true); // Network errors are retryable
  });

  it('should handle non-Error objects', () => {
    const info = getErrorInfo('string error');

    expect(info.title).toBe('Error');
    expect(info.message).toBe('An unexpected error occurred.');
    expect(info.retryable).toBe(false);
  });
});

describe('logError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('should log error with operation and context', () => {
    const error = new Error('Test error');
    logError('testOperation', error, { userId: '123' });

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[CertLab Error] testOperation:'),
      expect.objectContaining({
        operation: 'testOperation',
        category: expect.any(String),
        timestamp: expect.any(String),
      })
    );
  });

  it('should sanitize context before logging', () => {
    const error = new Error('Test error');
    logError('testOperation', error, { password: 'secret' });

    expect(console.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        context: { password: '[REDACTED]' },
      })
    );
  });

  it('should handle non-Error objects', () => {
    logError('testOperation', 'string error', { test: 'value' });

    expect(console.error).toHaveBeenCalled();
  });

  it('should include AppError properties', () => {
    const error = new NetworkError('Connection failed', { url: '/api/test' });
    logError('testOperation', error);

    expect(console.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        error: expect.objectContaining({
          name: 'NetworkError',
          code: 'NETWORK_ERROR',
          retryable: true,
        }),
      })
    );
  });
});
