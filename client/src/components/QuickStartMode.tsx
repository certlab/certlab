import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-provider';
import { useLocation, useNavigate } from 'react-router-dom';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { clientStorage } from '@/lib/client-storage';
import { useToast } from '@/hooks/use-toast';
import { Play, RotateCcw, Brain, Clock, TrendingUp, BookOpen } from 'lucide-react';
import type { Quiz, Category, UserStats } from '@shared/schema';

interface QuickStartModeProps {
  onToggleMode?: () => void;
}

export default function QuickStartMode({ onToggleMode }: QuickStartModeProps) {
  const { user: currentUser, refreshUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: recentQuizzes = [] } = useQuery<Quiz[]>({
    queryKey: queryKeys.user.quizzes(currentUser?.id),
    enabled: !!currentUser,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: queryKeys.categories.all(),
  });

  const { data: stats } = useQuery<UserStats>({
    queryKey: queryKeys.user.stats(currentUser?.id),
    enabled: !!currentUser?.id,
  });

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

      navigate(`/app/quiz/${quiz.id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to create quiz session. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Get the most recent successful quiz format
  const getLastSuccessfulQuiz = () => {
    return recentQuizzes
      .filter((quiz) => quiz.completedAt && (quiz.score || 0) >= 70)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0];
  };

  // Get categories user performs best in
  const getBestPerformingCategories = () => {
    const categoryPerformance = new Map<number, { totalScore: number; count: number }>();

    recentQuizzes
      .filter((quiz) => quiz.completedAt && quiz.score !== undefined)
      .forEach((quiz) => {
        const categoryIds = (quiz.categoryIds as number[]) || [];
        categoryIds.forEach((categoryId: number) => {
          const existing = categoryPerformance.get(categoryId) || { totalScore: 0, count: 0 };
          existing.totalScore += quiz.score!;
          existing.count += 1;
          categoryPerformance.set(categoryId, existing);
        });
      });

    return Array.from(categoryPerformance.entries())
      .map(([categoryId, data]) => ({
        categoryId,
        averageScore: data.totalScore / data.count,
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 2)
      .map((item) => item.categoryId);
  };

  const handleContinueLastSession = () => {
    const lastQuiz = recentQuizzes
      .filter((quiz) => quiz.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0];

    if (lastQuiz && currentUser?.id) {
      createQuizMutation.mutate({
        categoryIds: lastQuiz.categoryIds,
        questionCount: lastQuiz.questionCount || 15,
        title: `Continue Session - ${new Date().toLocaleDateString()}`,
      });
    }
  };

  const handleRepeatSuccessfulFormat = () => {
    const successfulQuiz = getLastSuccessfulQuiz();

    if (successfulQuiz && currentUser?.id) {
      createQuizMutation.mutate({
        categoryIds: successfulQuiz.categoryIds,
        questionCount: successfulQuiz.questionCount || 15,
        title: `Repeat Success - ${new Date().toLocaleDateString()}`,
      });
    }
  };

  const handleHelensRecommendation = () => {
    const bestCategories = getBestPerformingCategories();
    const categoryIds =
      bestCategories.length > 0 ? bestCategories : categories.slice(0, 2).map((c) => c.id);

    if (currentUser?.id) {
      createQuizMutation.mutate({
        categoryIds,
        questionCount: 15,
        title: `Helen's Pick - ${new Date().toLocaleDateString()}`,
      });
    }
  };

  const getCategoryNames = (categoryIds: number[]) => {
    return categoryIds
      .map((id) => categories.find((cat) => cat.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const lastQuiz = recentQuizzes
    .filter((quiz) => quiz.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0];

  const successfulQuiz = getLastSuccessfulQuiz();
  const bestCategories = getBestPerformingCategories();

  return (
    <Card className="card-enhanced">
      <CardHeader className="card-spacious border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-comfortable">
              Quick Start Options
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Jump right into learning based on your history
            </p>
          </div>
          {onToggleMode && (
            <Button variant="outline" size="sm" onClick={onToggleMode} className="text-xs">
              Full Setup
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="card-breathing">
        <div className="space-y-4">
          {/* Continue Last Session */}
          {lastQuiz && (
            <div className="p-4 border border-border/50 rounded-lg bg-muted/30">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Play className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-comfortable">Continue Last Session</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getCategoryNames(lastQuiz.categoryIds as number[])} •{' '}
                    {lastQuiz.questionCount || 15} questions
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      Score: {lastQuiz.score}%
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      Recent
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleContinueLastSession}
                    disabled={createQuizMutation.isPending}
                    className="mt-3"
                  >
                    Continue Learning
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Repeat Successful Format */}
          {successfulQuiz && (
            <div className="p-4 border border-border/50 rounded-lg bg-green-50/50 dark:bg-green-950/20">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <RotateCcw className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-comfortable">Repeat Successful Format</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getCategoryNames(successfulQuiz.categoryIds as number[])} •{' '}
                    {successfulQuiz.questionCount || 15} questions
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant="secondary"
                      className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                    >
                      Score: {successfulQuiz.score}%
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      High Score
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleRepeatSuccessfulFormat}
                    disabled={createQuizMutation.isPending}
                    className="mt-3"
                  >
                    Repeat Success
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Helen's Top Recommendation */}
          <div className="p-4 border border-border/50 rounded-lg bg-purple-50/50 dark:bg-purple-950/20">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-comfortable">Helen's Top Recommendation</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {bestCategories.length > 0
                    ? `${getCategoryNames(bestCategories)} • Based on your strengths`
                    : 'Mixed categories • Balanced learning approach'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    variant="secondary"
                    className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                  >
                    AI Optimized
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <BookOpen className="w-3 h-3 mr-1" />
                    15 Questions
                  </Badge>
                </div>
                <Button
                  size="sm"
                  onClick={handleHelensRecommendation}
                  disabled={createQuizMutation.isPending}
                  className="mt-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  Start AI Session
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          {stats && (
            <div className="p-3 bg-muted/20 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">
                Your Progress: {stats.totalQuizzes} sessions completed • {stats.averageScore}%
                average score
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
