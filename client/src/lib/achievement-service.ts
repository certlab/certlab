/**
 * Achievement Service Module for CertLab
 *
 * This module handles the gamification system including:
 * - Checking and awarding badges after quiz completion
 * - Updating user game statistics (points, streaks, levels)
 * - Calculating progress towards badges
 *
 * ## Badge Requirement Types
 *
 * Badges are awarded based on various requirement types:
 * - `quizzes_completed`: Number of quizzes completed
 * - `perfect_score`: Number of 100% scores achieved
 * - `study_streak`: Consecutive days of study activity
 * - `lectures_read`: Number of lectures read
 * - `high_score`: Achieving a specific score threshold
 * - `questions_answered`: Total questions answered correctly
 * - `total_points`: Total gamification points earned
 *
 * ## Usage
 *
 * The service is called after quiz submission:
 *
 * ```typescript
 * import { achievementService } from './achievement-service';
 *
 * // After a quiz is completed
 * await achievementService.processQuizCompletion(userId, quiz, tenantId);
 * ```
 *
 * @module achievement-service
 */

import { storage } from './storage-factory';
import type { Quiz, Badge, UserGameStats } from '@shared/schema';
import { calculateLevelFromPoints, calculatePointsForLevel } from './level-utils';

/**
 * Badge requirement structure for calculating progress and awarding badges
 */
interface BadgeRequirement {
  type:
    | 'quizzes_completed'
    | 'perfect_score'
    | 'study_streak'
    | 'lectures_read'
    | 'high_score'
    | 'questions_answered'
    | 'total_points';
  value: number;
}

/**
 * Points configuration for various activities
 */
export const POINTS_CONFIG = {
  /** Base points for completing any quiz */
  QUIZ_COMPLETION: 10,
  /** Bonus points per correct answer */
  CORRECT_ANSWER: 5,
  /** Bonus points for passing (>=85%) */
  PASSING_BONUS: 25,
  /** Bonus points for perfect score */
  PERFECT_SCORE_BONUS: 50,
  /** Points needed per level (level * this value) */
  POINTS_PER_LEVEL: 100,
};

class AchievementService {
  /**
   * Processes a completed quiz and awards badges/points.
   *
   * This is the main entry point called after a quiz is submitted.
   * It handles:
   * 1. Updating user game statistics (points, streaks)
   * 2. Checking for newly earned badges
   * 3. Creating user badge records for newly earned badges
   *
   * @param userId - The user who completed the quiz
   * @param quiz - The completed quiz with score data
   * @param tenantId - The tenant for data isolation
   * @returns Object with points earned and badges awarded
   */
  async processQuizCompletion(
    userId: string,
    quiz: Quiz,
    tenantId: number = 1
  ): Promise<{
    pointsEarned: number;
    newBadges: Badge[];
    levelUp: boolean;
    newLevel: number;
  }> {
    // Calculate points earned from this quiz
    const pointsEarned = this.calculateQuizPoints(quiz);

    // Get or create user game stats
    let gameStats = await storage.getUserGameStats(userId);

    // Calculate new streak
    const streakInfo = this.calculateStreak(gameStats);

    // Calculate new total points and level
    const newTotalPoints = (gameStats?.totalPoints || 0) + pointsEarned;
    const oldLevel = gameStats?.level || 1;
    const newLevel = calculateLevelFromPoints(newTotalPoints);
    const levelUp = newLevel > oldLevel;

    // Update game stats
    gameStats = await storage.updateUserGameStats(userId, {
      totalPoints: newTotalPoints,
      currentStreak: streakInfo.currentStreak,
      longestStreak: Math.max(gameStats?.longestStreak || 0, streakInfo.currentStreak),
      lastActivityDate: new Date(),
      level: newLevel,
      nextLevelPoints: calculatePointsForLevel(newLevel + 1),
    });

    // Check for new badges
    const newBadges = await this.checkAndAwardBadges(userId, quiz, gameStats, tenantId);

    // Update total badges earned count
    if (newBadges.length > 0) {
      await storage.updateUserGameStats(userId, {
        totalBadgesEarned: (gameStats.totalBadgesEarned || 0) + newBadges.length,
      });
    }

    return {
      pointsEarned,
      newBadges,
      levelUp,
      newLevel,
    };
  }

