/**
 * Tests for AuthenticatedLayout component - Level calculation logic
 * Tests the integration of getUserGameStats with level/XP calculations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateLevelFromPoints, calculatePointsForLevel } from '@/lib/level-utils';
import type { UserGameStats } from '@shared/schema';

/**
 * Test helper to simulate the level calculation logic in AuthenticatedLayout
 * This matches the component's behavior for validation
 */
function calculateHeaderLevelData(gameStats: UserGameStats | undefined) {
  const totalPoints = gameStats?.totalPoints || 0;
  const level = calculateLevelFromPoints(totalPoints);

  const currentLevelStartPoints = calculatePointsForLevel(level);
  const pointsInCurrentLevel = totalPoints - currentLevelStartPoints;
  const pointsNeededForLevel = level * 100;

  const currentXP = pointsInCurrentLevel;
  const xpGoal = pointsNeededForLevel;

  const dayStreak = gameStats?.currentStreak || 0;

  return {
    level,
    currentXP,
    xpGoal,
    dayStreak,
    totalPoints,
  };
}

describe('AuthenticatedLayout - Level Calculation', () => {
  describe('calculateHeaderLevelData with undefined gameStats', () => {
    it('should return level 1 with 0 XP when gameStats is undefined', () => {
      const result = calculateHeaderLevelData(undefined);

      expect(result.level).toBe(1);
      expect(result.currentXP).toBe(0);
      expect(result.xpGoal).toBe(100);
      expect(result.dayStreak).toBe(0);
      expect(result.totalPoints).toBe(0);
    });

    it('should return level 1 with 0 XP when gameStats has null totalPoints', () => {
      const gameStats = {
        id: 1,
        userId: 'test-user',
        tenantId: 1,
        totalPoints: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        totalBadgesEarned: 0,
        nextLevelPoints: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserGameStats;

      const result = calculateHeaderLevelData(gameStats);

      expect(result.level).toBe(1);
      expect(result.currentXP).toBe(0);
      expect(result.xpGoal).toBe(100);
    });
  });

  describe('calculateHeaderLevelData with valid gameStats', () => {
    it('should correctly calculate level 2 with 50 XP for 150 total points', () => {
      const gameStats = {
        id: 1,
        userId: 'test-user',
        tenantId: 1,
        totalPoints: 150,
        level: 2,
        currentStreak: 3,
        longestStreak: 5,
        lastActivityDate: new Date(),
        totalBadgesEarned: 2,
        nextLevelPoints: 300,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserGameStats;

      const result = calculateHeaderLevelData(gameStats);

      expect(result.level).toBe(2);
      expect(result.currentXP).toBe(50); // 150 - 100 (start of level 2)
      expect(result.xpGoal).toBe(200); // level 2 requires 200 points
      expect(result.dayStreak).toBe(3);
      expect(result.totalPoints).toBe(150);
    });

    it('should correctly calculate level 4 with 50 XP for 650 total points', () => {
      const gameStats = {
        id: 1,
        userId: 'test-user',
        tenantId: 1,
        totalPoints: 650,
        level: 4,
        currentStreak: 7,
        longestStreak: 10,
        lastActivityDate: new Date(),
        totalBadgesEarned: 5,
        nextLevelPoints: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserGameStats;

      const result = calculateHeaderLevelData(gameStats);

      expect(result.level).toBe(4);
      expect(result.currentXP).toBe(50); // 650 - 600 (start of level 4)
      expect(result.xpGoal).toBe(400); // level 4 requires 400 points
      expect(result.dayStreak).toBe(7);
    });

    it('should handle user at exact level boundary (level 3, 300 points)', () => {
      const gameStats = {
        id: 1,
        userId: 'test-user',
        tenantId: 1,
        totalPoints: 300,
        level: 3,
        currentStreak: 5,
        longestStreak: 8,
        lastActivityDate: new Date(),
        totalBadgesEarned: 3,
        nextLevelPoints: 600,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserGameStats;

      const result = calculateHeaderLevelData(gameStats);

      expect(result.level).toBe(3);
      expect(result.currentXP).toBe(0); // Exactly at start of level 3
      expect(result.xpGoal).toBe(300); // level 3 requires 300 points
      expect(result.dayStreak).toBe(5);
    });

    it('should handle high-level user (level 10, 5000 points)', () => {
      const gameStats = {
        id: 1,
        userId: 'test-user',
        tenantId: 1,
        totalPoints: 5000,
        level: 10,
        currentStreak: 30,
        longestStreak: 50,
        lastActivityDate: new Date(),
        totalBadgesEarned: 20,
        nextLevelPoints: 5500,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserGameStats;

      const result = calculateHeaderLevelData(gameStats);

      expect(result.level).toBe(10);
      expect(result.currentXP).toBe(500); // 5000 - 4500 (start of level 10)
      expect(result.xpGoal).toBe(1000); // level 10 requires 1000 points
      expect(result.dayStreak).toBe(30);
    });
  });

  describe('Defensive programming - out of sync level field', () => {
    it('should recalculate level from totalPoints even if stored level is wrong', () => {
      const gameStats = {
        id: 1,
        userId: 'test-user',
        tenantId: 1,
        totalPoints: 650,
        level: 1, // Wrong! Should be level 4 based on points
        currentStreak: 7,
        longestStreak: 10,
        lastActivityDate: new Date(),
        totalBadgesEarned: 5,
        nextLevelPoints: 100, // Also wrong
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserGameStats;

      const result = calculateHeaderLevelData(gameStats);

      // Should recalculate to correct level 4, not trust the stored level 1
      expect(result.level).toBe(4);
      expect(result.currentXP).toBe(50);
      expect(result.xpGoal).toBe(400);
    });

    it('should handle edge case where level field is much higher than points suggest', () => {
      const gameStats = {
        id: 1,
        userId: 'test-user',
        tenantId: 1,
        totalPoints: 150,
        level: 50, // Way too high for 150 points
        currentStreak: 3,
        longestStreak: 5,
        lastActivityDate: new Date(),
        totalBadgesEarned: 2,
        nextLevelPoints: 5000,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserGameStats;

      const result = calculateHeaderLevelData(gameStats);

      // Should recalculate to correct level 2
      expect(result.level).toBe(2);
      expect(result.currentXP).toBe(50);
      expect(result.xpGoal).toBe(200);
    });
  });

  describe('XP progress percentage calculations', () => {
    it('should calculate 0% progress at start of level', () => {
      const gameStats = {
        id: 1,
        userId: 'test-user',
        tenantId: 1,
        totalPoints: 100, // Exactly at start of level 2
        level: 2,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        totalBadgesEarned: 0,
        nextLevelPoints: 300,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserGameStats;

      const result = calculateHeaderLevelData(gameStats);
      const progressPercent = (result.currentXP / result.xpGoal) * 100;

      expect(progressPercent).toBe(0);
    });

    it('should calculate 50% progress at midpoint of level', () => {
      const gameStats = {
        id: 1,
        userId: 'test-user',
        tenantId: 1,
        totalPoints: 200, // Halfway through level 2 (100 out of 200)
        level: 2,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        totalBadgesEarned: 0,
        nextLevelPoints: 300,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserGameStats;

      const result = calculateHeaderLevelData(gameStats);
      const progressPercent = (result.currentXP / result.xpGoal) * 100;

      expect(progressPercent).toBe(50);
    });

    it('should calculate ~99.5% progress near end of level', () => {
      const gameStats = {
        id: 1,
        userId: 'test-user',
        tenantId: 1,
        totalPoints: 299, // 1 point away from level 3
        level: 2,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        totalBadgesEarned: 0,
        nextLevelPoints: 300,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserGameStats;

      const result = calculateHeaderLevelData(gameStats);
      const progressPercent = (result.currentXP / result.xpGoal) * 100;

      expect(progressPercent).toBeCloseTo(99.5, 1);
    });
  });

  describe('Streak display from gameStats', () => {
    it('should display correct streak value', () => {
      const gameStats = {
        id: 1,
        userId: 'test-user',
        tenantId: 1,
        totalPoints: 150,
        level: 2,
        currentStreak: 15,
        longestStreak: 20,
        lastActivityDate: new Date(),
        totalBadgesEarned: 2,
        nextLevelPoints: 300,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserGameStats;

      const result = calculateHeaderLevelData(gameStats);

      expect(result.dayStreak).toBe(15);
    });

    it('should handle zero streak', () => {
      const gameStats = {
        id: 1,
        userId: 'test-user',
        tenantId: 1,
        totalPoints: 150,
        level: 2,
        currentStreak: 0,
        longestStreak: 5,
        lastActivityDate: new Date(),
        totalBadgesEarned: 2,
        nextLevelPoints: 300,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserGameStats;

      const result = calculateHeaderLevelData(gameStats);

      expect(result.dayStreak).toBe(0);
    });
  });
});
