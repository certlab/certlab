/**
 * Tests for import-personal-questions.ts
 * Comprehensive test coverage for personal YAML import functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  importPersonalQuestionsFromYAML,
  importPersonalFromFile,
} from './import-personal-questions';
import type { ImportResult, ImportProgress } from './question-import-validation';

// Mock the storage factory
vi.mock('./storage-factory', () => ({
  storage: {
    getPersonalCategories: vi.fn(),
    createPersonalCategory: vi.fn(),
    getPersonalSubcategories: vi.fn(),
    createPersonalSubcategory: vi.fn(),
    createPersonalQuestion: vi.fn(),
  },
}));

// Import storage after mocking
import { storage } from './storage-factory';

describe('importPersonalQuestionsFromYAML', () => {
  const userId = 'test-user-123';
  const tenantId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully import valid YAML with new category', async () => {
    const yamlContent = `
category: TestCategory
description: Test questions
questions:
  - text: "What is 2+2?"
    options:
      - id: 0
        text: "3"
      - id: 1
        text: "4"
      - id: 2
        text: "5"
    correctAnswer: 1
    explanation: "Basic math"
    difficultyLevel: 1
    tags: ["math"]
    subcategory: "Arithmetic"
`;

    // Mock storage responses
    vi.mocked(storage.getPersonalCategories).mockResolvedValue([]);
    vi.mocked(storage.createPersonalCategory).mockResolvedValue({
      id: 1,
      name: 'TestCategory',
      description: 'Test questions',
      icon: null,
      tenantId: 1,
      createdAt: new Date(),
    });
    vi.mocked(storage.getPersonalSubcategories).mockResolvedValue([]);
    vi.mocked(storage.createPersonalSubcategory).mockResolvedValue({
      id: 1,
      name: 'Arithmetic',
      categoryId: 1,
      tenantId: 1,
      createdAt: new Date(),
    });
    vi.mocked(storage.createPersonalQuestion).mockResolvedValue({
      id: 1,
      text: 'What is 2+2?',
      options: [
        { id: 0, text: '3' },
        { id: 1, text: '4' },
        { id: 2, text: '5' },
      ],
      correctAnswer: 1,
      explanation: 'Basic math',
      difficultyLevel: 1,
      tags: ['math'],
      categoryId: 1,
      subcategoryId: 1,
      tenantId: 1,
    });

    const result = await importPersonalQuestionsFromYAML(yamlContent, userId, tenantId);

    expect(result.success).toBe(true);
    expect(result.questionsImported).toBe(1);
    expect(result.questionsSkipped).toBe(0);
    expect(result.categoriesCreated).toBe(1);
    expect(result.subcategoriesCreated).toBe(1);
    expect(result.errors).toHaveLength(0);

    expect(storage.createPersonalCategory).toHaveBeenCalledWith(userId, {
      tenantId: 1,
      name: 'TestCategory',
      description: 'Test questions',
      icon: 'briefcase',
    });
    expect(storage.createPersonalQuestion).toHaveBeenCalledWith(userId, expect.any(Object));
  });

  it('should use existing category if it already exists', async () => {
    const yamlContent = `
category: ExistingCategory
questions:
  - text: "Question?"
    options:
      - id: 0
        text: "A"
      - id: 1
        text: "B"
    correctAnswer: 0
    explanation: "Explanation"
    difficultyLevel: 1
    tags: []
    subcategory: "Topic"
`;

    const existingCategory = {
      id: 10,
      name: 'ExistingCategory',
      description: 'Existing',
      icon: null,
      tenantId: 1,
      createdAt: new Date(),
    };

    vi.mocked(storage.getPersonalCategories).mockResolvedValue([existingCategory]);
    vi.mocked(storage.getPersonalSubcategories).mockResolvedValue([]);
    vi.mocked(storage.createPersonalSubcategory).mockResolvedValue({
      id: 20,
      name: 'Topic',
      categoryId: 10,
      tenantId: 1,
      createdAt: new Date(),
    });
    vi.mocked(storage.createPersonalQuestion).mockResolvedValue({} as any);

    const result = await importPersonalQuestionsFromYAML(yamlContent, userId, tenantId);

    expect(result.success).toBe(true);
    expect(result.categoriesCreated).toBe(0); // Should not create new category
    expect(storage.createPersonalCategory).not.toHaveBeenCalled();
  });

  it('should use existing subcategory if it already exists', async () => {
    const yamlContent = `
category: Category
questions:
  - text: "Question?"
    options:
      - id: 0
        text: "A"
      - id: 1
        text: "B"
    correctAnswer: 0
    explanation: "Explanation"
    difficultyLevel: 1
    tags: []
    subcategory: "ExistingTopic"
`;

    const existingCategory = {
      id: 10,
      name: 'Category',
      description: '',
      icon: null,
      tenantId: 1,
      createdAt: new Date(),
    };

    const existingSubcategory = {
      id: 20,
      name: 'ExistingTopic',
      categoryId: 10,
      tenantId: 1,
      createdAt: new Date(),
    };

    vi.mocked(storage.getPersonalCategories).mockResolvedValue([existingCategory]);
    vi.mocked(storage.getPersonalSubcategories).mockResolvedValue([existingSubcategory]);
    vi.mocked(storage.createPersonalQuestion).mockResolvedValue({} as any);

    const result = await importPersonalQuestionsFromYAML(yamlContent, userId, tenantId);

    expect(result.success).toBe(true);
    expect(result.subcategoriesCreated).toBe(0); // Should not create new subcategory
    expect(storage.createPersonalSubcategory).not.toHaveBeenCalled();
  });

  it('should skip questions with validation errors', async () => {
    const yamlContent = `
category: TestCategory
questions:
  - text: "Valid question?"
    options:
      - id: 0
        text: "A"
      - id: 1
        text: "B"
    correctAnswer: 0
    explanation: "Explanation"
    difficultyLevel: 1
    tags: []
    subcategory: "Topic"
  - text: "Invalid question?"
    options:
      - id: 0
        text: "Only one option"
    correctAnswer: 0
    explanation: "Explanation"
    difficultyLevel: 1
    tags: []
    subcategory: "Topic"
  - text: "Another valid question?"
    options:
      - id: 0
        text: "A"
      - id: 1
        text: "B"
    correctAnswer: 1
    explanation: "Explanation"
    difficultyLevel: 1
    tags: []
    subcategory: "Topic"
`;

    vi.mocked(storage.getPersonalCategories).mockResolvedValue([]);
    vi.mocked(storage.createPersonalCategory).mockResolvedValue({
      id: 1,
      name: 'TestCategory',
      description: '',
      icon: null,
      tenantId: 1,
      createdAt: new Date(),
    });
    vi.mocked(storage.getPersonalSubcategories).mockResolvedValue([]);
    vi.mocked(storage.createPersonalSubcategory).mockResolvedValue({
      id: 1,
      name: 'Topic',
      categoryId: 1,
      tenantId: 1,
      createdAt: new Date(),
    });
    vi.mocked(storage.createPersonalQuestion).mockResolvedValue({} as any);

    const result = await importPersonalQuestionsFromYAML(yamlContent, userId, tenantId);

    expect(result.success).toBe(true);
    expect(result.questionsImported).toBe(2); // Only 2 valid questions
    expect(result.questionsSkipped).toBe(1); // 1 invalid question
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Question 2');
    expect(result.errors[0]).toContain('Invalid options structure');
  });

  it('should skip questions with correctAnswer not matching option ID', async () => {
    const yamlContent = `
category: TestCategory
questions:
  - text: "Question?"
    options:
      - id: 0
        text: "A"
      - id: 1
        text: "B"
    correctAnswer: 5
    explanation: "Explanation"
    difficultyLevel: 1
    tags: []
    subcategory: "Topic"
`;

    vi.mocked(storage.getPersonalCategories).mockResolvedValue([]);
    vi.mocked(storage.createPersonalCategory).mockResolvedValue({
      id: 1,
      name: 'TestCategory',
      description: '',
      icon: null,
      tenantId: 1,
      createdAt: new Date(),
    });
    vi.mocked(storage.getPersonalSubcategories).mockResolvedValue([]);
    vi.mocked(storage.createPersonalSubcategory).mockResolvedValue({
      id: 1,
      name: 'Topic',
      categoryId: 1,
      tenantId: 1,
      createdAt: new Date(),
    });

    const result = await importPersonalQuestionsFromYAML(yamlContent, userId, tenantId);

    expect(result.success).toBe(true);
    expect(result.questionsImported).toBe(0);
    expect(result.questionsSkipped).toBe(1);
    expect(result.errors[0]).toContain('correctAnswer 5');
    expect(result.errors[0]).toContain('does not match any option ID');
  });

  it('should handle invalid YAML structure', async () => {
    const yamlContent = `
invalid: yaml
without: category
`;

    const result = await importPersonalQuestionsFromYAML(yamlContent, userId, tenantId);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Invalid YAML structure');
  });

  it('should call progress callback during import', async () => {
    const yamlContent = `
category: TestCategory
questions:
  - text: "Question 1?"
    options:
      - id: 0
        text: "A"
      - id: 1
        text: "B"
    correctAnswer: 0
    explanation: "Explanation"
    difficultyLevel: 1
    tags: []
    subcategory: "Topic"
  - text: "Question 2?"
    options:
      - id: 0
        text: "A"
      - id: 1
        text: "B"
    correctAnswer: 1
    explanation: "Explanation"
    difficultyLevel: 1
    tags: []
    subcategory: "Topic"
`;

    vi.mocked(storage.getPersonalCategories).mockResolvedValue([]);
    vi.mocked(storage.createPersonalCategory).mockResolvedValue({
      id: 1,
      name: 'TestCategory',
      description: '',
      icon: null,
      tenantId: 1,
      createdAt: new Date(),
    });
    vi.mocked(storage.getPersonalSubcategories).mockResolvedValue([]);
    vi.mocked(storage.createPersonalSubcategory).mockResolvedValue({
      id: 1,
      name: 'Topic',
      categoryId: 1,
      tenantId: 1,
      createdAt: new Date(),
    });
    vi.mocked(storage.createPersonalQuestion).mockResolvedValue({} as any);

    const progressCallback = vi.fn();
    await importPersonalQuestionsFromYAML(yamlContent, userId, tenantId, progressCallback);

    expect(progressCallback).toHaveBeenCalled();
    const calls = progressCallback.mock.calls;
    expect(calls.length).toBeGreaterThan(0);

    // Check that progress callback received proper data
    const firstCall = calls[0][0] as ImportProgress;
    expect(firstCall.total).toBe(2);
    expect(firstCall.status).toBeDefined();
  });

  it('should process questions in batches', async () => {
    // Create YAML with 60 questions (more than batch size of 50)
    const questions = Array.from(
      { length: 60 },
      (_, i) => `
  - text: "Question ${i}?"
    options:
      - id: 0
        text: "A"
      - id: 1
        text: "B"
    correctAnswer: 0
    explanation: "Explanation ${i}"
    difficultyLevel: 1
    tags: []
    subcategory: "Topic"
`
    ).join('');

    const yamlContent = `
category: TestCategory
questions:${questions}
`;

    vi.mocked(storage.getPersonalCategories).mockResolvedValue([]);
    vi.mocked(storage.createPersonalCategory).mockResolvedValue({
      id: 1,
      name: 'TestCategory',
      description: '',
      icon: null,
      tenantId: 1,
      createdAt: new Date(),
    });
    vi.mocked(storage.getPersonalSubcategories).mockResolvedValue([]);
    vi.mocked(storage.createPersonalSubcategory).mockResolvedValue({
      id: 1,
      name: 'Topic',
      categoryId: 1,
      tenantId: 1,
      createdAt: new Date(),
    });
    vi.mocked(storage.createPersonalQuestion).mockResolvedValue({} as any);

    const result = await importPersonalQuestionsFromYAML(yamlContent, userId, tenantId);

    expect(result.success).toBe(true);
    expect(result.questionsImported).toBe(60);
    expect(storage.createPersonalQuestion).toHaveBeenCalledTimes(60);
  });

  it('should handle storage errors gracefully', async () => {
    const yamlContent = `
category: TestCategory
questions:
  - text: "Question?"
    options:
      - id: 0
        text: "A"
      - id: 1
        text: "B"
    correctAnswer: 0
    explanation: "Explanation"
    difficultyLevel: 1
    tags: []
    subcategory: "Topic"
`;

    vi.mocked(storage.getPersonalCategories).mockResolvedValue([]);
    vi.mocked(storage.createPersonalCategory).mockResolvedValue({
      id: 1,
      name: 'TestCategory',
      description: '',
      icon: null,
      tenantId: 1,
      createdAt: new Date(),
    });
    vi.mocked(storage.getPersonalSubcategories).mockResolvedValue([]);
    vi.mocked(storage.createPersonalSubcategory).mockResolvedValue({
      id: 1,
      name: 'Topic',
      categoryId: 1,
      tenantId: 1,
      createdAt: new Date(),
    });
    vi.mocked(storage.createPersonalQuestion).mockRejectedValue(new Error('Storage error'));

    const result = await importPersonalQuestionsFromYAML(yamlContent, userId, tenantId);

    expect(result.success).toBe(true);
    expect(result.questionsImported).toBe(0);
    expect(result.questionsSkipped).toBe(1);
    expect(result.errors[0]).toContain('Failed to import');
    expect(result.errors[0]).toContain('Storage error');
  });
});

describe('importPersonalFromFile', () => {
  const userId = 'test-user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully import from a valid file', async () => {
    const fileContent = `
category: TestCategory
questions:
  - text: "Question?"
    options:
      - id: 0
        text: "A"
      - id: 1
        text: "B"
    correctAnswer: 0
    explanation: "Explanation"
    difficultyLevel: 1
    tags: []
    subcategory: "Topic"
`;

    const file = {
      text: () => Promise.resolve(fileContent),
    } as File;

    vi.mocked(storage.getPersonalCategories).mockResolvedValue([]);
    vi.mocked(storage.createPersonalCategory).mockResolvedValue({
      id: 1,
      name: 'TestCategory',
      description: '',
      icon: null,
      tenantId: 1,
      createdAt: new Date(),
    });
    vi.mocked(storage.getPersonalSubcategories).mockResolvedValue([]);
    vi.mocked(storage.createPersonalSubcategory).mockResolvedValue({
      id: 1,
      name: 'Topic',
      categoryId: 1,
      tenantId: 1,
      createdAt: new Date(),
    });
    vi.mocked(storage.createPersonalQuestion).mockResolvedValue({} as any);

    const result = await importPersonalFromFile(file, userId);

    expect(result.success).toBe(true);
    expect(result.questionsImported).toBe(1);
  });

  it('should handle file read errors', async () => {
    const file = {
      text: () => Promise.reject(new Error('File read error')),
    } as File;

    const result = await importPersonalFromFile(file, userId);

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('File read error');
  });

  it('should handle invalid YAML in file', async () => {
    const fileContent = 'invalid: yaml\nwithout: category';
    const file = {
      text: () => Promise.resolve(fileContent),
    } as File;

    const result = await importPersonalFromFile(file, userId);

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('Invalid YAML structure');
  });
});
