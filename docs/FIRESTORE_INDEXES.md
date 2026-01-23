# Firestore Indexes Explained

This document explains the Firestore composite indexes defined in `firestore.indexes.json`.

## Why Composite Indexes?

Firestore automatically creates single-field indexes, but queries with multiple constraints (multiple `where()` clauses, `where()` + `orderBy()`, etc.) require composite indexes.

## Index Categories

### User Collections

#### Quizzes
- **userId + createdAt**: Lists user's quizzes sorted by creation date
- **tenantId + createdAt**: Lists quizzes by tenant sorted by creation date
- **userId + categoryId + createdAt**: Filters quizzes by category for a user
- **userId + difficultyLevel + createdAt**: Filters quizzes by difficulty for a user
- **userId + tags + createdAt**: Filters quizzes by tags for a user (array-contains)
- **author + createdAt**: Lists quizzes by author

#### Quiz Templates
- **tenantId + createdAt DESC**: Lists templates by tenant sorted by creation date

#### Lectures
- **userId + createdAt**: Lists user's lectures sorted by creation date
- **userId + difficultyLevel + createdAt**: Filters lectures by difficulty for a user
- **userId + tags + createdAt**: Filters lectures by tags for a user
- **author + createdAt**: Lists lectures by author

#### User Progress
- **userId + categoryId**: Gets user's progress for a specific category

#### Quest Progress
- **tenantId + updatedAt DESC**: Lists quest progress for a tenant ordered by most recently updated (used for tenant dashboards and admin views)

#### Timer Sessions

Common queries using `startedAt` (single-field index managed automatically by Firestore):
- Range queries for date filtering, e.g. `where('startedAt', '>=', date)` (ascending time)
- Sorted lists using `orderBy('startedAt', 'desc')` for recent sessions first (for displaying in UI)

Note: These queries rely on Firestore's built-in single-field index on `startedAt`, which is created automatically and does **not** need to be defined in `firestore.indexes.json`. Both ascending and descending orderings are supported by this single-field index; no separate composite ASC/DESC index is required for `startedAt` alone.

#### Personal Subcategories

Common queries using `categoryId` (single-field index managed automatically by Firestore):
- Filters subcategories by parent category

Note: Single-field indexes like `categoryId` are automatically created by Firestore and don't need to be defined in `firestore.indexes.json`.

### Shared Collections

#### Questions
- **categoryId + difficulty**: Finds questions by category and difficulty
- **subcategoryId + difficulty**: Finds questions by subcategory and difficulty

#### Quests
- **isActive**: Filters active quests only
- **isActive + type**: Filters active quests by type (daily/weekly/monthly)

#### Leaderboard Entries
- **tenantId + score DESC**: Tenant-specific leaderboards sorted by score

### Other Collections

#### Badges
- **userId + earnedAt DESC**: User's earned badges sorted by earn date

#### Challenges
- **userId + completedAt DESC**: User's completed challenges sorted by completion date

#### Practice Tests
- **userId + createdAt DESC**: User's practice test attempts sorted by date

#### Study Notes
- **userId + updatedAt DESC**: User's study notes sorted by last update

## Index Maintenance

### Adding New Indexes

When adding a new composite query:

1. Identify the query constraints (where, orderBy)
2. Add the index to `firestore.indexes.json`
3. Deploy: `firebase deploy --only firestore:indexes`
4. Wait for index creation (5-30 minutes)
5. Deploy code that uses the index

### Example

Query:
```typescript
const quizzes = await getUserDocuments(userId, 'quizzes', [
  where('categoryId', '==', 1),
  orderBy('createdAt', 'desc'),
  limit(50)
]);
```

Index needed:
```json
{
  "collectionGroup": "quizzes",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "categoryId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

### Monitoring Indexes

Check Firebase Console → Firestore → Indexes for:
- Missing indexes (Firestore will show errors in logs)
- Index creation status (building/enabled)
- Unused indexes (can be removed to reduce storage)

## Performance Notes

### Index Size

Each composite index adds storage overhead:
- ~1-5 KB per document per index
- Consider index selectivity (how many documents match)
- Remove unused indexes to save storage

### Query Performance

With proper indexes:
- Queries execute in O(log n + k) time (n = collection size, k = results)
- Without indexes: O(n) - full collection scan

### Best Practices

1. **Start with queries, then add indexes** - Don't create indexes speculatively
2. **Monitor index usage** - Remove unused indexes after 30-90 days
3. **Composite before single** - Firestore auto-creates single-field indexes
4. **Order matters** - Index field order must match query constraint order
5. **Array fields require special handling** - Use arrayConfig: "CONTAINS"

## Troubleshooting

### Error: "The query requires an index"

1. Copy the index definition from the error message
2. Add it to `firestore.indexes.json`
3. Deploy indexes
4. Wait for creation to complete

### Error: "Failed to get documents"

Check:
1. Firestore rules allow the query
2. Index exists and is enabled
3. Query constraint order matches index field order

### Slow Queries

Check:
1. Index is being used (Firebase Console → Performance)
2. Limit clause is applied (prevent large result sets)
3. Query is using equality before inequality constraints

## Related Documentation

- [Firestore Index Best Practices](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Index Types](https://firebase.google.com/docs/firestore/query-data/index-overview)
- [Query Limitations](https://firebase.google.com/docs/firestore/query-data/queries#query_limitations)
