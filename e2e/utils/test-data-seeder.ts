/**
 * Test Data Seeder for E2E Tests
 *
 * Provides utilities to seed test data for e2e tests.
 * Note: CertLab uses Firestore for storage. Test data seeding relies on
 * existing data in Firestore or uses mock/stub data where appropriate.
 */

import { Page } from '@playwright/test';
import type { TestUser } from './auth-setup';

export interface TestQuiz {
  id: number;
  userId: string;
  title: string;
  categoryIds: number[];
  questions: number[];
  userAnswers: (number | null)[];
  flaggedQuestions: number[];
  mode: 'study' | 'quiz' | 'adaptive';
  score?: number;
  completedAt?: string;
  tenantId: number;
}

/**
 * Setup test environment with auth
 *
 * This simplified setup only handles authentication.
 * Test data (categories, questions) is expected to exist in Firestore already.
 *
 * @param page - Playwright page object
 * @param user - User to authenticate (optional)
 */
export async function setupTestEnvironment(page: Page, user?: TestUser): Promise<void> {
  // Import auth setup dynamically to avoid circular dependencies
  const { setupMockAuth, DEFAULT_TEST_USER } = await import('./auth-setup');

  // Set up authentication
  await setupMockAuth(page, user || DEFAULT_TEST_USER);

  console.log('[Test Environment] Setup complete (auth only - data expected in Firestore)');
}

/**
 * Wait for data to be loaded from Firestore
 *
 * @param page - Playwright page object
 * @param timeout - Timeout in ms (default 10000)
 */
export async function waitForDataLoad(page: Page, timeout = 10000): Promise<void> {
  // Wait for network idle to ensure Firestore data is loaded
  await page.waitForLoadState('networkidle', { timeout });

  // Give a bit more time for React Query to process the data
  await page.waitForTimeout(500);

  console.log('[Test Data] Data load wait completed');
}
