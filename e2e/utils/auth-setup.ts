/**
 * Authentication Setup for E2E Tests
 *
 * Provides utilities to set up authenticated sessions for e2e tests.
 * Works by injecting mock authentication state that bypasses Firebase auth.
 */

import { Page } from '@playwright/test';

export interface TestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: number;
}

/**
 * Default test user for e2e tests
 */
export const DEFAULT_TEST_USER: TestUser = {
  id: 'test-user-e2e',
  email: 'test@certlab.example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'user',
  tenantId: 1,
};

/**
 * Set up mock authentication state for e2e tests
 *
 * This function injects authentication state into the browser's session storage
 * and mocks Firebase configuration to simulate an authenticated user.
 * This allows e2e tests to test authenticated flows without requiring actual Firebase authentication.
 *
 * @param page - Playwright page object
 * @param user - User object to authenticate with (defaults to DEFAULT_TEST_USER)
 */
export async function setupMockAuth(page: Page, user: TestUser = DEFAULT_TEST_USER): Promise<void> {
  // First navigate to the page
  await page.goto('/');

  // Wait for the page to load
  await page.waitForLoadState('domcontentloaded');

  // Inject authentication state and mock Firebase
  await page.addInitScript((userData) => {
    // Mock Firebase configuration check to return false in e2e tests
    // This will trigger the development fallback path that uses local auth
    Object.defineProperty(window, '__FIREBASE_E2E_MOCK__', {
      value: true,
      writable: false,
    });

    // Set auth state in sessionStorage (what the app checks)
    sessionStorage.setItem('certlab_auth_state', 'authenticated');
    sessionStorage.setItem('certlab_auth_user', JSON.stringify(userData));
    sessionStorage.setItem('certlab_auth_timestamp', Date.now().toString());

    console.log('[E2E Auth] Mock authentication configured for user:', userData.email);
  }, user);

  console.log(`[Auth Setup] Mock authentication configured for user: ${user.email}`);
}

/**
 * Clear authentication state
 *
 * @param page - Playwright page object
 */
export async function clearAuth(page: Page): Promise<void> {
  await page.evaluate(() => {
    sessionStorage.removeItem('certlab_auth_state');
    sessionStorage.removeItem('certlab_auth_user');
    sessionStorage.removeItem('certlab_auth_timestamp');
    localStorage.clear();
  });

  console.log('[Auth Setup] Authentication state cleared');
}

/**
 * Verify that user is authenticated
 *
 * @param page - Playwright page object
 * @returns true if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const authState = sessionStorage.getItem('certlab_auth_state');
    return authState === 'authenticated';
  });
}

/**
 * Get current authenticated user
 *
 * @param page - Playwright page object
 * @returns User object or null if not authenticated
 */
export async function getCurrentUser(page: Page): Promise<TestUser | null> {
  return await page.evaluate(() => {
    const authState = sessionStorage.getItem('certlab_auth_state');
    const userJson = sessionStorage.getItem('certlab_auth_user');

    if (authState === 'authenticated' && userJson) {
      try {
        return JSON.parse(userJson) as any;
      } catch {
        return null;
      }
    }

    return null;
  });
}
