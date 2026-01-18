/**
 * Example test demonstrating the use of shared test utilities and factories
 * This file serves as a reference for how to write tests using the new patterns
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '@/test/mocks';
import {
  createUser,
  createQuiz,
  createPassingQuiz,
  createPerfectQuiz,
  createQuestions,
  createCategory,
} from '@/test/factories';

// Setup Firebase mocks at the top level (must be inline, not imported functions)
vi.mock('@/lib/firebase', () => ({
  isFirebaseConfigured: vi.fn().mockReturnValue(true),
  initializeFirebase: vi.fn().mockReturnValue(true),
  onFirebaseAuthStateChanged: vi.fn((callback) => {
    setTimeout(() => callback(null), 0);
    return () => {};
  }),
  signOutFromGoogle: vi.fn().mockResolvedValue(undefined),
  getCurrentFirebaseUser: vi.fn().mockReturnValue(null),
}));

vi.mock('@/lib/storage-factory', () => ({
  initializeStorage: vi.fn().mockResolvedValue(undefined),
  setStorageMode: vi.fn().mockResolvedValue(undefined),
  isCloudSyncAvailable: vi.fn().mockReturnValue(false),
  storage: {
    getUser: vi.fn().mockResolvedValue(null),
    createUser: vi.fn().mockResolvedValue(null),
    setCurrentUserId: vi.fn().mockResolvedValue(undefined),
    clearCurrentUser: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/client-auth', () => ({
  clientAuth: {
    getCurrentUser: vi.fn().mockResolvedValue(null),
    logout: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('@/lib/errors', () => ({
  logError: vi.fn(),
}));

/**
 * Example: Testing a component that uses quiz data
 */
describe('Example: Using Test Utilities and Factories', () => {
  // Create test data using factories
  const testUser = createUser({
    email: 'student@example.com',
    firstName: 'Jane',
    lastName: 'Student',
  });

  const quizzes = [
    createPassingQuiz({ id: 1, title: 'Quiz 1', score: 90 }),
    createPerfectQuiz({ id: 2, title: 'Quiz 2' }),
    createQuiz({ id: 3, title: 'Quiz 3', score: 75 }),
  ];

  const questions = createQuestions(5);
  const category = createCategory({ name: 'Security Management' });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('demonstrates factory usage for creating test data', () => {
    // Test factories provide sensible defaults
    expect(quizzes).toHaveLength(3);
    expect(quizzes[0].score).toBe(90);
    expect(quizzes[1].score).toBe(100);
    expect(quizzes[2].score).toBe(75);

    // Only the passing quizzes have isPassing flag
    expect(quizzes[0].isPassing).toBe(true);
    expect(quizzes[1].isPassing).toBe(true);
    expect(quizzes[2].isPassing).toBe(false);
  });

  it('demonstrates using multiple factories together', () => {
    // Factories can be combined to create complex test scenarios
    expect(testUser.email).toBe('student@example.com');
    expect(questions).toHaveLength(5);
    expect(category.name).toBe('Security Management');

    // All questions have IDs 1-5
    questions.forEach((q, index) => {
      expect(q.id).toBe(index + 1);
    });
  });

  it('demonstrates factory overrides', () => {
    // You can override specific fields while keeping defaults
    const customQuiz = createQuiz({
      title: 'Custom Quiz',
      questionCount: 20,
      timeLimit: 60,
    });

    expect(customQuiz.title).toBe('Custom Quiz');
    expect(customQuiz.questionCount).toBe(20);
    expect(customQuiz.timeLimit).toBe(60);

    // Other fields use defaults
    expect(customQuiz.mode).toBe('study');
    expect(customQuiz.tenantId).toBe(1);
  });

  it('demonstrates TestProviders wrapper', () => {
    // Simple component for demonstration
    const TestComponent = () => <div>Test Content</div>;

    render(
      <TestProviders>
        <TestComponent />
      </TestProviders>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
});

/**
 * Example: Testing quiz grading logic
 */
describe('Example: Quiz Grading with Factories', () => {
  it('calculates correct score percentages', () => {
    const perfectQuiz = createPerfectQuiz();
    const passingQuiz = createPassingQuiz({ score: 85, correctAnswers: 17, totalQuestions: 20 });
    const failingQuiz = createQuiz({ score: 60, correctAnswers: 12, totalQuestions: 20 });

    expect(perfectQuiz.score).toBe(100);
    expect(passingQuiz.score).toBe(85);
    expect(failingQuiz.score).toBe(60);
  });

  it('identifies passing vs failing quizzes', () => {
    const passing = createPassingQuiz();
    const failing = createQuiz({ score: 60, isPassing: false });

    expect(passing.isPassing).toBe(true);
    expect(failing.isPassing).toBe(false);
  });
});

/**
 * Example: Testing with different user types
 */
describe('Example: User Types with Factories', () => {
  it('creates different user types', () => {
    const regularUser = createUser();
    const adminUser = createUser({ role: 'admin' });

    expect(regularUser.role).toBe('user');
    expect(adminUser.role).toBe('admin');
  });

  it('creates users with full profiles', () => {
    const profileUser = createUser({
      firstName: 'John',
      lastName: 'Doe',
      certificationGoals: ['CISSP', 'CISM'],
      studyPreferences: {
        dailyTimeMinutes: 45,
        preferredDifficulty: 'intermediate',
      },
    });

    expect(profileUser.firstName).toBe('John');
    expect(profileUser.lastName).toBe('Doe');
    expect(profileUser.certificationGoals).toEqual(['CISSP', 'CISM']);
    expect(profileUser.studyPreferences?.dailyTimeMinutes).toBe(45);
  });
});

/**
 * Example: Testing with question factories
 */
describe('Example: Question Types with Factories', () => {
  it('creates different question types', () => {
    const mcQuestion = createQuestions(1)[0];

    expect(mcQuestion.questionType).toBe('multiple_choice_single');
    expect(mcQuestion.options).toHaveLength(4);
    expect(mcQuestion.correctAnswer).toBeDefined();
  });

  it('creates questions at different difficulty levels', () => {
    const easy = createQuestions(1, { difficultyLevel: 1 })[0];
    const hard = createQuestions(1, { difficultyLevel: 5 })[0];

    expect(easy.difficultyLevel).toBe(1);
    expect(hard.difficultyLevel).toBe(5);
  });
});
