/**
 * Configuration constants for SearchAndFilter component
 * These can be used to maintain consistent filter settings across pages
 */

export interface FilterConfig {
  showContentTypeFilter: boolean;
  showCompletionFilter: boolean;
  showVisibilityFilter: boolean;
  placeholder?: string;
}

/**
 * Default filter configuration for quiz pages
 */
export const QUIZ_FILTER_CONFIG: FilterConfig = {
  showContentTypeFilter: false,
  showCompletionFilter: false,
  showVisibilityFilter: true,
  placeholder: 'Search quizzes by title, description, or tags...',
};

/**
 * Default filter configuration for material/lecture pages
 */
export const MATERIAL_FILTER_CONFIG: FilterConfig = {
  showContentTypeFilter: false,
  showCompletionFilter: false,
  showVisibilityFilter: true,
  placeholder: 'Search materials by title, description, or tags...',
};

/**
 * Default filter configuration for combined content pages
 */
export const COMBINED_FILTER_CONFIG: FilterConfig = {
  showContentTypeFilter: true,
  showCompletionFilter: true,
  showVisibilityFilter: true,
  placeholder: 'Search by title, description, or tags...',
};
