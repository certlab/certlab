import { useReducer, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatTime } from "@/lib/questions";
import { useToast } from "@/hooks/use-toast";
import type { Question, Quiz } from "@shared/schema";

interface QuizInterfaceProps {
  quizId: number;
}

// Define quiz state shape
interface QuizState {
  currentQuestionIndex: number;
  answers: Record<number, number>;
  flaggedQuestions: Set<number>;
  selectedAnswer: number | undefined;
  showFeedback: boolean;
  isCorrect: boolean;
  isReviewingFlagged: boolean;
  currentFlaggedIndex: number;
  flaggedQuestionIndices: number[];
}

// Define action types
type QuizAction =
  | { type: 'SELECT_ANSWER'; payload: { questionId: number; answer: number; isCorrect: boolean; showFeedback: boolean } }
  | { type: 'CHANGE_QUESTION'; payload: { index: number; savedAnswer?: number } }
  | { type: 'TOGGLE_FLAG'; payload: { questionId: number } }
  | { type: 'START_FLAGGED_REVIEW'; payload: { indices: number[] } }
  | { type: 'MOVE_TO_FLAGGED'; payload: { flaggedIndex: number; questionIndex: number } }
  | { type: 'END_FLAGGED_REVIEW' }
  | { type: 'RESET_FEEDBACK' };

// Reducer function to handle state updates
function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'SELECT_ANSWER':
      return {
        ...state,
        selectedAnswer: action.payload.answer,
        answers: {
          ...state.answers,
          [action.payload.questionId]: action.payload.answer
        },
        showFeedback: action.payload.showFeedback,
        isCorrect: action.payload.isCorrect
      };
      
    case 'CHANGE_QUESTION':
      return {
        ...state,
        currentQuestionIndex: action.payload.index,
        selectedAnswer: action.payload.savedAnswer,
        showFeedback: false,
        isCorrect: false
      };
      
    case 'TOGGLE_FLAG':
      const newFlagged = new Set(state.flaggedQuestions);
      if (newFlagged.has(action.payload.questionId)) {
        newFlagged.delete(action.payload.questionId);
      } else {
        newFlagged.add(action.payload.questionId);
      }
      return {
        ...state,
        flaggedQuestions: newFlagged
      };
      
    case 'START_FLAGGED_REVIEW':
      return {
        ...state,
        isReviewingFlagged: true,
        currentFlaggedIndex: 0,
        flaggedQuestionIndices: action.payload.indices
      };
      
    case 'MOVE_TO_FLAGGED':
      return {
        ...state,
        currentFlaggedIndex: action.payload.flaggedIndex,
        currentQuestionIndex: action.payload.questionIndex
      };
      
    case 'END_FLAGGED_REVIEW':
      return {
        ...state,
        isReviewingFlagged: false,
        currentFlaggedIndex: 0,
        flaggedQuestionIndices: []
      };
      
    case 'RESET_FEEDBACK':
      return {
        ...state,
        showFeedback: false,
        isCorrect: false
      };
      
    default:
      return state;
  }
}

