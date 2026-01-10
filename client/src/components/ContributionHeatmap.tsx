import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-provider';
import { queryKeys } from '@/lib/queryClient';
import { isCloudSyncAvailable } from '@/lib/storage-factory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CloudOff, AlertTriangle } from 'lucide-react';
import type { Quiz } from '@shared/schema';

interface DailyContribution {
  date: string; // YYYY-MM-DD format
  count: number;
  activities: string[]; // descriptions of activities
}

interface ContributionData {
  [date: string]: DailyContribution;
}

interface HeatmapCellProps {
  date: Date;
  contribution: DailyContribution | undefined;
  level: number;
}

function HeatmapCell({ date, contribution, level }: HeatmapCellProps) {
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const count = contribution?.count || 0;

  // Color levels: 0 = no activity, 1-4 = increasing green intensity
  const colorClasses = [
    'bg-muted hover:bg-muted/80', // Level 0: No activity
    'bg-green-200 dark:bg-green-900/40 hover:bg-green-300 dark:hover:bg-green-800/50', // Level 1: Low
    'bg-green-400 dark:bg-green-700/60 hover:bg-green-500 dark:hover:bg-green-600/70', // Level 2: Medium
    'bg-green-600 dark:bg-green-600/80 hover:bg-green-700 dark:hover:bg-green-500/90', // Level 3: High
    'bg-green-700 dark:bg-green-500 hover:bg-green-800 dark:hover:bg-green-400', // Level 4: Very high
  ];

  const tooltipContent =
    count === 0
      ? `No activity on ${dateStr}`
      : `${count} ${count === 1 ? 'activity' : 'activities'} on ${dateStr}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`w-full aspect-square rounded-sm border border-border/50 transition-all duration-200 ${colorClasses[level]}`}
          aria-label={tooltipContent}
        >
          <span className="sr-only">{tooltipContent}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="text-sm">
          <p className="font-semibold">{dateStr}</p>
          <p className="text-muted-foreground">
            {count} {count === 1 ? 'activity' : 'activities'}
          </p>
          {contribution && contribution.activities.length > 0 && (
            <ul className="mt-1 text-xs text-muted-foreground">
              {contribution.activities.slice(0, 3).map((activity, idx) => (
                <li key={idx}>• {activity}</li>
              ))}
              {contribution.activities.length > 3 && (
                <li>• and {contribution.activities.length - 3} more...</li>
              )}
            </ul>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export default function ContributionHeatmap() {
  const { user } = useAuth();

  // Check Firebase/Firestore connectivity - required for heatmap functionality
  const isFirebaseAvailable = isCloudSyncAvailable();

  // Fetch user's quizzes to calculate contributions
  // Only fetch if Firebase is available - heatmap requires cloud storage
  const { data: quizzes = [], isLoading } = useQuery<Quiz[]>({
    queryKey: queryKeys.user.quizzes(user?.id),
    enabled: !!user?.id && isFirebaseAvailable,
  });

  // Calculate contribution data
  const contributionData = useMemo(() => {
    if (!quizzes) {
      return {};
    }

    const data: ContributionData = {};

    // Process completed quizzes
    quizzes.forEach((quiz) => {
      if (!quiz.completedAt) return;

      const date = new Date(quiz.completedAt);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!data[dateKey]) {
        data[dateKey] = {
          date: dateKey,
          count: 0,
          activities: [],
        };
      }

      data[dateKey].count += 1;

      const activityDesc =
        quiz.mode === 'challenge'
          ? 'Completed a challenge'
          : quiz.isPassing
            ? `Passed quiz: ${quiz.title}`
            : `Completed quiz: ${quiz.title}`;

      data[dateKey].activities.push(activityDesc);
    });

    return data;
  }, [quizzes]);

  // Generate last 28 days array (4 weeks)
  const last28Days = useMemo(() => {
    const days: Date[] = [];
    const today = new Date();

    // Generate the last 28 days (including today)
    for (let i = 27; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push(date);
    }

    return days;
  }, []);

  // Organize days into 4 rows of 7 days each
  const gridRows = useMemo(() => {
    const rows: Date[][] = [];
    for (let i = 0; i < 4; i++) {
      rows.push(last28Days.slice(i * 7, (i + 1) * 7));
    }
    return rows;
  }, [last28Days]);

  // Calculate total contributions for last 28 days
  const totalContributions = useMemo(() => {
    return last28Days.reduce((total, date) => {
      const dateKey = date.toISOString().split('T')[0];
      const contribution = contributionData[dateKey];
      return total + (contribution?.count || 0);
    }, 0);
  }, [contributionData, last28Days]);

  // Get contribution level (0-4) based on count
  const getContributionLevel = (count: number): number => {
    if (count === 0) return 0;
    if (count === 1) return 1;
    if (count <= 3) return 2;
    if (count <= 6) return 3;
    return 4;
  };

  // Show Firebase connectivity error if Firebase is not available
  if (!isFirebaseAvailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudOff className="h-5 w-5" />
            Activity Level
          </CardTitle>
          <CardDescription>Firebase connectivity required</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Firebase Not Connected</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                The activity heatmap requires full Firebase/Firestore connectivity to display your
                learning progress across devices.
              </p>
              <p className="text-sm">
                <strong>To enable this feature:</strong>
              </p>
              <ul className="text-sm list-disc list-inside mt-1 space-y-1">
                <li>Ensure Firebase is properly configured with valid credentials</li>
                {!user ? (
                  <li>Sign in with your Firebase account to enable cloud sync</li>
                ) : (
                  <li>
                    Firebase connectivity lost. Please check your internet connection and refresh
                    the page
                  </li>
                )}
              </ul>
              <p className="text-sm mt-3 text-muted-foreground">
                <em>
                  Note: Firestore SDK automatically caches data for offline viewing.
                </em>
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Level</CardTitle>
          <CardDescription>Loading your activity history...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-base sm:text-xl">
            {totalContributions} {totalContributions === 1 ? 'activity' : 'activities'} in last 28
            days
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Your learning activity over the past 4 weeks
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={100}>
          <div className="space-y-4">
            {/* 28-day activity grid - 4 rows of 7 boxes */}
            <div className="w-full">
              <div
                className="flex flex-col gap-2 sm:gap-3"
                role="grid"
                aria-label="Activity heatmap"
              >
                {gridRows.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex gap-2 sm:gap-3" role="row">
                    {week.map((date, dayIndex) => {
                      const dateKey = date.toISOString().split('T')[0];
                      const contribution = contributionData[dateKey];
                      const level = getContributionLevel(contribution?.count || 0);

                      return (
                        <HeatmapCell
                          key={dayIndex}
                          date={date}
                          contribution={contribution}
                          level={level}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-0.5 sm:gap-1">
                <div
                  className="w-2 h-2 sm:w-3 sm:h-3 rounded-sm bg-muted border border-border/50"
                  aria-label="No activity"
                />
                <div
                  className="w-2 h-2 sm:w-3 sm:h-3 rounded-sm bg-green-200 dark:bg-green-900/40 border border-border/50"
                  aria-label="Low activity"
                />
                <div
                  className="w-2 h-2 sm:w-3 sm:h-3 rounded-sm bg-green-400 dark:bg-green-700/60 border border-border/50"
                  aria-label="Medium activity"
                />
                <div
                  className="w-2 h-2 sm:w-3 sm:h-3 rounded-sm bg-green-600 dark:bg-green-600/80 border border-border/50"
                  aria-label="High activity"
                />
                <div
                  className="w-2 h-2 sm:w-3 sm:h-3 rounded-sm bg-green-700 dark:bg-green-500 border border-border/50"
                  aria-label="Very high activity"
                />
              </div>
              <span>More</span>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
