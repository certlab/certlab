import { describe, it, expect } from 'vitest';
import {
  calculateReadinessScore,
  generateStudyRecommendations,
  analyzeTimeOfDayPerformance,
  calculateLearningVelocity,
  analyzePerformance,
} from './smart-recommendations';
import type {
  Quiz,
  MasteryScore,
  Category,
  Subcategory,
  UserProgress,
  Question,
} from '@shared/schema';

// Helper function to create a complete Quiz object with all required properties
function createMockQuiz(overrides: Partial<Quiz> = {}): Quiz {
  return {
    id: 1,
    userId: 'user1',
    tenantId: 1,
    title: 'Mock Quiz',
    description: null,
    tags: null,
    categoryIds: [1],
    subcategoryIds: [1],
    questionIds: null,
    questionCount: 10,
    timeLimit: null,
    startedAt: new Date('2025-01-01'),
    completedAt: new Date('2025-01-01'),
    score: 90,
    correctAnswers: 9,
    totalQuestions: 10,
    answers: null,
    isAdaptive: false,
    adaptiveMetrics: null,
    difficultyLevel: 1,
    difficultyFilter: null,
    isPassing: true,
    missedTopics: null,
    mode: 'study',
    author: null,
    authorName: null,
    prerequisites: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: null,
    // Advanced Configuration Options
    randomizeQuestions: null,
    randomizeAnswers: null,
    timeLimitPerQuestion: null,
    questionWeights: null,
    feedbackMode: null,
    passingScore: null,
    maxAttempts: null,
    isAdvancedConfig: null,
    // Access control fields
    visibility: 'private',
    sharedWithUsers: null,
    sharedWithGroups: null,
    requiresPurchase: false,
    purchaseProductId: null,
    // Distribution fields
    distributionMethod: 'open',
    availableFrom: null,
    availableUntil: null,
    enrollmentDeadline: null,
    maxEnrollments: null,
    requireApproval: false,
    assignmentDueDate: null,
    sendNotifications: true,
    reminderDays: null,
    ...overrides,
  };
}

// Mock data
const mockCategories: Category[] = [
  { id: 1, tenantId: 1, name: 'CISSP', description: 'CISSP Certification', icon: 'shield' },
  { id: 2, tenantId: 1, name: 'CISM', description: 'CISM Certification', icon: 'lock' },
];

const mockSubcategories: Subcategory[] = [
  { id: 1, tenantId: 1, categoryId: 1, name: 'Security and Risk Management', description: null },
  { id: 2, tenantId: 1, categoryId: 1, name: 'Asset Security', description: null },
];

