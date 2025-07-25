import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatTime } from "@/lib/questions";
import { useToast } from "@/hooks/use-toast";
import type { Question, Quiz } from "@shared/schema";

interface QuizInterfaceProps {
  quizId: number;
}

export default function QuizInterface({ quizId }: QuizInterfaceProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | undefined>();
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const { data: quiz } = useQuery<Quiz>({
    queryKey: ['/api/quiz', quizId],
  });

  const { data: questions = [] } = useQuery<Question[]>({
    queryKey: ['/api/quiz', quizId, 'questions'],
    enabled: !!quiz,
  });

  const submitQuizMutation = useMutation({
    mutationFn: async (quizAnswers: any[]) => 
      apiRequest(`/api/quiz/${quizId}/submit`, {
        method: "POST",
        body: { answers: quizAnswers }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/quiz', quizId] });
      setLocation(`/results/${quizId}`);
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

  // Load saved answer when question changes and reset feedback
  useEffect(() => {
    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion) {
      setSelectedAnswer(answers[currentQuestion.id]);
      setShowFeedback(false);
      setIsCorrect(false);
    }
  }, [currentQuestionIndex, questions, answers]);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  const handleAnswerChange = (value: string) => {
    const answerValue = parseInt(value);
    setSelectedAnswer(answerValue);
    
    if (currentQuestion) {
      const newAnswers = {
        ...answers,
        [currentQuestion.id]: answerValue
      };
      setAnswers(newAnswers);
      
      console.log('Answer selected:', { questionId: currentQuestion.id, answer: answerValue });
      console.log('Updated answers state:', newAnswers);

      // Show immediate feedback
      const correct = answerValue === currentQuestion.correctAnswer;
      setIsCorrect(correct);
      setShowFeedback(true);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleSubmitQuiz();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleFlagQuestion = () => {
    if (currentQuestion) {
      setFlaggedQuestions(prev => {
        const newSet = new Set(prev);
        if (newSet.has(currentQuestion.id)) {
          newSet.delete(currentQuestion.id);
        } else {
          newSet.add(currentQuestion.id);
        }
        return newSet;
      });
    }
  };

  const handleSubmitQuiz = () => {
    const quizAnswers = questions.map(question => {
      const answer = answers[question.id];
      return {
        questionId: question.id,
        answer: answer !== undefined ? answer : 0,
      };
    });

    submitQuizMutation.mutate(quizAnswers);
  };

  const navigateToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const getQuestionStatus = (questionIndex: number) => {
    const question = questions[questionIndex];
    if (!question) return 'unanswered';
    
    if (questionIndex === currentQuestionIndex) return 'current';
    if (flaggedQuestions.has(question.id)) return 'flagged';
    if (answers[question.id] !== undefined) return 'answered';
    return 'unanswered';
  };

  if (!quiz || !currentQuestion) {
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
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="text-xs sm:text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Content */}
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-medium text-foreground mb-3 sm:mb-4">
              {currentQuestion.text}
            </h3>
            
            {/* Answer Options */}
            <RadioGroup
              key={currentQuestion.id} // Force re-render when question changes
              value={selectedAnswer !== undefined ? selectedAnswer.toString() : ""}
              onValueChange={handleAnswerChange}
              className="space-y-3"
            >
              {(currentQuestion.options as any[]).map((option, index) => {
                // Use option.id if available, otherwise use index
                const optionId = option.id !== undefined ? option.id : index;
                const isSelectedAnswer = selectedAnswer === optionId;
                const isCorrectAnswer = optionId === currentQuestion.correctAnswer;
                

                
                let optionClassName = "flex items-start space-x-3 p-3 sm:p-4 border-2 rounded-lg transition-all";
                
                if (showFeedback && isSelectedAnswer) {
                  if (isCorrect) {
                    optionClassName += " border-success bg-success/10";
                  } else {
                    optionClassName += " border-destructive bg-destructive/10";
                  }
                } else if (showFeedback && isCorrectAnswer && !isCorrect) {
                  optionClassName += " border-success/50 bg-success/5";
                } else if (isSelectedAnswer && !showFeedback) {
                  optionClassName += " border-primary bg-primary/10";
                } else {
                  optionClassName += " border-border hover:border-primary/50 hover:bg-primary/5";
                }

                return (
                  <div 
                    key={`${currentQuestion.id}-option-${optionId}`} 
                    className={`${optionClassName} cursor-pointer`}
                    onClick={() => !showFeedback && handleAnswerChange(optionId.toString())}
                  >
                    <RadioGroupItem 
                      value={optionId.toString()} 
                      id={`question-${currentQuestion.id}-option-${optionId}`}
                    />
                    <Label 
                      htmlFor={`question-${currentQuestion.id}-option-${optionId}`} 
                      className="text-foreground cursor-pointer flex-1 text-sm sm:text-base"
                    >
                      {option.text}
                      {showFeedback && isSelectedAnswer && (
                        <div className="mt-2 flex items-center space-x-2">
                          {isCorrect ? (
                            <i className="fas fa-check-circle text-success"></i>
                          ) : (
                            <i className="fas fa-times-circle text-destructive"></i>
                          )}
                          <span className={`text-xs sm:text-sm font-medium ${isCorrect ? 'text-success' : 'text-destructive'}`}>
                            {isCorrect ? 'Correct!' : 'Incorrect'}
                          </span>
                        </div>
                      )}
                      {showFeedback && isCorrectAnswer && !isCorrect && (
                        <div className="mt-2 flex items-center space-x-2">
                          <i className="fas fa-check-circle text-success"></i>
                          <span className="text-xs sm:text-sm font-medium text-success">Correct Answer</span>
                        </div>
                      )}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>

            {/* Immediate Feedback Explanation */}
            {showFeedback && currentQuestion.explanation && (
              <div className={`mt-4 sm:mt-6 p-3 sm:p-4 rounded-lg border-2 ${
                isCorrect 
                  ? 'border-success/20 bg-success/5' 
                  : 'border-destructive/20 bg-destructive/5'
              }`}>
                <div className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${
                    isCorrect ? 'bg-success/20' : 'bg-destructive/20'
                  }`}>
                    <i className={`fas text-xs sm:text-sm ${
                      isCorrect 
                        ? 'fa-lightbulb text-success' 
                        : 'fa-info-circle text-destructive'
                    }`}></i>
                  </div>
                  <div className="flex-1">
                    <h5 className={`font-medium mb-1 sm:mb-2 text-sm sm:text-base ${
                      isCorrect ? 'text-success' : 'text-destructive'
                    }`}>
                      {isCorrect ? 'Why this is correct:' : 'Why this is incorrect:'}
                    </h5>
                    <p className={`text-xs sm:text-sm leading-relaxed ${
                      isCorrect ? 'text-success/80' : 'text-destructive/80'
                    }`}>
                      {currentQuestion.explanation}
                    </p>
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
                disabled={currentQuestionIndex === 0}
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
                className={`flex-1 sm:flex-initial ${
                  flaggedQuestions.has(currentQuestion.id) 
                    ? 'bg-accent text-white hover:bg-accent/90' 
                    : ''
                }`}
              >
                <i className="fas fa-flag mr-1 sm:mr-2"></i>
                <span className="hidden sm:inline">
                  {flaggedQuestions.has(currentQuestion.id) ? 'Unflag' : 'Flag for Review'}
                </span>
                <span className="sm:hidden">
                  {flaggedQuestions.has(currentQuestion.id) ? 'Unflag' : 'Flag'}
                </span>
              </Button>
            </div>
            
            <Button
              onClick={handleNextQuestion}
              disabled={submitQuizMutation.isPending}
              size="sm"
              className="w-full sm:w-auto bg-primary text-white hover:bg-primary/90"
            >
              {currentQuestionIndex === questions.length - 1 ? (
                submitQuizMutation.isPending ? 'Submitting...' : 'Submit Quiz'
              ) : (
                <>
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">Next</span>
                  <i className="fas fa-chevron-right ml-1 sm:ml-2"></i>
                </>
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
            let className = "w-full aspect-square rounded text-xs sm:text-sm font-medium transition-colors flex items-center justify-center ";
            
            switch (status) {
              case 'current':
                className += "bg-primary text-white";
                break;
              case 'answered':
                className += "bg-secondary text-white";
                break;
              case 'flagged':
                className += "bg-accent text-white";
                break;
              default:
                className += "bg-muted text-muted-foreground hover:bg-muted/80";
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
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-primary rounded"></div>
            <span className="text-muted-foreground">Current</span>
          </div>
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-secondary rounded"></div>
            <span className="text-muted-foreground">Answered</span>
          </div>
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-accent rounded"></div>
            <span className="text-muted-foreground">Flagged</span>
          </div>
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-muted rounded"></div>
            <span className="text-muted-foreground">Not Answered</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
