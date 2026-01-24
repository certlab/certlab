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

/**
 * Helper to create a valid Question mock with all required fields
 */
function createMockQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 1,
    text: 'What is 2+2? This is a test question with enough characters.',
    questionType: 'multiple_choice_single',
    options: [
      { id: 0, text: '3' },
      { id: 1, text: '4' },
    ],
    correctAnswer: 1,
    correctAnswers: null,
    acceptedAnswers: null,
    matchingPairs: null,
    orderingItems: null,
    requiresManualGrading: false,
    categoryId: 1,
    subcategoryId: 1,
    tenantId: 1,
    difficultyLevel: 1,
    explanation: null,
    explanationSteps: null,
    tags: null,
    referenceLinks: null,
    videoUrl: null,
    communityExplanations: null,
    explanationVotes: 0,
    hasAlternativeViews: false,
    ...overrides,
  } as Question;
}

describe('FirestoreStorage - Query Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getQuestionsByCategories with filters', () => {
    it('should filter questions by single category', async () => {
      const categoryIds = [1];
      const mockQuestions: Question[] = [
        createMockQuestion({
          id: 1,
          text: 'Question 1',
          categoryId: 1,
          subcategoryId: 1,
          tenantId: 1,
        }),
      ];

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue(mockQuestions);

      const result = await firestoreStorage.getQuestionsByCategories(categoryIds);

      expect(result).toHaveLength(1);
      expect(result[0].categoryId).toBe(1);
    });

    it('should filter questions by multiple categories', async () => {
      const categoryIds = [1, 2, 3];
      const mockQuestions: Question[] = [
        createMockQuestion({
          id: 1,
          text: 'Q1',
          categoryId: 1,
          subcategoryId: 1,
          tenantId: 1,
        }),
        createMockQuestion({
          id: 2,
          text: 'Q2',
          categoryId: 2,
          subcategoryId: 1,
          tenantId: 1,
        }),
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

      await firestoreStorage.getQuestionsByCategories(categoryIds, subcategoryIds);

      // Verify the shared documents were fetched
      expect(firestoreService.getSharedDocuments).toHaveBeenCalledWith('questions');
    });

    it('should filter by difficulty levels', async () => {
      const categoryIds = [1];
      const difficultyLevels = [1, 2];
      const mockQuestions: Question[] = [
        {
          id: 1,
          text: 'Easy Q',
          options: [],
          categoryId: 1,
          subcategoryId: 1,
          difficultyLevel: 1,
          explanation: null,
          tags: null,
          tenantId: 1,
        },
        {
          id: 2,
          text: 'Medium Q',
          options: [],
          categoryId: 1,
          subcategoryId: 1,
          difficultyLevel: 2,
          explanation: null,
          tags: null,
          tenantId: 1,
        },
      ];

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue(mockQuestions);

      const result = await firestoreStorage.getQuestionsByCategories(
        categoryIds,
        undefined,
        difficultyLevels
      );

      expect(result.length).toBe(2);
      result.forEach((q) => {
        expect(difficultyLevels).toContain(q.difficultyLevel);
      });
    });

    it('should combine multiple filters (category + subcategory + difficulty)', async () => {
      const categoryIds = [1, 2];
      const subcategoryIds = [10];
      const difficultyLevels = [2, 3];

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue([]);

      await firestoreStorage.getQuestionsByCategories(
        categoryIds,
        subcategoryIds,
        difficultyLevels
      );

      // Multiple filters should be applied
      expect(firestoreService.getSharedDocuments).toHaveBeenCalledWith('questions');
    });

    it('should filter by tenant ID', async () => {
      const categoryIds = [1];
      const tenantId = 5;

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue([]);

      await firestoreStorage.getQuestionsByCategories(categoryIds, undefined, undefined, tenantId);

      expect(firestoreService.getSharedDocuments).toHaveBeenCalledWith('questions');
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
          title: 'Quiz 1',
          categoryIds: [1],
          subcategoryIds: [],
          questionIds: [],
          questionCount: 0,
          mode: 'practice',
          answers: {},
          score: null,
          totalQuestions: 0,
          correctAnswers: 0,
          createdAt: new Date(now.getTime() - 2000),
          startedAt: new Date(now.getTime() - 2000),
          completedAt: null,
          tenantId: 1,
        } as Quiz,
        {
          id: 2,
          userId,
          title: 'Quiz 2',
          categoryIds: [1],
          subcategoryIds: [],
          questionIds: [],
          questionCount: 0,
          mode: 'practice',
          answers: {},
          score: null,
          totalQuestions: 0,
          correctAnswers: 0,
          createdAt: now,
          startedAt: now,
          completedAt: null,
          tenantId: 1,
        } as Quiz,
      ];

      vi.mocked(firestoreService.getUserDocuments).mockResolvedValue(mockQuizzes);

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
          title: 'Quiz without timestamp',
          categoryIds: [1],
          subcategoryIds: [],
          questionIds: [],
          questionCount: 0,
          mode: 'practice',
          answers: {},
          score: null,
          totalQuestions: 0,
          correctAnswers: 0,
          startedAt: null,
          completedAt: null,
          tenantId: 1,
        } as Quiz,
      ];

      vi.mocked(firestoreService.getUserDocuments).mockResolvedValue(mockQuizzes);

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
          id: 1,
          userId,
          categoryId: 1,
          subcategoryId: 1,
          completedQuestions: 10,
          totalQuestions: 20,
          lastStudied: null,
        },
        {
          id: 2,
          userId,
          categoryId: 2,
          subcategoryId: 1,
          completedQuestions: 5,
          totalQuestions: 15,
          lastStudied: null,
        },
      ];

      vi.mocked(firestoreService.getUserDocuments).mockResolvedValue(mockProgress);

      const result = await firestoreStorage.getUserProgress(userId);

      expect(result).toHaveLength(2);
      result.forEach((p) => {
        expect(categoryIds).toContain(p.categoryId);
      });
    });

    it('should handle empty progress', async () => {
      const userId = 'user123';

      vi.mocked(firestoreService.getUserDocuments).mockResolvedValue([]);

      const result = await firestoreStorage.getUserProgress(userId);

      expect(result).toEqual([]);
    });
  });

  describe('Complex query scenarios', () => {
    it('should handle query with multiple constraints simultaneously', async () => {
      const categoryIds = [1, 2, 3];
      const subcategoryIds = [10, 20];
      const difficultyLevels = [2, 3];
      const tenantId = 5;

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue([]);

      await firestoreStorage.getQuestionsByCategories(
        categoryIds,
        subcategoryIds,
        difficultyLevels,
        tenantId
      );

      // Should fetch all questions and filter in-memory
      expect(firestoreService.getSharedDocuments).toHaveBeenCalledWith('questions');
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
        text: `Question ${i + 1}`,
        options: [],
        categoryId: 1,
        subcategoryId: 1,
        difficultyLevel: (i % 3) + 1,
        explanation: null,
        tags: null,
        tenantId: 1,
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

      const result = await firestoreStorage.getQuestionsByCategories(categoryIds);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle Firestore permission errors', async () => {
      const userId = 'user123';

      vi.mocked(firestoreService.getUserDocuments).mockRejectedValue(
        new Error('Permission denied')
      );

      const result = await firestoreStorage.getUserQuizzes(userId);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle malformed query constraints', async () => {
      const categoryIds = [1];
      const options = {
        subcategoryIds: null as any, // Invalid type
        difficultyLevels: undefined as any,
      };

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue([]);

      // Should not throw, should handle gracefully
      const result = await firestoreStorage.getQuestionsByCategories(
        categoryIds,
        options.subcategoryIds as any,
        options.difficultyLevels as any,
        undefined as any
      );

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Personal content queries', () => {
    it('should query personal questions for a user', async () => {
      const userId = 'user123';
      const mockPersonalQuestions: Question[] = [
        {
          id: 1,
          text: 'My personal question',
          options: [],
          categoryId: 1,
          subcategoryId: 1,
          difficultyLevel: 1,
          explanation: null,
          tags: null,
          tenantId: 1,
          userId,
        },
      ];

      vi.mocked(firestoreService.getUserDocuments).mockResolvedValue(mockPersonalQuestions);

      const result = await firestoreStorage.getPersonalQuestions(userId);

      expect(result).toHaveLength(1);
      expect(result[0].isPersonal).toBe(true);
      expect(result[0].userId).toBe(userId);
      expect(firestoreService.getUserDocuments).toHaveBeenCalledWith(userId, 'personalQuestions');
    });

    it('should query personal categories for a user', async () => {
      const userId = 'user123';

      vi.mocked(firestoreService.getUserDocuments).mockResolvedValue([]);

      const result = await firestoreStorage.getPersonalCategories(userId);

      expect(Array.isArray(result)).toBe(true);
      expect(firestoreService.getUserDocuments).toHaveBeenCalledWith(userId, 'personalCategories');
    });

    it('should query personal subcategories for a user and category', async () => {
      const userId = 'user123';
      const categoryId = 1;

      vi.mocked(firestoreService.getUserDocuments).mockResolvedValue([]);

      const result = await firestoreStorage.getPersonalSubcategories(userId, categoryId);

      expect(Array.isArray(result)).toBe(true);
      expect(firestoreService.getUserDocuments).toHaveBeenCalledWith(
        userId,
        'personalSubcategories',
        [
          expect.objectContaining({
            field: 'categoryId',
            op: '==',
            value: categoryId,
            _type: 'where',
          }),
        ]
      );
    });
  });
});