describe('Smart Recommendations Engine', () => {
  describe('calculateReadinessScore', () => {
    it('should return 0% readiness for no data', () => {
      const result = calculateReadinessScore([], [], mockCategories, mockSubcategories, []);

      expect(result.overall).toBe(0);
      expect(result.confidenceLevel).toBe('low');
      expect(result.weakAreas).toHaveLength(0);
    });

    it('should calculate readiness score correctly with quiz data', () => {
      const quizzes: Quiz[] = [
        createMockQuiz({
          id: 1,
          title: 'CISSP Practice',
          score: 90,
          correctAnswers: 9,
        }),
      ];

      const masteryScores: MasteryScore[] = [
        {
          id: 1,
          userId: 'user1',
          tenantId: 1,
          categoryId: 1,
          subcategoryId: 1,
          correctAnswers: 9,
          totalAnswers: 10,
          rollingAverage: 90,
          lastUpdated: new Date('2025-01-01'),
        },
      ];

      const result = calculateReadinessScore(
        quizzes,
        masteryScores,
        mockCategories,
        mockSubcategories,
        []
      );

      expect(result.overall).toBeGreaterThan(0);
      expect(result.categoryScores).toHaveLength(2);
      expect(result.categoryScores[0].categoryName).toBe('CISSP');
    });

    it('should identify weak areas below 85% threshold', () => {
      const masteryScores: MasteryScore[] = [
        {
          id: 1,
          userId: 'user1',
          tenantId: 1,
          categoryId: 1,
          subcategoryId: 1,
          correctAnswers: 7,
          totalAnswers: 10,
          rollingAverage: 70,
          lastUpdated: new Date('2025-01-01'),
        },
      ];

      const result = calculateReadinessScore(
        [],
        masteryScores,
        mockCategories,
        mockSubcategories,
        []
      );

      expect(result.weakAreas.length).toBeGreaterThan(0);
      expect(result.weakAreas[0].currentScore).toBe(70);
      expect(result.weakAreas[0].targetScore).toBe(85);
      expect(result.weakAreas[0].priorityLevel).toBe('high');
    });

    it('should identify strengths at 90%+ threshold', () => {
      const masteryScores: MasteryScore[] = [
        {
          id: 1,
          userId: 'user1',
          tenantId: 1,
          categoryId: 1,
          subcategoryId: 1,
          correctAnswers: 95,
          totalAnswers: 100,
          rollingAverage: 95,
          lastUpdated: new Date('2025-01-01'),
        },
      ];

      const result = calculateReadinessScore(
        [],
        masteryScores,
        mockCategories,
        mockSubcategories,
        []
      );

      expect(result.strengths).toContain('CISSP');
      expect(result.overall).toBeGreaterThanOrEqual(90);
    });

    it('should calculate estimated days to ready', () => {
      const quizzes: Quiz[] = Array.from({ length: 10 }, (_, i) =>
        createMockQuiz({
          id: i + 1,
          title: `Quiz ${i + 1}`,
          startedAt: new Date(Date.now() - (10 - i) * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - (10 - i) * 24 * 60 * 60 * 1000),
          score: 70 + i * 2,
          correctAnswers: 7 + i,
          isPassing: i >= 5,
        })
      );

      const result = calculateReadinessScore(quizzes, [], mockCategories, mockSubcategories, []);

      expect(result.estimatedDaysToReady).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateStudyRecommendations', () => {
    it('should generate recommendations for weak areas', () => {
      const quizzes: Quiz[] = [
        createMockQuiz({
          id: 1,
          title: 'CISSP Practice',
          score: 60,
          correctAnswers: 6,
          isPassing: false,
        }),
      ];

      const masteryScores: MasteryScore[] = [
        {
          id: 1,
          userId: 'user1',
          tenantId: 1,
          categoryId: 1,
          subcategoryId: 1,
          correctAnswers: 6,
          totalAnswers: 10,
          rollingAverage: 60,
          lastUpdated: new Date('2025-01-01'),
        },
      ];

      const recommendations = generateStudyRecommendations(
        quizzes,
        masteryScores,
        mockCategories,
        mockSubcategories,
        []
      );

      expect(recommendations.length).toBeGreaterThan(0);
      const weakAreaRec = recommendations.find((r) => r.type === 'focus_area');
      expect(weakAreaRec).toBeDefined();
      expect(weakAreaRec?.priority).toBe('high');
    });

    it('should recommend difficulty increase for high performers', () => {
      const quizzes: Quiz[] = Array.from({ length: 5 }, (_, i) =>
        createMockQuiz({
          id: i + 1,
          title: `Quiz ${i + 1}`,
          score: 90,
          correctAnswers: 9,
          isPassing: true,
        })
      );

      const recommendations = generateStudyRecommendations(
        quizzes,
        [],
        mockCategories,
        mockSubcategories,
        []
      );

      const difficultyRec = recommendations.find(
        (r) => r.type === 'difficulty_adjustment' && r.id === 'difficulty-increase'
      );
      expect(difficultyRec).toBeDefined();
      expect(difficultyRec?.suggestedDifficulty).toBe(4);
    });

    it('should recommend difficulty decrease for low performers', () => {
      const quizzes: Quiz[] = Array.from({ length: 5 }, (_, i) =>
        createMockQuiz({
          id: i + 1,
          title: `Quiz ${i + 1}`,
          score: 50,
          correctAnswers: 5,
          isPassing: false,
        })
      );

      const recommendations = generateStudyRecommendations(
        quizzes,
        [],
        mockCategories,
        mockSubcategories,
        []
      );

      const difficultyRec = recommendations.find(
        (r) => r.type === 'difficulty_adjustment' && r.id === 'difficulty-decrease'
      );
      expect(difficultyRec).toBeDefined();
      expect(difficultyRec?.suggestedDifficulty).toBe(2);
      expect(difficultyRec?.priority).toBe('high');
    });

    it('should recommend practice test for ready users', () => {
      const masteryScores: MasteryScore[] = mockCategories.map((cat, i) => ({
        id: i + 1,
        userId: 'user1',
        tenantId: 1,
        categoryId: cat.id,
        subcategoryId: 1,
        correctAnswers: 90,
        totalAnswers: 100,
        rollingAverage: 90,
        lastUpdated: new Date(),
      }));

      const recommendations = generateStudyRecommendations(
        [],
        masteryScores,
        mockCategories,
        mockSubcategories,
        []
      );

      const readinessRec = recommendations.find((r) => r.type === 'readiness');
      expect(readinessRec).toBeDefined();
      expect(readinessRec?.priority).toBe('high');
    });

    it('should sort recommendations by priority and confidence', () => {
      const quizzes: Quiz[] = [
        createMockQuiz({
          id: 1,
          title: 'Quiz',
          score: 70,
          correctAnswers: 7,
          isPassing: false,
        }),
      ];

      const masteryScores: MasteryScore[] = [
        {
          id: 1,
          userId: 'user1',
          tenantId: 1,
          categoryId: 1,
          subcategoryId: 1,
          correctAnswers: 7,
          totalAnswers: 10,
          rollingAverage: 70,
          lastUpdated: new Date(),
        },
      ];

      const recommendations = generateStudyRecommendations(
        quizzes,
        masteryScores,
        mockCategories,
        mockSubcategories,
        []
      );

      expect(recommendations.length).toBeGreaterThan(0);
      // Verify that high priority recommendations come first
      const priorities = recommendations.map((r) => r.priority);
      const firstHighIndex = priorities.indexOf('high');
      const lastLowIndex = priorities.lastIndexOf('low');
      if (firstHighIndex >= 0 && lastLowIndex >= 0) {
        expect(firstHighIndex).toBeLessThan(lastLowIndex);
      }
    });
  });

  describe('analyzeTimeOfDayPerformance', () => {
    it('should return empty array for no quizzes', () => {
      const result = analyzeTimeOfDayPerformance([]);
      expect(result).toEqual([]);
    });

    it('should analyze performance by hour', () => {
      const quizzes: Quiz[] = [
        createMockQuiz({
          id: 1,
          title: 'Morning Quiz',
          startedAt: new Date('2025-01-01T09:00:00'),
          completedAt: new Date('2025-01-01T09:30:00'),
          score: 90,
          correctAnswers: 9,
          isPassing: true,
        }),
        createMockQuiz({
          id: 2,
          title: 'Afternoon Quiz',
          startedAt: new Date('2025-01-01T15:00:00'),
          completedAt: new Date('2025-01-01T15:30:00'),
          score: 70,
          correctAnswers: 7,
          isPassing: false,
        }),
      ];

      const result = analyzeTimeOfDayPerformance(quizzes);

      expect(result.length).toBe(2);
      expect(result.find((r) => r.hour === 9)).toBeDefined();
      expect(result.find((r) => r.hour === 15)).toBeDefined();
    });

    it('should mark optimal study times', () => {
      const quizzes: Quiz[] = [
        createMockQuiz({
          id: 1,
          title: 'Quiz 1',
          startedAt: new Date('2025-01-01T09:00:00'),
          completedAt: new Date('2025-01-01T09:30:00'),
          score: 95,
          correctAnswers: 9,
          isPassing: true,
        }),
        createMockQuiz({
          id: 2,
          title: 'Quiz 2',
          startedAt: new Date('2025-01-02T09:00:00'),
          completedAt: new Date('2025-01-02T09:30:00'),
          score: 90,
          correctAnswers: 9,
          isPassing: true,
        }),
        createMockQuiz({
          id: 3,
          title: 'Quiz 3',
          startedAt: new Date('2025-01-01T15:00:00'),
          completedAt: new Date('2025-01-01T15:30:00'),
          score: 70,
          correctAnswers: 7,
          isPassing: false,
        }),
      ];

      const result = analyzeTimeOfDayPerformance(quizzes);

      const morningPerf = result.find((r) => r.hour === 9);
      expect(morningPerf?.optimalForStudy).toBe(true);
      expect(morningPerf?.averageScore).toBeGreaterThan(90);
    });
  });

  describe('calculateLearningVelocity', () => {
    it('should return zero metrics for no quizzes', () => {
      const result = calculateLearningVelocity([]);

      expect(result.questionsPerDay).toBe(0);
      expect(result.averageScoreImprovement).toBe(0);
      expect(result.streakConsistency).toBe(0);
      expect(result.predictedCertificationDate).toBeNull();
    });

    it('should calculate questions per day correctly', () => {
      const quizzes: Quiz[] = Array.from({ length: 5 }, (_, i) =>
        createMockQuiz({
          id: i + 1,
          title: `Quiz ${i + 1}`,
          startedAt: new Date(Date.now() - (4 - i) * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - (4 - i) * 24 * 60 * 60 * 1000),
          score: 80,
          correctAnswers: 8,
          isPassing: true,
        })
      );

      const result = calculateLearningVelocity(quizzes);

      expect(result.questionsPerDay).toBeGreaterThan(0);
      expect(result.questionsPerDay).toBeLessThanOrEqual(50);
    });

    it('should detect score improvement', () => {
      const quizzes: Quiz[] = Array.from({ length: 10 }, (_, i) =>
        createMockQuiz({
          id: i + 1,
          title: `Quiz ${i + 1}`,
          startedAt: new Date(Date.now() - (9 - i) * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - (9 - i) * 24 * 60 * 60 * 1000),
          score: 70 + i * 2,
          correctAnswers: 7 + i,
          isPassing: i >= 5,
        })
      );

      const result = calculateLearningVelocity(quizzes);

      expect(result.averageScoreImprovement).toBeGreaterThan(0);
    });

    it('should predict certification date for improving users', () => {
      const quizzes: Quiz[] = Array.from({ length: 6 }, (_, i) =>
        createMockQuiz({
          id: i + 1,
          title: `Quiz ${i + 1}`,
          startedAt: new Date(Date.now() - (5 - i) * 7 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - (5 - i) * 7 * 24 * 60 * 60 * 1000),
          score: 70 + i * 3,
          correctAnswers: 7 + i,
          isPassing: i >= 3,
        })
      );

      const result = calculateLearningVelocity(quizzes);

      expect(result.predictedCertificationDate).toBeDefined();
    });
  });

  describe('analyzePerformance', () => {
    it('should analyze performance for a category', () => {
      const quizzes: Quiz[] = [
        createMockQuiz({
          id: 1,
          title: 'Quiz',
          score: 80,
          correctAnswers: 8,
          isPassing: true,
        }),
      ];

      const result = analyzePerformance(quizzes, [], 1);

      expect(result.totalAttempts).toBe(10);
      expect(result.correctAnswers).toBe(8);
      expect(result.accuracy).toBe(80);
    });

    it('should identify recent trend', () => {
      const quizzes: Quiz[] = Array.from({ length: 5 }, (_, i) =>
        createMockQuiz({
          id: i + 1,
          title: `Quiz ${i + 1}`,
          startedAt: new Date(Date.now() - (4 - i) * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - (4 - i) * 24 * 60 * 60 * 1000),
          score: 70 + i * 5,
          correctAnswers: 7 + i,
          isPassing: i >= 2,
        })
      );

      const result = analyzePerformance(quizzes, [], 1);

      expect(result.recentTrend).toBe('improving');
    });
  });
});
