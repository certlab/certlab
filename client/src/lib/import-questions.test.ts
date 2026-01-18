/**
 * Tests for import-questions.ts
 * Comprehensive test coverage for YAML import functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateQuestionOptions,
  parseYAMLQuestions,
  importQuestionsFromYAML,
  importFromBundledYAML,
  importFromFile,
  clearCategoryQuestions,
  type QuestionImportData,
  type YAMLImportData,
  type ImportResult,
  type ImportProgress,
} from './import-questions';

// Mock the storage factory
vi.mock('./storage-factory', () => ({
  storage: {
    getCategories: vi.fn(),
    createCategory: vi.fn(),
    getSubcategories: vi.fn(),
    createSubcategory: vi.fn(),
    createQuestion: vi.fn(),
    getQuestionsByCategories: vi.fn(),
    deleteQuestion: vi.fn(),
  },
}));

describe('validateQuestionOptions', () => {
  it('should return null for valid question with correct options', () => {
    const question: QuestionImportData = {
      text: 'What is 2+2?',
      options: [
        { id: 0, text: 'Three' },
        { id: 1, text: 'Four' },
        { id: 2, text: 'Five' },
      ],
      correctAnswer: 1,
      explanation: 'Basic math',
      difficultyLevel: 1,
      tags: ['math'],
      subcategory: 'Arithmetic',
    };

    const result = validateQuestionOptions(question, 0);
    expect(result).toBeNull();
  });

  it('should return error for correctAnswer not matching any option ID', () => {
    const question: QuestionImportData = {
      text: 'Question?',
      options: [
        { id: 0, text: 'A' },
        { id: 1, text: 'B' },
      ],
      correctAnswer: 5, // Invalid
      explanation: 'Explanation',
      difficultyLevel: 1,
      tags: [],
      subcategory: 'Test',
    };

    const result = validateQuestionOptions(question, 0);
    expect(result).not.toBeNull();
    expect(result).toContain('Question 1');
    expect(result).toContain('correctAnswer 5');
    expect(result).toContain('does not match any option ID');
  });

  it('should return error for invalid options structure (less than 2 options)', () => {
    const question: QuestionImportData = {
      text: 'Question?',
      options: [{ id: 0, text: 'Only one' }],
      correctAnswer: 0,
      explanation: 'Explanation',
      difficultyLevel: 1,
      tags: [],
      subcategory: 'Test',
    };

    const result = validateQuestionOptions(question, 0);
    expect(result).not.toBeNull();
    expect(result).toContain('Question 1');
    expect(result).toContain('Invalid options structure');
  });

  it('should validate question with maximum 10 options', () => {
    const options = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      text: `Option ${i}`,
    }));

    const question: QuestionImportData = {
      text: 'Question with max options?',
      options,
      correctAnswer: 5,
      explanation: 'Explanation',
      difficultyLevel: 1,
      tags: [],
      subcategory: 'Test',
    };

    const result = validateQuestionOptions(question, 0);
    expect(result).toBeNull();
  });

  it('should return error for more than 10 options', () => {
    const options = Array.from({ length: 11 }, (_, i) => ({
      id: i,
      text: `Option ${i}`,
    }));

    const question: QuestionImportData = {
      text: 'Question with too many options?',
      options,
      correctAnswer: 5,
      explanation: 'Explanation',
      difficultyLevel: 1,
      tags: [],
      subcategory: 'Test',
    };

    const result = validateQuestionOptions(question, 0);
    expect(result).not.toBeNull();
    expect(result).toContain('Invalid options structure');
  });

  it('should include question index in error messages', () => {
    const question: QuestionImportData = {
      text: 'Question?',
      options: [{ id: 0, text: 'Only one' }],
      correctAnswer: 0,
      explanation: 'Explanation',
      difficultyLevel: 1,
      tags: [],
      subcategory: 'Test',
    };

    const result = validateQuestionOptions(question, 42);
    expect(result).toContain('Question 43'); // 0-indexed, so 42 + 1 = 43
  });
});

describe('parseYAMLQuestions', () => {
  it('should parse valid YAML with all required fields', () => {
    const yamlContent = `
category: CISSP
description: Test questions
questions:
  - text: "Test question?"
    options:
      - id: 0
        text: "Option A"
      - id: 1
        text: "Option B"
    correctAnswer: 1
    explanation: "Explanation"
    difficultyLevel: 2
    tags: ["tag1", "tag2"]
    subcategory: "Security"
`;

    const result = parseYAMLQuestions(yamlContent);
    expect(result.category).toBe('CISSP');
    expect(result.description).toBe('Test questions');
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].text).toBe('Test question?');
    expect(result.questions[0].options).toHaveLength(2);
    expect(result.questions[0].correctAnswer).toBe(1);
    expect(result.questions[0].tags).toEqual(['tag1', 'tag2']);
  });

  it('should parse YAML without description field', () => {
    const yamlContent = `
category: CISM
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
    subcategory: "Management"
`;

    const result = parseYAMLQuestions(yamlContent);
    expect(result.category).toBe('CISM');
    expect(result.description).toBeUndefined();
    expect(result.questions).toHaveLength(1);
  });

  it('should throw error for missing category field', () => {
    const yamlContent = `
questions:
  - text: "Question?"
    options:
      - id: 0
        text: "A"
`;

    expect(() => parseYAMLQuestions(yamlContent)).toThrow(
      'Invalid YAML structure: must contain category and questions array'
    );
  });

  it('should throw error for missing questions array', () => {
    const yamlContent = `
category: CISSP
description: Test
`;

    expect(() => parseYAMLQuestions(yamlContent)).toThrow(
      'Invalid YAML structure: must contain category and questions array'
    );
  });

  it('should throw error for invalid YAML syntax', () => {
    const yamlContent = `
category: CISSP
questions: [invalid yaml syntax {{{
`;

    expect(() => parseYAMLQuestions(yamlContent)).toThrow('Failed to parse YAML');
  });

  it('should parse questions with empty tags array', () => {
    const yamlContent = `
category: CISSP
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
    subcategory: "Test"
`;

    const result = parseYAMLQuestions(yamlContent);
    expect(result.questions[0].tags).toEqual([]);
  });

  it('should parse questions with empty explanation', () => {
    const yamlContent = `
category: CISSP
questions:
  - text: "Question?"
    options:
      - id: 0
        text: "A"
      - id: 1
        text: "B"
    correctAnswer: 0
    explanation: ""
    difficultyLevel: 1
    tags: []
    subcategory: "Test"
`;

    const result = parseYAMLQuestions(yamlContent);
    expect(result.questions[0].explanation).toBe('');
  });

  it('should parse questions with high difficulty level', () => {
    const yamlContent = `
category: CISSP
questions:
  - text: "Hard question?"
    options:
      - id: 0
        text: "A"
      - id: 1
        text: "B"
    correctAnswer: 0
    explanation: "Explanation"
    difficultyLevel: 5
    tags: ["advanced"]
    subcategory: "Advanced Topics"
`;

    const result = parseYAMLQuestions(yamlContent);
    expect(result.questions[0].difficultyLevel).toBe(5);
  });
});

describe('importQuestionsFromYAML', () => {
  let mockStorage: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const storageModule = await import('./storage-factory');
    mockStorage = storageModule.storage;

    // Default mock implementations
    mockStorage.getCategories.mockResolvedValue([]);
    mockStorage.createCategory.mockResolvedValue({
      id: 1,
      name: 'CISSP',
      description: 'Test',
      icon: 'shield',
    });
    mockStorage.getSubcategories.mockResolvedValue([]);
    mockStorage.createSubcategory.mockResolvedValue({
      id: 1,
      categoryId: 1,
      name: 'Security',
      description: 'Test',
    });
    mockStorage.createQuestion.mockResolvedValue({ id: 1 });
  });

  it('should import questions successfully with all new categories', async () => {
    const yamlContent = `
category: CISSP
description: Test questions
questions:
  - text: "Question 1?"
    options:
      - id: 0
        text: "A"
      - id: 1
        text: "B"
    correctAnswer: 1
    explanation: "Explanation"
    difficultyLevel: 1
    tags: ["test"]
    subcategory: "Security"
`;

    const result = await importQuestionsFromYAML(yamlContent);

    expect(result.success).toBe(true);
    expect(result.categoriesCreated).toBe(1);
    expect(result.subcategoriesCreated).toBe(1);
    expect(result.questionsImported).toBe(1);
    expect(result.questionsSkipped).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(mockStorage.createCategory).toHaveBeenCalledTimes(1);
    expect(mockStorage.createSubcategory).toHaveBeenCalledTimes(1);
    expect(mockStorage.createQuestion).toHaveBeenCalledTimes(1);
  });

  it('should use existing category if it already exists', async () => {
    mockStorage.getCategories.mockResolvedValue([
      { id: 1, name: 'CISSP', description: 'Existing', icon: 'shield' },
    ]);

    const yamlContent = `
category: CISSP
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
    subcategory: "Security"
`;

    const result = await importQuestionsFromYAML(yamlContent);

    expect(result.success).toBe(true);
    expect(result.categoriesCreated).toBe(0);
    expect(mockStorage.createCategory).not.toHaveBeenCalled();
  });

  it('should use existing subcategory if it already exists', async () => {
    mockStorage.getCategories.mockResolvedValue([
      { id: 1, name: 'CISSP', description: 'Test', icon: 'shield' },
    ]);
    mockStorage.getSubcategories.mockResolvedValue([
      { id: 1, categoryId: 1, name: 'Security', description: 'Existing' },
    ]);

    const yamlContent = `
category: CISSP
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
    subcategory: "Security"
`;

    const result = await importQuestionsFromYAML(yamlContent);

    expect(result.success).toBe(true);
    expect(result.subcategoriesCreated).toBe(0);
    expect(mockStorage.createSubcategory).not.toHaveBeenCalled();
  });

  it('should skip invalid questions and continue importing valid ones', async () => {
    const yamlContent = `
category: CISSP
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
    subcategory: "Security"
  - text: "Invalid question?"
    options:
      - id: 0
        text: "Only one"
    correctAnswer: 0
    explanation: "Explanation"
    difficultyLevel: 1
    tags: []
    subcategory: "Security"
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
    subcategory: "Security"
`;

    const result = await importQuestionsFromYAML(yamlContent);

    expect(result.success).toBe(true);
    expect(result.questionsImported).toBe(2);
    expect(result.questionsSkipped).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Question 2');
  });

  it('should call progress callback during import', async () => {
    const progressCallback = vi.fn();
    const yamlContent = `
category: CISSP
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
    subcategory: "Security"
`;

    await importQuestionsFromYAML(yamlContent, 1, progressCallback);

    expect(progressCallback).toHaveBeenCalled();
    const calls = progressCallback.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0][0]).toHaveProperty('total');
    expect(calls[0][0]).toHaveProperty('current');
    expect(calls[0][0]).toHaveProperty('status');
  });

  it('should handle batch import of 50+ questions', async () => {
    const questions = Array.from({ length: 55 }, (_, i) => ({
      text: `Question ${i}?`,
      options: [
        { id: 0, text: 'A' },
        { id: 1, text: 'B' },
      ],
      correctAnswer: 0,
      explanation: 'Explanation',
      difficultyLevel: 1,
      tags: [],
      subcategory: 'Security',
    }));

    const yamlData: YAMLImportData = {
      category: 'CISSP',
      questions,
    };

    const yamlContent = JSON.stringify(yamlData);
    // Mock yaml.load to return our data
    vi.doMock('js-yaml', () => ({
      load: vi.fn(() => yamlData),
    }));

    const result = await importQuestionsFromYAML(yamlContent);

    expect(result.success).toBe(true);
    expect(result.questionsImported).toBe(55);
    expect(mockStorage.createQuestion).toHaveBeenCalledTimes(55);
  });

  it('should create multiple subcategories when needed', async () => {
    const yamlContent = `
category: CISSP
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
    subcategory: "Security"
  - text: "Question 2?"
    options:
      - id: 0
        text: "A"
      - id: 1
        text: "B"
    correctAnswer: 0
    explanation: "Explanation"
    difficultyLevel: 1
    tags: []
    subcategory: "Risk Management"
  - text: "Question 3?"
    options:
      - id: 0
        text: "A"
      - id: 1
        text: "B"
    correctAnswer: 0
    explanation: "Explanation"
    difficultyLevel: 1
    tags: []
    subcategory: "Security"
`;

    const result = await importQuestionsFromYAML(yamlContent);

    expect(result.success).toBe(true);
    expect(result.subcategoriesCreated).toBe(2);
    expect(mockStorage.createSubcategory).toHaveBeenCalledTimes(2);
  });

  it('should handle questions with edge case: empty tags', async () => {
    const yamlContent = `
category: CISSP
questions:
  - text: "Question without tags?"
    options:
      - id: 0
        text: "A"
      - id: 1
        text: "B"
    correctAnswer: 0
    explanation: "Explanation"
    difficultyLevel: 1
    tags: []
    subcategory: "Security"
`;

    const result = await importQuestionsFromYAML(yamlContent);

    expect(result.success).toBe(true);
    expect(result.questionsImported).toBe(1);
    expect(mockStorage.createQuestion).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: [],
      })
    );
  });

  it('should handle questions with edge case: empty explanation', async () => {
    const yamlContent = `
category: CISSP
questions:
  - text: "Question without explanation?"
    options:
      - id: 0
        text: "A"
      - id: 1
        text: "B"
    correctAnswer: 0
    explanation: ""
    difficultyLevel: 1
    tags: []
    subcategory: "Security"
`;

    const result = await importQuestionsFromYAML(yamlContent);

    expect(result.success).toBe(true);
    expect(result.questionsImported).toBe(1);
    expect(mockStorage.createQuestion).toHaveBeenCalledWith(
      expect.objectContaining({
        explanation: '',
      })
    );
  });

  it('should return error when YAML parsing fails', async () => {
    const invalidYaml = 'invalid: yaml: content: {{{';

    const result = await importQuestionsFromYAML(invalidYaml);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Failed to parse YAML');
  });

  it('should handle storage errors gracefully', async () => {
    mockStorage.createQuestion.mockRejectedValue(new Error('Storage error'));

    const yamlContent = `
category: CISSP
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
    subcategory: "Security"
`;

    const result = await importQuestionsFromYAML(yamlContent);

    expect(result.success).toBe(true); // Overall import succeeds
    expect(result.questionsImported).toBe(0);
    expect(result.questionsSkipped).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Storage error');
  });

  it('should set correct icon for CISSP category', async () => {
    const yamlContent = `
category: CISSP
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
    subcategory: "Security"
`;

    await importQuestionsFromYAML(yamlContent);

    expect(mockStorage.createCategory).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: 'shield',
      })
    );
  });

  it('should set correct icon for CISM category', async () => {
    const yamlContent = `
category: CISM
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
    subcategory: "Management"
`;

    await importQuestionsFromYAML(yamlContent);

    expect(mockStorage.createCategory).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: 'briefcase',
      })
    );
  });
});

describe('importFromBundledYAML', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should fetch CISSP questions from bundled file', async () => {
    const mockYamlContent = `
category: CISSP
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
    subcategory: "Security"
`;

    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: async () => mockYamlContent,
    });

    const storageModule = await import('./storage-factory');
    const mockStorage = storageModule.storage as any;
    mockStorage.getCategories.mockResolvedValue([]);
    mockStorage.createCategory.mockResolvedValue({ id: 1, name: 'CISSP' });
    mockStorage.getSubcategories.mockResolvedValue([]);
    mockStorage.createSubcategory.mockResolvedValue({ id: 1, categoryId: 1 });
    mockStorage.createQuestion.mockResolvedValue({ id: 1 });

    const result = await importFromBundledYAML('CISSP');

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('cissp-questions.yaml'));
    expect(result.success).toBe(true);
  });

  it('should fetch CISM questions from bundled file', async () => {
    const mockYamlContent = `
category: CISM
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
    subcategory: "Management"
`;

    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: async () => mockYamlContent,
    });

    const storageModule = await import('./storage-factory');
    const mockStorage = storageModule.storage as any;
    mockStorage.getCategories.mockResolvedValue([]);
    mockStorage.createCategory.mockResolvedValue({ id: 1, name: 'CISM' });
    mockStorage.getSubcategories.mockResolvedValue([]);
    mockStorage.createSubcategory.mockResolvedValue({ id: 1, categoryId: 1 });
    mockStorage.createQuestion.mockResolvedValue({ id: 1 });

    const result = await importFromBundledYAML('CISM');

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('cism-questions.yaml'));
    expect(result.success).toBe(true);
  });

  it('should return error when fetch fails', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
    });

    const result = await importFromBundledYAML('CISSP');

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Failed to load CISSP questions');
  });

  it('should handle network errors', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    const result = await importFromBundledYAML('CISSP');

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Network error');
  });

  it('should call progress callback during bundled import', async () => {
    const mockYamlContent = `
category: CISSP
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
    subcategory: "Security"
`;

    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: async () => mockYamlContent,
    });

    const storageModule = await import('./storage-factory');
    const mockStorage = storageModule.storage as any;
    mockStorage.getCategories.mockResolvedValue([]);
    mockStorage.createCategory.mockResolvedValue({ id: 1, name: 'CISSP' });
    mockStorage.getSubcategories.mockResolvedValue([]);
    mockStorage.createSubcategory.mockResolvedValue({ id: 1, categoryId: 1 });
    mockStorage.createQuestion.mockResolvedValue({ id: 1 });

    const progressCallback = vi.fn();
    await importFromBundledYAML('CISSP', progressCallback);

    expect(progressCallback).toHaveBeenCalled();
  });
});

describe('importFromFile', () => {
  let mockStorage: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const storageModule = await import('./storage-factory');
    mockStorage = storageModule.storage;
    mockStorage.getCategories.mockResolvedValue([]);
    mockStorage.createCategory.mockResolvedValue({ id: 1, name: 'Test' });
    mockStorage.getSubcategories.mockResolvedValue([]);
    mockStorage.createSubcategory.mockResolvedValue({ id: 1, categoryId: 1 });
    mockStorage.createQuestion.mockResolvedValue({ id: 1 });
  });

  it('should import from a valid File object', async () => {
    const yamlContent = `
category: Custom
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
    subcategory: "Test"
`;

    // Mock File object with text() method
    const file = {
      name: 'test.yaml',
      type: 'text/yaml',
      text: async () => yamlContent,
    } as File;

    const result = await importFromFile(file);

    expect(result.success).toBe(true);
    expect(result.questionsImported).toBe(1);
  });

  it('should handle file read errors', async () => {
    const badFile = {
      text: () => Promise.reject(new Error('File read error')),
    } as File;

    const result = await importFromFile(badFile);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('File read error');
  });

  it('should call progress callback during file import', async () => {
    const yamlContent = `
category: Custom
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
    subcategory: "Test"
`;

    // Mock File object with text() method
    const file = {
      name: 'test.yaml',
      type: 'text/yaml',
      text: async () => yamlContent,
    } as File;
    const progressCallback = vi.fn();

    await importFromFile(file, progressCallback);

    expect(progressCallback).toHaveBeenCalled();
  });
});

describe('clearCategoryQuestions', () => {
  let mockStorage: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const storageModule = await import('./storage-factory');
    mockStorage = storageModule.storage;
  });

  it('should delete all questions for a category', async () => {
    mockStorage.getCategories.mockResolvedValue([{ id: 1, name: 'CISSP', description: 'Test' }]);
    mockStorage.getQuestionsByCategories.mockResolvedValue([
      { id: 1, text: 'Q1' },
      { id: 2, text: 'Q2' },
      { id: 3, text: 'Q3' },
    ]);
    mockStorage.deleteQuestion.mockResolvedValue(undefined);

    const deleted = await clearCategoryQuestions('CISSP');

    expect(deleted).toBe(3);
    expect(mockStorage.deleteQuestion).toHaveBeenCalledTimes(3);
    expect(mockStorage.deleteQuestion).toHaveBeenCalledWith(1);
    expect(mockStorage.deleteQuestion).toHaveBeenCalledWith(2);
    expect(mockStorage.deleteQuestion).toHaveBeenCalledWith(3);
  });

  it('should return 0 when category does not exist', async () => {
    mockStorage.getCategories.mockResolvedValue([{ id: 1, name: 'CISSP', description: 'Test' }]);

    const deleted = await clearCategoryQuestions('NonExistent');

    expect(deleted).toBe(0);
    expect(mockStorage.getQuestionsByCategories).not.toHaveBeenCalled();
    expect(mockStorage.deleteQuestion).not.toHaveBeenCalled();
  });

  it('should return 0 when category has no questions', async () => {
    mockStorage.getCategories.mockResolvedValue([{ id: 1, name: 'CISSP', description: 'Test' }]);
    mockStorage.getQuestionsByCategories.mockResolvedValue([]);

    const deleted = await clearCategoryQuestions('CISSP');

    expect(deleted).toBe(0);
    expect(mockStorage.deleteQuestion).not.toHaveBeenCalled();
  });

  it('should handle single question deletion', async () => {
    mockStorage.getCategories.mockResolvedValue([{ id: 1, name: 'CISM', description: 'Test' }]);
    mockStorage.getQuestionsByCategories.mockResolvedValue([{ id: 42, text: 'Q1' }]);
    mockStorage.deleteQuestion.mockResolvedValue(undefined);

    const deleted = await clearCategoryQuestions('CISM');

    expect(deleted).toBe(1);
    expect(mockStorage.deleteQuestion).toHaveBeenCalledTimes(1);
    expect(mockStorage.deleteQuestion).toHaveBeenCalledWith(42);
  });
});
