# Pagination Implementation Summary

## Overview
This document provides a complete guide to the pagination implementation in CertLab, including usage examples, API reference, and implementation details.

## Quick Start

### Using Pagination in a Page Component

```typescript
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/ui/pagination-controls';

function MyListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Initialize pagination with URL sync
  const { currentPage, pageSize, setCurrentPage, setPageSize, resetPagination } = usePagination({
    initialPageSize: 25,
    syncWithUrl: true,
  });

  // Fetch or filter your data
  const { data: items = [] } = useQuery({
    queryKey: ['myItems'],
    queryFn: fetchItems,
  });

  // Apply filters
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    resetPagination();
  };

  return (
    <div>
      <Input value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)} />
      
      {/* Render your items */}
      {paginatedItems.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
      
      {/* Pagination controls */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={filteredItems.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
```

## API Reference

### usePagination Hook

#### Parameters

```typescript
interface UsePaginationOptions {
  initialPage?: number;           // Default: 1
  initialPageSize?: number;        // Default: 25 or user's saved preference
  syncWithUrl?: boolean;           // Default: true - sync state with URL params
  pageParam?: string;              // Default: 'page' - URL param name for page
  pageSizeParam?: string;          // Default: 'pageSize' - URL param name for page size
  onPageChange?: (page: number) => void;      // Callback when page changes
  onPageSizeChange?: (pageSize: number) => void; // Callback when page size changes
}
```

#### Returns

```typescript
interface UsePaginationReturn {
  currentPage: number;             // Current page number (1-indexed)
  pageSize: number;                // Items per page
  setCurrentPage: (page: number) => void;  // Update current page
  setPageSize: (size: number) => void;     // Update page size (resets to page 1)
  resetPagination: () => void;     // Reset to page 1
  getPaginatedItems: <T>(items: T[]) => {
    items: T[];                    // Paginated items for current page
    totalPages: number;            // Total number of pages
    startIndex: number;            // Starting index in original array
    endIndex: number;              // Ending index in original array
  };
}
```

### PaginationControls Component

#### Props

```typescript
interface PaginationControlsProps {
  currentPage: number;             // Current page (1-indexed)
  totalPages: number;              // Total number of pages
  pageSize: number;                // Items per page
  totalItems?: number;             // Total items (for display)
  onPageChange: (page: number) => void;     // Page change handler
  onPageSizeChange?: (pageSize: number) => void; // Page size change handler
  pageSizeOptions?: number[];      // Default: [10, 25, 50, 100]
  showPageSizeSelector?: boolean;  // Default: true
  showJumpToPage?: boolean;        // Default: true
  showFirstLastButtons?: boolean;  // Default: true
  maxVisiblePages?: number;        // Default: 5 - max page numbers to show
}
```

## Features

### 1. URL State Synchronization
Pagination state is automatically synced with URL query parameters, making links shareable:
- `?page=3` - navigates to page 3
- `?pageSize=50` - sets page size to 50
- Both parameters work together: `?page=2&pageSize=25`

### 2. User Preference Persistence
Page size preference is saved in localStorage and persists across sessions:
- Key: `preferred_page_size`
- Automatically loaded on initialization
- Automatically saved when changed

### 3. Automatic Page Reset
The hook provides a `resetPagination()` function that resets to page 1. This should be called when:
- Search query changes
- Filters change
- Sorting changes
- Any operation that modifies the filtered dataset

### 4. Page Size Selection
Standard options: 10, 25, 50, 100 items per page
- Customizable via `pageSizeOptions` prop
- Automatically resets to page 1 when changed
- Saves preference to localStorage

### 5. Jump to Page
Users can directly jump to any page by:
1. Entering a page number in the input field
2. Clicking the "Go" button or pressing Enter
3. Invalid page numbers are prevented

### 6. First/Last Navigation
Quick navigation to first and last pages:
- First page button (⏮)
- Last page button (⏭)
- Automatically disabled when already at first/last page

