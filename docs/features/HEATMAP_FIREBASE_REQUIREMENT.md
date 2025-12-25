# Activity Heatmap - Firebase Connectivity Requirement

## Overview

The Activity Heatmap feature in CertLab displays a user's learning activity over time in a visual calendar-style heatmap, similar to GitHub's contribution graph. This feature **requires full Firebase/Firestore connectivity** and does not fall back to local browser storage.

## Firebase Requirement

### Why Firebase is Required

The Activity Heatmap requires Firebase/Firestore for several important reasons:

1. **Cross-device Consistency**: User activity data must be synced across all devices to provide an accurate, unified view of learning progress.

2. **Real-time Updates**: Firebase ensures that activity data is immediately available and consistent across sessions.

3. **Data Integrity**: Using Firebase as the single source of truth prevents data divergence that could occur with local-only storage.

4. **Analytics Foundation**: The heatmap serves as the foundation for performance analytics and insights, which require centralized data storage.

### Local Storage Role

- **Purpose**: IndexedDB is used **only for caching and offline access**, not as a primary data source for the heatmap.
- **Cache-only**: Local storage provides temporary offline viewing capabilities through Firestore's built-in offline persistence.
- **Not a Fallback**: The heatmap will NOT automatically display data from IndexedDB if Firebase is disconnected.

## User Experience

### When Firebase is Available

When Firebase/Firestore is properly configured and connected:
- The heatmap displays normally with full activity history
- Data is fetched from Firestore
- Offline viewing is supported through Firestore's cache
- Activity updates are synchronized across devices

### When Firebase is Unavailable

When Firebase/Firestore is not available or not properly configured:
- The heatmap displays an error message
- Users are informed that Firebase connectivity is required
- Instructions are provided for enabling Firebase
- No data is fetched from IndexedDB as a fallback

Example error message:
```
⚠️ Firebase Not Connected

The activity heatmap requires full Firebase/Firestore connectivity to display your
learning progress across devices.

To enable this feature:
• Ensure Firebase is properly configured with valid credentials
• Sign in with your Firebase account to enable cloud sync
• Check your internet connection

Note: Local browser storage (IndexedDB) is used only for caching and offline
access, not as the primary data source for this feature.
```

## Implementation Details

### Component: ContributionHeatmap.tsx

Location: `client/src/components/ContributionHeatmap.tsx`

**Firebase Check**:
```typescript
import { isCloudSyncAvailable } from '@/lib/storage-factory';

export default function ContributionHeatmap() {
  // Check Firebase/Firestore connectivity - required for heatmap functionality
  const isFirebaseAvailable = isCloudSyncAvailable();
  
  // Only fetch if Firebase is available
  const { data: quizzes = [], isLoading } = useQuery<Quiz[]>({
    queryKey: queryKeys.user.quizzes(user?.id),
    enabled: !!user?.id && isFirebaseAvailable, // Firebase check here
  });
  
  if (!isFirebaseAvailable) {
    // Show error with Card and Alert components
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudOff className="h-5 w-5" />
            Activity Level
          </CardTitle>
          <CardDescription>Firebase connectivity required</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Firebase Not Connected</AlertTitle>
            <AlertDescription>
              {/* Error message content */}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  // Render heatmap...
}
```

### Storage Factory Configuration

Location: `client/src/lib/storage-factory.ts`

**Production vs Development**:
- **Production**: Firebase/Firestore is MANDATORY. Application throws errors if not configured.
- **Development**: Can fall back to IndexedDB for local development, but heatmap still requires Firebase.

**Connectivity Check**:
```typescript
export function isCloudSyncAvailable(): boolean {
  return firestoreAvailable && isFirestoreInitialized();
}
```

## Configuration

### Required Environment Variables

For the heatmap to function, the following Firebase environment variables must be set:

```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket  # Optional
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id  # Optional
VITE_FIREBASE_APP_ID=your_app_id                  # Optional
```

### Verifying Configuration

To verify Firebase is properly configured:

1. **Check Console**: Look for Firebase initialization messages in browser console
2. **Test Login**: Attempt to sign in with Google authentication
3. **Check Cloud Sync Status**: Navigate to Profile > Security tab to see cloud sync status
4. **View Heatmap**: Navigate to Profile page - if Firebase is unavailable, you'll see the error message

## Troubleshooting

### Heatmap Shows "Firebase Not Connected" Error

**Possible Causes**:
1. Firebase environment variables are not set or incorrect
2. Firebase project is not properly configured
3. Network connectivity issues
4. Firebase Authentication is not enabled in Firebase Console
5. Firestore is not enabled in Firebase Console

**Solutions**:
1. Verify all required environment variables are set in `.env` file
2. Check Firebase Console to ensure project is properly configured
3. Verify internet connection
4. Enable Google Authentication in Firebase Console (Authentication > Sign-in method)
5. Enable Firestore in Firebase Console (Firestore Database)
6. Check browser console for specific Firebase error messages

### Heatmap Shows No Data

**Possible Causes**:
1. User has not completed any quizzes yet
2. User is not signed in with Firebase account
3. Firestore rules are blocking access

**Solutions**:
1. Complete at least one quiz to see activity
2. Sign in with Google or create a Firebase account
3. Verify Firestore security rules allow user to read their own data

## Development Workflow

### Local Development Without Firebase

For local development without Firebase credentials:
- The main app will fall back to IndexedDB (development mode only)
- The heatmap will display the Firebase error message
- To test the heatmap, you must configure Firebase credentials

### Testing Heatmap Functionality

1. **Set up Firebase credentials** in `.env` file
2. **Run development server**: `npm run dev`
3. **Sign in** with Google authentication
4. **Complete quizzes** to generate activity data
5. **Navigate to Profile** to view the heatmap
6. **Test offline mode**: Disconnect internet after initial load (Firestore cache should work)

## Related Components

- **Profile Page** (`client/src/pages/profile.tsx`): Displays the heatmap
- **Storage Factory** (`client/src/lib/storage-factory.ts`): Manages Firebase/IndexedDB routing
- **Auth Provider** (`client/src/lib/auth-provider.tsx`): Provides Firebase authentication state
- **Query Client** (`client/src/lib/queryClient.ts`): Handles data fetching with React Query

## Future Enhancements

Potential improvements to consider:

1. **Enhanced Offline Support**: Better communicate when viewing cached data vs live data
2. **Data Export**: Allow users to export their activity data for backup
3. **Detailed Analytics**: Expand on heatmap data to provide more insights
4. **Time Zone Support**: Ensure activity is recorded in user's local time zone
5. **Customization**: Allow users to customize heatmap appearance (color schemes, etc.)

## References

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Offline Persistence](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
