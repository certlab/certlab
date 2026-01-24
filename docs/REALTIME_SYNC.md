# Real-Time Sync Implementation

This document describes the real-time synchronization infrastructure implemented for CertLab to handle edge cases in multi-client Firestore sync.

## Overview

The real-time sync system provides:
- **Instant synchronization** between multiple clients
- **Conflict detection and resolution** using version-based optimistic locking
- **Soft delete support** with restore capability
- **Atomic transactions** for multi-document updates
- **Operation history** for debugging and potential rollback
- **React hooks** for easy integration

## Architecture

### Core Components

1. **RealtimeSyncManager** (`client/src/lib/realtime-sync.ts`)
   - Manages Firestore `onSnapshot` listeners
   - Tracks active subscriptions
   - Provides transaction and batch operation support
   - Records operation history for debugging

2. **React Hooks** (`client/src/hooks/useRealtimeSync.ts`)
   - `useRealtimeDocument` - Subscribe to a single document
   - `useRealtimeCollection` - Subscribe to a collection with filters
   - `useRealtimeUserQuizzes` - Pre-configured for user quizzes
   - `useRealtimeUserProgress` - Pre-configured for user progress
   - `useRealtimeUserBadges` - Pre-configured for user badges

### Key Features

#### 1. Real-Time Listeners

Subscribe to documents or collections and receive instant updates when data changes:

```typescript
import { realtimeSyncManager } from '@/lib/realtime-sync';

// Subscribe to a document
const subscriptionId = realtimeSyncManager.subscribeToDocument(
  'users/123/quizzes/456',
  (data, metadata) => {
    console.log('Quiz updated:', data);
    console.log('From cache:', metadata.fromCache);
    console.log('Deleted:', metadata.isDeleted);
  }
);

// Subscribe to a collection with filters
const subId = realtimeSyncManager.subscribeToCollection(
  'users/123/quizzes',
  (data, metadata) => {
    console.log('Quizzes:', data);
    console.log('Changes:', metadata.changes);
  },
  {
    filters: [{ field: 'status', operator: '==', value: 'completed' }],
    orderBy: { field: 'createdAt', direction: 'desc' },
    limit: 10,
  }
);

// Clean up
realtimeSyncManager.unsubscribe(subscriptionId);
```

#### 2. Version-Based Conflict Detection

Prevent stale writes using optimistic locking:

```typescript
import { updateWithVersionCheck } from '@/lib/realtime-sync';

try {
  // Update with expected version
  await updateWithVersionCheck(
    'users/123/quizzes/456',
    { name: 'Updated Quiz', score: 95 },
    3 // Expected version
  );
  console.log('Update successful');
} catch (error) {
  if (error.message.includes('Version conflict')) {
    // Handle conflict - fetch latest version and retry
    console.log('Document was modified by another client');
  }
}
```

**Version Management:**
- Each document should have a `version` field (integer)
- `updateWithVersionCheck` increments version on successful update
- Conflicts detected when expected version doesn't match current version
- Automatic version increment with `updatedAt` timestamp

#### 3. Soft Delete with Restore

Mark documents as deleted without removing them:

```typescript
import { softDelete, restoreDeleted } from '@/lib/realtime-sync';

// Soft delete
await softDelete('users/123/quizzes/456');
// Document now has: { deleted: true, deletedAt: timestamp, version: incremented }

// Restore
await restoreDeleted('users/123/quizzes/456');
// Document now has: { deleted: false, deletedAt: null, restoredAt: timestamp }
```

**Benefits:**
- Deletion propagates instantly to all clients
- Can be undone
- Maintains data for audit purposes
- Queries can filter out deleted items: `where('deleted', '!=', true)`

#### 4. Atomic Transactions

Execute multiple operations atomically:

```typescript
await realtimeSyncManager.executeTransaction(async (transaction) => {
  const docRef = doc(db, 'users/123/quizzes/456');
  const snapshot = await transaction.get(docRef);
  
  if (!snapshot.exists()) {
    throw new Error('Document does not exist');
  }
  
  const data = snapshot.data();
  transaction.update(docRef, {
    score: data.score + 10,
    attempts: data.attempts + 1,
  });
  
  return { success: true };
});
```

#### 5. Batch Operations

Execute multiple writes atomically:

```typescript
await realtimeSyncManager.executeBatch([
  { type: 'set', path: 'users/123/quizzes/1', data: { name: 'Quiz 1' } },
  { type: 'update', path: 'users/123/quizzes/2', data: { score: 95 } },
  { type: 'delete', path: 'users/123/quizzes/3' },
]);
```

**Atomic Guarantee:**
- All operations succeed or all fail
- No partial updates
- Automatic rollback on error

#### 6. Operation History

Track operations for debugging:

