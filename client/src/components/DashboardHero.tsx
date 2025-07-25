import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Calendar, Award, BookOpen, Brain, ClipboardCheck } from "lucide-react";
import type { UserStats, Category, MasteryScore } from "@shared/schema";

export default function DashboardHero() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const { data: stats } = useQuery<UserStats>({
    queryKey: [`/api/user/${currentUser?.id}/stats`],
    enabled: !!currentUser?.id,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: masteryScores = [] } = useQuery<MasteryScore[]>({
    queryKey: [`/api/user/${currentUser?.id}/mastery`],
    enabled: !!currentUser?.id,
  });

  const handleQuickQuiz = async (mode: string) => {
    if (!currentUser?.id) {
      toast({
        title: "Login Required",
        description: "Please log in to start a quiz.",
        variant: "destructive",
      });
      return;
    }

    try {
      const categoryIds = categories.slice(0, 2).map(c => c.id);
      const quiz = await apiRequest({
        endpoint: "/api/quiz",
        method: "POST",
        data: {
          userId: currentUser.id,
          categoryIds,
          questionCount: 15,
          title: `${mode} Session - ${new Date().toLocaleDateString()}`,
        },
      });

      if (quiz?.id) {
        window.location.href = `/app/quiz/${quiz.id}`;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create quiz session",
        variant: "destructive",
      });
    }
  };

  const calculateOverallMastery = () => {
    if (masteryScores.length === 0) return 0;
    const total = masteryScores.reduce((sum, score) => sum + score.rollingAverage, 0);
    return Math.round(total / masteryScores.length);
  };

  const getAIInsights = () => {
    if (!stats || stats.totalQuizzes === 0) {
      return {
        message: "Welcome to Cert Lab! Start with a learning session to begin building your cybersecurity expertise.",
        type: "welcome",
        action: "Take your first assessment to get personalized study recommendations."
      };
    }

    if (stats.averageScore < 60) {
      return {
        message: "Focus on foundational concepts first. Study mode sessions will help build your knowledge base.",
        type: "encouragement",
        action: "Start with study mode sessions to learn concepts before assessments."
      };
    }

    return {
      message: "You're making steady progress! Regular practice and review will help solidify your knowledge for certification success.",
      type: "progress",
      action: "Continue balanced practice with both study and quiz modes."
    };
  };

  const insights = getAIInsights();
  const overallMastery = calculateOverallMastery();

  if (!stats) {
    return (
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Enhanced Welcome Hero with Clean Background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-background to-secondary/3 border border-border/50 p-8 mb-8">
        {/* Clean background accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/8 to-transparent rounded-full"></div>
        
        <div className="relative z-10">
          {/* Welcome Header with Key Stats */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                    {currentUser?.firstName?.[0] || 'S'}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-background shadow-sm"></div>
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-foreground mb-1">
                    Welcome back, {currentUser?.firstName || 'Student'}!
                  </h1>
                  <p className="text-lg text-muted-foreground flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Ready to continue your certification journey
                  </p>
                </div>
              </div>
            </div>
            
            {/* Enhanced Quick Stats */}
            <div className="flex gap-4 mt-6 lg:mt-0">
              <div className="stat-card bg-card border-primary/20 text-center p-4 rounded-xl min-w-[100px] interactive-scale">
                <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-primary">{stats?.totalQuizzes || 0}</div>
                <div className="text-sm text-muted-foreground font-medium">Sessions</div>
              </div>
              
              <div className="stat-card bg-card border-accent/20 text-center p-4 rounded-xl min-w-[100px] interactive-scale">
                <Calendar className="w-6 h-6 text-accent mx-auto mb-2" />
                <div className="text-2xl font-bold text-accent">{stats?.currentStreak || 0}</div>
                <div className="text-sm text-muted-foreground font-medium">Day Streak</div>
              </div>
              
              <div className="stat-card bg-card border-secondary/20 text-center p-4 rounded-xl min-w-[100px] interactive-scale">
                <Award className="w-6 h-6 text-secondary mx-auto mb-2" />
                <div className="text-2xl font-bold text-secondary">{Math.round(stats?.averageScore || 0)}%</div>
                <div className="text-sm text-muted-foreground font-medium">Avg Score</div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights Section with Beautiful Design */}
        <div className="mt-8 p-6 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 shadow-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                AI Learning Assistant
                <Badge variant="secondary" className="text-xs">Personalized</Badge>
              </h3>
              <p className="text-muted-foreground mb-3">{insights.message}</p>
              <p className="text-sm text-primary font-medium">{insights.action}</p>
              <div className="mt-4 flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => handleQuickQuiz('AI Recommended')}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Start AI Session
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleQuickQuiz('Quick Practice')}
                  className="border-primary/20 hover:bg-primary/5"
                >
                  <ClipboardCheck className="w-4 h-4 mr-2" />
                  Quick Practice
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}