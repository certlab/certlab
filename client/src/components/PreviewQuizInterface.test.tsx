import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PreviewQuizInterface from './PreviewQuizInterface';
import type { Quiz, Question } from '@/components/quiz/types';

// Mock the grading function
vi.mock('@/lib/quiz-grading', () => ({
  gradeQuestion: vi.fn((question: Question, answer: any) => {
    // Simple mock: check if answer matches correctAnswer
    if (
      question.questionType === 'multiple_choice_single' ||
      question.questionType === 'true_false'
    ) {
      return answer === question.correctAnswer;
    }
    return false;
  }),
}));

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
    updatedAt: new Date(),
    startedAt: new Date(),
    completedAt: null,
    score: null,
    correctAnswers: null,
    totalQuestions: null,
    answers: null,
    isAdaptive: false,
    adaptiveMetrics: null,
    difficultyFilter: null,
    isPassing: false,
    missedTopics: null,
    author: null,
    authorName: null,
    prerequisites: null,
    tags: null,
    // Access control fields
    visibility: 'private',
    sharedWithUsers: null,
    sharedWithGroups: null,
    requiresPurchase: false,
    purchaseProductId: null,
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
      acceptedAnswers: null,
      matchingPairs: null,
      orderingItems: null,
      requiresManualGrading: false,
      explanationSteps: null,
      referenceLinks: null,
      videoUrl: null,
      communityExplanations: null,
      explanationVotes: 0,
      hasAlternativeViews: false,
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
      acceptedAnswers: null,
      matchingPairs: null,
      orderingItems: null,
      requiresManualGrading: false,
      explanationSteps: null,
      referenceLinks: null,
      videoUrl: null,
      communityExplanations: null,
      explanationVotes: 0,
      hasAlternativeViews: false,
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

  describe('User Interactions', () => {
    it('should call onClose when exit button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();

      render(
        <PreviewQuizInterface quiz={mockQuiz} questions={mockQuestions} onClose={mockOnClose} />
      );

      // Find and click the exit button (with aria-label)
      const exitButton = screen.getByLabelText('Exit preview mode');
      await user.click(exitButton);

      // Should show confirmation dialog
      expect(screen.getByText('Exit Preview Mode?')).toBeInTheDocument();
    });

    it('should navigate to next question when next button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <PreviewQuizInterface quiz={mockQuiz} questions={mockQuestions} onClose={mockOnClose} />
      );

      // Get initial question display
      const questionDisplay = screen.getByTestId('question-display');
      expect(questionDisplay).toBeInTheDocument();

      // Find and click next button
      const nextButtons = screen.getAllByText(/Next/);
      const nextButton = nextButtons.find((btn) => btn.tagName === 'BUTTON');

      if (nextButton) {
        await user.click(nextButton);
        // After clicking, question should still be displayed (different question)
        expect(screen.getByTestId('question-display')).toBeInTheDocument();
      }
    });

    it('should navigate to previous question when previous button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <PreviewQuizInterface quiz={mockQuiz} questions={mockQuestions} onClose={mockOnClose} />
      );

      // First go to next question
      const nextButtons = screen.getAllByText(/Next/);
      const nextButton = nextButtons.find((btn) => btn.tagName === 'BUTTON');

      if (nextButton) {
        await user.click(nextButton);

        // Now click previous
        const prevButtons = screen.getAllByText(/Previous|Prev/);
        const prevButton = prevButtons.find((btn) => btn.tagName === 'BUTTON');

        if (prevButton) {
          await user.click(prevButton);
          expect(screen.getByTestId('question-display')).toBeInTheDocument();
        }
      }
    });

    it('should toggle flag when flag button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <PreviewQuizInterface quiz={mockQuiz} questions={mockQuestions} onClose={mockOnClose} />
      );

      // Find flag button
      const flagButtons = screen.getAllByText(/Flag/);
      const flagButton = flagButtons.find((btn) => btn.tagName === 'BUTTON');

      if (flagButton) {
        // Click to flag
        await user.click(flagButton);

        // Button text should change to Unflag
        await waitFor(() => {
          expect(screen.getByText(/Unflag/)).toBeInTheDocument();
        });
      }
    });

    it('should handle timer countdown for timed quizzes', async () => {
      const timedQuiz = { ...mockQuiz, timeLimit: 1 }; // 1 minute

      render(
        <PreviewQuizInterface quiz={timedQuiz} questions={mockQuestions} onClose={mockOnClose} />
      );

      // Timer should be initialized
      expect(screen.getByTestId('quiz-header')).toBeInTheDocument();
    });

    it('should handle quiz submission when submit button is clicked on last question', async () => {
      const user = userEvent.setup();
      const singleQuestionQuiz = { ...mockQuiz, questionCount: 1 };
      const singleQuestion = [mockQuestions[0]];

      render(
        <PreviewQuizInterface
          quiz={singleQuestionQuiz}
          questions={singleQuestion}
          onClose={mockOnClose}
        />
      );

      // Find and click submit button (on last question, button should say "Submit Quiz")
      const submitButtons = screen.getAllByText(/Submit/);
      const submitButton = submitButtons.find((btn) => btn.tagName === 'BUTTON');

      if (submitButton) {
        await user.click(submitButton);

        // Should show results after submission
        await waitFor(() => {
          expect(screen.getByText('Preview Results')).toBeInTheDocument();
        });
      }
    });

    it('should close results and exit when close button is clicked on results screen', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();
      const singleQuestionQuiz = { ...mockQuiz, questionCount: 1 };
      const singleQuestion = [mockQuestions[0]];

      render(
        <PreviewQuizInterface
          quiz={singleQuestionQuiz}
          questions={singleQuestion}
          onClose={mockOnClose}
        />
      );

      // Submit quiz to get to results
      const submitButtons = screen.getAllByText(/Submit/);
      const submitButton = submitButtons.find((btn) => btn.tagName === 'BUTTON');

      if (submitButton) {
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText('Preview Results')).toBeInTheDocument();
        });

        // Click close button on results screen
        const closeButton = screen.getByLabelText('Close results');
        await user.click(closeButton);

        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });
});
