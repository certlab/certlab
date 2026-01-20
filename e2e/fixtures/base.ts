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

// Define custom fixture types
type CustomFixtures = {
  authenticatedPage: Page;
};

/**
 * Extended test with custom fixtures
 */
export const test = base.extend<CustomFixtures>({
  /**
   * Provides a page that is pre-authenticated
   * This fixture handles mock authentication for testing
   */
  authenticatedPage: async ({ page }, use) => {
    // Since we're using Firebase auth which requires real credentials,
    // for E2E tests we'll navigate through the normal flow
    // In a real scenario, you might:
    // 1. Use Firebase auth emulator
    // 2. Create test users in Firebase
    // 3. Use Playwright's storage state to persist auth

    // For now, this is a placeholder that just returns the page
    // Tests using this fixture should handle auth themselves
    await use(page);
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
