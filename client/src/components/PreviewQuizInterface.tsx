import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { QuizHeader, QuestionDisplay, QuestionNavigator } from '@/components/quiz';
import { quizReducer } from '@/components/quiz/quizReducer';
import { gradeQuestion } from '@/lib/quiz-grading';
import { initialQuizState } from '@/components/quiz/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { SwipeIndicator, useSwipeIndicator } from '@/components/SwipeIndicator';
import { useSwipe } from '@/hooks/use-swipe';
import { X, AlertTriangle } from 'lucide-react';
import type { QuizState, QuizAnswer, Question, Quiz } from '@/components/quiz/types';

interface PreviewQuizInterfaceProps {
  quiz: Quiz;
  questions: Question[];
  onClose: () => void;
}

/**
 * PreviewQuizInterface - A read-only preview mode for quiz builders
 *
 * This component provides a realistic simulation of the quiz-taking experience
 * without persisting any data to the database. It uses the same UI and logic
 * as the real QuizInterface but operates in a preview/simulation mode.
 */
export default function PreviewQuizInterface({
  quiz,
  questions,
  onClose,
}: PreviewQuizInterfaceProps) {
  const isMobile = useIsMobile();
  const { swipeDirection, showSwipeLeft, showSwipeRight } = useSwipeIndicator();

  // Use the same reducer as the real quiz interface
  const [state, dispatch] = useReducer(quizReducer, initialQuizState);

  // Timer state for preview
  const [timeRemaining, setTimeRemaining] = useState<number | null>(
    quiz.timeLimit ? quiz.timeLimit * 60 : null
  );
  const [showFlaggedQuestionsDialog, setShowFlaggedQuestionsDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewResults, setPreviewResults] = useState<{
    score: number;
    correctAnswers: number;
    totalQuestions: number;
  } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Apply randomization to questions if configured
  const processedQuestions = useMemo(() => {
    let processed = [...questions];

    // Randomize question order if enabled
    if (quiz.randomizeQuestions) {
      for (let i = processed.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [processed[i], processed[j]] = [processed[j], processed[i]];
      }
    }

    // Randomize answer options if enabled
    if (quiz.randomizeAnswers) {
      processed = processed.map((question) => {
        if (
          question.questionType === 'multiple_choice_single' ||
          question.questionType === 'multiple_choice_multiple'
        ) {
          if (question.options && question.options.length > 0) {
            const idToOldIndex = new Map(question.options.map((opt, index) => [opt.id, index]));
            const shuffledOptions = [...question.options];

            for (let i = shuffledOptions.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
            }

            const oldToNewIndexMap = new Map<number, number>();
            shuffledOptions.forEach((opt, newIndex) => {
              const oldIndex = idToOldIndex.get(opt.id);
              if (oldIndex !== undefined) {
                oldToNewIndexMap.set(oldIndex, newIndex);
              }
            });

            const reindexedOptions = shuffledOptions.map((opt, idx) => ({
              ...opt,
              id: idx,
            }));

            let updatedCorrectAnswer = question.correctAnswer;
            let updatedCorrectAnswers = question.correctAnswers;

            if (question.correctAnswer !== null && question.correctAnswer !== undefined) {
              updatedCorrectAnswer =
                oldToNewIndexMap.get(question.correctAnswer) ?? question.correctAnswer;
            }

            if (question.correctAnswers && question.correctAnswers.length > 0) {
              updatedCorrectAnswers = question.correctAnswers
                .map((oldIdx) => oldToNewIndexMap.get(oldIdx) ?? oldIdx)
                .sort((a, b) => a - b);
            }

            return {
              ...question,
              options: reindexedOptions,
              correctAnswer: updatedCorrectAnswer,
              correctAnswers: updatedCorrectAnswers,
            };
          }
        }
        return question;
      });
    }

    return processed;
  }, [quiz, questions]);

  // Get current question based on state
  const currentQuestion = useMemo(() => {
    if (processedQuestions.length === 0) return null;

    if (state.isReviewingFlagged) {
      const flaggedIndex = state.flaggedQuestionIndices[state.currentFlaggedIndex];
      return processedQuestions[flaggedIndex] || null;
    }
    return processedQuestions[state.currentQuestionIndex] || null;
  }, [state, processedQuestions]);

  // Calculate progress
  const progress = useMemo(() => {
    const answered = Object.keys(state.answers).length;
    return (answered / processedQuestions.length) * 100;
  }, [state.answers, processedQuestions.length]);

  // Timer countdown effect
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || previewResults) {
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timeRemaining, previewResults]);

  // Auto-submit when timer reaches zero - will be referenced after handleSubmitQuiz is defined
  const submitQuizRef = useRef<() => void>(() => {});

  // Submit quiz and calculate preview results
  const handleSubmitQuiz = useCallback(() => {
    if (isSubmitting || previewResults) return;

    setIsSubmitting(true);

    // Calculate score based on answers
    let correctCount = 0;
    processedQuestions.forEach((question) => {
      const answer = state.answers[question.id];
      if (answer !== undefined) {
        const isCorrect = gradeQuestion(question, answer);
        if (isCorrect) {
          correctCount++;
        }
      }
    });

    const totalQuestions = processedQuestions.length;
    const score = Math.round((correctCount / totalQuestions) * 100);

    setPreviewResults({
      score,
      correctAnswers: correctCount,
      totalQuestions,
    });

    setIsSubmitting(false);
  }, [state.answers, processedQuestions, isSubmitting, previewResults]);

  // Set the ref for auto-submit
  useEffect(() => {
    submitQuizRef.current = handleSubmitQuiz;
  }, [handleSubmitQuiz]);

  // Auto-submit when timer reaches zero
  useEffect(() => {
    if (timeRemaining === 0 && !previewResults) {
      submitQuizRef.current();
    }
  }, [timeRemaining, previewResults]);

  // Handle answer changes
  const handleAnswerChange = useCallback(
    (answer: string) => {
      if (!currentQuestion || previewResults) return;

      const parsedAnswer = parseAnswer(answer, currentQuestion);
      const isCorrect = gradeQuestion(currentQuestion, parsedAnswer);
      const showFeedback = quiz.feedbackMode === 'instant';

      dispatch({
        type: 'SELECT_ANSWER',
        payload: {
          questionId: currentQuestion.id,
          answer: parsedAnswer,
          isCorrect,
          showFeedback,
        },
      });
    },
    [currentQuestion, quiz.feedbackMode, previewResults]
  );

  // Navigate to next question
  const handleNextQuestion = useCallback(() => {
    if (previewResults) return;

    if (state.isReviewingFlagged) {
      if (state.currentFlaggedIndex === state.flaggedQuestionIndices.length - 1) {
        handleSubmitQuiz();
      } else {
        const nextFlaggedIndex = state.currentFlaggedIndex + 1;
        const nextQuestionIndex = state.flaggedQuestionIndices[nextFlaggedIndex];
        dispatch({
          type: 'MOVE_TO_FLAGGED',
          payload: { flaggedIndex: nextFlaggedIndex, questionIndex: nextQuestionIndex },
        });
      }
    } else {
      if (state.currentQuestionIndex === processedQuestions.length - 1) {
        if (state.flaggedQuestions.size > 0) {
          setShowFlaggedQuestionsDialog(true);
        } else {
          handleSubmitQuiz();
        }
      } else {
        const nextIndex = state.currentQuestionIndex + 1;
        const savedAnswer = state.answers[processedQuestions[nextIndex]?.id];
        dispatch({ type: 'CHANGE_QUESTION', payload: { index: nextIndex, savedAnswer } });
      }
    }
  }, [state, processedQuestions, previewResults]);

  // Navigate to previous question
  const handlePreviousQuestion = useCallback(() => {
    if (previewResults) return;

    if (state.isReviewingFlagged) {
      if (state.currentFlaggedIndex > 0) {
        const prevFlaggedIndex = state.currentFlaggedIndex - 1;
        const prevQuestionIndex = state.flaggedQuestionIndices[prevFlaggedIndex];
        dispatch({
          type: 'MOVE_TO_FLAGGED',
          payload: { flaggedIndex: prevFlaggedIndex, questionIndex: prevQuestionIndex },
        });
      }
    } else {
      if (state.currentQuestionIndex > 0) {
        const prevIndex = state.currentQuestionIndex - 1;
        const savedAnswer = state.answers[processedQuestions[prevIndex]?.id];
        dispatch({ type: 'CHANGE_QUESTION', payload: { index: prevIndex, savedAnswer } });
      }
    }
  }, [state, processedQuestions, previewResults]);

  // Toggle question flag
  const handleFlagQuestion = useCallback(() => {
    if (!currentQuestion || previewResults) return;
    dispatch({ type: 'TOGGLE_FLAG', payload: { questionId: currentQuestion.id } });
  }, [currentQuestion, previewResults]);

  // Start reviewing flagged questions
  const handleReviewFlaggedQuestions = useCallback(() => {
    const indices = Array.from({ length: processedQuestions.length }, (_, i) => i).filter((i) =>
      state.flaggedQuestions.has(processedQuestions[i].id)
    );
    dispatch({ type: 'START_FLAGGED_REVIEW', payload: { indices } });
    setShowFlaggedQuestionsDialog(false);
  }, [state.flaggedQuestions, processedQuestions]);

  // Submit without reviewing flagged questions
  const handleSubmitWithoutReview = useCallback(() => {
    setShowFlaggedQuestionsDialog(false);
    handleSubmitQuiz();
  }, []);

  // Navigate to specific question
  const navigateToQuestion = useCallback(
    (index: number) => {
      if (previewResults) return;
      const savedAnswer = state.answers[processedQuestions[index]?.id];
      dispatch({ type: 'CHANGE_QUESTION', payload: { index, savedAnswer } });
    },
    [state.answers, processedQuestions, previewResults]
  );

  // Swipe gesture support
  const swipeRef = useSwipe(
    {
      onSwipeLeft: () => {
        if (!showFlaggedQuestionsDialog && !isSubmitting && !previewResults) {
          showSwipeLeft();
          handleNextQuestion();
        }
      },
      onSwipeRight: () => {
        if (!showFlaggedQuestionsDialog && !isSubmitting && !previewResults) {
          const canGoBack = state.isReviewingFlagged
            ? state.currentFlaggedIndex > 0
            : state.currentQuestionIndex > 0;
          if (canGoBack) {
            showSwipeRight();
            handlePreviousQuestion();
          }
        }
      },
    },
    { threshold: 50, preventDefaultTouchmoveEvent: true }
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (showFlaggedQuestionsDialog || showExitDialog || previewResults) return;

      const activeElement = document.activeElement;
      if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA') return;

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          setShowExitDialog(true);
          break;
        case 'ArrowLeft':
        case 'p':
        case 'P':
          if (
            state.isReviewingFlagged
              ? state.currentFlaggedIndex > 0
              : state.currentQuestionIndex > 0
          ) {
            event.preventDefault();
            handlePreviousQuestion();
          }
          break;
        case 'ArrowRight':
        case 'n':
        case 'N':
          event.preventDefault();
          handleNextQuestion();
          break;
        case 'f':
        case 'F':
          event.preventDefault();
          handleFlagQuestion();
          break;
      }
    },
    [
      showFlaggedQuestionsDialog,
      showExitDialog,
      previewResults,
      state,
      handlePreviousQuestion,
      handleNextQuestion,
      handleFlagQuestion,
    ]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Show preview results after submission
  if (previewResults) {
    const passed = previewResults.score >= (quiz.passingScore || 70);

    return (
      <div className="fixed inset-0 bg-background z-50 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Preview Results</h1>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <Card className="p-6">
            <div className="text-center space-y-4">
              <div className={`text-6xl font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>
                {previewResults.score}%
              </div>
              <h2 className="text-2xl font-semibold">
                {passed ? '🎉 Passed!' : '📚 Keep Practicing!'}
              </h2>
              <p className="text-muted-foreground">
                You got {previewResults.correctAnswers} out of {previewResults.totalQuestions}{' '}
                questions correct
              </p>
              {quiz.passingScore && (
                <p className="text-sm text-muted-foreground">Passing score: {quiz.passingScore}%</p>
              )}

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-left">
                    <p className="font-semibold text-blue-900 dark:text-blue-100">Preview Mode</p>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                      This is a preview simulation. No data has been saved to your account. Results
                      and progress are not recorded.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-center mt-6">
                <Button variant="outline" onClick={onClose}>
                  Exit Preview
                </Button>
                <Button onClick={onClose}>Try Again</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Render quiz interface
  return (
    <div className="fixed inset-0 bg-background z-50 overflow-auto">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Preview Header */}
        <div className="flex items-center justify-between mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-100">Preview Mode</p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Taking this quiz in preview mode - results will not be saved
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setShowExitDialog(true)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Quiz Content */}
        <div className="space-y-6" ref={isMobile ? swipeRef : null}>
          {isMobile && <SwipeIndicator direction={swipeDirection} />}

          <Card className="shadow-lg border-0 overflow-hidden bg-card">
            <QuizHeader
              quiz={quiz}
              questions={processedQuestions}
              state={state}
              timeRemaining={timeRemaining}
              progress={progress}
            />

            <CardContent className="p-4 sm:p-6">
              {isMobile && (
                <div className="text-xs text-muted-foreground text-center mb-4 py-2 bg-muted/30 rounded-md">
                  💡 Swipe left/right to navigate questions
                </div>
              )}

              {!currentQuestion ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No questions available</p>
                </div>
              ) : (
                <>
                  <QuestionDisplay
                    question={currentQuestion}
                    state={state}
                    onAnswerChange={handleAnswerChange}
                  />

                  <div className="flex flex-col sm:flex-row items-center gap-3 sm:justify-between pt-4 sm:pt-6 border-t border-border">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        onClick={handlePreviousQuestion}
                        disabled={
                          state.isReviewingFlagged
                            ? state.currentFlaggedIndex === 0
                            : state.currentQuestionIndex === 0
                        }
                        size="sm"
                        className="flex-1 sm:flex-initial"
                      >
                        <i className="fas fa-chevron-left mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Previous</span>
                        <span className="sm:hidden">Prev</span>
                      </Button>

                      <Button
                        variant="outline"
                        onClick={handleFlagQuestion}
                        size="sm"
                        className={`flex-1 sm:flex-initial ${
                          currentQuestion && state.flaggedQuestions.has(currentQuestion.id)
                            ? 'bg-accent text-white hover:bg-accent/90'
                            : ''
                        }`}
                      >
                        <i className="fas fa-flag mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">
                          {currentQuestion && state.flaggedQuestions.has(currentQuestion.id)
                            ? 'Unflag'
                            : 'Flag for Review'}
                        </span>
                        <span className="sm:hidden">
                          {currentQuestion && state.flaggedQuestions.has(currentQuestion.id)
                            ? 'Unflag'
                            : 'Flag'}
                        </span>
                      </Button>
                    </div>

                    <Button
                      onClick={handleNextQuestion}
                      disabled={isSubmitting}
                      size="sm"
                      className="w-full sm:w-auto bg-primary text-white hover:bg-primary/90"
                    >
                      {state.isReviewingFlagged ? (
                        state.currentFlaggedIndex === state.flaggedQuestionIndices.length - 1 ? (
                          isSubmitting ? (
                            'Submitting...'
                          ) : (
                            'Finish Review & Submit'
                          )
                        ) : (
                          <>
                            <span className="hidden sm:inline">Next Flagged</span>
                            <span className="sm:hidden">Next</span>
                            <i className="fas fa-chevron-right ml-1 sm:ml-2" />
                          </>
                        )
                      ) : state.currentQuestionIndex === processedQuestions.length - 1 ? (
                        isSubmitting ? (
                          'Submitting...'
                        ) : (
                          'Submit Quiz'
                        )
                      ) : (
                        <>
                          <span className="hidden sm:inline">Next</span>
                          <span className="sm:hidden">Next</span>
                          <i className="fas fa-chevron-right ml-1 sm:ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <QuestionNavigator
            questions={processedQuestions}
            state={state}
            onNavigate={navigateToQuestion}
          />
        </div>

        {/* Flagged Questions Dialog */}
        <AlertDialog open={showFlaggedQuestionsDialog} onOpenChange={setShowFlaggedQuestionsDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                <i className="fas fa-flag text-accent mr-2" />
                Review Flagged Questions?
              </AlertDialogTitle>
              <AlertDialogDescription>
                You have {state.flaggedQuestions.size} flagged question
                {state.flaggedQuestions.size !== 1 ? 's' : ''} for review. Would you like to review{' '}
                {state.flaggedQuestions.size === 1 ? 'it' : 'them'} before submitting?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleSubmitWithoutReview}>
                Submit Without Review
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleReviewFlaggedQuestions}>
                Review Flagged Questions
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Exit Preview Dialog */}
        <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Exit Preview Mode?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to exit the preview? Your progress in this preview session
                will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Continue Preview</AlertDialogCancel>
              <AlertDialogAction onClick={onClose}>Exit Preview</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// Helper function to parse answer based on question type
function parseAnswer(answer: string, question: Question): QuizAnswer {
  switch (question.questionType) {
    case 'multiple_choice_single':
    case 'true_false':
      return parseInt(answer, 10);
    case 'multiple_choice_multiple':
      try {
        return JSON.parse(answer) as number[];
      } catch {
        return [parseInt(answer, 10)];
      }
    case 'fill_in_blank':
    case 'short_answer':
      return answer;
    case 'matching':
      try {
        return JSON.parse(answer) as Record<number, number>;
      } catch {
        return {};
      }
    case 'ordering':
      try {
        return JSON.parse(answer) as number[];
      } catch {
        return [];
      }
    default:
      return answer;
  }
}
