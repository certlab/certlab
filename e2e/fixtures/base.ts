/**
 * Test Fixtures and Custom Setup
 *
 * Extends Playwright's base test with custom fixtures for:
 * - Authentication state management
 * - Test data seeding
 * - Common page objects
 */

import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { setupTestEnvironment } from '../utils/test-data-seeder';
import { setupMockAuth, clearAuth } from '../utils/auth-setup';

// Define custom fixture types
type CustomFixtures = {
  authenticatedPage: Page;
};

/**
 * Extended test with custom fixtures
 */
export const test = base.extend<CustomFixtures>({
  /**
   * Provides a page that is pre-authenticated with test data seeded
   * This fixture handles mock authentication and test data setup for testing
   */
  authenticatedPage: async ({ page }, use) => {
    // Set up mock authentication and seed test data
    await setupTestEnvironment(page);

    // Provide the authenticated page to the test
    await use(page);

    // Cleanup: Clear authentication after test
    await clearAuth(page);
  },
});

// Re-export expect for convenience
export { expect };

/**
 * Test data factory functions
 */
export const testData = {
  /**
   * Generate test user data
   */
  generateTestUser: () => ({
    email: `test-${Date.now()}@example.com`,
    firstName: 'Test',
    lastName: 'User',
  }),

  /**
   * Quiz configuration test data
   */
  quizConfig: {
    basic: {
      categories: ['CISSP'],
      questionCount: 10,
      mode: 'study',
    },
    multiCategory: {
      categories: ['CISSP', 'CISM'],
      questionCount: 20,
      mode: 'quiz',
    },
    adaptive: {
      categories: ['CISSP'],
      questionCount: 15,
      mode: 'adaptive',
    },
  },
};
