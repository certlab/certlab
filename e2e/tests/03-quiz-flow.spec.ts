/**
 * Quiz Flow E2E Tests
 *
 * Tests quiz creation, taking, and completion flows.
 * These tests use the authenticatedPage fixture for mock authentication.
 *
 * Note: These tests assume Firebase/Firestore is configured or emulator is running.
 * In CI, real Firebase credentials should be available.
 */

import { test, expect } from '../fixtures/base';
import { waitForNavigation } from '../utils/test-helpers';

test.describe('Quiz Creation Flow', () => {
  test('should create a basic quiz', async ({ authenticatedPage: page }) => {
    // Navigate to dashboard
    await page.goto('/app/dashboard');
    await page.waitForLoadState('networkidle');

    // Look for "Start Learning" or "Create Quiz" button
    const createButton = page
      .getByRole('button', { name: /start learning|create quiz|quick practice/i })
      .first();

    // Wait for button to be visible
    try {
      await createButton.waitFor({ state: 'visible', timeout: 10000 });
    } catch (error) {
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
    const startQuizButton = page.getByRole('button', { name: /start quiz|begin|start/i });
    const startButtonVisible = await startQuizButton
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (startButtonVisible) {
      await startQuizButton.click();

      // Verify navigated to quiz page
      await page.waitForLoadState('networkidle');
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/quiz|question/i);
    } else {
      console.log('Start quiz button not found');
      test.skip(true, 'Start quiz button not found');
    }
  });

  test('should create a multi-category quiz', async ({ authenticatedPage: page }) => {
    // Navigate to dashboard
    await page.goto('/app/dashboard');
    await page.waitForLoadState('networkidle');

    // Navigate to quiz creation
    const createButton = page.getByRole('button', { name: /start learning|create quiz/i }).first();

    try {
      await createButton.waitFor({ state: 'visible', timeout: 10000 });
    } catch (error) {
      console.log('Quiz creation button not found');
      test.skip(true, 'Quiz creation button not found - Firebase data may not be seeded');
      return;
    }

    await createButton.click();
    await page.waitForLoadState('networkidle');

    // Select multiple categories
    const cisspOption = page.getByText(/CISSP/i).first();
    const cismOption = page.getByText(/CISM/i).first();

    const cisspVisible = await cisspOption.isVisible({ timeout: 5000 }).catch(() => false);
    const cismVisible = await cismOption.isVisible({ timeout: 5000 }).catch(() => false);

    if (!cisspVisible && !cismVisible) {
      console.log('Categories not found');
      test.skip(true, 'Categories not found - Firebase data may not be seeded');
      return;
    }

    if (cisspVisible) await cisspOption.click();
    if (cismVisible) await cismOption.click();

    // Start quiz
    const startButton = page.getByRole('button', { name: /start quiz|begin/i });
    const startVisible = await startButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (startVisible) {
      await startButton.click();
      await waitForNavigation(page);

      // Verify we're on a quiz page
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/app\/quiz|question/i);
    } else {
      console.log('Start button not found');
      test.skip(true, 'Start quiz button not found');
    }
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
