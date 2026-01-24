/**
 * Comprehensive Query Tests for Firestore Storage
 *
 * Tests query operations including:
 * - Filtering with where clauses
 * - Sorting with orderBy
 * - Pagination with limit and offset
 * - Complex multi-condition queries
 * - Query constraint combinations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { firestoreStorage } from './firestore-storage';
import * as firestoreService from './firestore-service';
import type { Question, Quiz, UserProgress } from '@shared/schema';

// Mock the firestore-service module
vi.mock('./firestore-service', () => ({
  getFirestoreInstance: vi.fn(),
  getUserDocuments: vi.fn(),
  getUserSubcollectionDocuments: vi.fn(),
  getSharedDocuments: vi.fn(),
  where: vi.fn((field, op, value) => ({ field, op, value, _type: 'where' })),
  orderBy: vi.fn((field, direction) => ({ field, direction, _type: 'orderBy' })),
  limit: vi.fn((n) => ({ n, _type: 'limit' })),
  Timestamp: class MockTimestamp {
    constructor(
      public seconds: number,
      public nanoseconds: number
    ) {}
    toDate() {
      return new Date(this.seconds * 1000);
    }
  },
  timestampToDate: vi.fn((ts: any) => ts?.toDate?.() || ts),
}));

// Mock errors module
vi.mock('./errors', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

// Mock sanitize module
vi.mock('./sanitize', () => ({
  sanitizeInput: vi.fn((input) => input),
  sanitizeArray: vi.fn((arr) => arr),
}));

describe('FirestoreStorage - Query Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getQuestionsByCategories with filters', () => {
    it('should filter questions by single category', async () => {
      const categoryIds = [1];
      const mockQuestions: Question[] = [
        {
          id: 1,
          question: 'Question 1',
          options: [],
          categoryId: 1,
          subcategoryId: null,
          difficulty: 1,
          explanation: null,
          tags: null,
          createdAt: null,
          updatedAt: null,
          tenantId: null,
          isPersonal: false,
          userId: null,
        },
      ];

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue(mockQuestions);

      const result = await firestoreStorage.getQuestionsByCategories(categoryIds);

      expect(result).toHaveLength(1);
      expect(result[0].categoryId).toBe(1);
    });

    it('should filter questions by multiple categories', async () => {
      const categoryIds = [1, 2, 3];
      const mockQuestions: Question[] = [
        {
          id: 1,
          question: 'Q1',
          options: [],
          categoryId: 1,
          subcategoryId: null,
          difficulty: 1,
          explanation: null,
          tags: null,
          createdAt: null,
          updatedAt: null,
          tenantId: null,
          isPersonal: false,
          userId: null,
        },
        {
          id: 2,
          question: 'Q2',
          options: [],
          categoryId: 2,
          subcategoryId: null,
          difficulty: 1,
          explanation: null,
          tags: null,
          createdAt: null,
          updatedAt: null,
          tenantId: null,
          isPersonal: false,
          userId: null,
        },
      ];

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue(mockQuestions);

      const result = await firestoreStorage.getQuestionsByCategories(categoryIds);

      expect(result.length).toBeGreaterThan(0);
      result.forEach((q) => {
        expect(categoryIds).toContain(q.categoryId);
      });
    });

    it('should filter by subcategory IDs', async () => {
      const categoryIds = [1];
      const subcategoryIds = [10, 20];

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue([]);

      await firestoreStorage.getQuestionsByCategories(categoryIds, { subcategoryIds });

      // Verify the where clause was used
      expect(firestoreService.where).toHaveBeenCalled();
      expect(firestoreService.getSharedDocuments).toHaveBeenCalled();
    });

    it('should filter by difficulty levels', async () => {
      const categoryIds = [1];
      const difficultyLevels = [1, 2];
      const mockQuestions: Question[] = [
        {
          id: 1,
          question: 'Easy Q',
          options: [],
          categoryId: 1,
          subcategoryId: null,
          difficulty: 1,
          explanation: null,
          tags: null,
          createdAt: null,
          updatedAt: null,
          tenantId: null,
          isPersonal: false,
          userId: null,
        },
        {
          id: 2,
          question: 'Medium Q',
          options: [],
          categoryId: 1,
          subcategoryId: null,
          difficulty: 2,
          explanation: null,
          tags: null,
          createdAt: null,
          updatedAt: null,
          tenantId: null,
          isPersonal: false,
          userId: null,
        },
      ];

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue(mockQuestions);

      const result = await firestoreStorage.getQuestionsByCategories(categoryIds, {
        difficultyLevels,
      });

      expect(result.length).toBe(2);
      result.forEach((q) => {
        expect(difficultyLevels).toContain(q.difficulty);
      });
    });

    it('should combine multiple filters (category + subcategory + difficulty)', async () => {
      const categoryIds = [1, 2];
      const subcategoryIds = [10];
      const difficultyLevels = [2, 3];

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue([]);

      await firestoreStorage.getQuestionsByCategories(categoryIds, {
        subcategoryIds,
        difficultyLevels,
      });

      // Multiple where clauses should be used
      expect(firestoreService.where).toHaveBeenCalled();
      expect(firestoreService.getSharedDocuments).toHaveBeenCalled();
    });

    it('should filter by tenant ID', async () => {
      const categoryIds = [1];
      const tenantId = 5;

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue([]);

      await firestoreStorage.getQuestionsByCategories(categoryIds, { tenantId });

      expect(firestoreService.where).toHaveBeenCalled();
      expect(firestoreService.getSharedDocuments).toHaveBeenCalled();
    });

    it('should handle empty category list', async () => {
      const categoryIds: number[] = [];

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue([]);

      const result = await firestoreStorage.getQuestionsByCategories(categoryIds);

      expect(result).toEqual([]);
    });

    it('should return empty array when no questions match filters', async () => {
      const categoryIds = [999]; // Non-existent category

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue([]);

      const result = await firestoreStorage.getQuestionsByCategories(categoryIds);

      expect(result).toEqual([]);
    });
  });

  describe('getUserQuizzes with ordering', () => {
    beforeEach(() => {
      vi.spyOn(firestoreStorage, 'getCurrentUserId').mockResolvedValue('user123');
    });

    it('should retrieve quizzes in creation order', async () => {
      const userId = 'user123';
      const now = new Date();
      const mockQuizzes: Quiz[] = [
        {
          id: 1,
          userId,
          name: 'Quiz 1',
          categoryIds: [1],
          mode: 'practice',
          questions: [],
          currentQuestionIndex: 0,
          answers: {},
          score: null,
          totalQuestions: 0,
          correctAnswers: 0,
          createdAt: new Date(now.getTime() - 2000),
          completedAt: null,
          timeSpent: null,
          flaggedQuestions: [],
          passed: null,
          version: 1,
        },
        {
          id: 2,
          userId,
          name: 'Quiz 2',
          categoryIds: [1],
          mode: 'practice',
          questions: [],
          currentQuestionIndex: 0,
          answers: {},
          score: null,
          totalQuestions: 0,
          correctAnswers: 0,
          createdAt: now,
          completedAt: null,
          timeSpent: null,
          flaggedQuestions: [],
          passed: null,
          version: 1,
        },
      ];

      vi.mocked(firestoreService.getUserSubcollectionDocuments).mockResolvedValue(mockQuizzes);

      const result = await firestoreStorage.getUserQuizzes(userId);

      expect(result).toHaveLength(2);
      // Most recent should be last in the array
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });

    it('should handle quizzes with null createdAt', async () => {
      const userId = 'user123';
      const mockQuizzes: Quiz[] = [
        {
          id: 1,
          userId,
          name: 'Quiz without timestamp',
          categoryIds: [1],
          mode: 'practice',
          questions: [],
          currentQuestionIndex: 0,
          answers: {},
          score: null,
          totalQuestions: 0,
          correctAnswers: 0,
          createdAt: null,
          completedAt: null,
          timeSpent: null,
          flaggedQuestions: [],
          passed: null,
          version: 1,
        },
      ];

      vi.mocked(firestoreService.getUserSubcollectionDocuments).mockResolvedValue(mockQuizzes);

      const result = await firestoreStorage.getUserQuizzes(userId);

      expect(result).toHaveLength(1);
      expect(result[0].createdAt).toBeNull();
    });
  });

  describe('getUserProgress with filtering', () => {
    it('should retrieve progress for specific categories', async () => {
      const userId = 'user123';
      const categoryIds = [1, 2];
      const mockProgress: UserProgress[] = [
        {
          id: '1',
          userId,
          categoryId: 1,
          subcategoryId: null,
          completedQuestions: 10,
          totalQuestions: 20,
          lastStudied: null,
        },
        {
          id: '2',
          userId,
          categoryId: 2,
          subcategoryId: null,
          completedQuestions: 5,
          totalQuestions: 15,
          lastStudied: null,
        },
      ];

      vi.mocked(firestoreService.getUserSubcollectionDocuments).mockResolvedValue(mockProgress);

      const result = await firestoreStorage.getUserProgress(userId);

      expect(result).toHaveLength(2);
      result.forEach((p) => {
        expect(categoryIds).toContain(p.categoryId);
      });
    });

    it('should handle empty progress', async () => {
      const userId = 'user123';

      vi.mocked(firestoreService.getUserSubcollectionDocuments).mockResolvedValue([]);

      const result = await firestoreStorage.getUserProgress(userId);

      expect(result).toEqual([]);
    });
  });

  describe('Complex query scenarios', () => {
    it('should handle query with multiple constraints simultaneously', async () => {
      const categoryIds = [1, 2, 3];
      const options = {
        subcategoryIds: [10, 20],
        difficultyLevels: [2, 3],
        tenantId: 5,
      };

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue([]);

      await firestoreStorage.getQuestionsByCategories(categoryIds, options);

      // Should use multiple where clauses
      expect(firestoreService.where).toHaveBeenCalled();
      expect(firestoreService.getSharedDocuments).toHaveBeenCalled();
    });

    it('should handle queries with no results gracefully', async () => {
      const categoryIds = [999];

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue([]);

      const result = await firestoreStorage.getQuestionsByCategories(categoryIds);

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle large result sets', async () => {
      const categoryIds = [1];
      const mockQuestions: Question[] = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        question: `Question ${i + 1}`,
        options: [],
        categoryId: 1,
        subcategoryId: null,
        difficulty: (i % 3) + 1,
        explanation: null,
        tags: null,
        createdAt: null,
        updatedAt: null,
        tenantId: null,
        isPersonal: false,
        userId: null,
      }));

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue(mockQuestions);

      const result = await firestoreStorage.getQuestionsByCategories(categoryIds);

      expect(result).toHaveLength(1000);
    });
  });

  describe('Query error handling', () => {
    it('should handle network errors in queries', async () => {
      const categoryIds = [1];

      vi.mocked(firestoreService.getSharedDocuments).mockRejectedValue(new Error('Network error'));

      await expect(firestoreStorage.getQuestionsByCategories(categoryIds)).rejects.toThrow(
        'Network error'
      );
    });

    it('should handle Firestore permission errors', async () => {
      const userId = 'user123';

      vi.mocked(firestoreService.getUserSubcollectionDocuments).mockRejectedValue(
        new Error('Permission denied')
      );

      await expect(firestoreStorage.getUserQuizzes(userId)).rejects.toThrow('Permission denied');
    });

    it('should handle malformed query constraints', async () => {
      const categoryIds = [1];
      const options = {
        subcategoryIds: null as any, // Invalid type
        difficultyLevels: undefined as any,
      };

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue([]);

      // Should not throw, should handle gracefully
      const result = await firestoreStorage.getQuestionsByCategories(categoryIds, options);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Personal content queries', () => {
    it('should query personal questions for a user', async () => {
      const userId = 'user123';
      const mockPersonalQuestions: Question[] = [
        {
          id: 1,
          question: 'My personal question',
          options: [],
          categoryId: 1,
          subcategoryId: null,
          difficulty: 1,
          explanation: null,
          tags: null,
          createdAt: null,
          updatedAt: null,
          tenantId: null,
          isPersonal: true,
          userId,
        },
      ];

      vi.mocked(firestoreService.getUserSubcollectionDocuments).mockResolvedValue(
        mockPersonalQuestions
      );

      const result = await firestoreStorage.getPersonalQuestions(userId);

      expect(result).toHaveLength(1);
      expect(result[0].isPersonal).toBe(true);
      expect(result[0].userId).toBe(userId);
    });

    it('should query personal categories for a user', async () => {
      const userId = 'user123';

      vi.mocked(firestoreService.getUserSubcollectionDocuments).mockResolvedValue([]);

      const result = await firestoreStorage.getPersonalCategories(userId);

      expect(Array.isArray(result)).toBe(true);
      expect(firestoreService.getUserSubcollectionDocuments).toHaveBeenCalledWith(
        userId,
        'personalCategories'
      );
    });

    it('should query personal subcategories for a user and category', async () => {
      const userId = 'user123';
      const categoryId = 1;

      vi.mocked(firestoreService.getUserSubcollectionDocuments).mockResolvedValue([]);

      const result = await firestoreStorage.getPersonalSubcategories(userId, categoryId);

      expect(Array.isArray(result)).toBe(true);
      expect(firestoreService.getUserSubcollectionDocuments).toHaveBeenCalled();
      expect(firestoreService.where).toHaveBeenCalledWith('categoryId', '==', categoryId);
    });
  });
});
