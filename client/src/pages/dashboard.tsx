import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-provider';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { storage } from '@/lib/storage-factory';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InsufficientTokensDialog } from '@/components/InsufficientTokensDialog';
import { CertificationSelectionDialog } from '@/components/CertificationSelectionDialog';
import SmartRecommendations from '@/components/SmartRecommendations';
import ReadinessScoreCard from '@/components/ReadinessScoreCard';
import LearningVelocityCard from '@/components/LearningVelocityCard';
import {
  BookOpen,
  PlayCircle,
  TrendingUp,
  Clock,
  Trophy,
  Target,
  History,
  ChartBar,
  Sparkles,
  ArrowRight,
  Coins,
  Plus,
} from 'lucide-react';
import type { UserStats, Quiz, Category } from '@shared/schema';
import type {
  StudyRecommendation,
  ReadinessScore,
  LearningVelocity,
} from '@/lib/smart-recommendations';

export default function Dashboard() {
  const { user: currentUser, refreshUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showInsufficientTokensDialog, setShowInsufficientTokensDialog] = useState(false);
  const [showCertificationDialog, setShowCertificationDialog] = useState(false);
  const [requiredTokens, setRequiredTokens] = useState(0);
  const [currentTokenBalance, setCurrentTokenBalance] = useState(0);
  const [pendingCategoryId, setPendingCategoryId] = useState<number | null>(null);
  const [pendingCategoryName, setPendingCategoryName] = useState<string>('');

  // Get user stats
  const { data: stats } = useQuery<UserStats>({
    queryKey: queryKeys.user.stats(currentUser?.id),
    enabled: !!currentUser?.id,
  });

  // Get recent quizzes
  const { data: recentQuizzes = [] } = useQuery<Quiz[]>({
    queryKey: queryKeys.user.quizzes(currentUser?.id),
    enabled: !!currentUser,
  });

  // Get categories to avoid hardcoding category IDs
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: queryKeys.categories.all(),
  });

  // Get token balance for compact display
  const { data: tokenData } = useQuery({
    queryKey: queryKeys.user.tokenBalance(currentUser?.id),
    enabled: !!currentUser?.id,
  });

  // Get smart recommendations
  const { data: recommendations = [] } = useQuery<StudyRecommendation[]>({
    queryKey: ['recommendations', currentUser?.id],
    queryFn: () => storage.getStudyRecommendations(currentUser!.id),
    enabled: !!currentUser?.id,
  });

  // Get readiness score
  const { data: readinessScore } = useQuery<ReadinessScore>({
    queryKey: ['readinessScore', currentUser?.id],
    queryFn: () => storage.getReadinessScore(currentUser!.id),
    enabled: !!currentUser?.id,
  });

  // Get learning velocity
  const { data: learningVelocity } = useQuery<LearningVelocity>({
    queryKey: ['learningVelocity', currentUser?.id],
    queryFn: () => storage.getLearningVelocity(currentUser!.id),
    enabled: !!currentUser?.id,
  });

  // Get completed quizzes for recent activity
  const completedQuizzes = recentQuizzes
    .filter((quiz) => quiz.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .slice(0, 5);

  // Mutation for creating quick practice quizzes
  const createQuizMutation = useMutation({
    mutationFn: async ({
      categoryId,
      categoryName,
    }: {
      categoryId: number;
      categoryName: string;
    }) => {
      if (!currentUser?.id) throw new Error('Not authenticated');

      const questionCount = 10;
      const tokenCost = storage.calculateQuizTokenCost(questionCount);

      // Check and consume tokens
      const tokenResult = await storage.consumeTokens(currentUser.id, tokenCost);

      if (!tokenResult.success) {
        // Save the category info for retry after adding tokens
        setPendingCategoryId(categoryId);
        setPendingCategoryName(categoryName);
        const balance = await storage.getUserTokenBalance(currentUser.id);
        setCurrentTokenBalance(balance);
        setRequiredTokens(tokenCost);
        setShowCertificationDialog(false);
        setShowInsufficientTokensDialog(true);
        throw new Error('Insufficient tokens');
      }

      // Create the quiz with selected category
      const quiz = await storage.createQuiz({
        userId: currentUser.id,
        categoryIds: [categoryId],
        questionCount,
        title: `${categoryName} Practice - ${new Date().toLocaleDateString()}`,
      });

      if (!quiz?.id) {
        throw new Error('Failed to create quiz');
      }

      return { quiz, tokenResult, tokenCost };
    },
    onSuccess: async ({ quiz, tokenResult, tokenCost }) => {
      // Refresh user state in auth provider to keep it in sync
      await refreshUser();

      // Invalidate tokenBalance query to refetch updated balance from storage
      await queryClient.invalidateQueries({
        queryKey: queryKeys.user.tokenBalance(currentUser?.id),
      });

      toast({
        title: 'Quiz Created',
        description: `Used ${tokenCost} tokens. New balance: ${tokenResult.newBalance}`,
      });

      setShowCertificationDialog(false);
      navigate(`/app/quiz/${quiz.id}`);
    },
    onError: (error: any) => {
      // Don't show error toast for insufficient tokens (dialog is shown instead)
      if (error?.message === 'Insufficient tokens') {
        return;
      }

      toast({
        title: 'Quiz Creation Failed',
        description:
          error?.message || 'An error occurred while creating your quiz. Please try again.',
        variant: 'destructive',
      });
      setShowCertificationDialog(false);
    },
  });

  const createQuickPractice = (categoryId: number, categoryName: string) => {
    if (!currentUser?.id) return;
    createQuizMutation.mutate({ categoryId, categoryName });
  };

  const handleStartPractice = () => {
    if (!currentUser?.id) {
      toast({
        title: 'Login Required',
        description: 'Please log in to start practicing.',
        variant: 'destructive',
      });
      return;
    }

    // Show the certification selection dialog
    setShowCertificationDialog(true);
  };

  const showQuizError = (error: unknown) => {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to create practice session';
    toast({
      title: 'Error',
      description: errorMessage,
      variant: 'destructive',
    });
  };

  const handleCertificationSelected = async (categoryId: number, categoryName: string) => {
    try {
      await createQuickPractice(categoryId, categoryName);
    } catch (error: unknown) {
      showQuizError(error);
    }
  };

  const handleTokensAdded = async () => {
    // Retry the quiz creation after tokens are added with the pending category
    if (pendingCategoryId && pendingCategoryName) {
      try {
        await createQuickPractice(pendingCategoryId, pendingCategoryName);
      } catch (error: unknown) {
        showQuizError(error);
        // Reopen certification dialog to allow retry
        setShowCertificationDialog(true);
      } finally {
        setPendingCategoryId(null);
        setPendingCategoryName('');
      }
    }
  };

  const handleContinueLearning = () => {
    // Find the most recent incomplete quiz or start a new one
    const incompleteQuiz = recentQuizzes.find((quiz) => !quiz.completedAt);
    if (incompleteQuiz) {
      navigate(`/app/quiz/${incompleteQuiz.id}`);
    } else {
      handleStartPractice();
    }
  };

  const handleViewProgress = () => {
    navigate('/app/achievements');
  };

  const formatDate = (date: string | Date) => {
    const quizDate = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - quizDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return quizDate.toLocaleDateString();
  };

  // WCAG AA compliant score colors with dark mode variants
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 80) return 'text-blue-600 dark:text-blue-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getLastQuizScore = () => {
    if (completedQuizzes.length === 0) return null;
    const lastQuiz = completedQuizzes[0];
    if (!lastQuiz.score) return null;
    return Math.round(lastQuiz.score);
  };

  const getOverallMastery = () => {
    if (!stats) return 0;
    if (stats.totalQuizzes === 0) return 0;
    return Math.round(stats.averageScore || 0);
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Condensed Welcome Hero */}
        <Card className="mb-6 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0 shadow-lg">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-1">
                  Welcome back, {currentUser?.firstName || currentUser?.lastName || 'Student'}
                </h1>
                <p className="text-primary-foreground/90 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  You're on a {stats?.studyStreak || 0} day streak! Keep it up.
                </p>
              </div>
              <div className="flex gap-4 sm:gap-6">
                <div>
                  <p className="text-xs text-primary-foreground/80 mb-1">DAILY GOAL</p>
                  <p className="text-2xl sm:text-3xl font-bold">
                    {stats?.totalQuizzes && stats.totalQuizzes > 0
                      ? Math.min(Math.round((stats.totalQuizzes / 10) * 100), 100)
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Primary Actions Section - Most Important */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Start Learning
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              onClick={handleStartPractice}
              className="h-24 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
              size="lg"
              data-testid="start-quick-practice"
            >
              <div className="flex flex-col items-center gap-2">
                <PlayCircle className="h-8 w-8" />
                <div>
                  <div>Start Quick Practice</div>
                  <div className="text-xs font-normal opacity-90">10 questions</div>
                </div>
              </div>
            </Button>

            <Button
              onClick={handleContinueLearning}
              variant="outline"
              className="h-24 text-base font-semibold border-2 hover:border-primary hover:bg-primary/5 transition-all"
              size="lg"
              data-testid="continue-learning"
            >
              <div className="flex flex-col items-center gap-2">
                <BookOpen className="h-8 w-8" />
                <div>
                  <div>Continue Learning</div>
                  {recentQuizzes.find((q) => !q.completedAt) && (
                    <div className="text-xs font-normal text-muted-foreground">Resume quiz</div>
                  )}
                </div>
              </div>
            </Button>

            <Button
              onClick={handleViewProgress}
              variant="outline"
              className="h-24 text-base font-semibold border-2 hover:border-primary hover:bg-primary/5 transition-all"
              size="lg"
              data-testid="view-progress"
            >
              <div className="flex flex-col items-center gap-2">
                <Trophy className="h-8 w-8" />
                <div>
                  <div>View Progress</div>
                  <div className="text-xs font-normal text-muted-foreground">Achievements</div>
                </div>
              </div>
            </Button>
          </div>
        </div>

        {/* At-A-Glance Stats Grid */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <ChartBar className="h-5 w-5 text-primary" />
            Your Stats
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-3xl font-bold">{stats?.totalQuizzes || 0}</span>
                </div>
                <p className="text-sm text-muted-foreground">Total Quizzes</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <span className="text-3xl font-bold">{stats?.studyStreak || 0}</span>
                </div>
                <p className="text-sm text-muted-foreground">Day Streak</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Trophy className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-3xl font-bold">{getOverallMastery()}%</span>
                </div>
                <p className="text-sm text-muted-foreground">Overall Mastery</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <span
                    className={`text-3xl font-bold ${getLastQuizScore() ? getScoreColor(getLastQuizScore()!) : 'text-muted-foreground'}`}
                  >
                    {getLastQuizScore() ? `${getLastQuizScore()}%` : 'N/A'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Last Quiz Score</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Smart Recommendations Section */}
        {(recommendations.length > 0 || readinessScore || learningVelocity) && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Smart Insights
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Smart Recommendations */}
              {recommendations.length > 0 && (
                <div className="lg:col-span-2">
                  <SmartRecommendations recommendations={recommendations} maxRecommendations={3} />
                </div>
              )}

              {/* Readiness Score and Learning Velocity in sidebar */}
              <div className="space-y-4">
                {readinessScore && <ReadinessScoreCard readinessScore={readinessScore} />}
                {learningVelocity && <LearningVelocityCard learningVelocity={learningVelocity} />}
              </div>
            </div>
          </div>
        )}

        {/* Two-Column Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Recent Activity */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {completedQuizzes.length > 0 ? (
                <div className="space-y-3" role="list" aria-label="Recent completed quizzes">
                  {completedQuizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/app/results/${quiz.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/app/results/${quiz.id}`);
                        }
                      }}
                      role="listitem"
                      tabIndex={0}
                      aria-label={`${quiz.title}, ${formatDate(quiz.completedAt!)}, Score: ${quiz.score ? `${Math.round(quiz.score)}%` : 'Not available'}, ${quiz.questionCount} questions`}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{quiz.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(quiz.completedAt!)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-bold text-lg ${quiz.score ? getScoreColor(quiz.score) : ''}`}
                        >
                          {quiz.score ? `${Math.round(quiz.score)}%` : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {quiz.questionCount} questions
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <PlayCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="mb-2 font-medium">No completed quizzes yet</p>
                  <p className="text-sm mb-4">Start your learning journey today!</p>
                  <Button onClick={handleStartPractice} variant="outline" size="sm">
                    Start your first quiz
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Links & Progress */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5" />
                Quick Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => navigate('/app/achievements')}
                variant="ghost"
                className="w-full justify-start h-auto p-4 hover:bg-accent"
              >
                <Trophy className="h-5 w-5 mr-3 text-yellow-600 dark:text-yellow-400" />
                <div className="text-left">
                  <div className="font-medium">Achievements</div>
                  <div className="text-xs text-muted-foreground">View your badges and progress</div>
                </div>
              </Button>

              <Button
                onClick={() => navigate('/app/practice-tests')}
                variant="ghost"
                className="w-full justify-start h-auto p-4 hover:bg-accent"
              >
                <Target className="h-5 w-5 mr-3 text-blue-600 dark:text-blue-400" />
                <div className="text-left">
                  <div className="font-medium">Practice Tests</div>
                  <div className="text-xs text-muted-foreground">
                    Full-length certification exams
                  </div>
                </div>
              </Button>

              <Button
                onClick={() => navigate('/app/question-bank')}
                variant="ghost"
                className="w-full justify-start h-auto p-4 hover:bg-accent"
              >
                <BookOpen className="h-5 w-5 mr-3 text-green-600 dark:text-green-400" />
                <div className="text-left">
                  <div className="font-medium">Question Bank</div>
                  <div className="text-xs text-muted-foreground">Browse all study questions</div>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Compact Token Balance Footer */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Coins className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Token Balance</p>
                  <p className="text-xs text-muted-foreground">
                    {(tokenData as { balance: number } | undefined)?.balance ?? 0} tokens available
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate('/app/wallet')}
                variant="outline"
                size="sm"
                className="whitespace-nowrap"
              >
                <Plus className="h-4 w-4 mr-2" />
                Manage Tokens
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <CertificationSelectionDialog
        open={showCertificationDialog}
        onOpenChange={setShowCertificationDialog}
        onStartQuiz={handleCertificationSelected}
        isLoading={createQuizMutation.isPending}
      />

      <InsufficientTokensDialog
        open={showInsufficientTokensDialog}
        onOpenChange={setShowInsufficientTokensDialog}
        requiredTokens={requiredTokens}
        currentBalance={currentTokenBalance}
        onTokensAdded={handleTokensAdded}
      />
    </div>
  );
}
