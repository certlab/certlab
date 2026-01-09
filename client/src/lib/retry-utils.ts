/**
 * Retry utilities for handling transient failures
 * Implements exponential backoff and configurable retry logic
 */

import { logError, categorizeError, ErrorCategory } from './errors';

/**
 * Configuration options for retry behavior
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;

  /** Initial delay in milliseconds before first retry (default: 1000) */
  initialDelay?: number;

  /** Maximum delay in milliseconds between retries (default: 10000) */
  maxDelay?: number;

  /** Backoff multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;

  /** Function to determine if an error should be retried (default: retries network errors) */
  shouldRetry?: (error: unknown, attempt: number) => boolean;

  /** Callback invoked before each retry attempt */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  shouldRetry: (error: unknown) => {
    // By default, only retry network errors
    const category = categorizeError(error);
    return category === ErrorCategory.NETWORK;
  },
  onRetry: () => {
    // Default: no-op
  },
};

/**
 * Calculate delay for the next retry attempt using exponential backoff
 *
 * @param attempt - Current attempt number (0-indexed)
 * @param options - Retry configuration options
 * @returns Delay in milliseconds
 */
export function calculateBackoff(attempt: number, options: RetryOptions): number {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelay);
}

/**
 * Sleep for specified milliseconds
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with automatic retry logic
 *
 * @param fn - Async function to execute with retries
 * @param operation - Name of the operation (for logging)
 * @param options - Retry configuration options
 * @returns Result of the function
 * @throws The last error if all retry attempts fail
 *
 * @example
 * ```typescript
 * const data = await withRetry(
 *   async () => await fetchData(),
 *   'fetchData',
 *   { maxAttempts: 3, initialDelay: 1000 }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  operation: string,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown = new Error('Retry failed without executing function');

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      // Execute the function
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      const shouldRetry = config.shouldRetry(error, attempt);
      const isLastAttempt = attempt === config.maxAttempts - 1;

      if (!shouldRetry || isLastAttempt) {
        // Don't retry or no more attempts left
        logError(operation, error, {
          attempt: attempt + 1,
          maxAttempts: config.maxAttempts,
          retriable: shouldRetry,
          finalAttempt: true,
        });
        throw error;
      }

      // Calculate delay for next retry
      const delayMs = calculateBackoff(attempt, options);

      // Log retry attempt
      logError(operation, error, {
        attempt: attempt + 1,
        maxAttempts: config.maxAttempts,
        nextRetryInMs: delayMs,
        retrying: true,
      });

      // Invoke retry callback if provided
      config.onRetry(error, attempt + 1, delayMs);

      // Wait before retrying
      await sleep(delayMs);
    }
  }

  // This should never be reached due to the throw inside the loop,
  // but TypeScript needs it for type safety
  throw lastError;
}

/**
 * Create a retry wrapper function that can be reused
 *
 * @param operation - Name of the operation (for logging)
 * @param options - Retry configuration options
 * @returns Function that wraps any async function with retry logic
 *
 * @example
 * ```typescript
 * const retryableFetch = createRetryWrapper('fetchData', { maxAttempts: 3 });
 * const data = await retryableFetch(() => fetch('/api/data'));
 * ```
 */
export function createRetryWrapper(
  operation: string,
  options: RetryOptions = {}
): <T>(fn: () => Promise<T>) => Promise<T> {
  return <T>(fn: () => Promise<T>) => withRetry(fn, operation, options);
}

/**
 * Check if an error is retryable based on its characteristics
 *
 * @param error - Error to check
 * @returns true if the error is typically retryable
 */
export function isRetryableError(error: unknown): boolean {
  const category = categorizeError(error);

  // Network errors are typically retryable
  if (category === ErrorCategory.NETWORK) {
    return true;
  }

  // Check for specific error patterns
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Timeout errors are retryable
    if (message.includes('timeout') || message.includes('timed out')) {
      return true;
    }

    // Connection errors are retryable
    if (message.includes('connection') || message.includes('econnrefused')) {
      return true;
    }

    // Rate limit errors might be retryable with backoff
    if (message.includes('rate limit') || message.includes('429')) {
      return true;
    }

    // Temporary server errors are retryable
    if (message.includes('503') || message.includes('502') || message.includes('504')) {
      return true;
    }
  }

  return false;
}

/**
 * Create retry options optimized for network requests
 *
 * @param customOptions - Optional custom options to override defaults
 * @returns Retry options configured for network requests
 */
export function createNetworkRetryOptions(customOptions?: Partial<RetryOptions>): RetryOptions {
  return {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    shouldRetry: (error: unknown) => {
      return isRetryableError(error);
    },
    ...customOptions,
  };
}

/**
 * Create retry options for storage operations
 * Storage operations typically shouldn't be retried as aggressively
 *
 * @param customOptions - Optional custom options to override defaults
 * @returns Retry options configured for storage operations
 */
export function createStorageRetryOptions(customOptions?: Partial<RetryOptions>): RetryOptions {
  return {
    maxAttempts: 2,
    initialDelay: 500,
    maxDelay: 2000,
    backoffMultiplier: 2,
    shouldRetry: (error: unknown) => {
      const category = categorizeError(error);
      // Only retry on transient storage errors, not quota/permission issues
      if (category === ErrorCategory.STORAGE) {
        if (error instanceof Error) {
          const message = error.message.toLowerCase();
          // Don't retry quota or permission errors
          if (
            message.includes('quota') ||
            message.includes('permission') ||
            message.includes('security')
          ) {
            return false;
          }
        }
        return true;
      }
      return false;
    },
    ...customOptions,
  };
}
