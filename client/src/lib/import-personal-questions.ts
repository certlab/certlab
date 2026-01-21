/**
 * Import personal questions from YAML files
 * Provides functionality to import user-specific question data into per-user collections
 */

import yaml from 'js-yaml';
import { storage } from './storage-factory';
import type { Subcategory } from '@shared/schema';
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

/**
 * Import questions from YAML data into user's personal question bank
 * Questions are stored in per-user collection: /users/{userId}/personalQuestions
 */
export async function importPersonalQuestionsFromYAML(
  yamlContent: string,
  userId: string,
  tenantId: number = 1,
  onProgress?: ProgressCallback
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    categoriesCreated: 0,
    subcategoriesCreated: 0,
    questionsImported: 0,
    questionsSkipped: 0,
    errors: [],
  };

  try {
    // Parse YAML
    const data = parseYAMLQuestions(yamlContent);

    onProgress?.({
      total: data.questions.length,
      current: 0,
      status: `Validating and preparing to import ${data.questions.length} questions for ${data.category}...`,
      category: data.category,
    });

    // Get user's personal categories or create if doesn't exist
    const existingCategories = await storage.getPersonalCategories(userId);
    let category = existingCategories.find((c) => c.name === data.category);

    if (!category) {
      category = await storage.createPersonalCategory(userId, {
        tenantId,
        name: data.category,
        description: data.description || `${data.category} personal questions`,
        icon: data.category === 'CISSP' ? 'shield' : 'briefcase',
      });
      result.categoriesCreated++;
    }

    // Get or create personal subcategories
    const subcategoryMap = new Map<string, Subcategory>();
    const existingSubcategories = await storage.getPersonalSubcategories(userId, category.id);

    const uniqueSubcategories = Array.from(new Set(data.questions.map((q) => q.subcategory)));

    onProgress?.({
      total: data.questions.length,
      current: 0,
      status: `Creating ${uniqueSubcategories.length} subcategories...`,
      category: data.category,
    });

    for (const subcatName of uniqueSubcategories) {
      let subcat = existingSubcategories.find((s) => s.name === subcatName);

      if (!subcat) {
        subcat = await storage.createPersonalSubcategory(userId, {
          tenantId,
          categoryId: category.id,
          name: subcatName,
          description: `${subcatName} domain questions`,
        });
        result.subcategoriesCreated++;
      }

      subcategoryMap.set(subcatName, subcat);
    }

    // Import questions in batches
    const batchSize = 50;
    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < data.questions.length; i += batchSize) {
      const batch = data.questions.slice(i, i + batchSize);

      onProgress?.({
        total: data.questions.length,
        current: i,
        status: `Importing questions ${i + 1}-${Math.min(i + batchSize, data.questions.length)} of ${data.questions.length}...`,
        category: data.category,
      });

      for (let batchIndex = 0; batchIndex < batch.length; batchIndex++) {
        const questionData = batch[batchIndex];
        const absoluteIndex = i + batchIndex;

        try {
          // Validate question options and correctAnswer before import
          const validationError = validateQuestionOptions(questionData, absoluteIndex);
          if (validationError) {
            console.warn(validationError);
            result.errors.push(validationError);
            skipped++;
            continue;
          }

          const subcategory = subcategoryMap.get(questionData.subcategory);
          if (!subcategory) {
            console.error(`Subcategory not found: ${questionData.subcategory}`);
            result.errors.push(
              `Question ${absoluteIndex + 1}: Subcategory not found: ${questionData.subcategory}`
            );
            skipped++;
            continue;
          }

          await storage.createPersonalQuestion(userId, {
            tenantId,
            categoryId: category.id,
            subcategoryId: subcategory.id,
            text: questionData.text,
            options: questionData.options,
            correctAnswer: questionData.correctAnswer,
            explanation: questionData.explanation,
            difficultyLevel: questionData.difficultyLevel,
            tags: questionData.tags,
          });

          imported++;
        } catch (error) {
          result.errors.push(
            `Question ${absoluteIndex + 1}: Failed to import - ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          skipped++;
        }
      }
    }

    result.questionsImported = imported;
    result.questionsSkipped = skipped;
    result.success = true;

    onProgress?.({
      total: data.questions.length,
      current: data.questions.length,
      status: `Successfully imported ${imported} questions for ${data.category}!${skipped > 0 ? ` (${skipped} skipped due to validation errors)` : ''}`,
      category: data.category,
    });
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return result;
}

/**
 * Import personal questions from a user-uploaded file
 */
export async function importPersonalFromFile(
  file: File,
  userId: string,
  onProgress?: ProgressCallback
): Promise<ImportResult> {
  try {
    const content = await file.text();
    return await importPersonalQuestionsFromYAML(content, userId, 1, onProgress);
  } catch (error) {
    return {
      success: false,
      categoriesCreated: 0,
      subcategoriesCreated: 0,
      questionsImported: 0,
      questionsSkipped: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}
