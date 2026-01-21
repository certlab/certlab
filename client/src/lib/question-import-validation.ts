/**
 * Shared validation utilities for YAML question imports
 * Used by both admin import and personal import functionality
 */

import yaml from 'js-yaml';
import { questionOptionsSchema, validateCorrectAnswer } from '@shared/schema';

export interface QuestionImportData {
  text: string;
  options: Array<{ id: number; text: string }>;
  correctAnswer: number;
  explanation: string;
  difficultyLevel: number;
  tags: string[];
  subcategory: string;
}

export interface YAMLImportData {
  category: string;
  description?: string;
  questions: QuestionImportData[];
}

export interface ImportProgress {
  total: number;
  current: number;
  status: string;
  category?: string;
}

export type ProgressCallback = (progress: ImportProgress) => void;

export interface ImportResult {
  success: boolean;
  categoriesCreated: number;
  subcategoriesCreated: number;
  questionsImported: number;
  questionsSkipped: number;
  errors: string[];
}

/**
 * Validates a single question's options and correctAnswer
 * @returns Error message if invalid, null if valid
 */
export function validateQuestionOptions(
  question: QuestionImportData,
  questionIndex: number
): string | null {
  // Validate options structure using Zod schema
  const optionsResult = questionOptionsSchema.safeParse(question.options);
  if (!optionsResult.success) {
    return `Question ${questionIndex + 1}: Invalid options structure - ${optionsResult.error.message}`;
  }

  // Validate correctAnswer matches an option ID
  if (!validateCorrectAnswer(optionsResult.data, question.correctAnswer)) {
    const optionIds = optionsResult.data.map((o) => o.id).join(', ');
    return `Question ${questionIndex + 1}: correctAnswer ${question.correctAnswer} does not match any option ID. Valid IDs: ${optionIds}`;
  }

  return null;
}

/**
 * Parse YAML content and validate structure
 */
export function parseYAMLQuestions(yamlContent: string): YAMLImportData {
  try {
    const data = yaml.load(yamlContent) as YAMLImportData;

    if (!data.category || !data.questions || !Array.isArray(data.questions)) {
      throw new Error('Invalid YAML structure: must contain category and questions array');
    }

    return data;
  } catch (error) {
    throw new Error(
      `Failed to parse YAML: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
