import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-provider';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { storage } from '@/lib/storage-factory';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InsufficientTokensDialog } from '@/components/InsufficientTokensDialog';
import { CertificationSelectionDialog } from '@/components/CertificationSelectionDialog';
import { StudyTimer } from '@/components/StudyTimer';
import { studyMaterials } from '@/data/study-materials';
import { calculateLevelFromPoints, calculatePointsForLevel } from '@/lib/level-utils';
import { POINTS_CONFIG } from '@/lib/achievement-service';
import { PlayCircle, Trophy, Target, History, FileText, ArrowRight, Flame } from 'lucide-react';
import type { UserStats, Quiz, Category } from '@shared/schema';

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
  const { data: _categories = [] } = useQuery<Category[]>({
    queryKey: queryKeys.categories.all(),
  });

  // Get token balance for compact display
  const { data: tokenData } = useQuery({
    queryKey: queryKeys.user.tokenBalance(currentUser?.id),
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

  const formatTimeAgo = (date: string | Date) => {
    const activityDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - activityDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return activityDate.toLocaleDateString();
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

  // Get user's game stats for level display
  const { data: achievements } = useQuery({
    queryKey: queryKeys.user.achievements(currentUser?.id),
    enabled: !!currentUser?.id,
  });

  // Get user badges with proper typing
  interface BadgeData {
    id: number;
    badgeId: number;
    userId: number;
    earnedAt: string;
    progress: number;
    isNotified: boolean;
    badge: {
      id: number;
      name: string;
      description: string;
      icon: string;
      category: string;
      requirement: any;
      color: string;
      rarity: string;
      points: number;
    };
  }

  interface GameStats {
    totalPoints: number;
    currentStreak: number;
    longestStreak: number;
    totalBadgesEarned: number;
    level: number;
    nextLevelPoints: number;
  }

  interface AchievementData {
    badges: BadgeData[];
    gameStats: GameStats;
    newBadges: number;
  }

  const achievementData = achievements as AchievementData | undefined;
  const gameStats = achievementData?.gameStats || {
    totalPoints: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalBadgesEarned: 0,
    level: 1,
    nextLevelPoints: 100,
  };

  const level = calculateLevelFromPoints(gameStats.totalPoints);
  const currentLevelStartPoints = calculatePointsForLevel(level);
  const pointsInCurrentLevel = gameStats.totalPoints - currentLevelStartPoints;
  const pointsNeededForLevel = level * 100;
  const progressToNextLevel = (pointsInCurrentLevel / pointsNeededForLevel) * 100;

  const badges = achievementData?.badges || [];
  const quizMasterBadge = badges.find((b) => b.badge?.name === 'Quiz Master');
  const videoBuffBadge = badges.find((b) => b.badge?.name === 'Video Buff');
  const dailyStreakBadge = badges.find((b) => b.badge?.name === 'Daily Streak');

  // Calculate daily experience for learning velocity chart
  const dailyExperience = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Initialize array for current week (Mon-Sun)
    const dailyXP: number[] = [0, 0, 0, 0, 0, 0, 0];

    // Get the day of week offset (0 = Sunday, 1 = Monday, etc.)
    const todayDayOfWeek = today.getDay();
    const daysToMonday = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1; // Convert Sunday=0 to Sunday=6

    // Calculate Monday of current week
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysToMonday);

    // Calculate points for each completed quiz
    const completedQuizzes = recentQuizzes.filter((q) => q.completedAt && q.score !== null);

    completedQuizzes.forEach((quiz) => {
      const completedDate = new Date(quiz.completedAt!);
      completedDate.setHours(0, 0, 0, 0);

      // Only include quizzes from this week (Monday to Sunday)
      if (completedDate >= monday && completedDate <= today) {
        // Calculate day index (0 = Monday, 6 = Sunday)
        const dayDiff = Math.floor(
          (completedDate.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (dayDiff >= 0 && dayDiff < 7) {
          // Calculate points for this quiz using same logic as achievement service
          let points = POINTS_CONFIG.QUIZ_COMPLETION;

          // Add points for correct answers
          const correctAnswers = quiz.correctAnswers || 0;
          points += correctAnswers * POINTS_CONFIG.CORRECT_ANSWER;

          // Passing bonus
          if (quiz.isPassing || (quiz.score && quiz.score >= 85)) {
            points += POINTS_CONFIG.PASSING_BONUS;
          }

          // Perfect score bonus
          if (quiz.score === 100) {
            points += POINTS_CONFIG.PERFECT_SCORE_BONUS;
          }

          dailyXP[dayDiff] += points;
        }
      }
    });

    return dailyXP;
  }, [recentQuizzes]);

  // Calculate max value for scaling the chart
  const maxDailyXP = Math.max(...dailyExperience, 1); // At least 1 to avoid division by zero

  // Convert to percentages for display
  const dailyXPPercentages = dailyExperience.map((xp) => (xp / maxDailyXP) * 100);

  return (
    <div className="min-h-screen bg-background">
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Activity Timer Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-foreground">Activity Timer</h2>
            <p className="text-xs text-muted-foreground">
              Track any activity with custom labels - work, study, exercise, meditation, or anything
              else
            </p>
          </div>
          <StudyTimer />
        </div>

        {/* Learning Velocity Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">Learning Velocity</h2>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="flex gap-4">
                {/* Y-axis XP scale */}
                <div className="flex flex-col justify-between text-xs text-muted-foreground h-24">
                  <span>{Math.round(maxDailyXP)}</span>
                  <span>{Math.round(maxDailyXP * 0.75)}</span>
                  <span>{Math.round(maxDailyXP * 0.5)}</span>
                  <span>{Math.round(maxDailyXP * 0.25)}</span>
                  <span>0</span>
                </div>
                <div className="flex-1">
                  {/* Simple chart representation */}
                  <div className="relative h-24">
                    {/* Horizontal grid lines to connect y-axis labels to bars */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="border-t border-border/40" />
                      ))}
                    </div>
                    <div className="relative h-full flex items-end justify-between gap-2">
                      {dailyXPPercentages.map((height, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-primary/60 rounded-t relative group"
                          style={{ height: `${height}%`, minHeight: height > 0 ? '2px' : '0' }}
                        >
                          {/* Tooltip showing actual XP value on hover */}
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            {dailyExperience[i]} XP
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Achievements & Progress Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">Achievements & Progress</h2>
            <Button variant="ghost" size="sm" onClick={handleViewProgress} className="gap-2">
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Level Progress Circle */}
              <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-lg">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-muted"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - progressToNextLevel / 100)}`}
                      className="text-primary transition-all duration-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-xs text-muted-foreground">Level</p>
                    <p className="text-3xl font-bold">{level}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Current Level XP: {pointsInCurrentLevel}/{pointsNeededForLevel}
                </p>
              </div>

              {/* Achievement Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Quiz Master */}
                <div className="flex flex-col items-center p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center mb-2">
                    <Trophy className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <p className="text-xs font-semibold text-center mb-1">Quiz Master</p>
                  <p className="text-xs text-muted-foreground text-center">
                    Complete 50 Quizzes - {quizMasterBadge?.badge?.points || 400} XP
                  </p>
                  {quizMasterBadge && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      Earned
                    </Badge>
                  )}
                </div>

                {/* Video Buff */}
                <div className="flex flex-col items-center p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-2">
                    <PlayCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-xs font-semibold text-center mb-1">Video Buff</p>
                  <p className="text-xs text-muted-foreground text-center">
                    Watch 100 Videos - {videoBuffBadge?.badge?.points || 300} XP
                  </p>
                  {videoBuffBadge && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      Earned
                    </Badge>
                  )}
                </div>

                {/* Daily Streak */}
                <div className="flex flex-col items-center p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center mb-2">
                    <Flame className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <p className="text-xs font-semibold text-center mb-1">Daily Streak</p>
                  <p className="text-xs text-muted-foreground text-center">
                    7-Day Streak - {dailyStreakBadge?.badge?.points || 100} XP
                  </p>
                  {dailyStreakBadge && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      Earned
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Marketplace Recommendations Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">Marketplace Recommendations</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/app/marketplace')}
              className="gap-2"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {studyMaterials.slice(0, 4).map((material) => (
              <Card
                key={material.id}
                className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => navigate(`/app/marketplace/${material.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/app/marketplace/${material.id}`);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`View ${material.title} - ${material.type}`}
              >
                <div className="bg-gradient-to-br from-blue-500 to-blue-700 h-32 flex items-center justify-center">
                  {material.type === 'PDF' ? (
                    <FileText className="w-12 h-12 text-white" />
                  ) : (
                    <PlayCircle className="w-12 h-12 text-white" />
                  )}
                </div>
                <CardContent className="p-4">
                  <Badge variant="secondary" className="mb-2 text-xs">
                    {material.type === 'PDF' ? 'PDF Guide' : 'Video Course'}
                  </Badge>
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2">{material.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {material.type === 'PDF'
                      ? 'Downloadable study guide to support your exam prep.'
                      : 'On-demand video lesson to deepen your understanding.'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Recent Activity</h2>
          <Card>
            <CardContent className="p-6">
              {completedQuizzes.length > 0 ? (
                <div className="space-y-3">
                  {completedQuizzes.slice(0, 4).map((quiz) => (
                    <div
                      key={quiz.id}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-blue-600">
                        <Target className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">Completed Quiz "{quiz.title}"</p>
                        {quiz.score && (
                          <p className="text-xs text-muted-foreground">
                            Score: {Math.round(quiz.score)}%
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {formatTimeAgo(quiz.completedAt!)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground mb-4">No recent activity yet</p>
                  <Button onClick={handleStartPractice} size="sm" variant="outline">
                    Start your first quiz
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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
