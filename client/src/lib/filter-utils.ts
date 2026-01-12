import type { SearchAndFilterState, SortOption } from '@/components/SearchAndFilter';
import type { Quiz, Lecture, QuizTemplate } from '@shared/schema';

/**
 * Unified item type for filtering quizzes, lectures, and templates
 */
export type FilterableItem = (Quiz | Lecture | QuizTemplate) & {
  authorName?: string | null;
  visibility?: string | null;
};

/**
 * Apply full-text search to an item
 */
export function matchesSearchText(item: FilterableItem, searchText: string): boolean {
  if (!searchText) return true;

  const search = searchText.toLowerCase();
  const title = (item.title || '').toLowerCase();
  const description = (item.description || '').toLowerCase();
  const tags = (item.tags || []).map((t) => t.toLowerCase()).join(' ');
  const authorName = (item.authorName || '').toLowerCase();

  return (
    title.includes(search) ||
    description.includes(search) ||
    tags.includes(search) ||
    authorName.includes(search)
  );
}

/**
 * Check if item matches content type filter
 */
export function matchesContentType(
  item: FilterableItem,
  contentType: string,
  itemType: 'quiz' | 'lecture' | 'template'
): boolean {
  if (contentType === 'all') return true;
  return contentType === itemType;
}

/**
 * Check if item has any of the specified tags
 */
export function matchesTags(item: FilterableItem, filterTags: string[]): boolean {
  if (filterTags.length === 0) return true;

  const itemTags = (item.tags || []).map((t) => t.toLowerCase());
  return filterTags.some((tag) => itemTags.includes(tag.toLowerCase()));
}

/**
 * Check if item matches difficulty levels
 */
export function matchesDifficultyLevels(item: FilterableItem, levels: number[]): boolean {
  if (levels.length === 0) return true;

  const itemDifficulty = item.difficultyLevel || 1;
  return levels.includes(itemDifficulty);
}

/**
 * Check if item matches authors
 */
export function matchesAuthors(item: FilterableItem, authors: string[]): boolean {
  if (authors.length === 0) return true;

  const itemAuthor = (item.authorName || '').toLowerCase();
  return authors.some((author) => itemAuthor.includes(author.toLowerCase()));
}

/**
 * Check if item is within date range
 */
export function matchesDateRange(
  item: FilterableItem,
  dateFrom: Date | undefined,
  dateTo: Date | undefined
): boolean {
  const itemDate = item.createdAt ? new Date(item.createdAt) : null;
  if (!itemDate) return true;

  if (dateFrom && itemDate < dateFrom) return false;
  if (dateTo) {
    // Include the entire end date - create a new Date to avoid mutating the parameter
    const endOfDay = new Date(dateTo.getTime());
    endOfDay.setHours(23, 59, 59, 999);
    if (itemDate > endOfDay) return false;
  }

  return true;
}

/**
 * Check if item matches visibility filter
 */
export function matchesVisibility(item: FilterableItem, visibility: string): boolean {
  if (visibility === 'all') return true;

  const itemVisibility = item.visibility || 'private';
  return itemVisibility === visibility;
}

/**
 * Check if quiz matches completion status
 */
export function matchesCompletionStatus(item: FilterableItem, status: string): boolean {
  if (status === 'all') return true;

  const quiz = item as Quiz;

  switch (status) {
    case 'completed':
      return !!quiz.completedAt;
    case 'incomplete':
      return !quiz.completedAt;
    case 'passed':
      return !!quiz.isPassing;
    case 'failed':
      return !!quiz.completedAt && quiz.isPassing === false;
    default:
      return true;
  }
}

/**
 * Apply all filters to an item
 */
export function applyFilters(
  item: FilterableItem,
  filters: SearchAndFilterState,
  itemType: 'quiz' | 'lecture' | 'template'
): boolean {
  return (
    matchesSearchText(item, filters.searchText) &&
    matchesContentType(item, filters.contentType, itemType) &&
    matchesTags(item, filters.tags) &&
    matchesDifficultyLevels(item, filters.difficultyLevels) &&
    matchesAuthors(item, filters.authors) &&
    matchesDateRange(item, filters.dateFrom, filters.dateTo) &&
    matchesVisibility(item, filters.visibility) &&
    matchesCompletionStatus(item, filters.completionStatus)
  );
}

/**
 * Sort items based on sort option
 */
export function sortItems<T extends FilterableItem>(items: T[], sortBy: SortOption): T[] {
  const sorted = [...items];

  switch (sortBy) {
    case 'date-desc':
      return sorted.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

    case 'date-asc':
      return sorted.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });

    case 'title-asc':
      return sorted.sort((a, b) => {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        return titleA.localeCompare(titleB);
      });

    case 'title-desc':
      return sorted.sort((a, b) => {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        return titleB.localeCompare(titleA);
      });

    case 'difficulty-asc':
      return sorted.sort((a, b) => {
        const diffA = a.difficultyLevel || 1;
        const diffB = b.difficultyLevel || 1;
        return diffA - diffB;
      });

    case 'difficulty-desc':
      return sorted.sort((a, b) => {
        const diffA = a.difficultyLevel || 1;
        const diffB = b.difficultyLevel || 1;
        return diffB - diffA;
      });

    case 'author-asc':
      return sorted.sort((a, b) => {
        const authorA = (a.authorName || '').toLowerCase();
        const authorB = (b.authorName || '').toLowerCase();
        return authorA.localeCompare(authorB);
      });

    case 'author-desc':
      return sorted.sort((a, b) => {
        const authorA = (a.authorName || '').toLowerCase();
        const authorB = (b.authorName || '').toLowerCase();
        return authorB.localeCompare(authorA);
      });

    default:
      return sorted;
  }
}

/**
 * Paginate items
 */
export function paginateItems<T>(items: T[], page: number, pageSize: number): T[] {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return items.slice(startIndex, endIndex);
}

/**
 * Calculate total pages
 */
export function calculateTotalPages(totalItems: number, pageSize: number): number {
  return Math.ceil(totalItems / pageSize);
}

/**
 * Extract unique tags from items
 */
export function extractUniqueTags(items: FilterableItem[]): string[] {
  const tagsSet = new Set<string>();

  items.forEach((item) => {
    (item.tags || []).forEach((tag) => {
      if (tag) tagsSet.add(tag);
    });
  });

  return Array.from(tagsSet).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

/**
 * Extract unique authors from items
 */
export function extractUniqueAuthors(items: FilterableItem[]): string[] {
  const authorsSet = new Set<string>();

  items.forEach((item) => {
    const authorName = item.authorName;
    if (authorName) authorsSet.add(authorName);
  });

  return Array.from(authorsSet).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

/**
 * Filter and sort items (combined operation)
 */
export function filterAndSortItems<T extends FilterableItem>(
  items: T[],
  filters: SearchAndFilterState,
  itemType: 'quiz' | 'lecture' | 'template'
): T[] {
  const filtered = items.filter((item) => applyFilters(item, filters, itemType));
  return sortItems(filtered, filters.sortBy);
}

/**
 * Get filter statistics
 */
export function getFilterStats(
  allItems: FilterableItem[],
  filteredItems: FilterableItem[]
): {
  total: number;
  filtered: number;
  percentage: number;
} {
  const total = allItems.length;
  const filtered = filteredItems.length;
  const percentage = total > 0 ? Math.round((filtered / total) * 100) : 0;

  return { total, filtered, percentage };
}
