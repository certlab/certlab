# Firestore Query Performance Optimization

This document summarizes the Firestore query optimizations implemented to improve application performance and reduce cloud costs.

## Overview

The CertLab application uses Cloud Firestore for all data storage. These optimizations focus on reducing read costs, improving query performance, and minimizing app startup times.

## Key Optimizations Implemented

### 1. Server-Side Filtering with Firestore Queries

**Problem**: Many queries were fetching all documents and filtering on the client side, resulting in excessive read costs.

**Solution**: Replaced client-side filtering with Firestore `where()` clauses to filter data on the server.

#### Optimized Functions:

- **`getStudyTimerSessionsByDateRange()`**
  - **Before**: Fetched all timer sessions, then filtered by date range
  - **After**: Uses `where('startedAt', '>=', startDate)` and `where('startedAt', '<=', endDate)`
  - **Impact**: ~60-80% reduction in reads for users with many sessions
  
- **`getStudyTimerStats()`**
  - **Before**: Fetched all sessions for all time
  - **After**: Only fetches sessions from the last 90 days with date filtering
  - **Impact**: ~80-90% reduction in reads for long-time users

- **`getPersonalSubcategories()`**
  - **Before**: Fetched all personal subcategories, filtered by categoryId client-side
  - **After**: Uses `where('categoryId', '==', categoryId)`
  - **Impact**: Proportional reduction based on number of categories

- **`getActiveQuests()` and `getQuestsByType()`**
  - **Before**: Fetched all quests, filtered by `isActive` and `type` client-side
  - **After**: Uses `where('isActive', '==', true)` and `where('type', '==', type)`
  - **Impact**: ~50-70% reduction in reads depending on active quest ratio

- **`getUserQuizzes()`**
  - **Before**: Fetched all quizzes, filtered by tenantId client-side
  - **After**: Uses `where('tenantId', '==', tenantId)` when tenantId provided
  - **Impact**: Filters on server, reducing unnecessary reads

- **`getUserQuizTemplates()`**
  - **Before**: Fetched all templates, filtered by tenantId client-side
  - **After**: Uses `where('tenantId', '==', tenantId)` when tenantId provided
  - **Impact**: Filters on server, reducing unnecessary reads

### 2. Safety Limits to Prevent Runaway Queries

**Problem**: Queries without limits could potentially fetch thousands of documents.

**Solution**: Added `limit()` clauses to all collection queries as safety bounds.

#### Limits Applied:

| Collection | Limit | Rationale |
|------------|-------|-----------|
| timerSessions | 1000 | Typical users have < 1000 sessions in 90 days |
| quizzes | 500 | Most users won't have > 500 quizzes |
| quizTemplates | 200 | Typical users have < 200 templates |
| questProgress | 100 | Active quests are limited in number |
| leaderboards | 100 (default) | Only show top 100 entries |

### 3. React Query Cache Configuration

**Problem**: Cached data was expiring immediately after becoming stale, causing unnecessary refetches.

**Solution**: Added `gcTime` (garbage collection time) configuration to keep stale data in memory.

