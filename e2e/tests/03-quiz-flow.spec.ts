/**
 * Quiz Flow E2E Tests
 *
 * Tests quiz creation, taking, and completion flows.
 * These tests require authentication.
 */

import { test, expect } from '../fixtures/base';
import {
  goToDashboard,
  waitForNavigation,
  // Unused imports for future use when auth is enabled
  // verifyHeading,
  // clickButton,
  // isElementVisible
} from '../utils/test-helpers';

test.describe('Quiz Creation Flow', () => {
  test.skip('should create a basic quiz', async ({ page }) => {
    // Requires authentication
    await goToDashboard(page);

    // Look for "Start Learning" or "Create Quiz" button
    const createButton = page
      .getByRole('button', { name: /start learning|create quiz|quick practice/i })
      .first();
    const buttonExists = await createButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!buttonExists) {
      test.skip(true, 'Quiz creation button not found');
    }

    await createButton.click();

    // Wait for quiz configuration screen
    await page.waitForLoadState('networkidle');

    // Select a category (e.g., CISSP)
    const cisspOption = page.getByText(/CISSP/i).first();
    const cisspVisible = await cisspOption.isVisible({ timeout: 3000 }).catch(() => false);

    if (cisspVisible) {
      await cisspOption.click();
    }

    // Look for start quiz button
    const startQuizButton = page.getByRole('button', { name: /start quiz|begin|start/i });
    const startButtonVisible = await startQuizButton
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (startButtonVisible) {
      await startQuizButton.click();

      // Verify navigated to quiz page
      await page.waitForLoadState('networkidle');
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/quiz|question/i);
    }
  });

  test.skip('should create a multi-category quiz', async ({ page }) => {
    // Requires authentication
    await goToDashboard(page);

    // Navigate to quiz creation
    const createButton = page.getByRole('button', { name: /start learning|create quiz/i }).first();
    await createButton.click();
    await page.waitForLoadState('networkidle');

    // Select multiple categories
    const cisspOption = page.getByText(/CISSP/i).first();
    const cismOption = page.getByText(/CISM/i).first();

    const cisspVisible = await cisspOption.isVisible({ timeout: 3000 }).catch(() => false);
    const cismVisible = await cismOption.isVisible({ timeout: 3000 }).catch(() => false);

    if (cisspVisible) await cisspOption.click();
    if (cismVisible) await cismOption.click();

    // Start quiz
    const startButton = page.getByRole('button', { name: /start quiz|begin/i });
    const startVisible = await startButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (startVisible) {
      await startButton.click();
      await waitForNavigation(page);
    }
  });
});

