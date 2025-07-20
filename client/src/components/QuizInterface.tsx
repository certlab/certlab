import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    mutationFn: async (quizAnswers: any[]) => {
      const response = await apiRequest({ method: "POST", endpoint: `/api/quiz/${quizId}/submit`, data: { 
        answers: quizAnswers 
      } });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all user-related queries and the specific quiz query
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
    const quizAnswers = questions.map(question => ({
      questionId: question.id,
      answer: answers[question.id] || 0,
    }));

    console.log('Submitting quiz answers:', quizAnswers);
    console.log('Current answers state:', answers);
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
      <Card className="material-shadow border border-gray-100 overflow-hidden">
        {/* Quiz Header */}
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <h2 className="text-xl font-medium text-gray-900">{quiz.title}</h2>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  quiz.mode === "quiz" 
                    ? "bg-green-100 text-green-800" 
                    : "bg-blue-100 text-blue-800"
                }`}>
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
                </div>
              </div>
              <p className="text-sm text-gray-600">
                {quiz.mode === "quiz" 
                  ? "Graded assessment that updates your mastery progress"
                  : "Practice session with immediate feedback"
                }
              </p>
            </div>
            {timeRemaining !== null && (
              <div className="text-right">
                <div className="text-2xl font-bold text-accent">
                  {formatTime(timeRemaining)}
                </div>
                <div className="text-sm text-gray-500">Time Remaining</div>
              </div>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Content */}
        <CardContent className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {currentQuestion.text}
            </h3>
            
            {/* Answer Options */}
            <RadioGroup
              key={currentQuestion.id} // Force re-render when question changes
              value={selectedAnswer?.toString() || ""}
              onValueChange={handleAnswerChange}
              className="space-y-3"
            >
              {(currentQuestion.options as any[]).map((option, index) => {
                const isSelectedAnswer = selectedAnswer === index;
                const isCorrectAnswer = index === currentQuestion.correctAnswer;
                
                let optionClassName = "flex items-start space-x-3 p-4 border rounded-lg transition-all";
                
                if (showFeedback && isSelectedAnswer) {
                  if (isCorrect) {
                    optionClassName += " border-green-500 bg-green-50";
                  } else {
                    optionClassName += " border-red-500 bg-red-50";
                  }
                } else if (showFeedback && isCorrectAnswer && !isCorrect) {
                  optionClassName += " border-green-400 bg-green-25";
                } else if (isSelectedAnswer && !showFeedback) {
                  optionClassName += " border-primary bg-primary bg-opacity-5";
                } else {
                  optionClassName += " border-gray-200 hover:border-primary hover:bg-primary hover:bg-opacity-5";
                }

                return (
                  <div 
                    key={`${currentQuestion.id}-option-${index}`} 
                    className={`${optionClassName} cursor-pointer`}
                    onClick={() => !showFeedback && handleAnswerChange(index.toString())}
                  >
                    <RadioGroupItem 
                      value={index.toString()} 
                      id={`question-${currentQuestion.id}-option-${index}`}
                    />
                    <Label 
                      htmlFor={`question-${currentQuestion.id}-option-${index}`} 
                      className="text-gray-700 cursor-pointer flex-1"
                    >
                      {option.text}
                      {showFeedback && isSelectedAnswer && (
                        <div className="mt-2 flex items-center space-x-2">
                          {isCorrect ? (
                            <i className="fas fa-check-circle text-green-600"></i>
                          ) : (
                            <i className="fas fa-times-circle text-red-600"></i>
                          )}
                          <span className={`text-sm font-medium ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                            {isCorrect ? 'Correct!' : 'Incorrect'}
                          </span>
                        </div>
                      )}
                      {showFeedback && isCorrectAnswer && !isCorrect && (
                        <div className="mt-2 flex items-center space-x-2">
                          <i className="fas fa-check-circle text-green-600"></i>
                          <span className="text-sm font-medium text-green-700">Correct Answer</span>
                        </div>
                      )}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>

            {/* Immediate Feedback Explanation */}
            {showFeedback && currentQuestion.explanation && (
              <div className={`mt-6 p-4 rounded-lg border ${
                isCorrect 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                    isCorrect ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <i className={`fas text-sm ${
                      isCorrect 
                        ? 'fa-lightbulb text-green-600' 
                        : 'fa-info-circle text-red-600'
                    }`}></i>
                  </div>
                  <div className="flex-1">
                    <h5 className={`font-medium mb-2 ${
                      isCorrect ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {isCorrect ? 'Why this is correct:' : 'Why this is incorrect:'}
                    </h5>
                    <p className={`text-sm leading-relaxed ${
                      isCorrect ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {currentQuestion.explanation}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Question Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              <i className="fas fa-chevron-left mr-2"></i>Previous
            </Button>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={handleFlagQuestion}
                className={flaggedQuestions.has(currentQuestion.id) ? 'bg-accent text-white' : ''}
              >
                <i className="fas fa-flag mr-2"></i>
                {flaggedQuestions.has(currentQuestion.id) ? 'Unflag' : 'Flag for Review'}
              </Button>
            </div>
            
            <Button
              onClick={handleNextQuestion}
              disabled={submitQuizMutation.isPending}
              className="bg-primary text-white hover:bg-blue-700"
            >
              {currentQuestionIndex === questions.length - 1 ? (
                submitQuizMutation.isPending ? 'Submitting...' : 'Submit Quiz'
              ) : (
                <>Next<i className="fas fa-chevron-right ml-2"></i></>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Question Navigator */}
      <Card className="material-shadow border border-gray-100 p-4">
        <h4 className="font-medium text-gray-900 mb-3">Question Navigator</h4>
        <div className="grid grid-cols-10 gap-2">
          {questions.map((_, index) => {
            const status = getQuestionStatus(index);
            let className = "w-8 h-8 rounded text-sm font-medium transition-colors ";
            
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
                className += "bg-gray-200 text-gray-600 hover:bg-gray-300";
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
        <div className="flex items-center justify-center space-x-6 mt-4 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-primary rounded"></div>
            <span className="text-gray-600">Current</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-secondary rounded"></div>
            <span className="text-gray-600">Answered</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-accent rounded"></div>
            <span className="text-gray-600">Flagged</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-200 rounded"></div>
            <span className="text-gray-600">Not Answered</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
