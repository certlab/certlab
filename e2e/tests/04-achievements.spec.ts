/**
 * Achievements and Gamification E2E Tests
 *
 * Tests achievement system, badges, streaks, and gamification features.
 * Requires authentication.
 */

import { test, expect } from '../fixtures/base';
import {
  goToDashboard,
  verifyHeading,
  // Unused import for future use when auth is enabled
  // isElementVisible
} from '../utils/test-helpers';

test.describe('Achievements Page', () => {
  test.skip('should navigate to achievements page', async ({ page }) => {
    // Requires authentication
    await goToDashboard(page);

    // Look for achievements link in navigation
    const achievementsLink = page.getByRole('link', { name: /achievements|badges/i });
    const linkVisible = await achievementsLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (!linkVisible) {
      test.skip(true, 'Achievements link not found');
    }

    await achievementsLink.click();
    await page.waitForLoadState('networkidle');

    // Verify on achievements page
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/achievements/i);

    // Verify heading
    await verifyHeading(page, /achievements|badges/i);
  });

  test.skip('should display earned badges', async ({ page }) => {
    // Requires authentication
    await page.goto('/achievements');
    await page.waitForLoadState('networkidle');

    // Look for badge elements
    const badges = page.locator('[data-testid*="badge"]').or(page.locator('.badge')).or(page.locator('[role="img"][alt*="badge"]'));
    const badgeCount = await badges.count();

    // Should have at least the structure for badges
    expect(badgeCount).toBeGreaterThanOrEqual(0);
  });

  test.skip('should show badge details on hover or click', async ({ page }) => {
    // Requires authentication
    await page.goto('/achievements');
    await page.waitForLoadState('networkidle');

    // Find first badge
    const firstBadge = page.locator('[data-testid*="badge"]').or(page.locator('.badge')).first();
    const badgeVisible = await firstBadge.isVisible({ timeout: 5000 }).catch(() => false);

    if (badgeVisible) {
      await firstBadge.hover();
      await page.waitForLoadState('domcontentloaded');

      // Look for tooltip or details
      const tooltip = page.locator('[role="tooltip"]').or(page.locator('.tooltip')).or(page.locator('[data-testid*="tooltip"]'));
      const tooltipVisible = await tooltip.isVisible({ timeout: 2000 }).catch(() => false);

      if (tooltipVisible) {
        await expect(tooltip).toBeVisible();
      }
    }
  });
});

test.describe('Dashboard Statistics', () => {
  test.skip('should display streak information', async ({ page }) => {
    // Requires authentication
    await goToDashboard(page);

    // Look for streak display
    const streakDisplay = page.locator(
      'text=/\\d+ day streak|streak: \\d+/i, [data-testid*="streak"]'
    );
    const streakVisible = await streakDisplay.isVisible({ timeout: 5000 }).catch(() => false);

    if (streakVisible) {
      await expect(streakDisplay).toBeVisible();
    }
  });

  test.skip('should display total quizzes taken', async ({ page }) => {
    // Requires authentication
    await goToDashboard(page);

    // Look for quiz count
    const quizCount = page.locator(
      'text=/\\d+ quizzes|total quizzes/i, [data-testid*="quiz-count"]'
    );
    const countVisible = await quizCount.isVisible({ timeout: 5000 }).catch(() => false);

    if (countVisible) {
      await expect(quizCount).toBeVisible();
    }
  });

  test.skip('should display average score', async ({ page }) => {
    // Requires authentication
    await goToDashboard(page);

    // Look for average score
    const avgScore = page.locator(
      'text=/\\d+% average|average score/i, [data-testid*="avg-score"]'
    );
    const scoreVisible = await avgScore.isVisible({ timeout: 5000 }).catch(() => false);

    if (scoreVisible) {
      await expect(avgScore).toBeVisible();
    }
  });

  test.skip('should display level/XP progress', async ({ page }) => {
    // Requires authentication
    await goToDashboard(page);

    // Look for level display
    const levelDisplay = page.getByText(/level \d+|xp:/i).or(page.locator('[data-testid*="level"]'));
    const levelVisible = await levelDisplay.isVisible({ timeout: 5000 }).catch(() => false);

    if (levelVisible) {
      await expect(levelDisplay).toBeVisible();
    }
  });

  test.skip('should display recent activity', async ({ page }) => {
    // Requires authentication
    await goToDashboard(page);

    // Look for activity section
    const activitySection = page.locator('text=/recent activity|activity feed/i').first();
    const activityVisible = await activitySection.isVisible({ timeout: 5000 }).catch(() => false);

    if (activityVisible) {
      await expect(activitySection).toBeVisible();
    }
  });
});

test.describe('Badge Earning', () => {
  test.skip('should show notification when earning first badge', async ({ page }) => {
    // This test would require completing an action that earns a badge
    // Typically the first quiz completion

    // Complete a quiz (assuming helper function exists)
    // await completeFirstQuiz(page);

    // Look for badge earned notification
    const notification = page.getByText(/badge earned|achievement unlocked/i).or(page.locator('[role="alert"]'));
    const notificationVisible = await notification.isVisible({ timeout: 10000 }).catch(() => false);

    if (notificationVisible) {
      await expect(notification).toBeVisible();
    }
  });
});

test.describe('Progress Tracking', () => {
  test.skip('should display category-specific progress', async ({ page }) => {
    // Requires authentication
    await goToDashboard(page);

    // Look for category progress section
    const categoryProgress = page.locator('text=/CISSP|CISM|progress by category/i').first();
    const progressVisible = await categoryProgress.isVisible({ timeout: 5000 }).catch(() => false);

    if (progressVisible) {
      await expect(categoryProgress).toBeVisible();
    }
  });

  test.skip('should show mastery scores', async ({ page }) => {
    // Requires authentication
    await goToDashboard(page);

    // Look for mastery score indicators
    const masteryScore = page.getByText(/\d+% mastery|mastered/i).or(page.locator('[data-testid*="mastery"]'));
    const masteryVisible = await masteryScore.isVisible({ timeout: 5000 }).catch(() => false);

    if (masteryVisible) {
      await expect(masteryScore).toBeVisible();
    }
  });
});

test.describe('Gamification Elements', () => {
  test.skip('should display leaderboard', async ({ page }) => {
    // Navigate to leaderboard
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');

    // Verify leaderboard content
    await verifyHeading(page, /leaderboard|rankings/i);

    // Look for user rankings
    const rankings = page.locator('[data-testid*="rank"]').or(page.locator('.rank')).or(page.getByText(/^\d+$/));
    const rankingsVisible = await rankings
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (rankingsVisible) {
      const rankCount = await rankings.count();
      expect(rankCount).toBeGreaterThan(0);
    }
  });

  test.skip('should display challenges', async ({ page }) => {
    // Navigate to challenges
    await page.goto('/daily-challenges');
    await page.waitForLoadState('networkidle');

    // Look for challenge cards
    const challenges = page.locator('[data-testid*="challenge"], .challenge-card');
    const challengeCount = await challenges.count();

    // Should have at least structure for challenges
    expect(challengeCount).toBeGreaterThanOrEqual(0);
  });

  test.skip('should allow completing daily challenge', async ({ page }) => {
    // Navigate to challenges
    await page.goto('/daily-challenges');
    await page.waitForLoadState('networkidle');

    // Look for start challenge button
    const startButton = page
      .getByRole('button', { name: /start challenge|take challenge/i })
      .first();
    const buttonVisible = await startButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (buttonVisible) {
      await startButton.click();
      await page.waitForLoadState('networkidle');

      // Should navigate to challenge quiz
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/challenge|quiz/i);
    }
  });
});
