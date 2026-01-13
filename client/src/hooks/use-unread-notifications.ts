import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { useAuth } from '@/lib/auth-provider';
import type { UserBadge, Badge as BadgeType, Notification } from '@shared/schema';

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
 * Polls for unread badges and notifications every 5 seconds
 * Combines achievement badges with general notifications
 *
 * @returns Object containing unreadCount, achievements data, notifications, and loading state
 */
export function useUnreadNotifications() {
  const { user: currentUser } = useAuth();

  // Get achievements to check for unread badge notifications
  // Polling interval of 5 seconds provides good balance between:
  // - User experience (notifications appear quickly)
  // - Server load (reasonable request frequency)
  // - Battery/performance (not too aggressive)
  const { data: achievements, isLoading: isLoadingAchievements } = useQuery<AchievementsData>({
    queryKey: queryKeys.user.achievements(currentUser?.id),
    enabled: !!currentUser?.id,
    refetchInterval: 5000, // 5 seconds
  });

  // Get general notifications (only count, not full data)
  const { data: unreadNotificationCount, isLoading: isLoadingNotifications } = useQuery<number>({
    queryKey: ['notifications', 'unreadCount', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return 0;
      const { storage } = await import('@/lib/storage-factory');
      return storage.getUnreadNotificationCount(currentUser.id);
    },
    enabled: !!currentUser?.id,
    refetchInterval: 5000, // 5 seconds
  });

  // Count unread notifications from badges (legacy achievement notifications)
  const badges = achievements?.badges || [];
  const unreadBadgeCount = badges.filter((b) => !b.isNotified).length;

  // Count unread notifications from notification system
  const unreadNotificationCountValue = unreadNotificationCount || 0;

  // Total unread count
  const unreadCount = unreadBadgeCount + unreadNotificationCountValue;

  return {
    unreadCount,
    unreadBadgeCount,
    unreadNotificationCount: unreadNotificationCountValue,
    achievements,
    notifications: [], // Notifications are not fetched in this hook to improve performance
    isLoading: isLoadingAchievements || isLoadingNotifications,
  };
}
