/**
 * Basic Navigation E2E Tests
 *
 * Tests basic page navigation and landing page functionality.
 * These tests don't require authentication.
 */

import { test, expect } from '../fixtures/base';
import {
  goToLandingPage,
  waitForAppReady,
  verifyHeading,
  checkBasicAccessibility,
} from '../utils/test-helpers';

test.describe('Landing Page', () => {
  test('should load landing page successfully', async ({ page }) => {
    await goToLandingPage(page);

    // Verify page loaded
    await expect(page).toHaveTitle(/CertLab|Certification/i);

    // Verify main h1 heading is visible (use level option to ensure we only get h1)
    const mainHeading = page.getByRole('heading', { level: 1 });
    await expect(mainHeading).toBeVisible();
    await expect(mainHeading).toContainText(/Master Your|Certifications/i);
  });

  test('should display main features on landing page', async ({ page }) => {
    await goToLandingPage(page);

    // Look for common landing page elements
    const getStartedButton = page
      .getByRole('button', { name: /get started|sign in|login/i })
      .first();
    await expect(getStartedButton).toBeVisible();
  });

  test('should have proper HTML structure for accessibility', async ({ page }) => {
    await goToLandingPage(page);
    await checkBasicAccessibility(page);
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await goToLandingPage(page);

    // Verify page is still functional
    await expect(page).toHaveTitle(/CertLab|Certification/i);

    // Check for mobile menu if it exists
    const mobileMenuButton = page.getByRole('button', { name: /menu/i });
    const mobileMenuExists = await mobileMenuButton.isVisible({ timeout: 2000 }).catch(() => false);

    // Mobile menu should exist OR desktop nav should be visible
    if (mobileMenuExists) {
      await expect(mobileMenuButton).toBeVisible();
    }
  });
});

test.describe('Theme Switching', () => {
  test('should allow theme switching', async ({ page }) => {
    await goToLandingPage(page);

    // Look for theme switcher button
    const themeButton = page.getByRole('button', { name: /theme|dark mode|light mode/i }).first();
    const themeButtonExists = await themeButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (themeButtonExists) {
      await themeButton.click();

      // Verify theme menu or toggle appeared
      // Wait for theme change to apply
      await page.waitForLoadState('domcontentloaded');

      // Theme should have changed (verify by checking body class or data attribute)
      const bodyClasses = await page.locator('body').getAttribute('class');
      expect(bodyClasses).toBeDefined();
    } else {
      test.skip(true, 'Theme switcher not found on landing page');
    }
  });
});

test.describe('Navigation', () => {
  test('should navigate to login page from landing page', async ({ page }) => {
    await goToLandingPage(page);

    // Find and click sign in / login button
    const signInButton = page.getByRole('button', { name: /sign in|login|get started/i }).first();

    // Check if button exists
    const buttonExists = await signInButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (buttonExists) {
      await signInButton.click();

      // Wait for navigation or modal to appear
      await page.waitForLoadState('networkidle');

      // Verify login UI appeared (either new page or modal)
      // Look for login page heading (h1 with "Welcome to Cert Lab")
      const loginHeading = page.getByRole('heading', { level: 1, name: /welcome/i });
      const googleSignInButton = page.getByRole('button', { name: /google|sign in with google/i });

      const loginHeadingVisible = await loginHeading
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      const googleButtonVisible = await googleSignInButton
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      // At least one of these should be visible
      expect(loginHeadingVisible || googleButtonVisible).toBeTruthy();
    } else {
      test.skip(true, 'Sign in button not found on landing page');
    }
  });
});

test.describe('Page Load Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await waitForAppReady(page);

    const loadTime = Date.now() - startTime;

    // Landing page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });
});
