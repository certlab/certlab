/**
 * Achievement Service Tests
 *
 * Tests badge awarding, points calculation, and achievement processing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { achievementService } from './achievement-service';
import type { Quiz, Badge, UserGameStats } from '@shared/schema';

// Mock the storage module
vi.mock('./storage-factory', () => ({
  storage: {
    getUserBadges: vi.fn(),
    getBadges: vi.fn(),
    awardBadge: vi.fn(),
    getUserGameStats: vi.fn(),
    getUserQuizzes: vi.fn(),
    updateUserGameStats: vi.fn(),
    getUserQuizzes: vi.fn(),
  },
}));

// Mock level-utils
vi.mock('./level-utils', () => ({
  calculateLevelFromPoints: vi.fn((points: number) => Math.floor(points / 100) + 1),
  calculatePointsForLevel: vi.fn((level: number) => (level - 1) * 100),
}));

import { storage } from './storage-factory';

describe('AchievementService', () => {
  const mockUserId = 'user-123';
  const mockTenantId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('processQuizCompletion', () => {
    it('should award points for quiz completion', async () => {
      const mockQuiz: Partial<Quiz> = {
        id: 1,
        score: 80,
        questionCount: 10,
        userId: mockUserId,
      };

      const mockGameStats: UserGameStats = {
        userId: mockUserId,
        totalPoints: 100,
        level: 1,
        quizzesCompleted: 5,
        perfectScores: 0,
        questionsAnswered: 50,
        currentStreak: 3,
        longestStreak: 5,
        lecturesRead: 2,
        totalBadges: 1,
        averageScore: 75,
        lastActivityDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(storage.getUserBadges).mockResolvedValue([]);
      vi.mocked(storage.getBadges).mockResolvedValue([]);
      vi.mocked(storage.getUserGameStats).mockResolvedValue(mockGameStats);
      vi.mocked(storage.updateUserGameStats).mockResolvedValue(undefined);
      vi.mocked(storage.getUserQuizzes).mockResolvedValue([]);

      await achievementService.processQuizCompletion(mockUserId, mockQuiz as Quiz, mockTenantId);

      // Verify stats were updated
      expect(storage.updateUserGameStats).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          quizzesCompleted: 6,
          questionsAnswered: 60,
        }),
        mockTenantId
      );
    });

    it('should award badge when requirements are met', async () => {
      const mockQuiz: Partial<Quiz> = {
        id: 1,
        score: 100,
        questionCount: 10,
        userId: mockUserId,
      };

      const mockBadge: Badge = {
        id: 1,
        name: 'Perfect Score',
        description: 'Get a perfect score',
        icon: 'trophy',
        requirement: JSON.stringify({ type: 'perfect_score', value: 1 }),
        points: 50,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockGameStats: UserGameStats = {
        userId: mockUserId,
        totalPoints: 100,
        level: 1,
        quizzesCompleted: 0,
        perfectScores: 0,
        questionsAnswered: 0,
        currentStreak: 1,
        longestStreak: 1,
        lecturesRead: 0,
        totalBadges: 0,
        averageScore: 0,
        lastActivityDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(storage.getUserBadges).mockResolvedValue([]);
      vi.mocked(storage.getBadges).mockResolvedValue([mockBadge]);
      vi.mocked(storage.getUserGameStats).mockResolvedValue(mockGameStats);
      vi.mocked(storage.updateUserGameStats).mockResolvedValue(undefined);
      vi.mocked(storage.getUserQuizzes).mockResolvedValue([]);
      vi.mocked(storage.awardBadge).mockResolvedValue(undefined);

      await achievementService.processQuizCompletion(mockUserId, mockQuiz as Quiz, mockTenantId);

      // Verify badge was awarded
      expect(storage.awardBadge).toHaveBeenCalledWith(mockUserId, mockBadge.id, mockTenantId);
    });

    it('should not award the same badge twice', async () => {
      const mockQuiz: Partial<Quiz> = {
        id: 1,
        score: 100,
        questionCount: 10,
        userId: mockUserId,
      };

      const mockBadge: Badge = {
        id: 1,
        name: 'Perfect Score',
        description: 'Get a perfect score',
        icon: 'trophy',
        requirement: JSON.stringify({ type: 'perfect_score', value: 1 }),
        points: 50,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockGameStats: UserGameStats = {
        userId: mockUserId,
        totalPoints: 100,
        level: 1,
        quizzesCompleted: 0,
        perfectScores: 1,
        questionsAnswered: 0,
        currentStreak: 1,
        longestStreak: 1,
        lecturesRead: 0,
        totalBadges: 1,
        averageScore: 100,
        lastActivityDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // User already has this badge
      vi.mocked(storage.getUserBadges).mockResolvedValue([
        {
          userId: mockUserId,
          badgeId: mockBadge.id,
          awardedAt: new Date().toISOString(),
          notified: false,
        },
      ]);
      vi.mocked(storage.getBadges).mockResolvedValue([mockBadge]);
      vi.mocked(storage.getUserGameStats).mockResolvedValue(mockGameStats);
      vi.mocked(storage.updateUserGameStats).mockResolvedValue(undefined);
      vi.mocked(storage.getUserQuizzes).mockResolvedValue([]);

      await achievementService.processQuizCompletion(mockUserId, mockQuiz as Quiz, mockTenantId);

      // Verify badge was NOT awarded again
      expect(storage.awardBadge).not.toHaveBeenCalled();
    });

    it('should update streak correctly', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const mockQuiz: Partial<Quiz> = {
        id: 1,
        score: 80,
        questionCount: 10,
        userId: mockUserId,
      };

      const mockGameStats: UserGameStats = {
        userId: mockUserId,
        totalPoints: 100,
        level: 1,
        quizzesCompleted: 5,
        perfectScores: 0,
        questionsAnswered: 50,
        currentStreak: 3,
        longestStreak: 5,
        lecturesRead: 0,
        totalBadges: 0,
        averageScore: 75,
        lastActivityDate: yesterday.toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(storage.getUserBadges).mockResolvedValue([]);
      vi.mocked(storage.getBadges).mockResolvedValue([]);
      vi.mocked(storage.getUserGameStats).mockResolvedValue(mockGameStats);
      vi.mocked(storage.updateUserGameStats).mockResolvedValue(undefined);
      vi.mocked(storage.getUserQuizzes).mockResolvedValue([]);

      await achievementService.processQuizCompletion(mockUserId, mockQuiz as Quiz, mockTenantId);

      // Verify streak was incremented
      expect(storage.updateUserGameStats).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          currentStreak: 4,
          longestStreak: 5, // Longest stays the same
        }),
        mockTenantId
      );
    });

    it('should reset streak if last activity was more than 2 days ago', async () => {
      const today = new Date();
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const mockQuiz: Partial<Quiz> = {
        id: 1,
        score: 80,
        questionCount: 10,
        userId: mockUserId,
      };

      const mockGameStats: UserGameStats = {
        userId: mockUserId,
        totalPoints: 100,
        level: 1,
        quizzesCompleted: 5,
        perfectScores: 0,
        questionsAnswered: 50,
        currentStreak: 5,
        longestStreak: 10,
        lecturesRead: 0,
        totalBadges: 0,
        averageScore: 75,
        lastActivityDate: threeDaysAgo.toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(storage.getUserBadges).mockResolvedValue([]);
      vi.mocked(storage.getBadges).mockResolvedValue([]);
      vi.mocked(storage.getUserGameStats).mockResolvedValue(mockGameStats);
      vi.mocked(storage.updateUserGameStats).mockResolvedValue(undefined);
      vi.mocked(storage.getUserQuizzes).mockResolvedValue([]);

      await achievementService.processQuizCompletion(mockUserId, mockQuiz as Quiz, mockTenantId);

      // Verify streak was reset to 1
      expect(storage.updateUserGameStats).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          currentStreak: 1,
          longestStreak: 10, // Longest unchanged
        }),
        mockTenantId
      );
    });

    it('should calculate average score correctly', async () => {
      const mockQuiz: Partial<Quiz> = {
        id: 1,
        score: 90,
        questionCount: 10,
        userId: mockUserId,
      };

      const mockGameStats: UserGameStats = {
        userId: mockUserId,
        totalPoints: 100,
        level: 1,
        quizzesCompleted: 4,
        perfectScores: 0,
        questionsAnswered: 40,
        currentStreak: 1,
        longestStreak: 1,
        lecturesRead: 0,
        totalBadges: 0,
        averageScore: 80, // 4 quizzes with average of 80
        lastActivityDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(storage.getUserBadges).mockResolvedValue([]);
      vi.mocked(storage.getBadges).mockResolvedValue([]);
      vi.mocked(storage.getUserGameStats).mockResolvedValue(mockGameStats);
      vi.mocked(storage.updateUserGameStats).mockResolvedValue(undefined);
      vi.mocked(storage.getUserQuizzes).mockResolvedValue([]);

      await achievementService.processQuizCompletion(mockUserId, mockQuiz as Quiz, mockTenantId);

      // New average: (80 * 4 + 90) / 5 = 82
      expect(storage.updateUserGameStats).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          averageScore: 82,
        }),
        mockTenantId
      );
    });

    it('should handle errors gracefully', async () => {
      const mockQuiz: Partial<Quiz> = {
        id: 1,
        score: 80,
        questionCount: 10,
        userId: mockUserId,
      };

      vi.mocked(storage.getUserGameStats).mockRejectedValue(new Error('Database error'));

      // Should not throw, but log error
      await expect(
        achievementService.processQuizCompletion(mockUserId, mockQuiz as Quiz, mockTenantId)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getBadgeProgress', () => {
    it('should calculate progress for quizzes_completed badge', async () => {
      const mockBadge: Badge = {
        id: 1,
        name: '10 Quizzes',
        description: 'Complete 10 quizzes',
        icon: 'check',
        requirement: JSON.stringify({ type: 'quizzes_completed', value: 10 }),
        points: 50,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockGameStats: UserGameStats = {
        userId: mockUserId,
        totalPoints: 100,
        level: 1,
        quizzesCompleted: 7,
        perfectScores: 0,
        questionsAnswered: 70,
        currentStreak: 1,
        longestStreak: 1,
        lecturesRead: 0,
        totalBadges: 0,
        averageScore: 75,
        lastActivityDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(storage.getUserGameStats).mockResolvedValue(mockGameStats);

      const progress = await achievementService.getBadgeProgress(
        mockUserId,
        mockBadge,
        mockTenantId
      );

      expect(progress).toEqual({
        current: 7,
        required: 10,
        percentage: 70,
      });
    });

    it('should return 100% for completed badges', async () => {
      const mockBadge: Badge = {
        id: 1,
        name: '5 Perfect Scores',
        description: 'Get 5 perfect scores',
        icon: 'star',
        requirement: JSON.stringify({ type: 'perfect_score', value: 5 }),
        points: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockGameStats: UserGameStats = {
        userId: mockUserId,
        totalPoints: 500,
        level: 5,
        quizzesCompleted: 20,
        perfectScores: 8,
        questionsAnswered: 200,
        currentStreak: 1,
        longestStreak: 5,
        lecturesRead: 0,
        totalBadges: 1,
        averageScore: 85,
        lastActivityDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(storage.getUserGameStats).mockResolvedValue(mockGameStats);

      const progress = await achievementService.getBadgeProgress(
        mockUserId,
        mockBadge,
        mockTenantId
      );

      expect(progress).toEqual({
        current: 8,
        required: 5,
        percentage: 100,
      });
    });

    it('should handle invalid badge requirements', async () => {
      const mockBadge: Badge = {
        id: 1,
        name: 'Invalid Badge',
        description: 'Invalid',
        icon: 'x',
        requirement: 'invalid json',
        points: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockGameStats: UserGameStats = {
        userId: mockUserId,
        totalPoints: 0,
        level: 1,
        quizzesCompleted: 0,
        perfectScores: 0,
        questionsAnswered: 0,
        currentStreak: 0,
        longestStreak: 0,
        lecturesRead: 0,
        totalBadges: 0,
        averageScore: 0,
        lastActivityDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(storage.getUserGameStats).mockResolvedValue(mockGameStats);

      const progress = await achievementService.getBadgeProgress(
        mockUserId,
        mockBadge,
        mockTenantId
      );

      expect(progress).toEqual({
        current: 0,
        required: 0,
        percentage: 0,
      });
    });
  });
});
