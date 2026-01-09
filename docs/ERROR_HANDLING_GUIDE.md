# Error Handling and Retry Logic Guide

## Overview

CertLab uses a comprehensive error handling system that provides:
- **User-friendly error messages** with actionable guidance
- **Structured logging** with DynaTrace integration
- **Automatic retry logic** for transient failures
- **Secure logging** that never exposes sensitive data
- **Error categorization** for appropriate handling

## Error Categories

All errors in CertLab are categorized into one of these types:

| Category | Description | Retryable | Example |
|----------|-------------|-----------|---------|
| `NETWORK` | Connection, timeout, fetch failures | ✅ Yes | Connection refused, timeout |
| `VALIDATION` | Invalid input or data format | ❌ No | Invalid email format |
| `AUTH` | Authentication/authorization issues | Varies | Invalid credentials |
| `STORAGE` | Database/storage failures | Varies | Quota exceeded |
| `PERMISSION` | Access denied errors | ❌ No | Insufficient permissions |
| `NOT_FOUND` | Resource not found | ❌ No | User not found |
| `CONFLICT` | Duplicate or conflicting data | ❌ No | Email already exists |
| `UNKNOWN` | Uncategorized errors | ❌ No | Unexpected error |

## Using Error Classes

### Basic Error Classes

```typescript
import {
  NetworkError,
  ValidationError,
  StorageError,
  PermissionError,
  NotFoundError,
  ConflictError,
  AppError,
} from '@/lib/errors';

// Network errors (automatically retryable)
throw new NetworkError('Connection failed', { url: '/api/data' });

// Validation errors (not retryable)
throw new ValidationError('Invalid email format', { field: 'email' });

// Storage errors (not retryable for quota issues)
throw new StorageError('Storage quota exceeded');

// Custom error with full control
throw new AppError('Custom error', {
  category: ErrorCategory.NETWORK,
  code: 'CUSTOM_ERROR',
  statusCode: 500,
  context: { customField: 'value' },
  retryable: true,
});
```

### Authentication Errors

```typescript
import { AuthError, AuthErrorCode } from '@/lib/errors';

// Use predefined auth error codes
throw new AuthError(AuthErrorCode.INVALID_CREDENTIALS);
throw new AuthError(AuthErrorCode.USER_NOT_FOUND, { email: 'user@example.com' });
throw new AuthError(AuthErrorCode.STORAGE_ERROR); // Automatically retryable
```

## Logging Errors

### Basic Error Logging

```typescript
import { logError } from '@/lib/errors';

try {
  await someOperation();
} catch (error) {
  // Log with operation name and context
  logError('userLogin', error, { 
    userId: '123',
    timestamp: Date.now() 
  });
  throw error;
}
```

**Features:**
- ✅ Automatically sanitizes sensitive data (passwords, tokens, API keys)
- ✅ Reports to DynaTrace in production
- ✅ Categorizes errors automatically
- ✅ Structured logging format

### Sensitive Data Protection

The logging system automatically redacts sensitive fields:

```typescript
// This context...
const context = {
  email: 'user@example.com',
  password: 'secret123',      // Will be redacted
  apiKey: 'key123',           // Will be redacted
  token: 'bearer abc',        // Will be redacted
  username: 'testuser',       // Safe to log
};

logError('operation', error, context);

// Results in sanitized output:
// {
//   email: 'user@example.com',
//   password: '[REDACTED]',
//   apiKey: '[REDACTED]',
//   token: '[REDACTED]',
//   username: 'testuser'
// }
```

## Using Retry Logic

### Basic Retry

```typescript
import { withRetry } from '@/lib/retry-utils';

// Automatically retry with default options
const data = await withRetry(
  async () => await fetchData(),
  'fetchData'
);
```

**Default behavior:**
- 3 retry attempts
- 1 second initial delay
- Exponential backoff (2x multiplier)
- 10 second max delay
- Only retries network errors

### Custom Retry Options

