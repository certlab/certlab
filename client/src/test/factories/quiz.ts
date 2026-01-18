/**
 * Test data factories for Quiz entities
 * Provides factory functions to create test Quiz objects with sensible defaults
 */
import type { Quiz, InsertQuiz } from '@shared/schema';

/**
 * Default quiz for testing
 * Note: Uses current date/time for timestamps. Override as needed for time-sensitive tests.
 */
const DEFAULT_QUIZ: Quiz = {
  id: 1,
  userId: 'test-user-1',
  tenantId: 1,
  title: 'Test Quiz',
  description: 'A test quiz for unit testing',
  tags: ['test', 'practice'],
  categoryIds: [1],
  subcategoryIds: [1],
  questionIds: [1, 2, 3, 4, 5],
  questionCount: 5,
  timeLimit: null,
  startedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
  completedAt: new Date(), // Now
  score: 80,
  correctAnswers: 4,
  totalQuestions: 5,
  answers: null,
  isAdaptive: false,
  adaptiveMetrics: null,
  difficultyLevel: 2,
  difficultyFilter: null,
  isPassing: false,
  missedTopics: null,
  mode: 'study',
  author: null,
  authorName: null,
  prerequisites: null,
  createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
  updatedAt: null,
  randomizeQuestions: false,
  randomizeAnswers: false,
  timeLimitPerQuestion: null,
  questionWeights: null,
  feedbackMode: 'instant',
  passingScore: 70,
  maxAttempts: null,
  isAdvancedConfig: false,
  visibility: 'private',
  sharedWithUsers: null,
  sharedWithGroups: null,
  requiresPurchase: false,
  purchaseProductId: null,
  distributionMethod: 'open',
  availableFrom: null,
  availableUntil: null,
  enrollmentDeadline: null,
  maxEnrollments: null,
  requireApproval: false,
  assignmentDueDate: null,
  sendNotifications: true,
  reminderDays: null,
};

/**
 * Creates a test Quiz with optional overrides
 *
 * @example
 * const quiz = createQuiz({ score: 100, isPassing: true });
 */
export function createQuiz(overrides?: Partial<Quiz>): Quiz {
  return {
    ...DEFAULT_QUIZ,
    ...overrides,
    startedAt: overrides?.startedAt || new Date(),
    completedAt: overrides?.completedAt || new Date(),
    createdAt: overrides?.createdAt || new Date(),
  };
}

/**
 * Creates a completed quiz with a passing score
 */
export function createPassingQuiz(overrides?: Partial<Quiz>): Quiz {
  return createQuiz({
    ...overrides,
    score: overrides?.score || 85,
    isPassing: true,
    correctAnswers: overrides?.correctAnswers || 9,
    totalQuestions: overrides?.totalQuestions || 10,
  });
}

/**
 * Creates a quiz with a perfect score
 */
export function createPerfectQuiz(overrides?: Partial<Quiz>): Quiz {
  return createQuiz({
    ...overrides,
    score: 100,
    isPassing: true,
    correctAnswers: overrides?.totalQuestions || 10,
    totalQuestions: overrides?.totalQuestions || 10,
  });
}

/**
 * Creates an incomplete/in-progress quiz
 */
export function createInProgressQuiz(overrides?: Partial<Quiz>): Quiz {
  return createQuiz({
    ...overrides,
    completedAt: null,
    score: null,
    correctAnswers: null,
  });
}

/**
 * Creates an adaptive quiz
 */
export function createAdaptiveQuiz(overrides?: Partial<Quiz>): Quiz {
  return createQuiz({
    ...overrides,
    isAdaptive: true,
    adaptiveMetrics: {
      wrongAnswerPatterns: ['Security Management', 'Risk Assessment'],
      difficultyAdjustments: [1, 2, 2, 3],
    },
  });
}

/**
 * Creates an InsertQuiz object (for creation tests)
 */
