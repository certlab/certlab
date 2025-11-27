import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-provider";
import { Calendar, TrendingUp } from "lucide-react";
import type { Quiz } from "@shared/schema";

export default function WeeklyProgress() {
  const { user: currentUser } = useAuth();

  const { data: recentQuizzes = [] } = useQuery<Quiz[]>({
    queryKey: ['/api/user', currentUser?.id, 'quizzes'],
    enabled: !!currentUser,
  });

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
    <Card className="h-full bg-card border-border/50 card-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          This Week's Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Weekly Stats */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalQuizzesThisWeek}</p>
            <p className="text-xs text-muted-foreground">Sessions</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{averageScoreThisWeek}%</p>
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
          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-700 dark:text-green-300">
              Strong weekly momentum!
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}