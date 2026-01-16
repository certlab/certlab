/**
 * Gamification Service V2 Tests
 *
 * Tests quest processing, daily rewards, and title unlocking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { gamificationService } from './gamification-service';
import type {
  Quest,
  UserQuestProgress,
  UserGameStats,
  DailyReward,
  UserDailyReward,
} from '@shared/schema';

// Mock the storage module
vi.mock('./storage-factory', () => ({
  storage: {
    getActiveQuests: vi.fn(),
    getUserQuestProgress: vi.fn(),
    updateUserQuestProgress: vi.fn(),
    completeQuest: vi.fn(),
    getUserGameStats: vi.fn(),
    updateUserGameStats: vi.fn(),
    unlockTitle: vi.fn(),
    getDailyRewards: vi.fn(),
    getUserDailyReward: vi.fn(),
    createUserDailyReward: vi.fn(),
    updateUserDailyReward: vi.fn(),
  },
}));

import { storage } from './storage-factory';

describe('GamificationService', () => {
  const mockUserId = 'user-123';
  const mockTenantId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('processQuestUpdates', () => {
    it('should update quest progress after quiz completion', async () => {
      const mockQuest: Quest = {
        id: 1,
        name: 'Complete 5 Quizzes',
        description: 'Complete 5 quizzes',
        requirementType: 'quizzes_completed',
        targetValue: 5,
        rewardPoints: 100,
        titleReward: null,
        isActive: true,
        startDate: new Date().toISOString(),
        endDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockProgress: UserQuestProgress = {
        userId: mockUserId,
        questId: 1,
        currentValue: 3,
        isCompleted: false,
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockGameStats: UserGameStats = {
        userId: mockUserId,
        totalPoints: 500,
        level: 5,
        quizzesCompleted: 4,
        perfectScores: 1,
        questionsAnswered: 40,
        currentStreak: 2,
        longestStreak: 5,
        lecturesRead: 3,
        totalBadges: 2,
        averageScore: 85,
        lastActivityDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(storage.getActiveQuests).mockResolvedValue([mockQuest]);
      vi.mocked(storage.getUserQuestProgress).mockResolvedValue([mockProgress]);
      vi.mocked(storage.updateUserQuestProgress).mockResolvedValue(undefined);
      vi.mocked(storage.getUserGameStats).mockResolvedValue(mockGameStats);

      const result = await gamificationService.processQuestUpdates(
        mockUserId,
        mockGameStats,
        mockTenantId
      );

      expect(storage.updateUserQuestProgress).toHaveBeenCalledWith(
        mockUserId,
        1,
        4, // quizzesCompleted updated to 4
        mockTenantId
      );

      expect(result.completedQuests).toHaveLength(0); // Not completed yet
      expect(result.pointsEarned).toBe(0);
    });

    it('should complete quest when target is reached', async () => {
      const mockQuest: Quest = {
        id: 1,
        name: 'Complete 5 Quizzes',
        description: 'Complete 5 quizzes',
        requirementType: 'quizzes_completed',
        targetValue: 5,
        rewardPoints: 100,
        titleReward: null,
        isActive: true,
        startDate: new Date().toISOString(),
        endDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockProgress: UserQuestProgress = {
        userId: mockUserId,
        questId: 1,
        currentValue: 4,
        isCompleted: false,
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockGameStats: UserGameStats = {
        userId: mockUserId,
        totalPoints: 500,
        level: 5,
        quizzesCompleted: 5,
        perfectScores: 1,
        questionsAnswered: 50,
        currentStreak: 2,
        longestStreak: 5,
        lecturesRead: 3,
        totalBadges: 2,
        averageScore: 85,
        lastActivityDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(storage.getActiveQuests).mockResolvedValue([mockQuest]);
      vi.mocked(storage.getUserQuestProgress).mockResolvedValue([mockProgress]);
      vi.mocked(storage.completeQuest).mockResolvedValue(undefined);
      vi.mocked(storage.getUserGameStats).mockResolvedValue(mockGameStats);
      vi.mocked(storage.updateUserGameStats).mockResolvedValue(undefined);

      const result = await gamificationService.processQuestUpdates(
        mockUserId,
        mockGameStats,
        mockTenantId
      );

      expect(storage.completeQuest).toHaveBeenCalledWith(mockUserId, 1, mockTenantId);

      expect(result.completedQuests).toHaveLength(1);
      expect(result.completedQuests[0].id).toBe(1);
      expect(result.pointsEarned).toBe(100);

      // Verify game stats updated with quest points
      expect(storage.updateUserGameStats).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          totalPoints: 600, // 500 + 100
        }),
        mockTenantId
      );
    });

    it('should unlock title when quest with title reward is completed', async () => {
      const mockQuest: Quest = {
        id: 2,
        name: 'Perfect Streak',
        description: 'Get 3 perfect scores',
        requirementType: 'perfect_scores',
        targetValue: 3,
        rewardPoints: 200,
        titleReward: 'Quiz Master',
        isActive: true,
        startDate: new Date().toISOString(),
        endDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockProgress: UserQuestProgress = {
        userId: mockUserId,
        questId: 2,
        currentValue: 2,
        isCompleted: false,
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockGameStats: UserGameStats = {
        userId: mockUserId,
        totalPoints: 1000,
        level: 10,
        quizzesCompleted: 20,
        perfectScores: 3,
        questionsAnswered: 200,
        currentStreak: 5,
        longestStreak: 10,
        lecturesRead: 5,
        totalBadges: 5,
        averageScore: 90,
        lastActivityDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(storage.getActiveQuests).mockResolvedValue([mockQuest]);
      vi.mocked(storage.getUserQuestProgress).mockResolvedValue([mockProgress]);
      vi.mocked(storage.completeQuest).mockResolvedValue(undefined);
      vi.mocked(storage.getUserGameStats).mockResolvedValue(mockGameStats);
      vi.mocked(storage.updateUserGameStats).mockResolvedValue(undefined);
      vi.mocked(storage.unlockTitle).mockResolvedValue(undefined);

      const result = await gamificationService.processQuestUpdates(
        mockUserId,
        mockGameStats,
        mockTenantId
      );

      expect(storage.unlockTitle).toHaveBeenCalledWith(mockUserId, 'Quiz Master', mockTenantId);

      expect(result.titlesUnlocked).toContain('Quiz Master');
      expect(result.completedQuests).toHaveLength(1);
      expect(result.pointsEarned).toBe(200);
    });

    it('should not process already completed quests', async () => {
      const mockQuest: Quest = {
        id: 1,
        name: 'Complete 5 Quizzes',
        description: 'Complete 5 quizzes',
        requirementType: 'quizzes_completed',
        targetValue: 5,
        rewardPoints: 100,
        titleReward: null,
        isActive: true,
        startDate: new Date().toISOString(),
        endDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockProgress: UserQuestProgress = {
        userId: mockUserId,
        questId: 1,
        currentValue: 5,
        isCompleted: true,
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockGameStats: UserGameStats = {
        userId: mockUserId,
        totalPoints: 600,
        level: 6,
        quizzesCompleted: 10,
        perfectScores: 2,
        questionsAnswered: 100,
        currentStreak: 3,
        longestStreak: 5,
        lecturesRead: 3,
        totalBadges: 3,
        averageScore: 85,
        lastActivityDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(storage.getActiveQuests).mockResolvedValue([mockQuest]);
      vi.mocked(storage.getUserQuestProgress).mockResolvedValue([mockProgress]);
      vi.mocked(storage.getUserGameStats).mockResolvedValue(mockGameStats);

      const result = await gamificationService.processQuestUpdates(
        mockUserId,
        mockGameStats,
        mockTenantId
      );

      // Should not update already completed quest
      expect(storage.updateUserQuestProgress).not.toHaveBeenCalled();
      expect(storage.completeQuest).not.toHaveBeenCalled();
      expect(result.completedQuests).toHaveLength(0);
      expect(result.pointsEarned).toBe(0);
    });
  });

  describe('claimDailyReward', () => {
    it('should claim daily reward for first day', async () => {
      const mockReward: DailyReward = {
        day: 1,
        points: 10,
        streakFreezeGranted: false,
      };

      vi.mocked(storage.getDailyRewards).mockResolvedValue([mockReward]);
      vi.mocked(storage.getUserDailyReward).mockResolvedValue(null);
      vi.mocked(storage.createUserDailyReward).mockResolvedValue(undefined);
      vi.mocked(storage.getUserGameStats).mockResolvedValue({
        userId: mockUserId,
        totalPoints: 0,
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
      });
      vi.mocked(storage.updateUserGameStats).mockResolvedValue(undefined);

      const result = await gamificationService.claimDailyReward(mockUserId, 1, mockTenantId);

      expect(result.pointsEarned).toBe(10);
      expect(result.streakFreezeGranted).toBe(false);
      expect(result.day).toBe(1);

      expect(storage.createUserDailyReward).toHaveBeenCalledWith(mockUserId, 1, mockTenantId);

      expect(storage.updateUserGameStats).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          totalPoints: 10,
        }),
        mockTenantId
      );
    });

    it('should grant streak freeze on eligible days', async () => {
      const mockReward: DailyReward = {
        day: 7,
        points: 50,
        streakFreezeGranted: true,
      };

      vi.mocked(storage.getDailyRewards).mockResolvedValue([mockReward]);
      vi.mocked(storage.getUserDailyReward).mockResolvedValue(null);
      vi.mocked(storage.createUserDailyReward).mockResolvedValue(undefined);
      vi.mocked(storage.getUserGameStats).mockResolvedValue({
        userId: mockUserId,
        totalPoints: 100,
        level: 2,
        quizzesCompleted: 5,
        perfectScores: 0,
        questionsAnswered: 50,
        currentStreak: 7,
        longestStreak: 7,
        lecturesRead: 0,
        totalBadges: 1,
        averageScore: 80,
        lastActivityDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      vi.mocked(storage.updateUserGameStats).mockResolvedValue(undefined);

      const result = await gamificationService.claimDailyReward(mockUserId, 7, mockTenantId);

      expect(result.pointsEarned).toBe(50);
      expect(result.streakFreezeGranted).toBe(true);
      expect(result.day).toBe(7);
    });

    it('should not claim reward twice', async () => {
      const mockReward: DailyReward = {
        day: 1,
        points: 10,
        streakFreezeGranted: false,
      };

      const existingUserReward: UserDailyReward = {
        userId: mockUserId,
        day: 1,
        claimedAt: new Date().toISOString(),
      };

      vi.mocked(storage.getDailyRewards).mockResolvedValue([mockReward]);
      vi.mocked(storage.getUserDailyReward).mockResolvedValue(existingUserReward);

      await expect(
        gamificationService.claimDailyReward(mockUserId, 1, mockTenantId)
      ).rejects.toThrow('Reward already claimed');

      expect(storage.createUserDailyReward).not.toHaveBeenCalled();
      expect(storage.updateUserGameStats).not.toHaveBeenCalled();
    });

    it('should throw error for invalid day', async () => {
      vi.mocked(storage.getDailyRewards).mockResolvedValue([]);

      await expect(
        gamificationService.claimDailyReward(mockUserId, 999, mockTenantId)
      ).rejects.toThrow('Invalid reward day');
    });
  });

  describe('getQuestProgress', () => {
    it('should return quest progress for user', async () => {
      const mockQuest: Quest = {
        id: 1,
        name: 'Answer 100 Questions',
        description: 'Answer 100 questions correctly',
        requirementType: 'questions_answered',
        targetValue: 100,
        rewardPoints: 50,
        titleReward: null,
        isActive: true,
        startDate: new Date().toISOString(),
        endDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockProgress: UserQuestProgress = {
        userId: mockUserId,
        questId: 1,
        currentValue: 65,
        isCompleted: false,
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(storage.getUserQuestProgress).mockResolvedValue([mockProgress]);

      const result = await gamificationService.getQuestProgress(
        mockUserId,
        mockQuest,
        mockTenantId
      );

      expect(result).toEqual({
        current: 65,
        target: 100,
        percentage: 65,
        isCompleted: false,
      });
    });

    it('should return 100% for completed quests', async () => {
      const mockQuest: Quest = {
        id: 1,
        name: 'Complete 10 Quizzes',
        description: 'Complete 10 quizzes',
        requirementType: 'quizzes_completed',
        targetValue: 10,
        rewardPoints: 100,
        titleReward: null,
        isActive: true,
        startDate: new Date().toISOString(),
        endDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockProgress: UserQuestProgress = {
        userId: mockUserId,
        questId: 1,
        currentValue: 15,
        isCompleted: true,
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(storage.getUserQuestProgress).mockResolvedValue([mockProgress]);

      const result = await gamificationService.getQuestProgress(
        mockUserId,
        mockQuest,
        mockTenantId
      );

      expect(result).toEqual({
        current: 15,
        target: 10,
        percentage: 100,
        isCompleted: true,
      });
    });

    it('should return 0 progress for new quests', async () => {
      const mockQuest: Quest = {
        id: 1,
        name: 'New Quest',
        description: 'New quest',
        requirementType: 'quizzes_completed',
        targetValue: 5,
        rewardPoints: 25,
        titleReward: null,
        isActive: true,
        startDate: new Date().toISOString(),
        endDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(storage.getUserQuestProgress).mockResolvedValue([]);

      const result = await gamificationService.getQuestProgress(
        mockUserId,
        mockQuest,
        mockTenantId
      );

      expect(result).toEqual({
        current: 0,
        target: 5,
        percentage: 0,
        isCompleted: false,
      });
    });
  });
});