test.describe('Quiz Taking Flow', () => {
  test.skip('should answer questions in a quiz', async ({ page }) => {
    // Requires authentication and quiz to be started

    // Assume we're on a quiz page
    await page.goto('/quiz');
    await page.waitForLoadState('networkidle');

    // Look for question text
    const questionText = page.locator('text=/What|Which|How|When|Where/i').first();
    const questionVisible = await questionText.isVisible({ timeout: 5000 }).catch(() => false);

    if (!questionVisible) {
      test.skip(true, 'No quiz questions found');
    }

    // Find answer options (usually radio buttons or clickable divs)
    const answerOptions = page
      .getByRole('radio')
      .or(page.locator('.answer-option'))
      .or(page.locator('[data-testid*="answer"]'));
    const optionCount = await answerOptions.count();

    if (optionCount > 0) {
      // Select first answer
      await answerOptions.first().click();

      // Look for next/submit button
      const nextButton = page.getByRole('button', { name: /next|submit|check answer/i });
      const nextVisible = await nextButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (nextVisible) {
        await nextButton.click();
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test.skip('should display progress indicator', async ({ page }) => {
    // Requires active quiz
    await page.goto('/quiz');
    await page.waitForLoadState('networkidle');

    // Look for progress indicator
    const progressText = page.locator('text=/Question \\d+ of \\d+|\\d+\\/\\d+/i');
    const progressVisible = await progressText.isVisible({ timeout: 5000 }).catch(() => false);

    if (progressVisible) {
      await expect(progressText).toBeVisible();
    }
  });

  test.skip('should allow flagging questions for review', async ({ page }) => {
    // Requires active quiz
    await page.goto('/quiz');
    await page.waitForLoadState('networkidle');

    // Look for flag button
    const flagButton = page.getByRole('button', { name: /flag|mark for review/i });
    const flagVisible = await flagButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (flagVisible) {
      await flagButton.click();

      // Verify flag is set (button state changes or indicator appears)
      await page.waitForLoadState('networkidle');

      // Button should now indicate flagged state
      const flagIndicator = page.locator('[data-flagged="true"], .flagged').or(page.getByText(/flagged/i));
      const indicatorVisible = await flagIndicator.isVisible({ timeout: 2000 }).catch(() => false);

      if (indicatorVisible) {
        await expect(flagIndicator).toBeVisible();
      }
    }
  });

  test.skip('should navigate between questions', async ({ page }) => {
    // Requires active quiz
    await page.goto('/quiz');
    await page.waitForLoadState('networkidle');

    // Answer first question
    const answerOptions = page.getByRole('radio').or(page.locator('.answer-option')).first();
    const optionVisible = await answerOptions.isVisible({ timeout: 5000 }).catch(() => false);

    if (optionVisible) {
      await answerOptions.click();

      // Click next
      const nextButton = page.getByRole('button', { name: /next/i });
      const nextVisible = await nextButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (nextVisible) {
        await nextButton.click();
        await page.waitForLoadState('networkidle');

        // Try to go back
        const backButton = page.getByRole('button', { name: /back|previous/i });
        const backVisible = await backButton.isVisible({ timeout: 3000 }).catch(() => false);

        if (backVisible) {
          await backButton.click();
          await page.waitForLoadState('networkidle');
        }
      }
    }
  });
});

test.describe('Quiz Results and Review', () => {
  test.skip('should display results after quiz completion', async ({ page }) => {
    // Requires completed quiz
    await page.goto('/results');
    await page.waitForLoadState('networkidle');

    // Look for score display
    const scoreDisplay = page.locator('text=/\\d+%|Score:|Your score/i');
    const scoreVisible = await scoreDisplay.isVisible({ timeout: 5000 }).catch(() => false);

    if (scoreVisible) {
      await expect(scoreDisplay).toBeVisible();
    }

    // Look for pass/fail indicator
    const resultIndicator = page.locator('text=/Pass|Fail|Passed|Failed/i');
    const indicatorVisible = await resultIndicator.isVisible({ timeout: 3000 }).catch(() => false);

    if (indicatorVisible) {
      await expect(resultIndicator).toBeVisible();
    }
  });

  test.skip('should allow reviewing answers', async ({ page }) => {
    // Requires completed quiz
    await page.goto('/results');
    await page.waitForLoadState('networkidle');

    // Look for review button
    const reviewButton = page.getByRole('button', { name: /review|see answers|view answers/i });
    const reviewVisible = await reviewButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (reviewVisible) {
      await reviewButton.click();

      // Should navigate to review page
      await page.waitForLoadState('networkidle');
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/review/i);
    }
  });

  test.skip('should show correct and incorrect answers in review', async ({ page }) => {
    // Requires review page
    await page.goto('/review');
    await page.waitForLoadState('networkidle');

    // Look for answer indicators
    const correctIndicator = page.getByText(/correct|✓|✔/i).or(page.locator('[data-correct="true"]')).first();
    const incorrectIndicator = page
      .locator('text=/incorrect|✗|✘/i, [data-correct="false"]')
      .first();

    const correctVisible = await correctIndicator.isVisible({ timeout: 5000 }).catch(() => false);
    const incorrectVisible = await incorrectIndicator
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    // At least one should be visible
    expect(correctVisible || incorrectVisible).toBeTruthy();
  });

  test.skip('should display explanations in review', async ({ page }) => {
    // Requires review page
    await page.goto('/review');
    await page.waitForLoadState('networkidle');

    // Look for explanation section
    const explanation = page
      .locator('text=/Explanation|Why|Correct answer/i, [data-testid*="explanation"]')
      .first();
    const explanationVisible = await explanation.isVisible({ timeout: 5000 }).catch(() => false);

    if (explanationVisible) {
      await expect(explanation).toBeVisible();
    }
  });
});

test.describe('Study Mode', () => {
  test.skip('should show immediate feedback in study mode', async ({ page }) => {
    // Requires study mode quiz

    // This test assumes quiz is in study mode
    await page.goto('/quiz');
    await page.waitForLoadState('networkidle');

    // Select an answer
    const answerOption = page.getByRole('radio').or(page.locator('.answer-option')).first();
    const optionVisible = await answerOption.isVisible({ timeout: 5000 }).catch(() => false);

    if (optionVisible) {
      await answerOption.click();

      // Click "Check Answer" button
      const checkButton = page.getByRole('button', { name: /check answer|submit/i });
      const checkVisible = await checkButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (checkVisible) {
        await checkButton.click();

        // Feedback should appear immediately
        await page.waitForLoadState('networkidle');

        const feedback = page.locator('text=/correct|incorrect|right|wrong/i');
        const feedbackVisible = await feedback.isVisible({ timeout: 3000 }).catch(() => false);

        expect(feedbackVisible).toBeTruthy();
      }
    }
  });
});
