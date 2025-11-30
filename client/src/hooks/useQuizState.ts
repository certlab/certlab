/**
 * Quiz State Management Hook
 *
 * This hook encapsulates all quiz-taking state and logic, providing a clean
 * interface for components to manage quiz sessions. It handles:
 * - Question navigation (next/previous)
 * - Answer selection and validation
 * - Timer countdown with auto-submit
 * - Flagged question review workflow
 * - Quiz submission
 *
 * The hook uses React's useReducer for efficient batched state updates
 * and prevents unnecessary re-renders during quiz interactions.
 *
 * @module useQuizState
 */

import { useReducer, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { clientStorage } from '@/lib/client-storage';
import { achievementService } from '@/lib/achievement-service';
import { useToast } from '@/hooks/use-toast';
import { quizReducer } from '@/components/quiz/quizReducer';
import type { QuizState, Question, Quiz } from '@/components/quiz/types';
import { initialQuizState } from '@/components/quiz/types';

/**
 * Configuration options for the useQuizState hook
 */
interface UseQuizStateOptions {
  /** The unique identifier of the quiz being taken */
  quizId: number;
  /** The quiz configuration (time limit, settings, etc.) */
  quiz: Quiz | undefined;
  /** Array of questions for this quiz session */
  questions: Question[];
}

/**
 * Custom hook for managing quiz session state and interactions.
 *
 * This hook provides comprehensive quiz state management including:
 * - Answer selection with immediate feedback
 * - Timed quiz support with auto-submit on timeout
 * - Question flagging for review before submission
 * - Navigation between questions (normal and review modes)
 * - Quiz submission with TanStack Query mutation
 *
 * @param options - Configuration including quizId, quiz config, and questions
 * @returns Object containing state and handler functions for quiz interactions
 *
 * @example
 * ```tsx
 * function QuizComponent({ quizId, quiz, questions }) {
 *   const {
 *     state,
 *     currentQuestion,
 *     progress,
 *     timeRemaining,
 *     handleAnswerChange,
 *     handleNextQuestion,
 *     handleFlagQuestion,
 *     handleSubmitQuiz,
 *   } = useQuizState({ quizId, quiz, questions });
 *
 *   return (
 *     <div>
 *       <ProgressBar value={progress} />
 *       <QuestionDisplay question={currentQuestion} />
 *       <AnswerOptions onChange={handleAnswerChange} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useQuizState({ quizId, quiz, questions }: UseQuizStateOptions) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Initialize quiz state with useReducer for batched updates
  const [state, dispatch] = useReducer(quizReducer, initialQuizState);

  // Separate state for time and dialogs (don't need batching)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showFlaggedQuestionsDialog, setShowFlaggedQuestionsDialog] = useState(false);

  // Ref to hold the submit function to avoid stale closure in timer effect
  const submitQuizRef = useRef<() => void>(() => {});
  // Ref to track timer to avoid recreating interval every second
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Mutation for submitting quiz answers to IndexedDB storage.
   * On success, processes achievements and navigates to results page.
   */
  const submitQuizMutation = useMutation({
    mutationFn: async (quizAnswers: { questionId: number; answer: number }[]) => {
      const completedQuiz = await clientStorage.submitQuiz(quizId, quizAnswers);

      // Process achievements after quiz completion
      if (completedQuiz.userId) {
        const achievementResult = await achievementService.processQuizCompletion(
          completedQuiz.userId,
          completedQuiz,
          completedQuiz.tenantId
        );

        // Return both quiz and achievement results
        return { quiz: completedQuiz, achievements: achievementResult };
      }

      return { quiz: completedQuiz, achievements: null };
    },
    onSuccess: (result) => {
      // Invalidate user-related queries using the quiz's userId if available
      if (quiz?.userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.user.all(quiz.userId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.quiz.detail(quizId) });

      // Show toast for new badges earned
      if (result.achievements?.newBadges && result.achievements.newBadges.length > 0) {
        const badgeNames = result.achievements.newBadges.map((b) => b.name).join(', ');
        toast({
          title: '🏆 Achievement Unlocked!',
          description: `You earned: ${badgeNames}`,
        });
      }

      // Show toast for level up
      if (result.achievements?.levelUp) {
        toast({
          title: '🎉 Level Up!',
          description: `You've reached level ${result.achievements.newLevel}!`,
        });
      }

      setLocation(`/app/results/${quizId}`);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to submit quiz. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Initialize timer from quiz time limit (converted from minutes to seconds)
  useEffect(() => {
    if (quiz?.timeLimit) {
      setTimeRemaining(quiz.timeLimit * 60);
    }
  }, [quiz]);

  /**
   * Timer countdown effect.
   * Creates a single interval that decrements every second.
   * Auto-submits the quiz when time reaches zero.
   */
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            // Time's up - auto submit using ref to avoid stale closure
            submitQuizRef.current();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timeRemaining]);

  /** Current question being displayed */
  const currentQuestion = questions[state.currentQuestionIndex];
  /** Progress percentage (0-100) through the quiz */
  const progress =
    questions.length > 0 ? ((state.currentQuestionIndex + 1) / questions.length) * 100 : 0;

  /**
   * Handles answer selection for the current question.
   * Once an answer is selected, it cannot be changed (locked in).
   * Immediately shows feedback on whether the answer was correct.
   */
  const handleAnswerChange = useCallback(
    (value: string) => {
      // Prevent changing answer once selected
      if (state.selectedAnswer !== undefined) {
        return;
      }

      const answerValue = parseInt(value);

      if (currentQuestion) {
        const correct = answerValue === currentQuestion.correctAnswer;

        // Batch all state updates in a single dispatch
        dispatch({
          type: 'SELECT_ANSWER',
          payload: {
            questionId: currentQuestion.id,
            answer: answerValue,
            isCorrect: correct,
            showFeedback: true,
          },
        });
      }
    },
    [state.selectedAnswer, currentQuestion]
  );

  /**
   * Handles quiz submission.
   * If there are flagged questions and not in review mode, prompts user to review.
   * Otherwise, submits all answers via the mutation.
   */
  const handleSubmitQuiz = useCallback(() => {
    // Check if there are flagged questions
    if (state.flaggedQuestions.size > 0 && !state.isReviewingFlagged) {
      setShowFlaggedQuestionsDialog(true);
    } else {
      // Submit the quiz directly
      const quizAnswers = questions.map((question) => {
        const answer = state.answers[question.id];
        return {
          questionId: question.id,
          answer: answer !== undefined ? answer : 0,
        };
      });

      submitQuizMutation.mutate(quizAnswers);
    }
  }, [
    state.flaggedQuestions,
    state.isReviewingFlagged,
    state.answers,
    questions,
    submitQuizMutation,
  ]);

  // Keep the ref updated with the latest handleSubmitQuiz function
  useEffect(() => {
    submitQuizRef.current = handleSubmitQuiz;
  }, [handleSubmitQuiz]);

  /**
   * Navigates to the next question.
   * In review mode: moves through flagged questions, auto-submits at end.
   * In normal mode: advances to next question or triggers submission at end.
   */
  const handleNextQuestion = useCallback(() => {
    if (state.isReviewingFlagged) {
      // In review mode, navigate only through flagged questions
      if (state.currentFlaggedIndex < state.flaggedQuestionIndices.length - 1) {
        const nextFlaggedIndex = state.currentFlaggedIndex + 1;
        dispatch({
          type: 'MOVE_TO_FLAGGED',
          payload: {
            flaggedIndex: nextFlaggedIndex,
            questionIndex: state.flaggedQuestionIndices[nextFlaggedIndex],
          },
        });
      } else {
        // Finished reviewing all flagged questions, auto-submit
        dispatch({ type: 'END_FLAGGED_REVIEW' });
        const quizAnswers = questions.map((question) => {
          const answer = state.answers[question.id];
          return {
            questionId: question.id,
            answer: answer !== undefined ? answer : 0,
          };
        });
        submitQuizMutation.mutate(quizAnswers);
      }
    } else {
      // Normal mode navigation
      if (state.currentQuestionIndex < questions.length - 1) {
        const nextIndex = state.currentQuestionIndex + 1;
        const nextQuestion = questions[nextIndex];
        const savedAnswer = nextQuestion ? state.answers[nextQuestion.id] : undefined;
        dispatch({
          type: 'CHANGE_QUESTION',
          payload: {
            index: nextIndex,
            savedAnswer,
          },
        });
      } else {
        handleSubmitQuiz();
      }
    }
  }, [state, questions, submitQuizMutation, handleSubmitQuiz]);

  /**
   * Navigates to the previous question.
   * In review mode: moves backwards through flagged questions only.
   * In normal mode: moves to the previous question in sequence.
   */
  const handlePreviousQuestion = useCallback(() => {
    if (state.isReviewingFlagged) {
      // In review mode, navigate only through flagged questions
      if (state.currentFlaggedIndex > 0) {
        const prevFlaggedIndex = state.currentFlaggedIndex - 1;
        dispatch({
          type: 'MOVE_TO_FLAGGED',
          payload: {
            flaggedIndex: prevFlaggedIndex,
            questionIndex: state.flaggedQuestionIndices[prevFlaggedIndex],
          },
        });
      }
    } else {
      // Normal mode navigation
      if (state.currentQuestionIndex > 0) {
        const prevIndex = state.currentQuestionIndex - 1;
        const prevQuestion = questions[prevIndex];
        const savedAnswer = prevQuestion ? state.answers[prevQuestion.id] : undefined;
        dispatch({
          type: 'CHANGE_QUESTION',
          payload: {
            index: prevIndex,
            savedAnswer,
          },
        });
      }
    }
  }, [state, questions]);

  /**
   * Toggles the flag status of the current question.
   * Flagged questions can be reviewed before final submission.
   */
  const handleFlagQuestion = useCallback(() => {
    if (currentQuestion) {
      dispatch({
        type: 'TOGGLE_FLAG',
        payload: { questionId: currentQuestion.id },
      });
    }
  }, [currentQuestion]);

  /**
   * Initiates the flagged questions review workflow.
   * Enters review mode and navigates to the first flagged question.
   */
  const handleReviewFlaggedQuestions = useCallback(() => {
    setShowFlaggedQuestionsDialog(false);

    // Find indices of flagged questions
    const flaggedIndices = questions
      .map((q, index) => ({ question: q, index }))
      .filter((item) => state.flaggedQuestions.has(item.question.id))
      .map((item) => item.index);

    if (flaggedIndices.length > 0) {
      dispatch({
        type: 'START_FLAGGED_REVIEW',
        payload: { indices: flaggedIndices },
      });

      // Navigate to the first flagged question
      const firstIndex = flaggedIndices[0];
      const firstQuestion = questions[firstIndex];
      const savedAnswer = firstQuestion ? state.answers[firstQuestion.id] : undefined;
      dispatch({
        type: 'CHANGE_QUESTION',
        payload: {
          index: firstIndex,
          savedAnswer,
        },
      });
    }
  }, [state, questions]);

  /**
   * Skips the flagged questions review and submits immediately.
   * Called when user chooses not to review flagged questions.
   */
  const handleSubmitWithoutReview = useCallback(() => {
    setShowFlaggedQuestionsDialog(false);
    // Submit the quiz directly
    const quizAnswers = questions.map((question) => {
      const answer = state.answers[question.id];
      return {
        questionId: question.id,
        answer: answer !== undefined ? answer : 0,
      };
    });

    submitQuizMutation.mutate(quizAnswers);
  }, [state, questions, submitQuizMutation]);

  /**
   * Directly navigates to a specific question by index.
   * Used for question overview/navigation panel.
   */
  const navigateToQuestion = useCallback(
    (index: number) => {
      const targetQuestion = questions[index];
      const savedAnswer = targetQuestion ? state.answers[targetQuestion.id] : undefined;
      dispatch({
        type: 'CHANGE_QUESTION',
        payload: {
          index,
          savedAnswer,
        },
      });
    },
    [state, questions]
  );

  return {
    /** Current quiz state from reducer */
    state,
    /** Seconds remaining (null if untimed quiz) */
    timeRemaining,
    /** Whether to show the flagged questions review dialog */
    showFlaggedQuestionsDialog,
    /** Setter for flagged questions dialog visibility */
    setShowFlaggedQuestionsDialog,
    /** The current question being displayed */
    currentQuestion,
    /** Progress percentage through the quiz (0-100) */
    progress,
    /** TanStack Query mutation for quiz submission */
    submitQuizMutation,
    /** Handler for selecting an answer */
    handleAnswerChange,
    /** Handler for moving to next question */
    handleNextQuestion,
    /** Handler for moving to previous question */
    handlePreviousQuestion,
    /** Handler for flagging/unflagging current question */
    handleFlagQuestion,
    /** Handler for initiating quiz submission */
    handleSubmitQuiz,
    /** Handler for starting flagged question review */
    handleReviewFlaggedQuestions,
    /** Handler for submitting without reviewing flagged questions */
    handleSubmitWithoutReview,
    /** Handler for direct navigation to a question by index */
    navigateToQuestion,
  };
}
