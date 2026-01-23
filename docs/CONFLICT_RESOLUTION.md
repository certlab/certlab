# Firestore Conflict Resolution Implementation

## Overview

CertLab implements robust conflict resolution strategies for Firestore operations to handle simultaneous edits and racing updates from multiple clients. This document explains the architecture, strategies, and usage patterns.

## Architecture

### Components

1. **conflict-resolution.ts** - Core conflict detection and resolution logic
2. **firestore-storage-with-conflicts.ts** - Integration layer for storage operations
3. **collaborative-editing.ts** - Version control and presence tracking (existing)
4. **ConflictResolutionDialog.tsx** - UI component for manual resolution
5. **useConflictResolution.ts** - React hook for managing conflicts

### Data Flow

```
User Edit
    ↓
Storage Operation
    ↓
Version Check → Conflict? → Yes → Resolution Strategy
    ↓                              ↓
    No                         ┌───┴────┐
    ↓                          ↓        ↓
Update Success          Auto-Merge   Manual
    ↓                          ↓        ↓
Version++                  Success    User Dialog
                               ↓           ↓
                          Update       User Choice
                               ↓           ↓
                          Version++   Update
```

## Conflict Resolution Strategies

### 1. Auto-Merge (Default for Quiz, Templates)

**When to use**: Non-conflicting field changes, independent edits

**How it works**:
- Detects which fields were modified by each user
- Automatically merges non-overlapping changes
- Uses three-way merge with base version when available
- Falls back to timestamp-based resolution for overlapping changes

**Example**:
```typescript
// User 1 changes title, User 2 changes description
// Base version
{ title: "Original", description: "Original", updatedAt: T0 }

// User 1 (local)
{ title: "New Title", description: "Original", updatedAt: T1 }

// User 2 (remote)
{ title: "Original", description: "New Description", updatedAt: T2 }

// Merged result
{ title: "New Title", description: "New Description", updatedAt: T2 }
```

**Configuration**:
```typescript
{
  strategy: 'auto-merge',
  autoMergeFields: ['title', 'description', 'tags'],
  timestampField: 'updatedAt'
}
```

### 2. Last-Write-Wins (Default for Questions)

**When to use**: Simple documents, clear temporal ordering

**How it works**:
- Compares timestamps of local and remote versions
- Most recent change takes precedence
- Entire document is replaced (no field-level merging)

**Example**:
```typescript
// Local version (newer)
{ text: "Updated question", updatedAt: T2 }

// Remote version (older)
{ text: "Old question", updatedAt: T1 }

// Result: Local version wins
{ text: "Updated question", updatedAt: T2 }
```

**Configuration**:
```typescript
{
  strategy: 'last-write-wins',
  timestampField: 'updatedAt'
}
```

### 3. First-Write-Wins

**When to use**: Preserve original data, reject concurrent edits

**How it works**:
- Always keeps the remote (first) version
- Rejects local changes
- Useful for append-only scenarios

**Example**:
```typescript
// Remote version (first)
{ title: "First Edit", version: 1 }

// Local version (later)
{ title: "Second Edit", version: 1 }

// Result: Remote version preserved
{ title: "First Edit", version: 1 }
```

### 4. Manual Resolution

**When to use**: Complex conflicts, user decision required

**How it works**:
- Presents both versions to user via UI dialog
- User chooses which version to keep or manually merges fields
- Provides field-by-field comparison

**UI Flow**:
1. Conflict detected
2. Dialog shows conflicting fields
3. User selects version for each field
4. Merged result saved with new version

### 5. Version-Based

**When to use**: Critical operations requiring strict consistency

**How it works**:
- Requires explicit version number in update
- Fails if version doesn't match current
- Forces conflict resolution before proceeding

**Example**:
```typescript
await updateWithConflictResolution(
  'quiz',
  '123',
  { title: 'Update', version: 5 }, // Must match current version
  userId,
  updateFn,
  { expectedVersion: 5 }
);
```

## Configuration by Document Type

### Quiz
```typescript
{
  strategy: 'auto-merge',
  autoMergeFields: ['title', 'description', 'tags', 'timeLimit'],
  timestampField: 'updatedAt',
  versionField: 'version'
}
```

### Question
```typescript
{
  strategy: 'last-write-wins',
  timestampField: 'updatedAt'
}
```

