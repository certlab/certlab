import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-provider';
import { queryKeys, staleTime } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrendingUp, TrendingDown, BarChart3, Target, Clock, Download, Minus } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function PerformanceInsightsPage() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<string>('30');

  // Fetch performance data
  const { data: performanceSummary, isLoading: loadingSummary } = useQuery<{
    overview: {
      totalQuizzes: number;
      totalQuestions: number;
      averageScore: number;
      passingRate: number;
      studyStreak: number;
      totalStudyTime: number;
    };
    recentTrend: 'improving' | 'stable' | 'declining';
    topCategories: Array<{ categoryId: number; categoryName: string; score: number }>;
    weakCategories: Array<{ categoryId: number; categoryName: string; score: number }>;
  }>({
    queryKey: queryKeys.user.performanceSummary(user?.id),
    enabled: !!user?.id,
    staleTime: staleTime.user,
  });

  const { data: performanceOverTime, isLoading: loadingTrends } = useQuery<
    Array<{ date: string; score: number; quizCount: number }>
  >({
    queryKey: queryKeys.user.performanceOverTime(user?.id, parseInt(timeRange)),
    enabled: !!user?.id,
    staleTime: staleTime.user,
  });

  const { data: categoryBreakdown, isLoading: loadingCategories } = useQuery<
    Array<{
      categoryId: number;
      categoryName: string;
      score: number;
      questionsAnswered: number;
      correctAnswers: number;
      subcategories: Array<{
        subcategoryId: number;
        subcategoryName: string;
        score: number;
        questionsAnswered: number;
        correctAnswers: number;
      }>;
    }>
  >({
    queryKey: queryKeys.user.categoryBreakdown(user?.id),
    enabled: !!user?.id,
    staleTime: staleTime.user,
  });

  const { data: studyTimeDistribution, isLoading: loadingTime } = useQuery<{
    totalMinutes: number;
    averageSessionMinutes: number;
    byDayOfWeek: Array<{ day: string; minutes: number; sessions: number }>;
    byTimeOfDay: Array<{ hour: number; minutes: number; sessions: number }>;
  }>({
    queryKey: queryKeys.user.studyTimeDistribution(user?.id),
    enabled: !!user?.id,
    staleTime: staleTime.user,
  });

  const { data: studyConsistency, isLoading: loadingConsistency } = useQuery<{
    currentStreak: number;
    longestStreak: number;
    activeDays: number;
    totalDays: number;
    calendar: Array<{ date: string; quizCount: number; totalScore: number }>;
  }>({
    queryKey: queryKeys.user.studyConsistency(user?.id, 90),
    enabled: !!user?.id,
    staleTime: staleTime.user,
  });

  const isLoading =
    loadingSummary || loadingTrends || loadingCategories || loadingTime || loadingConsistency;

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Please log in to view performance insights.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleExportCSV = () => {
    if (!performanceSummary || !performanceOverTime || !categoryBreakdown) return;

    // Helper function to escape CSV values according to RFC 4180
    const escapeCSV = (value: string | number): string => {
      const str = String(value);
      // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Create CSV content
    const rows = [
      ['Performance Insights Report'],
      [''],
      ['Overview'],
      ['Total Quizzes', performanceSummary.overview.totalQuizzes],
      ['Total Questions', performanceSummary.overview.totalQuestions],
      ['Average Score', performanceSummary.overview.averageScore + '%'],
      ['Passing Rate', performanceSummary.overview.passingRate + '%'],
      ['Study Streak', performanceSummary.overview.studyStreak + ' days'],
      ['Total Study Time', performanceSummary.overview.totalStudyTime + ' minutes'],
      [''],
      ['Performance Over Time'],
      ['Date', 'Score', 'Quiz Count'],
      ...performanceOverTime.map((entry) => [entry.date, entry.score, entry.quizCount]),
      [''],
      ['Category Breakdown'],
      ['Category', 'Score', 'Questions Answered', 'Correct Answers'],
      ...categoryBreakdown.map((cat) => [
        cat.categoryName,
        cat.score,
        cat.questionsAnswered,
        cat.correctAnswers,
      ]),
    ];

    const csvContent = rows.map((row) => row.map((cell) => escapeCSV(cell)).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-insights-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Chart colors
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // Trend indicator
  const getTrendIcon = () => {
    if (!performanceSummary) return null;
    switch (performanceSummary.recentTrend) {
      case 'improving':
        return <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'declining':
        return <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />;
      default:
        return <Minus className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
    }
  };

  const getTrendText = () => {
    if (!performanceSummary) return 'Stable';
    return (
      performanceSummary.recentTrend.charAt(0).toUpperCase() +
      performanceSummary.recentTrend.slice(1)
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Performance Insights</h1>
          <p className="text-muted-foreground">
            Track your learning progress and identify areas for improvement
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading performance data...</p>
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          {performanceSummary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-3xl font-bold">
                      {performanceSummary.overview.totalQuizzes}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Total Quizzes</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="text-3xl font-bold">
                      {performanceSummary.overview.averageScore}%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <span className="text-3xl font-bold">
                      {Math.round(performanceSummary.overview.totalStudyTime / 60)}h
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Study Time</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    {getTrendIcon()}
                    <span className="text-3xl font-bold">{getTrendText()}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Recent Trend</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Performance Trends Chart */}
          {performanceOverTime && performanceOverTime.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Over Time</CardTitle>
                <CardDescription>Your quiz scores over the selected time period</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceOverTime}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      className="text-xs"
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis domain={[0, 100]} className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                      name="Score (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Category Breakdown */}
          {categoryBreakdown && categoryBreakdown.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Category Performance</CardTitle>
                  <CardDescription>Your score breakdown by certification category</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="categoryName" className="text-xs" />
                      <YAxis domain={[0, 100]} className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                        }}
                      />
                      <Bar dataKey="score" fill="hsl(var(--primary))" name="Score (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Questions Distribution</CardTitle>
                  <CardDescription>Total questions answered by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        dataKey="questionsAnswered"
                        nameKey="categoryName"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {categoryBreakdown.map((entry, index) => (
                          <Cell
                            key={`cell-${entry.categoryId}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Study Time Distribution */}
          {studyTimeDistribution && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Study Time by Day of Week</CardTitle>
                  <CardDescription>When you study most effectively</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={studyTimeDistribution.byDayOfWeek}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="day" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                        }}
                      />
                      <Bar dataKey="minutes" fill="hsl(var(--primary))" name="Minutes" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Study Time Summary</CardTitle>
                  <CardDescription>Your study habits at a glance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                    <span className="font-medium">Total Study Time</span>
                    <span className="text-2xl font-bold">
                      {Math.floor(studyTimeDistribution.totalMinutes / 60)}h{' '}
                      {studyTimeDistribution.totalMinutes % 60}m
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                    <span className="font-medium">Average Session</span>
                    <span className="text-2xl font-bold">
                      {studyTimeDistribution.averageSessionMinutes} min
                    </span>
                  </div>
                  {studyConsistency && (
                    <>
                      <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                        <span className="font-medium">Current Streak</span>
                        <span className="text-2xl font-bold">
                          {studyConsistency.currentStreak} days
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                        <span className="font-medium">Longest Streak</span>
                        <span className="text-2xl font-bold">
                          {studyConsistency.longestStreak} days
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Strength & Weakness Analysis */}
          {performanceSummary && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                    Top Performing Categories
                  </CardTitle>
                  <CardDescription>Your strongest areas</CardDescription>
                </CardHeader>
                <CardContent>
                  {performanceSummary.topCategories.length > 0 ? (
                    <div className="space-y-3">
                      {performanceSummary.topCategories.map((cat, index) => (
                        <div key={cat.categoryId} className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{cat.categoryName}</p>
                            <p className="text-sm text-muted-foreground">{cat.score}% accuracy</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4">
                      Complete quizzes to see your top performing categories
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    Areas for Improvement
                  </CardTitle>
                  <CardDescription>Focus on these topics</CardDescription>
                </CardHeader>
                <CardContent>
                  {performanceSummary.weakCategories.length > 0 ? (
                    <div className="space-y-3">
                      {performanceSummary.weakCategories.map((cat, index) => (
                        <div key={cat.categoryId} className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{cat.categoryName}</p>
                            <p className="text-sm text-muted-foreground">{cat.score}% accuracy</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4">
                      Complete more quizzes in different categories to identify areas for
                      improvement
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