```typescript
import { withRetry } from '@/lib/retry-utils';

const data = await withRetry(
  async () => await fetchData(),
  'fetchData',
  {
    maxAttempts: 5,
    initialDelay: 2000,        // 2 seconds
    maxDelay: 30000,           // 30 seconds
    backoffMultiplier: 2,
    shouldRetry: (error, attempt) => {
      // Custom retry logic
      return error instanceof NetworkError && attempt < 3;
    },
    onRetry: (error, attempt, delayMs) => {
      // Called before each retry
      console.log(`Retrying attempt ${attempt} after ${delayMs}ms`);
    },
  }
);
```

### Network-Specific Retry

```typescript
import { withRetry, createNetworkRetryOptions } from '@/lib/retry-utils';

// Optimized for network operations
const data = await withRetry(
  async () => await apiCall(),
  'apiCall',
  createNetworkRetryOptions({
    maxAttempts: 5,  // Override specific options
  })
);
```

### Storage-Specific Retry

```typescript
import { withRetry, createStorageRetryOptions } from '@/lib/retry-utils';

// Optimized for storage operations
// Less aggressive than network retries
const result = await withRetry(
  async () => await saveToDatabase(),
  'saveToDatabase',
  createStorageRetryOptions()
);
```

**Storage retry behavior:**
- Won't retry quota or permission errors
- Only retries transient storage failures
- 2 attempts max (less aggressive)
- Shorter delays (500ms initial)

### Reusable Retry Wrapper

```typescript
import { createRetryWrapper } from '@/lib/retry-utils';

// Create a reusable wrapper
const retryableFetch = createRetryWrapper('fetchData', {
  maxAttempts: 3,
  initialDelay: 1000,
});

// Use it multiple times
const data1 = await retryableFetch(() => fetch('/api/data1'));
const data2 = await retryableFetch(() => fetch('/api/data2'));
```

## User-Facing Error Messages

### Getting User-Friendly Messages

```typescript
import { getUserFriendlyMessage, getErrorInfo } from '@/lib/errors';

try {
  await operation();
} catch (error) {
  // Simple message
  const message = getUserFriendlyMessage(error);
  console.log(message); // "Connection error. Check your internet connection."

  // Detailed information
  const { title, message, action, retryable } = getErrorInfo(error);
  console.log(title);     // "Connection Problem"
  console.log(message);   // "Unable to connect to the server..."
  console.log(action);    // "Check your connection and try again"
  console.log(retryable); // true
}
```

### Displaying Errors to Users

```typescript
import { useToast } from '@/hooks/use-toast';
import { getErrorInfo } from '@/lib/errors';

function MyComponent() {
  const { toast } = useToast();

  async function handleAction() {
    try {
      await someOperation();
    } catch (error) {
      const { title, message, action, retryable } = getErrorInfo(error);
      
      toast({
        variant: 'destructive',
        title,
        description: `${message}${action ? ` ${action}.` : ''}`,
        action: retryable ? (
          <ToastAction onClick={handleRetry}>Try Again</ToastAction>
        ) : undefined,
      });
    }
  }

  return <button onClick={handleAction}>Do Something</button>;
}
```

## Complete Example: Fetch with Retry

```typescript
import { withRetry, createNetworkRetryOptions } from '@/lib/retry-utils';
import { logError, NetworkError, getErrorInfo } from '@/lib/errors';
import { useToast } from '@/hooks/use-toast';

async function fetchUserData(userId: string) {
  try {
    // Use retry logic for network request
    const data = await withRetry(
      async () => {
        const response = await fetch(`/api/users/${userId}`);
        
        if (!response.ok) {
          // Throw appropriate error based on status
          if (response.status === 404) {
            throw new NotFoundError('User not found', { userId });
          }
          if (response.status >= 500) {
            throw new NetworkError('Server error', { 
              status: response.status,
              userId 
            });
          }
          throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
      },
      'fetchUserData',
      createNetworkRetryOptions({
        maxAttempts: 3,
        onRetry: (error, attempt, delay) => {
          console.log(`Retrying fetch attempt ${attempt} after ${delay}ms`);
        },
      })
    );
    
    return data;
  } catch (error) {
    // Log error with context (sensitive data will be sanitized)
    logError('fetchUserData', error, { userId });
    
    // Get user-friendly error information
    const { title, message, action } = getErrorInfo(error);
    
    // Show error to user
    toast({
      variant: 'destructive',
      title,
      description: `${message}${action ? ` ${action}.` : ''}`,
    });
    
    throw error;
  }
}
```

