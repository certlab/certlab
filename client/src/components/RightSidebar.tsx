import { useEffect, useState } from 'react';
import { useRightSidebar } from '@/lib/right-sidebar-provider';
import { useAuth } from '@/lib/auth-provider';
import { useTheme } from '@/lib/theme-provider';
import { themes } from '@/lib/theme-constants';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { cn, getInitials, getUserDisplayName } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { X, LogOut, User, Trophy, Bell, Settings, Check, Palette, Star } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { storage } from '@/lib/storage-factory';
import { useUnreadNotifications } from '@/hooks/use-unread-notifications';

function SettingsPanel() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex aspect-square size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg">
          <Settings className="size-5" />
        </div>
        <div>
          <h2 className="font-semibold">Settings</h2>
          <p className="text-xs text-muted-foreground">Customize your experience</p>
        </div>
      </div>

      <ScrollArea className="flex-1 -mx-4 px-4">
        <div className="space-y-6">
          {/* Theme Selection */}
          <div>
            <h3 className="text-sm font-medium mb-3">Theme</h3>
            <div className="grid grid-cols-1 gap-2 p-0.5">
              {themes.map((themeOption) => {
                const Icon = themeOption.icon;
                const isSelected = theme === themeOption.value;
                return (
                  <button
                    key={themeOption.value}
                    onClick={() => setTheme(themeOption.value)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl text-left transition-all',
                      'hover:bg-accent/50',
                      isSelected && 'bg-accent ring-2 ring-primary'
                    )}
                  >
                    <div
                      className={cn(
                        'flex aspect-square size-8 items-center justify-center rounded-lg',
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{themeOption.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {themeOption.description}
                      </p>
                    </div>
                    {isSelected && <Check className="size-4 text-primary flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function UserPanel() {
  const navigate = useNavigate();
  const { user: currentUser, logout } = useAuth();
  const { closePanel, openPanel } = useRightSidebar();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { unreadCount } = useUnreadNotifications();

  const handleSignOut = async () => {
    // Close panel and navigate to home page BEFORE logout to prevent 404 flash
    // This ensures we're already on the landing page when auth state changes
    // Note: auth-provider's logout() always clears user state (setUser(null))
    // regardless of storage operation success, so user is always logged out
    closePanel();
    navigate('/');

    try {
      await logout();
      toast({
        title: 'Signed out successfully',
        description: 'You have been logged out of your account.',
      });
    } catch (error) {
      console.error('Error during sign out:', error);
      toast({
        title: 'Signed out with warnings',
        description:
          'You have been logged out locally, but there was a problem completing the sign out process.',
      });
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    closePanel();
  };

  if (!currentUser) return null;

  return (
    <div className="flex flex-col h-full">
      {/* User Header */}
      <div className="flex items-center gap-4 mb-6">
        <Avatar className="h-14 w-14 border-2 border-primary">
          <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white text-lg">
            {getInitials(currentUser.firstName, currentUser.lastName)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-semibold">{getUserDisplayName(currentUser)}</h2>
          <p className="text-sm text-muted-foreground">Student</p>
        </div>
      </div>

      <ScrollArea className="flex-1 -mx-4 px-4">
        <div className="space-y-6">
          {/* User Actions */}
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start rounded-xl h-12"
              onClick={() => handleNavigate('/app/profile')}
            >
              <User className="mr-3 h-5 w-5" />
              My Profile
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start rounded-xl h-12 relative"
              onClick={() => openPanel('notifications')}
            >
              <Bell className="mr-3 h-5 w-5" />
              Notifications
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-auto h-5 px-2 text-xs"
                  aria-label={`${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`}
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start rounded-xl h-12"
              onClick={() => handleNavigate('/app/achievements')}
            >
              <Trophy className="mr-3 h-5 w-5" />
              Achievements
            </Button>
          </div>

          <Separator />

          {/* Theme Selection */}
          <div>
            <div className="flex items-center gap-2 mb-3 px-3">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Theme</h3>
            </div>
            <div className="grid grid-cols-1 gap-2 p-0.5">
              {themes.map((themeOption) => {
                const Icon = themeOption.icon;
                const isSelected = theme === themeOption.value;
                return (
                  <button
                    key={themeOption.value}
                    onClick={() => setTheme(themeOption.value)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl text-left transition-all',
                      'hover:bg-accent/50',
                      isSelected && 'bg-accent ring-2 ring-primary'
                    )}
                  >
                    <div
                      className={cn(
                        'flex aspect-square size-8 items-center justify-center rounded-lg',
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{themeOption.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {themeOption.description}
                      </p>
                    </div>
                    {isSelected && <Check className="size-4 text-primary flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollArea>

      <Separator className="my-4" />

      <Button
        variant="ghost"
        className="w-full justify-start rounded-xl h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={handleSignOut}
      >
        <LogOut className="mr-3 h-5 w-5" />
        Sign Out
      </Button>
    </div>
  );
}

interface BadgeData {
  id: number;
  badgeId: number;
  earnedAt: string;
  isNotified?: boolean;
  badge: {
    name: string;
    description: string;
    icon: string;
    points: number;
    rarity: string;
    color: string;
  };
}

interface AchievementData {
  badges: BadgeData[];
  gameStats: any;
  newBadges: number;
}

function NotificationsPanel() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { closePanel } = useRightSidebar();
  const [processedBadges, setProcessedBadges] = useState<Set<number>>(new Set());

  const { data: achievements } = useQuery<AchievementData>({
    queryKey: queryKeys.user.achievements(currentUser?.id),
    enabled: !!currentUser?.id,
    refetchInterval: 5000, // Check for new achievements every 5 seconds
  });

  // Get unnotified badges
  const unnotifiedBadges = achievements?.badges?.filter((b) => !b.isNotified) || [];

  // Play sound for new badges (only once per badge)
  useEffect(() => {
    if (unnotifiedBadges.length > 0) {
      const newBadges = unnotifiedBadges.filter((b) => !processedBadges.has(b.id));
      if (newBadges.length > 0) {
        // Play achievement sound
        try {
          const ACHIEVEMENT_SOUND_DATA =
            'data:audio/wav;base64,UklGRvIBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU4BAABhbZNXnF+eKq1V2Xv/5dnrfQHAOD7mWPPP9xTB5F+HT4Z4XB7fHPHO2zxfGO8xHPDN7PVnNwKG3XVP5OWj7G4qPu37wv7/+v3t0fjYGVGzx3UZTLt+hY9y6Z1qHr9/vfrzxfWUVfv8+d3v6fftxe8XtO/Rv55q2r3N9pNDvfwcXe65e9Pv4uy7/ufE2aWq7fT/+vz7ZjWyf2Xy4f7s6pGYNfX25e6Vbfzo6/BZ7fHnxeb4ufXvwufX9/Yf/fHn3Yjv9v7z8s3xjfX2x+/7/ev359fHu+Hj1sj53uj74f//9t75yfTt8a7xwfPZ7/n16f37///g+8Pq4/Hg7Hxm8tPC8vwUufP8Eujv6Pf/+aTb3e/3+9OT2vHB7Oz7++7n+//n+Pv1/dz1+sT1zPHlxe/u8PDm4ubn7uz79dH7xfLq8OX/+/L1xvLD+vf1/eBZMUX5/PP5+8GUfvbY/fj799zx6vf/+/Hv7/P5/ev/8fT/+9b12vHkxeznUNf74PD79u7z+vLz+P3j7Pv52fPs+vr9+8P/5uj37+Xj7OPu7fP28eL78/Z//PP/9/f/f2Nv8f/6z+T5XfT3/7sB8vL+/eb39s7s8uL2+fL5/v/';
          const audio = new Audio();
          audio.src = ACHIEVEMENT_SOUND_DATA;
          audio.volume = 0.3;
          audio.play().catch(() => {}); // Ignore autoplay policy errors
        } catch (_error) {
          // Ignore sound errors
        }

        // Mark these badges as processed
        setProcessedBadges((prev) => {
          const updated = new Set(prev);
          newBadges.forEach((b) => updated.add(b.id));
          return updated;
        });
      }
    }
  }, [unnotifiedBadges, processedBadges]);

  const handleMarkAllRead = async () => {
    if (unnotifiedBadges.length === 0 || !currentUser) return;

    try {
      await Promise.all(
        unnotifiedBadges.map(async (achievement) => {
          try {
            await storage.updateUserBadge(achievement.id, { isNotified: true });
          } catch (err) {
            console.warn(`Error notifying badge ${achievement.badgeId}:`, err);
          }
        })
      );
      // Invalidate achievements query to refresh the UI
      queryClient.invalidateQueries({ queryKey: queryKeys.user.achievements(currentUser.id) });
    } catch (error) {
      console.error('Failed to mark badges as notified:', error);
    }
  };

  const handleViewAchievement = async (achievement: BadgeData) => {
    // Mark this achievement as read
    try {
      await storage.updateUserBadge(achievement.id, { isNotified: true });
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.achievements(currentUser?.id),
      });
    } catch (error) {
      console.error('Failed to mark badge as notified:', error);
    }

    // Navigate to achievements page
    navigate('/app/achievements');
    closePanel();
  };

  const getRarityColor = (rarity: string) => {
    const colors = {
      common: 'text-gray-600 dark:text-gray-400',
      uncommon: 'text-green-600 dark:text-green-400',
      rare: 'text-blue-600 dark:text-blue-400',
      legendary: 'text-purple-600 dark:text-purple-400',
    };
    return colors[rarity as keyof typeof colors] || colors.common;
  };

  const getBadgeColor = (color: string) => {
    const colors = {
      green: 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700',
      blue: 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700',
      purple: 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700',
      gold: 'bg-yellow-100 dark:bg-yellow-900 border-yellow-400 dark:border-yellow-700',
      yellow: 'bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-700',
      silver: 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600',
      orange: 'bg-orange-100 dark:bg-orange-900 border-orange-300 dark:border-orange-700',
      red: 'bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700',
      rainbow:
        'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 border-purple-300 dark:border-purple-700',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex aspect-square size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg">
          <Bell className="size-5" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold">Notifications</h2>
          <p className="text-xs text-muted-foreground">
            {unnotifiedBadges.length > 0
              ? `${unnotifiedBadges.length} new achievement${unnotifiedBadges.length > 1 ? 's' : ''}`
              : 'Stay updated'}
          </p>
        </div>
        {unnotifiedBadges.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            className="text-xs h-7 px-2"
          >
            Mark all read
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 -mx-4 px-4">
        {unnotifiedBadges.length > 0 ? (
          <div className="space-y-3">
            {unnotifiedBadges.map((achievement) => (
              <button
                key={achievement.id}
                onClick={() => handleViewAchievement(achievement)}
                className={`w-full p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-md text-left ${getBadgeColor(achievement.badge.color)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0">{achievement.badge.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                      {achievement.badge.name}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                      {achievement.badge.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge
                        className={`${getRarityColor(achievement.badge.rarity)} border-0 text-xs`}
                      >
                        {achievement.badge.rarity.toUpperCase()}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span>{achievement.badge.points} pts</span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm">No new notifications</p>
              <p className="text-xs mt-1">Check back later for updates</p>
            </div>
          </div>
        )}
      </ScrollArea>

      {unnotifiedBadges.length > 0 && (
        <>
          <Separator className="my-4" />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              navigate('/app/achievements');
              closePanel();
            }}
          >
            <Trophy className="mr-2 h-4 w-4" />
            View All Achievements
          </Button>
        </>
      )}
    </div>
  );
}

const RIGHT_SIDEBAR_WIDTH = '20rem';

export function RightSidebar() {
  const { isOpen, activePanel, closePanel } = useRightSidebar();

  // Handle Escape key to close the panel
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePanel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closePanel]);

  return (
    <>
      {/* Backdrop for mobile - optional, can be removed if not needed */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 md:hidden transition-opacity duration-300"
          onClick={closePanel}
          aria-hidden="true"
        />
      )}

      {/* Right Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex flex-col bg-card text-card-foreground border-l-2 border-border shadow-2xl transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ width: RIGHT_SIDEBAR_WIDTH }}
        data-state={isOpen ? 'open' : 'closed'}
        aria-label="Right sidebar panel"
        role="complementary"
        aria-hidden={!isOpen}
      >
        {/* Close Button */}
        <div className="flex items-center justify-between p-4 border-b-2 border-border bg-muted/50">
          <span className="text-sm font-semibold">
            {activePanel === 'settings' && 'Settings'}
            {activePanel === 'user' && 'Account'}
            {activePanel === 'notifications' && 'Notifications'}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl" onClick={closePanel}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close panel</span>
          </Button>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-hidden p-4">
          {activePanel === 'settings' && <SettingsPanel />}
          {activePanel === 'user' && <UserPanel />}
          {activePanel === 'notifications' && <NotificationsPanel />}
        </div>
      </div>
    </>
  );
}

export default RightSidebar;
