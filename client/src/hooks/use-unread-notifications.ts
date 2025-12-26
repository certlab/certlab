import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { useAuth } from '@/lib/auth-provider';
import type { UserBadge, Badge as BadgeType } from '@shared/schema';

// Type for the achievements query response
type AchievementsData = {
  badges: Array<UserBadge & { badge: BadgeType; isNotified: boolean }>;
  gameStats: {
    totalPoints: number;
    currentStreak: number;
    longestStreak: number;
    totalBadgesEarned: number;
  };
  newBadges: number;
};

/**
 * Custom hook to get unread notification count
 * Polls achievements endpoint every 5 seconds to check for new badges
 * that haven't been notified to the user yet.
 *
 * @returns Object containing unreadCount, achievements data, and loading state
 */
export function useUnreadNotifications() {
  const { user: currentUser } = useAuth();

  // Get achievements to check for unread notifications
  // Polling interval of 5 seconds provides good balance between:
  // - User experience (notifications appear quickly)
  // - Server load (reasonable request frequency)
  // - Battery/performance (not too aggressive)
  const { data: achievements, isLoading } = useQuery<AchievementsData>({
    queryKey: queryKeys.user.achievements(currentUser?.id),
    enabled: !!currentUser?.id,
    refetchInterval: 5000, // 5 seconds
  });

  // Count unread notifications (badges where isNotified is false)
  const badges = achievements?.badges || [];
  const unreadCount = badges.filter((b) => !b.isNotified).length;

  return {
    unreadCount,
    achievements,
    isLoading,
  };
}
