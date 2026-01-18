/**
 * Test data factories for Category and Subcategory entities
 */
import type { Category, InsertCategory, Subcategory, InsertSubcategory } from '@shared/schema';

/**
 * Default category for testing
 */
const DEFAULT_CATEGORY: Category = {
  id: 1,
  tenantId: 1,
  name: 'Security Management',
  description: 'Security management and governance topics',
  icon: '🔒',
};

/**
 * Creates a test Category with optional overrides
 */
export function createCategory(overrides?: Partial<Category>): Category {
  return {
    ...DEFAULT_CATEGORY,
    ...overrides,
  };
}

/**
 * Creates multiple test categories with sequential IDs
 */
export function createCategories(count: number, baseOverrides?: Partial<Category>): Category[] {
  const categoryNames = [
    'Security Management',
    'Risk Assessment',
    'Asset Security',
    'Communication and Network Security',
    'Identity and Access Management',
    'Security Assessment and Testing',
    'Security Operations',
    'Software Development Security',
  ];

  return Array.from({ length: count }, (_, index) =>
    createCategory({
      ...baseOverrides,
      id: index + 1,
      name: categoryNames[index % categoryNames.length] || `Category ${index + 1}`,
    })
  );
}

/**
 * Creates an InsertCategory object (for creation tests)
 */
export function createInsertCategory(overrides?: Partial<InsertCategory>): InsertCategory {
  return {
    tenantId: overrides?.tenantId || 1,
    name: overrides?.name || 'New Category',
    description: overrides?.description || 'A new test category',
    icon: overrides?.icon || '📚',
  };
}

/**
 * Default subcategory for testing
 */
const DEFAULT_SUBCATEGORY: Subcategory = {
  id: 1,
  tenantId: 1,
  categoryId: 1,
  name: 'Security Policies',
  description: 'Security policy development and implementation',
};

/**
 * Creates a test Subcategory with optional overrides
 */
export function createSubcategory(overrides?: Partial<Subcategory>): Subcategory {
  return {
    ...DEFAULT_SUBCATEGORY,
    ...overrides,
  };
}

/**
 * Creates multiple test subcategories for a category
 */
export function createSubcategories(
  count: number,
  categoryId: number,
  baseOverrides?: Partial<Subcategory>
): Subcategory[] {
  const subcategoryNames = [
    'Security Policies',
    'Risk Management',
    'Compliance and Auditing',
    'Incident Response',
    'Business Continuity',
    'Security Architecture',
    'Cryptography',
    'Access Controls',
  ];

  return Array.from({ length: count }, (_, index) =>
    createSubcategory({
      ...baseOverrides,
      id: index + 1,
      categoryId,
      name: subcategoryNames[index % subcategoryNames.length] || `Subcategory ${index + 1}`,
    })
  );
}

/**
 * Creates an InsertSubcategory object (for creation tests)
 */
export function createInsertSubcategory(overrides?: Partial<InsertSubcategory>): InsertSubcategory {
  return {
    tenantId: overrides?.tenantId || 1,
    categoryId: overrides?.categoryId || 1,
    name: overrides?.name || 'New Subcategory',
    description: overrides?.description || 'A new test subcategory',
  };
}
