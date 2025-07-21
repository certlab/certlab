import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";
import { Calendar, Clock, Target, TrendingUp } from "lucide-react";
import type { UserStats, MasteryScore, Category } from "@shared/schema";

export default function StudyPlanCard() {
  const { user: currentUser } = useAuth();

  const { data: stats } = useQuery<UserStats>({
    queryKey: ['/api/user', currentUser?.id, 'stats'],
    enabled: !!currentUser,
  });

  const { data: studyPlan } = useQuery<any>({
    queryKey: ['/api/user', currentUser?.id, 'study-plan'],
    enabled: !!currentUser,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
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

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Helen's Study Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
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
      </CardContent>
    </Card>
  );
}