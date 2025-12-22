/**
 * Smart Study Recommendations Engine
 *
 * This module provides AI-powered study recommendations based on:
 * - Historical performance analysis
 * - Weak area detection
 * - Time-of-day performance patterns
 * - Learning velocity tracking
 * - Difficulty progression
 * - Certification readiness assessment
 *
 * @module smart-recommendations
 */

import type {
  Quiz,
  MasteryScore,
  Question,
  Category,
  Subcategory,
  UserProgress,
} from '@shared/schema';

/**
 * Study recommendation with priority and reasoning
 */
export interface StudyRecommendation {
  id: string;
  type:
    | 'focus_area'
    | 'difficulty_adjustment'
    | 'time_optimization'
    | 'streak_building'
    | 'readiness';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  categoryId?: number;
  subcategoryId?: number;
  suggestedQuestionCount?: number;
  suggestedDifficulty?: number;
  estimatedTimeMinutes?: number;
  reasoning: string;
  actionUrl?: string;
  confidence: number; // 0-100%
}

/**
 * Certification readiness assessment
 */
export interface ReadinessScore {
  overall: number; // 0-100%
  categoryScores: {
    categoryId: number;
    categoryName: string;
    score: number;
    questionsAnswered: number;
    averageScore: number;
    recommendedStudyTime: number; // minutes
  }[];
  estimatedDaysToReady: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  weakAreas: WeakArea[];
  strengths: string[];
  nextSteps: string[];
}

/**
 * Weak area analysis
 */
export interface WeakArea {
  categoryId: number;
  categoryName: string;
  subcategoryId?: number;
  subcategoryName?: string;
  currentScore: number;
  targetScore: number;
  questionsNeeded: number;
  priorityLevel: 'critical' | 'high' | 'medium' | 'low';
  improvementTrend: 'improving' | 'stable' | 'declining';
}

/**
 * Time-of-day performance analysis
 */
export interface TimeOfDayPerformance {
  hour: number;
  averageScore: number;
  quizCount: number;
  optimalForStudy: boolean;
}

/**
 * Learning velocity metrics
 */
export interface LearningVelocity {
  questionsPerDay: number;
  averageScoreImprovement: number; // percentage points per week
  streakConsistency: number; // 0-100%
  masteryGrowthRate: number; // percentage points per week
  predictedCertificationDate: Date | null;
}

/**
 * Performance analysis for a specific topic/category
 */
export interface PerformanceMetrics {
  totalAttempts: number;
  correctAnswers: number;
  accuracy: number; // 0-100%
  averageTime: number; // seconds per question
  difficultyDistribution: {
    level: number;
    count: number;
    accuracy: number;
  }[];
  recentTrend: 'improving' | 'stable' | 'declining';
  lastAttemptDate: Date | null;
}

/**
 * Calculate readiness score for certification
 */