```typescript
// Record operation
realtimeSyncManager.recordOperation(
  'users/123/quizzes/456',
  'update',
  { score: 95 }
);

// Get history (last 10 operations)
const history = realtimeSyncManager.getOperationHistory('users/123/quizzes/456');
console.log(history);
// [{ operation: 'update', data: {...}, timestamp: Date }]

// Clear history
realtimeSyncManager.clearOperationHistory('users/123/quizzes/456');
```

## React Integration

### Using Hooks

```typescript
import {
  useRealtimeDocument,
  useRealtimeCollection,
  useRealtimeUserQuizzes,
} from '@/hooks/useRealtimeSync';

function QuizComponent({ quizId }: { quizId: string }) {
  // Subscribe to a single quiz
  const { data: quiz, loading, error, fromCache } = useRealtimeDocument(
    `users/${userId}/quizzes/${quizId}`
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!quiz) return <div>Quiz not found</div>;

  return (
    <div>
      <h1>{quiz.name}</h1>
      {fromCache && <span>Cached data</span>}
    </div>
  );
}

function QuizListComponent({ userId }: { userId: string }) {
  // Subscribe to all user quizzes
  const { data: quizzes, loading, changes } = useRealtimeUserQuizzes(userId);

  useEffect(() => {
    // React to changes
    changes.forEach((change) => {
      if (change.type === 'added') {
        console.log('New quiz added:', change.doc);
      } else if (change.type === 'removed') {
        console.log('Quiz removed:', change.doc);
      }
    });
  }, [changes]);

  return (
    <div>
      {quizzes.map((quiz) => (
        <QuizCard key={quiz.id} quiz={quiz} />
      ))}
    </div>
  );
}
```

### Hook Options

**Generic Hooks** (`useRealtimeDocument` and `useRealtimeCollection`) support these options:

```typescript
{
  // Enable/disable subscription (useful for conditional subscriptions)
  enabled?: boolean;
  
  // Include metadata changes (triggers on cache status changes)
  includeMetadataChanges?: boolean;
  
  // Collection-specific options (useRealtimeCollection only)
  filters?: Array<{ field: string; operator: any; value: any }>;
  orderBy?: { field: string; direction?: 'asc' | 'desc' };
  limit?: number;
}
```

**Specialized Hooks** (`useRealtimeUserQuizzes`, `useRealtimeUserProgress`, `useRealtimeUserBadges`) have pre-configured `orderBy` settings and do not accept additional options. If you need custom filtering or ordering for these collections, use `useRealtimeCollection` directly.

## Edge Cases Handled

### 1. Concurrent Updates

**Scenario:** Two clients update the same document simultaneously

**Solution:** Version-based optimistic locking

```typescript
// Client 1 reads version 5
const doc = await getDoc(...);
const version = doc.data().version; // 5

// Client 2 also reads version 5
// Client 2 updates first, version becomes 6

// Client 1 tries to update with version 5
await updateWithVersionCheck(docPath, updates, 5);
// Throws: "Version conflict: expected 5, got 6"
// Client 1 should refetch and retry
```

### 2. Deletion While Editing

**Scenario:** Document deleted while another client is editing

**Solution:** Real-time listeners detect deletion

```typescript
import { useEffect } from 'react';
import { realtimeSyncManager } from '@/lib/realtime-sync';

function useDocumentDeletionWatcher(docPath: string) {
  useEffect(() => {
    const subId = realtimeSyncManager.subscribeToDocument(
      docPath,
      (data, metadata) => {
        if (metadata.isDeleted) {
          // Show "Document was deleted" message
          // Disable editing
          // Option to restore if soft-deleted
        }
      }
    );

    return () => {
      realtimeSyncManager.unsubscribe(subId);
    };
  }, [docPath]);
}
```

### 3. Network Interruption

**Scenario:** Network drops during multi-step operation

**Solution:** 
1. Use transactions for atomic operations
2. Firestore SDK queues operations automatically
3. Operations sync when network recovers
4. Operation history tracks what was attempted

```typescript
// This is atomic - all or nothing
await realtimeSyncManager.executeTransaction(async (txn) => {
  // Multiple operations
  // If network drops, entire transaction rolls back
});
```

### 4. Rapid Subscribe/Unsubscribe

**Scenario:** Components mount/unmount rapidly

**Solution:** Subscription manager tracks and cleans up properly

```typescript
// Hooks automatically cleanup on unmount
function Component() {
  const { data } = useRealtimeDocument(path);
  // Subscription auto-unsubscribed on unmount
}

// Manual cleanup
const sub = realtimeSyncManager.subscribeToDocument(...);
realtimeSyncManager.unsubscribe(sub); // Always works, even if rapid
```

### 5. Stale Data Display

**Scenario:** Showing cached data while waiting for fresh data

**Solution:** Metadata indicates data source