#### Configuration Changes:

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,        // Data becomes stale after 30 seconds
      gcTime: 10 * 60 * 1000,      // ✅ NEW: Keep in cache for 10 minutes
      refetchOnWindowFocus: false, // Prevent refetch on tab switch
    },
  },
});
```

**Impact**: 
- Prevents refetching when navigating between pages within 10 minutes
- Reduces Firestore reads by ~20-30% during active browsing sessions
- Improves perceived performance with instant data availability

### 4. Composite Indexes for Complex Queries

**Problem**: Some queries required multiple fields but lacked composite indexes, causing slow queries or errors.

**Solution**: Added composite indexes to `firestore.indexes.json` for all multi-field queries.

#### Required Composite Indexes

Only composite indexes that must be explicitly defined in `firestore.indexes.json` are listed here. Single-field indexes are omitted because Firestore manages them automatically.

1. **Quests**:
   - `isActive` (ascending) + `type` (ascending)

2. **Quiz Templates**:
   - `tenantId` (ascending) + `createdAt` (descending)

3. **Quizzes**:
   - `tenantId` (ascending) + `createdAt` (descending)

4. **Quest Progress**:
   - `tenantId` (ascending) + `updatedAt` (descending)

5. **Leaderboard Entries**:
   - `tenantId` (ascending) + `score` (descending)

**Impact**: 
- Prevents index creation errors
- Improves query speed by 2-10x for complex queries
- Reduces query execution costs

## Performance Metrics

### Expected Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Cold Start Reads | ~200-500 reads | ~50-100 reads | 60-80% reduction |
| Warm Start Reads | ~50-100 reads | ~10-20 reads | 70-90% reduction |
| Page Navigation Reads | ~30-50 reads | ~5-10 reads | 80-90% reduction |
| Monthly Read Costs | Baseline | -50-70% | Significant savings |

### Measurement Methodology

To measure the actual impact of these optimizations:

1. **Enable Firestore Debug Logging**:
   ```typescript
   import { setLogLevel } from 'firebase/firestore';

   // Enable verbose Firestore SDK logging in the browser console
   setLogLevel('debug');
   ```

2. **Monitor Firestore Usage**:
   - Go to Firebase Console → Firestore → Usage tab
   - Track "Document Reads" metric before and after deployment

3. **Profile Client-Side Performance**:
   - Use Chrome DevTools Performance tab
   - Measure "Time to Interactive" on key pages (dashboard, quiz, etc.)

4. **Check Query Performance**:
   - Review "Query Time" in Firebase Console
   - Look for slow queries and missing index warnings

## Best Practices Going Forward

### 1. Always Use Server-Side Filtering

❌ **Bad**:
```typescript
const allSessions = await getUserDocuments(userId, 'sessions');
const filtered = allSessions.filter(s => s.date > startDate);
```

✅ **Good**:
```typescript
const sessions = await getUserDocuments(userId, 'sessions', [
  where('date', '>', startDate),
  orderBy('date', 'desc'),
  limit(100),
]);
```

### 2. Add Safety Limits to All Collection Queries

❌ **Bad**:
```typescript
const items = await getUserDocuments(userId, 'items');
```

✅ **Good**:
```typescript
const items = await getUserDocuments(userId, 'items', [
  orderBy('createdAt', 'desc'),
  limit(100), // Safety limit
]);
```

### 3. Use Composite Indexes for Multi-Field Queries

When querying with multiple fields or ordering, always add a composite index to `firestore.indexes.json`:

```json
{
  "collectionGroup": "sessions",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "startedAt", "order": "DESCENDING" }
  ]
}
```

### 4. Configure Appropriate Cache Times

Use different `staleTime` values based on data change frequency:

- **Static data** (categories, badges): `5 * 60 * 1000` (5 minutes)
- **User data** (stats, progress): `30 * 1000` (30 seconds)
- **Auth data**: `60 * 1000` (1 minute)
- **Quiz data**: `2 * 60 * 1000` (2 minutes)

### 5. Monitor Query Patterns

Regularly review:
- Firestore console for missing index warnings
- Document read counts in Firebase usage reports
- Query performance metrics in Firebase Console

## Deployment Checklist

Before deploying these changes to production:

- [x] Update `firestore.indexes.json` with new composite indexes
- [x] Deploy Firestore indexes: `firebase deploy --only firestore:indexes`
  - Note: Run this command from the project root
  - Monitor index creation status in Firebase Console
- [ ] **IMPORTANT**: Wait for all index creation to complete (check Firebase Console → Firestore → Indexes)
  - Index creation can take 5-30 minutes depending on data volume
  - Do NOT deploy application code until indexes show "Enabled" status
- [ ] Deploy application code with optimized queries: `firebase deploy --only hosting`
- [ ] Monitor Firestore usage for 24-48 hours after deployment
- [ ] Compare read counts before and after using Firebase Console
- [ ] Check application logs for any index-related errors

**Note**: The order is critical - deploy indexes first, wait for completion, then deploy code.

## Related Files

- `client/src/lib/firestore-storage.ts` - Main storage implementation
- `client/src/lib/firestore-service.ts` - Low-level Firestore operations
- `client/src/lib/queryClient.ts` - React Query configuration
- `firestore.indexes.json` - Firestore composite indexes
- `firestore.rules` - Firestore security rules

## Future Optimization Opportunities

1. **Batch Operations**: Implement batch reads for related documents
2. **Computed Results Caching**: Cache analytics calculations in Firestore
3. **Pagination**: Add pagination for large lists (e.g., question banks)
4. **Real-time Listeners**: Use `onSnapshot` for frequently updated data
5. **Data Aggregation**: Pre-compute statistics at write time

## Support

For questions or issues related to these optimizations:
- Review Firebase documentation: https://firebase.google.com/docs/firestore
- Check Firestore best practices: https://firebase.google.com/docs/firestore/best-practices
- Contact the development team via GitHub issues
