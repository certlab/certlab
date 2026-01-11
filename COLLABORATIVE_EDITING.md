# Collaborative Editing Feature

## Overview

CertLab now supports real-time collaborative editing for quizzes and learning materials. Multiple users can edit the same document simultaneously, see each other's presence, and handle conflicts gracefully.

## Features

### 1. Real-Time Presence Tracking
- **Active Editors Display**: See who else is editing the same document
- **Avatar Indicators**: Each editor has a unique colored avatar
- **Section Tracking**: Know which section/tab other editors are working on
- **Auto-Cleanup**: Inactive editors are automatically removed after 5 minutes

### 2. Conflict Detection & Resolution
- **Optimistic Locking**: Last-write-wins with conflict detection
- **Version Tracking**: Every save increments the document version
- **Conflict Warnings**: Visual alerts when concurrent edits are detected
- **Version History**: Full version history with restore capability

### 3. Network Resilience
- **Online/Offline Detection**: Visual indicators for connection status
- **Automatic Reconnection**: Presence re-established on reconnect
- **Graceful Degradation**: Works in offline mode, syncs on reconnect

## Architecture

### Data Model

#### Editor Presence
Stored at: `/presence/{documentType}-{documentId}/editors/{userId}`

```typescript
interface EditorPresence {
  userId: string;
  userName: string;
  userEmail?: string;
  profileImageUrl?: string;
  color: string; // Unique color for this editor
  lastSeen: Date;
  isActive: boolean;
  documentType: 'quiz' | 'quizTemplate' | 'lecture' | 'material';
  documentId: string;
  editingSection?: string; // Current tab/section being edited
}
```

#### Document Lock
Stored at: `/locks/{documentType}-{documentId}`

```typescript
interface DocumentLock {
  documentType: 'quiz' | 'quizTemplate' | 'lecture' | 'material';
  documentId: string;
  lockMode: 'optimistic' | 'pessimistic';
  version: number; // Current document version
  lastModifiedBy: string;
  lastModifiedAt: Date;
}
```

#### Edit Session
Stored at: `/users/{userId}/editSessions/{sessionId}`

```typescript
interface EditSession {
  id: string;
  userId: string;
  documentType: 'quiz' | 'quizTemplate' | 'lecture' | 'material';
  documentId: string;
  startedAt: Date;
  lastActivityAt: Date;
  endedAt?: Date;
  isActive: boolean;
  editCount: number;
  conflictsResolved: number;
}
```

## Usage

### In Quiz Builder

The Quiz Builder automatically enables collaborative editing for existing templates:

```typescript
import { useCollaborativeEditing } from '@/hooks/use-collaborative-editing';
import { CollaborativeEditors } from '@/components/CollaborativeEditors';

function QuizBuilder() {
  const templateId = getTemplateId(); // From URL params
  
  const {
    activeEditors,
    isOnline,
    hasConflict,
    recordEdit,
  } = useCollaborativeEditing({
    documentType: 'quizTemplate',
    documentId: templateId,
    enabled: !!templateId, // Only for existing templates
  });

  // Display presence indicators
  return (
    <>
      {templateId && (
        <CollaborativeEditors
          editors={activeEditors}
          currentUserId={user.id}
          isOnline={isOnline}
          hasConflict={hasConflict}
        />
      )}
      {/* Rest of quiz builder UI */}
    </>
  );
}
```

### In Material Editor

Similar integration for learning materials:

```typescript
function MaterialEditor({ lectureId }) {
  const {
    activeEditors,
    isOnline,
    hasConflict,
    recordEdit,
  } = useCollaborativeEditing({
    documentType: 'lecture',
    documentId: lectureId?.toString() || 'new',
    enabled: !!lectureId,
  });

  const handleSave = async () => {
    await saveMaterial();
    
    // Record edit in collaborative session
    if (lectureId) {
      await recordEdit();
    }
  };
}
```

## Conflict Resolution Strategy

### Optimistic Locking (Default)
1. User loads document at version N
2. User makes edits
3. On save:
   - Check if current version is still N
   - If yes: Save succeeds, version becomes N+1
   - If no: Conflict detected, show warning

### Handling Conflicts

When a conflict is detected:

1. **User Notification**: Visual alert shows another user made changes
2. **Version History**: User can view version history to see what changed
3. **Resolution Options**:
   - **Keep Your Changes**: Overwrites with your version (creates new version)
   - **Restore Previous**: Restore from version history and merge manually
   - **Manual Merge**: Review both versions and combine changes

## Best Practices

### For Users
1. **Save Frequently**: Regular saves create version checkpoints
2. **Watch Presence**: Be aware of other active editors
3. **Communicate**: Use team chat when editing together
4. **Review History**: Check version history before major changes

### For Developers
1. **Enable for Existing Documents**: Only enable collaboration for saved documents
2. **Record Edits**: Call `recordEdit()` after successful saves
3. **Handle Conflicts**: Show meaningful error messages for conflicts
4. **Update Presence**: Call `updatePresence()` when changing sections

## Performance Considerations

### Firestore Reads/Writes
- **Presence Heartbeat**: Updates every 30 seconds (1 write per editor)
- **Lock Subscription**: 1 read per document load + real-time updates
- **Editor Subscription**: 1 read + real-time updates for active editors
- **Version Creation**: 1 write per save

### Optimization Tips
1. **Batch Updates**: Use Firestore batch writes for multiple changes
2. **Debounce Saves**: Don't save on every keystroke
3. **Cleanup Stale Data**: Run cleanup every minute
4. **Limit History**: Consider archiving old versions after 30 days

## Security Rules

Required Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Presence - users can write their own presence
    match /presence/{presenceDocId}/editors/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      request.auth.uid == userId &&
                      request.resource.data.userId == userId;
    }
    
    // Locks - authenticated users can read; write restricted to document editors
    match /locks/{lockId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
      // TODO: Add additional checks to verify user has edit permission on the document
    }
    
    // Edit sessions - users can only access their own
    match /users/{userId}/editSessions/{sessionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Troubleshooting

### Presence Not Showing
1. Check Firebase configuration
2. Verify Firestore security rules
3. Check browser console for errors
4. Ensure user is authenticated

### Conflicts Keep Occurring
1. Check network stability
2. Reduce save frequency
3. Coordinate with other editors
4. Use version history to understand changes

### Performance Issues
1. Reduce presence heartbeat frequency
2. Increase cleanup interval
3. Archive old versions
4. Use Firestore indexing

## Future Enhancements

### Planned Features
- [ ] Real-time cursor tracking
- [ ] Operational Transformation for text fields
- [ ] Chat/comments within editor
- [ ] Lock specific sections during editing
- [ ] Conflict resolution UI with diff view
- [ ] Presence in mobile app
- [ ] Activity feed showing recent edits
- [ ] Collaborative undo/redo

### Potential Improvements
- [ ] WebRTC for direct peer communication
- [ ] CRDT-based text editing
- [ ] Offline-first conflict resolution
- [ ] Auto-merge compatible changes
- [ ] Role-based editing permissions

## API Reference

### useCollaborativeEditing Hook

```typescript
function useCollaborativeEditing({
  documentType: 'quiz' | 'quizTemplate' | 'lecture' | 'material',
  documentId: string,
  enabled?: boolean,
  onConflict?: (lock: DocumentLock) => void,
  onEditorsChange?: (editors: EditorPresence[]) => void,
}): {
  activeEditors: EditorPresence[];
  isOnline: boolean;
  documentLock: DocumentLock | null;
  currentVersion: number;
  sessionId: string | null;
  updatePresence: (editingSection?: string) => Promise<void>;
  recordEdit: () => Promise<boolean>;
  hasConflict: boolean;
  isLoading: boolean;
  error: string | null;
}
```

### CollaborativeEditors Component

```typescript
function CollaborativeEditors({
  editors: EditorPresence[];
  currentUserId: string;
  isOnline: boolean;
  hasConflict?: boolean;
  className?: string;
}): JSX.Element
```

## Testing

Run collaborative editing tests:

```bash
npm run test:run -- collaborative-editing.test.ts
```

Test coverage includes:
- Conflict detection logic
- Schema validation
- Version management
- Presence tracking
- Edge cases and race conditions

## Support

For issues or questions:
1. Check this documentation
2. Review test files for examples
3. Check Firestore console for data
4. Contact development team