export function calculateReadinessScore(
  quizzes: Quiz[],
  masteryScores: MasteryScore[],
  categories: Category[],
  subcategories: Subcategory[],
  userProgress: UserProgress[]
): ReadinessScore {
  const passingThreshold = 85; // 85% is typically considered passing
  const readyThreshold = 90; // 90% for high confidence

  // Calculate category-level scores
  const categoryScores = categories.map((category) => {
    const categoryMastery = masteryScores.filter((m) => m.categoryId === category.id);
    const categoryQuizzes = quizzes.filter(
      (q) => q.categoryIds && Array.isArray(q.categoryIds) && q.categoryIds.includes(category.id)
    );

    const totalAnswers = categoryMastery.reduce((sum, m) => sum + m.totalAnswers, 0);
    const correctAnswers = categoryMastery.reduce((sum, m) => sum + m.correctAnswers, 0);
    const averageScore = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;

    // Estimate recommended study time based on gap to passing
    const gap = passingThreshold - averageScore;
    const recommendedStudyTime = gap > 0 ? Math.ceil(gap * 2) : 0; // 2 minutes per percentage point

    return {
      categoryId: category.id,
      categoryName: category.name,
      score: Math.round(averageScore),
      questionsAnswered: totalAnswers,
      averageScore: Math.round(averageScore),
      recommendedStudyTime,
    };
  });

  // Calculate overall readiness (only consider categories with data)
  const categoriesWithData = categoryScores.filter((cs) => cs.questionsAnswered > 0);
  const totalScore = categoriesWithData.reduce((sum, c) => sum + c.score, 0);
  const overall =
    categoriesWithData.length > 0 ? Math.round(totalScore / categoriesWithData.length) : 0;

  // Identify weak areas (only for categories with actual data)
  const weakAreas: WeakArea[] = categoryScores
    .filter((cs) => cs.questionsAnswered > 0 && cs.score < passingThreshold)
    .map((cs) => {
      const category = categories.find((c) => c.id === cs.categoryId);
      const trend = analyzeScoreTrend(
        quizzes.filter(
          (q) =>
            q.categoryIds && Array.isArray(q.categoryIds) && q.categoryIds.includes(cs.categoryId)
        )
      );

      return {
        categoryId: cs.categoryId,
        categoryName: cs.categoryName,
        currentScore: cs.score,
        targetScore: passingThreshold,
        questionsNeeded: Math.ceil((passingThreshold - cs.score) * 2), // Rough estimate
        priorityLevel: cs.score < 70 ? 'critical' : cs.score < 80 ? 'high' : 'medium',
        improvementTrend: trend,
      } as WeakArea;
    })
    .sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priorityLevel] - priorityOrder[a.priorityLevel];
    });

  // Identify strengths
  const strengths = categoryScores
    .filter((cs) => cs.score >= readyThreshold)
    .map((cs) => cs.categoryName);

  // Calculate estimated days to ready
  const learningVelocity = calculateLearningVelocity(quizzes);
  const averageImprovementPerDay = learningVelocity.averageScoreImprovement / 7; // per day
  const gapToReady = readyThreshold - overall;
  const estimatedDaysToReady =
    gapToReady > 0 && averageImprovementPerDay > 0
      ? Math.ceil(gapToReady / averageImprovementPerDay)
      : gapToReady <= 0
        ? 0
        : 999; // Not enough data

  // Determine confidence level
  const totalQuestions = categoryScores.reduce((sum, c) => sum + c.questionsAnswered, 0);
  const confidenceLevel: 'high' | 'medium' | 'low' =
    totalQuestions > 100 && overall >= readyThreshold
      ? 'high'
      : totalQuestions > 50 && overall >= passingThreshold
        ? 'medium'
        : 'low';

  // Generate next steps
  const nextSteps = generateNextSteps(overall, weakAreas, strengths, categoryScores);

  return {
    overall,
    categoryScores,
    estimatedDaysToReady,
    confidenceLevel,
    weakAreas,
    strengths,
    nextSteps,
  };
}

/**
 * Generate personalized study recommendations
 */
