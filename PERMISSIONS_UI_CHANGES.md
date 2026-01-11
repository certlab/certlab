# Quiz & Material Collaboration Permissions - UI Changes

## Overview
This document describes the UI changes made to implement creator-based permissions for quizzes and lectures.

## My Quizzes Page (`/app/my-quizzes`)

### For Quiz Creators (Owner View)
When a user views their own quizzes, they see full edit and delete controls:

**Actions Column:**
```
[Edit Icon]  [Copy Icon]  [Delete Icon (red)]
```

- **Edit Button**: Opens the quiz builder to edit the quiz
- **Duplicate Button**: Creates a copy of the quiz
- **Delete Button**: Opens a confirmation dialog before deleting (red color to indicate destructive action)

### For Non-Creators (View Only)
When a user views quizzes created by others, they see a "View Only" message:

**Actions Column:**
```
┌─────────────────────────────┐
│ 🔒 View only                │
└─────────────────────────────┘
```

- The entire actions cell shows an Alert component with a lock icon
- No edit or delete buttons are visible
- The duplicate button could still be shown (to allow creating their own copy)

### Delete Confirmation Dialog
When the delete button is clicked:

**Dialog Content:**
```
Delete Quiz
─────────────────────────────────────────────
Are you sure you want to delete "Quiz Title"? 
This action cannot be undone.

⚠️  This quiz and all its questions will be 
   permanently deleted. This action cannot 
   be undone.

               [Cancel]  [Delete Quiz (red)]
```

## Lecture Page (`/app/lecture/:id`)

### For Lecture Creator (Owner View)
When viewing a lecture they created:

**Action Buttons at Bottom:**
```
[Print Study Guide]  [Edit Lecture]  [Delete Lecture (red)]  [Return to Dashboard]
```

- **Print Button**: Prints the lecture
- **Edit Button**: Opens editor (currently shows "coming soon" message)
- **Delete Button**: Opens confirmation dialog (red/destructive variant)
- **Return Button**: Goes back to dashboard

### For Non-Creators (View Only)
When viewing a lecture created by someone else:

**Permission Alert (shown above action buttons):**
```
┌────────────────────────────────────────────────────────────┐
│ 🔒 You can view this lecture but cannot edit or delete    │
│    it. Only the creator can modify this content.          │
└────────────────────────────────────────────────────────────┘
```

**Action Buttons at Bottom (limited):**
```
[Print Study Guide]  [Return to Dashboard]
```

- No edit or delete buttons visible
- Only view-related actions available

### Delete Confirmation Dialog
When the delete button is clicked:

**Dialog Content:**
```
Delete Lecture
─────────────────────────────────────────────
Are you sure you want to delete "Lecture Title"?
This action cannot be undone.

⚠️  This lecture will be permanently deleted.
   This action cannot be undone.

               [Cancel]  [Delete Lecture (red)]
```

## Permission Denied Toasts

When a user attempts an action they don't have permission for (e.g., by directly calling the function):

### Edit Denied
```
┌─────────────────────────────────────────────────────┐
│ ❌ Permission Denied                                │
│    You can view this quiz but cannot edit it.      │
│    Only the creator can make changes.              │
└─────────────────────────────────────────────────────┘
```

### Delete Denied
```
┌─────────────────────────────────────────────────────┐
│ ❌ Permission Denied                                │
│    You can view this lecture but cannot delete it. │
│    Only the creator can delete their own content.  │
└─────────────────────────────────────────────────────┘
```

## Color Scheme

- **Lock Icon**: Gray/muted color
- **View Only Alert**: Light gray background with gray text
- **Delete Button**: Red/destructive variant
- **Warning Alert**: Red/destructive background with alert icon
- **Success Toast**: Green background (on successful deletion)
- **Error Toast**: Red background (on permission denied or failure)

## Technical Implementation

### Permission Checks
All UI changes are controlled by the `canEdit()` and `canDelete()` functions from `@/lib/permissions`:

```typescript
import { canEdit, canDelete } from '@/lib/permissions';

// Check if user can edit
if (canEdit(resource, user)) {
  // Show edit button
}

// Check if user can delete  
if (canDelete(resource, user)) {
  // Show delete button
}
```

### Audit Logging
Every permission check is logged using `logPermissionCheck()`:

```typescript
logPermissionCheck('edit', 'quiz', resourceId, userId, granted);
```

Logs appear in browser console:
```
[CertLab Info] permissionCheck: {
  operation: 'permissionCheck',
  timestamp: '2026-01-11T16:00:43.641Z',
  context: {
    action: 'edit',
    resourceType: 'quiz',
    resourceId: '123',
    userId: 'user-123',
    granted: true
  }
}
```

## Accessibility

- **Lock Icon**: Has proper aria labels
- **Alert Components**: Use semantic alert roles
- **Buttons**: Have descriptive titles for screen readers
- **Color**: Not the only indicator (icons and text also used)
- **Dialogs**: Properly labeled with DialogTitle and DialogDescription
- **Destructive Actions**: Clearly indicated through multiple cues (color, text, confirmation)

## Responsive Design

All components use Tailwind CSS responsive utilities:
- Tables scroll horizontally on mobile
- Buttons stack vertically on smaller screens
- Alerts resize gracefully
- Dialogs are mobile-friendly

## Browser Compatibility

Tested and compatible with:
- Chrome/Edge (Chromium)
- Firefox
- Safari
- Mobile browsers

## Future Enhancements

Potential improvements:
1. **Lecture editing**: Implement actual lecture editor (currently shows "coming soon")
2. **Bulk actions**: Allow selecting multiple quizzes/lectures for bulk deletion
3. **Sharing**: Add sharing functionality to grant specific users edit access
4. **Version history**: Show who made changes and when
5. **Transfer ownership**: Allow creators to transfer ownership to another user
