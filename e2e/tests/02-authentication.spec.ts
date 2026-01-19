/**
 * Authentication Flow E2E Tests
 *
 * Tests user authentication flows including:
 * - Login/logout
 * - Session persistence
 * - Protected route access
 *
 * NOTE: These tests require Firebase Authentication to be configured.
 * For CI/CD, you may need to use Firebase Auth Emulator or mock auth.
 */

import { test, expect } from '../fixtures/base';
import {
  goToLandingPage,
  goToDashboard,
  isAuthenticated,
  waitForNavigation,
  verifyHeading,
} from '../utils/test-helpers';

test.describe('Authentication Flow', () => {
  test('should display login UI when accessing protected routes without auth', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/dashboard');

    // Should be redirected to login or see login modal
    await page.waitForTimeout(2000);

    // Check if we're on landing/login page or see login UI
    const currentUrl = page.url();
    const isOnDashboard = currentUrl.includes('/dashboard');

    if (isOnDashboard) {
      // If on dashboard, there should be login UI visible
      const loginButton = page.getByRole('button', { name: /sign in|login|google/i });
      const loginVisible = await loginButton.isVisible({ timeout: 3000 }).catch(() => false);

      // Either redirected away from dashboard OR login UI is visible
      expect(loginVisible).toBeTruthy();
    } else {
      // Should be redirected to landing or login page
      expect(currentUrl).toMatch(/\/login|\/$/);
    }
  });

  test.skip('should login successfully with Google OAuth', async ({ page }) => {
    // This test is skipped by default as it requires real Firebase credentials
    // To enable:
    // 1. Set up Firebase Auth Emulator OR
    // 2. Use test credentials from environment variables

    await goToLandingPage(page);

    // Click sign in button
    const signInButton = page.getByRole('button', { name: /sign in|login/i }).first();
    await signInButton.click();

    // Click Google sign in button
    const googleButton = page.getByRole('button', { name: /google|sign in with google/i });
    await googleButton.click();

    // Handle Google OAuth popup
    // Note: This requires proper OAuth configuration

    // Verify redirect to dashboard after successful login
    await waitForNavigation(page, /dashboard/);
    await verifyHeading(page, /dashboard/i);

    // Verify user is authenticated
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBeTruthy();
  });

  test.skip('should logout successfully', async ({ page }) => {
    // This test requires authentication to be set up first
    // Skipped by default

    // Assume user is already logged in
    await goToDashboard(page);

    // Verify we're authenticated
    const authBefore = await isAuthenticated(page);
    expect(authBefore).toBeTruthy();

    // Find and click logout button
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
    await logoutButton.click();

    // Wait for logout to complete
    await page.waitForTimeout(2000);

    // Verify we're logged out
    const authAfter = await isAuthenticated(page);
    expect(authAfter).toBeFalsy();

    // Verify redirected to landing page
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/$/);
  });

  test.skip('should persist session after page reload', async ({ page }) => {
    // This test requires authentication to be set up first
    // Skipped by default

    // Assume user is logged in
    await goToDashboard(page);

    // Verify authenticated
    const authBefore = await isAuthenticated(page);
    expect(authBefore).toBeTruthy();

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify still authenticated after reload
    const authAfter = await isAuthenticated(page);
    expect(authAfter).toBeTruthy();

    // Verify still on dashboard
    const currentUrl = page.url();
    expect(currentUrl).toContain('/dashboard');
  });

  test.skip('should clear session after logout and prevent access to protected routes', async ({
    page,
  }) => {
    // This test requires authentication to be set up first
    // Skipped by default

    // Login and navigate to dashboard
    await goToDashboard(page);

    // Logout
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
    await logoutButton.click();
    await page.waitForTimeout(2000);

    // Try to access dashboard again
    await page.goto('/dashboard');

    // Should be redirected or see login UI
    const currentUrl = page.url();
    const isOnDashboard = currentUrl.includes('/dashboard');

    if (isOnDashboard) {
      // If still on dashboard route, login UI should be visible
      const loginButton = page.getByRole('button', { name: /sign in|login/i });
      const loginVisible = await loginButton.isVisible({ timeout: 3000 }).catch(() => false);
      expect(loginVisible).toBeTruthy();
    } else {
      // Should be redirected away
      expect(currentUrl).toMatch(/\/login|\/$/);
    }
  });
});

test.describe('Session Management', () => {
  test('should handle unauthenticated state correctly', async ({ page }) => {
    await goToLandingPage(page);

    // Verify we're not authenticated
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBeFalsy();

    // Verify sign in option is available
    const signInButton = page.getByRole('button', { name: /sign in|login|get started/i }).first();
    const buttonVisible = await signInButton.isVisible({ timeout: 3000 }).catch(() => false);

    expect(buttonVisible).toBeTruthy();
  });

  test.skip('should handle session timeout gracefully', async ({ page }) => {
    // This test would require manipulating session storage/cookies
    // Skipped by default as it requires authentication setup

    // Login
    await goToDashboard(page);

    // Clear session storage to simulate timeout
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });

    // Reload page
    await page.reload();
    await page.waitForTimeout(2000);

    // Should be logged out
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBeFalsy();
  });
});
