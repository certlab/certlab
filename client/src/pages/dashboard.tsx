import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-provider";
import { queryClient, queryKeys } from "@/lib/queryClient";
import { clientStorage } from "@/lib/client-storage";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TokenBalance } from "@/components/TokenBalance";
import { InsufficientTokensDialog } from "@/components/InsufficientTokensDialog";
import { getPersonalizedMessage } from "@/data/motivational-messages";
import { 
  BookOpen, 
  PlayCircle, 
  TrendingUp, 
  Clock,
  Trophy,
  Target,
  Calendar,
  History,
  ChartBar,
  Crown,
  Sparkles,
  ArrowRight
} from "lucide-react";
import type { UserStats, Quiz, Category } from "@shared/schema";

export default function Dashboard() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showInsufficientTokensDialog, setShowInsufficientTokensDialog] = useState(false);
  const [requiredTokens, setRequiredTokens] = useState(0);
  const [currentTokenBalance, setCurrentTokenBalance] = useState(0);

  // Get user stats
  const { data: stats } = useQuery<UserStats>({
    queryKey: queryKeys.user.stats(currentUser?.id),
    enabled: !!currentUser?.id,
  });

  // Get personalized motivational message based on user stats
  // useMemo ensures the message is stable and only recalculated when stats change
  const motivationalMessage = useMemo(() => getPersonalizedMessage(stats), [stats]);

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
    .filter(quiz => quiz.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .slice(0, 5);

  // Get current date and time
  const getCurrentDateTime = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const createQuickPractice = async () => {
    if (!currentUser?.id) return;

    const questionCount = 10;
    const tokenCost = clientStorage.calculateQuizTokenCost(questionCount);
    
    // Check and consume tokens
    const tokenResult = await clientStorage.consumeTokens(currentUser.id, tokenCost);
    
    if (!tokenResult.success) {
      // Show dialog instead of toast
      const balance = await clientStorage.getUserTokenBalance(currentUser.id);
      setCurrentTokenBalance(balance);
      setRequiredTokens(tokenCost);
      setShowInsufficientTokensDialog(true);
      return;
    }

    // Create the quiz with first available category
    if (categories.length === 0) {
      throw new Error('No categories available. Please add categories first.');
    }
    
    const firstCategoryId = categories[0].id;
    const quiz = await clientStorage.createQuiz({
      userId: currentUser.id,
      categoryIds: [firstCategoryId],
      questionCount,
      title: `Practice Session - ${new Date().toLocaleDateString()}`,
    });

    if (quiz?.id) {
      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all(currentUser.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.tokenBalance(currentUser.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() });
      
      toast({
        title: "Quiz Created",
        description: `Used ${tokenCost} tokens. New balance: ${tokenResult.newBalance}`,
      });
      
      setLocation(`/app/quiz/${quiz.id}`);
    }
  };

  const handleStartPractice = async () => {
    if (!currentUser?.id) {
      toast({
        title: "Login Required",
        description: "Please log in to start practicing.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createQuickPractice();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create practice session",
        variant: "destructive",
      });
    }
  };

  const handleContinueLearning = () => {
    // Find the most recent incomplete quiz or start a new one
    const incompleteQuiz = recentQuizzes.find(quiz => !quiz.completedAt);
    if (incompleteQuiz) {
      setLocation(`/app/quiz/${incompleteQuiz.id}`);
    } else {
      handleStartPractice();
    }
  };

  const handleViewProgress = () => {
    setLocation('/app/achievements');
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
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 80) return "text-blue-600 dark:text-blue-400";
    if (score >= 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
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
    return Math.round((stats.averageScore || 0));
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {currentUser?.firstName || "Student"}!
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Calendar className="w-4 h-4" />
            <span>{getCurrentDateTime()}</span>
          </div>
          <p className="text-lg text-muted-foreground italic">
            {motivationalMessage}
          </p>
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
                  className="w-full justify-start"
                  size="lg"
                  data-testid="start-quick-practice"
                >
                  <PlayCircle className="mr-3 h-5 w-5" />
                  Start Quick Practice
                  <span className="ml-auto text-sm opacity-80">10 questions</span>
                </Button>
                
                <Button 
                  onClick={handleContinueLearning}
                  variant="outline"
                  className="w-full justify-start"
                  size="lg"
                  data-testid="continue-learning"
                >
                  <BookOpen className="mr-3 h-5 w-5" />
                  Continue Learning
                  {recentQuizzes.find(q => !q.completedAt) && (
                    <span className="ml-auto text-sm opacity-80">Resume quiz</span>
                  )}
                </Button>
                
                <Button 
                  onClick={handleViewProgress}
                  variant="outline"
                  className="w-full justify-start"
                  size="lg"
                  data-testid="view-progress"
                >
                  <ChartBar className="mr-3 h-5 w-5" />
                  View Progress
                  <span className="ml-auto text-sm opacity-80">Achievements</span>
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
                    <span className={`text-2xl font-bold ${getLastQuizScore() ? getScoreColor(getLastQuizScore()!) : ''}`}>
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
                        onClick={() => setLocation(`/app/results/${quiz.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setLocation(`/app/results/${quiz.id}`);
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
                          <p className={`font-bold text-lg ${quiz.score ? getScoreColor(quiz.score) : ''}`}>
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

      <InsufficientTokensDialog
        open={showInsufficientTokensDialog}
        onOpenChange={setShowInsufficientTokensDialog}
        requiredTokens={requiredTokens}
        currentBalance={currentTokenBalance}
        onTokensAdded={createQuickPractice}
      />
    </div>
  );
}