export default function QuizInterface({ quizId }: QuizInterfaceProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Initialize quiz state with useReducer for batched updates
  const [state, dispatch] = useReducer(quizReducer, {
    currentQuestionIndex: 0,
    answers: {},
    flaggedQuestions: new Set<number>(),
    selectedAnswer: undefined,
    showFeedback: false,
    isCorrect: false,
    isReviewingFlagged: false,
    currentFlaggedIndex: 0,
    flaggedQuestionIndices: []
  });
  
  // Separate state for time and dialogs (don't need batching)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showFlaggedQuestionsDialog, setShowFlaggedQuestionsDialog] = useState(false);

  const { data: quiz } = useQuery<Quiz>({
    queryKey: ['/api/quiz', quizId],
  });

  const { data: questions = [], isLoading: isLoadingQuestions } = useQuery<Question[]>({
    queryKey: ['/api/quiz', quizId, 'questions'],
    enabled: !!quiz,
  });

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

  const handleAnswerChange = (value: string) => {
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
  };

  const handleNextQuestion = () => {
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
  };

  const handlePreviousQuestion = () => {
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
  };

  const handleFlagQuestion = () => {
    if (currentQuestion) {
      dispatch({
        type: 'TOGGLE_FLAG',
        payload: { questionId: currentQuestion.id }
      });
    }
  };

  const handleSubmitQuiz = () => {
    // Check if there are flagged questions
    if (state.flaggedQuestions.size > 0 && !state.isReviewingFlagged) {
      // Find indices of flagged questions
      const flaggedIndices = questions
        .map((q, index) => ({ question: q, index }))
        .filter(item => state.flaggedQuestions.has(item.question.id))
        .map(item => item.index);
      
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
  };

  const handleReviewFlaggedQuestions = () => {
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
  };

  const handleSubmitWithoutReview = () => {
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
  };

  const navigateToQuestion = (index: number) => {
    const targetQuestion = questions[index];
    const savedAnswer = targetQuestion ? state.answers[targetQuestion.id] : undefined;
    dispatch({
      type: 'CHANGE_QUESTION',
      payload: {
        index,
        savedAnswer
      }
    });
  };

  const getQuestionStatus = (questionIndex: number) => {
    const question = questions[questionIndex];
    if (!question) return 'unanswered';
    
    if (questionIndex === state.currentQuestionIndex) return 'current';
    if (state.flaggedQuestions.has(question.id)) return 'flagged';
    if (state.answers[question.id] !== undefined) return 'answered';
    return 'unanswered';
  };

  // Error handling for no questions
  if (quiz && questions.length === 0 && !isLoadingQuestions) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="max-w-lg p-6">
          <div className="text-center">
            <i className="fas fa-exclamation-triangle text-4xl text-warning mb-4"></i>
            <h2 className="text-xl font-semibold mb-2">No Questions Available</h2>
            <p className="text-muted-foreground mb-4">
              Unfortunately, there are no questions available for this quiz. This might be because the selected categories don't have any questions in the database yet.
            </p>
            <Button 
              onClick={() => setLocation("/app/dashboard")}
              className="w-full sm:w-auto"
            >
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0 overflow-hidden bg-card">
        {/* Quiz Header */}
        <div className="p-4 sm:p-6 border-b border-border/50 gradient-mesh">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-1">
                <h2 className="text-lg sm:text-xl font-medium text-foreground">{quiz.title}</h2>
                <Badge 
                  variant={quiz.mode === "quiz" ? "default" : "secondary"}
                  className={`text-xs font-medium ${
                    quiz.mode === "quiz" 
                      ? "bg-secondary text-white border-0" 
                      : "bg-primary/20 text-primary border-primary/30"
                  }`}
                >
                  {quiz.mode === "quiz" ? (
                    <>
                      <i className="fas fa-clipboard-check mr-1"></i>
                      Quiz Mode
                    </>
                  ) : (
                    <>
                      <i className="fas fa-brain mr-1"></i>
                      Study Mode
                    </>
                  )}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {quiz.mode === "quiz" 
                  ? "Graded assessment that updates your mastery progress"
                  : "Practice session with immediate feedback"
                }
              </p>
            </div>
            {timeRemaining !== null && (
              <div className="text-center sm:text-right">
                <div className="text-xl sm:text-2xl font-bold text-accent">
                  {formatTime(timeRemaining)}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">Time Remaining</div>
              </div>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-muted-foreground">
              {state.isReviewingFlagged ? (
                <>
                  <Badge variant="outline" className="mr-2 bg-accent/10 text-accent border-accent">
                    <i className="fas fa-flag mr-1"></i>
                    Reviewing Flagged
                  </Badge>
                  Question {state.currentFlaggedIndex + 1} of {state.flaggedQuestionIndices.length}
                </>
              ) : (
                `Question ${state.currentQuestionIndex + 1} of ${questions.length}`
              )}
            </span>
            <span className="text-xs sm:text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2 quiz-progress-smooth" />
        </div>

        {/* Question Content */}
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-medium text-foreground mb-3 sm:mb-4">
              {currentQuestion.text}
            </h3>
            
            {/* Answer Options - Remove key prop to prevent re-mounting */}
            <RadioGroup
              value={state.selectedAnswer !== undefined ? state.selectedAnswer.toString() : ""}
              onValueChange={handleAnswerChange}
              className="space-y-3"
            >
              {(currentQuestion.options as any[]).map((option, index) => {
                // Use option.id if available, otherwise use index
                const optionId = option.id !== undefined ? option.id : index;
                const isSelectedAnswer = state.selectedAnswer === optionId;
                const isCorrectAnswer = optionId === currentQuestion.correctAnswer;
                
                // Simplified className logic with smoother transitions
                let optionClassName = "quiz-option-base";
                
                if (state.showFeedback && isSelectedAnswer) {
                  optionClassName += state.isCorrect ? " quiz-option-correct" : " quiz-option-incorrect";
                } else if (state.showFeedback && isCorrectAnswer && !state.isCorrect) {
                  optionClassName += " quiz-option-correct-reveal";
                } else if (isSelectedAnswer && !state.showFeedback) {
                  optionClassName += " quiz-option-selected";
                } else if (state.selectedAnswer === undefined) {
                  optionClassName += " quiz-option-unanswered";
                } else {
                  optionClassName += " quiz-option-default";
                }

                return (
                  <div 
                    key={`option-${optionId}`}
                    className={optionClassName}
                    onClick={() => !state.showFeedback && state.selectedAnswer === undefined && handleAnswerChange(optionId.toString())}
                    style={{ cursor: state.selectedAnswer !== undefined ? 'default' : 'pointer' }}
                  >
                    <RadioGroupItem 
                      value={optionId.toString()} 
                      id={`question-${currentQuestion.id}-option-${optionId}`}
                      className="quiz-radio-smooth"
                    />
                    <Label 
                      htmlFor={`question-${currentQuestion.id}-option-${optionId}`} 
                      className="text-foreground cursor-pointer flex-1 text-sm sm:text-base"
                    >
                      {option.text}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>

            {/* Immediate Feedback Explanation */}
            {currentQuestion.explanation && (
              <div 
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  state.showFeedback 
                    ? 'max-h-96 opacity-100 mt-4 sm:mt-6' 
                    : 'max-h-0 opacity-0 mt-0'
                }`}
                aria-hidden={!state.showFeedback}
                {...(!state.showFeedback && { inert: '' })}
              >
                <div className={`p-3 sm:p-4 rounded-lg border-2 ${
                  state.isCorrect 
                    ? 'border-success/20 bg-success/5' 
                    : 'border-destructive/20 bg-destructive/5'
                }`}>
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${
                      state.isCorrect ? 'bg-success/20' : 'bg-destructive/20'
                    }`}>
                      <i className={`fas text-xs sm:text-sm ${
                        state.isCorrect 
                          ? 'fa-lightbulb text-success' 
                          : 'fa-info-circle text-destructive'
                      }`}></i>
                    </div>
                    <div className="flex-1">
                      <h5 className={`font-medium mb-1 sm:mb-2 text-sm sm:text-base ${
                        state.isCorrect ? 'text-success' : 'text-destructive'
                      }`}>
                        {state.isCorrect ? 'Why this is correct:' : 'Why this is incorrect:'}
                      </h5>
                      <p className={`text-xs sm:text-sm leading-relaxed ${
                        state.isCorrect ? 'text-success/80' : 'text-destructive/80'
                      }`}>
                        {currentQuestion.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Question Navigation */}
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:justify-between pt-4 sm:pt-6 border-t border-border">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={handlePreviousQuestion}
                disabled={state.isReviewingFlagged ? state.currentFlaggedIndex === 0 : state.currentQuestionIndex === 0}
                size="sm"
                className="flex-1 sm:flex-initial"
              >
                <i className="fas fa-chevron-left mr-1 sm:mr-2"></i>
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
              >
                <i className="fas fa-flag mr-1 sm:mr-2"></i>
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
            >
              {state.isReviewingFlagged ? (
                state.currentFlaggedIndex === state.flaggedQuestionIndices.length - 1 ? (
                  submitQuizMutation.isPending ? 'Submitting...' : 'Finish Review & Submit'
                ) : (
                  <>
                    <span className="hidden sm:inline">Next Flagged</span>
                    <span className="sm:hidden">Next</span>
                    <i className="fas fa-chevron-right ml-1 sm:ml-2"></i>
                  </>
                )
              ) : (
                state.currentQuestionIndex === questions.length - 1 ? (
                  submitQuizMutation.isPending ? 'Submitting...' : 'Submit Quiz'
                ) : (
                  <>
                    <span className="hidden sm:inline">Next</span>
                    <span className="sm:hidden">Next</span>
                    <i className="fas fa-chevron-right ml-1 sm:ml-2"></i>
                  </>
                )
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Question Navigator */}
      <Card className="shadow-lg border-0 p-3 sm:p-4 bg-card">
        <h4 className="font-medium text-foreground mb-3 text-sm sm:text-base">Question Navigator</h4>
        <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5 sm:gap-2">
          {questions.map((_, index) => {
            const status = getQuestionStatus(index);
            let className = "quiz-nav-button ";
            
            switch (status) {
              case 'current':
                className += "quiz-nav-current";
                break;
              case 'answered':
                className += "quiz-nav-answered";
                break;
              case 'flagged':
                className += "quiz-nav-flagged";
                break;
              default:
                className += "quiz-nav-unanswered";
            }
            
            return (
              <button
                key={index}
                onClick={() => navigateToQuestion(index)}
                className={className}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-center gap-3 sm:gap-x-6 mt-3 sm:mt-4 text-[10px] sm:text-xs">
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-primary rounded quiz-legend-dot"></div>
            <span className="text-muted-foreground">Current</span>
          </div>
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-secondary rounded quiz-legend-dot"></div>
            <span className="text-muted-foreground">Answered</span>
          </div>
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-accent rounded quiz-legend-dot"></div>
            <span className="text-muted-foreground">Flagged</span>
          </div>
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-muted rounded quiz-legend-dot"></div>
            <span className="text-muted-foreground">Not Answered</span>
          </div>
        </div>
      </Card>
      
      {/* Flagged Questions Review Dialog */}
      <AlertDialog open={showFlaggedQuestionsDialog} onOpenChange={setShowFlaggedQuestionsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <i className="fas fa-flag text-accent mr-2"></i>
              Review Flagged Questions?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have {state.flaggedQuestions.size} flagged question{state.flaggedQuestions.size !== 1 ? 's' : ''} for review.
              Would you like to review {state.flaggedQuestions.size === 1 ? 'it' : 'them'} before submitting the quiz?
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