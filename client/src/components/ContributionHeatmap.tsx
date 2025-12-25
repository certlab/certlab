import { useState, useMemo } from 'react';
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
          className={`w-2 h-2 sm:w-3 sm:h-3 rounded-sm border border-border/50 transition-all duration-200 ${colorClasses[level]}`}
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
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Check Firebase/Firestore connectivity - required for heatmap functionality
  const isFirebaseAvailable = isCloudSyncAvailable();

  // Fetch user's quizzes to calculate contributions
  // Only fetch if Firebase is available - heatmap requires cloud storage
  const { data: quizzes = [], isLoading } = useQuery<Quiz[]>({
    queryKey: queryKeys.user.quizzes(user?.id),
    enabled: !!user?.id && isFirebaseAvailable,
  });

  // Calculate contribution data
  const { contributionData, availableYears } = useMemo(() => {
    if (!quizzes) {
      return { contributionData: {}, availableYears: [currentYear] };
    }

    const data: ContributionData = {};
    const years = new Set<number>();

    // Process completed quizzes
    quizzes.forEach((quiz) => {
      if (!quiz.completedAt) return;

      const date = new Date(quiz.completedAt);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      years.add(date.getFullYear());

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

    // Ensure current year is always available
    years.add(currentYear);

    return {
      contributionData: data,
      availableYears: Array.from(years).sort((a, b) => b - a), // Most recent first
    };
  }, [quizzes, currentYear]);

  // Calculate total contributions for selected year
  const totalContributions = useMemo(() => {
    return Object.values(contributionData).reduce((total, day) => {
      const date = new Date(day.date);
      if (date.getFullYear() === selectedYear) {
        return total + day.count;
      }
      return total;
    }, 0);
  }, [contributionData, selectedYear]);

  // Generate calendar grid for selected year
  const calendarGrid = useMemo(() => {
    const startDate = new Date(selectedYear, 0, 1); // January 1st of selected year
    const endDate = new Date(selectedYear, 11, 31); // December 31st of selected year

    // Adjust start date to the previous Sunday to align grid
    const startDay = startDate.getDay();
    if (startDay !== 0) {
      startDate.setDate(startDate.getDate() - startDay);
    }

    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate || currentWeek.length < 7) {
      currentWeek.push(new Date(currentDate));

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      currentDate.setDate(currentDate.getDate() + 1);

      // Stop if we've gone too far into the next year
      if (currentDate.getFullYear() > selectedYear && currentWeek.length === 0) {
        break;
      }
    }

    return weeks;
  }, [selectedYear]);

  // For mobile, show only recent weeks to fit in viewport
  const mobileWeeksToShow = 16; // ~4 months
  const mobileCalendarGrid = useMemo(() => {
    // Show the most recent weeks for current year, or last weeks for past years
    const isCurrentYear = selectedYear === new Date().getFullYear();
    if (isCurrentYear) {
      // Show last N weeks up to today
      return calendarGrid.slice(-mobileWeeksToShow);
    } else {
      // For past years, show last N weeks of that year
      return calendarGrid.slice(-mobileWeeksToShow);
    }
  }, [calendarGrid, selectedYear, mobileWeeksToShow]);

  // Get contribution level (0-4) based on count
  const getContributionLevel = (count: number): number => {
    if (count === 0) return 0;
    if (count === 1) return 1;
    if (count <= 3) return 2;
    if (count <= 6) return 3;
    return 4;
  };

  // Generate month labels
  const monthLabels = useMemo(() => {
    const labels: { month: string; offset: number }[] = [];
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    let lastMonth = -1;
    calendarGrid.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0];
      const month = firstDayOfWeek.getMonth();

      if (month !== lastMonth && firstDayOfWeek.getFullYear() === selectedYear) {
        labels.push({
          month: months[month],
          offset: weekIndex,
        });
        lastMonth = month;
      }
    });

    return labels;
  }, [calendarGrid, selectedYear]);

  // Generate month labels for mobile (based on mobileCalendarGrid)
  const mobileMonthLabels = useMemo(() => {
    const labels: { month: string; offset: number }[] = [];
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    let lastMonth = -1;
    mobileCalendarGrid.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0];
      const month = firstDayOfWeek.getMonth();

      if (month !== lastMonth && firstDayOfWeek.getFullYear() === selectedYear) {
        labels.push({
          month: months[month],
          offset: weekIndex,
        });
        lastMonth = month;
      }
    });

    return labels;
  }, [mobileCalendarGrid, selectedYear]);

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
                  Note: Local browser storage (IndexedDB) is used only for caching and offline
                  access, not as the primary data source for this feature.
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base sm:text-xl">
            {totalContributions} {totalContributions === 1 ? 'activity' : 'activities'} in{' '}
            {selectedYear}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Your learning activity throughout the year
          </CardDescription>
        </div>
        <div className="flex gap-2" role="radiogroup" aria-label="Select year">
          {availableYears.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => setSelectedYear(year)}
              role="radio"
              aria-checked={selectedYear === year}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                selectedYear === year
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={100}>
          <div className="space-y-2">
            {/* Desktop view - show full year */}
            <div className="hidden sm:block w-full">
              {/* Month labels */}
              <div className="flex gap-[3px] pl-8 text-xs text-muted-foreground mb-1">
                {monthLabels.map((label, index) => {
                  const prevOffset = index > 0 ? monthLabels[index - 1].offset : 0;
                  const WEEK_WIDTH = 15; // 12px cell + 3px gap
                  const spacing = (label.offset - prevOffset) * WEEK_WIDTH;
                  return (
                    <div
                      key={label.month}
                      className="text-xs whitespace-nowrap"
                      style={{
                        marginLeft: label.offset === 0 ? 0 : `${spacing}px`,
                      }}
                    >
                      {label.month}
                    </div>
                  );
                })}
              </div>

              {/* Calendar grid */}
              <div className="flex gap-2">
                {/* Day labels */}
                <div className="flex flex-col gap-[3px] text-xs text-muted-foreground pr-1">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="h-3 flex items-center">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Activity grid */}
                <div className="flex gap-[3px]" role="grid" aria-label="Activity heatmap">
                  {calendarGrid.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-[3px]" role="row">
                      {week.map((date, dayIndex) => {
                        const dateKey = date.toISOString().split('T')[0];
                        const contribution = contributionData[dateKey];
                        const level = getContributionLevel(contribution?.count || 0);
                        const isCurrentYear = date.getFullYear() === selectedYear;

                        return isCurrentYear ? (
                          <HeatmapCell
                            key={dayIndex}
                            date={date}
                            contribution={contribution}
                            level={level}
                          />
                        ) : (
                          <div key={dayIndex} className="w-3 h-3 rounded-sm" aria-hidden="true" />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile view - show recent weeks only */}
            <div className="block sm:hidden w-full">
              {/* Month labels */}
              <div className="flex gap-[2px] pl-6 text-[10px] text-muted-foreground mb-1">
                {mobileMonthLabels.map((label, index) => {
                  const prevOffset = index > 0 ? mobileMonthLabels[index - 1].offset : 0;
                  const MOBILE_WEEK_WIDTH = 10; // 8px cell + 2px gap
                  const spacing = (label.offset - prevOffset) * MOBILE_WEEK_WIDTH;
                  return (
                    <div
                      key={label.month}
                      className="text-[10px] whitespace-nowrap"
                      style={{
                        marginLeft: label.offset === 0 ? 0 : `${spacing}px`,
                      }}
                    >
                      {label.month}
                    </div>
                  );
                })}
              </div>

              {/* Calendar grid */}
              <div className="flex gap-1">
                {/* Day labels - abbreviated */}
                <div className="flex flex-col gap-[2px] text-[9px] text-muted-foreground pr-0.5">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                    <div key={idx} className="h-2 flex items-center">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Activity grid - show limited weeks */}
                <div className="flex gap-[2px]" role="grid" aria-label="Activity heatmap">
                  {mobileCalendarGrid.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-[2px]" role="row">
                      {week.map((date, dayIndex) => {
                        const dateKey = date.toISOString().split('T')[0];
                        const contribution = contributionData[dateKey];
                        const level = getContributionLevel(contribution?.count || 0);
                        const isCurrentYear = date.getFullYear() === selectedYear;

                        return isCurrentYear ? (
                          <HeatmapCell
                            key={dayIndex}
                            date={date}
                            contribution={contribution}
                            level={level}
                          />
                        ) : (
                          <div key={dayIndex} className="w-2 h-2 rounded-sm" aria-hidden="true" />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Legend - responsive sizing */}
            <div className="flex items-center gap-1.5 sm:gap-2 pt-2 text-[10px] sm:text-xs text-muted-foreground">
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
