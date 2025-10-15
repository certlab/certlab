import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import type { UserStats, Quiz } from "@shared/schema";
import SubscriptionBadge from "@/components/SubscriptionBadge";

export default function Dashboard() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Motivational messages
  const motivationalMessages = [
    "Every question answered brings you closer to your certification goals!",
    "Consistency is key - keep up your daily practice!",
    "Your dedication today shapes your success tomorrow.",
    "Small steps daily lead to big achievements.",
    "Focus on progress, not perfection.",
    "Learning is a journey - enjoy every step!",
    "Stay curious, stay motivated, stay successful.",
    "Your effort today is an investment in your future.",
  ];

  const getRandomMotivationalMessage = () => {
    const index = Math.floor(Math.random() * motivationalMessages.length);
    return motivationalMessages[index];
  };

  // Set motivational message once on mount to prevent it from changing on re-renders
  const [motivationalMessage] = useState(() => getRandomMotivationalMessage());

  // Get user stats
  const { data: stats } = useQuery<UserStats>({
    queryKey: [`/api/user/${currentUser?.id}/stats`],
    enabled: !!currentUser?.id,
  });

  // Get recent quizzes
  const { data: recentQuizzes = [] } = useQuery<Quiz[]>({
    queryKey: ['/api/user', currentUser?.id, 'quizzes'],
    enabled: !!currentUser,
  });

  // Get subscription status
  const { data: subscription } = useQuery<any>({
    queryKey: ["/api/subscription/status"],
    enabled: !!currentUser,
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
      const response = await apiRequest({
        endpoint: "/api/quiz",
        method: "POST",
        data: {
          categoryIds: [35], // Default to first category
          questionCount: 10,
          title: `Practice Session - ${new Date().toLocaleDateString()}`,
        },
      });

      const quiz = await response.json();
      if (quiz?.id) {
        // Invalidate cache to update subscription status and daily quiz count
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
        setLocation(`/app/quiz/${quiz.id}`);
      }
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

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
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

        {/* Subscription Card - Prominent placement */}
        {subscription && (
          <Card className="mb-6 border-primary/20 overflow-hidden bg-gradient-to-r from-card to-accent/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <SubscriptionBadge 
                      plan={subscription.plan?.toLowerCase() as 'free' | 'pro' | 'enterprise' || 'free'}
                      size="medium"
                      showQuizCount={subscription.plan?.toLowerCase() === 'free'}
                      dailyQuizCount={subscription.dailyQuizCount}
                      quizLimit={subscription.limits?.quizzesPerDay}
                    />
                    {subscription.plan?.toLowerCase() === 'free' && (
                      <span className="text-sm text-muted-foreground">
                        {subscription.limits?.quizzesPerDay - subscription.dailyQuizCount} quizzes remaining today
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Your {subscription.plan} Plan Benefits</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {subscription.features?.slice(0, 3).map((feature: string, index: number) => (
                        <div key={index} className="flex items-center gap-1 text-xs bg-accent/10 rounded-full px-2 py-1">
                          <Sparkles className="w-3 h-3 text-primary" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    {subscription.plan?.toLowerCase() !== 'enterprise' && (
                      <Button
                        onClick={() => setLocation('/app/subscription/plans')}
                        size="sm"
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                      >
                        <Crown className="w-4 h-4 mr-2" />
                        {subscription.plan?.toLowerCase() === 'free' ? 'Upgrade to Pro' : 'Upgrade to Enterprise'}
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Visual Enhancement */}
                <div className="hidden lg:block">
                  <div className="relative">
                    {subscription.plan?.toLowerCase() === 'pro' ? (
                      <Crown className="w-24 h-24 text-purple-500/20" />
                    ) : subscription.plan?.toLowerCase() === 'enterprise' ? (
                      <Trophy className="w-24 h-24 text-amber-500/20" />
                    ) : (
                      <Sparkles className="w-24 h-24 text-gray-400/20" />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                  <div className="space-y-3">
                    {completedQuizzes.map((quiz) => (
                      <div 
                        key={quiz.id} 
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => setLocation(`/app/results/${quiz.id}`)}
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
    </div>
  );
}