export function generateStudyRecommendations(
  quizzes: Quiz[],
  masteryScores: MasteryScore[],
  categories: Category[],
  subcategories: Subcategory[],
  userProgress: UserProgress[]
): StudyRecommendation[] {
  const recommendations: StudyRecommendation[] = [];
  const readinessScore = calculateReadinessScore(
    quizzes,
    masteryScores,
    categories,
    subcategories,
    userProgress
  );

  // Recommendation 1: Focus on weakest areas
  if (readinessScore.weakAreas.length > 0) {
    const weakestArea = readinessScore.weakAreas[0];
    recommendations.push({
      id: `weak-area-${weakestArea.categoryId}`,
      type: 'focus_area',
      title: `Focus on ${weakestArea.categoryName}`,
      description: `Your ${weakestArea.categoryName} score is ${weakestArea.currentScore}%. Practice ${weakestArea.questionsNeeded} more questions to reach ${weakestArea.targetScore}%.`,
      priority: weakestArea.priorityLevel === 'critical' ? 'high' : 'medium',
      categoryId: weakestArea.categoryId,
      subcategoryId: weakestArea.subcategoryId,
      suggestedQuestionCount: Math.min(20, weakestArea.questionsNeeded),
      estimatedTimeMinutes: Math.min(30, weakestArea.questionsNeeded * 1.5),
      reasoning: `This area is ${weakestArea.improvementTrend}. Focused practice here will have the biggest impact on your overall readiness.`,
      actionUrl: `/quiz?category=${weakestArea.categoryId}`,
      confidence: 85,
    });
  }

  // Recommendation 2: Difficulty adjustment
  const avgScore =
    quizzes.length > 0 ? quizzes.reduce((sum, q) => sum + (q.score || 0), 0) / quizzes.length : 0;

  if (avgScore > 85 && quizzes.length >= 5) {
    recommendations.push({
      id: 'difficulty-increase',
      type: 'difficulty_adjustment',
      title: 'Challenge Yourself with Harder Questions',
      description: `You're scoring ${Math.round(avgScore)}% on average. Try harder questions to deepen your understanding.`,
      priority: 'medium',
      suggestedDifficulty: 4, // Scale 1-5
      suggestedQuestionCount: 15,
      estimatedTimeMinutes: 25,
      reasoning:
        'Your consistent high performance indicates readiness for more challenging material.',
      actionUrl: '/quiz?difficulty=4',
      confidence: 80,
    });
  } else if (avgScore < 60 && quizzes.length >= 5) {
    recommendations.push({
      id: 'difficulty-decrease',
      type: 'difficulty_adjustment',
      title: 'Build Foundation with Easier Questions',
      description: `Your current average is ${Math.round(avgScore)}%. Start with easier questions to build confidence.`,
      priority: 'high',
      suggestedDifficulty: 2,
      suggestedQuestionCount: 20,
      estimatedTimeMinutes: 30,
      reasoning: 'Building a strong foundation will improve long-term retention and confidence.',
      actionUrl: '/quiz?difficulty=2',
      confidence: 85,
    });
  }

  // Recommendation 3: Time optimization
  const timePerformance = analyzeTimeOfDayPerformance(quizzes);
  const bestTime = timePerformance.find((t) => t.optimalForStudy);
  if (bestTime && timePerformance.length >= 3) {
    const timeRange = getTimeRange(bestTime.hour);
    recommendations.push({
      id: 'time-optimization',
      type: 'time_optimization',
      title: `Study During Your Peak Hours (${timeRange})`,
      description: `You perform ${Math.round(bestTime.averageScore)}% better during ${timeRange}. Schedule study sessions then.`,
      priority: 'low',
      estimatedTimeMinutes: 30,
      reasoning: 'Aligning study time with peak performance hours maximizes learning efficiency.',
      confidence: 70,
    });
  }

  // Recommendation 4: Streak building
  const hasRecentActivity = quizzes.some((q) => {
    if (!q.completedAt) return false;
    const daysSince = (Date.now() - new Date(q.completedAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 1;
  });

  if (!hasRecentActivity && quizzes.length > 0) {
    recommendations.push({
      id: 'streak-building',
      type: 'streak_building',
      title: 'Maintain Your Study Streak',
      description: 'Keep your learning momentum going with a quick 5-question practice session.',
      priority: 'high',
      suggestedQuestionCount: 5,
      estimatedTimeMinutes: 8,
      reasoning: 'Daily practice, even in small doses, significantly improves retention.',
      actionUrl: '/quiz?quick=true',
      confidence: 90,
    });
  }

  // Recommendation 5: Readiness check
  if (readinessScore.overall >= 85) {
    recommendations.push({
      id: 'readiness-assessment',
      type: 'readiness',
      title: 'Take a Full Practice Test',
      description: `Your readiness score is ${readinessScore.overall}%. Validate your preparation with a complete practice exam.`,
      priority: 'high',
      estimatedTimeMinutes: 120,
      reasoning: 'Practice tests simulate real exam conditions and identify any remaining gaps.',
      actionUrl: '/practice-tests',
      confidence: 90,
    });
  }

  // Sort by priority and confidence
  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.confidence - a.confidence;
  });
}

/**
 * Analyze time-of-day performance patterns
 */