### User Progress
```typescript
{
  strategy: 'auto-merge',
  autoMergeFields: ['questionsAnswered', 'correctAnswers', 'streak'],
  timestampField: 'lastUpdated'
}
```

### Lecture/Material
```typescript
{
  strategy: 'auto-merge',
  autoMergeFields: ['title', 'description', 'tags'],
  timestampField: 'updatedAt'
}
```

## Usage Examples

### Basic Update with Conflict Resolution

```typescript
import { updateWithConflictResolution } from '@/lib/firestore-storage-with-conflicts';

// Update quiz with automatic conflict handling
const result = await updateWithConflictResolution(
  'quiz',
  quizId,
  { title: 'Updated Title', description: 'New description' },
  userId,
  async (data) => {
    // Your update logic
    await storage.updateQuiz(quizId, data);
    return data;
  },
  {
    strategy: 'auto-merge',
    trackPresence: true,  // Show who's editing
    maxRetries: 3
  }
);

if (result.success) {
  console.log('Update successful:', result.data);
} else if (result.requiresUserInput) {
  // Show conflict resolution dialog
  showConflictDialog(result.conflict);
}
```

### Using the React Hook

```typescript
import { useConflictResolution } from '@/hooks/useConflictResolution';
import { ConflictResolutionDialog } from '@/components/ConflictResolutionDialog';

function QuizEditor() {
  const {
    hasConflict,
    conflict,
    showDialog,
    handleConflict,
    resolveManually,
    cancelResolution
  } = useConflictResolution({
    onResolved: (result) => {
      // Save the merged data
      saveQuiz(result.mergedData);
    }
  });

  const handleSave = async () => {
    try {
      await saveQuiz(localData);
    } catch (error) {
      if (isConflictError(error)) {
        // Automatic conflict resolution will be attempted
        await handleConflict(
          'quiz',
          quizId,
          localData,
          remoteData,
          userId
        );
      }
    }
  };

  return (
    <>
      <button onClick={handleSave}>Save</button>
      
      <ConflictResolutionDialog
        open={showDialog}
        onOpenChange={closeDialog}
        conflict={conflict}
        onResolve={resolveManually}
        onCancel={cancelResolution}
      />
    </>
  );
}
```

### Batch Updates with Conflict Handling

```typescript
import { batchUpdateWithConflictResolution } from '@/lib/firestore-storage-with-conflicts';

const updates = [
  { id: '1', data: { title: 'Quiz 1' } },
  { id: '2', data: { title: 'Quiz 2' } },
  { id: '3', data: { title: 'Quiz 3' } }
];

const result = await batchUpdateWithConflictResolution(
  'quiz',
  updates,
  userId,
  async (id, data) => {
    await storage.updateQuiz(parseInt(id), data);
    return data;
  }
);

console.log(`Successful: ${result.successful.length}`);
console.log(`Failed: ${result.failed.length}`);
console.log(`Conflicts: ${result.conflicts.length}`);

// Handle conflicts
for (const conflict of result.conflicts) {
  showConflictDialog(conflict.conflict);
}
```

### Custom Conflict Strategy

```typescript
// Create a custom updater with specific strategy
const updateQuizWithMerge = createConflictAwareUpdater(
  'quiz',
  async (id, data) => storage.updateQuiz(parseInt(id), data),
  {
    strategy: 'auto-merge',
    autoMergeFields: ['title', 'description', 'tags', 'questions'],
    trackPresence: true,
    maxRetries: 5
  }
);

// Use the custom updater
const result = await updateQuizWithMerge(
  quizId,
  updatedData,
  userId
);
```

## Error Handling

### Conflict Errors

```typescript
import { ConflictError } from '@/lib/errors';

try {
  await updateQuiz(data);
} catch (error) {
  if (error instanceof ConflictError) {
    const context = error.context;
    console.log('Conflict in:', context.documentType);
    console.log('Document ID:', context.documentId);
    console.log('Expected version:', context.expectedVersion);
    console.log('Current version:', context.currentVersion);
    
    // Handle the conflict
    await resolveConflict(error);
  }
}
```

### Retryable Errors

```typescript
import { shouldRetryError, retryWithBackoff } from '@/lib/firestore-storage-with-conflicts';

try {
  await updateQuiz(data);
} catch (error) {
  if (shouldRetryError(error)) {
    // Retry with exponential backoff
    await retryWithBackoff(
      () => updateQuiz(data),
      3,
      100
    );
  } else {
    // Non-retryable error
    throw error;
  }
}
```

