import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-provider";
import { Calendar, Clock, Target, TrendingUp, Bot } from "lucide-react";
import { queryKeys } from "@/lib/queryClient";
import type { UserStats, MasteryScore, Category, Quiz } from "@shared/schema";

export default function StudyPlanCard() {
  const { user: currentUser } = useAuth();

  const { data: stats } = useQuery<UserStats>({
    queryKey: queryKeys.user.stats(currentUser?.id),
    enabled: !!currentUser,
  });

  const { data: studyPlan } = useQuery<any>({
    queryKey: queryKeys.user.studyPlan(currentUser?.id),
    enabled: !!currentUser,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: queryKeys.categories.all(),
  });

  const { data: recentQuizzes = [] } = useQuery<Quiz[]>({
    queryKey: queryKeys.user.quizzes(currentUser?.id),
    enabled: !!currentUser,
  });

  const overallProgress = studyPlan?.insights?.strongAreas && studyPlan?.insights?.improvementAreas
    ? Math.round(((studyPlan.insights.strongAreas * 80) + (studyPlan.insights.improvementAreas * 50)) / (studyPlan.insights.strongAreas + studyPlan.insights.improvementAreas))
    : studyPlan?.insights?.recentPerformance || 0;

  const getCategoryName = (categoryId: number) => {
    return categories.find(cat => cat.id === categoryId)?.name || "Unknown";
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  // Get last 7 days of activity
  const getWeeklyActivity = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const dayQuizzes = recentQuizzes.filter(quiz => {
        if (!quiz.completedAt) return false;
        const quizDate = new Date(quiz.completedAt);
        return quizDate.toDateString() === date.toDateString();
      });

      days.push({
        date: date,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        quizCount: dayQuizzes.length,
        totalQuestions: dayQuizzes.reduce((sum, quiz) => sum + (quiz.totalQuestions || 0), 0),
        averageScore: dayQuizzes.length > 0 
          ? Math.round(dayQuizzes.reduce((sum, quiz) => sum + (quiz.score || 0), 0) / dayQuizzes.length)
          : 0,
        isToday: date.toDateString() === today.toDateString()
      });
    }
    
    return days;
  };

  const weeklyData = getWeeklyActivity();
  const totalQuizzesThisWeek = weeklyData.reduce((sum, day) => sum + day.quizCount, 0);
  const averageScoreThisWeek = weeklyData.filter(day => day.quizCount > 0).length > 0
    ? Math.round(weeklyData.reduce((sum, day) => sum + (day.averageScore * day.quizCount), 0) / totalQuizzesThisWeek)
    : 0;

  const getActivityLevel = (quizCount: number) => {
    if (quizCount === 0) return 'bg-muted';
    if (quizCount === 1) return 'bg-blue-200 dark:bg-blue-800';
    if (quizCount === 2) return 'bg-blue-400 dark:bg-blue-600';
    return 'bg-blue-600 dark:bg-blue-400';
  };

  return (
    <Card className="h-full card-raised">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Bot className="h-5 w-5 text-primary" />
          Helen AI Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="study-plan" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/30">
            <TabsTrigger value="study-plan" className="text-xs">Study Plan</TabsTrigger>
            <TabsTrigger value="progress" className="text-xs">Your Progress</TabsTrigger>
          </TabsList>
          
          <TabsContent value="study-plan" className="space-y-4 mt-4">
            {/* Priority Badge */}
            <div className="flex items-center justify-between">
              <Badge variant={studyPlan?.priority === "Get Started" ? "secondary" : "default"}>
                {studyPlan?.priority || "Loading..."}
              </Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {studyPlan?.estimatedTime || "..."}
              </div>
            </div>

            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Overall Progress</span>
                <span className={getProgressColor(overallProgress)}>{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>

            {/* Recommendation */}
            <p className="text-sm text-muted-foreground">
              {studyPlan?.recommendation || "Loading personalized recommendations..."}
            </p>

            {/* Focus Areas */}
            {studyPlan?.focusAreas && studyPlan.focusAreas.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Focus Areas:</h4>
                <div className="space-y-2">
                  {studyPlan.focusAreas.map((area: any) => (
                    <div key={area.categoryId} className="flex items-center justify-between text-sm">
                      <span className="truncate">{getCategoryName(area.categoryId)}</span>
                      <span className={getProgressColor(area.rollingAverage)}>
                        {area.rollingAverage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Study Streak */}
            {stats && stats.currentStreak > 0 && (
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm">
                  {stats.currentStreak} day study streak!
                </span>
              </div>
            )}

            {/* Next Study Session */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Today's Goal:</h4>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Complete {studyPlan?.focusAreas?.length > 0 ? '1 focus area' : '1 assessment'}</span>
              </div>
            </div>

            {/* Action Button */}
            <Button className="w-full" size="sm">
              Start Today's Study Session
            </Button>
          </TabsContent>
          
          <TabsContent value="progress" className="space-y-4 mt-4">
            {/* Weekly Stats */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="space-y-1">
                <p className="text-2xl font-bold text-blue-600">{totalQuizzesThisWeek}</p>
                <p className="text-xs text-muted-foreground">Sessions</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-green-600">{averageScoreThisWeek}%</p>
                <p className="text-xs text-muted-foreground">Avg Score</p>
              </div>
            </div>

            {/* Activity Calendar */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Daily Activity</h4>
              <div className="grid grid-cols-7 gap-1">
                {weeklyData.map((day, index) => (
                  <div key={index} className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">
                      {day.dayName}
                    </div>
                    <div 
                      className={`
                        h-8 w-8 rounded-sm mx-auto flex items-center justify-center text-xs font-medium
                        ${getActivityLevel(day.quizCount)}
                        ${day.isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                      `}
                      title={`${day.quizCount} sessions, ${day.averageScore}% avg`}
                    >
                      {day.quizCount || ''}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Less</span>
                <div className="flex gap-1">
                  <div className="w-3 h-3 rounded-sm bg-muted"></div>
                  <div className="w-3 h-3 rounded-sm bg-blue-200 dark:bg-blue-800"></div>
                  <div className="w-3 h-3 rounded-sm bg-blue-400 dark:bg-blue-600"></div>
                  <div className="w-3 h-3 rounded-sm bg-blue-600 dark:bg-blue-400"></div>
                </div>
                <span>More</span>
              </div>
            </div>

            {/* Weekly Insights */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Helen's Insights</h4>
              <div className="text-sm text-muted-foreground">
                {totalQuizzesThisWeek === 0 ? (
                  "Start your learning journey! Even 10 minutes daily makes a difference."
                ) : totalQuizzesThisWeek >= 5 ? (
                  "Excellent consistency! You're building strong study habits."
                ) : (
                  `Good progress! Try to add ${5 - totalQuizzesThisWeek} more sessions this week.`
                )}
              </div>
            </div>

            {/* Streak Info */}
            {weeklyData.filter(day => day.quizCount > 0).length >= 3 && (
              <div className="flex items-center gap-2 p-2 bg-green-50/50 dark:bg-green-900/20 rounded-lg">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-300">
                  Strong weekly momentum!
                </span>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}