# Notification System Implementation Guide

## Overview

The notification system provides in-app notifications for key user events including quiz/course assignments, completion feedback, quiz results, and reminders. The system supports notification preferences and dismissal actions.

## Architecture

### Data Storage

Notifications are stored in Firestore:
- **Notifications**: `/users/{userId}/notifications/{notificationId}`
- **Preferences**: `/users/{userId}/notificationPreferences/preferences`

### Components

1. **Data Models** (`shared/schema.ts`)
   - `Notification` - Individual notification
   - `NotificationPreferences` - User preferences
   - `NotificationType` - Enum of notification types

2. **Storage Layer** (`client/src/lib/firestore-storage.ts`)
   - `getUserNotifications()` - Fetch notifications with filtering
   - `createNotification()` - Create new notification
   - `markNotificationAsRead()` - Mark as read
   - `markAllNotificationsAsRead()` - Bulk mark as read
   - `dismissNotification()` - Dismiss notification
   - `getNotificationPreferences()` - Get user preferences
   - `updateNotificationPreferences()` - Update preferences

3. **Business Logic** (`client/src/lib/notification-service.ts`)
   - `NotificationService` - Handles notification creation with preference checking
   - Methods for each notification type:
     - `notifyAssignment()` - New quiz/course assignment
     - `notifyCompletion()` - Quiz/course completion
     - `notifyResults()` - Quiz results available
     - `notifyReminder()` - Reminders and alerts
     - `notifyAchievement()` - Achievement unlocked

4. **UI Components**
   - `NotificationItem` (`client/src/components/NotificationItem.tsx`) - Display individual notification
   - `RightSidebar` (`client/src/components/RightSidebar.tsx`) - Notification panel
   - `Header` (`client/src/components/Header.tsx`) - Badge counter (existing)

5. **Hooks**
   - `useUnreadNotifications()` (`client/src/hooks/use-unread-notifications.ts`)
     - Polls every 5 seconds for new notifications
     - Returns unread counts and notification data

## Notification Types

### 1. Assignment
User is assigned a quiz or course.

```typescript
await notificationService.notifyAssignment(userId, tenantId, {
  quizId: 123,
  assignedBy: 'instructor@example.com',
  dueDate: new Date('2026-01-20'),
});
```

### 2. Completion
User completes a quiz or course.

```typescript
await notificationService.notifyCompletion(userId, tenantId, {
  quizId: 123,
  score: 85,
  passed: true,
});
```

### 3. Results
Quiz grading complete with score/feedback.

```typescript
await notificationService.notifyResults(userId, tenantId, {
  quizId: 123,
  score: 92,
  passed: true,
  totalQuestions: 50,
  correctAnswers: 46,
});
```

### 4. Reminder
Upcoming deadline, streak alert, or daily reward.

```typescript
await notificationService.notifyReminder(userId, tenantId, {
  reminderType: 'streak',
  message: 'Your 7-day streak is about to end! Complete a quiz today.',
  actionUrl: '/app/dashboard',
  actionLabel: 'Take Quiz',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
});
```

### 5. Achievement
Badge or milestone unlocked.

```typescript
await notificationService.notifyAchievement(userId, tenantId, {
  badgeId: 5,
  badgeName: 'Quiz Master',
  badgeDescription: 'Completed 50 quizzes with 90%+ score',
  points: 100,
});
```

## Usage Examples

### Creating Notifications

```typescript
import { notificationService } from '@/lib/notification-service';

// In your quiz submission handler
async function handleQuizSubmission(userId: string, quizId: number, score: number) {
  // ... submit quiz logic ...
  
  const passed = score >= 70;
  
  // Create notification
  await notificationService.notifyResults(userId, 1, {
    quizId,
    score,
    passed,
    totalQuestions: 50,
    correctAnswers: Math.round((score / 100) * 50),
  });
}
```

### Checking Notifications in UI

```typescript
import { useUnreadNotifications } from '@/hooks/use-unread-notifications';

function MyComponent() {
  const { unreadCount, notifications, isLoading } = useUnreadNotifications();
  
  return (
    <div>
      <p>You have {unreadCount} unread notifications</p>
      {notifications.map(notif => (
        <div key={notif.id}>{notif.title}</div>
      ))}
    </div>
  );
}
```

### Managing Preferences

```typescript
import { storage } from '@/lib/storage-factory';

// Get preferences
const prefs = await storage.getNotificationPreferences(userId);

// Update preferences
await storage.updateNotificationPreferences(userId, {
  completions: false,  // Disable completion notifications
  reminders: true,     // Enable reminders
});
```

## User Interface

### Notification Bell
- Located in the Header component
- Shows badge with unread count
- Red ring indicator when unread notifications exist

### Notification Panel (Right Sidebar)
- Click bell icon to open
- Shows both general notifications and achievement badges
- Visual distinction between read/unread (ring indicator)
- Click notification to navigate to related page
- Dismiss button (X) on each notification
- "Mark all read" button at top

