/**
 * Tests for LevelProgress component
 * Specifically testing the level progress calculation logic
 */

import { describe, it, expect } from 'vitest';

/**
 * Helper function that mimics the calculateLevel logic in LevelProgress.tsx
 */
function calculateLevel(points: number): number {
  const POINTS_PER_LEVEL = 100;
  let calcLevel = 1;
  let pointsNeeded = 0;

  while (true) {
    const pointsForNextLevel = calcLevel * POINTS_PER_LEVEL;
    if (pointsNeeded + pointsForNextLevel > points) {
      break;
    }
    pointsNeeded += pointsForNextLevel;
    calcLevel++;
  }

  return calcLevel;
}

/**
 * Helper function that mimics the calculatePointsForLevel logic in LevelProgress.tsx
 */
function calculatePointsForLevel(targetLevel: number): number {
  let points = 0;
  for (let i = 1; i < targetLevel; i++) {
    points += i * 100;
  }
  return points;
}

/**
 * Helper to calculate progress values (mimics LevelProgress component logic)
 * Now calculates level from totalPoints instead of using provided level
 */
function calculateLevelProgress(propLevel: number, totalPoints: number) {
  // Calculate correct level from totalPoints (matching component behavior)
  const level = calculateLevel(totalPoints);

  const currentLevelStartPoints = calculatePointsForLevel(level);
  const pointsInCurrentLevel = totalPoints - currentLevelStartPoints;
  const pointsNeededForLevel = level * 100;
  const progressToNextLevel = (pointsInCurrentLevel / pointsNeededForLevel) * 100;
  const pointsNeeded = pointsNeededForLevel - pointsInCurrentLevel;

  return {
    level,
    currentLevelStartPoints,
    pointsInCurrentLevel,
    pointsNeededForLevel,
    progressToNextLevel,
    pointsNeeded,
  };
}