export function analyzeTimeOfDayPerformance(quizzes: Quiz[]): TimeOfDayPerformance[] {
  const hourlyData: Map<number, { totalScore: number; count: number }> = new Map();

  quizzes.forEach((quiz) => {
    if (quiz.startedAt && quiz.score !== null && quiz.score !== undefined) {
      const hour = new Date(quiz.startedAt).getHours();
      const existing = hourlyData.get(hour) || { totalScore: 0, count: 0 };
      hourlyData.set(hour, {
        totalScore: existing.totalScore + quiz.score,
        count: existing.count + 1,
      });
    }
  });

  const results: TimeOfDayPerformance[] = [];
  hourlyData.forEach((data, hour) => {
    const averageScore = data.totalScore / data.count;
    results.push({
      hour,
      averageScore,
      quizCount: data.count,
      optimalForStudy: false,
    });
  });

  // Mark optimal times (above average + sufficient data)
  if (results.length > 0) {
    const overallAvg = results.reduce((sum, r) => sum + r.averageScore, 0) / results.length;
    results.forEach((r) => {
      r.optimalForStudy = r.averageScore > overallAvg && r.quizCount >= 2;
    });
  }

  return results.sort((a, b) => a.hour - b.hour);
}

/**
 * Calculate learning velocity metrics
 */
export function calculateLearningVelocity(quizzes: Quiz[]): LearningVelocity {
  if (quizzes.length === 0) {
    return {
      questionsPerDay: 0,
      averageScoreImprovement: 0,
      streakConsistency: 0,
      masteryGrowthRate: 0,
      predictedCertificationDate: null,
    };
  }

  // Sort quizzes by date
  const sortedQuizzes = [...quizzes]
    .filter((q) => q.startedAt)
    .sort((a, b) => new Date(a.startedAt!).getTime() - new Date(b.startedAt!).getTime());

  if (sortedQuizzes.length === 0) {
    return {
      questionsPerDay: 0,
      averageScoreImprovement: 0,
      streakConsistency: 0,
      masteryGrowthRate: 0,
      predictedCertificationDate: null,
    };
  }

  const firstDate = new Date(sortedQuizzes[0].startedAt!);
  const lastDate = new Date(sortedQuizzes[sortedQuizzes.length - 1].startedAt!);
  const daysDiff = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

  // Questions per day
  const totalQuestions = sortedQuizzes.reduce((sum, q) => sum + (q.totalQuestions || 0), 0);
  const questionsPerDay = totalQuestions / daysDiff;

  // Score improvement over time
  const weeklyScoreImprovement = calculateWeeklyScoreImprovement(sortedQuizzes);

  // Streak consistency
  const streakConsistency = calculateStreakConsistency(sortedQuizzes);

  // Mastery growth rate
  const masteryGrowthRate = weeklyScoreImprovement; // Same metric for now

  // Predicted certification date (if we have enough data)
  let predictedCertificationDate: Date | null = null;
  if (weeklyScoreImprovement > 0 && sortedQuizzes.length >= 5) {
    const recentAvg = sortedQuizzes.slice(-5).reduce((sum, q) => sum + (q.score || 0), 0) / 5;
    const weeksNeeded = Math.max(0, (85 - recentAvg) / weeklyScoreImprovement);
    predictedCertificationDate = new Date(
      lastDate.getTime() + weeksNeeded * 7 * 24 * 60 * 60 * 1000
    );
  }

  return {
    questionsPerDay: Math.round(questionsPerDay * 10) / 10,
    averageScoreImprovement: Math.round(weeklyScoreImprovement * 10) / 10,
    streakConsistency: Math.round(streakConsistency),
    masteryGrowthRate: Math.round(masteryGrowthRate * 10) / 10,
    predictedCertificationDate,
  };
}

/**
 * Analyze performance for a specific category/subcategory
 */
export function analyzePerformance(
  quizzes: Quiz[],
  questions: Question[],
  categoryId?: number,
  subcategoryId?: number
): PerformanceMetrics {
  const filteredQuizzes = quizzes.filter((q) => {
    if (
      categoryId &&
      (!q.categoryIds || !Array.isArray(q.categoryIds) || !q.categoryIds.includes(categoryId))
    ) {
      return false;
    }
    if (
      subcategoryId &&
      (!q.subcategoryIds ||
        !Array.isArray(q.subcategoryIds) ||
        !q.subcategoryIds.includes(subcategoryId))
    ) {
      return false;
    }
    return true;
  });

  const totalAttempts = filteredQuizzes.reduce((sum, q) => sum + (q.totalQuestions || 0), 0);
  const correctAnswers = filteredQuizzes.reduce((sum, q) => sum + (q.correctAnswers || 0), 0);
  const accuracy = totalAttempts > 0 ? (correctAnswers / totalAttempts) * 100 : 0;

  // Calculate average time per question (if time data available)
  const averageTime = 0; // Placeholder - would need timing data

  // Difficulty distribution (placeholder - would need question difficulty data)
  const difficultyDistribution = [
    { level: 1, count: 0, accuracy: 0 },
    { level: 2, count: 0, accuracy: 0 },
    { level: 3, count: 0, accuracy: 0 },
    { level: 4, count: 0, accuracy: 0 },
    { level: 5, count: 0, accuracy: 0 },
  ];

  // Recent trend
  const recentTrend = analyzeScoreTrend(filteredQuizzes);

  // Last attempt date
  const lastAttemptDate =
    filteredQuizzes.length > 0 && filteredQuizzes[filteredQuizzes.length - 1].completedAt
      ? new Date(filteredQuizzes[filteredQuizzes.length - 1].completedAt!)
      : null;

  return {
    totalAttempts,
    correctAnswers,
    accuracy: Math.round(accuracy * 10) / 10,
    averageTime,
    difficultyDistribution,
    recentTrend,
    lastAttemptDate,
  };
}

