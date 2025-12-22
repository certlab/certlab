import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-provider';
import { queryKeys } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Brain,
  Clock,
  Zap,
  AlertTriangle,
  Award,
  Calendar,
  BarChart3,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { analyticsService } from '@/lib/analytics-service';
import type { Quiz, MasteryScore, UserProgress, Category } from '@shared/schema';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';

export default function Analytics() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch user data
  const { data: quizzes = [] } = useQuery<Quiz[]>({
    queryKey: queryKeys.user.quizzes(user?.id),
    enabled: !!user?.id,
  });

  const { data: masteryScores = [] } = useQuery<MasteryScore[]>({
    queryKey: queryKeys.user.mastery(user?.id),
    enabled: !!user?.id,
  });

  const { data: userProgress = [] } = useQuery<UserProgress[]>({
    queryKey: queryKeys.user.progress(user?.id),
    enabled: !!user?.id,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: queryKeys.categories.all(),
  });

  // Calculate analytics (memoized to avoid expensive recalculations on every render)
  const learningCurve = useMemo(() => analyticsService.calculateLearningCurve(quizzes), [quizzes]);
  const examReadiness = useMemo(
    () => analyticsService.predictExamReadiness(quizzes, masteryScores),
    [quizzes, masteryScores]
  );
  const forecast7d = useMemo(
    () => analyticsService.forecastPerformance(quizzes, '7days'),
    [quizzes]
  );
  const forecast30d = useMemo(
    () => analyticsService.forecastPerformance(quizzes, '30days'),
    [quizzes]
  );
  const forecast90d = useMemo(
    () => analyticsService.forecastPerformance(quizzes, '90days'),
    [quizzes]
  );
  const efficiency = useMemo(() => analyticsService.calculateStudyEfficiency(quizzes), [quizzes]);
  const skillGaps = useMemo(
    () => analyticsService.identifySkillGaps(masteryScores, userProgress),
    [masteryScores, userProgress]
  );
  const burnoutRisk = useMemo(() => analyticsService.detectBurnoutRisk(quizzes), [quizzes]);
  const peakTimes = useMemo(
    () => analyticsService.identifyPeakPerformanceTimes(quizzes),
    [quizzes]
  );
  const insights = useMemo(
    () => analyticsService.generateInsights(quizzes, masteryScores, userProgress),
    [quizzes, masteryScores, userProgress]
  );

  // Enrich skill gaps with category names
  const enrichedSkillGaps = useMemo(
    () =>
      skillGaps.map((gap) => {
        const category = categories.find((c) => c.id === gap.categoryId);
        return {
          ...gap,
          categoryName: category?.name || gap.categoryName,
        };
      }),
    [skillGaps, categories]
  );

  // Generate retention curve data (using most recent quiz completion date)
  const lastQuizDate = useMemo(() => {
    return (
      quizzes.reduce<Date | null>((latest, quiz) => {
        if (!quiz.completedAt) return latest;
        const quizDate = new Date(quiz.completedAt);
        if (!latest || quizDate > latest) {
          return quizDate;
        }
        return latest;
      }, null) ?? new Date()
    );
  }, [quizzes]);
  const retentionCurve = useMemo(
    () => analyticsService.generateRetentionCurve(lastQuizDate),
    [lastQuizDate]
  );

  // Format data for charts
  const forecastData = [
    {
      period: 'Current',
      score: examReadiness.score,
      lower: examReadiness.confidenceInterval.lower,
      upper: examReadiness.confidenceInterval.upper,
    },
    {
      period: '7 Days',
      score: forecast7d.predictedScore,
      lower: forecast7d.confidenceInterval.lower,
      upper: forecast7d.confidenceInterval.upper,
    },
    {
      period: '30 Days',
      score: forecast30d.predictedScore,
      lower: forecast30d.confidenceInterval.lower,
      upper: forecast30d.confidenceInterval.upper,
    },
    {
      period: '90 Days',
      score: forecast90d.predictedScore,
      lower: forecast90d.confidenceInterval.lower,
      upper: forecast90d.confidenceInterval.upper,
    },
  ];

  const skillGapChartData = enrichedSkillGaps.slice(0, 6).map((gap) => ({
    category: gap.categoryName.slice(0, 15) + (gap.categoryName.length > 15 ? '...' : ''),
    current: gap.currentMastery,
    target: gap.targetMastery,
    gap: gap.gap,
  }));

  const peakTimesData = peakTimes.slice(0, 8).map((peak) => ({
    hour: `${peak.hour}:00`,
    score: peak.averageScore,
    count: peak.quizCount,
  }));

  // Show message if insufficient data
  if (quizzes.length < 3) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">Advanced Analytics</h1>
            <p className="text-muted-foreground">
              Deep insights into your learning patterns and performance
            </p>
          </div>

          <Card className="text-center py-12">
            <CardContent>
              <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Complete More Quizzes</h3>
              <p className="text-muted-foreground mb-4">
                Analytics become available after completing at least 3 quizzes.
              </p>
              <Button onClick={() => navigate('/app/dashboard')}>
                Start a Quiz <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Advanced Analytics</h1>
          <p className="text-muted-foreground">
            Deep insights into your learning patterns and performance
          </p>
        </div>

        {/* Key Insights Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Exam Readiness */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" />
                Exam Readiness
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{examReadiness.score}%</div>
              <p className="text-xs text-muted-foreground mb-2">
                {examReadiness.confidence}% confidence
              </p>
              <div className="flex items-center gap-1 text-xs">
                <Badge
                  variant={examReadiness.score >= 85 ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {examReadiness.estimatedPassProbability}% pass probability
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Study Efficiency */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Study Efficiency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{efficiency.efficiencyScore}%</div>
              <p className="text-xs text-muted-foreground mb-2">
                {efficiency.accuracyRate}% accuracy
              </p>
              <div className="flex items-center gap-1 text-xs text-primary font-medium">
                <Clock className="h-3 w-3" />
                {efficiency.optimalStudyDuration} min/session
              </div>
            </CardContent>
          </Card>

          {/* Learning Velocity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Learning Velocity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {efficiency.learningVelocity >= 0 ? '+' : ''}
                {efficiency.learningVelocity}
              </div>
              <p className="text-xs text-muted-foreground mb-2">points per day</p>
              <div className="flex items-center gap-1 text-xs">
                <Badge
                  variant={efficiency.learningVelocity > 0 ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {forecast7d.trend}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Burnout Risk */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Burnout Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1 capitalize">{burnoutRisk.riskLevel}</div>
              <p className="text-xs text-muted-foreground mb-2">
                {burnoutRisk.factors.consecutiveDays} consecutive days
              </p>
              <div className="flex items-center gap-1 text-xs">
                <Badge
                  variant={
                    burnoutRisk.riskLevel === 'high'
                      ? 'destructive'
                      : burnoutRisk.riskLevel === 'medium'
                        ? 'default'
                        : 'secondary'
                  }
                  className="text-xs"
                >
                  {burnoutRisk.score}/100
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Insights Panel */}
        {insights.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                AI-Powered Insights
                <Badge variant="outline" className="text-xs">
                  Personalized
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.slice(0, 3).map((insight) => (
                  <div
                    key={insight.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {insight.type === 'achievement' && (
                        <Award className="w-4 h-4 text-purple-600" />
                      )}
                      {insight.type === 'strength' && (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      )}
                      {insight.type === 'weakness' && (
                        <TrendingDown className="w-4 h-4 text-orange-600" />
                      )}
                      {insight.type === 'recommendation' && (
                        <Target className="w-4 h-4 text-blue-600" />
                      )}
                      {insight.type === 'warning' && (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{insight.title}</h4>
                        <Badge
                          variant={
                            insight.priority === 'high'
                              ? 'destructive'
                              : insight.priority === 'medium'
                                ? 'default'
                                : 'secondary'
                          }
                          className="text-xs px-1.5 py-0.5"
                        >
                          {insight.priority}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground mb-2">{insight.message}</p>

                      {insight.metric && (
                        <div className="text-xs text-primary font-medium mb-2">
                          {insight.metric}
                        </div>
                      )}

                      {insight.progress !== undefined && (
                        <div className="w-full bg-muted rounded-full h-1.5 mb-2">
                          <div
                            className="bg-primary h-1.5 rounded-full transition-all"
                            style={{ width: `${Math.min(100, insight.progress)}%` }}
                          />
                        </div>
                      )}

                      {insight.actionText && insight.actionUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-xs font-medium text-primary"
                          onClick={() => navigate(insight.actionUrl!)}
                        >
                          {insight.actionText}
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs for different analytics views */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
            <TabsTrigger value="gaps">Skill Gaps</TabsTrigger>
            <TabsTrigger value="retention">Retention</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Learning Curve</CardTitle>
                <CardDescription>
                  Your score progression over time with 7-day moving average
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={learningCurve}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date) =>
                        new Date(date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })
                      }
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip
                      formatter={(value: number) => [`${value}%`, '']}
                      labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#8884d8"
                      name="Daily Score"
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="movingAverage"
                      stroke="#82ca9d"
                      name="7-Day Average"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="trendLine"
                      stroke="#ffc658"
                      strokeDasharray="5 5"
                      name="Trend"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Forecast</CardTitle>
                <CardDescription>
                  Predicted scores for the next 7, 30, and 90 days with confidence intervals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={forecastData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value: number) => `${value}%`} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="upper"
                      stackId="1"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      fillOpacity={0.2}
                      name="Upper Bound"
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stackId="2"
                      stroke="#8884d8"
                      fill="#8884d8"
                      name="Predicted Score"
                    />
                    <Area
                      type="monotone"
                      dataKey="lower"
                      stackId="3"
                      stroke="#ffc658"
                      fill="#ffc658"
                      fillOpacity={0.2}
                      name="Lower Bound"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">7-Day Forecast</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-1">{forecast7d.predictedScore}%</div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {forecast7d.confidenceInterval.lower}% - {forecast7d.confidenceInterval.upper}%
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {forecast7d.trend}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">
                    Recommended: {forecast7d.requiredDailyStudyMinutes} min/day
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">30-Day Forecast</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-1">{forecast30d.predictedScore}%</div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {forecast30d.confidenceInterval.lower}% - {forecast30d.confidenceInterval.upper}
                    %
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {forecast30d.trend}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">
                    Recommended: {forecast30d.requiredDailyStudyMinutes} min/day
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">90-Day Forecast</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-1">{forecast90d.predictedScore}%</div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {forecast90d.confidenceInterval.lower}% - {forecast90d.confidenceInterval.upper}
                    %
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {forecast90d.trend}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">
                    Recommended: {forecast90d.requiredDailyStudyMinutes} min/day
                  </p>
                </CardContent>
              </Card>
            </div>

            {peakTimesData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Peak Performance Times</CardTitle>
                  <CardDescription>Your average scores by time of day</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={peakTimesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value: number) => [`${value}%`, 'Score']} />
                      <Legend />
                      <Bar dataKey="score" fill="#8884d8" name="Average Score" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Efficiency Tab */}
          <TabsContent value="efficiency" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Accuracy Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{efficiency.accuracyRate}%</div>
                  <p className="text-xs text-muted-foreground mt-1">Correct answers per quiz</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Time per Question</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{efficiency.averageTimePerQuestion}s</div>
                  <p className="text-xs text-muted-foreground mt-1">Average response time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Points per Hour</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{efficiency.pointsPerHour}</div>
                  <p className="text-xs text-muted-foreground mt-1">Learning productivity</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Optimal Duration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{efficiency.optimalStudyDuration}</div>
                  <p className="text-xs text-muted-foreground mt-1">Minutes per session</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Study Efficiency Score</CardTitle>
                <CardDescription>Overall efficiency combining accuracy and speed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1">
                    <div className="w-full bg-muted rounded-full h-4">
                      <div
                        className="bg-primary h-4 rounded-full transition-all flex items-center justify-end pr-2"
                        style={{ width: `${efficiency.efficiencyScore}%` }}
                      >
                        <span className="text-xs font-bold text-primary-foreground">
                          {efficiency.efficiencyScore}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {efficiency.efficiencyScore >= 80
                    ? "🎉 Excellent! You're studying very efficiently."
                    : efficiency.efficiencyScore >= 60
                      ? '👍 Good efficiency. Small improvements can make a big difference.'
                      : '💡 Focus on accuracy and maintaining steady pace.'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Burnout Risk Assessment</CardTitle>
                <CardDescription>
                  Monitoring your study patterns for sustainable learning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        Risk Level: {burnoutRisk.riskLevel}
                      </span>
                      <Badge
                        variant={
                          burnoutRisk.riskLevel === 'high'
                            ? 'destructive'
                            : burnoutRisk.riskLevel === 'medium'
                              ? 'default'
                              : 'secondary'
                        }
                      >
                        {burnoutRisk.score}/100
                      </Badge>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          burnoutRisk.riskLevel === 'high'
                            ? 'bg-red-500'
                            : burnoutRisk.riskLevel === 'medium'
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                        }`}
                        style={{ width: `${burnoutRisk.score}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Consecutive Days</p>
                      <p className="text-sm font-medium">{burnoutRisk.factors.consecutiveDays}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Performance Trend</p>
                      <p className="text-sm font-medium">
                        {burnoutRisk.factors.performanceDecline ? 'Declining' : 'Stable'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Recommendations:</p>
                    <ul className="space-y-1">
                      {burnoutRisk.recommendations.map((rec, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-muted-foreground flex items-start gap-2"
                        >
                          <span className="text-primary">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Skill Gaps Tab */}
          <TabsContent value="gaps" className="space-y-4">
            {enrichedSkillGaps.length > 0 ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Skill Gap Analysis</CardTitle>
                    <CardDescription>
                      Areas where you need more practice to reach 85% mastery
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={skillGapChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip formatter={(value: number) => `${value}%`} />
                        <Legend />
                        <Bar dataKey="current" fill="#8884d8" name="Current Mastery" />
                        <Bar dataKey="target" fill="#82ca9d" name="Target Mastery" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {enrichedSkillGaps.slice(0, 6).map((gap) => (
                    <Card key={gap.categoryId}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{gap.categoryName}</CardTitle>
                          <Badge
                            variant={
                              gap.priority === 'high'
                                ? 'destructive'
                                : gap.priority === 'medium'
                                  ? 'default'
                                  : 'secondary'
                            }
                          >
                            {gap.priority}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Current</span>
                            <span className="font-medium">{gap.currentMastery}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ width: `${gap.currentMastery}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Gap: {gap.gap}%</span>
                            <span>{gap.estimatedStudyHours}h needed</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => navigate('/app/dashboard')}
                          >
                            Practice Now
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Award className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <h3 className="text-lg font-semibold mb-2">No Significant Gaps!</h3>
                  <p className="text-muted-foreground">
                    You're performing well across all categories. Keep up the great work!
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Retention Tab */}
          <TabsContent value="retention" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Memory Retention Curve</CardTitle>
                <CardDescription>
                  Ebbinghaus forgetting curve based on your last study session
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={retentionCurve.slice(0, 30)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="daysSinceStudy"
                      label={{
                        value: 'Days Since Last Study',
                        position: 'insideBottom',
                        offset: -5,
                      }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      label={{ value: 'Retention %', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip formatter={(value: number) => `${value}%`} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="forgettingCurve"
                      stroke="#ff7300"
                      fill="#ff7300"
                      fillOpacity={0.6}
                      name="Expected Retention"
                    />
                  </AreaChart>
                </ResponsiveContainer>

                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Spaced Repetition Recommendations
                  </h4>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>
                        <strong>Day 1:</strong> Review immediately after learning (100% retention)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>
                        <strong>Day 3:</strong> First review (prevents major memory loss)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>
                        <strong>Day 7:</strong> Second review (strengthens long-term memory)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>
                        <strong>Day 14:</strong> Third review (solidifies retention)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>
                        <strong>Day 30:</strong> Final review (ensures long-term retention)
                      </span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Review Status</CardTitle>
                <CardDescription>
                  Topics that may need review based on time since last practice
                </CardDescription>
              </CardHeader>
              <CardContent>
                {retentionCurve.find((r) => r.reviewRecommended) ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-sm mb-1">Review Recommended</h4>
                          <p className="text-xs text-muted-foreground">
                            It's been{' '}
                            {Math.floor(
                              (new Date().getTime() - lastQuizDate.getTime()) /
                                (1000 * 60 * 60 * 24)
                            )}{' '}
                            days since your last quiz. Review now to maintain retention above 50%.
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button className="w-full" onClick={() => navigate('/app/dashboard')}>
                      Start Review Session
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 mx-auto mb-3 text-green-600" />
                    <h4 className="font-medium mb-1">Retention is Good!</h4>
                    <p className="text-sm text-muted-foreground">
                      Your knowledge is still fresh. Continue with your normal study schedule.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
