import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-provider';
import { clientStorage } from '@/lib/client-storage';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Clock, FileText, Trophy, AlertCircle, CheckCircle } from 'lucide-react';
import type { Category, PracticeTest, PracticeTestAttempt, Quiz } from '@shared/schema';

interface PracticeTestWithStats extends PracticeTest {
  totalAttempts?: number;
  averageScore?: number;
}

interface UserAttemptWithTest extends PracticeTestAttempt {
  test?: PracticeTest;
}

// Helper function to start a practice test
async function startPracticeTest(userId: string, test: PracticeTest): Promise<Quiz> {
  // Get current user to determine tenant
  const user = await clientStorage.getUser(userId);
  const tenantId = user?.tenantId || 1;

  // Check if there are questions available for this test
  const questions = await clientStorage.getQuestionsByCategories(
    test.categoryIds,
    undefined,
    undefined,
    tenantId
  );

  if (questions.length === 0) {
    throw new Error('No questions available for this practice test');
  }

  // Create a quiz based on the practice test configuration
  const quiz = await clientStorage.createQuiz({
    userId: userId,
    tenantId: tenantId,
    title: test.name,
    categoryIds: test.categoryIds,
    subcategoryIds: [],
    questionCount: Math.min(test.questionCount, questions.length),
    timeLimit: test.timeLimit,
    mode: 'quiz',
  });

  // Create a practice test attempt
  await clientStorage.createPracticeTestAttempt({
    userId: userId,
    testId: test.id,
    quizId: quiz.id,
    tenantId: tenantId,
  });

  return quiz;
}

