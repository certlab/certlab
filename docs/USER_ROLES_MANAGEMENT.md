# User Roles Management Feature

## Overview

The User Roles Management page is an admin-only feature that allows administrators to view and manage user roles across the CertLab platform. This feature provides a centralized interface for role-based access control (RBAC) management.

## Access

- **Route**: `/app/user-roles`
- **Access Level**: Admin only
- **Authentication**: Requires authenticated admin user

## Features

### 1. User Overview Statistics

The page displays three key statistics cards:

- **Total Users**: Shows the total number of registered users in the system
- **Administrators**: Count of users with admin privileges
- **Regular Users**: Count of standard user accounts

### 2. User List Table

A comprehensive table displaying all users with the following columns:

- **User**: Full name and user ID
- **Email**: User's email address
- **Role**: Current role with visual badge (Admin/User)
- **Tenant ID**: Associated tenant identifier
- **Actions**: Edit role button for each user

### 3. Search and Filter

- **Search Bar**: Search users by name, email, or user ID
- **Role Filter**: Filter users by role (All Roles, Admin, User)
- Real-time filtering with instant results

### 4. Role Editing

A dialog-based interface for changing user roles:

- Select between "User" and "Administrator" roles
- Role descriptions to help understand permissions
- Warning message when changing roles
- Confirmation required to prevent accidental changes
- Real-time updates with loading states

### 5. User Feedback

- Toast notifications for successful role updates
- Error messages with descriptive text for failures
- Loading states during operations

## Technical Implementation

### Backend Integration

The feature integrates with Firebase/Firestore through the existing storage layer:

- **Query**: `storage.getAllUsers()` - Fetches all users from Firestore
- **Mutation**: `storage.updateUser(userId, { role })` - Updates user role
- **Caching**: Uses TanStack Query for efficient data caching and real-time updates

### Query Keys

```typescript
queryKeys.admin.users.all() // ['/api', 'admin', 'users']
```

### Storage Schema

Users are stored in Firestore with the following role field:

```typescript
interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'user' | 'admin'; // Role field
  tenantId: number;
  // ... other fields
}
```

### Components Used

- `@/components/ui/card` - Card containers
- `@/components/ui/button` - Action buttons
- `@/components/ui/badge` - Role badges
- `@/components/ui/dialog` - Edit role modal
- `@/components/ui/table` - User list table
- `@/components/ui/select` - Role filter and selection
- `@/components/ui/input` - Search input
- `lucide-react` icons - UI icons

## Security Considerations

1. **Route Protection**: Page is only accessible to admin users via route guard
2. **Backend Validation**: Firebase security rules enforce role update permissions
3. **Optimistic Updates**: UI updates optimistically, then reverts on error
4. **Audit Trail**: Role changes should be logged (future enhancement)

## User Roles

### User (Standard)
- Limited privileges
- Can access standard features like quizzes, study materials, achievements
- Cannot access admin features

### Administrator
- Full access to all features
- Can manage users, roles, tenants, categories, and questions
- Can access reporting and analytics dashboards
- Can access data import and configuration features

## Future Enhancements

Potential improvements for this feature:

1. **Bulk Role Updates**: Select multiple users and update roles at once
2. **Role History**: Track role changes over time with timestamps
3. **Custom Roles**: Support for more granular role definitions
4. **Permission Matrix**: Detailed view of what each role can access
5. **Email Notifications**: Notify users when their role changes
6. **Role Templates**: Pre-defined role configurations
7. **Tenant-specific Roles**: Different role hierarchies per tenant

## Testing

The feature includes unit tests that verify:

- Page renders correctly
- Stats cards display properly
- Component structure is maintained

Run tests with:
```bash
npm run test:run client/src/pages/user-roles.test.tsx
```

## Screenshots

### Main View
- User list with search and filters
- Statistics cards showing user counts
- Role badges for visual identification

### Edit Role Dialog
- Clean modal interface
- Role selection dropdown
- Warning for role changes
- Clear action buttons

## Related Files

- `client/src/pages/user-roles.tsx` - Main page component
- `client/src/pages/user-roles.test.tsx` - Unit tests
- `client/src/lib/queryClient.ts` - Query key definitions
- `client/src/lib/firestore-storage.ts` - Storage implementation
- `client/src/App.tsx` - Route configuration
- `shared/schema.ts` - User type definition

## Usage Example

As an administrator:

1. Navigate to `/app/user-roles` from the admin menu
2. View all users in the table
3. Use search to find specific users by name or email
4. Filter by role to see only admins or regular users
5. Click "Edit Role" on any user
6. Select new role from dropdown
7. Review the warning message
8. Click "Update Role" to confirm
9. Toast notification confirms the change

## API Endpoints (Firestore)

The feature uses the following Firestore operations:

```typescript
// Get all users
GET /users (collection)

// Update user role
UPDATE /users/{userId}
  { role: 'admin' | 'user' }
```

## Performance Considerations

- Users are cached using TanStack Query's default stale time
- Search and filter operations happen client-side for instant results
- Optimistic updates provide immediate UI feedback
- Automatic cache invalidation after successful mutations

## Accessibility

- Keyboard navigation supported
- Screen reader friendly with proper ARIA labels
- Focus management in dialog
- Clear visual feedback for all states

## Browser Support

Supports all modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)
