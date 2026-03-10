# YAML Import Success Criteria Fix

## Issue

When importing YAML files through `/app/data-import`, the import would show "success" even when 0 questions were actually imported. This was misleading and made it difficult for users to diagnose import problems.

## Root Cause

In `client/src/lib/import-questions.ts`, line 155 unconditionally set `result.success = true` regardless of whether any questions were successfully imported:

```typescript
result.success = true;  // Always true, even if 0 questions imported!
```

This meant that even if all 500 questions failed to import (e.g., due to Firestore permission errors when user is not an admin), the import would still report success.

## Fix

Changed the success criteria to only report success if at least one question was imported OR if there were no questions to import (empty file edge case):

```typescript
// Only mark as successful if at least one question was imported
// or if there were no questions to import (empty file edge case)
result.success = imported > 0 || data.questions.length === 0;
```

Additionally, the progress callback message now reflects the actual import status:

```typescript
status: result.success
  ? `Successfully imported ${imported} questions for ${data.category}!${skipped > 0 ? ` (${skipped} skipped due to validation errors)` : ''}`
  : `Failed to import questions for ${data.category}. ${skipped} questions skipped due to errors.`,
```

## Testing

Added test cases to verify the fix:

1. **Test: "should return success=false when all questions fail to import"**
   - Simulates Firestore permission errors
   - Verifies that `result.success === false` when all questions fail

2. **Test: "should return success=true for empty question list"**
   - Tests the edge case of an empty questions array
   - Verifies that empty files still report success

3. **Updated: "should handle storage errors gracefully"**
   - Fixed incorrect expectation (was expecting `success: true`, now correctly expects `success: false`)

## Impact

Users will now get accurate feedback when:
- They don't have admin permissions (Firestore rules require admin role to write questions)
- Questions fail validation
- There are network/Firestore errors
- The import genuinely succeeds

This makes it easier to diagnose why imports might be failing, especially the common case of missing admin permissions.

## Related Files

- `client/src/lib/import-questions.ts` - Core import logic
- `client/src/lib/import-questions.test.ts` - Test coverage
- `client/src/pages/data-import.tsx` - UI that displays import results
- `firestore.rules` - Firestore security rules (questions require admin role)
