/**
 * useQuizState Hook Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useQuizState } from './useQuizState';
import type { Quiz, Question } from '@/components/quiz/types';

// Mock dependencies
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/lib/storage-factory', () => ({
  storage: {
    submitQuiz: vi.fn(),
    getUserGameStats: vi.fn(),
  },
}));

vi.mock('@/lib/achievement-service', () => ({
  achievementService: {
    processQuizCompletion: vi.fn(),
  },
}));

vi.mock('@/lib/gamification-service', () => ({
  gamificationService: {
    processQuestUpdates: vi.fn().mockResolvedValue({
      completedQuests: [],
      pointsEarned: 0,
      titlesUnlocked: [],
    }),
  },
}));

vi.mock('@/components/Celebration', () => ({
  triggerCelebration: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('useQuizState', () => {
  let queryClient: QueryClient;

  const mockQuestions: Question[] = [
    {
      id: 1,
      categoryId: 1,
      questionText: 'What is 2 + 2?',
      questionType: 'multiple-choice',
      choices: ['2', '3', '4', '5'],
      correctAnswer: '4',
      explanation: 'Basic math',
      difficulty: 'easy',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 2,
      categoryId: 1,
      questionText: 'What is 5 + 5?',
      questionType: 'multiple-choice',
      choices: ['5', '8', '10', '15'],
      correctAnswer: '10',
      explanation: 'Basic math',
      difficulty: 'easy',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const mockQuiz: Quiz = {
    id: 1,
    userId: 'user-123',
    categoryId: 1,
    questionCount: 2,
    score: 0,
    timeSpent: 0,
    timeLimit: null,
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with first question', () => {
    const { result } = renderHook(
      () => useQuizState({ quizId: 1, quiz: mockQuiz, questions: mockQuestions }),
      { wrapper }
    );

    expect(result.current.state.currentQuestionIndex).toBe(0);
    expect(result.current.currentQuestion).toEqual(mockQuestions[0]);
  });

  it('should navigate to next question', () => {
    const { result } = renderHook(
      () => useQuizState({ quizId: 1, quiz: mockQuiz, questions: mockQuestions }),
      { wrapper }
    );

    act(() => {
      result.current.handleNextQuestion();
    });

    expect(result.current.state.currentQuestionIndex).toBe(1);
    expect(result.current.currentQuestion).toEqual(mockQuestions[1]);
  });

  it('should navigate to previous question', () => {
    const { result } = renderHook(
      () => useQuizState({ quizId: 1, quiz: mockQuiz, questions: mockQuestions }),
      { wrapper }
    );

    // Move to second question first
    act(() => {
      result.current.handleNextQuestion();
    });

    expect(result.current.state.currentQuestionIndex).toBe(1);

    // Go back to first question
    act(() => {
      result.current.handlePreviousQuestion();
    });

    expect(result.current.state.currentQuestionIndex).toBe(0);
  });

  it('should handle answer selection', () => {
    const { result } = renderHook(
      () => useQuizState({ quizId: 1, quiz: mockQuiz, questions: mockQuestions }),
      { wrapper }
    );

    act(() => {
      result.current.handleAnswerChange('4');
    });

    expect(result.current.state.answers['1']).toBe('4');
  });

  it('should flag a question for review', () => {
    const { result } = renderHook(
      () => useQuizState({ quizId: 1, quiz: mockQuiz, questions: mockQuestions }),
      { wrapper }
    );

    act(() => {
      result.current.handleFlagQuestion(1);
    });

    expect(result.current.state.flaggedQuestions).toContain(1);
  });

  it('should unflag a previously flagged question', () => {
    const { result } = renderHook(
      () => useQuizState({ quizId: 1, quiz: mockQuiz, questions: mockQuestions }),
      { wrapper }
    );

    // Flag question
    act(() => {
      result.current.handleFlagQuestion(1);
    });

    expect(result.current.state.flaggedQuestions).toContain(1);

    // Unflag the same question
    act(() => {
      result.current.handleFlagQuestion(1);
    });

    expect(result.current.state.flaggedQuestions).not.toContain(1);
  });

  it('should calculate progress correctly', () => {
    const { result } = renderHook(
      () => useQuizState({ quizId: 1, quiz: mockQuiz, questions: mockQuestions }),
      { wrapper }
    );

    // Answer first question
    act(() => {
      result.current.handleAnswerChange('4');
    });

    expect(result.current.progress).toBe(50); // 1 of 2 questions answered

    // Answer second question
    act(() => {
      result.current.handleNextQuestion();
      result.current.handleAnswerChange('10');
    });

    expect(result.current.progress).toBe(100); // 2 of 2 questions answered
  });

  it('should handle timed quiz initialization', () => {
    const timedQuiz: Quiz = {
      ...mockQuiz,
      timeLimit: 600, // 10 minutes in seconds
    };

    const { result } = renderHook(
      () => useQuizState({ quizId: 1, quiz: timedQuiz, questions: mockQuestions }),
      { wrapper }
    );

    expect(result.current.timeRemaining).toBe(600);
  });

  it('should jump to specific question index', () => {
    const { result } = renderHook(
      () => useQuizState({ quizId: 1, quiz: mockQuiz, questions: mockQuestions }),
      { wrapper }
    );

    act(() => {
      result.current.handleJumpToQuestion(1);
    });

    expect(result.current.state.currentQuestionIndex).toBe(1);
    expect(result.current.currentQuestion).toEqual(mockQuestions[1]);
  });

  it('should not navigate beyond last question', () => {
    const { result } = renderHook(
      () => useQuizState({ quizId: 1, quiz: mockQuiz, questions: mockQuestions }),
      { wrapper }
    );

    // Move to last question
    act(() => {
      result.current.handleNextQuestion();
    });

    expect(result.current.state.currentQuestionIndex).toBe(1);

    // Try to move beyond last question
    act(() => {
      result.current.handleNextQuestion();
    });

    // Should stay on last question
    expect(result.current.state.currentQuestionIndex).toBe(1);
  });

  it('should not navigate before first question', () => {
    const { result } = renderHook(
      () => useQuizState({ quizId: 1, quiz: mockQuiz, questions: mockQuestions }),
      { wrapper }
    );

    // Already on first question, try to go back
    act(() => {
      result.current.handlePreviousQuestion();
    });

    // Should stay on first question
    expect(result.current.state.currentQuestionIndex).toBe(0);
  });

  it('should track answered questions count', () => {
    const { result } = renderHook(
      () => useQuizState({ quizId: 1, quiz: mockQuiz, questions: mockQuestions }),
      { wrapper }
    );

    expect(result.current.state.answeredQuestionsCount).toBe(0);

    // Answer first question
    act(() => {
      result.current.handleAnswerChange('4');
    });

    expect(result.current.state.answeredQuestionsCount).toBe(1);

    // Answer second question
    act(() => {
      result.current.handleNextQuestion();
      result.current.handleAnswerChange('10');
    });

    expect(result.current.state.answeredQuestionsCount).toBe(2);
  });

  it('should handle empty questions array', () => {
    const { result } = renderHook(
      () => useQuizState({ quizId: 1, quiz: mockQuiz, questions: [] }),
      { wrapper }
    );

    expect(result.current.currentQuestion).toBeUndefined();
    expect(result.current.progress).toBe(0);
  });

  it('should count flagged questions correctly', () => {
    const { result } = renderHook(
      () => useQuizState({ quizId: 1, quiz: mockQuiz, questions: mockQuestions }),
      { wrapper }
    );

    // Flag both questions
    act(() => {
      result.current.handleFlagQuestion(1);
      result.current.handleFlagQuestion(2);
    });

    expect(result.current.state.flaggedQuestions).toHaveLength(2);
  });

  it('should handle review mode for flagged questions', () => {
    const { result } = renderHook(
      () => useQuizState({ quizId: 1, quiz: mockQuiz, questions: mockQuestions }),
      { wrapper }
    );

    // Flag first question
    act(() => {
      result.current.handleFlagQuestion(1);
    });

    // Enter review mode
    act(() => {
      result.current.handleStartReview();
    });

    expect(result.current.state.isReviewingFlagged).toBe(true);
  });
});
