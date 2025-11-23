/**
 * Import questions from YAML files
 * Provides functionality to import sample question data into IndexedDB
 */

import yaml from 'js-yaml';
import { clientStorage } from './client-storage';
import type { Category, Subcategory, Question } from '@shared/schema';

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
  errors: string[];
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
    throw new Error(`Failed to parse YAML: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

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
    errors: [],
  };

  try {
    // Parse YAML
    const data = parseYAMLQuestions(yamlContent);
    
    onProgress?.({
      total: data.questions.length,
      current: 0,
      status: `Preparing to import ${data.questions.length} questions for ${data.category}...`,
      category: data.category,
    });

    // Find or create category
    const existingCategories = await clientStorage.getCategories(tenantId);
    let category = existingCategories.find(c => c.name === data.category);
    
    if (!category) {
      category = await clientStorage.createCategory({
        tenantId,
        name: data.category,
        description: data.description || `${data.category} certification questions`,
        icon: data.category === 'CISSP' ? 'shield' : 'briefcase',
      });
      result.categoriesCreated++;
    }

    // Get or create subcategories
    const subcategoryMap = new Map<string, Subcategory>();
    const existingSubcategories = await clientStorage.getSubcategories(category.id, tenantId);
    
    const uniqueSubcategories = Array.from(new Set(data.questions.map(q => q.subcategory)));
    
    onProgress?.({
      total: data.questions.length,
      current: 0,
      status: `Creating ${uniqueSubcategories.length} subcategories...`,
      category: data.category,
    });
    
    for (const subcatName of uniqueSubcategories) {
      let subcat = existingSubcategories.find(s => s.name === subcatName);
      
      if (!subcat) {
        subcat = await clientStorage.createSubcategory({
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
    
    for (let i = 0; i < data.questions.length; i += batchSize) {
      const batch = data.questions.slice(i, i + batchSize);
      
      onProgress?.({
        total: data.questions.length,
        current: i,
        status: `Importing questions ${i + 1}-${Math.min(i + batchSize, data.questions.length)} of ${data.questions.length}...`,
        category: data.category,
      });
      
      for (const questionData of batch) {
        try {
          const subcategory = subcategoryMap.get(questionData.subcategory);
          if (!subcategory) {
            console.error(`Subcategory not found: ${questionData.subcategory}`);
            result.errors.push(`Subcategory not found: ${questionData.subcategory}`);
            continue;
          }
          
          await clientStorage.createQuestion({
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
          result.errors.push(`Failed to import question: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
    result.questionsImported = imported;
    result.success = true;
    
    onProgress?.({
      total: data.questions.length,
      current: data.questions.length,
      status: `Successfully imported ${imported} questions for ${data.category}!`,
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
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Clear all questions for a specific category (useful before re-importing)
 */
export async function clearCategoryQuestions(categoryName: string): Promise<number> {
  const categories = await clientStorage.getCategories();
  const category = categories.find(c => c.name === categoryName);
  
  if (!category) {
    return 0;
  }
  
  const questions = await clientStorage.getQuestionsByCategories([category.id]);
  
  for (const question of questions) {
    await clientStorage.deleteQuestion(question.id);
  }
  
  return questions.length;
}
