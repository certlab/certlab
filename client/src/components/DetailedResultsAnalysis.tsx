import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-provider";
import { TrendingUp, TrendingDown, Target, Clock, CheckCircle, XCircle, BarChart3 } from "lucide-react";
import { queryKeys } from "@/lib/queryClient";
import type { Quiz, Category } from "@shared/schema";

interface DetailedResultsAnalysisProps {
  quizId: number;
}

export default function DetailedResultsAnalysis({ quizId }: DetailedResultsAnalysisProps) {
  const { user: currentUser } = useAuth();

  const { data: quiz } = useQuery<Quiz>({
    queryKey: queryKeys.quiz.detail(quizId),
    enabled: !!currentUser,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: queryKeys.categories.all(),
  });

  if (!quiz || !quiz.completedAt) {
    return null;
  }

  // Calculate detailed analytics
  const totalQuestions = quiz.totalQuestions || 0;
  const correctAnswers = Math.round((quiz.score || 0) / 100 * totalQuestions);
  const incorrectAnswers = totalQuestions - correctAnswers;
  const accuracy = Math.round((correctAnswers / totalQuestions) * 100);

  // Time analysis
  const formatDuration = (startTime: string | Date | null, endTime: string | Date | null) => {
    if (!startTime || !endTime) return 0;
    const start = startTime instanceof Date ? startTime : new Date(startTime);
    const end = endTime instanceof Date ? endTime : new Date(endTime);
    return Math.round((end.getTime() - start.getTime()) / 1000);
  };
  
  const timeSpent = formatDuration(quiz.startedAt, quiz.completedAt);
  const averageTimePerQuestion = totalQuestions > 0 ? Math.round(timeSpent / totalQuestions) : 0;
  const timeEfficiency = quiz.timeLimit ? Math.round((timeSpent / (quiz.timeLimit * 60)) * 100) : 100;

  // Performance categorization - WCAG AA compliant colors with dark mode variants
  const getPerformanceLevel = (score: number) => {
    if (score >= 85) return { level: "Excellent", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/20" };
    if (score >= 70) return { level: "Good", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/20" };
    if (score >= 60) return { level: "Fair", color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-100 dark:bg-orange-900/20" };
    return { level: "Needs Improvement", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/20" };
  };

  const performance = getPerformanceLevel(quiz.score || 0);

  // Category performance (if we had category-level data)
  const getCategoryName = (categoryIds: unknown) => {
    const ids = Array.isArray(categoryIds) ? categoryIds as number[] : [];
    return ids
      .map(id => categories.find(cat => cat.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  // Study recommendations based on performance
  const getStudyRecommendations = () => {
    const recommendations = [];
    
    if (accuracy < 60) {
      recommendations.push({
        icon: Target,
        title: "Review Fundamentals",
        description: "Focus on core concepts in this certification area",
        priority: "high"
      });
    }
    
    if (accuracy >= 60 && accuracy < 80) {
      recommendations.push({
        icon: TrendingUp,
        title: "Practice More Questions",
        description: "Increase practice volume to improve pattern recognition",
        priority: "medium"
      });
    }
    
    if (timeEfficiency > 80) {
      recommendations.push({
        icon: Clock,
        title: "Focus on Speed",
        description: "Work on answering questions more efficiently",
        priority: "medium"
      });
    }
    
    if (accuracy >= 80) {
      recommendations.push({
        icon: CheckCircle,
        title: "Maintain Excellence",
        description: "Continue with challenging practice tests",
        priority: "low"
      });
    }

    return recommendations;
  };

  const recommendations = getStudyRecommendations();

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{correctAnswers}</div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{incorrectAnswers}</div>
              <div className="text-sm text-muted-foreground">Incorrect</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{accuracy}%</div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{averageTimePerQuestion}s</div>
              <div className="text-sm text-muted-foreground">Avg Time</div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Performance</span>
              <Badge className={performance.bgColor + " " + performance.color}>
                {performance.level}
              </Badge>
            </div>
            <Progress value={quiz.score || 0} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Time Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Time Spent</span>
              <span className="font-medium">{Math.floor(timeSpent / 60)}m {timeSpent % 60}s</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Average per Question</span>
              <span className="font-medium">{averageTimePerQuestion}s</span>
            </div>
            {quiz.timeLimit && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Time Efficiency</span>
                  <span className="font-medium">{timeEfficiency}%</span>
                </div>
                <Progress value={timeEfficiency} className="h-2" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Study Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Helen's Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <rec.icon className={`h-5 w-5 mt-0.5 ${
                  rec.priority === 'high' ? 'text-red-500' :
                  rec.priority === 'medium' ? 'text-orange-500' : 'text-green-500'
                }`} />
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{rec.title}</h4>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                </div>
                <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                  {rec.priority}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Suggested Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {accuracy < 70 ? (
            <>
              <p className="text-sm text-muted-foreground">
                Focus on understanding the core concepts in {getCategoryName(quiz.categoryIds)}. 
                Consider reviewing study materials before taking more practice tests.
              </p>
              <Button variant="outline" className="w-full">
                Review Study Materials
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Great progress! Continue practicing with more questions in {getCategoryName(quiz.categoryIds)} 
                to maintain and improve your performance.
              </p>
              <Button className="w-full">
                Take Another Practice Quiz
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}