export default function PracticeTestMode() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedTest, setSelectedTest] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const { user: currentUser } = useAuth();

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: queryKeys.categories.all(),
  });

  // Fetch practice tests from API
  const { data: practiceTests = [], isLoading: isLoadingTests } = useQuery<PracticeTestWithStats[]>(
    {
      queryKey: queryKeys.practiceTests.all(),
    }
  );

  // Fetch user's practice test attempts
  const { data: userAttempts = [] } = useQuery<UserAttemptWithTest[]>({
    queryKey: currentUser ? queryKeys.user.practiceTestAttempts(currentUser.id) : [],
    enabled: !!currentUser,
  });

  const startPracticeTestMutation = useMutation({
    mutationFn: async (testId: number) => {
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get the practice test details
      const test = await clientStorage.getPracticeTest(testId);
      if (!test) {
        throw new Error('Practice test not found');
      }

      return startPracticeTest(currentUser.id, test);
    },
    onSuccess: (quiz) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all(currentUser?.id) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.practiceTestAttempts(currentUser?.id),
      });
      setLocation(`/app/quiz/${quiz.id}`);
    },
    onError: (error: any) => {
      const message = error.message || 'Failed to start practice test. Please try again.';
      toast({
        title: 'Cannot Start Practice Test',
        description: message.includes('No questions')
          ? "This practice test doesn't have any questions available yet. Please try a different test."
          : message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsCreating(false);
    },
  });

  const handleStartTest = (test: PracticeTestWithStats) => {
    if (!currentUser) {
      toast({
        title: 'Login Required',
        description: 'Please log in to take practice tests.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    startPracticeTestMutation.mutate(test.id);
  };

  // Function to get user's best score for a test
  const getUserBestScore = (testId: number) => {
    const attempts = userAttempts.filter((a) => a.testId === testId && a.score !== null);
    if (attempts.length === 0) return undefined;
    return Math.max(...attempts.map((a) => a.score || 0));
  };

  // Function to get user's last attempt for a test
  const getUserLastAttempt = (testId: number) => {
    const attempts = userAttempts.filter((a) => a.testId === testId);
    if (attempts.length === 0) return undefined;
    const lastAttempt = attempts.sort(
      (a, b) => new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime()
    )[0];
    return lastAttempt?.startedAt ? getRelativeTime(new Date(lastAttempt.startedAt)) : undefined;
  };

  // Helper function for relative time
  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'Hard':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'Mixed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  // WCAG AA compliant score colors with dark mode variants
  const getScoreColor = (score: number, passingScore: number | null) => {
    const threshold = passingScore ?? 70; // Default to 70 if null
    if (score >= threshold) return 'text-green-600 dark:text-green-400';
    if (score >= threshold - 10) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getCategoryNames = (categoryIds: number[]) => {
    return categoryIds
      .map((id) => categories.find((cat) => cat.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  return (
    <Card className="h-full overflow-hidden border-2 border-blue-200/50 dark:border-blue-800/30 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-b border-blue-100 dark:border-blue-900/50">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md">
            <FileText className="h-4 w-4 text-white" />
          </div>
          Practice Test Mode
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Take full-length practice exams that simulate real certification tests
        </p>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Quick Start */}
        <div className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/40 dark:to-purple-900/40 rounded-lg p-5 border border-blue-200/70 dark:border-blue-700/50 shadow-sm">
          <h3 className="font-semibold text-sm mb-3 text-blue-900 dark:text-blue-100 flex items-center gap-2">
            <span
              className="inline-block w-2 h-2 bg-blue-500 rounded-full motion-safe:animate-pulse"
              aria-hidden="true"
            ></span>
            Quick Practice Test
          </h3>
          <div className="flex gap-3">
            <Select value={selectedTest} onValueChange={setSelectedTest}>
              <SelectTrigger className="flex-1 bg-white dark:bg-gray-900 border-blue-200 dark:border-blue-700 focus:ring-blue-500">
                <SelectValue placeholder="Choose a certification" />
              </SelectTrigger>
              <SelectContent className="z-50">
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="default"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 px-6"
              disabled={!selectedTest || isCreating}
              onClick={async () => {
                if (!currentUser) {
                  toast({
                    title: 'Login Required',
                    description: 'Please log in to take practice tests.',
                    variant: 'destructive',
                  });
                  return;
                }

                setIsCreating(true);
                try {
                  // Create a quick practice test on-demand
                  const test = await clientStorage.createPracticeTest({
                    name: `Quick ${categories.find((c) => c.id.toString() === selectedTest)?.name} Test`,
                    description: 'Quick practice test',
                    categoryIds: [parseInt(selectedTest)],
                    questionCount: 25,
                    timeLimit: 30,
                    difficulty: 'Mixed',
                    passingScore: 70,
                  });

                  // Start the practice test using the shared helper
                  const quiz = await startPracticeTest(currentUser.id, test);

                  queryClient.invalidateQueries({ queryKey: queryKeys.practiceTests.all() });
                  queryClient.invalidateQueries({
                    queryKey: queryKeys.user.practiceTestAttempts(currentUser.id),
                  });
                  setLocation(`/app/quiz/${quiz.id}`);
                } catch (error: any) {
                  toast({
                    title: 'Error',
                    description: error.message || 'Failed to start quick test. Please try again.',
                    variant: 'destructive',
                  });
                } finally {
                  setIsCreating(false);
                }
              }}
            >
              {isCreating ? 'Starting...' : 'Start'}
            </Button>
          </div>
        </div>

        {/* Practice Tests */}
        <div className="space-y-4">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <span className="inline-block w-1.5 h-6 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></span>
            Available Practice Tests
          </h3>
          {isLoadingTests ? (
            // Loading state
            <div className="grid gap-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : practiceTests.length === 0 ? (
            // Empty state
            <div className="text-center py-8 text-muted-foreground bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-900/50 dark:to-slate-900/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <div className="p-3 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full inline-block mb-3">
                <FileText className="h-8 w-8 opacity-50" />
              </div>
              <p className="text-sm font-medium">No practice tests available yet.</p>
              <p className="text-xs mt-1 text-muted-foreground/80">
                Create one using the quick test above!
              </p>
            </div>
          ) : (
            // Show practice tests
            <div className="grid gap-4">
              {practiceTests.map((test) => {
                const userBestScore = getUserBestScore(test.id);
                const userLastAttempt = getUserLastAttempt(test.id);
                const userAttemptCount = userAttempts.filter((a) => a.testId === test.id).length;

                return (
                  <Card
                    key={test.id}
                    className="border-2 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-200 hover:shadow-md"
                  >
                    <CardContent className="p-5">
                      <div className="space-y-4">
                        {/* Test Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-base text-foreground">{test.name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{test.description}</p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                              {getCategoryNames(test.categoryIds)}
                            </p>
                          </div>
                          <Badge
                            className={`text-xs font-semibold ${getDifficultyColor(test.difficulty)}`}
                          >
                            {test.difficulty}
                          </Badge>
                        </div>

                        {/* Test Stats */}
                        <div className="grid grid-cols-3 gap-4 text-sm bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                          <div className="text-center">
                            <div className="font-bold text-blue-600 dark:text-blue-400">
                              {test.questionCount}
                            </div>
                            <div className="text-muted-foreground text-xs">Questions</div>
                          </div>
                          <div className="text-center border-x border-slate-200 dark:border-slate-700">
                            <div className="font-bold text-purple-600 dark:text-purple-400">
                              {test.timeLimit}m
                            </div>
                            <div className="text-muted-foreground text-xs">Time Limit</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-green-600 dark:text-green-400">
                              {test.passingScore ?? 70}%
                            </div>
                            <div className="text-muted-foreground text-xs">Pass Score</div>
                          </div>
                        </div>

                        {/* Progress & Results */}
                        {userAttemptCount > 0 && userBestScore !== undefined && (
                          <div className="space-y-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-100 dark:border-blue-900">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">
                                Best Score:
                                <span
                                  className={`ml-1 font-bold ${getScoreColor(userBestScore, test.passingScore)}`}
                                >
                                  {userBestScore}%
                                </span>
                              </span>
                              <span className="text-muted-foreground text-xs bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                {userAttemptCount} attempt{userAttemptCount > 1 ? 's' : ''}
                              </span>
                            </div>
                            <Progress
                              value={(userBestScore / (test.passingScore ?? 70)) * 100}
                              className="h-2"
                            />
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              {userBestScore >= (test.passingScore ?? 70) ? (
                                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />
                              )}
                              <span>Last attempt: {userLastAttempt}</span>
                            </div>
                          </div>
                        )}

                        {/* Action Button */}
                        <Button
                          size="default"
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                          onClick={() => handleStartTest(test)}
                          disabled={isCreating}
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          {userAttemptCount > 0 ? 'Retake Test' : 'Start Test'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Practice Test Tips */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl p-5 border border-amber-200/70 dark:border-amber-800/50 shadow-sm">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-amber-900 dark:text-amber-100">
            <div className="p-1.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-md">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            Practice Test Tips
          </h4>
          <ul className="text-sm text-amber-800 dark:text-amber-200/90 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              <span>Simulate real exam conditions - find a quiet environment</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              <span>Time yourself strictly - don't pause during the test</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              <span>Review explanations after completing the full test</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              <span>Focus on areas where you score below 70%</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              <span>Take multiple attempts to track improvement</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
