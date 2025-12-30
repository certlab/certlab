import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History, Clock } from 'lucide-react';
import type { StudyTimerSession } from '@shared/schema';

interface ActivityTimelineProps {
  sessions: StudyTimerSession[];
}

export function ActivityTimeline({ sessions }: ActivityTimelineProps) {
  // Get last 5 completed sessions, sorted by completion date (most recent first)
  const recentSessions = useMemo(() => {
    return sessions
      .filter((s) => s.isCompleted && s.completedAt)
      .sort((a, b) => {
        const dateA = new Date(a.completedAt!).getTime();
        const dateB = new Date(b.completedAt!).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [sessions]);

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getActivityLabel = (session: StudyTimerSession): string => {
    // Use custom label if available, otherwise use default based on session type
    if (session.activityLabel) {
      return session.activityLabel;
    }

    // Fallback to default labels for backward compatibility
    switch (session.sessionType) {
      case 'work':
        return 'Work Session';
      case 'break':
        return 'Short Break';
      case 'long_break':
        return 'Long Break';
      default:
        return 'Activity';
    }
  };

  const formatTimeAgo = (date: Date | string): string => {
    const activityDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - activityDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return activityDate.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentSessions.length > 0 ? (
          <div className="space-y-3">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-1">{getActivityLabel(session)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(session.duration)}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(session.completedAt!)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No completed activities yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Complete your first timer session to see it here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
