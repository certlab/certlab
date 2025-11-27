import { useReducer, useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { quizReducer } from "@/components/quiz/quizReducer";
import type { QuizState, Question, Quiz } from "@/components/quiz/types";
import { initialQuizState } from "@/components/quiz/types";

interface UseQuizStateOptions {
  quizId: number;
  quiz: Quiz | undefined;
  questions: Question[];
}

export function useQuizState({ quizId, quiz, questions }: UseQuizStateOptions) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Initialize quiz state with useReducer for batched updates
  const [state, dispatch] = useReducer(quizReducer, initialQuizState);
  
  // Separate state for time and dialogs (don't need batching)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showFlaggedQuestionsDialog, setShowFlaggedQuestionsDialog] = useState(false);

  const submitQuizMutation = useMutation({
    mutationFn: async (quizAnswers: { questionId: number; answer: number }[]) => {
      const { clientStorage } = await import('@/lib/client-storage');
      return await clientStorage.submitQuiz(quizId, quizAnswers);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/quiz', quizId] });
      setLocation(`/app/results/${quizId}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit quiz. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Initialize timer
  useEffect(() => {
    if (quiz?.timeLimit) {
      setTimeRemaining(quiz.timeLimit * 60); // Convert minutes to seconds
    }
  }, [quiz]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          // Time's up - auto submit
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Load saved answer when question changes
  useEffect(() => {
    const currentQuestion = questions[state.currentQuestionIndex];
    if (currentQuestion) {
      const savedAnswer = state.answers[currentQuestion.id];
      dispatch({ 
        type: 'CHANGE_QUESTION', 
        payload: { 
          index: state.currentQuestionIndex,
          savedAnswer 
        } 
      });
    }
  }, [state.currentQuestionIndex, questions]);

  const currentQuestion = questions[state.currentQuestionIndex];
  const progress = questions.length > 0 ? ((state.currentQuestionIndex + 1) / questions.length) * 100 : 0;

  const handleAnswerChange = useCallback((value: string) => {
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
          showFeedback: true
        }
      });
    }
  }, [state.selectedAnswer, currentQuestion]);

  const handleNextQuestion = useCallback(() => {
    if (state.isReviewingFlagged) {
      // In review mode, navigate only through flagged questions
      if (state.currentFlaggedIndex < state.flaggedQuestionIndices.length - 1) {
        const nextFlaggedIndex = state.currentFlaggedIndex + 1;
        dispatch({
          type: 'MOVE_TO_FLAGGED',
          payload: {
            flaggedIndex: nextFlaggedIndex,
            questionIndex: state.flaggedQuestionIndices[nextFlaggedIndex]
          }
        });
      } else {
        // Finished reviewing all flagged questions, auto-submit
        dispatch({ type: 'END_FLAGGED_REVIEW' });
        const quizAnswers = questions.map(question => {
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
            savedAnswer
          }
        });
      } else {
        handleSubmitQuiz();
      }
    }
  }, [state, questions, submitQuizMutation]);

  const handlePreviousQuestion = useCallback(() => {
    if (state.isReviewingFlagged) {
      // In review mode, navigate only through flagged questions
      if (state.currentFlaggedIndex > 0) {
        const prevFlaggedIndex = state.currentFlaggedIndex - 1;
        dispatch({
          type: 'MOVE_TO_FLAGGED',
          payload: {
            flaggedIndex: prevFlaggedIndex,
            questionIndex: state.flaggedQuestionIndices[prevFlaggedIndex]
          }
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
            savedAnswer
          }
        });
      }
    }
  }, [state, questions]);

  const handleFlagQuestion = useCallback(() => {
    if (currentQuestion) {
      dispatch({
        type: 'TOGGLE_FLAG',
        payload: { questionId: currentQuestion.id }
      });
    }
  }, [currentQuestion]);

  const handleSubmitQuiz = useCallback(() => {
    // Check if there are flagged questions
    if (state.flaggedQuestions.size > 0 && !state.isReviewingFlagged) {
      setShowFlaggedQuestionsDialog(true);
    } else {
      // Submit the quiz directly
      const quizAnswers = questions.map(question => {
        const answer = state.answers[question.id];
        return {
          questionId: question.id,
          answer: answer !== undefined ? answer : 0,
        };
      });

      submitQuizMutation.mutate(quizAnswers);
    }
  }, [state, questions, submitQuizMutation]);

  const handleReviewFlaggedQuestions = useCallback(() => {
    setShowFlaggedQuestionsDialog(false);
    
    // Find indices of flagged questions
    const flaggedIndices = questions
      .map((q, index) => ({ question: q, index }))
      .filter(item => state.flaggedQuestions.has(item.question.id))
      .map(item => item.index);
    
    if (flaggedIndices.length > 0) {
      dispatch({
        type: 'START_FLAGGED_REVIEW',
        payload: { indices: flaggedIndices }
      });
      
      // Navigate to the first flagged question
      const firstIndex = flaggedIndices[0];
      const firstQuestion = questions[firstIndex];
      const savedAnswer = firstQuestion ? state.answers[firstQuestion.id] : undefined;
      dispatch({
        type: 'CHANGE_QUESTION',
        payload: {
          index: firstIndex,
          savedAnswer
        }
      });
    }
  }, [state, questions]);

  const handleSubmitWithoutReview = useCallback(() => {
    setShowFlaggedQuestionsDialog(false);
    // Submit the quiz directly
    const quizAnswers = questions.map(question => {
      const answer = state.answers[question.id];
      return {
        questionId: question.id,
        answer: answer !== undefined ? answer : 0,
      };
    });

    submitQuizMutation.mutate(quizAnswers);
  }, [state, questions, submitQuizMutation]);

  const navigateToQuestion = useCallback((index: number) => {
    const targetQuestion = questions[index];
    const savedAnswer = targetQuestion ? state.answers[targetQuestion.id] : undefined;
    dispatch({
      type: 'CHANGE_QUESTION',
      payload: {
        index,
        savedAnswer
      }
    });
  }, [state, questions]);

  return {
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
    handleSubmitQuiz,
    handleReviewFlaggedQuestions,
    handleSubmitWithoutReview,
    navigateToQuestion,
  };
}
