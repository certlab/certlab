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
      <div className="relative overflow-hidden rounded-md bg-gradient-to-br from-primary/5 via-background to-secondary/3 border border-border/50 p-8 mb-8">
        {/* Clean background accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/8 to-transparent rounded-md"></div>
        
        <div className="relative z-10">
          {/* Helen's Welcome Conversation */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              {/* Helen's Chat Interface - Large & Prominent */}
              <div className="flex items-start gap-6 mb-8">
                {/* Helen's Avatar - Much Larger */}
                <div className="relative flex-shrink-0">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 p-1 shadow-xl">
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900 flex items-center justify-center relative overflow-hidden">
                      {/* Helen's Face */}
                      <div className="relative w-16 h-16">
                        {/* Eyes */}
                        <div className="absolute top-4 left-3 w-2.5 h-2.5 bg-purple-700 dark:bg-purple-300 rounded-full"></div>
                        <div className="absolute top-4 right-3 w-2.5 h-2.5 bg-purple-700 dark:bg-purple-300 rounded-full"></div>
                        
                        {/* Eye sparkles */}
                        <div className="absolute top-4.5 left-3.5 w-1 h-1 bg-white rounded-full"></div>
                        <div className="absolute top-4.5 right-3.5 w-1 h-1 bg-white rounded-full"></div>
                        
                        {/* Smile */}
                        <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2">
                          <div className="w-6 h-3 border-b-2 border-purple-700 dark:border-purple-300 rounded-full"></div>
                        </div>
                        
                        {/* Small AI indicator dot on forehead */}
                        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-gradient-to-br from-pink-400 to-purple-400 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                  {/* AI Status Indicator */}
                  <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-green-500 rounded-full border-3 border-background shadow-lg flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                  </div>
                </div>
                
                {/* Helen's Chat Bubble - Much Larger */}
                <div className="flex-1 relative">
                  {/* Chat Bubble Tail */}
                  <div className="absolute left-0 top-6 w-0 h-0 border-t-12 border-t-transparent border-b-12 border-b-transparent border-r-16 border-r-card -translate-x-4"></div>
                  
                  {/* Chat Content */}
                  <div className="card-raised p-8 rounded-lg bg-gradient-to-br from-card to-purple-50/30 dark:to-purple-950/30 border border-purple-200/30 dark:border-purple-800/30 shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="font-bold text-purple-700 dark:text-purple-300 text-2xl">Helen</h3>
                      <Badge variant="secondary" className="text-sm bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200 px-3 py-1">AI Assistant</Badge>
                    </div>
                    <p className="text-foreground mb-3 text-2xl font-semibold">
                      Welcome back, {currentUser?.firstName || 'Student'}! 👋
                    </p>
                    <p className="text-muted-foreground mb-6 text-lg leading-relaxed">
                      Are you ready to continue your certification journey? I've been analyzing your progress and have some personalized recommendations just for you!
                    </p>
                    
                    {/* Quick Action Buttons in Chat - Larger */}
                    <div className="flex flex-wrap gap-3">
                      <Button 
                        size="lg" 
                        onClick={() => handleQuickQuiz('AI Recommended')}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg text-base px-6 py-3"
                      >
                        <Brain className="w-5 h-5 mr-3" />
                        Smart Study
                      </Button>
                      <Button 
                        size="lg" 
                        variant="outline"
                        onClick={() => handleQuickQuiz('Quick Practice')}
                        className="border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-950/50 text-base px-6 py-3"
                      >
                        <BookOpen className="w-5 h-5 mr-3" />
                        Quick Practice
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Avatar & Stats Row */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-md bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                    {currentUser?.firstName?.[0] || 'S'}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-sm border-2 border-background shadow-sm"></div>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    {currentUser?.firstName || 'Student'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Active Learner
                  </p>
                </div>
              </div>
            </div>
            
            {/* Enhanced Quick Stats */}
            <div className="flex gap-4 mt-6 lg:mt-0">
              <div className="card-inset text-center p-4 rounded-md min-w-[100px] interactive-scale border-primary/10">
                <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-primary">{stats?.totalQuizzes || 0}</div>
                <div className="text-sm text-muted-foreground font-medium">Sessions</div>
              </div>
              
              <div className="card-inset text-center p-4 rounded-md min-w-[100px] interactive-scale border-accent/10">
                <Calendar className="w-6 h-6 text-accent mx-auto mb-2" />
                <div className="text-2xl font-bold text-accent">{stats?.currentStreak || 0}</div>
                <div className="text-sm text-muted-foreground font-medium">Day Streak</div>
              </div>
              
              <div className="card-inset text-center p-4 rounded-md min-w-[100px] interactive-scale border-secondary/10">
                <Award className="w-6 h-6 text-secondary mx-auto mb-2" />
                <div className="text-2xl font-bold text-secondary">{Math.round(stats?.averageScore || 0)}%</div>
                <div className="text-sm text-muted-foreground font-medium">Avg Score</div>
              </div>
            </div>
          </div>
        </div>

        {/* Helen's Additional Insights */}
        <div className="mt-8 p-6 rounded-md bg-gradient-to-r from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20 border border-purple-200/50 dark:border-purple-800/50">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg relative overflow-hidden">
              {/* Smaller Helen face for insights section */}
              <div className="relative w-6 h-6">
                {/* Eyes */}
                <div className="absolute top-1 left-1 w-1 h-1 bg-white rounded-full"></div>
                <div className="absolute top-1 right-1 w-1 h-1 bg-white rounded-full"></div>
                {/* Smile */}
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                  <div className="w-2 h-1 border-b border-white rounded-full"></div>
                </div>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                Helen's Smart Insights
                <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
                  Personalized
                </Badge>
              </h3>
              <p className="text-muted-foreground mb-3">{insights.message}</p>
              <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">{insights.action}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}