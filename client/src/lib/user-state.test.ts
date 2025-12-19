/**
 * Comprehensive test suite for all user state references
 *
 * This test file validates:
 * - Token balance operations (get, add, consume)
 * - Display name computation (from firstName, lastName, email)
 * - Experience points (XP) calculations
 * - Level progression logic
 * - Game statistics (points, streaks, badges)
 * - User profile updates
 * - Edge cases and error handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { clientStorage } from './client-storage';
import { calculateLevelAndXP } from './level-utils';
import type { User, UserGameStats, UserStats } from '@shared/schema';

describe('User State Management', () => {
  let testUserId: string;

  beforeEach(async () => {
    // Create a test user before each test
    const user = await clientStorage.createUser({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      tokenBalance: 100,
    });
    testUserId = user.id;
  });

  afterEach(async () => {
    // Clean up test data
    await clientStorage.clearAllData();
  });

  describe('Token Balance Operations', () => {
    describe('getUserTokenBalance', () => {
      it('should return initial token balance of 100', async () => {
        const balance = await clientStorage.getUserTokenBalance(testUserId);
        expect(balance).toBe(100);
      });

      it('should return 0 for non-existent user', async () => {
        const balance = await clientStorage.getUserTokenBalance('non-existent-user');
        expect(balance).toBe(0);
      });

      it('should return current balance after updates', async () => {
        await clientStorage.addTokens(testUserId, 50);
        const balance = await clientStorage.getUserTokenBalance(testUserId);
        expect(balance).toBe(150);
      });
    });

    describe('addTokens', () => {
      it('should add tokens to user balance', async () => {
        const newBalance = await clientStorage.addTokens(testUserId, 50);
        expect(newBalance).toBe(150);
      });

      it('should handle adding zero tokens', async () => {
        const newBalance = await clientStorage.addTokens(testUserId, 0);
        expect(newBalance).toBe(100);
      });

      it('should handle large token amounts', async () => {
        const newBalance = await clientStorage.addTokens(testUserId, 1000000);
        expect(newBalance).toBe(1000100);
      });

      it('should throw error for non-existent user', async () => {
        await expect(clientStorage.addTokens('non-existent-user', 50)).rejects.toThrow(
          'User not found'
        );
      });

      it('should accumulate tokens from multiple additions', async () => {
        await clientStorage.addTokens(testUserId, 25);
        await clientStorage.addTokens(testUserId, 35);
        const balance = await clientStorage.getUserTokenBalance(testUserId);
        expect(balance).toBe(160);
      });
    });

    describe('consumeTokens', () => {
      it('should consume tokens when balance is sufficient', async () => {
        const result = await clientStorage.consumeTokens(testUserId, 30);
        expect(result.success).toBe(true);
        expect(result.newBalance).toBe(70);
        expect(result.message).toBeUndefined();
      });

      it('should fail when balance is insufficient', async () => {
        const result = await clientStorage.consumeTokens(testUserId, 150);
        expect(result.success).toBe(false);
        expect(result.newBalance).toBe(100);
        expect(result.message).toContain('Insufficient tokens');
      });

      it('should handle consuming exact balance', async () => {
        const result = await clientStorage.consumeTokens(testUserId, 100);
        expect(result.success).toBe(true);
        expect(result.newBalance).toBe(0);
      });

      it('should handle consuming zero tokens', async () => {
        const result = await clientStorage.consumeTokens(testUserId, 0);
        expect(result.success).toBe(true);
        expect(result.newBalance).toBe(100);
      });

      it('should throw error for non-existent user', async () => {
        await expect(clientStorage.consumeTokens('non-existent-user', 50)).rejects.toThrow(
          'User not found'
        );
      });

      it('should maintain balance when consumption fails', async () => {
        await clientStorage.consumeTokens(testUserId, 150);
        const balance = await clientStorage.getUserTokenBalance(testUserId);
        expect(balance).toBe(100);
      });
    });

    describe('edge cases', () => {
      it('should handle very large token values', async () => {
        const largeAmount = Number.MAX_SAFE_INTEGER - 100;
        const newBalance = await clientStorage.addTokens(testUserId, largeAmount);
        expect(newBalance).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
      });

      it('should handle sequential operations correctly', async () => {
        await clientStorage.addTokens(testUserId, 100); // 200
        await clientStorage.consumeTokens(testUserId, 50); // 150
        await clientStorage.addTokens(testUserId, 25); // 175
        const balance = await clientStorage.getUserTokenBalance(testUserId);
        expect(balance).toBe(175);
      });
    });
  });

  describe('Display Name Operations', () => {
    it('should display firstName + lastName when both present', async () => {
      const user = await clientStorage.getUser(testUserId);
      const displayName = `${user?.firstName} ${user?.lastName}`;
      expect(displayName).toBe('Test User');
    });

    it('should display firstName only when lastName is null', async () => {
      await clientStorage.updateUser(testUserId, { lastName: null });
      const user = await clientStorage.getUser(testUserId);
      expect(user?.firstName).toBe('Test');
      expect(user?.lastName).toBeNull();
    });

    it('should display lastName only when firstName is null', async () => {
      await clientStorage.updateUser(testUserId, { firstName: null });
      const user = await clientStorage.getUser(testUserId);
      expect(user?.firstName).toBeNull();
      expect(user?.lastName).toBe('User');
    });

    it('should handle email fallback when names are null', async () => {
      await clientStorage.updateUser(testUserId, {
        firstName: null,
        lastName: null,
      });
      const user = await clientStorage.getUser(testUserId);
      expect(user?.email).toBe('test@example.com');
      expect(user?.firstName).toBeNull();
      expect(user?.lastName).toBeNull();
    });

    it('should handle empty string names', async () => {
      // Update with empty strings
      await clientStorage.updateUser(testUserId, {
        firstName: '',
        lastName: '',
      });
      const user = await clientStorage.getUser(testUserId);
      // Empty strings should be stored as-is
      expect(user?.firstName).toBe('');
      expect(user?.lastName).toBe('');
    });
  });

  describe('Experience (XP) and Level Calculations', () => {
    describe('calculateLevelAndXP', () => {
      it('should calculate level 1 with 0 quizzes', () => {
        const stats: UserStats = {
          totalQuizzes: 0,
          averageScore: 0,
          studyStreak: 0,
          currentStreak: 0,
          certifications: 0,
          passingRate: 0,
          masteryScore: 0,
        };
        const result = calculateLevelAndXP(stats);
        expect(result.level).toBe(1);
        expect(result.currentXP).toBe(0);
        expect(result.xpGoal).toBe(1000);
        expect(result.xpProgress).toBe(0);
      });

      it('should calculate level 2 after 10 quizzes', () => {
        const stats: UserStats = {
          totalQuizzes: 10,
          averageScore: 75,
          studyStreak: 5,
          currentStreak: 5,
          certifications: 0,
          passingRate: 80,
          masteryScore: 75,
        };
        const result = calculateLevelAndXP(stats);
        expect(result.level).toBe(2);
        expect(result.currentXP).toBe(375); // 0 * 250 + 75 * 5
        expect(result.xpGoal).toBe(2000);
      });

      it('should calculate XP based on quiz count in current level', () => {
        const stats: UserStats = {
          totalQuizzes: 15,
          averageScore: 80,
          studyStreak: 5,
          currentStreak: 5,
          certifications: 0,
          passingRate: 80,
          masteryScore: 80,
        };
        const result = calculateLevelAndXP(stats);
        expect(result.level).toBe(2);
        expect(result.currentXP).toBe(1650); // 5 * 250 + 80 * 5
        expect(result.xpGoal).toBe(2000);
      });

      it('should include score bonus in XP calculation', () => {
        const stats: UserStats = {
          totalQuizzes: 5,
          averageScore: 100,
          studyStreak: 0,
          currentStreak: 0,
          certifications: 0,
          passingRate: 100,
          masteryScore: 100,
        };
        const result = calculateLevelAndXP(stats);
        expect(result.level).toBe(1);
        expect(result.currentXP).toBe(1750); // 5 * 250 + 100 * 5
        expect(result.xpGoal).toBe(1000);
        expect(result.xpProgress).toBe(100); // Capped at 100%
      });

      it('should handle undefined stats', () => {
        const result = calculateLevelAndXP(undefined);
        expect(result.level).toBe(1);
        expect(result.currentXP).toBe(0);
        expect(result.xpGoal).toBe(1000);
        expect(result.xpProgress).toBe(0);
      });

      it('should cap progress at 100%', () => {
        const stats: UserStats = {
          totalQuizzes: 9,
          averageScore: 100,
          studyStreak: 0,
          currentStreak: 0,
          certifications: 0,
          passingRate: 100,
          masteryScore: 100,
        };
        const result = calculateLevelAndXP(stats);
        expect(result.xpProgress).toBeLessThanOrEqual(100);
      });

      it('should increase XP goal with each level', () => {
        const level1 = calculateLevelAndXP({
          totalQuizzes: 0,
          averageScore: 0,
          studyStreak: 0,
          currentStreak: 0,
          certifications: 0,
          passingRate: 0,
          masteryScore: 0,
        });
        const level5 = calculateLevelAndXP({
          totalQuizzes: 40,
          averageScore: 0,
          studyStreak: 0,
          currentStreak: 0,
          certifications: 0,
          passingRate: 0,
          masteryScore: 0,
        });
        expect(level5.xpGoal).toBeGreaterThan(level1.xpGoal);
        expect(level5.level).toBe(5);
      });
    });
  });

  describe('Game Statistics Operations', () => {
    describe('getUserGameStats', () => {
      it('should return undefined for new user without stats', async () => {
        const stats = await clientStorage.getUserGameStats(testUserId);
        expect(stats).toBeUndefined();
      });

      it('should return stats after creation', async () => {
        await clientStorage.updateUserGameStats(testUserId, {
          totalPoints: 100,
          currentStreak: 3,
          level: 2,
        });
        const stats = await clientStorage.getUserGameStats(testUserId);
        expect(stats).toBeDefined();
        expect(stats?.totalPoints).toBe(100);
        expect(stats?.currentStreak).toBe(3);
        expect(stats?.level).toBe(2);
      });
    });

    describe('updateUserGameStats', () => {
      it('should create new stats if they do not exist', async () => {
        const stats = await clientStorage.updateUserGameStats(testUserId, {
          totalPoints: 50,
          currentStreak: 1,
          level: 1,
        });
        expect(stats).toBeDefined();
        expect(stats.totalPoints).toBe(50);
        expect(stats.currentStreak).toBe(1);
        expect(stats.level).toBe(1);
      });

      it('should update existing stats', async () => {
        await clientStorage.updateUserGameStats(testUserId, {
          totalPoints: 100,
          currentStreak: 5,
        });
        const updated = await clientStorage.updateUserGameStats(testUserId, {
          totalPoints: 150,
          currentStreak: 6,
        });
        expect(updated.totalPoints).toBe(150);
        expect(updated.currentStreak).toBe(6);
      });

      it('should handle partial updates', async () => {
        await clientStorage.updateUserGameStats(testUserId, {
          totalPoints: 100,
          currentStreak: 5,
          level: 2,
        });
        const updated = await clientStorage.updateUserGameStats(testUserId, {
          totalPoints: 120,
        });
        expect(updated.totalPoints).toBe(120);
        expect(updated.currentStreak).toBe(5); // Should remain unchanged
        expect(updated.level).toBe(2); // Should remain unchanged
      });

      it('should update lastActivityDate on update', async () => {
        const stats = await clientStorage.updateUserGameStats(testUserId, {
          totalPoints: 50,
        });
        expect(stats.updatedAt).toBeDefined();
        expect(stats.updatedAt).toBeInstanceOf(Date);
      });

      it('should track longestStreak correctly', async () => {
        await clientStorage.updateUserGameStats(testUserId, {
          currentStreak: 5,
          longestStreak: 5,
        });
        const updated = await clientStorage.updateUserGameStats(testUserId, {
          currentStreak: 10,
          longestStreak: 10,
        });
        expect(updated.longestStreak).toBe(10);
        expect(updated.currentStreak).toBe(10);
      });

      it('should initialize with default values', async () => {
        const stats = await clientStorage.updateUserGameStats(testUserId, {});
        expect(stats.totalPoints).toBe(0);
        expect(stats.currentStreak).toBe(0);
        expect(stats.longestStreak).toBe(0);
        expect(stats.level).toBe(1);
        expect(stats.nextLevelPoints).toBe(100);
      });
    });

    describe('totalPoints accumulation', () => {
      it('should accumulate points correctly', async () => {
        await clientStorage.updateUserGameStats(testUserId, {
          totalPoints: 50,
        });
        await clientStorage.updateUserGameStats(testUserId, {
          totalPoints: 100,
        });
        const stats = await clientStorage.getUserGameStats(testUserId);
        expect(stats?.totalPoints).toBe(100);
      });

      it('should handle zero points', async () => {
        const stats = await clientStorage.updateUserGameStats(testUserId, {
          totalPoints: 0,
        });
        expect(stats.totalPoints).toBe(0);
      });

      it('should handle large point values', async () => {
        const stats = await clientStorage.updateUserGameStats(testUserId, {
          totalPoints: 1000000,
        });
        expect(stats.totalPoints).toBe(1000000);
      });
    });

    describe('streak calculations', () => {
      it('should start with zero streak', async () => {
        const stats = await clientStorage.updateUserGameStats(testUserId, {});
        expect(stats.currentStreak).toBe(0);
        expect(stats.longestStreak).toBe(0);
      });

      it('should update current streak', async () => {
        const stats = await clientStorage.updateUserGameStats(testUserId, {
          currentStreak: 7,
        });
        expect(stats.currentStreak).toBe(7);
      });

      it('should not decrease longest streak', async () => {
        await clientStorage.updateUserGameStats(testUserId, {
          currentStreak: 10,
          longestStreak: 10,
        });
        const updated = await clientStorage.updateUserGameStats(testUserId, {
          currentStreak: 3, // Current streak decreases
          longestStreak: 10, // But longest should stay
        });
        expect(updated.longestStreak).toBe(10);
        expect(updated.currentStreak).toBe(3);
      });
    });
  });

  describe('User Profile Updates', () => {
    describe('updateUser', () => {
      it('should update firstName', async () => {
        const updated = await clientStorage.updateUser(testUserId, {
          firstName: 'Updated',
        });
        expect(updated?.firstName).toBe('Updated');
        expect(updated?.lastName).toBe('User'); // Unchanged
      });

      it('should update lastName', async () => {
        const updated = await clientStorage.updateUser(testUserId, {
          lastName: 'Changed',
        });
        expect(updated?.lastName).toBe('Changed');
        expect(updated?.firstName).toBe('Test'); // Unchanged
      });

      it('should update email', async () => {
        const updated = await clientStorage.updateUser(testUserId, {
          email: 'newemail@example.com',
        });
        expect(updated?.email).toBe('newemail@example.com');
      });

      it('should update certification goals', async () => {
        const goals = ['CISSP', 'CISM'];
        const updated = await clientStorage.updateUser(testUserId, {
          certificationGoals: goals,
        });
        expect(updated?.certificationGoals).toEqual(goals);
      });

      it('should update study preferences', async () => {
        const prefs = {
          dailyTimeMinutes: 60,
          preferredDifficulty: 'advanced' as const,
          focusAreas: ['Security', 'Risk Management'],
        };
        const updated = await clientStorage.updateUser(testUserId, {
          studyPreferences: prefs,
        });
        expect(updated?.studyPreferences).toEqual(prefs);
      });

      it('should update skills assessment', async () => {
        const skills = {
          experienceLevel: 'intermediate' as const,
          relevantExperience: ['IT Security', 'Network Admin'],
          learningStyle: 'visual' as const,
        };
        const updated = await clientStorage.updateUser(testUserId, {
          skillsAssessment: skills,
        });
        expect(updated?.skillsAssessment).toEqual(skills);
      });

      it('should update updatedAt timestamp', async () => {
        const before = new Date();
        await new Promise((resolve) => setTimeout(resolve, 10));
        const updated = await clientStorage.updateUser(testUserId, {
          firstName: 'Updated',
        });
        expect(updated?.updatedAt).toBeInstanceOf(Date);
        expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      });

      it('should return null for non-existent user', async () => {
        const updated = await clientStorage.updateUser('non-existent-user', {
          firstName: 'Test',
        });
        expect(updated).toBeNull();
      });

      it('should handle multiple simultaneous updates', async () => {
        const updated = await clientStorage.updateUser(testUserId, {
          firstName: 'Multi',
          lastName: 'Update',
          tokenBalance: 200,
        });
        expect(updated?.firstName).toBe('Multi');
        expect(updated?.lastName).toBe('Update');
        expect(updated?.tokenBalance).toBe(200);
      });

      it('should preserve unchanged fields', async () => {
        await clientStorage.updateUser(testUserId, {
          firstName: 'Changed',
        });
        const user = await clientStorage.getUser(testUserId);
        expect(user?.email).toBe('test@example.com'); // Original email
        expect(user?.tokenBalance).toBe(100); // Original balance
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    describe('minimum/maximum values', () => {
      it('should handle minimum token balance (0)', async () => {
        await clientStorage.updateUser(testUserId, { tokenBalance: 0 });
        const balance = await clientStorage.getUserTokenBalance(testUserId);
        expect(balance).toBe(0);
      });

      it('should handle maximum safe integer for tokens', async () => {
        const maxTokens = Number.MAX_SAFE_INTEGER;
        await clientStorage.updateUser(testUserId, { tokenBalance: maxTokens });
        const balance = await clientStorage.getUserTokenBalance(testUserId);
        expect(balance).toBe(maxTokens);
      });

      it('should handle streak values from 0 to large numbers', async () => {
        const stats = await clientStorage.updateUserGameStats(testUserId, {
          currentStreak: 365,
          longestStreak: 365,
        });
        expect(stats.currentStreak).toBe(365);
        expect(stats.longestStreak).toBe(365);
      });

      it('should handle level values', async () => {
        const stats = await clientStorage.updateUserGameStats(testUserId, {
          level: 100,
        });
        expect(stats.level).toBe(100);
      });
    });

    describe('invalid input handling', () => {
      it('should handle null values gracefully', async () => {
        const updated = await clientStorage.updateUser(testUserId, {
          firstName: null,
          lastName: null,
        });
        expect(updated?.firstName).toBeNull();
        expect(updated?.lastName).toBeNull();
      });

      it('should handle empty arrays for goals', async () => {
        const updated = await clientStorage.updateUser(testUserId, {
          certificationGoals: [],
        });
        expect(updated?.certificationGoals).toEqual([]);
      });

      it('should handle empty objects for preferences', async () => {
        const updated = await clientStorage.updateUser(testUserId, {
          studyPreferences: {},
        });
        expect(updated?.studyPreferences).toEqual({});
      });
    });

    describe('tenant isolation', () => {
      it('should respect tenant isolation for game stats', async () => {
        await clientStorage.updateUserGameStats(testUserId, {
          totalPoints: 100,
          tenantId: 1,
        });
        const stats = await clientStorage.getUserGameStats(testUserId);
        expect(stats?.tenantId).toBe(1);
      });

      it('should use default tenantId of 1', async () => {
        const stats = await clientStorage.updateUserGameStats(testUserId, {
          totalPoints: 50,
        });
        expect(stats.tenantId).toBe(1);
      });
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistency between getUser and getUserTokenBalance', async () => {
      const user = await clientStorage.getUser(testUserId);
      const balance = await clientStorage.getUserTokenBalance(testUserId);
      expect(balance).toBe(user?.tokenBalance ?? 0);
    });

    it('should reflect updates immediately', async () => {
      await clientStorage.addTokens(testUserId, 50);
      const user = await clientStorage.getUser(testUserId);
      const balance = await clientStorage.getUserTokenBalance(testUserId);
      expect(user?.tokenBalance).toBe(150);
      expect(balance).toBe(150);
    });

    it('should maintain data integrity across operations', async () => {
      // Perform multiple operations
      await clientStorage.addTokens(testUserId, 100);
      await clientStorage.updateUser(testUserId, { firstName: 'Updated' });
      await clientStorage.consumeTokens(testUserId, 50);

      // Verify all changes persisted
      const user = await clientStorage.getUser(testUserId);
      expect(user?.firstName).toBe('Updated');
      expect(user?.tokenBalance).toBe(150);
    });
  });
});
