/**
 * Test data factories for PracticeTest entities
 */
import type {
  PracticeTest,
  InsertPracticeTest,
  PracticeTestAttempt,
  InsertPracticeTestAttempt,
} from '@shared/schema';

/**
 * Default practice test for testing
 */
const DEFAULT_PRACTICE_TEST: PracticeTest = {
  id: 1,
  tenantId: 1,
  name: 'CISSP Practice Test',
  description: 'Full-length CISSP certification practice exam',
  categoryIds: [1, 2, 3],
  questionCount: 100,
  timeLimit: 180, // 3 hours
  difficulty: 'Mixed',
  passingScore: 70,
  isOfficial: false,
  questionPool: null,
  createdBy: null,
  isActive: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * Creates a test PracticeTest with optional overrides
 */
export function createPracticeTest(overrides?: Partial<PracticeTest>): PracticeTest {
  return {
    ...DEFAULT_PRACTICE_TEST,
    ...overrides,
    createdAt: overrides?.createdAt || new Date(),
    updatedAt: overrides?.updatedAt || new Date(),
  };
}

/**
 * Creates an official practice test
 */
export function createOfficialPracticeTest(overrides?: Partial<PracticeTest>): PracticeTest {
  return createPracticeTest({
    ...overrides,
    name: overrides?.name || 'Official CISSP Practice Exam',
    isOfficial: true,
    description: 'Official certification practice exam with authentic questions',
  });
}

/**
 * Creates a quick practice test (fewer questions)
 */
export function createQuickPracticeTest(overrides?: Partial<PracticeTest>): PracticeTest {
  return createPracticeTest({
    ...overrides,
    name: overrides?.name || 'Quick Practice Test',
    questionCount: 25,
    timeLimit: 45,
    difficulty: 'Medium',
  });
}

/**
 * Creates practice tests at different difficulty levels
 */
export function createPracticeTestsByDifficulty(): PracticeTest[] {
  return [
    createPracticeTest({
      id: 1,
      name: 'Easy Practice Test',
      difficulty: 'Easy',
      questionCount: 50,
    }),
    createPracticeTest({
      id: 2,
      name: 'Medium Practice Test',
      difficulty: 'Medium',
      questionCount: 75,
    }),
    createPracticeTest({
      id: 3,
      name: 'Hard Practice Test',
      difficulty: 'Hard',
      questionCount: 100,
    }),
    createPracticeTest({
      id: 4,
      name: 'Mixed Practice Test',
      difficulty: 'Mixed',
      questionCount: 100,
    }),
  ];
}

/**
 * Creates multiple test practice tests with sequential IDs
 */
export function createPracticeTests(
  count: number,
  baseOverrides?: Partial<PracticeTest>
): PracticeTest[] {
  return Array.from({ length: count }, (_, index) =>
    createPracticeTest({
      ...baseOverrides,
      id: index + 1,
      name: `Practice Test ${index + 1}`,
    })
  );
}

/**
 * Creates an InsertPracticeTest object (for creation tests)
 */
export function createInsertPracticeTest(
  overrides?: Partial<InsertPracticeTest>
): InsertPracticeTest {
  return {
    tenantId: overrides?.tenantId || 1,
    name: overrides?.name || 'New Practice Test',
    description: overrides?.description || 'A new test practice exam',
    categoryIds: overrides?.categoryIds || [1],
    questionCount: overrides?.questionCount || 50,
    timeLimit: overrides?.timeLimit || 90,
    difficulty: overrides?.difficulty || 'Medium',
    passingScore: overrides?.passingScore || 70,
    isOfficial: overrides?.isOfficial || false,
    questionPool: overrides?.questionPool || null,
    createdBy: overrides?.createdBy || null,
    isActive: overrides?.isActive !== undefined ? overrides.isActive : true,
  };
}

/**
 * Default practice test attempt for testing
 */
const DEFAULT_PRACTICE_TEST_ATTEMPT: PracticeTestAttempt = {
  id: 1,
  tenantId: 1,
  testId: 1,
  userId: 'test-user-1',
  quizId: 1,
  score: 75,
  isPassed: true,
  timeSpent: 5400, // 90 minutes
  startedAt: new Date('2024-01-01T10:00:00Z'),
  completedAt: new Date('2024-01-01T11:30:00Z'),
};

/**
 * Creates a test PracticeTestAttempt with optional overrides
 */
export function createPracticeTestAttempt(
  overrides?: Partial<PracticeTestAttempt>
): PracticeTestAttempt {
  return {
    ...DEFAULT_PRACTICE_TEST_ATTEMPT,
    ...overrides,
    startedAt: overrides?.startedAt || new Date(),
    completedAt: overrides?.completedAt || new Date(),
  };
}

/**
 * Creates a passing practice test attempt
 */
export function createPassingAttempt(
  overrides?: Partial<PracticeTestAttempt>
): PracticeTestAttempt {
  return createPracticeTestAttempt({
    ...overrides,
    score: overrides?.score || 85,
    isPassed: true,
  });
}

/**
 * Creates a failing practice test attempt
 */
export function createFailingAttempt(
  overrides?: Partial<PracticeTestAttempt>
): PracticeTestAttempt {
  return createPracticeTestAttempt({
    ...overrides,
    score: overrides?.score || 65,
    isPassed: false,
  });
}

/**
 * Creates an in-progress practice test attempt
 */
export function createInProgressAttempt(
  overrides?: Partial<PracticeTestAttempt>
): PracticeTestAttempt {
  return createPracticeTestAttempt({
    ...overrides,
    score: null,
    isPassed: false,
    completedAt: null,
  });
}

/**
 * Creates multiple practice test attempts for a user
 */
export function createPracticeTestAttempts(
  count: number,
  userId: string,
  testId: number,
  baseOverrides?: Partial<PracticeTestAttempt>
): PracticeTestAttempt[] {
  return Array.from({ length: count }, (_, index) =>
    createPracticeTestAttempt({
      ...baseOverrides,
      id: index + 1,
      userId,
      testId,
      quizId: index + 1,
    })
  );
}

/**
 * Creates an InsertPracticeTestAttempt object (for creation tests)
 */
export function createInsertPracticeTestAttempt(
  overrides?: Partial<InsertPracticeTestAttempt>
): InsertPracticeTestAttempt {
  return {
    tenantId: overrides?.tenantId || 1,
    testId: overrides?.testId || 1,
    userId: overrides?.userId || 'test-user-1',
    quizId: overrides?.quizId || null,
    score: overrides?.score || null,
    isPassed: overrides?.isPassed || false,
    timeSpent: overrides?.timeSpent || null,
    completedAt: overrides?.completedAt || null,
  };
}
