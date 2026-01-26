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
   * This fixture sets up a mock authenticated user in sessionStorage before
   * the test runs. However, the app's AuthProvider requires Firebase auth and
   * will clear the cached session when Firebase reports null.
   *
   * IMPORTANT: This fixture alone does NOT provide authenticated access to
   * protected routes without Firebase. Tests using this fixture should:
   * 1. Check if navigation was redirected (URL still contains /app/...)
   * 2. Skip gracefully when Firebase auth is not available
   * 3. Or ensure Firebase Auth Emulator/real auth is configured
   *
   * The mock user has:
   * - id: 'test-user-123'
   * - email: 'test@certlab.app'
   * - firstName: 'Test'
   * - lastName: 'User'
   * - role: 'user'
   * - tenantId: 1
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
