// Category access configuration
// Maps category names to their required subscription tiers

export type CategoryAccessLevel = 'basic' | 'pro' | 'all';

// Define which categories are accessible at each level
export const CATEGORY_ACCESS_MAPPING: Record<string, CategoryAccessLevel> = {
  // Basic tier (free) - Entry-level certification
  'CC': 'basic',
  
  // Pro tier required - Advanced certifications
  'CGRC': 'pro',
  'CISA': 'pro',
  'CISM': 'pro',
  'CISSP': 'pro',
  'Cloud+': 'pro',
};

// Helper function to check if a category is accessible based on subscription
export function isCategoryAccessible(
  categoryName: string,
  subscriptionAccess: string[]
): boolean {
  const requiredLevel = CATEGORY_ACCESS_MAPPING[categoryName];
  
  if (!requiredLevel) {
    // If not explicitly mapped, assume it's accessible
    return true;
  }
  
  // Check if user's subscription includes this access level
  if (subscriptionAccess.includes('all')) {
    return true; // 'all' grants access to everything
  }
  
  if (requiredLevel === 'basic' && subscriptionAccess.includes('basic')) {
    return true;
  }
  
  if (requiredLevel === 'pro' && subscriptionAccess.includes('pro')) {
    return true;
  }
  
  return false;
}

// Get the minimum plan required for a category
export function getRequiredPlan(categoryName: string): string {
  const requiredLevel = CATEGORY_ACCESS_MAPPING[categoryName];
  
  switch (requiredLevel) {
    case 'basic':
      return 'Free';
    case 'pro':
      return 'Pro';
    default:
      return 'Free';
  }
}

// Get all accessible categories for a subscription level
export function getAccessibleCategories(
  categories: Array<{ id: number; name: string }>,
  subscriptionAccess: string[]
): number[] {
  return categories
    .filter(cat => isCategoryAccessible(cat.name, subscriptionAccess))
    .map(cat => cat.id);
}

// Get locked categories for a subscription level
export function getLockedCategories(
  categories: Array<{ id: number; name: string }>,
  subscriptionAccess: string[]
): Array<{ id: number; name: string; requiredPlan: string }> {
  return categories
    .filter(cat => !isCategoryAccessible(cat.name, subscriptionAccess))
    .map(cat => ({
      id: cat.id,
      name: cat.name,
      requiredPlan: getRequiredPlan(cat.name)
    }));
}