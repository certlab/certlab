# Sign-In Delay Fix

## Problem
Users experienced a long delay (several seconds) after clicking "Sign in with Google" before being redirected to the dashboard. The UI showed "Signing in..." spinner for an extended period.

## Root Cause
In `client/src/lib/auth-provider.tsx`, the Firebase auth state change handler was blocking the UI by awaiting the `processDailyLogin()` function before setting `isLoading` to `false`. 

The `processDailyLogin()` function makes multiple Firestore calls:
1. Fetch user's game stats
2. Calculate consecutive login days
3. Update game stats with new login date
4. Check if daily reward was already claimed

These operations added significant latency to the authentication flow, causing the delay.

## Solution
Moved the `processDailyLogin()` call to run **after** the loading state is set to `false`, wrapped in an immediately-invoked async function (IIFE). This makes it non-blocking:

```typescript
// Set loading to false after Firebase sync completes
if (isSubstantiveChange || !authInitialized) {
  setIsLoading(false);
}

// Process daily login for gamification (non-blocking)
// This runs in the background after user is loaded and UI is unblocked
if (fbUser) {
  void (async () => {
    try {
      const { gamificationService } = await import('./gamification-service');
      const user = await storage.getUser(fbUser.uid);
      if (user) {
        await gamificationService.processDailyLogin(fbUser.uid, user.tenantId);
      }
    } catch (error) {
      console.error('Failed to process daily login:', error);
    }
  })();
}
```

## Benefits
1. **Faster sign-in**: Users are redirected to the dashboard immediately after authentication completes
2. **Non-blocking gamification**: Daily login processing happens in the background without blocking the UI
3. **No functionality loss**: Daily rewards and streak tracking still work correctly
4. **Better UX**: Users see their dashboard faster while gamification updates happen asynchronously

## Testing
- All existing tests pass (202 tests)
- Build succeeds without errors
- Daily login processing still functions correctly but doesn't block the UI

## Files Changed
- `client/src/lib/auth-provider.tsx`: Moved `processDailyLogin()` call to be non-blocking
