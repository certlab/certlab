import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Quiz, Category } from "@shared/schema";

interface QuizResult {
  questionId: number;
  answer: number;
  correct: boolean;
  correctAnswer: number;
  explanation: string;
}

interface QuizSubmissionResponse {
  quiz: Quiz;
  results: QuizResult[];
  score: number;
  correctAnswers: number;
  totalQuestions: number;
}

interface Question {
  id: number;
  categoryId: number;
  subcategoryId: number;
  text: string;
  options: { id: number; text: string }[];
  correctAnswer: number;
  explanation?: string;
}

export default function Review() {
  const [, params] = useRoute("/review/:id");
  const [, setLocation] = useLocation();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const quizId = parseInt(params?.id || "0");

  const { data: quiz, isLoading: quizLoading } = useQuery<Quiz>({
    queryKey: ['/api/quiz', quizId],
    enabled: !!quizId,
  });

  const { data: questions = [], isLoading: questionsLoading } = useQuery<Question[]>({
    queryKey: ['/api/quiz', quizId, 'questions'],
    enabled: !!quizId,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const isLoading = quizLoading || questionsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="flex items-center justify-center min-h-[24rem]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz || !quiz.completedAt) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-4">Quiz Not Available for Review</h1>
            <p className="text-sm sm:text-base text-muted-foreground">This quiz hasn't been completed yet or doesn't exist.</p>
            <Button 
              onClick={() => setLocation("/")}
              className="mt-4 bg-primary hover:bg-primary/90"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-4">No Questions Found</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Unable to load questions for this quiz.</p>
            <Button 
              onClick={() => setLocation("/")}
              className="mt-4 bg-primary hover:bg-primary/90"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const userAnswers = quiz.answers as { questionId: number; answer: number }[] || [];
  const currentQuestion = questions[currentQuestionIndex];
  const userAnswer = userAnswers.find(a => a.questionId === currentQuestion.id);
  const isCorrect = userAnswer?.answer === currentQuestion.correctAnswer;
  const totalQuestions = quiz.totalQuestions || quiz.questionCount || questions.length;
  const score = quiz.score || 0;
  const correctAnswers = quiz.correctAnswers || 0;

  const getCategoryName = (categoryIds: number[]) => {
    const names = categoryIds
      .map(id => categories.find(cat => cat.id === id)?.name)
      .filter(Boolean);
    return names.length > 0 ? names.join(", ") : "Mixed Quiz";
  };

  const getOptionStatus = (optionId: number) => {
    if (userAnswer?.answer === optionId && isCorrect) return "correct-selected";
    if (userAnswer?.answer === optionId && !isCorrect) return "incorrect-selected";
    if (optionId === currentQuestion.correctAnswer) return "correct";
    return "default";
  };

  const getOptionClasses = (status: string) => {
    const baseClasses = "p-4 rounded-lg border-2 transition-all";
    switch (status) {
      case "correct-selected":
        return `${baseClasses} border-green-500 bg-green-50 text-green-800`;
      case "incorrect-selected":
        return `${baseClasses} border-red-500 bg-red-50 text-red-800`;
      case "correct":
        return `${baseClasses} border-green-500 bg-green-50 text-green-800`;
      default:
        return `${baseClasses} border-gray-200 bg-gray-50 text-gray-700`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Review Answers</h1>
              <p className="text-gray-600">{getCategoryName(quiz.categoryIds as number[])} Practice Quiz</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Overall Score</div>
              <div className="text-2xl font-bold text-primary">{score}%</div>
              <div className="text-sm text-gray-500">{correctAnswers}/{totalQuestions} Correct</div>
            </div>
          </div>
          
          {/* Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
              <span>{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Complete</span>
            </div>
            <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="h-2" />
          </div>
        </div>

        {/* Question Card */}
        <Card className="material-shadow border border-gray-100 mb-6">
          <CardHeader className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium text-gray-900">
                Question {currentQuestionIndex + 1}
              </CardTitle>
              <Badge variant={isCorrect ? "default" : "destructive"}>
                {isCorrect ? "Correct" : "Incorrect"}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            {/* Question Text */}
            <div className="mb-6">
              <p className="text-lg text-gray-900 leading-relaxed">
                {currentQuestion.text}
              </p>
            </div>

            {/* Answer Options */}
            <div className="space-y-3 mb-6">
              {currentQuestion.options.map((option) => {
                const status = getOptionStatus(option.id);
                return (
                  <div key={option.id} className={getOptionClasses(status)}>
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-sm font-bold">
                        {String.fromCharCode(65 + option.id)}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium">{option.text}</span>
                        {status === "correct-selected" && (
                          <span className="ml-2 text-sm">✓ Your answer (Correct)</span>
                        )}
                        {status === "incorrect-selected" && (
                          <span className="ml-2 text-sm">✗ Your answer (Incorrect)</span>
                        )}
                        {status === "correct" && userAnswer?.answer !== option.id && (
                          <span className="ml-2 text-sm">✓ Correct answer</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Explanation */}
            {currentQuestion.explanation && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Explanation</h4>
                <p className="text-blue-800 leading-relaxed">{currentQuestion.explanation}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
          >
            <i className="fas fa-chevron-left mr-2"></i>
            Previous
          </Button>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setLocation(`/results/${quizId}`)}
            >
              <i className="fas fa-chart-bar mr-2"></i>
              View Results
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/")}
            >
              <i className="fas fa-home mr-2"></i>
              Dashboard
            </Button>
          </div>

          <Button
            onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
            disabled={currentQuestionIndex === questions.length - 1}
            className="bg-primary hover:bg-blue-700"
          >
            Next
            <i className="fas fa-chevron-right ml-2"></i>
          </Button>
        </div>

        {/* Question Navigation Grid */}
        <Card className="material-shadow border border-gray-100 mt-6">
          <CardHeader className="p-4 border-b border-gray-100">
            <CardTitle className="text-sm font-medium text-gray-900">Jump to Question</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-10 gap-2">
              {questions.map((question, index) => {
                const questionAnswer = userAnswers.find(a => a.questionId === question.id);
                const questionCorrect = questionAnswer?.answer === question.correctAnswer;
                return (
                  <button
                    key={question.id}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`w-8 h-8 rounded text-xs font-medium transition-all ${
                      index === currentQuestionIndex
                        ? "bg-primary text-white border-2 border-primary"
                        : questionCorrect
                        ? "bg-green-100 text-green-800 border border-green-300 hover:bg-green-200"
                        : "bg-red-100 text-red-800 border border-red-300 hover:bg-red-200"
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}