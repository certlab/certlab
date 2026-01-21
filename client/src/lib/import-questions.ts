/**
 * Import questions from YAML files
 * Provides functionality to import sample question data into IndexedDB
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

/**
 * Import questions from YAML data into IndexedDB
 */
export async function importQuestionsFromYAML(
  yamlContent: string,
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

    // Find or create category
    const existingCategories = await storage.getCategories(tenantId);
    let category = existingCategories.find((c) => c.name === data.category);

    if (!category) {
      category = await storage.createCategory({
        tenantId,
        name: data.category,
        description: data.description || `${data.category} certification questions`,
        icon: data.category === 'CISSP' ? 'shield' : 'briefcase',
      });
      result.categoriesCreated++;
    }

    // Get or create subcategories
    const subcategoryMap = new Map<string, Subcategory>();
    const existingSubcategories = await storage.getSubcategories(category.id, tenantId);

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
        subcat = await storage.createSubcategory({
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
    // Batch size of 50 was chosen as a balance between IndexedDB transaction performance
    // and UI responsiveness. Empirically, batches of 50 provide good throughput without
    // causing UI freezes or exceeding transaction limits.
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

          await storage.createQuestion({
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
 * Load and import questions from a bundled YAML file
 */
export async function importFromBundledYAML(
  categoryName: 'CISSP' | 'CISM',
  onProgress?: ProgressCallback
): Promise<ImportResult> {
  try {
    // Dynamically import the YAML file from public directory
    // Use BASE_URL to ensure correct path for GitHub Pages deployment (e.g., /certlab/)
    // Ensure proper path separator handling - BASE_URL already includes trailing slash
    const fileName = categoryName.toLowerCase();
    const baseUrl = import.meta.env.BASE_URL || '/';
    const dataPath = baseUrl.endsWith('/') ? 'data' : '/data';
    const response = await fetch(`${baseUrl}${dataPath}/${fileName}-questions.yaml`);

    if (!response.ok) {
      throw new Error(`Failed to load ${categoryName} questions: ${response.statusText}`);
    }

    const yamlContent = await response.text();
    return await importQuestionsFromYAML(yamlContent, 1, onProgress);
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

/**
 * Import questions from a user-uploaded file
 */
export async function importFromFile(
  file: File,
  onProgress?: ProgressCallback
): Promise<ImportResult> {
  try {
    const content = await file.text();
    return await importQuestionsFromYAML(content, 1, onProgress);
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

/**
 * Clear all questions for a specific category (useful before re-importing)
 */
export async function clearCategoryQuestions(categoryName: string): Promise<number> {
  const categories = await storage.getCategories();
  const category = categories.find((c) => c.name === categoryName);

  if (!category) {
    return 0;
  }

  const questions = await storage.getQuestionsByCategories([category.id]);

  for (const question of questions) {
    await storage.deleteQuestion(question.id);
  }

  return questions.length;
}

// Re-export types and functions for consumers
export {
  validateQuestionOptions,
  parseYAMLQuestions,
  type QuestionImportData,
  type YAMLImportData,
  type ImportProgress,
  type ProgressCallback,
  type ImportResult,
} from './question-import-validation';
