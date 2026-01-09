/**
 * Example: API Client with Retry Logic
 *
 * This example demonstrates how to use the error handling and retry utilities
 * to create a robust API client for CertLab.
 *
 * NOTE: This is a documentation/example file. The React component example at the
 * end is for illustration purposes only.
 */

import { withRetry, createNetworkRetryOptions } from '@/lib/retry-utils';
import { logError, NetworkError, NotFoundError, ValidationError, getErrorInfo } from '@/lib/errors';

/**
 * API client configuration
 */
interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * API client with automatic retry and error handling
 */
export class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
  }

  /**
   * Make a GET request with automatic retry
   */
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>('GET', endpoint, options);
  }

  /**
   * Make a POST request with automatic retry
   */
  async post<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>('POST', endpoint, {
      ...options,
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  }

  /**
   * Make a PUT request with automatic retry
   */
  async put<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>('PUT', endpoint, {
      ...options,
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  }

  /**
   * Make a DELETE request with automatic retry
   */
  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>('DELETE', endpoint, options);
  }

  /**
   * Core request method with retry logic
   */
  private async request<T>(method: string, endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const operationName = `${method} ${endpoint}`;

    try {
      // Use retry logic for the request
      const response = await withRetry(
        async () => {
          // Create abort controller for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.timeout);

          try {
            const response = await fetch(url, {
              ...options,
              method,
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // Check response status and throw appropriate errors
            if (!response.ok) {
              await this.handleErrorResponse(response, endpoint);
            }

            return response;
          } catch (error) {
            clearTimeout(timeoutId);

            // Convert fetch errors to appropriate error types
            if (error instanceof Error) {
              if (error.name === 'AbortError') {
                throw new NetworkError('Request timeout', {
                  url,
                  timeout: this.timeout,
                });
              }
              if (
                error.message.includes('Failed to fetch') ||
                error.message.includes('NetworkError')
              ) {
                throw new NetworkError('Network request failed', {
                  url,
                  originalError: error.message,
                });
              }
            }
            throw error;
          }
        },
        operationName,
        createNetworkRetryOptions({
          maxAttempts: this.maxRetries,
          onRetry: (error, attempt, delayMs) => {
            console.log(`[API] Retrying ${operationName} (attempt ${attempt}) after ${delayMs}ms`, {
              error: getErrorInfo(error),
            });
          },
        })
      );

      // Parse response
      const data = await response.json();
      return data as T;
    } catch (error) {
      // Log the error with context
      logError(operationName, error, {
        url,
        method,
        endpoint,
      });

      // Re-throw the error for the caller to handle
      throw error;
    }
  }

  /**
   * Handle HTTP error responses
   */
  private async handleErrorResponse(response: Response, endpoint: string): Promise<never> {
    const status = response.status;

    // Try to get error message from response body
    let errorMessage = `HTTP ${status}`;
    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // Ignore JSON parsing errors
    }

    // Throw appropriate error based on status code
    if (status === 404) {
      throw new NotFoundError(errorMessage, { endpoint, status });
    }

    if (status === 400 || status === 422) {
      throw new ValidationError(errorMessage, { endpoint, status });
    }

    if (status >= 500) {
      throw new NetworkError(`Server error: ${errorMessage}`, {
        endpoint,
        status,
      });
    }

    // Generic error for other status codes
    throw new NetworkError(errorMessage, { endpoint, status });
  }
}

/**
 * Example usage
 */

// Create an API client instance
const api = new ApiClient({
  baseUrl: '/api',
  timeout: 30000,
  maxRetries: 3,
});

// Example 1: Fetch user data with automatic retry
export async function fetchUserData(userId: string) {
  try {
    const userData = await api.get<User>(`/users/${userId}`);
    return userData;
  } catch (error) {
    // Error is already logged by the API client
    // Get user-friendly error info for display
    const { title, message, action } = getErrorInfo(error);
    console.error(`${title}: ${message}. ${action}`);
    throw error;
  }
}

// Example 2: Create a new quiz with automatic retry
export async function createQuiz(quizData: CreateQuizData) {
  try {
    const quiz = await api.post<Quiz>('/quizzes', quizData);
    return quiz;
  } catch (error) {
    const { title, message, retryable } = getErrorInfo(error);

    // Show error to user
    if (retryable) {
      console.error(`${title}: ${message}. You can try again.`);
    } else {
      console.error(`${title}: ${message}`);
    }

    throw error;
  }
}

// Example 3: Update user profile with automatic retry
export async function updateUserProfile(userId: string, updates: Partial<User>) {
  try {
    const updatedUser = await api.put<User>(`/users/${userId}`, updates);
    return updatedUser;
  } catch (error) {
    const { message, retryable } = getErrorInfo(error);

    if (retryable) {
      console.log('Update failed but is retryable:', message);
    }

    throw error;
  }
}

// Example 4: React component using the API client
// This is for documentation purposes only - see actual components for working examples

/*
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { useState } from 'react';

export function UserProfileComponent({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleUpdateProfile(updates: Partial<User>) {
    setLoading(true);
    
    try {
      await updateUserProfile(userId, updates);
      
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error) {
      const { title, message, action, retryable } = getErrorInfo(error);
      
      toast({
        variant: 'destructive',
        title,
        description: `${message}${action ? ` ${action}.` : ''}`,
        action: retryable ? (
          <ToastAction onClick={() => handleUpdateProfile(updates)}>
            Try Again
          </ToastAction>
        ) : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Component UI *\/}
    </div>
  );
}
*/

// Type definitions
interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface Quiz {
  id: string;
  title: string;
  questions: string[];
}

interface CreateQuizData {
  title: string;
  categoryId: string;
  questions: string[];
}
