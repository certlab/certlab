/**
 * Analytics & Reporting Dashboard
 *
 * Provides comprehensive reporting for authors/admins:
 * - Learner progress tracking
 * - Engagement metrics
 * - Quiz performance analysis
 * - Export capabilities (CSV, Excel, Print)
 * - Filtering and segmentation
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-provider';
import { queryKeys } from '@/lib/queryClient';
import { analyticsReportingService, type ReportFilters } from '@/lib/analytics-reporting-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
import {
  Download,
  Printer,
  FileSpreadsheet,
  Users,
  TrendingUp,
  Activity,
  Target,
  Calendar as CalendarIcon,
  Filter,
  BarChart3,
  Award,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Quiz, User, MasteryScore, UserProgress, Category } from '@shared/schema';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function ReportingDashboard() {
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [materialType, setMaterialType] = useState<string>('all');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

  // Check if user has admin/author permissions
  const isAdmin = user?.role === 'admin';

  // Fetch all required data
  const { data: quizzes = [] } = useQuery<Quiz[]>({
    queryKey: queryKeys.quizzes.all(),
    enabled: isAdmin,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: queryKeys.users.all(),
    enabled: isAdmin,
  });

  const { data: masteryScores = [] } = useQuery<MasteryScore[]>({
    queryKey: queryKeys.mastery.all(),
    enabled: isAdmin,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: queryKeys.categories.all(),
  });

  // Build filters
  const filters: ReportFilters = useMemo(
    () => ({
      dateFrom,
      dateTo,
      materialType: materialType as any,
      categoryIds: selectedCategories.length > 0 ? selectedCategories : undefined,
    }),
    [dateFrom, dateTo, materialType, selectedCategories]
  );

  // Generate reports
  const learnerProgressReport = useMemo(
    () =>
      analyticsReportingService.generateLearnerProgressReport(
        users,
        quizzes,
        masteryScores,
        filters
      ),
    [users, quizzes, masteryScores, filters]
  );

  const quizPerformanceReport = useMemo(
    () => analyticsReportingService.generateQuizPerformanceReport(quizzes, filters),
    [quizzes, filters]
  );

  const engagementMetrics = useMemo(
    () => analyticsReportingService.generateEngagementMetrics(users, quizzes, filters),
    [users, quizzes, filters]
  );

  // Export handlers
  const handleExportCSV = (data: any[], filename: string) => {
    analyticsReportingService.exportToCSV(data, filename);
  };

  const handlePrint = (title: string, data: any[]) => {
    analyticsReportingService.openPrintView(title, data);
  };

  // Show access denied for non-admins
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Admin Access Required</h3>
              <p className="text-muted-foreground">
                This reporting dashboard is only accessible to administrators and instructors.
              </p>
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Analytics & Reporting</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into learner progress and engagement
          </p>
        </div>

        {/* Filters Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Date From */}
              <div className="space-y-2">
                <label className="text-sm font-medium">From Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !dateFrom && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <label className="text-sm font-medium">To Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !dateTo && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Material Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Material Type</label>
                <Select value={materialType} onValueChange={setMaterialType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="quiz">Quizzes Only</SelectItem>
                    <SelectItem value="challenge">Challenges Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              <div className="space-y-2">
                <label className="text-sm font-medium invisible">Actions</label>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setDateFrom(undefined);
                    setDateTo(undefined);
                    setMaterialType('all');
                    setSelectedCategories([]);
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{engagementMetrics.totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {engagementMetrics.activeUsers} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" />
                Total Quizzes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{engagementMetrics.totalQuizzes}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {engagementMetrics.completedQuizzes} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Avg Session Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{engagementMetrics.averageSessionTime}</div>
              <p className="text-xs text-muted-foreground mt-1">minutes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {engagementMetrics.totalQuizzes > 0
                  ? Math.round(
                      (engagementMetrics.completedQuizzes / engagementMetrics.totalQuizzes) * 100
                    )
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground mt-1">overall</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Different Reports */}
        <Tabs defaultValue="engagement" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="learners">Learners</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* Engagement Tab */}
          <TabsContent value="engagement" className="space-y-4">
            {/* Engagement Over Time Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Engagement Over Time</CardTitle>
                    <CardDescription>Daily quiz activity and user participation</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleExportCSV(
                          engagementMetrics.engagementOverTime,
                          'engagement-over-time'
                        )
                      }
                    >
                      <Download className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={engagementMetrics.engagementOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="quizzes" stroke="#0088FE" name="Quizzes" />
                    <Line type="monotone" dataKey="users" stroke="#00C49F" name="Active Users" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Daily Active Users */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Daily Active Users</CardTitle>
                    <CardDescription>Unique users active per day</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleExportCSV(engagementMetrics.dailyActiveUsers, 'daily-active-users')
                      }
                    >
                      <Download className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={engagementMetrics.dailyActiveUsers}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" name="Users" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Completion Rate by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Completion Rate by Category</CardTitle>
                <CardDescription>Category-wise quiz completion rates</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={engagementMetrics.completionRateByCategory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="categoryName" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="rate" fill="#82ca9d" name="Completion %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Learners Tab */}
          <TabsContent value="learners" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Learner Progress Report</CardTitle>
                    <CardDescription>Individual learner performance and progress</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleExportCSV(learnerProgressReport, 'learner-progress-report')
                      }
                    >
                      <Download className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrint('Learner Progress Report', learnerProgressReport)}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Learner</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-right">Total Quizzes</TableHead>
                        <TableHead className="text-right">Completed</TableHead>
                        <TableHead className="text-right">Avg Score</TableHead>
                        <TableHead className="text-right">Completion %</TableHead>
                        <TableHead className="text-right">Time Spent</TableHead>
                        <TableHead>Last Active</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {learnerProgressReport.slice(0, 10).map((learner) => (
                        <TableRow key={learner.userId}>
                          <TableCell className="font-medium">{learner.userName}</TableCell>
                          <TableCell>{learner.email}</TableCell>
                          <TableCell className="text-right">{learner.totalQuizzes}</TableCell>
                          <TableCell className="text-right">{learner.completedQuizzes}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={learner.averageScore >= 80 ? 'default' : 'secondary'}>
                              {learner.averageScore}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{learner.completionRate}%</TableCell>
                          <TableCell className="text-right">{learner.timeSpent} min</TableCell>
                          <TableCell>
                            {learner.lastActive
                              ? format(learner.lastActive, 'MMM d, yyyy')
                              : 'Never'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {learnerProgressReport.length > 10 && (
                  <div className="mt-4 text-center text-sm text-muted-foreground">
                    Showing 10 of {learnerProgressReport.length} learners. Export CSV for full
                    report.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Quiz Performance Report</CardTitle>
                    <CardDescription>Detailed quiz performance metrics</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleExportCSV(quizPerformanceReport, 'quiz-performance-report')
                      }
                    >
                      <Download className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrint('Quiz Performance Report', quizPerformanceReport)}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quiz Title</TableHead>
                        <TableHead className="text-right">Attempts</TableHead>
                        <TableHead className="text-right">Unique Users</TableHead>
                        <TableHead className="text-right">Avg Score</TableHead>
                        <TableHead className="text-right">Completion %</TableHead>
                        <TableHead className="text-right">Avg Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quizPerformanceReport.slice(0, 10).map((quiz, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{quiz.quizTitle}</TableCell>
                          <TableCell className="text-right">{quiz.totalAttempts}</TableCell>
                          <TableCell className="text-right">{quiz.uniqueUsers}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={quiz.averageScore >= 80 ? 'default' : 'secondary'}>
                              {quiz.averageScore}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{quiz.completionRate}%</TableCell>
                          <TableCell className="text-right">{quiz.averageTimeSpent} min</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {quizPerformanceReport.length > 10 && (
                  <div className="mt-4 text-center text-sm text-muted-foreground">
                    Showing 10 of {quizPerformanceReport.length} quizzes. Export CSV for full
                    report.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Score Distribution for Selected Quiz */}
            {quizPerformanceReport.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Score Distribution</CardTitle>
                  <CardDescription>Distribution of quiz scores across all quizzes</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={quizPerformanceReport[0].scoreDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" name="Number of Scores" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
