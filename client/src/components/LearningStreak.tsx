import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-provider';
import { Flame, TrendingUp, Calendar } from 'lucide-react';
import { queryKeys } from '@/lib/queryClient';
import type { UserStats } from '@shared/schema';

export default function LearningStreak() {
  const { user: currentUser } = useAuth();

  const { data: stats } = useQuery<UserStats>({
    queryKey: queryKeys.user.stats(currentUser?.id),
    enabled: !!currentUser?.id,
  });

  if (!stats) {
    return (
      <div className="animate-pulse">
        <div className="h-20 bg-gray-200 rounded-xl w-full"></div>
      </div>
    );
  }

  const streak = stats.studyStreak || 0;
  const getStreakMessage = (streakDays: number) => {
    if (streakDays === 0) return 'Start your learning journey today!';
    if (streakDays === 1) return 'Great start! Keep the momentum going.';
    if (streakDays < 7) return "Building consistency - you're doing great!";
    if (streakDays < 30) return 'Impressive dedication! Keep it up!';
    return "Amazing learning habit! You're unstoppable!";
  };

  const getStreakColor = (streakDays: number) => {
    if (streakDays === 0) return 'text-gray-500';
    if (streakDays < 7) return 'text-orange-500';
    if (streakDays < 30) return 'text-red-500';
    return 'text-red-600';
  };

  const getStreakBgColor = (streakDays: number) => {
    if (streakDays === 0) return 'from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700';
    if (streakDays < 7)
      return 'from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30';
    if (streakDays < 30) return 'from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30';
    return 'from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/40';
  };

  return (
    <Card
      className={`bg-gradient-to-r ${getStreakBgColor(streak)} border-none shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-6`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            {streak > 0 ? (
              <div className="relative">
                <Flame className={`h-8 w-8 ${getStreakColor(streak)} animate-pulse`} />
                {streak >= 7 && (
                  <div className="absolute -top-1 -right-1 animate-bounce">
                    <div className="h-3 w-3 bg-yellow-400 rounded-full border-2 border-white shadow-sm"></div>
                  </div>
                )}
              </div>
            ) : (
              <Calendar className="h-8 w-8 text-gray-400" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-foreground">Learning Streak</h3>
              {streak >= 7 && (
                <Badge
                  variant="secondary"
                  className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                >
                  {streak >= 30 ? '🏆 Champion' : '🔥 Hot Streak'}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{getStreakMessage(streak)}</p>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-bold ${getStreakColor(streak)}`}>{streak}</span>
            <span className="text-sm text-muted-foreground">{streak === 1 ? 'day' : 'days'}</span>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <TrendingUp className="h-3 w-3" />
              <span>Consistent learner</span>
            </div>
          )}
        </div>
      </div>

      {/* Fire icons representing each day of the streak */}
      {streak > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Daily streak visualization</span>
            <span>{streak === 1 ? '1 day' : `${streak} days`}</span>
          </div>
          <div className="flex flex-wrap gap-1 items-center">
            {Array.from({ length: Math.min(streak, 30) }, (_, index) => (
              <span
                key={index}
                className={`text-lg transition-all duration-200 ${
                  index < streak
                    ? index < 7
                      ? 'animate-pulse'
                      : index < 14
                        ? 'animate-bounce'
                        : ''
                    : ''
                }`}
                style={{
                  animationDelay: `${index * 100}ms`,
                  filter: index >= streak ? 'grayscale(100%)' : 'none',
                }}
              >
                🔥
              </span>
            ))}
            {streak > 30 && (
              <div className="flex items-center gap-1 ml-2">
                <span className="text-sm text-muted-foreground">...</span>
                <span className="text-lg animate-pulse">🔥</span>
                <span className="text-xs text-muted-foreground">+{streak - 30}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress indicator for next milestone */}
      {streak > 0 && streak < 30 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Next milestone</span>
            <span>
              {streak < 7
                ? `${7 - streak} days to 1 week`
                : streak < 30
                  ? `${30 - streak} days to 1 month`
                  : 'Amazing dedication!'}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                streak < 7 ? 'bg-orange-400' : 'bg-red-400'
              }`}
              style={{
                width: `${streak < 7 ? (streak / 7) * 100 : ((streak - 7) / 23) * 100}%`,
              }}
            ></div>
          </div>
        </div>
      )}
    </Card>
  );
}
