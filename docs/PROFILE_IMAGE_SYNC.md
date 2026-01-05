# Profile Image Synchronization

## Overview

CertLab automatically synchronizes user profile images from Google Authentication to ensure that when users update their Google profile photo, the change is immediately reflected in the application.

## Problem

Prior to this implementation, the profile image URL (`profileImageUrl`) was only set during initial user account creation in Firestore. When users updated their Google profile picture after signing up, the app continued to display the old image because:

1. The `photoURL` from Firebase Authentication was only read during user creation
2. Subsequent sign-ins did not check for changes to the `photoURL`
3. The Firestore user profile was never updated with the new image URL

## Solution

The authentication provider (`client/src/lib/auth-provider.tsx`) now automatically syncs the profile image on every authentication state change.

### Implementation Details

When a user signs in with Google:

1. **Firebase Authentication** provides the latest user data, including the current `photoURL`
2. **Check Firestore**: The app retrieves the user's profile from Firestore
3. **Compare URLs**: If the user exists, the app compares the Firebase `photoURL` with the stored `profileImageUrl`
4. **Update if Changed**: If they differ, the Firestore user profile is updated with the new image URL
5. **Reload User**: The user object is reloaded to ensure the UI reflects the updated profile image
6. **Update Cache**: The session cache is updated with the new user data

### Code Location

The synchronization logic is implemented in the `loadUser` callback function in:
```
client/src/lib/auth-provider.tsx
```

Specifically:
```typescript
if (firebaseUser.photoURL !== firestoreUser.profileImageUrl) {
  await storage.updateUser(firebaseUser.uid, {
    profileImageUrl: firebaseUser.photoURL,
  });
  // Reload user to get updated profile image URL
  firestoreUser = await storage.getUser(firebaseUser.uid);
}
```

## Benefits

- **Automatic Sync**: Users don't need to manually update their profile image in the app
- **Always Current**: Profile images are always synchronized with the user's Google account
- **No User Action Required**: The sync happens transparently on every sign-in
- **Consistent Experience**: All devices show the same, up-to-date profile image

## Testing

To test this feature:

1. Sign in with a Google account
2. Note the current profile image displayed in the app
3. Change your Google profile picture at https://myaccount.google.com/
4. Sign out of the app
5. Sign back in
6. Verify that the new profile image is now displayed in the app

## Technical Notes

- The sync only occurs during authentication state changes (sign-in)
- The sync is efficient - it only updates Firestore if the URLs differ
- The implementation uses the existing `storage.updateUser` and `storage.getUser` methods
- Profile images are displayed in the header, user dropdown menu, and profile page
- The sync respects Firestore security rules and user data isolation

## Related Files

- `client/src/lib/auth-provider.tsx` - Authentication provider with sync logic
- `client/src/lib/firestore-storage.ts` - Firestore storage implementation
- `client/src/components/Header.tsx` - Displays user profile image in header
- `client/src/components/UserDropdownMenu.tsx` - Shows profile image in dropdown
- `client/src/pages/profile.tsx` - Profile page with user information
- `shared/schema.ts` - User schema including `profileImageUrl` field

## Future Enhancements

Potential improvements for consideration:

1. **Real-time Sync**: Use Firebase Cloud Functions to detect profile changes without requiring sign-in
2. **Image Caching**: Implement browser caching strategies for profile images
3. **Fallback Images**: Provide default avatars when profile images fail to load
4. **Image Optimization**: Automatically resize/optimize profile images for different display contexts