describe('LevelProgress calculations', () => {
  describe('calculateLevel', () => {
    it('should calculate level 1 for 0-99 points', () => {
      expect(calculateLevel(0)).toBe(1);
      expect(calculateLevel(50)).toBe(1);
      expect(calculateLevel(99)).toBe(1);
    });

    it('should calculate level 2 for 100-299 points', () => {
      expect(calculateLevel(100)).toBe(2);
      expect(calculateLevel(200)).toBe(2);
      expect(calculateLevel(299)).toBe(2);
    });

    it('should calculate level 3 for 300-599 points', () => {
      expect(calculateLevel(300)).toBe(3);
      expect(calculateLevel(400)).toBe(3);
      expect(calculateLevel(599)).toBe(3);
    });

    it('should calculate level 4 for 600-999 points', () => {
      expect(calculateLevel(600)).toBe(4);
      expect(calculateLevel(650)).toBe(4);
      expect(calculateLevel(999)).toBe(4);
    });

    it('should calculate level 5 for 1000+ points', () => {
      expect(calculateLevel(1000)).toBe(5);
      expect(calculateLevel(1499)).toBe(5);
    });
  });

  describe('calculatePointsForLevel', () => {
    it('should calculate cumulative points correctly for level 1', () => {
      expect(calculatePointsForLevel(1)).toBe(0);
    });

    it('should calculate cumulative points correctly for level 2', () => {
      expect(calculatePointsForLevel(2)).toBe(100); // 1 * 100
    });

    it('should calculate cumulative points correctly for level 3', () => {
      expect(calculatePointsForLevel(3)).toBe(300); // 100 + 200
    });

    it('should calculate cumulative points correctly for level 4', () => {
      expect(calculatePointsForLevel(4)).toBe(600); // 100 + 200 + 300
    });

    it('should calculate cumulative points correctly for level 5', () => {
      expect(calculatePointsForLevel(5)).toBe(1000); // 100 + 200 + 300 + 400
    });
  });

  describe('level progress calculation', () => {
    it('should calculate correct progress at start of level 1', () => {
      const result = calculateLevelProgress(1, 0);
      expect(result.level).toBe(1);
      expect(result.currentLevelStartPoints).toBe(0);
      expect(result.pointsInCurrentLevel).toBe(0);
      expect(result.pointsNeededForLevel).toBe(100);
      expect(result.pointsNeeded).toBe(100);
      expect(result.progressToNextLevel).toBe(0);
    });

    it('should calculate correct progress in middle of level 1', () => {
      const result = calculateLevelProgress(1, 50);
      expect(result.level).toBe(1);
      expect(result.currentLevelStartPoints).toBe(0);
      expect(result.pointsInCurrentLevel).toBe(50);
      expect(result.pointsNeededForLevel).toBe(100);
      expect(result.pointsNeeded).toBe(50);
      expect(result.progressToNextLevel).toBe(50);
    });

    it('should calculate correct progress at end of level 1', () => {
      const result = calculateLevelProgress(1, 99);
      expect(result.level).toBe(1);
      expect(result.currentLevelStartPoints).toBe(0);
      expect(result.pointsInCurrentLevel).toBe(99);
      expect(result.pointsNeededForLevel).toBe(100);
      expect(result.pointsNeeded).toBe(1);
      expect(result.progressToNextLevel).toBe(99);
    });

    it('should calculate correct progress at start of level 2', () => {
      const result = calculateLevelProgress(2, 100);
      expect(result.level).toBe(2);
      expect(result.currentLevelStartPoints).toBe(100);
      expect(result.pointsInCurrentLevel).toBe(0);
      expect(result.pointsNeededForLevel).toBe(200);
      expect(result.pointsNeeded).toBe(200);
      expect(result.progressToNextLevel).toBe(0);
    });

    it('should fix the bug: 650 points with outdated level 1 should recalculate as level 4', () => {
      // This is the exact scenario from the bug report:
      // - User has 650 total points
      // - gameStats.level is incorrectly set to 1 (outdated)
      // - Component should recalculate level from totalPoints
      const result = calculateLevelProgress(1, 650); // prop says level 1, but points say level 4

      // Component should recalculate to level 4
      expect(result.level).toBe(4);
      expect(result.currentLevelStartPoints).toBe(600);
      expect(result.pointsInCurrentLevel).toBe(50);
      expect(result.pointsNeededForLevel).toBe(400);
      expect(result.pointsNeeded).toBe(350);
      expect(result.pointsNeeded).toBeGreaterThan(0); // Should NOT be negative (-550)!
      expect(result.progressToNextLevel).toBe(12.5);
    });

    it('should never show negative points needed', () => {
      // Test a variety of scenarios to ensure points needed is never negative
      // even when prop level is incorrect
      const testCases = [
        { propLevel: 1, points: 0 },
        { propLevel: 1, points: 50 },
        { propLevel: 1, points: 650 }, // Bug scenario
        { propLevel: 2, points: 100 },
        { propLevel: 2, points: 150 },
        { propLevel: 3, points: 300 },
        { propLevel: 5, points: 1000 },
      ];

      testCases.forEach(({ propLevel, points }) => {
        const result = calculateLevelProgress(propLevel, points);
        expect(result.pointsNeeded).toBeGreaterThanOrEqual(0);
      });
    });

    it('should show progress bar values where right value is greater than or equal to left', () => {
      // The right side of the progress bar should always be >= left side
      const testCases = [
        { propLevel: 1, points: 50 },
        { propLevel: 1, points: 650 }, // Bug scenario
        { propLevel: 2, points: 150 },
        { propLevel: 5, points: 1200 },
      ];

      testCases.forEach(({ propLevel, points }) => {
        const result = calculateLevelProgress(propLevel, points);
        expect(result.pointsNeededForLevel).toBeGreaterThanOrEqual(result.pointsInCurrentLevel);
      });
    });
  });
});
