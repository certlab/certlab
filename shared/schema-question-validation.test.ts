import { describe, it, expect } from 'vitest';
import { insertQuestionSchema } from './schema';

describe('insertQuestionSchema - categoryId and subcategoryId validation', () => {
  const baseQuestionData = {
    tenantId: 1,
    categoryId: 1,
    subcategoryId: 1,
    questionType: 'multiple_choice_single' as const,
    text: 'This is a test question with at least 10 characters',
    options: [
      { id: 0, text: 'Option A' },
      { id: 1, text: 'Option B' },
    ],
    correctAnswer: 0,
    explanation: 'Test explanation',
    difficultyLevel: 1,
  };

  describe('categoryId validation', () => {
    it('should accept valid positive categoryId', () => {
      const result = insertQuestionSchema.safeParse({
        ...baseQuestionData,
        categoryId: 1,
      });
      expect(result.success).toBe(true);
    });

    it('should accept categoryId at maximum 32-bit integer value', () => {
      const result = insertQuestionSchema.safeParse({
        ...baseQuestionData,
        categoryId: 2147483647,
      });
      expect(result.success).toBe(true);
    });

    it('should accept categoryId of 0', () => {
      // 0 may be used as a sentinel value for "not selected"
      const result = insertQuestionSchema.safeParse({
        ...baseQuestionData,
        categoryId: 0,
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative categoryId', () => {
      const result = insertQuestionSchema.safeParse({
        ...baseQuestionData,
        categoryId: -1,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('non-negative');
      }
    });

    it('should reject categoryId exceeding 32-bit integer max', () => {
      const result = insertQuestionSchema.safeParse({
        ...baseQuestionData,
        categoryId: 2147483648, // MAX + 1
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('exceeds maximum');
      }
    });

    it('should reject non-integer categoryId', () => {
      const result = insertQuestionSchema.safeParse({
        ...baseQuestionData,
        categoryId: 1.5,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('integer');
      }
    });
  });

  describe('subcategoryId validation', () => {
    it('should accept valid positive subcategoryId', () => {
      const result = insertQuestionSchema.safeParse({
        ...baseQuestionData,
        subcategoryId: 1,
      });
      expect(result.success).toBe(true);
    });

    it('should accept subcategoryId at maximum 32-bit integer value', () => {
      const result = insertQuestionSchema.safeParse({
        ...baseQuestionData,
        subcategoryId: 2147483647,
      });
      expect(result.success).toBe(true);
    });

    it('should accept subcategoryId of 0', () => {
      // 0 may be used as a sentinel value for "no subcategory"
      const result = insertQuestionSchema.safeParse({
        ...baseQuestionData,
        subcategoryId: 0,
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative subcategoryId', () => {
      const result = insertQuestionSchema.safeParse({
        ...baseQuestionData,
        subcategoryId: -1,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('non-negative');
      }
    });

    it('should reject subcategoryId exceeding 32-bit integer max', () => {
      const result = insertQuestionSchema.safeParse({
        ...baseQuestionData,
        subcategoryId: 2147483648, // MAX + 1
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('exceeds maximum');
      }
    });

    it('should reject non-integer subcategoryId', () => {
      const result = insertQuestionSchema.safeParse({
        ...baseQuestionData,
        subcategoryId: 1.5,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('integer');
      }
    });
  });

  describe('error message clarity', () => {
    it('should provide clear error message for categoryId exceeding max', () => {
      const result = insertQuestionSchema.safeParse({
        ...baseQuestionData,
        categoryId: 3000000000, // Way over max
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.issues.find((issue) => issue.path.includes('categoryId'));
        expect(error).toBeDefined();
        expect(error?.message).toBe('Category ID exceeds maximum allowed value');
      }
    });

    it('should provide clear error message for subcategoryId exceeding max', () => {
      const result = insertQuestionSchema.safeParse({
        ...baseQuestionData,
        subcategoryId: 3000000000, // Way over max
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.issues.find((issue) => issue.path.includes('subcategoryId'));
        expect(error).toBeDefined();
        expect(error?.message).toBe('Subcategory ID exceeds maximum allowed value');
      }
    });
  });
});