// Helper functions

function analyzeScoreTrend(quizzes: Quiz[]): 'improving' | 'stable' | 'declining' {
  if (quizzes.length < 3) return 'stable';

  const recentQuizzes = quizzes.slice(-5);
  const scores = recentQuizzes.map((q) => q.score || 0);

  // Simple linear regression
  const n = scores.length;
  const sumX = (n * (n + 1)) / 2;
  const sumY = scores.reduce((sum, score) => sum + score, 0);
  const sumXY = scores.reduce((sum, score, i) => sum + score * (i + 1), 0);
  const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  if (slope > 1) return 'improving';
  if (slope < -1) return 'declining';
  return 'stable';
}

function calculateWeeklyScoreImprovement(quizzes: Quiz[]): number {
  if (quizzes.length < 4) return 0;

  const firstWeekQuizzes = quizzes.slice(0, Math.ceil(quizzes.length / 2));
  const secondWeekQuizzes = quizzes.slice(Math.ceil(quizzes.length / 2));

  const firstWeekAvg =
    firstWeekQuizzes.reduce((sum, q) => sum + (q.score || 0), 0) / firstWeekQuizzes.length;
  const secondWeekAvg =
    secondWeekQuizzes.reduce((sum, q) => sum + (q.score || 0), 0) / secondWeekQuizzes.length;

  return secondWeekAvg - firstWeekAvg;
}

function calculateStreakConsistency(quizzes: Quiz[]): number {
  if (quizzes.length < 2) return 0;

  let consistentDays = 0;
  let totalDays = 0;

  for (let i = 1; i < quizzes.length; i++) {
    const prevDate = new Date(quizzes[i - 1].startedAt!);
    const currDate = new Date(quizzes[i].startedAt!);
    const daysDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

    totalDays++;
    if (daysDiff <= 1.5) {
      // Allow some flexibility
      consistentDays++;
    }
  }

  return totalDays > 0 ? (consistentDays / totalDays) * 100 : 0;
}

function generateNextSteps(
  overall: number,
  weakAreas: WeakArea[],
  strengths: string[],
  categoryScores: any[]
): string[] {
  const steps: string[] = [];

  if (overall < 70) {
    steps.push('Focus on building foundational knowledge across all categories');
    steps.push('Start with easier questions to build confidence');
    steps.push('Aim for 20-30 questions per study session');
  } else if (overall < 85) {
    if (weakAreas.length > 0) {
      steps.push(`Prioritize ${weakAreas[0].categoryName} - your weakest area`);
    }
    steps.push('Increase question difficulty to challenge yourself');
    steps.push('Review explanations for all incorrect answers');
  } else {
    steps.push('Take full-length practice exams under timed conditions');
    steps.push('Focus on weak subcategories to achieve 90%+ mastery');
    steps.push('Review advanced topics and edge cases');
  }

  if (weakAreas.length > 2) {
    steps.push(`Address ${weakAreas.length} weak areas systematically`);
  }

  return steps;
}

function getTimeRange(hour: number): string {
  if (hour < 12) return `${hour}AM-${hour + 1}AM`;
  if (hour === 12) return '12PM-1PM';
  if (hour < 24) return `${hour - 12}PM-${hour - 11}PM`;
  return 'morning';
}