export function createInsertQuiz(overrides?: Partial<InsertQuiz>): InsertQuiz {
  return {
    userId: overrides?.userId || 'test-user-1',
    tenantId: overrides?.tenantId || 1,
    title: overrides?.title || 'New Test Quiz',
    description: overrides?.description || 'A new test quiz',
    tags: overrides?.tags || ['test'],
    categoryIds: overrides?.categoryIds || [1],
    subcategoryIds: overrides?.subcategoryIds || [1],
    questionIds: overrides?.questionIds || null,
    questionCount: overrides?.questionCount || 10,
    timeLimit: overrides?.timeLimit || null,
    completedAt: overrides?.completedAt || null,
    score: overrides?.score || null,
    correctAnswers: overrides?.correctAnswers || null,
    totalQuestions: overrides?.totalQuestions || null,
    answers: overrides?.answers || null,
    isAdaptive: overrides?.isAdaptive || false,
    adaptiveMetrics: overrides?.adaptiveMetrics || null,
    difficultyLevel: overrides?.difficultyLevel || 1,
    difficultyFilter: overrides?.difficultyFilter || null,
    isPassing: overrides?.isPassing || false,
    missedTopics: overrides?.missedTopics || null,
    mode: overrides?.mode || 'study',
    author: overrides?.author || null,
    authorName: overrides?.authorName || null,
    prerequisites: overrides?.prerequisites || null,
    randomizeQuestions: overrides?.randomizeQuestions || null,
    randomizeAnswers: overrides?.randomizeAnswers || null,
    timeLimitPerQuestion: overrides?.timeLimitPerQuestion || null,
    questionWeights: overrides?.questionWeights || null,
    feedbackMode: overrides?.feedbackMode || null,
    passingScore: overrides?.passingScore || null,
    maxAttempts: overrides?.maxAttempts || null,
    isAdvancedConfig: overrides?.isAdvancedConfig || null,
    visibility: overrides?.visibility || 'private',
    sharedWithUsers: overrides?.sharedWithUsers || null,
    sharedWithGroups: overrides?.sharedWithGroups || null,
    requiresPurchase: overrides?.requiresPurchase || false,
    purchaseProductId: overrides?.purchaseProductId || null,
    distributionMethod: overrides?.distributionMethod || 'open',
    availableFrom: overrides?.availableFrom || null,
    availableUntil: overrides?.availableUntil || null,
    enrollmentDeadline: overrides?.enrollmentDeadline || null,
    maxEnrollments: overrides?.maxEnrollments || null,
    requireApproval: overrides?.requireApproval || false,
    assignmentDueDate: overrides?.assignmentDueDate || null,
    sendNotifications:
      overrides?.sendNotifications !== undefined ? overrides.sendNotifications : true,
    reminderDays: overrides?.reminderDays || null,
  };
}

/**
 * Creates multiple test quizzes with sequential IDs
 *
 * @example
 * const quizzes = createQuizzes(3); // Creates 3 quizzes with IDs 1, 2, 3
 */
export function createQuizzes(count: number, baseOverrides?: Partial<Quiz>): Quiz[] {
  return Array.from({ length: count }, (_, index) =>
    createQuiz({
      ...baseOverrides,
      id: index + 1,
      title: `Test Quiz ${index + 1}`,
    })
  );
}

/**
 * Creates a quiz with advanced configuration
 */
export function createAdvancedConfigQuiz(overrides?: Partial<Quiz>): Quiz {
  return createQuiz({
    ...overrides,
    isAdvancedConfig: true,
    randomizeQuestions: true,
    randomizeAnswers: true,
    timeLimitPerQuestion: 60,
    questionWeights: { 0: 2, 1: 1, 2: 1, 3: 3, 4: 1 },
    feedbackMode: 'delayed',
    passingScore: 80,
    maxAttempts: 3,
  });
}

/**
 * Creates a shared/public quiz
 */
export function createSharedQuiz(overrides?: Partial<Quiz>): Quiz {
  return createQuiz({
    ...overrides,
    visibility: 'shared',
    sharedWithUsers: ['user-1', 'user-2', 'user-3'],
    author: 'instructor-1',
    authorName: 'Test Instructor',
  });
}
