/**
 * Import personal questions from YAML files
 * Provides functionality to import user-specific question data into per-user collections
 */

import { storage } from './storage-factory';
import type { Subcategory } from '@shared/schema';
import {
  validateQuestionOptions,
  parseYAMLQuestions,
  type QuestionImportData,
  type YAMLImportData,
  type ImportProgress,
  type ProgressCallback,
  type ImportResult,
} from './question-import-validation';

// Import batch size for optimal performance
const IMPORT_BATCH_SIZE = 50;

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
    const batchSize = IMPORT_BATCH_SIZE;
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

// Re-export types for consumers
export type {
  ImportProgress,
  ImportResult,
  QuestionImportData,
  YAMLImportData,
} from './question-import-validation';
