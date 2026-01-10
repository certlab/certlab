import { describe, it, expect } from 'vitest';
import { quizVersionSchema } from '@shared/schema';
import type { QuizVersion } from '@shared/schema';

describe('Quiz Version History Schema', () => {
  describe('quizVersionSchema validation', () => {
    const validVersionData: QuizVersion = {
      id: 'v1_1234567890',
      quizId: 12345,
      versionNumber: 1,
      createdAt: new Date('2024-01-01'),
      createdBy: 'user123',
      changeDescription: 'Initial version',
      title: 'Test Quiz',
      description: 'A test quiz description',
      tags: ['test', 'quiz'],
      categoryIds: [1, 2],
      subcategoryIds: [10, 20],
      questionIds: [100, 101, 102],
      questionCount: 3,
      timeLimit: 30,
      difficultyLevel: 3,
      passingScore: 70,
      maxAttempts: 3,
      randomizeQuestions: true,
      randomizeAnswers: false,
      timeLimitPerQuestion: null,
      questionWeights: null,
      feedbackMode: 'instant',
      isAdvancedConfig: false,
      author: 'user123',
      authorName: 'Test User',
      prerequisites: null,
    };

    it('should validate a complete quiz version', () => {
      const result = quizVersionSchema.safeParse(validVersionData);
      expect(result.success).toBe(true);
    });

    it('should require all mandatory fields', () => {
      const incompleteData = {
        id: 'v1',
        quizId: 123,
      };
      const result = quizVersionSchema.safeParse(incompleteData);
      expect(result.success).toBe(false);
    });

    it('should validate version number is positive integer', () => {
      const invalidData = {
        ...validVersionData,
        versionNumber: -1,
      };
      const result = quizVersionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
