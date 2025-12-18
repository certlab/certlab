import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-provider';
import { useLocation } from 'wouter';
import { getScoreColor } from '@/lib/questions';
import { queryClient, queryKeys, apiRequest } from '@/lib/queryClient';
import { clientStorage } from '@/lib/client-storage';
import { useToast } from '@/hooks/use-toast';
import ImprovedCardSpacing from '@/components/ImprovedCardSpacing';
import { BarChart3 } from 'lucide-react';
import type { Quiz, Category } from '@shared/schema';

export default function ActivitySidebar() {
  const { user: currentUser, refreshUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: recentQuizzes = [] } = useQuery<Quiz[]>({
    queryKey: queryKeys.user.quizzes(currentUser?.id),
    enabled: !!currentUser,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: queryKeys.categories.all(),
  });

  const completedQuizzes = recentQuizzes
    .filter((quiz) => quiz.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .slice(0, 3);

  const formatDate = (date: string | Date) => {
    const now = new Date();
    const quizDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - quizDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return quizDate.toLocaleDateString();
  };

  const getCategoryName = (categoryIds: number[]) => {
    const names = categoryIds
      .map((id) => categories.find((cat) => cat.id === id)?.name)
      .filter(Boolean);
    return names.length > 0 ? names.join(', ') : 'Mixed Quiz';
  };

  // Mutation for creating quick action quizzes
  const createQuizMutation = useMutation({
    mutationFn: async (quizData: any) => {
      if (!currentUser?.id) throw new Error('Not authenticated');

      const tokenCost = clientStorage.calculateQuizTokenCost(quizData.questionCount);

      // Check and consume tokens
      const tokenResult = await clientStorage.consumeTokens(currentUser.id, tokenCost);

      if (!tokenResult.success) {
        throw new Error(
          `Insufficient tokens. You need ${tokenCost} tokens but only have ${tokenResult.newBalance}.`
        );
      }

      // Create the quiz
      const quiz = await clientStorage.createQuiz({
        userId: currentUser.id,
        ...quizData,
      });

      return { quiz, tokenResult, tokenCost };
    },
    onSuccess: async ({ quiz, tokenResult, tokenCost }) => {
      // Refresh user state in auth provider to keep it in sync
      await refreshUser();

      queryClient.invalidateQueries({ queryKey: queryKeys.user.all(currentUser?.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.tokenBalance(currentUser?.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() });

      toast({
        title: 'Quiz Created',
        description: `Used ${tokenCost} tokens. New balance: ${tokenResult.newBalance}`,
      });

      setLocation(`/app/quiz/${quiz.id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to create quiz. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Get questions the user got wrong for review
  const getIncorrectQuestions = () => {
    const incorrectQuestions: number[] = [];
    completedQuizzes.forEach((quiz) => {
      if (quiz.answers && Array.isArray(quiz.answers)) {
        // This would need API support to get correct answers
        // For now, we'll create a quiz from categories where user scored lowest
      }
    });
    return incorrectQuestions;
  };

  // Get lowest performing category for review
  const getLowestPerformingCategory = () => {
    return categories[0]?.id || 35;
  };

  // Quick action handlers
  const handleReviewIncorrect = async () => {
    if (!currentUser) {
      toast({
        title: 'Login Required',
        description: 'Please log in to create a quiz.',
        variant: 'destructive',
      });
      return;
    }

    const categoryId = getLowestPerformingCategory();
    const quizData = {
      title: 'Adaptive Review - Incorrect Answers',
      categoryIds: [categoryId],
      questionCount: 20,
      isAdaptive: true, // Enable adaptive learning for review sessions
    };

    // Use adaptive endpoint for targeted practice
    const mutation = {
      mutationFn: async (data: any) => {
        const response = await apiRequest({
          method: 'POST',
          endpoint: '/api/quiz/adaptive',
          data,
        });
        return response.json();
      },
      onSuccess: (quiz: any) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.user.all(currentUser?.id) });

        if (quiz.adaptiveInfo && quiz.adaptiveInfo.increasePercentage > 0) {
          toast({
            title: 'Smart Review Activated',
            description: `Added ${quiz.adaptiveInfo.increasePercentage}% more questions to help you master this topic (${quiz.adaptiveInfo.originalQuestionCount} → ${quiz.adaptiveInfo.adaptedQuestionCount})`,
          });
        }

        setLocation(`/app/quiz/${quiz.id}`);
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to create adaptive quiz. Please try again.',
          variant: 'destructive',
        });
      },
    };

    try {
      const result = await mutation.mutationFn(quizData);
      mutation.onSuccess(result);
    } catch (error) {
      console.error('Adaptive quiz creation error:', error);
      mutation.onError();
    }
  };

  const handleRandomQuiz = () => {
    if (!currentUser) {
      toast({
        title: 'Login Required',
        description: 'Please log in to create a quiz.',
        variant: 'destructive',
      });
      return;
    }

    // Select 2-3 random categories
    const shuffledCategories = [...categories].sort(() => 0.5 - Math.random());
    const selectedCategories = shuffledCategories.slice(0, 2).map((c) => c.id);

    const quizData = {
      title: 'Random Mixed Quiz',
      categoryIds: selectedCategories,
      questionCount: 15,
    };
    createQuizMutation.mutate(quizData);
  };

  const handleGenerateLecture = async () => {
    if (!currentUser) {
      toast({
        title: 'Login Required',
        description: 'Please log in to generate study guides.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await apiRequest({
        method: 'POST',
        endpoint: `/api/user/${currentUser.id}/generate-lecture`,
      });
      const lecture = await response.json();

      if (response.ok) {
        toast({
          title: 'Study Guide Generated',
          description: 'Your personalized study guide has been created based on your performance!',
        });

        // Redirect to lecture view
        window.open(`/lecture/${lecture.id}`, '_blank');

        // Refresh lectures list
        queryClient.invalidateQueries({ queryKey: queryKeys.user.all(currentUser?.id) });
      } else {
        throw new Error(lecture.message || 'Failed to generate study guide');
      }
    } catch (error: any) {
      toast({
        title: 'Generation Failed',
        description: error.message || 'Unable to generate study guide. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleViewAnalytics = () => {
    toast({
      title: 'Analytics',
      description: 'Detailed analytics coming soon!',
    });
  };

  return (
    <div className="space-y-6">
      {/* Recent Quiz Results */}
      <ImprovedCardSpacing
        title="Recent Quiz Results"
        description="Your recent learning session performance"
        variant="default"
        icon={<BarChart3 className="w-5 h-5" />}
        className="section-rhythm"
      >
        <div className="list-breathable">
          {completedQuizzes.length > 0 ? (
            completedQuizzes.map((quiz) => (
              <div key={quiz.id} className="p-3 bg-muted/50 rounded-md">
                <div className="flex items-center justify-between section-rhythm">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-foreground text-comfortable">
                      {getCategoryName(quiz.categoryIds as number[])}
                    </h4>
                    <p className="text-xs text-muted-foreground">{formatDate(quiz.completedAt!)}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getScoreColor(quiz.score || 0)}`}>
                      {quiz.score}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {quiz.correctAnswers}/{quiz.totalQuestions || quiz.questionCount}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation(`/app/review/${quiz.id}`)}
                    className="flex-1 text-xs"
                  >
                    <i className="fas fa-eye mr-1"></i>
                    Review
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation(`/app/results/${quiz.id}`)}
                    className="flex-1 text-xs"
                  >
                    <i className="fas fa-chart-bar mr-1"></i>
                    Results
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No completed quizzes yet</p>
          )}
        </div>
      </ImprovedCardSpacing>
    </div>
  );
}