### Notification Item Display
- Icon based on notification type
- Title and message
- Timestamp ("2 minutes ago")
- Action label badge
- Color-coded by type

## Notification Preferences

Users can control which notifications they receive:
- `assignments` - New assignment notifications
- `completions` - Completion notifications
- `results` - Results available notifications
- `reminders` - Reminder notifications
- `achievements` - Achievement notifications
- `emailEnabled` - Email notifications (disabled by default)
- `smsEnabled` - SMS notifications (disabled by default)

**Note**: Email and SMS delivery are not implemented. These flags are for future integration.

## Integration Points

To integrate notifications into your feature:

1. **Quiz Submission** - Add to quiz result handling
   ```typescript
   // In client/src/pages/quiz.tsx or results handler
   await notificationService.notifyResults(userId, tenantId, { /* ... */ });
   ```

2. **Course Assignment** - Add to assignment creation
   ```typescript
   // When instructor assigns quiz
   await notificationService.notifyAssignment(userId, tenantId, { /* ... */ });
   ```

3. **Reminder System** - Add to scheduled jobs or timers
   ```typescript
   // In streak tracking or deadline checking
   await notificationService.notifyReminder(userId, tenantId, { /* ... */ });
   ```

4. **Achievement System** - Already integrated (RightSidebar shows achievement badges)

## Real-time Updates

Notifications are polled every 5 seconds via the `useUnreadNotifications` hook. This provides:
- Near real-time notification delivery
- Reasonable server load
- Good battery/performance balance

For true real-time updates, consider:
- Firestore real-time listeners (requires changing the hook implementation)
- WebSocket connections
- Server-sent events

## Firestore Security Rules

Add these rules to your `firestore.rules`:

```javascript
// User notifications
match /users/{userId}/notifications/{notificationId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow write: if request.auth != null && 
    (request.auth.uid == userId || 
     request.auth.token.role == 'admin' ||
     request.auth.token.role == 'instructor');
}

// Notification preferences
match /users/{userId}/notificationPreferences/preferences {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow write: if request.auth != null && request.auth.uid == userId;
}
```

## Testing

### Manual Testing

1. **Create Test Notification**:
   ```typescript
   import { notificationService } from '@/lib/notification-service';
   
   await notificationService.notifyResults(currentUser.id, 1, {
     quizId: 1,
     score: 85,
     passed: true,
     totalQuestions: 20,
     correctAnswers: 17,
   });
   ```

2. **Check Notification Panel**: Click bell icon in header

3. **Test Preferences**: 
   - Update preferences to disable a type
   - Try creating that notification type
   - Verify it doesn't appear

### Automated Testing

Example test structure (to be implemented):

```typescript
import { describe, it, expect } from 'vitest';
import { notificationService } from '@/lib/notification-service';

describe('NotificationService', () => {
  it('should create result notification', async () => {
    const notification = await notificationService.notifyResults(
      'user123', 1, { quizId: 1, score: 90, passed: true }
    );
    expect(notification).toBeDefined();
    expect(notification.type).toBe('results');
  });
  
  it('should respect user preferences', async () => {
    // Set preferences to disable results
    await storage.updateNotificationPreferences('user123', { results: false });
    
    // Try to create results notification
    const notification = await notificationService.notifyResults(
      'user123', 1, { quizId: 1, score: 90, passed: true }
    );
    
    // Should return null (skipped)
    expect(notification).toBeNull();
  });
});
```

## Future Enhancements

### Short-term
1. Add notification preferences UI to settings/profile page
2. Implement notification expiration cleanup job
3. Add notification grouping (e.g., "3 new assignments")
4. Add "clear all" button

### Long-term
1. Email notification delivery
2. SMS notification delivery
3. Push notifications (web push API)
4. Notification templates/personalization
5. Notification history page with filtering
6. Batch notification creation
7. Notification scheduling

## Troubleshooting

### Notifications not appearing
1. Check Firebase connection
2. Verify user is authenticated
3. Check Firestore security rules
4. Look for console errors
5. Verify notification preferences

### Polling performance issues
- Reduce `refetchInterval` in `useUnreadNotifications` (default: 5000ms)
- Implement real-time listeners instead of polling
- Add rate limiting

### Type errors
- Run `npm run check` to identify TypeScript issues
- Ensure all imports are from `@shared/schema` for types

## Additional Resources

- [Firebase Firestore Documentation](https://firebase.google.com/docs/firestore)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [React Router Documentation](https://reactrouter.com)

## Support

For questions or issues:
1. Check this documentation first
2. Review the issue tracker on GitHub
3. Check the codebase comments in:
   - `client/src/lib/notification-service.ts`
   - `client/src/lib/firestore-storage.ts`
   - `shared/schema.ts`
