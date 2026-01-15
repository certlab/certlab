# Manual Testing Guide for Cache Refactoring

This document outlines manual testing steps to verify the cache handling refactoring changes.

## Changes Made

The following cache configuration overrides were removed:

### 1. Wallet Page (`client/src/pages/wallet.tsx`)
**Removed:**
- `staleTime: 0` 
- `refetchOnMount: true`
- `gcTime: 5 * 60 * 1000`

**Verification Test:**
1. Navigate to `/app/wallet`
2. Note the current token balance
3. Click "Purchase" on any token package
4. Verify:
   - Toast notification appears: "Tokens Added!"
   - Token balance updates immediately to reflect the purchase
   - Balance persists when navigating away and returning to the page

**Expected Behavior:**
- The mutation's `invalidateQueries` call triggers an automatic refetch
- Balance updates immediately after purchase
- Default staleTime (30s) prevents unnecessary refetches

### 2. Credits Page (`client/src/pages/credits.tsx`)
**Removed:**
- `staleTime: 5 * 60 * 1000` from products query
- `staleTime: 10 * 1000` from balance query

**Verification Test:**
1. Navigate to `/app/credits`
2. Verify credit products load correctly
3. Note the current credit balance
4. Complete a purchase (or simulate one)
5. Verify:
   - Balance updates after purchase
   - Products display correctly on page load
   - No excessive refetching occurs

**Expected Behavior:**
- Default staleTime (30s) provides good balance of freshness and performance
- `invalidateQueries` on line 121 triggers balance refetch after purchase
- Products cache appropriately without manual override

### 3. Results Page (`client/src/pages/results.tsx`)
**Removed:**
- `refetchOnMount: true`
- `refetchOnWindowFocus: true`

**Verification Test:**
1. Complete a quiz
2. View results at `/app/results/:id`
3. Navigate away and return to the results page
4. Switch browser tabs and return
5. Verify:
   - Results load correctly on initial view
   - Results remain stable when revisiting (no unnecessary refetch)
   - No flickering or loading states when returning to tab

**Expected Behavior:**
- Default config disables `refetchOnMount` and `refetchOnWindowFocus`
- Quiz results are stable (IndexedDB data doesn't change externally)
- No unnecessary refetches for read-only historical data

## General Validation

### Performance
- Page load times should be similar or improved
- No noticeable delays in data loading
- Smooth transitions between pages

### Cache Behavior
- Data updates immediately after mutations
- No stale data displayed to users
- Appropriate caching prevents excessive IndexedDB reads

### Error Scenarios
- Network disconnection (should have no effect - all data is local)
- Rapid navigation between pages (should not cause errors)
- Multiple mutations in sequence (should update correctly)

## Technical Verification

### Default Configuration (in `client/src/lib/queryClient.ts`)
```typescript
{
  staleTime: staleTime.user,        // 30 seconds (explicitly set)
  refetchOnWindowFocus: false,       // Explicitly disabled
  refetchOnMount: (not set),         // Uses React Query default of true (refetches stale queries on mount)
  retry: false,                      // Explicitly disabled
}
```

### Cache Invalidation Patterns
All mutations properly call `invalidateQueries`:

1. **Wallet**: `queryClient.invalidateQueries({ queryKey: queryKeys.user.tokenBalance(currentUser?.id) })`
2. **Credits**: `queryClient.invalidateQueries({ queryKey: queryKeys.credits.balance() })`
3. **Quiz Completion**: Various invalidations in quiz flow

## Success Criteria

✅ All pages load correctly
✅ Token purchases update balance immediately
✅ Credit purchases update balance immediately  
✅ Quiz results display correctly and remain stable
✅ No console errors related to queries
✅ No excessive refetching observed in network tab
✅ Smooth user experience without flickering

## Notes

- This is a client-only app using IndexedDB - no server requests
- All data is local, so `refetchOnWindowFocus` and aggressive `staleTime: 0` are not beneficial
- The default `staleTime` of 30 seconds is appropriate for user data that changes during active usage
- Proper use of `invalidateQueries` ensures data stays fresh after mutations
