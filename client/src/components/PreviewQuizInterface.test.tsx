import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PreviewQuizInterface from './PreviewQuizInterface';
import type { Quiz, Question } from '@/components/quiz/types';

// Mock the hooks and components that are used
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/hooks/use-swipe', () => ({
  useSwipe: () => null,
}));

vi.mock('@/components/SwipeIndicator', () => ({
  SwipeIndicator: () => null,
  useSwipeIndicator: () => ({
    swipeDirection: null,
    showSwipeLeft: vi.fn(),
    showSwipeRight: vi.fn(),
  }),
}));

vi.mock('@/components/quiz', () => ({
  QuizHeader: ({ quiz }: { quiz: Quiz }) => <div data-testid="quiz-header">{quiz.title}</div>,
  QuestionDisplay: () => <div data-testid="question-display">Question</div>,
  QuestionNavigator: () => <div data-testid="question-navigator">Navigator</div>,
}));

describe('PreviewQuizInterface', () => {
  const mockQuiz: Quiz = {
    id: 0,
    userId: 'test-user',
    tenantId: 1,
    title: 'Test Quiz',
    description: 'Test Description',
    categoryIds: [1],
    subcategoryIds: [1],
    questionIds: null,
    questionCount: 2,
    timeLimit: 30,
    mode: 'quiz',
    passingScore: 70,
    maxAttempts: null,
    difficultyLevel: 1,
    randomizeQuestions: false,
    randomizeAnswers: false,
    timeLimitPerQuestion: null,
    feedbackMode: 'instant',
    questionWeights: null,
    isAdvancedConfig: false,
    createdAt: new Date(),
  };

  const mockQuestions: Question[] = [
    {
      id: 1,
      tenantId: 1,
      categoryId: 1,
      subcategoryId: 1,
      text: 'What is 2 + 2?',
      options: [
        { id: 0, text: '3' },
        { id: 1, text: '4' },
        { id: 2, text: '5' },
      ],
      correctAnswer: 1,
      correctAnswers: [1],
      explanation: 'Basic math',
      difficultyLevel: 1,
      tags: ['math'],
      questionType: 'multiple_choice_single',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      tenantId: 1,
      categoryId: 1,
      subcategoryId: 1,
      text: 'Is the sky blue?',
      options: [
        { id: 0, text: 'True' },
        { id: 1, text: 'False' },
      ],
      correctAnswer: 0,
      correctAnswers: [0],
      explanation: 'Common knowledge',
      difficultyLevel: 1,
      tags: ['science'],
      questionType: 'true_false',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders preview mode indicator', () => {
    render(
      <PreviewQuizInterface quiz={mockQuiz} questions={mockQuestions} onClose={mockOnClose} />
    );

    expect(screen.getByText('Preview Mode')).toBeInTheDocument();
    expect(
      screen.getByText(/Taking this quiz in preview mode - results will not be saved/)
    ).toBeInTheDocument();
  });

  it('renders quiz header with quiz title', () => {
    render(
      <PreviewQuizInterface quiz={mockQuiz} questions={mockQuestions} onClose={mockOnClose} />
    );

    expect(screen.getByTestId('quiz-header')).toHaveTextContent('Test Quiz');
  });

  it('renders question display and navigator', () => {
    render(
      <PreviewQuizInterface quiz={mockQuiz} questions={mockQuestions} onClose={mockOnClose} />
    );

    expect(screen.getByTestId('question-display')).toBeInTheDocument();
    expect(screen.getByTestId('question-navigator')).toBeInTheDocument();
  });

  it('displays navigation buttons', () => {
    render(
      <PreviewQuizInterface quiz={mockQuiz} questions={mockQuestions} onClose={mockOnClose} />
    );

    // Previous button should be present
    const prevButtons = screen.getAllByText(/Previous|Prev/);
    expect(prevButtons.length).toBeGreaterThan(0);

    // Next button should be present
    const nextButtons = screen.getAllByText(/Next/);
    expect(nextButtons.length).toBeGreaterThan(0);
  });

  it('displays flag button', () => {
    render(
      <PreviewQuizInterface quiz={mockQuiz} questions={mockQuestions} onClose={mockOnClose} />
    );

    const flagButtons = screen.getAllByText(/Flag for Review|Flag/);
    expect(flagButtons.length).toBeGreaterThan(0);
  });

  it('respects quiz configuration - no time limit', () => {
    const quizNoTimeLimit = { ...mockQuiz, timeLimit: null };
    render(
      <PreviewQuizInterface
        quiz={quizNoTimeLimit}
        questions={mockQuestions}
        onClose={mockOnClose}
      />
    );

    // Should not crash with null time limit
    expect(screen.getByTestId('quiz-header')).toBeInTheDocument();
  });

  it('handles empty questions array gracefully', () => {
    const quizNoQuestions = { ...mockQuiz, questionCount: 0 };

    // Should not crash but may not render fully
    expect(() =>
      render(<PreviewQuizInterface quiz={quizNoQuestions} questions={[]} onClose={mockOnClose} />)
    ).not.toThrow();
  });
});