### 7. Smart Page Number Display
Shows relevant page numbers with ellipsis for large page counts:
- `< 1 2 3 4 5 >`  (when at start)
- `< 1 ... 5 6 7 ... 100 >`  (when in middle)
- `< 1 ... 96 97 98 99 100 >`  (when at end)

### 8. Items Range Display
Shows current item range: "Showing 26-50 of 150 items"

### 9. Responsive Design
- Desktop: Full pagination with all features
- Tablet: Compact page numbers
- Mobile: Minimal pagination (prev/next only with page info)

## Implementation Examples

### Example 1: Question Bank Page

```typescript
// client/src/pages/question-bank.tsx
export default function QuestionBankPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const { currentPage, pageSize, setCurrentPage, setPageSize, resetPagination } = usePagination({
    initialPageSize: 10,
    syncWithUrl: true,
  });

  // Filter questions
  const filteredQuestions = questions.filter((question) => {
    const matchesSearch = searchQuery === '' || 
      question.text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || 
      question.categoryId === parseInt(categoryFilter);
    return matchesSearch && matchesCategory;
  });

  // Paginate
  const totalPages = Math.ceil(filteredQuestions.length / pageSize);
  const paginatedQuestions = filteredQuestions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset pagination when filters change
  const handleFilterChange = (setter: (value: string) => void, value: string) => {
    setter(value);
    resetPagination();
  };

  return (
    <div>
      <Input 
        value={searchQuery} 
        onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)} 
      />
      
      {paginatedQuestions.map(question => (
        <QuestionCard key={question.id} question={question} />
      ))}
      
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={filteredQuestions.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
```

### Example 2: Marketplace Page with Sorting

```typescript
// client/src/pages/marketplace.tsx
export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('default');
  
  const { currentPage, pageSize, setCurrentPage, setPageSize, resetPagination } = usePagination({
    initialPageSize: 12,
    syncWithUrl: true,
  });

  // Filter and sort materials
  const filteredMaterials = useMemo(() => {
    let result = materials.filter(m => 
      m.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Sort
    if (sortBy === 'price-low') result.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-high') result.sort((a, b) => b.price - a.price);
    
    return result;
  }, [searchQuery, sortBy]);

  // Paginate
  const totalPages = Math.ceil(filteredMaterials.length / pageSize);
  const paginatedMaterials = filteredMaterials.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    resetPagination();
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    resetPagination();
  };

  return (
    <div>
      <Input value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)} />
      <Select value={sortBy} onValueChange={handleSortChange}>
        <SelectItem value="default">Default</SelectItem>
        <SelectItem value="price-low">Price: Low to High</SelectItem>
        <SelectItem value="price-high">Price: High to Low</SelectItem>
      </Select>
      
      <div className="grid grid-cols-3 gap-4">
        {paginatedMaterials.map(material => (
          <MaterialCard key={material.id} material={material} />
        ))}
      </div>
      
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={filteredMaterials.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
```

### Example 3: Server-Side Pagination (Future)

For large datasets that require server-side pagination:

```typescript
function MyServerPaginatedPage() {
  const { currentPage, pageSize, setCurrentPage, setPageSize } = usePagination({
    initialPageSize: 25,
    syncWithUrl: true,
  });

  // Fetch data from server with pagination params
  const { data, isLoading } = useQuery({
    queryKey: ['items', currentPage, pageSize],
    queryFn: async () => {
      const response = await fetch(
        `/api/items?page=${currentPage}&pageSize=${pageSize}`
      );
      return response.json(); // { items: [], total: number }
    },
  });

  const totalPages = Math.ceil((data?.total ?? 0) / pageSize);

  return (
    <div>
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {data?.items.map(item => (
            <ItemCard key={item.id} item={item} />
          ))}
          
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={data?.total}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}
    </div>
  );
}
```

## Best Practices

