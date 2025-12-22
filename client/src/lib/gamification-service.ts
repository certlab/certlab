/**
 * Gamification Service V2 for CertLab
 *
 * This module handles the Gamification V2 features including:
 * - Quest progress tracking
 * - Daily login rewards
 * - Reward claiming
 * - Title unlocking
 * - Streak freeze management
 *
 * @module gamification-service
 */

import { storage } from './storage-factory';
import type { Quiz, Quest, UserGameStats } from '@shared/schema';

/**
 * Quest requirement types that can be tracked
 */
type QuestRequirementType =
  | 'quizzes_completed'
  | 'questions_answered'
  | 'perfect_scores'
  | 'study_streak';

/**
 * Results from processing quest updates
 */
interface QuestProcessResult {
  completedQuests: Quest[];
  pointsEarned: number;
  titlesUnlocked: string[];
}

/**
 * Results from claiming daily rewards
 */
interface DailyRewardClaimResult {
  pointsEarned: number;
  streakFreezeGranted: boolean;
  day: number;
}

class GamificationService {
  /**
   * Process quest updates after quiz completion
   * Updates quest progress and completes quests that meet their targets
   */
  async processQuestUpdates(
    userId: string,
    quiz: Quiz,
    tenantId: number = 1
  ): Promise<QuestProcessResult> {
    const completedQuests: Quest[] = [];
    let totalPointsEarned = 0;
    const titlesUnlocked: string[] = [];

    try {
      // Get active quests
      const activeQuests = await storage.getActiveQuests();

      // Get user's current game stats for streak-based quests
      const gameStats = await storage.getUserGameStats(userId);

      // Get user's quiz history for counting
      const userQuizzes = await storage.getUserQuizzes(userId, tenantId);
      const completedQuizzes = userQuizzes.filter((q) => q.completedAt);

      for (const quest of activeQuests) {
        // Get current progress for this quest
        const questProgress = await storage.getUserQuestProgressByQuest(userId, quest.id, tenantId);

        // Skip if already completed
        if (questProgress?.isCompleted) {
          continue;
        }

        // Calculate new progress based on quest requirement type
        let newProgress = 0;
        const requirement = quest.requirement as { type: QuestRequirementType; target: number };

        switch (requirement.type) {
          case 'quizzes_completed':
            newProgress = completedQuizzes.length;
            break;

          case 'questions_answered':
            const totalCorrect = completedQuizzes.reduce(
              (sum, q) => sum + (q.correctAnswers || 0),
              0
            );
            newProgress = totalCorrect;
            break;

          case 'perfect_scores':
            const perfectScores = completedQuizzes.filter((q) => q.score === 100).length;
            newProgress = perfectScores;
            break;

          case 'study_streak':
            newProgress = gameStats?.currentStreak || 0;
            break;

          default:
            console.warn(`Unknown quest requirement type: ${requirement.type}`);
            continue;
        }

        // Update progress in database
        await storage.updateUserQuestProgress(userId, quest.id, newProgress, tenantId);

        // Check if quest is now complete
        if (newProgress >= requirement.target && !questProgress?.isCompleted) {
          await storage.completeQuest(userId, quest.id, tenantId);
          completedQuests.push(quest);

          // Award points (will be claimed separately)
          const reward = quest.reward as { points: number; title?: string };
          totalPointsEarned += reward.points;

          // Unlock title if provided
          if (reward.title) {
            await storage.unlockTitle(
              userId,
              reward.title,
              `Unlocked by completing: ${quest.title}`,
              'quest',
              tenantId
            );
            titlesUnlocked.push(reward.title);
          }
        }
      }
    } catch (error) {
      console.error('Failed to process quest updates:', error);
      // Don't throw - quest processing shouldn't break quiz completion
    }

    return { completedQuests, pointsEarned: totalPointsEarned, titlesUnlocked };
  }

  /**
   * Claim quest reward and update user points
   */
  async claimQuestReward(
    userId: string,
    questId: number,
    tenantId: number = 1
  ): Promise<{ pointsAwarded: number; quest: Quest }> {
    // Get the quest
    const allQuests = await storage.getQuests();
    const quest = allQuests.find((q) => q.id === questId);
    if (!quest) {
      throw new Error('Quest not found');
    }

    // Mark reward as claimed
    await storage.claimQuestReward(userId, questId, tenantId);

    // Award points to user
    const reward = quest.reward as { points: number };
    const gameStats = await storage.getUserGameStats(userId);
    const newPoints = (gameStats?.totalPoints || 0) + reward.points;

    await storage.updateUserGameStats(userId, {
      totalPoints: newPoints,
    });

    return { pointsAwarded: reward.points, quest };
  }

