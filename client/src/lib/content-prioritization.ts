import type { UserStats } from "@shared/schema";

export interface PriorityScore {
  id: string;
  priority: 'high' | 'medium' | 'low';
  score: number;
  reason: string;
}

export interface ContentPriorities {
  learningStreak: PriorityScore;
  quickActions: PriorityScore;
  masteryMeter: PriorityScore;
  recentActivity: PriorityScore;
  learningWizard: PriorityScore;
}

/**
 * Calculate content priority based on user stats and activity
 */
export function calculateContentPriorities(
  stats: UserStats | undefined,
  userGoals?: string[]
): ContentPriorities {
  const defaultStats = {
    totalQuizzes: 0,
    averageScore: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalXP: 0,
    level: 1,
    badgesEarned: 0
  };

  const userStats = stats || defaultStats;
  const hasGoals = userGoals && userGoals.length > 0;

  // Learning Streak Priority
  const streakPriority: PriorityScore = {
    id: 'learningStreak',
    priority: userStats.currentStreak === 0 ? 'high' : 
             userStats.currentStreak < 7 ? 'medium' : 'low',
    score: userStats.currentStreak === 0 ? 100 : 
           userStats.currentStreak < 7 ? 70 : 30,
    reason: userStats.currentStreak === 0 ? 'No active streak - motivation needed' :
            userStats.currentStreak < 7 ? 'Building momentum' : 'Maintaining streak'
  };

  // Quick Actions Priority
  const quickActionsPriority: PriorityScore = {
    id: 'quickActions',
    priority: userStats.totalQuizzes === 0 ? 'high' :
             userStats.averageScore < 70 ? 'high' : 'medium',
    score: userStats.totalQuizzes === 0 ? 95 :
           userStats.averageScore < 70 ? 85 : 60,
    reason: userStats.totalQuizzes === 0 ? 'New user needs guided start' :
            userStats.averageScore < 70 ? 'Needs focused practice' : 'Regular practice'
  };

  // Mastery Meter Priority
  const masteryPriority: PriorityScore = {
    id: 'masteryMeter',
    priority: userStats.totalQuizzes > 5 ? 'high' : 'low',
    score: userStats.totalQuizzes > 5 ? 80 : 20,
    reason: userStats.totalQuizzes > 5 ? 'Progress tracking valuable' : 'Insufficient data for meaningful display'
  };

  // Recent Activity Priority
  const activityPriority: PriorityScore = {
    id: 'recentActivity',
    priority: userStats.totalQuizzes > 3 ? 'medium' : 'low',
    score: userStats.totalQuizzes > 3 ? 65 : 25,
    reason: userStats.totalQuizzes > 3 ? 'Activity history available' : 'Limited activity to show'
  };

  // Learning Wizard Priority
  const wizardPriority: PriorityScore = {
    id: 'learningWizard',
    priority: !hasGoals || userStats.totalQuizzes < 3 ? 'high' : 'medium',
    score: !hasGoals || userStats.totalQuizzes < 3 ? 90 : 65,
    reason: !hasGoals ? 'No certification goals set' :
            userStats.totalQuizzes < 3 ? 'New user needs guidance' : 'Regular learning path'
  };

  return {
    learningStreak: streakPriority,
    quickActions: quickActionsPriority,
    masteryMeter: masteryPriority,
    recentActivity: activityPriority,
    learningWizard: wizardPriority
  };
}

/**
 * Get ordered list of content sections by priority
 */
export function getContentOrder(priorities: ContentPriorities): string[] {
  const sections = Object.values(priorities);
  
  return sections
    .sort((a, b) => b.score - a.score)
    .map(section => section.id);
}

/**
 * Check if content should be shown in quick view based on priority
 */
export function shouldShowInQuickView(contentId: string, priorities: ContentPriorities): boolean {
  const priority = priorities[contentId as keyof ContentPriorities];
  return priority?.priority === 'high' || priority?.score >= 80;
}

/**
 * Get personalized insights based on content priorities
 */
export function getPersonalizedInsights(priorities: ContentPriorities): any[] {
  const insights: any[] = [];
  
  if (priorities.learningStreak.priority === 'high') {
    insights.push({
      id: 'streak-insight',
      type: 'recommendation',
      title: 'Build Your Streak',
      message: "Start your learning streak today! Daily practice builds lasting knowledge.",
      priority: 'high',
      actionText: 'Start Quiz',
      actionUrl: '/quiz'
    });
  }
  
  if (priorities.quickActions.priority === 'high' && priorities.quickActions.reason.includes('focused practice')) {
    insights.push({
      id: 'focus-insight',
      type: 'weakness',
      title: 'Focus Areas',
      message: "Focus on your weaker areas to improve your overall performance.",
      priority: priorities.quickActions.priority,
      actionText: 'View Progress',
      actionUrl: '/progress'
    });
  }
  
  if (priorities.learningWizard.priority === 'high' && priorities.learningWizard.reason.includes('goals')) {
    insights.push({
      id: 'goals-insight',
      type: 'recommendation',
      title: 'Set Your Goals',
      message: "Set your certification goals to get personalized study recommendations.",
      priority: 'high',
      actionText: 'Set Goals',
      actionUrl: '/profile/settings'
    });
  }
  
  return insights;
}