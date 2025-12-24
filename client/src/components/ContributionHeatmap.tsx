import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-provider';
import { queryKeys } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
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
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`w-3 h-3 rounded-sm border border-border/50 transition-all duration-200 cursor-pointer ${colorClasses[level]}`}
            role="gridcell"
            aria-label={tooltipContent}
            tabIndex={0}
          />
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
    </TooltipProvider>
  );
}

export default function ContributionHeatmap() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Fetch user's quizzes to calculate contributions
  const { data: quizzes = [], isLoading } = useQuery<Quiz[]>({
    queryKey: queryKeys.user.quizzes(user?.id),
    enabled: !!user?.id,
  });

  // Calculate contribution data
  const { contributionData, totalContributions, availableYears } = useMemo(() => {
    if (!quizzes) {
      return { contributionData: {}, totalContributions: 0, availableYears: [currentYear] };
    }

    const data: ContributionData = {};
    const years = new Set<number>();
    let total = 0;

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
      total += 1;

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
      totalContributions: total,
      availableYears: Array.from(years).sort((a, b) => b - a), // Most recent first
    };
  }, [quizzes, currentYear]);

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
          <CardTitle>
            {totalContributions} {totalContributions === 1 ? 'activity' : 'activities'} in{' '}
            {selectedYear}
          </CardTitle>
          <CardDescription>Your learning activity throughout the year</CardDescription>
        </div>
        <div className="flex gap-2">
          {availableYears.map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
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
        <div className="space-y-2">
          {/* Month labels */}
          <div className="flex gap-[3px] pl-8 text-xs text-muted-foreground">
            {monthLabels.map((label) => (
              <div
                key={label.month}
                className="text-xs"
                style={{
                  marginLeft:
                    label.offset === 0
                      ? 0
                      : `${(label.offset - (monthLabels[monthLabels.indexOf(label) - 1]?.offset || 0)) * 12.5}px`,
                }}
              >
                {label.month}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="flex gap-2">
            {/* Day labels */}
            <div className="flex flex-col gap-[3px] text-xs text-muted-foreground justify-around pr-1">
              <div className="h-3 flex items-center">Mon</div>
              <div className="h-3 flex items-center">Wed</div>
              <div className="h-3 flex items-center">Fri</div>
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

                    return (
                      <div key={dayIndex} role="gridcell">
                        {isCurrentYear ? (
                          <HeatmapCell date={date} contribution={contribution} level={level} />
                        ) : (
                          <div className="w-3 h-3 rounded-sm border border-transparent" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              <div
                className="w-3 h-3 rounded-sm bg-muted border border-border/50"
                aria-label="No activity"
              />
              <div
                className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900/40 border border-border/50"
                aria-label="Low activity"
              />
              <div
                className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-700/60 border border-border/50"
                aria-label="Medium activity"
              />
              <div
                className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-600/80 border border-border/50"
                aria-label="High activity"
              />
              <div
                className="w-3 h-3 rounded-sm bg-green-700 dark:bg-green-500 border border-border/50"
                aria-label="Very high activity"
              />
            </div>
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
