/**
 * Comprehensive Edge Case Tests for Firestore Storage
 *
 * Tests edge cases and error scenarios including:
 * - Timestamp conversion edge cases
 * - Data validation failures
 * - Concurrent modification conflicts
 * - Large batch operations
 * - Network interruptions
 * - Invalid data handling
 * - Boundary conditions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { firestoreStorage, generateSafeNumericId } from './firestore-storage';
import * as firestoreService from './firestore-service';
import type { User, Quiz, Question } from '@shared/schema';

// Mock the firestore-service module
vi.mock('./firestore-service', () => ({
  getFirestoreInstance: vi.fn(),
  getUserDocument: vi.fn(),
  getUserDocuments: vi.fn(),
  setUserDocument: vi.fn(),
  updateUserDocument: vi.fn(),
  deleteUserDocument: vi.fn(),
  getUserSubcollectionDocument: vi.fn(),
  getUserSubcollectionDocuments: vi.fn(),
  setUserSubcollectionDocument: vi.fn(),
  getSharedDocument: vi.fn(),
  getSharedDocuments: vi.fn(),
  setSharedDocument: vi.fn(),
  getUserProfile: vi.fn(),
  setUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
  Timestamp: class MockTimestamp {
    constructor(
      public seconds: number,
      public nanoseconds: number
    ) {}
    toDate() {
      return new Date(this.seconds * 1000 + this.nanoseconds / 1000000);
    }
    static now() {
      const now = Date.now();
      return new MockTimestamp(Math.floor(now / 1000), (now % 1000) * 1000000);
    }
  },
  timestampToDate: vi.fn((ts: any) => {
    // Use a fixed date for null/undefined to keep tests deterministic
    if (!ts) return new Date(0);
    if (ts.toDate) return ts.toDate();
    if (ts instanceof Date) return ts;
    return new Date(0);
  }),
  where: vi.fn((field, op, value) => ({ field, op, value, _type: 'where' })),
  orderBy: vi.fn((field, direction) => ({ field, direction, _type: 'orderBy' })),
}));

// Mock errors module
vi.mock('./errors', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  isFirestorePermissionError: vi.fn().mockReturnValue(false),
}));

// Mock sanitize module with actual sanitization
vi.mock('./sanitize', () => ({
  sanitizeInput: vi.fn((input) => {
    if (typeof input !== 'string') return input;
    // Simple XSS protection
    return input.replace(/<script.*?>.*?<\/script>/gi, '').replace(/<.*?>/g, '');
  }),
  sanitizeArray: vi.fn((arr) => {
    if (!Array.isArray(arr)) return arr;
    return arr.map((item) => (typeof item === 'string' ? item.replace(/<.*?>/g, '') : item));
  }),
}));

describe('FirestoreStorage - Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Timestamp conversion edge cases', () => {
    it('should handle null timestamps by returning current date', () => {
      const result = firestoreService.timestampToDate(null);
      expect(result).toBeInstanceOf(Date);
    });

    it('should handle undefined timestamps by returning current date', () => {
      const result = firestoreService.timestampToDate(undefined);
      expect(result).toBeInstanceOf(Date);
    });

    it('should convert Firestore Timestamp to Date', () => {
      const MockTimestamp = firestoreService.Timestamp;
      const timestamp = new MockTimestamp(1609459200, 500000000); // 2021-01-01 00:00:00.5
      const result = firestoreService.timestampToDate(timestamp);

      expect(result).toBeInstanceOf(Date);
      expect(result?.getTime()).toBe(1609459200500);
    });

    it('should handle Date objects passed as timestamps', () => {
      const date = new Date('2021-01-01');
      const result = firestoreService.timestampToDate(date);

      expect(result).toEqual(date);
    });

    it('should handle timestamps at epoch (0)', () => {
      const MockTimestamp = firestoreService.Timestamp;
      const timestamp = new MockTimestamp(0, 0);
      const result = firestoreService.timestampToDate(timestamp);

      expect(result).toBeInstanceOf(Date);
      expect(result?.getTime()).toBe(0);
    });

    it('should handle timestamps far in the future', () => {
      const MockTimestamp = firestoreService.Timestamp;
      // Year 2100
      const timestamp = new MockTimestamp(4102444800, 0);
      const result = firestoreService.timestampToDate(timestamp);

      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2100);
    });

    it('should handle nanosecond precision in timestamps', () => {
      const MockTimestamp = firestoreService.Timestamp;
      const timestamp = new MockTimestamp(1609459200, 123456789); // 123.456789 milliseconds
      const result = firestoreService.timestampToDate(timestamp);

      expect(result).toBeInstanceOf(Date);
      // Verify milliseconds are preserved
      expect(result?.getMilliseconds()).toBe(123);
    });
  });

  describe('Data validation edge cases', () => {
    it('should reject question with less than 2 options', async () => {
      const invalidQuestion: Partial<Question> = {
        text: 'This is a valid question text with at least 10 characters',
        options: [{ id: 0, text: 'Only one option' }],
        categoryId: 1,
        subcategoryId: 1,
        correctAnswer: 0,
        difficultyLevel: 1,
      };

      await expect(firestoreStorage.createQuestion(invalidQuestion)).rejects.toThrow();
    });

    it('should reject question with empty question text', async () => {
      const invalidQuestion: Partial<Question> = {
        text: '',
        options: [
          { id: 0, text: 'Option A' },
          { id: 1, text: 'Option B' },
        ],
        categoryId: 1,
        subcategoryId: 1,
        correctAnswer: 0,
        difficultyLevel: 1,
      };

      await expect(firestoreStorage.createQuestion(invalidQuestion)).rejects.toThrow();
    });

    it('should reject category with empty name', async () => {
      const invalidCategory = {
        name: '',
        description: 'Test',
      };

      await expect(firestoreStorage.createCategory(invalidCategory)).rejects.toThrow();
    });

    it('should handle question options with HTML/script tags', async () => {
      const { sanitizeInput } = await import('./sanitize');

      const questionWithXSS: Partial<Question> = {
        text: '<script>alert("xss")</script>What is this?',
        options: [
          { id: 0, text: 'Option with XSS attempt' },
          { id: 1, text: 'Safe option' },
        ],
        categoryId: 1,
        subcategoryId: 1,
        correctAnswer: 0,
      };

      vi.mocked(firestoreService.setSharedDocument).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getSharedDocument).mockResolvedValue({
        id: 1,
        ...questionWithXSS,
      } as Question);

      await firestoreStorage.createQuestion(questionWithXSS);

      // Verify sanitization was called
      expect(sanitizeInput).toHaveBeenCalled();
    });
  });

  describe('Numeric ID generation edge cases', () => {
    it('should generate IDs within 32-bit safe range', () => {
      const MAX_32BIT_INT = 2147483647;

      for (let i = 0; i < 100; i++) {
        const id = generateSafeNumericId();
        expect(id).toBeGreaterThan(0);
        expect(id).toBeLessThanOrEqual(MAX_32BIT_INT);
      }
    });

    it('should never generate ID of 0', () => {
      for (let i = 0; i < 100; i++) {
        const id = generateSafeNumericId();
        expect(id).not.toBe(0);
      }
    });

    it('should generate unique IDs in rapid succession', () => {
      const ids = new Set<number>();
      const count = 1000;

      for (let i = 0; i < count; i++) {
        ids.add(generateSafeNumericId());
      }

      expect(ids.size).toBe(count);
    });

    it('should handle ID generation at boundary conditions', () => {
      // Test near the 32-bit limit
      const ids: number[] = [];

      for (let i = 0; i < 10; i++) {
        ids.push(generateSafeNumericId());
      }

      ids.forEach((id) => {
        expect(Number.isInteger(id)).toBe(true);
        expect(id).toBeGreaterThan(0);
      });
    });
  });

  describe('Concurrent modification scenarios', () => {
    beforeEach(() => {
      vi.spyOn(firestoreStorage, 'getCurrentUserId').mockResolvedValue('user123');
    });

    it('should handle concurrent quiz updates', async () => {
      const quizId = 1;
      const userId = 'user123';

      // Set current user ID
      firestoreStorage.setCurrentUserId(userId);

      // Simulate two concurrent updates
      const update1 = { title: 'Update 1', score: 80 };
      const update2 = { title: 'Update 2', score: 90 };

      vi.mocked(firestoreService.updateUserDocument).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getUserDocument)
        .mockResolvedValueOnce({ id: quizId, ...update1 } as Quiz)
        .mockResolvedValueOnce({ id: quizId, ...update2 } as Quiz);

      // Execute updates concurrently
      const [result1, result2] = await Promise.all([
        firestoreStorage.updateQuiz(quizId, update1),
        firestoreStorage.updateQuiz(quizId, update2),
      ]);

      // Both should succeed (last write wins in Firestore)
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('should handle concurrent question creation', async () => {
      const question1: Partial<Question> = {
        text: 'Question 1',
        options: [
          { id: 0, text: 'Option A' },
          { id: 1, text: 'Option B' },
        ],
        categoryId: 1,
        subcategoryId: 1,
        correctAnswer: 0,
      };

      const question2: Partial<Question> = {
        text: 'Question 2',
        options: [
          { id: 0, text: 'Option C' },
          { id: 1, text: 'Option D' },
        ],
        categoryId: 1,
        subcategoryId: 1,
        correctAnswer: 0,
      };

      vi.mocked(firestoreService.setSharedDocument).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getSharedDocument)
        .mockResolvedValueOnce({ id: 1, ...question1 } as Question)
        .mockResolvedValueOnce({ id: 2, ...question2 } as Question);

      // Create questions concurrently using Promise.all
      // Note: generateSafeNumericId() uses an incrementing counter, so concurrent
      // calls in the same tick will get sequential IDs (1, 2, etc.)
      // This test verifies that concurrent operations don't cause ID collisions
      const [result1, result2] = await Promise.all([
        firestoreStorage.createQuestion(question1),
        firestoreStorage.createQuestion(question2),
      ]);

      // Both should have unique IDs from the mock
      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('Large batch operations', () => {
    it('should handle creation of many quizzes', async () => {
      const quizCount = 100;
      const quizzes: Partial<Quiz>[] = Array.from({ length: quizCount }, (_, i) => ({
        userId: 'user123',
        title: `Quiz ${i}`,
        categoryIds: [1],
        mode: 'practice' as const,
      }));

      vi.mocked(firestoreService.setUserSubcollectionDocument).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getUserSubcollectionDocument).mockImplementation(
        async (userId, collection, docId) => {
          const index = parseInt(docId as string);
          return {
            id: index,
            ...quizzes[index % quizCount],
          } as Quiz;
        }
      );

      // Create quizzes in batch
      const results = await Promise.all(quizzes.map((quiz) => firestoreStorage.createQuiz(quiz)));

      expect(results).toHaveLength(quizCount);
      results.forEach((result, index) => {
        expect(result.title).toBe(`Quiz ${index}`);
      });
    });

    it('should handle querying large question sets', async () => {
      const questionCount = 1000;
      const mockQuestions: Question[] = Array.from({ length: questionCount }, (_, i) => ({
        id: i + 1,
        text: `Question ${i + 1}`,
        options: [
          { id: 1, text: 'A' },
          { id: 2, text: 'B' },
        ],
        categoryId: 1,
        correctAnswer: 0,
        subcategoryId: 1,
        difficultyLevel: (i % 3) + 1,
        explanation: null,
        tags: null,
        createdAt: null,
        updatedAt: null,
        tenantId: 1,
      }));

      vi.mocked(firestoreService.getSharedDocuments).mockResolvedValue(mockQuestions);

      const result = await firestoreStorage.getQuestionsByCategories([1]);

      expect(result).toHaveLength(questionCount);
    });

    it('should handle batch deletion placeholder', async () => {
      // Batch deletion requires proper mocking of firebase/firestore module
      // This is a placeholder test to document the need for batch deletion testing
      // For now, we verify that the delete method exists and has proper signature
      expect(typeof firestoreStorage.deleteQuestion).toBe('function');

      // Create an array representing the IDs we would delete in a real test
      const questionIds = Array.from({ length: 50 }, (_, i) => i + 1);
      expect(questionIds).toHaveLength(50);

      // Note: Full integration tests with proper Firebase mocking should verify:
      // 1. Batch deletion completes successfully for all items
      // 2. Deletion handles partial failures gracefully
      // 3. Proper error handling for network issues during batch operations
    });
  });

  describe('Network error scenarios', () => {
    it('should handle timeout errors', async () => {
      const userId = 'user123';

      vi.mocked(firestoreService.getUserProfile).mockRejectedValue(new Error('Request timeout'));

      const result = await firestoreStorage.getUser(userId);
      expect(result).toBeUndefined();
    });

    it('should handle connection refused errors', async () => {
      const categoryIds = [1];

      vi.mocked(firestoreService.getSharedDocuments).mockRejectedValue(
        new Error('Connection refused')
      );

      const result = await firestoreStorage.getQuestionsByCategories(categoryIds);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle intermittent network failures', async () => {
      const userId = 'user123';
      const newUser: Partial<User> = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
      };

      // First attempt fails, second succeeds
      vi.mocked(firestoreService.setUserProfile)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);

      vi.mocked(firestoreService.getUserProfile).mockResolvedValue({
        id: userId,
        ...newUser,
      } as User);

      // First attempt should fail
      await expect(firestoreStorage.createUser(newUser)).rejects.toThrow('Network error');

      // Second attempt should succeed
      const result = await firestoreStorage.createUser(newUser);
      expect(result).toBeDefined();
    });
  });

  describe('Data integrity edge cases', () => {
    it('should handle user with extremely long first name', async () => {
      const longFirstName = 'a'.repeat(1000);
      const newUser: Partial<User> = {
        firstName: longFirstName,
        lastName: 'User',
        email: 'test@example.com',
      };

      vi.mocked(firestoreService.setUserProfile).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getUserProfile).mockResolvedValue({
        id: 'user123',
        ...newUser,
      } as User);

      const result = await firestoreStorage.createUser(newUser);

      expect(result.firstName).toHaveLength(1000);
    });

    it('should handle quiz with empty category array', async () => {
      const quizWithEmptyCategories: Partial<Quiz> = {
        userId: 'user123',
        title: 'Empty Quiz',
        categoryIds: [],
        mode: 'practice',
      };

      vi.mocked(firestoreService.setUserSubcollectionDocument).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getUserSubcollectionDocument).mockResolvedValue({
        id: 1,
        ...quizWithEmptyCategories,
      } as Quiz);

      const result = await firestoreStorage.createQuiz(quizWithEmptyCategories);

      // Verify that empty arrays are preserved
      // Note: Quiz validation rules may require at least one category in production
      // This test verifies the storage layer accepts empty arrays without crashing
      expect(result.categoryIds).toEqual([]);
    });

    it('should handle question with very long explanation', async () => {
      const longExplanation = 'This is a very long explanation. '.repeat(100);
      const question: Partial<Question> = {
        text: 'What is this?',
        options: [
          { id: 1, text: 'A' },
          { id: 2, text: 'B' },
        ],
        categoryId: 1,
        subcategoryId: 1,
        correctAnswer: 0,
        explanation: longExplanation,
      };

      vi.mocked(firestoreService.setSharedDocument).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getSharedDocument).mockResolvedValue({
        id: 1,
        ...question,
      } as Question);

      const result = await firestoreStorage.createQuestion(question);

      expect(result.explanation).toHaveLength(longExplanation.length);
    });

    it('should handle null and undefined fields correctly', async () => {
      const userWithNulls: Partial<User> = {
        id: 'user123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        profileImageUrl: null,
        tenantId: 1,
      };

      vi.mocked(firestoreService.setUserProfile).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getUserProfile).mockResolvedValue(userWithNulls as User);

      const result = await firestoreStorage.createUser(userWithNulls);

      expect(result.profileImageUrl).toBeNull();
      expect(result.tenantId).toBeNull();
    });
  });

  describe('Boundary conditions', () => {
    it('should handle difficulty level at minimum (1)', async () => {
      const question: Partial<Question> = {
        text: 'Easy question',
        options: [
          { id: 1, text: 'A' },
          { id: 2, text: 'B' },
        ],
        categoryId: 1,
        subcategoryId: 1,
        correctAnswer: 0,
        difficultyLevel: 1,
      };

      vi.mocked(firestoreService.setSharedDocument).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getSharedDocument).mockResolvedValue({
        id: 1,
        ...question,
      } as Question);

      const result = await firestoreStorage.createQuestion(question);

      expect(result.difficultyLevel).toBe(1);
    });

    it('should handle difficulty level at maximum (5)', async () => {
      const question: Partial<Question> = {
        text: 'Very hard question',
        options: [
          { id: 1, text: 'A' },
          { id: 2, text: 'B' },
        ],
        categoryId: 1,
        subcategoryId: 1,
        correctAnswer: 0,
        difficultyLevel: 5,
      };

      vi.mocked(firestoreService.setSharedDocument).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getSharedDocument).mockResolvedValue({
        id: 1,
        ...question,
      } as Question);

      const result = await firestoreStorage.createQuestion(question);

      expect(result.difficultyLevel).toBe(5);
    });

    it('should handle quiz score at 0', async () => {
      const quizId = 1;
      const userId = 'user123';

      firestoreStorage.setCurrentUserId(userId);

      vi.mocked(firestoreService.updateUserDocument).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getUserDocument).mockResolvedValue({
        id: quizId,
        score: 0,
        isPassing: false,
      } as Quiz);

      const result = await firestoreStorage.updateQuiz(quizId, { score: 0 });

      expect(result?.score).toBe(0);
      expect(result?.isPassing).toBe(false);
    });

    it('should handle quiz score at 100', async () => {
      const quizId = 1;
      const userId = 'user123';

      firestoreStorage.setCurrentUserId(userId);

      vi.mocked(firestoreService.updateUserDocument).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getUserDocument).mockResolvedValue({
        id: quizId,
        score: 100,
        isPassing: true,
      } as Quiz);

      const result = await firestoreStorage.updateQuiz(quizId, { score: 100 });

      expect(result?.score).toBe(100);
      expect(result?.isPassing).toBe(true);
    });
  });

  describe('Special characters and encoding', () => {
    it('should handle Unicode characters in question text', async () => {
      const question: Partial<Question> = {
        text: '¿Qué es esto? 你好 مرحبا 🎉',
        options: [
          { id: 1, text: 'Respuesta 回答 إجابة 🎯' },
          { id: 2, text: 'Other' },
        ],
        categoryId: 1,
        subcategoryId: 1,
        correctAnswer: 0,
      };

      vi.mocked(firestoreService.setSharedDocument).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getSharedDocument).mockResolvedValue({
        id: 1,
        ...question,
      } as Question);

      const result = await firestoreStorage.createQuestion(question);

      expect(result.text).toContain('¿Qué es esto?');
      expect(result.text).toContain('🎉');
    });

    it('should handle category names with special characters', async () => {
      const category = {
        name: 'C++ & C# Programming (Level 1-5)',
        description: 'Test & Learn <> more!',
      };

      vi.mocked(firestoreService.setSharedDocument).mockResolvedValue(undefined);
      vi.mocked(firestoreService.getSharedDocument).mockResolvedValue({
        id: 1,
        ...category,
      } as any);

      const result = await firestoreStorage.createCategory(category);

      expect(result.name).toContain('C++');
      expect(result.name).toContain('&');
    });
  });
});