## Race Condition Scenarios

### Scenario 1: Simultaneous Field Edits

**Setup**: Two users edit different fields simultaneously

**Resolution**: Auto-merge combines both changes

```typescript
// User 1 edits title at T1
{ title: "New Title", description: "Original" }

// User 2 edits description at T2
{ title: "Original", description: "New Description" }

// Merged result
{ title: "New Title", description: "New Description" }
```

### Scenario 2: Same Field Conflict

**Setup**: Two users edit the same field

**Resolution**: Timestamp-based (most recent wins)

```typescript
// User 1 at T1
{ title: "User1 Title" }

// User 2 at T2 (later)
{ title: "User2 Title" }

// Result: User 2 wins
{ title: "User2 Title" }
```

### Scenario 3: Version Mismatch

**Setup**: User edits based on outdated version

**Resolution**: Manual resolution required

```typescript
// User has version 1, server has version 3
// Auto-merge can't determine what changed
// User dialog shows both versions for manual merge
```

### Scenario 4: Offline Sync

**Setup**: User edits offline, syncs later with conflicts

**Resolution**: Queue processes with conflict detection

```typescript
// Offline edits queued
offlineQueue.push({ op: 'update', data: localData });

// On reconnect, process queue with conflict resolution
await processOfflineQueue({
  onConflict: async (conflict) => {
    return await resolveConflict(conflict);
  }
});
```

## Testing

### Unit Tests

```bash
npm run test:run -- client/src/lib/conflict-resolution.test.ts
```

### Integration Tests

```bash
npm run test:run -- client/src/lib/firestore-storage-with-conflicts.test.ts
```

### Race Condition Tests

See `conflict-resolution.test.ts` for comprehensive race condition scenarios:
- Simultaneous edits to different fields
- Simultaneous edits to same field
- Rapid successive updates
- Network delay causing version mismatch
- Concurrent progress counter updates

## Performance Considerations

### Retry Strategy

- Default: 3 retries with exponential backoff
- Base delay: 100ms
- Max delay: 800ms (for 3 retries)

### Batch Processing

- Batch size: 5 concurrent operations
- Prevents overwhelming Firestore
- Maintains reasonable throughput

### Presence Tracking

- Optional (disabled by default)
- Adds ~2 operations per update (set + remove)
- Enable for collaborative editing scenarios

## Security Considerations

### Version Validation

- Always check version before critical updates
- Prevents lost updates
- Detects concurrent modifications

### User Isolation

- Each user's data in separate subcollections
- Conflicts only within user's own data
- Shared content uses optimistic locking

### Error Context

- Sensitive data sanitized in error logs
- Context includes only necessary metadata
- No passwords or tokens in conflict data

## Future Enhancements

### Planned Features

1. **Additive Merging** for counters (questionsAnswered, etc.)
2. **Operational Transformation** for real-time text editing
3. **Conflict History** tracking and analysis
4. **Automatic Conflict Prevention** with optimistic locking
5. **Conflict Metrics** and monitoring

### Performance Optimization

1. Reduce retry delays for simple conflicts
2. Cache document locks locally
3. Batch presence updates
4. Optimize version check queries

## Support and Troubleshooting

### Common Issues

**Issue**: Manual resolution dialog keeps appearing
- **Cause**: Complex conflicts requiring user decision
- **Solution**: Use more specific auto-merge configuration

**Issue**: Lost updates
- **Cause**: Not using version-aware updates
- **Solution**: Always use `updateWithConflictResolution` or include version field

**Issue**: Slow sync performance
- **Cause**: Too many retries or presence tracking overhead
- **Solution**: Adjust `maxRetries` and disable `trackPresence` if not needed

### Debug Mode

Enable detailed logging:
```typescript
localStorage.setItem('debug', 'certlab:conflicts');
```

### Getting Help

- GitHub Issues: Report bugs or request features
- Documentation: [CONTRIBUTING.md](../CONTRIBUTING.md)
- Discussions: Ask questions and share use cases

## References

- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Collaborative Editing Module](../client/src/lib/collaborative-editing.ts)
- [ROADMAP.md](../ROADMAP.md)
- [Conflict Resolution Tests](../client/src/lib/conflict-resolution.test.ts)
