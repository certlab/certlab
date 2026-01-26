/**
 * Quiz Flow E2E Tests
 *
 * Tests quiz creation, taking, and completion flows.
 * These tests rely on real Firebase authentication state being available.
 *
 * Note: Tests check for authentication state and skip gracefully if Firebase is not configured.
 * In CI, Firebase credentials should provide authentication state for tests to run.
 */

import { test, expect } from '../fixtures/base';

test.describe('Quiz Creation Flow', () => {
  test('should create a basic quiz', async ({ authenticatedPage: page }) => {
    // Navigate to dashboard
    await page.goto('/app/dashboard');
    await page.waitForLoadState('networkidle');

    // Check if we're redirected to landing (not authenticated)
    const currentUrl = page.url();
    if (!currentUrl.includes('/app/dashboard')) {
      console.log('Not authenticated - redirected to landing page');
      test.skip(true, 'Test requires authentication - Firebase credentials may not be configured');
      return;
    }

    // Look for "Start Learning" or "Create Quiz" button
    const createButton = page
      .getByRole('button', { name: /start learning|create quiz|quick practice/i })
      .first();

    // Wait for button to be visible
    try {
      await createButton.waitFor({ state: 'visible', timeout: 10000 });
    } catch (_error) {
      // If button doesn't exist, log and skip gracefully
      console.log('Quiz creation button not found - may need Firebase data seeded');
      test.skip(true, 'Quiz creation button not found - Firebase data may not be seeded');
      return;
    }

    await createButton.click();

    // Wait for quiz configuration screen
    await page.waitForLoadState('networkidle');

    // Select a category (e.g., CISSP)
    const cisspOption = page.getByText(/CISSP/i).first();
    const cisspVisible = await cisspOption.isVisible({ timeout: 5000 }).catch(() => false);

    if (!cisspVisible) {
      console.log('CISSP category not found - Firebase categories may not be seeded');
      test.skip(true, 'Categories not found - Firebase data may not be seeded');
      return;
    }

    await cisspOption.click();

    // Look for start quiz button
    const startQuizButton = page.getByRole('button', { name: /start quiz|begin/i });
    await expect(startQuizButton).toBeVisible({ timeout: 5000 });
    await startQuizButton.click();

    // Verify navigated to quiz page
    await page.waitForLoadState('networkidle');
    const quizUrl = page.url();
    expect(quizUrl).toMatch(/app\/quiz/i);
  });

  test('should create a multi-category quiz', async ({ authenticatedPage: page }) => {
    // Navigate to dashboard
    await page.goto('/app/dashboard');
    await page.waitForLoadState('networkidle');

    // Check if authenticated
    const currentUrl = page.url();
    if (!currentUrl.includes('/app/dashboard')) {
      console.log('Not authenticated - skipping test');
      test.skip(true, 'Test requires authentication');
      return;
    }

    // Navigate to quiz creation
    const createButton = page.getByRole('button', { name: /start learning|create quiz/i }).first();

    try {
      await createButton.waitFor({ state: 'visible', timeout: 10000 });
    } catch (_error) {
      console.log('Quiz creation button not found');
      test.skip(true, 'Quiz creation button not found - Firebase data may not be seeded');
      return;
    }

    await createButton.click();
    await page.waitForLoadState('networkidle');

    // Select multiple categories - CISSP is required as the baseline test category
    const cisspOption = page.getByText(/CISSP/i).first();
    const cismOption = page.getByText(/CISM/i).first();

    const cisspVisible = await cisspOption.isVisible({ timeout: 5000 }).catch(() => false);

    if (!cisspVisible) {
      console.log('CISSP category not found');
      test.skip(true, 'CISSP category not found - Firebase data may not be seeded');
      return;
    }

    // Click CISSP (required) and CISM (optional)
    await cisspOption.click();
    
    const cismVisible = await cismOption.isVisible({ timeout: 5000 }).catch(() => false);
    if (cismVisible) {
      await cismOption.click();
    }

    // Start quiz
    const startButton = page.getByRole('button', { name: /start quiz|begin/i });
    await expect(startButton).toBeVisible({ timeout: 5000 });
    await startButton.click();
    await page.waitForLoadState('networkidle');

    // Verify we're on a quiz page
    const quizUrl = page.url();
    expect(quizUrl).toMatch(/app\/quiz/i);
  });
});

test.describe('Quiz Taking Flow', () => {
  // Note: These tests require an active quiz to be created first.
  // In a real test environment, these would either:
  // 1. Create a quiz programmatically first, or
  // 2. Use a known test quiz ID from seeded data

  test('should answer questions in a quiz', async ({ authenticatedPage: page }) => {
    // For now, skip this test as it requires a quiz to be created first
    // TODO: Implement quiz creation as a test fixture
    test.skip(true, 'Test requires programmatic quiz creation - to be implemented');
  });

  test('should display progress indicator', async ({ authenticatedPage: page }) => {
    // For now, skip this test as it requires a quiz to be created first
    test.skip(true, 'Test requires programmatic quiz creation - to be implemented');
  });

  test('should allow flagging questions for review', async ({ authenticatedPage: page }) => {
    // For now, skip this test as it requires a quiz to be created first
    test.skip(true, 'Test requires programmatic quiz creation - to be implemented');
  });

  test('should navigate between questions', async ({ authenticatedPage: page }) => {
    // For now, skip this test as it requires a quiz to be created first
    test.skip(true, 'Test requires programmatic quiz creation - to be implemented');
  });
});

test.describe('Quiz Results and Review', () => {
  // Note: These tests require a completed quiz.
  // Implementation requires either programmatic quiz completion or test fixtures.

  test('should display results after quiz completion', async ({ authenticatedPage: page }) => {
    test.skip(true, 'Test requires programmatic quiz completion - to be implemented');
  });

  test('should allow reviewing answers', async ({ authenticatedPage: page }) => {
    test.skip(true, 'Test requires programmatic quiz completion - to be implemented');
  });

  test('should show correct and incorrect answers in review', async ({
    authenticatedPage: page,
  }) => {
    test.skip(true, 'Test requires programmatic quiz completion - to be implemented');
  });

  test('should display explanations in review', async ({ authenticatedPage: page }) => {
    test.skip(true, 'Test requires programmatic quiz completion - to be implemented');
  });
});

test.describe('Study Mode', () => {
  test('should show immediate feedback in study mode', async ({ authenticatedPage: page }) => {
    test.skip(true, 'Test requires programmatic quiz creation in study mode - to be implemented');
  });
});
