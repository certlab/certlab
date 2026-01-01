import { describe, it, expect } from 'vitest';
import type { Quiz } from '@shared/schema';
import { POINTS_CONFIG } from '@/lib/achievement-service';

/**
 * Test suite for dashboard learning velocity calculation
 */
describe('Dashboard Learning Velocity Calculation', () => {
  // Helper function to create a mock quiz
  const createMockQuiz = (
    completedAt: Date,
    correctAnswers: number,
    totalQuestions: number,
    score: number
  ): Quiz => ({
    id: 1,
    userId: 'test-user',
    tenantId: 1,
    title: 'Test Quiz',
    categoryIds: [1],
    questionIds: [],
    totalQuestions,
    correctAnswers,
    score,
    isPassing: score >= 85,
    completedAt,
    startedAt: new Date(),
    mode: 'study',
    questionCount: totalQuestions,
    timeLimit: null,
    answers: null,
    isAdaptive: false,
    adaptiveMetrics: null,
    difficultyLevel: null,
    difficultyFilter: null,
    missedTopics: null,
    subcategoryIds: null,
  });

  // Function to calculate points for a quiz (matching dashboard logic)
  const calculateQuizPoints = (quiz: Quiz): number => {
    if (!quiz.completedAt || quiz.score === null) {
      return 0;
    }

    let points = POINTS_CONFIG.QUIZ_COMPLETION;
    const correctAnswers = quiz.correctAnswers || 0;
    points += correctAnswers * POINTS_CONFIG.CORRECT_ANSWER;

    if (quiz.isPassing || (quiz.score && quiz.score >= 85)) {
      points += POINTS_CONFIG.PASSING_BONUS;
    }

    if (quiz.score === 100) {
      points += POINTS_CONFIG.PERFECT_SCORE_BONUS;
    }

    return points;
  };

  it('should calculate zero points for incomplete quiz', () => {
    const quiz = createMockQuiz(new Date(), 0, 10, 0);
    quiz.completedAt = null;

    const points = calculateQuizPoints(quiz);
    expect(points).toBe(0);
  });

  it('should calculate base points for quiz completion', () => {
    const quiz = createMockQuiz(new Date(), 0, 10, 50);

    const points = calculateQuizPoints(quiz);
    expect(points).toBe(10); // Base completion points only
  });

  it('should calculate points with correct answers', () => {
    const quiz = createMockQuiz(new Date(), 5, 10, 50);

    const points = calculateQuizPoints(quiz);
    // 10 (base) + 5*5 (correct answers) = 35
    expect(points).toBe(35);
  });

  it('should add passing bonus for 85% or higher', () => {
    const quiz = createMockQuiz(new Date(), 9, 10, 90);

    const points = calculateQuizPoints(quiz);
    // 10 (base) + 9*5 (correct) + 25 (passing) = 80
    expect(points).toBe(80);
  });

  it('should add perfect score bonus for 100%', () => {
    const quiz = createMockQuiz(new Date(), 10, 10, 100);

    const points = calculateQuizPoints(quiz);
    // 10 (base) + 10*5 (correct) + 25 (passing) + 50 (perfect) = 135
    expect(points).toBe(135);
  });

  it('should calculate daily experience correctly for multiple quizzes', () => {
    // Use a fixed "today" date (January 10, 2025)
    const today = new Date('2025-01-10T12:00:00');
    today.setHours(0, 0, 0, 0);

    // Calculate start date (9 days ago = January 1, 2025)
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 9);

    // Create quizzes for January 1 and January 5 (both within last 10 days)
    const jan1Quiz = createMockQuiz(new Date(startDate), 5, 10, 50);
    const jan5 = new Date(startDate);
    jan5.setDate(startDate.getDate() + 4);
    const jan5Quiz = createMockQuiz(jan5, 10, 10, 100);

    const quizzes = [jan1Quiz, jan5Quiz];

    // Calculate expected daily XP (10 days)
    const dailyXP = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    quizzes.forEach((quiz) => {
      const completedDate = new Date(quiz.completedAt!);
      completedDate.setHours(0, 0, 0, 0);

      if (completedDate >= startDate && completedDate <= today) {
        const dayDiff = Math.floor(
          (completedDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (dayDiff >= 0 && dayDiff < 10) {
          dailyXP[dayDiff] += calculateQuizPoints(quiz);
        }
      }
    });

    // January 1 (index 0) should have 35 points
    expect(dailyXP[0]).toBe(35);
    // January 5 (index 4) should have 135 points
    expect(dailyXP[4]).toBe(135);
    // Other days should be 0
    expect(dailyXP[1]).toBe(0);
    expect(dailyXP[2]).toBe(0);
    expect(dailyXP[3]).toBe(0);
    expect(dailyXP[5]).toBe(0);
    expect(dailyXP[6]).toBe(0);
    expect(dailyXP[7]).toBe(0);
    expect(dailyXP[8]).toBe(0);
    expect(dailyXP[9]).toBe(0);
  });

  it('should calculate max XP correctly', () => {
    const dailyExperience = [10, 50, 135, 20, 0, 75, 100];
    const maxDailyXP = Math.max(...dailyExperience, 1);

    expect(maxDailyXP).toBe(135);
  });

  it('should handle empty quiz array', () => {
    const dailyExperience = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const maxDailyXP = Math.max(...dailyExperience, 1);

    // Should default to 1 to avoid division by zero
    expect(maxDailyXP).toBe(1);
  });

  it('should convert to percentages correctly', () => {
    const dailyExperience = [50, 100, 75, 0, 25, 0, 100, 80, 60, 90];
    const maxDailyXP = Math.max(...dailyExperience, 1);
    const percentages = dailyExperience.map((xp) => (xp / maxDailyXP) * 100);

    expect(percentages[0]).toBe(50);
    expect(percentages[1]).toBe(100);
    expect(percentages[2]).toBe(75);
    expect(percentages[3]).toBe(0);
    expect(percentages[4]).toBe(25);
    expect(percentages[5]).toBe(0);
    expect(percentages[6]).toBe(100);
    expect(percentages[7]).toBe(80);
    expect(percentages[8]).toBe(60);
    expect(percentages[9]).toBe(90);
  });
});