## Global Error Handling

The `UnhandledRejectionHandler` component automatically catches unhandled promise rejections:

```typescript
// In App.tsx or main component
import { UnhandledRejectionHandler } from '@/components/UnhandledRejectionHandler';

function App() {
  return (
    <>
      <UnhandledRejectionHandler />
      {/* Rest of app */}
    </>
  );
}
```

**Features:**
- ✅ Catches all unhandled promise rejections
- ✅ Logs errors to console and DynaTrace
- ✅ Shows user-friendly toast notifications
- ✅ Provides retry option for retryable errors
- ✅ Never shows stack traces to users

## Best Practices

### ✅ DO

- Use specific error classes (`NetworkError`, `ValidationError`, etc.)
- Always log errors with context
- Provide actionable guidance in error messages
- Use retry logic for transient failures
- Sanitize sensitive data before logging
- Report errors to DynaTrace in production

### ❌ DON'T

- Show stack traces or technical details to users
- Log passwords, tokens, or other sensitive data
- Retry non-transient errors (validation, permission, etc.)
- Catch errors without logging them
- Use generic error messages without context

## Testing Error Handling

```typescript
import { describe, it, expect, vi } from 'vitest';
import { withRetry, NetworkError } from '@/lib/retry-utils';

describe('Error handling', () => {
  it('should retry on network error', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new NetworkError('Connection failed'))
      .mockResolvedValue('success');

    const result = await withRetry(fn, 'test', {
      initialDelay: 10, // Fast for tests
      maxAttempts: 3,
    });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should not retry validation errors', async () => {
    const fn = vi.fn().mockRejectedValue(new ValidationError('Invalid'));

    await expect(
      withRetry(fn, 'test', {
        shouldRetry: (error) => error instanceof NetworkError,
      })
    ).rejects.toThrow('Invalid');

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
```

## Monitoring in DynaTrace

All errors are automatically reported to DynaTrace (when configured) with:
- Error message and stack trace
- Operation name
- Error category
- Sanitized context
- Timestamp
- User session information

View errors in DynaTrace:
1. Navigate to **Applications & Microservices** → **Frontend**
2. Select **CertLab** application
3. Go to **Errors** section
4. Filter by error category, operation, or time range

## Migration Guide

### Updating Existing Code

**Before:**
```typescript
try {
  const data = await fetch('/api/data');
} catch (error) {
  console.error('Fetch failed:', error);
  throw error;
}
```

**After:**
```typescript
import { withRetry, createNetworkRetryOptions } from '@/lib/retry-utils';
import { logError, getErrorInfo } from '@/lib/errors';

try {
  const data = await withRetry(
    async () => await fetch('/api/data'),
    'fetchData',
    createNetworkRetryOptions()
  );
} catch (error) {
  logError('fetchData', error, { url: '/api/data' });
  const { title, message } = getErrorInfo(error);
  // Show user-friendly error
  throw error;
}
```

## FAQ

**Q: When should I use retry logic?**  
A: Use retry for transient failures (network errors, temporary server errors, rate limits). Don't retry validation errors, permission errors, or business logic errors.

**Q: How do I know if an error is retryable?**  
A: Check the `retryable` property on `AppError` instances, or use `getErrorInfo(error).retryable`.

**Q: What happens if all retry attempts fail?**  
A: The last error is thrown. Make sure to catch and handle it appropriately.

**Q: Can I customize the retry backoff?**  
A: Yes! Pass custom `initialDelay`, `backoffMultiplier`, and `maxDelay` options to `withRetry()`.

**Q: How do I test code with retry logic?**  
A: Use short delays in tests (`initialDelay: 10`) and mock functions to control retry behavior.

**Q: Is sensitive data automatically removed from logs?**  
A: Yes! The `logError()` function automatically sanitizes passwords, tokens, API keys, and other sensitive fields.
