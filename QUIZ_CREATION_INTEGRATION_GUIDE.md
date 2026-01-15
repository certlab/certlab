# Quiz Creation with Learning Materials - Integration Guide

This guide explains how to integrate the Learning Materials API and UI components into the quiz builder.

## Overview

Three new modules are ready for integration:

1. **Learning Materials API** (`client/src/lib/learning-materials-api.ts`)
2. **Quiz Config Mode Toggle** (`client/src/components/QuizConfigModeToggle.tsx`)
3. **Learning Materials Selector** (`client/src/components/LearningMaterialsSelector.tsx`)

## Quick Start

### Step 1: Add Imports to quiz-builder.tsx

```typescript
import { useQuizConfigMode, QuizConfigModeToggle } from '@/components/QuizConfigModeToggle';
import { LearningMaterialsSelector } from '@/components/LearningMaterialsSelector';
import {
  getAccessibleLearningMaterials,
  type LearningMaterialsFilters,
} from '@/lib/learning-materials-api';
```

### Step 2: Add State Management

```typescript
// Replace existing showAdvancedConfig state with:
const [viewMode, setViewMode] = useQuizConfigMode(); // Automatically persists to localStorage

// Add material selection state:
const [selectedMaterialIds, setSelectedMaterialIds] = useState<number[]>([]);
```

### Step 3: Fetch Learning Materials

```typescript
// Add this query after the subcategories query
const {
  data: materialsResult,
  isLoading: materialsLoading,
  isError: materialsError,
} = useQuery({
  queryKey: ['learningMaterials', user?.id, selectedCategories],
  queryFn: async () => {
    if (!user?.id) return { materials: [], totalCount: 0, hasMore: false };
    
    const filters: LearningMaterialsFilters = {
      categoryIds: selectedCategories.length > 0 ? selectedCategories : undefined,
    };
    
    return await getAccessibleLearningMaterials(user.id, user.tenantId, filters);
  },
  enabled: !!user?.id && selectedCategories.length > 0,
});

const learningMaterials = materialsResult?.materials.filter((m) => m.isAccessible) || [];
```

### Step 4: Add Components to Configuration Tab

```tsx
{/* Configuration Tab */}
<TabsContent value="config" className="space-y-6">
  {/* Add at the top of configuration tab */}
  <QuizConfigModeToggle mode={viewMode} onModeChange={setViewMode} />

  {/* Existing Basic Information card */}
  <Card>
    <CardHeader>
      <CardTitle>Basic Information</CardTitle>
      ...
    </CardHeader>
    ...
  </Card>

  {/* Existing Categories card */}
  <Card>
    <CardHeader>
      <CardTitle>Categories & Topics</CardTitle>
      ...
    </CardHeader>
    ...
  </Card>

  {/* Add Learning Materials Selector after Categories */}
  <LearningMaterialsSelector
    materials={learningMaterials}
    selectedIds={selectedMaterialIds}
    onSelectionChange={setSelectedMaterialIds}
    isLoading={materialsLoading}
    isError={materialsError}
    hasCategoriesSelected={selectedCategories.length > 0}
  />

  {/* Existing Quiz Settings card */}
  <Card>
    <CardHeader>
      <CardTitle>Quiz Settings</CardTitle>
      ...
    </CardHeader>
    ...
  </Card>
  
  {/* Conditionally show advanced config based on viewMode */}
  {viewMode === 'advanced' && (
    <Card>
      <CardHeader>
        <CardTitle>Advanced Configuration</CardTitle>
        ...
      </CardHeader>
      ...
    </Card>
  )}
</TabsContent>
```

### Step 5: Use viewMode Instead of showAdvancedConfig

Replace all instances of `showAdvancedConfig` with checks like:
```typescript
viewMode === 'advanced'
```

For example:
```tsx
{viewMode === 'advanced' && (
  <div>
    {/* Advanced options */}
  </div>
)}
```

## Storing Selected Materials

To persist selected learning materials in the quiz template:

### Update Quiz Template Creation

```typescript
const template: QuizTemplate = {
  // ... existing fields
  categoryIds: selectedCategories,
  subcategoryIds: selectedSubcategories,
  customQuestions: sanitizedQuestions,
  
  // Add this field (may need to extend QuizTemplate type):
  linkedMaterialIds: selectedMaterialIds, // Store associated learning materials
  
  // ... rest of template
};
```

### Extend QuizTemplate Type (if needed)

In `shared/schema.ts`, you may want to add:
```typescript
export interface QuizTemplate {
  // ... existing fields
  linkedMaterialIds?: number[]; // Optional: IDs of associated learning materials
}
```

## API Usage Examples

### Filter Materials by Difficulty

```typescript
const filters: LearningMaterialsFilters = {
  categoryIds: [1, 2],
  minDifficulty: 2,
  maxDifficulty: 4,
};

const result = await getAccessibleLearningMaterials(userId, tenantId, filters);
```

### Search Materials

```typescript
const results = await searchLearningMaterials(userId, 'cryptography', tenantId);
```

### Get Materials by Category

```typescript
const groupedMaterials = await getLearningMaterialsByCategory(userId, tenantId);
// Returns: Map<number, Lecture[]>
```

### Get Material Statistics

```typescript
import { getLearningMaterialsStats } from '@/lib/learning-materials-api';

const stats = getLearningMaterialsStats(materials);
console.log(stats.total); // Total count
console.log(stats.byContentType); // { text: 5, video: 3, pdf: 2 }
console.log(stats.readCount); // Number of read materials
```

## Benefits

1. **User Experience**:
   - Simple toggle between basic/advanced views
   - Preference persists across sessions
   - Visual feedback on material selection

2. **Developer Experience**:
   - Type-safe API with TypeScript
   - Well-documented functions
   - Comprehensive test coverage
   - Easy to extend and maintain

3. **Performance**:
   - Efficient filtering at the API level
   - React Query caching
   - Lazy loading of materials

## Testing

Run the API tests:
```bash
npm run test:run -- learning-materials-api.test.ts
```

All 19 tests should pass.

## Troubleshooting

### Materials Not Loading
- Verify user is authenticated (`user?.id` exists)
- Check that categories are selected
- Ensure Firestore has lecture data for the user

### Toggle State Not Persisting
- Check browser's localStorage is enabled
- Verify no console errors related to storage
- localStorage key is: `quiz-builder-view-mode`

### TypeScript Errors
- Ensure you've imported types: `import type { LearningMaterialsFilters } from '@/lib/learning-materials-api'`
- Check that `Lecture` type is imported from `@shared/schema`

## Future Enhancements

Potential improvements for future iterations:

1. **Material-based Question Generation**: Use selected materials to suggest relevant questions
2. **Material Preview**: Add inline preview of material content
3. **Bulk Actions**: Select/deselect all materials at once
4. **Material Recommendations**: Suggest materials based on quiz difficulty and topics
5. **Material Statistics**: Show which materials are most commonly linked to successful quizzes

## Support

For issues or questions:
1. Check the JSDoc comments in the source code
2. Review the unit tests for usage examples
3. Refer to existing patterns in quiz-builder.tsx
