/**
 * Tests for retry utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateBackoff,
  withRetry,
  createRetryWrapper,
  isRetryableError,
  createNetworkRetryOptions,
  createStorageRetryOptions,
} from './retry-utils';
import { NetworkError, StorageError, ValidationError } from './errors';

describe('calculateBackoff', () => {
  it('should calculate exponential backoff correctly', () => {
    const options = { initialDelay: 1000, backoffMultiplier: 2, maxDelay: 10000 };

    expect(calculateBackoff(0, options)).toBe(1000); // 1000 * 2^0
    expect(calculateBackoff(1, options)).toBe(2000); // 1000 * 2^1
    expect(calculateBackoff(2, options)).toBe(4000); // 1000 * 2^2
    expect(calculateBackoff(3, options)).toBe(8000); // 1000 * 2^3
  });

  it('should respect max delay', () => {
    const options = { initialDelay: 1000, backoffMultiplier: 2, maxDelay: 5000 };

    expect(calculateBackoff(4, options)).toBe(5000); // Would be 16000, capped at 5000
    expect(calculateBackoff(10, options)).toBe(5000); // Would be huge, capped at 5000
  });

  it('should use default values when not provided', () => {
    const delay = calculateBackoff(0, {});
    expect(delay).toBeGreaterThanOrEqual(0);
  });
});

describe('withRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should return result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await withRetry(fn, 'testOperation');

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new NetworkError('Connection failed'))
      .mockResolvedValue('success');

    const result = await withRetry(fn, 'testOperation', {
      initialDelay: 10, // Use short delay for tests
      maxAttempts: 3,
    });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should not retry non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue(new ValidationError('Invalid input'));

    await expect(
      withRetry(fn, 'testOperation', {
        maxAttempts: 3,
        shouldRetry: (error) => {
          return error instanceof NetworkError;
        },
      })
    ).rejects.toThrow('Invalid input');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should throw after max attempts', async () => {
    const error = new NetworkError('Connection failed');
    const fn = vi.fn().mockRejectedValue(error);

    await expect(
      withRetry(fn, 'testOperation', {
        initialDelay: 10,
        maxAttempts: 3,
      })
    ).rejects.toThrow('Connection failed');

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should call onRetry callback', async () => {
    const onRetry = vi.fn();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new NetworkError('Connection failed'))
      .mockResolvedValue('success');

    await withRetry(fn, 'testOperation', {
      initialDelay: 10,
      maxAttempts: 3,
      onRetry,
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(expect.any(NetworkError), 1, expect.any(Number));
  });

  it('should handle custom shouldRetry function', async () => {
    const shouldRetry = vi.fn().mockReturnValue(true);
    const fn = vi.fn().mockRejectedValueOnce(new Error('Test error')).mockResolvedValue('success');

    await withRetry(fn, 'testOperation', {
      initialDelay: 10,
      maxAttempts: 3,
      shouldRetry,
    });

    expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 0);
  });

  it('should apply exponential backoff between retries', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new NetworkError('Fail 1'))
      .mockRejectedValueOnce(new NetworkError('Fail 2'))
      .mockResolvedValue('success');

    const startTime = Date.now();

    await withRetry(fn, 'testOperation', {
      initialDelay: 100,
      backoffMultiplier: 2,
      maxAttempts: 3,
    });

    const elapsed = Date.now() - startTime;

    // Should have waited at least 100ms + 200ms = 300ms
    expect(elapsed).toBeGreaterThanOrEqual(250); // Allow some tolerance
  });
});

describe('createRetryWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should create a reusable retry wrapper', async () => {
    const retryWrapper = createRetryWrapper('testOperation', {
      initialDelay: 10,
      maxAttempts: 3,
    });

    const fn1 = vi.fn().mockResolvedValue('result1');
    const fn2 = vi.fn().mockResolvedValue('result2');

    const result1 = await retryWrapper(fn1);
    const result2 = await retryWrapper(fn2);

    expect(result1).toBe('result1');
    expect(result2).toBe('result2');
  });
});

describe('isRetryableError', () => {
  it('should identify network errors as retryable', () => {
    expect(isRetryableError(new NetworkError('Connection failed'))).toBe(true);
  });

  it('should identify timeout errors as retryable', () => {
    const error = new Error('Request timed out');
    expect(isRetryableError(error)).toBe(true);
  });

  it('should identify connection errors as retryable', () => {
    const error = new Error('Connection refused');
    expect(isRetryableError(error)).toBe(true);
  });

  it('should identify rate limit errors as retryable', () => {
    const error = new Error('Rate limit exceeded (429)');
    expect(isRetryableError(error)).toBe(true);
  });

  it('should identify temporary server errors as retryable', () => {
    expect(isRetryableError(new Error('Service unavailable (503)'))).toBe(true);
    expect(isRetryableError(new Error('Bad gateway (502)'))).toBe(true);
    expect(isRetryableError(new Error('Gateway timeout (504)'))).toBe(true);
  });

  it('should identify storage errors as not retryable', () => {
    // By default, isRetryableError only treats network-category errors as retryable.
    // Storage errors (like quota exceeded) are non-retryable unless wrapped with
    // storage-specific retry logic via createStorageRetryOptions.
    expect(isRetryableError(new StorageError('Quota exceeded'))).toBe(false);
  });

  it('should identify validation errors as not retryable', () => {
    expect(isRetryableError(new ValidationError('Invalid input'))).toBe(false);
  });

  it('should handle non-Error objects', () => {
    expect(isRetryableError('string error')).toBe(false);
    expect(isRetryableError(null)).toBe(false);
    expect(isRetryableError(undefined)).toBe(false);
  });
});

describe('createNetworkRetryOptions', () => {
  it('should create options with network defaults', () => {
    const options = createNetworkRetryOptions();

    expect(options.maxAttempts).toBe(3);
    expect(options.initialDelay).toBe(1000);
    expect(options.maxDelay).toBe(10000);
    expect(options.backoffMultiplier).toBe(2);
    expect(options.shouldRetry).toBeDefined();
  });

  it('should allow custom overrides', () => {
    const options = createNetworkRetryOptions({
      maxAttempts: 5,
      initialDelay: 2000,
    });

    expect(options.maxAttempts).toBe(5);
    expect(options.initialDelay).toBe(2000);
    expect(options.maxDelay).toBe(10000); // Still uses default
  });

  it('should retry network errors', () => {
    const options = createNetworkRetryOptions();
    const error = new NetworkError('Connection failed');

    expect(options.shouldRetry!(error, 0)).toBe(true);
  });

  it('should not retry validation errors', () => {
    const options = createNetworkRetryOptions();
    const error = new ValidationError('Invalid input');

    expect(options.shouldRetry!(error, 0)).toBe(false);
  });
});

describe('createStorageRetryOptions', () => {
  it('should create options with storage defaults', () => {
    const options = createStorageRetryOptions();

    expect(options.maxAttempts).toBe(2);
    expect(options.initialDelay).toBe(500);
    expect(options.maxDelay).toBe(2000);
    expect(options.backoffMultiplier).toBe(2);
    expect(options.shouldRetry).toBeDefined();
  });

  it('should allow custom overrides', () => {
    const options = createStorageRetryOptions({
      maxAttempts: 1,
      initialDelay: 100,
    });

    expect(options.maxAttempts).toBe(1);
    expect(options.initialDelay).toBe(100);
  });

  it('should not retry quota errors', () => {
    const options = createStorageRetryOptions();
    const error = new StorageError('Quota exceeded');

    expect(options.shouldRetry!(error, 0)).toBe(false);
  });

  it('should not retry permission errors', () => {
    const options = createStorageRetryOptions();
    const error = new StorageError('Permission denied');

    expect(options.shouldRetry!(error, 0)).toBe(false);
  });

  it('should retry transient storage errors', () => {
    const options = createStorageRetryOptions();
    const error = new StorageError('Transaction failed');

    expect(options.shouldRetry!(error, 0)).toBe(true);
  });
});
