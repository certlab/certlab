import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useEffect, useCallback } from 'react';
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
import { useQuizState } from '@/hooks/useQuizState';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { queryKeys } from '@/lib/queryClient';
import { useSwipe } from '@/hooks/use-swipe';
import { useIsMobile } from '@/hooks/use-mobile';
import { SwipeIndicator, useSwipeIndicator } from '@/components/SwipeIndicator';
import type { Question, Quiz } from '@shared/schema';

interface QuizInterfaceProps {
  quizId: number;
}

export default function QuizInterface({ quizId }: QuizInterfaceProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { swipeDirection, showSwipeLeft, showSwipeRight } = useSwipeIndicator();

  const { data: quiz } = useQuery<Quiz>({
    queryKey: queryKeys.quiz.detail(quizId),
  });

  const { data: questions = [], isLoading: isLoadingQuestions } = useQuery<Question[]>({
    queryKey: queryKeys.quiz.questions(quizId),
    enabled: !!quiz,
  });

  const {
    state,
    timeRemaining,
    showFlaggedQuestionsDialog,
    setShowFlaggedQuestionsDialog,
    currentQuestion,
    progress,
    submitQuizMutation,
    handleAnswerChange,
    handleNextQuestion,
    handlePreviousQuestion,
    handleFlagQuestion,
    handleReviewFlaggedQuestions,
    handleSubmitWithoutReview,
    navigateToQuestion,
  } = useQuizState({ quizId, quiz, questions });

  // Swipe gesture support for mobile navigation
  const swipeRef = useSwipe(
    {
      onSwipeLeft: () => {
        // Swipe left = next question
        if (!showFlaggedQuestionsDialog && !submitQuizMutation.isPending) {
          showSwipeLeft();
          handleNextQuestion();
        }
      },
      onSwipeRight: () => {
        // Swipe right = previous question
        if (!showFlaggedQuestionsDialog && !submitQuizMutation.isPending) {
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

  // Keyboard navigation for quiz interface
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't handle keyboard shortcuts when a dialog is open
      if (showFlaggedQuestionsDialog) return;

      // Don't handle shortcuts when focus is on an input or button
      const activeElement = document.activeElement;
      if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA') return;

      switch (event.key) {
        case 'ArrowLeft':
        case 'p':
        case 'P':
          // Previous question
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
          // Next question
          event.preventDefault();
          handleNextQuestion();
          break;
        case 'f':
        case 'F':
          // Flag/unflag current question
          event.preventDefault();
          handleFlagQuestion();
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
          // Quick answer selection (for questions with up to 5 options)
          if (currentQuestion && state.selectedAnswer === undefined) {
            const optionIndex = parseInt(event.key) - 1;
            const options = currentQuestion.options as any[];
            if (optionIndex < options.length) {
              event.preventDefault();
              const optionId =
                options[optionIndex].id !== undefined ? options[optionIndex].id : optionIndex;
              handleAnswerChange(optionId.toString());
            }
          }
          break;
      }
    },
    [
      showFlaggedQuestionsDialog,
      state.isReviewingFlagged,
      state.currentFlaggedIndex,
      state.currentQuestionIndex,
      state.selectedAnswer,
      currentQuestion,
      handlePreviousQuestion,
      handleNextQuestion,
      handleFlagQuestion,
      handleAnswerChange,
    ]
  );

  // Set up keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Error handling for no questions
  if (quiz && questions.length === 0 && !isLoadingQuestions) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="max-w-lg p-6">
          <div className="text-center">
            <i className="fas fa-exclamation-triangle text-4xl text-warning mb-4"></i>
            <h2 className="text-xl font-semibold mb-2">No Questions Available</h2>
            <p className="text-muted-foreground mb-4">
              Unfortunately, there are no questions available for this quiz. This might be because
              the selected categories don't have any questions in the database yet.
            </p>
            <Button onClick={() => navigate('/app/dashboard')} className="w-full sm:w-auto">
              Return to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Loading state
  if (!quiz || !currentQuestion || isLoadingQuestions) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" label="Loading quiz..." />
      </div>
    );
  }

  return (
    <div className="space-y-6" ref={isMobile ? swipeRef : null}>
      {isMobile && <SwipeIndicator direction={swipeDirection} />}

      <Card className="shadow-lg border-0 overflow-hidden bg-card">
        {/* Quiz Header */}
        <QuizHeader
          quiz={quiz}
          questions={questions}
          state={state}
          timeRemaining={timeRemaining}
          progress={progress}
        />

        {/* Question Content */}
        <CardContent className="p-4 sm:p-6">
          {isMobile && (
            <div className="text-xs text-muted-foreground text-center mb-4 py-2 bg-muted/30 rounded-md">
              💡 Swipe left/right to navigate questions
            </div>
          )}

          <QuestionDisplay
            question={currentQuestion}
            state={state}
            onAnswerChange={handleAnswerChange}
          />

          {/* Question Navigation */}
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
                aria-label={
                  state.isReviewingFlagged
                    ? `Previous flagged question (${state.currentFlaggedIndex + 1} of ${state.flaggedQuestionIndices.length})`
                    : `Previous question (${state.currentQuestionIndex + 1} of ${questions.length})`
                }
              >
                <i className="fas fa-chevron-left mr-1 sm:mr-2" aria-hidden="true"></i>
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </Button>

              <Button
                variant="outline"
                onClick={handleFlagQuestion}
                size="sm"
                className={`flex-1 sm:flex-initial quiz-flag-button ${
                  state.flaggedQuestions.has(currentQuestion.id)
                    ? 'bg-accent text-white hover:bg-accent/90'
                    : ''
                }`}
                aria-label={
                  state.flaggedQuestions.has(currentQuestion.id)
                    ? 'Remove flag from this question'
                    : 'Flag this question for review'
                }
                aria-pressed={state.flaggedQuestions.has(currentQuestion.id)}
              >
                <i className="fas fa-flag mr-1 sm:mr-2" aria-hidden="true"></i>
                <span className="hidden sm:inline">
                  {state.flaggedQuestions.has(currentQuestion.id) ? 'Unflag' : 'Flag for Review'}
                </span>
                <span className="sm:hidden">
                  {state.flaggedQuestions.has(currentQuestion.id) ? 'Unflag' : 'Flag'}
                </span>
              </Button>
            </div>

            <Button
              onClick={handleNextQuestion}
              disabled={submitQuizMutation.isPending}
              size="sm"
              className="w-full sm:w-auto bg-primary text-white hover:bg-primary/90"
              aria-label={
                state.isReviewingFlagged
                  ? state.currentFlaggedIndex === state.flaggedQuestionIndices.length - 1
                    ? 'Finish review and submit quiz'
                    : `Next flagged question (${state.currentFlaggedIndex + 2} of ${state.flaggedQuestionIndices.length})`
                  : state.currentQuestionIndex === questions.length - 1
                    ? 'Submit quiz'
                    : `Next question (${state.currentQuestionIndex + 2} of ${questions.length})`
              }
            >
              {state.isReviewingFlagged ? (
                state.currentFlaggedIndex === state.flaggedQuestionIndices.length - 1 ? (
                  submitQuizMutation.isPending ? (
                    'Submitting...'
                  ) : (
                    'Finish Review & Submit'
                  )
                ) : (
                  <>
                    <span className="hidden sm:inline">Next Flagged</span>
                    <span className="sm:hidden">Next</span>
                    <i className="fas fa-chevron-right ml-1 sm:ml-2" aria-hidden="true"></i>
                  </>
                )
              ) : state.currentQuestionIndex === questions.length - 1 ? (
                submitQuizMutation.isPending ? (
                  'Submitting...'
                ) : (
                  'Submit Quiz'
                )
              ) : (
                <>
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">Next</span>
                  <i className="fas fa-chevron-right ml-1 sm:ml-2" aria-hidden="true"></i>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Question Navigator */}
      <QuestionNavigator questions={questions} state={state} onNavigate={navigateToQuestion} />

      {/* Flagged Questions Review Dialog */}
      <AlertDialog open={showFlaggedQuestionsDialog} onOpenChange={setShowFlaggedQuestionsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <i className="fas fa-flag text-accent mr-2"></i>
              Review Flagged Questions?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have {state.flaggedQuestions.size} flagged question
              {state.flaggedQuestions.size !== 1 ? 's' : ''} for review. Would you like to review{' '}
              {state.flaggedQuestions.size === 1 ? 'it' : 'them'} before submitting the quiz?
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
    </div>
  );
}