  /**
   * Process daily login and check if user should receive a reward
   * Should be called when user logs in or app loads
   */
  async processDailyLogin(
    userId: string,
    tenantId: number = 1
  ): Promise<{ shouldShowReward: boolean; day: number; reward?: DailyRewardClaimResult }> {
    try {
      // Get user's game stats
      const gameStats = await storage.getUserGameStats(userId);
      const lastLogin = gameStats?.lastLoginDate;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if user already logged in today
      if (lastLogin) {
        const lastLoginDate = new Date(lastLogin);
        lastLoginDate.setHours(0, 0, 0, 0);

        if (lastLoginDate.getTime() === today.getTime()) {
          // Already logged in today
          return { shouldShowReward: false, day: 0 };
        }
      }

      // Update last login date
      const consecutiveDays = this.calculateConsecutiveDays(gameStats);
      const currentDay = (consecutiveDays % 7) + 1; // 1-7 cycle

      await storage.updateUserGameStats(userId, {
        lastLoginDate: today,
        consecutiveLoginDays: consecutiveDays,
      });

      // Check if reward already claimed for this day
      const alreadyClaimed = await storage.hasClaimedDailyReward(userId, currentDay);
      if (alreadyClaimed) {
        return { shouldShowReward: false, day: currentDay };
      }

      return { shouldShowReward: true, day: currentDay };
    } catch (error) {
      console.error('Failed to process daily login:', error);
      return { shouldShowReward: false, day: 0 };
    }
  }

  /**
   * Claim daily reward for the current day
   */
  async claimDailyReward(
    userId: string,
    day: number,
    tenantId: number = 1
  ): Promise<DailyRewardClaimResult> {
    // Claim the reward
    const claim = await storage.claimDailyReward(userId, day, tenantId);
    const rewardData = claim.rewardData as { points: number; streakFreeze?: boolean };

    // Update user points
    const gameStats = await storage.getUserGameStats(userId);
    const newPoints = (gameStats?.totalPoints || 0) + rewardData.points;

    const updates: any = {
      totalPoints: newPoints,
    };

    // Grant streak freeze if it's part of the reward
    if (rewardData.streakFreeze) {
      const currentFreezes = gameStats?.streakFreezes || 1;
      updates.streakFreezes = Math.min(currentFreezes + 1, 2); // Max 2 freezes
    }

    await storage.updateUserGameStats(userId, updates);

    return {
      pointsEarned: rewardData.points,
      streakFreezeGranted: !!rewardData.streakFreeze,
      day,
    };
  }

  /**
   * Calculate consecutive login days
   */
  private calculateConsecutiveDays(gameStats: UserGameStats | undefined): number {
    if (!gameStats?.lastLoginDate) {
      return 1; // First login
    }

    const lastLogin = new Date(gameStats.lastLoginDate);
    const today = new Date();

    // Reset time components for date comparison
    lastLogin.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Same day - keep current count
      return gameStats.consecutiveLoginDays || 1;
    } else if (diffDays === 1) {
      // Next day - increment
      return (gameStats.consecutiveLoginDays || 0) + 1;
    } else {
      // Streak broken - reset
      return 1;
    }
  }

  /**
   * Use a streak freeze to protect the user's streak
   * This should be called automatically when a user would lose their streak
   */
  async useStreakFreeze(userId: string): Promise<boolean> {
    const gameStats = await storage.getUserGameStats(userId);
    const freezes = gameStats?.streakFreezes || 0;

    if (freezes > 0) {
      await storage.updateUserGameStats(userId, {
        streakFreezes: freezes - 1,
        lastStreakFreezeReset: new Date(),
      });
      return true;
    }

    return false;
  }

  /**
   * Reset weekly streak freezes (should be called weekly via a scheduled job)
   */
  async resetWeeklyStreakFreezes(userId: string): Promise<void> {
    const gameStats = await storage.getUserGameStats(userId);
    const lastReset = gameStats?.lastStreakFreezeReset;
    const now = new Date();

    // Check if a week has passed since last reset
    if (lastReset) {
      const daysSinceReset = Math.floor(
        (now.getTime() - new Date(lastReset).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceReset < 7) {
        return; // Not time to reset yet
      }
    }

    // Reset to 1 free freeze per week
    await storage.updateUserGameStats(userId, {
      streakFreezes: 1,
      lastStreakFreezeReset: now,
    });
  }

  /**
   * Get user's available titles
   */
  async getUserAvailableTitles(userId: string, tenantId: number = 1): Promise<any[]> {
    return await storage.getUserTitles(userId, tenantId);
  }

  /**
   * Set user's selected title
   */
  async setUserTitle(userId: string, title: string | null): Promise<void> {
    await storage.setSelectedTitle(userId, title);
  }
}

export const gamificationService = new GamificationService();
