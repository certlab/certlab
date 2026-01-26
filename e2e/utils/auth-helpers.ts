/**
 * Authentication Helpers for E2E Tests
 *
 * Provides utilities to set up mock authenticated states for testing
 * protected routes and features without requiring real Firebase authentication.
 */

import { Page } from '@playwright/test';

/**
 * Mock user data for e2e tests
 */
export const mockUser = {
  id: 'test-user-123',
  email: 'test@certlab.app',
  firstName: 'Test',
  lastName: 'User',
  profileImageUrl: null,
  role: 'user',
  tenantId: 1,
};

/**
 * Set up mock authenticated state in sessionStorage.
 *
 * This injects an init script so that the auth state is present in
 * sessionStorage before any application script runs. Call this BEFORE
 * navigating to the app (e.g. before page.goto()).
 *
 * IMPORTANT: This only seeds the optimistic sessionStorage cache. The app's
 * AuthProvider treats firebaseUser as the source of truth and will clear the
 * cached session when Firebase reports null. In CI/clean browser contexts,
 * Firebase configuration is still required for the tests to work correctly.
 * Consider using Firebase Auth Emulator or custom tokens for reliable e2e testing.
 */
export async function setupMockAuth(page: Page) {
  // Use addInitScript to inject auth state before any page scripts run
  await page.addInitScript((user) => {
    window.sessionStorage.setItem('certlab_auth_state', 'authenticated');
    window.sessionStorage.setItem('certlab_auth_user', JSON.stringify(user));
    window.sessionStorage.setItem('certlab_auth_timestamp', Date.now().toString());
  }, mockUser);
}

/**
 * Clear authentication state
 */
export async function clearMockAuth(page: Page) {
  await page.evaluate(() => {
    sessionStorage.removeItem('certlab_auth_state');
    sessionStorage.removeItem('certlab_auth_user');
    sessionStorage.removeItem('certlab_auth_timestamp');
  });
}

/**
 * Check if mock auth is set up correctly
 */
export async function isMockAuthSetup(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const authState = sessionStorage.getItem('certlab_auth_state');
    const userJson = sessionStorage.getItem('certlab_auth_user');
    return authState === 'authenticated' && !!userJson;
  });
}

/**
 * Set up authenticated state and navigate to a protected route
 */
export async function navigateAsAuthenticated(page: Page, url: string) {
  await setupMockAuth(page);
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}
