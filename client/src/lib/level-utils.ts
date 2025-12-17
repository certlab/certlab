import type { UserStats } from '@shared/schema';

/**
 * Calculate user level, current XP, and XP goal based on quiz statistics
 * @param stats User statistics containing quiz data
 * @returns Object containing level, currentXP, xpGoal, and xpProgress percentage
 */
export function calculateLevelAndXP(stats: UserStats | undefined) {
  // Level increases every 10 quizzes completed
  const level = stats ? Math.floor((stats.totalQuizzes || 0) / 10) + 1 : 1;

  // XP calculation: 250 XP per quiz in current level + bonus from average score
  const currentXP = stats
    ? ((stats.totalQuizzes || 0) % 10) * 250 + Math.floor((stats.averageScore || 0) * 5)
    : 0;

  // XP goal increases with each level
  const xpGoal = level * 1000;

  // Calculate progress percentage
  const xpProgress = (currentXP / xpGoal) * 100;

  return {
    level,
    currentXP,
    xpGoal,
    xpProgress: Math.min(xpProgress, 100), // Cap at 100%
  };
}
