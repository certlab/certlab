# Offline Queue System

This document describes the offline queue system for CertLab, which provides reliable data synchronization when network connectivity is intermittent or unavailable.

## Overview

The offline queue system automatically queues Firestore write operations when the network is unavailable and retries them when connectivity is restored. This ensures that user actions are never lost, even during offline periods.

## Architecture

### Components

1. **Offline Queue Manager** (`offline-queue.ts`)
   - Manages a persistent queue of pending operations
   - Stores queue in localStorage for persistence across page reloads
   - Provides automatic retry with exponential backoff
   - Exposes state to Dev Tools for debugging

2. **Firestore Storage Wrapper** (`firestore-storage-queued.ts`)
   - Wraps Firestore storage operations with offline support
   - Intercepts write operations (create, update, delete)
   - Returns optimistic results immediately
   - Queues operations when offline or on network errors

3. **Storage Factory Integration** (`storage-factory.ts`)
   - Integrates offline queue with the main storage system
   - Transparent to application code

## Features

### Automatic Queueing

When the network is offline or a network error occurs:
- Write operations are automatically queued
- Read operations continue to work (using Firestore's offline cache)
- Operations return immediately with optimistic results
- User experience is uninterrupted

### Retry Logic

Failed operations are retried automatically:
- Initial attempt at 0s, then exponential backoff for retries (1s, 2s, 4s, 8s) with a maximum delay cap of 10s
- Maximum 5 total attempts (1 initial + 4 retries) by default
- Only retries network-related errors
- Validation errors are not retried

### Persistence

The queue survives page reloads:
- Stored in localStorage
- Operations restored on page load
- Operation functions must be re-initialized (limitation)

### Dev Tools Integration

Queue state is accessible for debugging:
```javascript
// Access queue state in browser console
window.__CERTLAB_OFFLINE_QUEUE__.getState();

// View all operations
window.__CERTLAB_OFFLINE_QUEUE__.getQueue();

// Manually process queue
window.__CERTLAB_OFFLINE_QUEUE__.processQueue();

// Clear queue
window.__CERTLAB_OFFLINE_QUEUE__.clearQueue();

// Clear only completed operations
window.__CERTLAB_OFFLINE_QUEUE__.clearCompleted();
```

## Usage

### For Developers

The offline queue is integrated into the storage system and works transparently:

```typescript
import { storage } from '@/lib/storage-factory';

// Create a quiz - automatically queued if offline
const quiz = await storage.createQuiz({
  name: 'My Quiz',
  userId: 'user123',
});

// If offline, returns optimistic result:
// { id: '...', name: 'My Quiz', userId: 'user123', _queued: true, _queueId: '...' }

// If online, returns actual result from Firestore
// { id: 123, name: 'My Quiz', userId: 'user123', ... }
```

### Detecting Queued Operations

Operations that are queued have special properties:

```typescript
const result = await storage.createQuiz(quizData);

// Type-safe detection using a type guard
function isQueuedResult(result: any): result is { _queued: true; _queueId: string } {
  return result && typeof result === 'object' && result._queued === true;
}

if (isQueuedResult(result)) {
  // Operation was queued and will sync later
  console.log('Queue ID:', result._queueId);
} else {
  // Operation completed successfully
  console.log('Quiz ID:', result.id);
}
```

### Manual Queue Management

For advanced use cases:

```typescript
import { offlineQueue } from '@/lib/offline-queue';

// Check if there are pending operations
const hasPending = offlineQueue.hasPendingOperations();

// Get queue state
const state = offlineQueue.getState();
console.log(`Total: ${state.total}, Pending: ${state.pending}, Completed: ${state.completed}`);

// Manually process queue
await offlineQueue.processQueue();

// Clear completed operations
offlineQueue.clearCompleted();
```

## Implementation Details

### Queued Operation Types

The system recognizes three types of operations:
- **create**: Creates a new document
- **update**: Updates an existing document
- **delete**: Deletes a document

### Optimistic Results

When operations are queued offline, the system returns optimistic results:

**Create Operations:**
```typescript
{
  ...originalData,
  id: temporaryId,  // Generated from queue ID
  _queued: true,
  _queueId: '...'
}
```

**Update Operations:**
```typescript
{
  id: originalId,
  ...updates,
  _queued: true,
  _queueId: '...'
}
```

**Delete Operations:**
```typescript
{
  _queued: true,
  _queueId: '...'
}
```

### Network Detection

The system uses multiple signals to detect offline status:
1. `navigator.onLine` - Browser's network status
2. Network error messages - Errors containing "network", "offline", "failed to fetch", etc.
3. Firestore SDK signals - Handled by Firestore's built-in offline support

### Retry Strategy

Operations are retried with exponential backoff:

```
First attempt: Immediate (0s delay)
Retry 1: after 1s delay
Retry 2: after 2s delay
Retry 3: after 4s delay
Retry 4: after 8s delay
Max delay cap: 10s
```

With the default `maxRetries: 5`, this means 5 total attempts (1 initial + 4 retries).

Only network-related errors are retried:
- Network errors
- Connection timeouts
- 503, 502, 504 server errors
- Rate limit errors (429)

Validation errors are NOT retried:
- Invalid data format
- Missing required fields
- Permission denied

## Testing

### Unit Tests

- Queue operations (enqueue, dequeue, clear)
- State management
- Persistence to localStorage
- Network listener integration

### Integration Tests

- Offline/online transitions
- Network flapping scenarios
- Queue persistence across page reloads
- Error handling and retry logic
- Optimistic updates
- Dev Tools integration

### Manual Testing

To test the offline queue manually:

1. **Go Offline:**
   - Open Chrome DevTools → Network tab
   - Select "Offline" from the throttling dropdown
   - Or use browser's offline mode

2. **Perform Write Operations:**
   - Create a quiz
   - Update user profile
   - Delete a question
   
3. **Verify Queue:**
   - Open Console
   - Run: `window.__CERTLAB_OFFLINE_QUEUE__.getState()`
   - Verify operations are queued

4. **Go Online:**
   - Restore network connectivity
   - Operations should auto-sync

5. **Verify Sync:**
   - Check console logs for "Queued operation completed"
   - Verify data in Firestore console

## Limitations

### Operation Function Persistence

When the page reloads, queued operations are restored from localStorage, but the **operation functions** are not persisted. This means:

- Queued operations remain in the queue after page reload
- They appear in Dev Tools with status 'pending'
- But they cannot be executed until the user performs a similar action

**Workaround:** Application should re-queue operations on startup if needed, or handle this scenario in the UI.

### Optimistic ID Conflicts

Optimistic IDs are temporary and may not match the final Firestore document ID:
- Use the `_queueId` to track operations
- UI should handle ID changes when sync completes
- Consider using client-generated UUIDs for documents

#### Handling ID Changes After Sync

When a queued write finishes, the underlying Firestore document may have a different ID than the optimistic ID the UI used while offline or pending.

**How completion is observed:**

The offline queue itself does not emit a special callback for every operation. Completion is typically observed through:
- Your existing Firestore listeners (e.g., `onSnapshot`) updating with the new server state
- Your data-fetching layer (e.g., TanStack Query) refetching after connectivity is restored
- Use these updates as the trigger to reconcile optimistic state with real Firestore state

**Recommended patterns:**

1. While an operation is pending, store both the `_queueId` (stable operation identifier) and the optimistic document ID
2. When server data arrives, match the server record to the pending operation using correlation (e.g., matching on content or temporary metadata)
3. Update in-memory lists, caches, or UI state to replace the optimistic ID with the real Firestore ID
4. For critical use cases, consider using client-generated UUIDs as document IDs (via `id` field in the data) so IDs remain stable


### Write Order

Operations are executed in queue order, but Firestore timestamps may not reflect this order due to:
- Network delays
- Retry timing
- Server processing time

**Best Practice:** Don't rely on write order for critical business logic.

## Configuration

Default configuration:

```typescript
{
  storageKey: 'certlab_offline_queue',  // localStorage key
  maxQueueSize: 100,                    // Maximum operations in queue
  maxRetries: 5,                        // Maximum retry attempts
  exposeToDevTools: true                // Expose to window object
}
```

To customize (advanced):

```typescript
import { OfflineQueue } from '@/lib/offline-queue';

const customQueue = new OfflineQueue({
  maxQueueSize: 200,
  maxRetries: 3,
  onStateChange: (state) => {
    console.log('Queue state changed:', state);
  }
});
```

## Troubleshooting

### Queue Not Processing

**Symptom:** Operations remain in queue even when online.

**Causes:**
1. Browser reports online but network is actually down
2. Operation function not available (after page reload)
3. Firestore authentication expired

**Solutions:**
- Check actual connectivity (can you reach firebase.google.com?)
- Check console for authentication errors
- Manually trigger: `window.__CERTLAB_OFFLINE_QUEUE__.processQueue()`

### Operations Failing Repeatedly

**Symptom:** Operations retry 5 times and then fail.

**Causes:**
1. Invalid data (validation errors)
2. Permission denied
3. Quota exceeded

**Solutions:**
- Check error messages in Dev Tools
- Verify Firestore security rules
- Check data format matches schema

### Queue Growing Too Large

**Symptom:** Queue has hundreds of operations.

**Causes:**
1. Extended offline period
2. Persistent network issues
3. Server errors

**Solutions:**
- Clear completed: `window.__CERTLAB_OFFLINE_QUEUE__.clearCompleted()`
- Clear all: `window.__CERTLAB_OFFLINE_QUEUE__.clearQueue()`
- Fix underlying network/server issues

## Performance Considerations

### Memory Usage

Each queued operation includes:
- Operation data (~1-10 KB typically)
- Metadata (~0.5 KB)

With default max of 100 operations:
- Typical memory: ~100-1000 KB
- localStorage: ~50-500 KB

### Processing Time

Queue processing is sequential:
- Each operation waits for previous to complete
- Retry delays add to total time
- 100 operations could take several minutes

**Recommendation:** Keep queue size reasonable, clear completed operations regularly.

## Future Enhancements

Potential improvements:

1. **Operation Batching:** Group multiple operations into Firestore batch writes
2. **Smart Retry:** Detect when Firestore comes online (vs. generic network)
3. **Conflict Resolution:** Handle cases where offline edits conflict with online changes
4. **Priority Queue:** Allow marking operations as high priority
5. **Operation Function Serialization:** Store serializable operation descriptions

## See Also

- `client/src/lib/offline-queue.ts` - Queue implementation
- `client/src/lib/offline-queue.test.ts` - Unit tests
- `client/src/lib/offline-queue.integration.test.ts` - Integration tests
- `client/src/lib/firestore-storage-queued.ts` - Storage wrapper
- `client/src/lib/retry-utils.ts` - Retry logic utilities