  /**
   * Calculates points earned from a completed quiz.
   */
  private calculateQuizPoints(quiz: Quiz): number {
    if (!quiz.completedAt || quiz.score === null) {
      return 0;
    }

    let points = POINTS_CONFIG.QUIZ_COMPLETION;

    // Add points for correct answers
    const correctAnswers = quiz.correctAnswers || 0;
    points += correctAnswers * POINTS_CONFIG.CORRECT_ANSWER;

    // Passing bonus
    if (quiz.isPassing || (quiz.score && quiz.score >= 85)) {
      points += POINTS_CONFIG.PASSING_BONUS;
    }

    // Perfect score bonus
    if (quiz.score === 100) {
      points += POINTS_CONFIG.PERFECT_SCORE_BONUS;
    }

    return points;
  }

  /**
   * Calculates the user's current streak based on activity dates.
   */
  private calculateStreak(gameStats: UserGameStats | undefined): {
    currentStreak: number;
    streakBroken: boolean;
  } {
    if (!gameStats?.lastActivityDate) {
      return { currentStreak: 1, streakBroken: false };
    }

    const lastActivity = new Date(gameStats.lastActivityDate);
    const today = new Date();

    // Reset time components for date comparison
    lastActivity.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Same day - keep current streak
      return { currentStreak: gameStats.currentStreak || 1, streakBroken: false };
    } else if (diffDays === 1) {
      // Next day - increment streak
      return { currentStreak: (gameStats.currentStreak || 0) + 1, streakBroken: false };
    } else {
      // Streak broken - reset to 1
      return { currentStreak: 1, streakBroken: true };
    }
  }

  /**
   * Checks all badges and awards any that the user has newly earned.
   */
  private async checkAndAwardBadges(
    userId: string,
    quiz: Quiz,
    gameStats: UserGameStats,
    tenantId: number
  ): Promise<Badge[]> {
    const allBadges = await storage.getBadges();
    const userBadges = await storage.getUserBadges(userId, tenantId);
    const earnedBadgeIds = new Set(userBadges.map((ub) => ub.badgeId));

    // Get user's quiz history for requirement calculations
    const userQuizzes = await storage.getUserQuizzes(userId, tenantId);
    const completedQuizzes = userQuizzes.filter((q) => q.completedAt);

    // Get user's lectures for lecture-based badges
    const userLectures = await storage.getUserLectures(userId, tenantId);
    const readLectures = userLectures.filter((l) => l.isRead);

    const newBadges: Badge[] = [];

    for (const badge of allBadges) {
      // Skip if already earned
      if (earnedBadgeIds.has(badge.id)) {
        continue;
      }

      const requirement = badge.requirement as BadgeRequirement;
      if (!requirement || !requirement.type) {
        continue;
      }

      let earned = false;
      let progress = 0;

      switch (requirement.type) {
        case 'quizzes_completed':
          progress = completedQuizzes.length;
          earned = progress >= requirement.value;
          break;

        case 'perfect_score': {
          const perfectScores = completedQuizzes.filter((q) => q.score === 100).length;
          progress = perfectScores;
          earned = progress >= requirement.value;
          break;
        }

        case 'study_streak':
          progress = gameStats.currentStreak || 0;
          earned = progress >= requirement.value;
          break;

        case 'lectures_read':
          progress = readLectures.length;
          earned = progress >= requirement.value;
          break;

        case 'high_score': {
          // Check if user has achieved a specific score threshold
          const highScores = completedQuizzes.filter((q) => (q.score || 0) >= requirement.value);
          earned = highScores.length > 0;
          break;
        }

        case 'questions_answered': {
          const totalCorrect = completedQuizzes.reduce(
            (sum, q) => sum + (q.correctAnswers || 0),
            0
          );
          progress = totalCorrect;
          earned = progress >= requirement.value;
          break;
        }

        case 'total_points':
          progress = gameStats.totalPoints || 0;
          earned = progress >= requirement.value;
          break;
      }

      if (earned) {
        // Award the badge
        await storage.createUserBadge({
          userId,
          tenantId,
          badgeId: badge.id,
          progress: 100,
          isNotified: false,
        });
        newBadges.push(badge);
      }
    }

    return newBadges;
  }

  /**
   * Gets the user's progress towards all badges.
   * Used by the achievement progress UI.
   */
  async getBadgeProgress(
    userId: string,
    tenantId: number = 1
  ): Promise<
    Array<{
      badge: Badge;
      earned: boolean;
      progress: number;
      progressText: string;
    }>
  > {
    const allBadges = await storage.getBadges();
    const userBadges = await storage.getUserBadges(userId, tenantId);
    const earnedBadgeIds = new Set(userBadges.map((ub) => ub.badgeId));

    const userQuizzes = await storage.getUserQuizzes(userId, tenantId);
    const completedQuizzes = userQuizzes.filter((q) => q.completedAt);

    const userLectures = await storage.getUserLectures(userId, tenantId);
    const readLectures = userLectures.filter((l) => l.isRead);

    const gameStats = await storage.getUserGameStats(userId);

    return allBadges.map((badge) => {
      const earned = earnedBadgeIds.has(badge.id);
      const requirement = badge.requirement as BadgeRequirement;

      if (earned) {
        return {
          badge,
          earned: true,
          progress: 100,
          progressText: 'Completed!',
        };
      }

      if (!requirement || !requirement.type) {
        return {
          badge,
          earned: false,
          progress: 0,
          progressText: 'Unknown requirement',
        };
      }

      let progress = 0;
      let progressText = '';

      switch (requirement.type) {
        case 'quizzes_completed':
          progress = Math.min(100, Math.round((completedQuizzes.length / requirement.value) * 100));
          progressText = `${completedQuizzes.length}/${requirement.value} quizzes completed`;
          break;

        case 'perfect_score': {
          const perfectScores = completedQuizzes.filter((q) => q.score === 100).length;
          progress = Math.min(100, Math.round((perfectScores / requirement.value) * 100));
          progressText = `${perfectScores}/${requirement.value} perfect scores`;
          break;
        }

        case 'study_streak': {
          const streak = gameStats?.currentStreak || 0;
          progress = Math.min(100, Math.round((streak / requirement.value) * 100));
          progressText = `${streak}/${requirement.value} day streak`;
          break;
        }

        case 'lectures_read':
          progress = Math.min(100, Math.round((readLectures.length / requirement.value) * 100));
          progressText = `${readLectures.length}/${requirement.value} lectures read`;
          break;

        case 'high_score': {
          const bestScore =
            completedQuizzes.length > 0
              ? Math.max(0, ...completedQuizzes.map((q) => q.score || 0))
              : 0;
          progress = Math.min(100, Math.round((bestScore / requirement.value) * 100));
          progressText =
            bestScore > 0
              ? `Best score: ${bestScore}% (target: ${requirement.value}%)`
              : `Achieve ${requirement.value}% on a quiz`;
          break;
        }

        case 'questions_answered': {
          const totalCorrect = completedQuizzes.reduce(
            (sum, q) => sum + (q.correctAnswers || 0),
            0
          );
          progress = Math.min(100, Math.round((totalCorrect / requirement.value) * 100));
          progressText = `${totalCorrect}/${requirement.value} correct answers`;
          break;
        }

        case 'total_points': {
          const points = gameStats?.totalPoints || 0;
          progress = Math.min(100, Math.round((points / requirement.value) * 100));
          progressText = `${points}/${requirement.value} points earned`;
          break;
        }
      }

      return {
        badge,
        earned: false,
        progress,
        progressText,
      };
    });
  }

  /**
   * Marks a lecture as read and checks for lecture-related badges.
   */
  async processLectureRead(
    userId: string,
    tenantId: number = 1
  ): Promise<{
    pointsEarned: number;
    newBadges: Badge[];
  }> {
    // Award points for reading a lecture
    const pointsEarned = 5;

    let gameStats = await storage.getUserGameStats(userId);
    const newTotalPoints = (gameStats?.totalPoints || 0) + pointsEarned;
    const newLevel = calculateLevelFromPoints(newTotalPoints);

    gameStats = await storage.updateUserGameStats(userId, {
      totalPoints: newTotalPoints,
      lastActivityDate: new Date(),
      level: newLevel,
      nextLevelPoints: calculatePointsForLevel(newLevel + 1),
    });

    // Check for lecture-based badges
    const allBadges = await storage.getBadges();
    const userBadges = await storage.getUserBadges(userId, tenantId);
    const earnedBadgeIds = new Set(userBadges.map((ub) => ub.badgeId));

    const userLectures = await storage.getUserLectures(userId, tenantId);
    const readLectures = userLectures.filter((l) => l.isRead);

    const newBadges: Badge[] = [];

    for (const badge of allBadges) {
      if (earnedBadgeIds.has(badge.id)) continue;

      const requirement = badge.requirement as BadgeRequirement;
      if (requirement?.type === 'lectures_read' && readLectures.length >= requirement.value) {
        await storage.createUserBadge({
          userId,
          tenantId,
          badgeId: badge.id,
          progress: 100,
          isNotified: false,
        });
        newBadges.push(badge);
      }
    }

    if (newBadges.length > 0) {
      await storage.updateUserGameStats(userId, {
        totalBadgesEarned: (gameStats.totalBadgesEarned || 0) + newBadges.length,
      });
    }

    return { pointsEarned, newBadges };
  }
}

export const achievementService = new AchievementService();
