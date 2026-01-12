import { describe, it, expect } from 'vitest';
import {
  matchesSearchText,
  matchesContentType,
  matchesTags,
  matchesDifficultyLevels,
  matchesAuthors,
  matchesDateRange,
  matchesVisibility,
  matchesCompletionStatus,
  sortItems,
  paginateItems,
  calculateTotalPages,
  extractUniqueTags,
  extractUniqueAuthors,
  getFilterStats,
} from './filter-utils';
import type { Quiz, Lecture } from '@shared/schema';
import type { SearchAndFilterState } from '@/components/SearchAndFilter';

describe('filter-utils', () => {
  // Mock data
  const mockQuiz: Partial<Quiz> = {
    id: 1,
    title: 'CISSP Security Quiz',
    description: 'Test your security knowledge',
    tags: ['security', 'cissp'],
    difficultyLevel: 3,
    createdAt: new Date('2024-01-15'),
    completedAt: new Date('2024-01-20'),
    isPassing: true,
  };

  const mockLecture: Partial<Lecture> = {
    id: 2,
    title: 'Introduction to Cryptography',
    description: 'Learn about encryption',
    tags: ['cryptography', 'security'],
    difficultyLevel: 2,
    createdAt: new Date('2024-02-01'),
    authorName: 'John Doe',
    visibility: 'public',
  };

  describe('matchesSearchText', () => {
    it('should return true when searchText is empty', () => {
      expect(matchesSearchText(mockQuiz as Quiz, '')).toBe(true);
    });

    it('should match title', () => {
      expect(matchesSearchText(mockQuiz as Quiz, 'cissp')).toBe(true);
      expect(matchesSearchText(mockQuiz as Quiz, 'CISSP')).toBe(true);
    });

    it('should match description', () => {
      expect(matchesSearchText(mockQuiz as Quiz, 'security knowledge')).toBe(true);
    });

    it('should match tags', () => {
      expect(matchesSearchText(mockQuiz as Quiz, 'security')).toBe(true);
    });

    it('should not match unrelated text', () => {
      expect(matchesSearchText(mockQuiz as Quiz, 'unrelated')).toBe(false);
    });
  });

  describe('matchesContentType', () => {
    it('should return true for "all" content type', () => {
      expect(matchesContentType(mockQuiz as Quiz, 'all', 'quiz')).toBe(true);
    });

    it('should match correct content type', () => {
      expect(matchesContentType(mockQuiz as Quiz, 'quiz', 'quiz')).toBe(true);
      expect(matchesContentType(mockLecture as Lecture, 'lecture', 'lecture')).toBe(true);
    });

    it('should not match incorrect content type', () => {
      expect(matchesContentType(mockQuiz as Quiz, 'lecture', 'quiz')).toBe(false);
    });
  });

  describe('matchesTags', () => {
    it('should return true when no tags filter is applied', () => {
      expect(matchesTags(mockQuiz as Quiz, [])).toBe(true);
    });

    it('should match when item has one of the filter tags', () => {
      expect(matchesTags(mockQuiz as Quiz, ['security'])).toBe(true);
      expect(matchesTags(mockQuiz as Quiz, ['cissp', 'other'])).toBe(true);
    });

    it('should not match when item has none of the filter tags', () => {
      expect(matchesTags(mockQuiz as Quiz, ['unrelated'])).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(matchesTags(mockQuiz as Quiz, ['SECURITY'])).toBe(true);
    });
  });

  describe('matchesDifficultyLevels', () => {
    it('should return true when no difficulty filter is applied', () => {
      expect(matchesDifficultyLevels(mockQuiz as Quiz, [])).toBe(true);
    });

    it('should match correct difficulty level', () => {
      expect(matchesDifficultyLevels(mockQuiz as Quiz, [3])).toBe(true);
      expect(matchesDifficultyLevels(mockQuiz as Quiz, [2, 3, 4])).toBe(true);
    });

    it('should not match incorrect difficulty level', () => {
      expect(matchesDifficultyLevels(mockQuiz as Quiz, [1, 2])).toBe(false);
    });
  });

  describe('matchesAuthors', () => {
    it('should return true when no author filter is applied', () => {
      expect(matchesAuthors(mockLecture as Lecture, [])).toBe(true);
    });

    it('should match correct author', () => {
      expect(matchesAuthors(mockLecture as Lecture, ['John Doe'])).toBe(true);
      expect(matchesAuthors(mockLecture as Lecture, ['john'])).toBe(true);
    });

    it('should not match incorrect author', () => {
      expect(matchesAuthors(mockLecture as Lecture, ['Jane Smith'])).toBe(false);
    });
  });

  describe('matchesDateRange', () => {
    it('should return true when no date filter is applied', () => {
      expect(matchesDateRange(mockQuiz as Quiz, undefined, undefined)).toBe(true);
    });

    it('should match item within date range', () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-31');
      expect(matchesDateRange(mockQuiz as Quiz, dateFrom, dateTo)).toBe(true);
    });

    it('should not match item before date range', () => {
      const dateFrom = new Date('2024-02-01');
      expect(matchesDateRange(mockQuiz as Quiz, dateFrom, undefined)).toBe(false);
    });

    it('should not match item after date range', () => {
      const dateTo = new Date('2024-01-10');
      expect(matchesDateRange(mockQuiz as Quiz, undefined, dateTo)).toBe(false);
    });
  });

  describe('matchesVisibility', () => {
    it('should return true for "all" visibility', () => {
      expect(matchesVisibility(mockLecture as Lecture, 'all')).toBe(true);
    });

    it('should match correct visibility', () => {
      expect(matchesVisibility(mockLecture as Lecture, 'public')).toBe(true);
    });

    it('should not match incorrect visibility', () => {
      expect(matchesVisibility(mockLecture as Lecture, 'private')).toBe(false);
    });
  });

  describe('matchesCompletionStatus', () => {
    it('should return true for "all" status', () => {
      expect(matchesCompletionStatus(mockQuiz as Quiz, 'all')).toBe(true);
    });

    it('should match completed quiz', () => {
      expect(matchesCompletionStatus(mockQuiz as Quiz, 'completed')).toBe(true);
    });

    it('should match passed quiz', () => {
      expect(matchesCompletionStatus(mockQuiz as Quiz, 'passed')).toBe(true);
    });

    it('should not match incomplete status for completed quiz', () => {
      expect(matchesCompletionStatus(mockQuiz as Quiz, 'incomplete')).toBe(false);
    });
  });

  describe('sortItems', () => {
    const items = [
      { ...mockQuiz, title: 'B Quiz', createdAt: new Date('2024-01-01'), difficultyLevel: 2 },
      { ...mockQuiz, title: 'A Quiz', createdAt: new Date('2024-01-15'), difficultyLevel: 4 },
      { ...mockQuiz, title: 'C Quiz', createdAt: new Date('2024-01-10'), difficultyLevel: 1 },
    ] as Quiz[];

    it('should sort by date descending', () => {
      const sorted = sortItems(items, 'date-desc');
      expect(sorted[0].title).toBe('A Quiz');
      expect(sorted[2].title).toBe('B Quiz');
    });

    it('should sort by date ascending', () => {
      const sorted = sortItems(items, 'date-asc');
      expect(sorted[0].title).toBe('B Quiz');
      expect(sorted[2].title).toBe('A Quiz');
    });

    it('should sort by title ascending', () => {
      const sorted = sortItems(items, 'title-asc');
      expect(sorted[0].title).toBe('A Quiz');
      expect(sorted[2].title).toBe('C Quiz');
    });

    it('should sort by difficulty ascending', () => {
      const sorted = sortItems(items, 'difficulty-asc');
      expect(sorted[0].difficultyLevel).toBe(1);
      expect(sorted[2].difficultyLevel).toBe(4);
    });
  });

  describe('paginateItems', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    it('should return correct page of items', () => {
      expect(paginateItems(items, 1, 3)).toEqual([1, 2, 3]);
      expect(paginateItems(items, 2, 3)).toEqual([4, 5, 6]);
      expect(paginateItems(items, 4, 3)).toEqual([10]);
    });

    it('should return empty array for out of range page', () => {
      expect(paginateItems(items, 5, 3)).toEqual([]);
    });
  });

  describe('calculateTotalPages', () => {
    it('should calculate correct number of pages', () => {
      expect(calculateTotalPages(10, 3)).toBe(4);
      expect(calculateTotalPages(9, 3)).toBe(3);
      expect(calculateTotalPages(0, 3)).toBe(0);
    });
  });

  describe('extractUniqueTags', () => {
    const items = [
      { ...mockQuiz, tags: ['security', 'cissp'] },
      { ...mockLecture, tags: ['security', 'cryptography'] },
    ] as any[];

    it('should extract unique tags sorted alphabetically', () => {
      const tags = extractUniqueTags(items);
      expect(tags).toEqual(['cissp', 'cryptography', 'security']);
    });

    it('should handle items without tags', () => {
      const itemsWithoutTags = [{ ...mockQuiz, tags: undefined }];
      const tags = extractUniqueTags(itemsWithoutTags as any[]);
      expect(tags).toEqual([]);
    });
  });

  describe('extractUniqueAuthors', () => {
    const items = [
      { ...mockLecture, authorName: 'John Doe' },
      { ...mockLecture, authorName: 'Jane Smith' },
      { ...mockLecture, authorName: 'John Doe' },
    ] as any[];

    it('should extract unique authors sorted alphabetically', () => {
      const authors = extractUniqueAuthors(items);
      expect(authors).toEqual(['Jane Smith', 'John Doe']);
    });
  });

  describe('getFilterStats', () => {
    const allItems = [mockQuiz, mockQuiz, mockQuiz] as Quiz[];
    const filteredItems = [mockQuiz] as Quiz[];

    it('should calculate correct statistics', () => {
      const stats = getFilterStats(allItems, filteredItems);
      expect(stats.total).toBe(3);
      expect(stats.filtered).toBe(1);
      expect(stats.percentage).toBe(33);
    });

    it('should handle empty arrays', () => {
      const stats = getFilterStats([], []);
      expect(stats.total).toBe(0);
      expect(stats.filtered).toBe(0);
      expect(stats.percentage).toBe(0);
    });
  });
});
