import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-provider';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { clientStorage } from '@/lib/client-storage';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TokenBalance } from '@/components/TokenBalance';
import { InsufficientTokensDialog } from '@/components/InsufficientTokensDialog';
import { CertificationSelectionDialog } from '@/components/CertificationSelectionDialog';
import {
  BookOpen,
  PlayCircle,
  TrendingUp,
  Clock,
  Trophy,
  Target,
  History,
  ChartBar,
  Crown,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import type { UserStats, Quiz, Category } from '@shared/schema';

export default function Dashboard() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showInsufficientTokensDialog, setShowInsufficientTokensDialog] = useState(false);
  const [showCertificationDialog, setShowCertificationDialog] = useState(false);
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
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

  // Get completed quizzes for recent activity
  const completedQuizzes = recentQuizzes
    .filter((quiz) => quiz.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .slice(0, 5);

  const createQuickPractice = async (categoryId: number, categoryName: string) => {
    if (!currentUser?.id) return;

    setIsCreatingQuiz(true);
    const questionCount = 10;
    const tokenCost = clientStorage.calculateQuizTokenCost(questionCount);

    try {
      // Check and consume tokens
      const tokenResult = await clientStorage.consumeTokens(currentUser.id, tokenCost);

      if (!tokenResult.success) {
        // Save the category info for retry after adding tokens
        setPendingCategoryId(categoryId);
        setPendingCategoryName(categoryName);
        // Show dialog instead of toast
        const balance = await clientStorage.getUserTokenBalance(currentUser.id);
        setCurrentTokenBalance(balance);
        setRequiredTokens(tokenCost);
        setShowCertificationDialog(false);
        setShowInsufficientTokensDialog(true);
        return;
      }

      // Create the quiz with selected category
      const quiz = await clientStorage.createQuiz({
        userId: currentUser.id,
        categoryIds: [categoryId],
        questionCount,
        title: `${categoryName} Practice - ${new Date().toLocaleDateString()}`,
      });

      if (quiz?.id) {
        // Invalidate cache to update all relevant queries
        // No need to refresh the entire user object - query invalidation is sufficient
        queryClient.invalidateQueries({ queryKey: queryKeys.user.all(currentUser.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.user.tokenBalance(currentUser.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() });

        toast({
          title: 'Quiz Created',
          description: `Used ${tokenCost} tokens. New balance: ${tokenResult.newBalance}`,
        });

        setShowCertificationDialog(false);
        navigate(`/app/quiz/${quiz.id}`);
      } else {
        toast({
          title: 'Quiz Creation Failed',
          description: 'An error occurred while creating your quiz. Please try again.',
          variant: 'destructive',
        });
        setShowCertificationDialog(false);
      }
    } finally {
      setIsCreatingQuiz(false);
    }
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
        {/* Welcome Card - CLAY OS Style */}
        <Card className="mb-8 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0 shadow-lg">
          <CardContent className="p-8">
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {currentUser?.firstName || currentUser?.lastName || 'Student'}
            </h1>
            <p className="text-primary-foreground/90 mb-6">
              You're on a {stats?.studyStreak || 0} day streak! Keep it up.
            </p>
            <div className="flex gap-8 flex-wrap">
              <div>
                <p className="text-sm text-primary-foreground/80 mb-1">DAILY GOAL</p>
                <p className="text-4xl font-bold">
                  {stats?.totalQuizzes && stats.totalQuizzes > 0
                    ? Math.min(Math.round((stats.totalQuizzes / 10) * 100), 100)
                    : 0}
                  %
                </p>
              </div>
              <div>
                <p className="text-sm text-primary-foreground/80 mb-1">STUDY TIME</p>
                <p className="text-4xl font-bold">
                  {stats?.totalQuizzes ? (stats.totalQuizzes * 0.45).toFixed(1) : '0.0'}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Jump Back In Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">Jump Back In</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentQuizzes.slice(0, 3).map((quiz) => (
              <Card
                key={quiz.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() =>
                  quiz.completedAt
                    ? navigate(`/app/results/${quiz.id}`)
                    : navigate(`/app/quiz/${quiz.id}`)
                }
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 mb-4 mx-auto">
                    <PlayCircle className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-center mb-2 line-clamp-2">
                    {quiz.title || 'Practice Quiz'}
                  </h3>
                  {quiz.completedAt ? (
                    <div className="w-full bg-secondary rounded-full h-2 mb-1">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${quiz.score || 0}%` }}
                      ></div>
                    </div>
                  ) : (
                    <div className="w-full bg-secondary rounded-full h-2 mb-1">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '50%' }}></div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {recentQuizzes.length === 0 && (
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={handleStartPractice}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 mb-4 mx-auto">
                    <PlayCircle className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-center mb-2">Start Your First Quiz</h3>
                  <div className="w-full bg-secondary rounded-full h-2 mb-1">
                    <div className="bg-primary h-2 rounded-full" style={{ width: '0%' }}></div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Primary Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handleStartPractice}
                  className="w-full justify-start text-xs sm:text-sm"
                  size="lg"
                  data-testid="start-quick-practice"
                >
                  <PlayCircle className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  <span className="hidden sm:inline">Start Quick Practice</span>
                  <span className="sm:hidden">Quick Practice</span>
                  <span className="ml-auto text-xs opacity-80 shrink-0">10 questions</span>
                </Button>

                <Button
                  onClick={handleContinueLearning}
                  variant="outline"
                  className="w-full justify-start text-xs sm:text-sm"
                  size="lg"
                  data-testid="continue-learning"
                >
                  <BookOpen className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  <span className="hidden sm:inline">Continue Learning</span>
                  <span className="sm:hidden">Continue</span>
                  {recentQuizzes.find((q) => !q.completedAt) && (
                    <span className="ml-auto text-xs opacity-80 shrink-0">Resume</span>
                  )}
                </Button>

                <Button
                  onClick={handleViewProgress}
                  variant="outline"
                  className="w-full justify-start text-xs sm:text-sm"
                  size="lg"
                  data-testid="view-progress"
                >
                  <ChartBar className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  <span>View Progress</span>
                  <span className="ml-auto text-xs opacity-80 shrink-0 hidden sm:inline">
                    Achievements
                  </span>
                </Button>
              </CardContent>
            </Card>

            {/* Token Balance */}
            <TokenBalance />

            {/* Key Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Target className="h-5 w-5 text-muted-foreground" />
                    <span className="text-2xl font-bold">{stats?.totalQuizzes || 0}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Total Quizzes</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    <span className="text-2xl font-bold">{stats?.studyStreak || 0}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Day Streak</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Trophy className="h-5 w-5 text-muted-foreground" />
                    <span className="text-2xl font-bold">{getOverallMastery()}%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Overall Mastery</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span
                      className={`text-2xl font-bold ${getLastQuizScore() ? getScoreColor(getLastQuizScore()!) : ''}`}
                    >
                      {getLastQuizScore() ? `${getLastQuizScore()}%` : 'N/A'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Last Quiz Score</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <Card>
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
                    <p className="mb-4">No completed quizzes yet</p>
                    <Button onClick={handleStartPractice} variant="outline" size="sm">
                      Start your first quiz
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <CertificationSelectionDialog
        open={showCertificationDialog}
        onOpenChange={setShowCertificationDialog}
        onStartQuiz={handleCertificationSelected}
        isLoading={isCreatingQuiz}
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