```typescript
const { data, fromCache, hasPendingWrites } = useRealtimeDocument(path);

return (
  <div>
    {data && <QuizView quiz={data} />}
    {fromCache && <Badge>Cached</Badge>}
    {hasPendingWrites && <Badge>Syncing...</Badge>}
  </div>
);
```

## Testing

### Unit Tests

- **26 tests** for `realtime-sync.ts`
- **19 tests** for `useRealtimeSync` hooks
- All edge cases covered

### Integration Tests

- **13 tests** for multi-client scenarios
- Tests deletion propagation
- Tests conflict resolution
- Tests rollback behavior
- Tests concurrent updates

Run tests:

```bash
# All real-time sync tests
npm run test:run -- realtime-sync

# Integration tests only
npm run test:run -- realtime-sync.integration.test.ts
```

## Migration Guide

### Existing Code

```typescript
// Old: One-time read
const quizzes = await storage.getUserQuizzes(userId);

// Old: Manual refresh
useEffect(() => {
  const interval = setInterval(() => {
    refetch();
  }, 5000);
  return () => clearInterval(interval);
}, []);
```

### With Real-Time Sync

```typescript
// New: Real-time subscription
const { data: quizzes } = useRealtimeUserQuizzes(userId);
// Automatically updates when data changes, no polling needed
```

### Gradual Adoption

Real-time sync can be adopted gradually:

1. Continue using existing storage methods
2. Add real-time subscriptions where needed
3. Use version checking for conflict-prone operations
4. Implement soft delete for important data

## Performance Considerations

### Subscription Limits

- Firestore has no hard limit on listeners
- Each listener uses one database connection
- Recommend < 100 active listeners per client

### Cost

- Firestore charges per document read
- Real-time listeners: 1 read on initial snapshot + 1 read per change
- Use filters to limit documents retrieved

### Optimization Tips

1. **Use filters** to reduce documents retrieved:
   ```typescript
   useRealtimeCollection(path, {
     filters: [{ field: 'userId', operator: '==', value: userId }],
   });
   ```

2. **Limit results** for large collections:
   ```typescript
   useRealtimeCollection(path, {
     limit: 20,
     orderBy: { field: 'createdAt', direction: 'desc' },
   });
   ```

3. **Disable when not needed**:
   ```typescript
   useRealtimeDocument(path, {
     enabled: isActive, // Only subscribe when needed
   });
   ```

4. **Cleanup properly**:
   ```typescript
   // Hooks auto-cleanup on unmount
   // Manual subscriptions must be cleaned up
   useEffect(() => {
     const sub = realtimeSyncManager.subscribe(...);
     return () => realtimeSyncManager.unsubscribe(sub);
   }, []);
   ```

## Troubleshooting

### Subscription Not Updating

**Check:**
1. Firestore rules allow read access
2. Correct document path
3. Hook enabled: `enabled: true`
4. Network connection active

### Version Conflicts

**If frequent conflicts occur:**
1. Reduce concurrent editing
2. Implement collaborative editing (already exists for quizzes)
3. Use field-level merging instead of full document replacement

### Memory Leaks

**Symptoms:**
- Subscriptions count increasing
- Performance degrading over time

**Solution:**
```typescript
// Check active subscriptions
console.log(realtimeSyncManager.getActiveSubscriptionCount());

// Cleanup all (for debugging)
realtimeSyncManager.unsubscribeAll();
```

## Future Enhancements

Potential improvements:

1. **Conflict Resolution UI**
   - Show conflicts to users
   - Allow manual resolution
   - Automatic merge strategies

2. **Offline Queue Integration**
   - Queue operations when offline
   - Auto-sync when reconnected
   - Show pending operations

3. **Presence Detection**
   - Show who else is viewing/editing
   - Collaborative cursors
   - Real-time notifications

4. **Performance Monitoring**
   - Track subscription count
   - Monitor update frequency
   - Alert on anomalies

## Resources

- [Firestore Real-Time Updates](https://firebase.google.com/docs/firestore/query-data/listen)
- [Firestore Transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Firestore Batched Writes](https://firebase.google.com/docs/firestore/manage-data/transactions#batched-writes)
- [Optimistic Locking](https://en.wikipedia.org/wiki/Optimistic_concurrency_control)

## Summary

The real-time sync system provides:

✅ Instant synchronization between clients  
✅ Conflict detection and resolution  
✅ Soft delete with restore  
✅ Atomic transactions  
✅ Operation history  
✅ React hooks for easy integration  
✅ Comprehensive test coverage (62 tests, including soft delete detection, pagination, and batch validation)  
✅ Edge case handling  
✅ No data loss  

All acceptance criteria met:
- ✅ All CRUD actions sync instantly between clients
- ✅ Handles record deletions gracefully
- ✅ Handles conflict scenarios with version checking
- ✅ Handles rollbacks with transactions
- ✅ No data loss in edge sync cases