### 1. Always Reset Pagination on Filter Changes
```typescript
const handleFilterChange = (setter, value) => {
  setter(value);
  resetPagination();  // ✅ Reset to page 1
};
```

### 2. Use useMemo for Expensive Operations
```typescript
const filteredItems = useMemo(() => {
  return items.filter(/* expensive filter */);
}, [items, dependencies]);
```

### 3. Show Loading States
```typescript
{isLoading ? (
  <LoadingSpinner />
) : (
  <>
    {paginatedItems.map(/* render items */)}
    <PaginationControls /* ... */ />
  </>
)}
```

### 4. Handle Empty States
```typescript
{paginatedItems.length === 0 ? (
  <EmptyState message="No items found" />
) : (
  <>
    {paginatedItems.map(/* render items */)}
    <PaginationControls /* ... */ />
  </>
)}
```

### 5. Consider Disabling URL Sync for Modals/Dialogs
```typescript
const { currentPage, pageSize, setCurrentPage, setPageSize } = usePagination({
  initialPageSize: 10,
  syncWithUrl: false,  // Don't pollute URL for temporary views
});
```

## Performance Considerations

### Client-Side Pagination (Current Implementation)
**Good for:**
- Small to medium datasets (< 1000 items)
- Datasets that are already loaded
- Quick filtering and sorting

**Limitations:**
- All data must be loaded upfront
- Memory usage increases with dataset size
- Initial load time for large datasets

### Server-Side Pagination (Future Enhancement)
**Good for:**
- Large datasets (> 1000 items)
- Data that changes frequently
- Reduced initial load time

**Implementation:**
- Pass `page` and `pageSize` to server
- Server returns `{ items: T[], total: number }`
- Update `PaginationControls` with `total` from server

## Testing

### Unit Tests
See `client/src/hooks/use-pagination.test.tsx` for comprehensive test examples:
- Initialization tests
- State update tests
- Pagination logic tests
- Persistence tests
- Validation tests
- Callback tests

### Running Tests
```bash
# Run all pagination tests
npm run test:run -- use-pagination.test.tsx

# Run with coverage
npm run test:coverage -- use-pagination.test.tsx
```

## Troubleshooting

### Issue: Pagination state not persisting in URL
**Solution:** Ensure `syncWithUrl: true` is set and you're using a router (wouter/react-router)

### Issue: Page size preference not saving
**Solution:** Check browser localStorage isn't disabled. Verify `onPageSizeChange` isn't overridden.

### Issue: Page numbers not updating after filter change
**Solution:** Call `resetPagination()` after changing filters

### Issue: Pagination showing wrong total pages
**Solution:** Ensure you're calculating `totalPages` from filtered items, not all items

### Issue: Items not displaying on page change
**Solution:** Verify pagination slice calculation: `items.slice((page-1)*size, page*size)`

## Future Enhancements

1. **Infinite Scroll Mode**
   - Add `mode` prop to PaginationControls
   - Implement IntersectionObserver
   - Load more items on scroll

2. **Server-Side Pagination Support**
   - Add `mode: 'server'` option
   - Handle total count from server
   - Manage loading states

3. **Virtual Scrolling**
   - For extremely large lists
   - Render only visible items
   - Improves performance significantly

4. **Keyboard Shortcuts**
   - Arrow keys for prev/next
   - Ctrl+Home/End for first/last
   - Number keys for quick jump

5. **Accessibility Improvements**
   - Screen reader announcements
   - Focus management
   - ARIA live regions

## References

- [Pagination Component](../client/src/components/ui/pagination-controls.tsx)
- [usePagination Hook](../client/src/hooks/use-pagination.ts)
- [Pagination Tests](../client/src/hooks/use-pagination.test.tsx)
- [Question Bank Example](../client/src/pages/question-bank.tsx)
- [Marketplace Example](../client/src/pages/marketplace.tsx)
- [My Quizzes Example](../client/src/pages/my-quizzes.tsx)
- [Study Notes Example](../client/src/pages/enhanced-study-notes.tsx)
