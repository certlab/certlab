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
import { setupMockAuth } from '../utils/auth-helpers';

// Define custom fixture types
type CustomFixtures = {
  authenticatedPage: Page;
};

/**
 * Extended test with custom fixtures
 */
export const test = base.extend<CustomFixtures>({
  /**
   * Provides a page with mock authentication state set up.
   *
   * This fixture automatically sets up a mock authenticated user in sessionStorage
   * before the test runs, allowing tests to access protected routes and features.
   *
   * The mock user has:
   * - id: 'test-user-123'
   * - email: 'test@certlab.app'
   * - firstName: 'Test'
   * - lastName: 'User'
   * - role: 'user'
   * - tenantId: 1
   *
   * Note: This uses addInitScript to inject auth state before page load,
   * so no extra navigation is performed by this fixture.
   */
  authenticatedPage: async ({ page }, use) => {
    // Set up mock authentication via init script (no navigation)
    await setupMockAuth(page);
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
