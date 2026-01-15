import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Home, ShoppingBag, Shield, Flame, Trophy } from 'lucide-react';
import { getInitials, formatNotificationCount, getUserDisplayName } from '@/lib/utils';
import { useAuth } from '@/lib/auth-provider';
import { RightSidebarProvider, useRightSidebar } from '@/lib/right-sidebar-provider';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RightSidebar } from '@/components/RightSidebar';
import { useUnreadNotifications } from '@/hooks/use-unread-notifications';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { storage } from '@/lib/storage-factory';
import type { UserGameStats } from '@shared/schema';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import MobileNavigationEnhanced from '@/components/MobileNavigationEnhanced';
import MobileBottomNav from '@/components/MobileBottomNav';
import { Badge } from '@/components/ui/badge';
import { UserDropdownMenu } from '@/components/UserDropdownMenu';
import { calculateLevelFromPoints, calculatePointsForLevel } from '@/lib/level-utils';

interface AuthenticatedLayoutProps {
  children: ReactNode;
}

// Navigation items for the top bar
const getNavigationItems = (isAdmin: boolean) => {
  const items = [
    { title: 'Dashboard', icon: Home, url: '/app' },
    { title: 'Marketplace', icon: ShoppingBag, url: '/app/marketplace' },
  ];

  if (isAdmin) {
    items.push({ title: 'Admin Panel', icon: Shield, url: '/admin' });
  }

  return items;
};

function AuthenticatedHeader() {
  const { user: currentUser } = useAuth();
  const { openPanel } = useRightSidebar();
  const location = useLocation();
  const navigate = useNavigate();

  // Get user game stats for level and XP (from the gamification system)
  const { data: gameStats } = useQuery<UserGameStats | undefined>({
    queryKey: queryKeys.user.gameStats(currentUser?.id),
    queryFn: async () => {
      if (!currentUser?.id) return undefined;
      return await storage.getUserGameStats(currentUser.id);
    },
    enabled: !!currentUser?.id,
  });

  // Get unread notifications count using custom hook
  const { unreadCount } = useUnreadNotifications();

  // Calculate level from totalPoints using defensive programming pattern
  // This prevents display bugs if gameStats.level becomes out of sync with totalPoints
  // Same pattern used in LevelProgress component for consistency
  const totalPoints = gameStats?.totalPoints || 0;
  const level = calculateLevelFromPoints(totalPoints);

  // Calculate XP progress for current level
  // Each level N requires (N * 100) points to complete
  const currentLevelStartPoints = calculatePointsForLevel(level);
  const pointsInCurrentLevel = totalPoints - currentLevelStartPoints;
  const pointsNeededForLevel = level * 100;

  // For display: current XP and XP goal
  const currentXP = pointsInCurrentLevel;
  const xpGoal = pointsNeededForLevel;

  // Calculate streak from game stats
  const dayStreak = gameStats?.currentStreak || 0;

  const isAdmin = currentUser?.role === 'admin';
  const navigationItems = getNavigationItems(isAdmin);

  const isPathActive = (path: string) => {
    if (path === '/app') {
      return location.pathname === '/app' || location.pathname === '/app/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-20 border-b bg-background backdrop-blur-sm shadow-sm flex-shrink-0">
      <div className="flex h-16 items-center gap-4 px-4">
        {/* Left: Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight hidden sm:block">
            Cert Lab
          </h1>
        </div>

        {/* Center: Navigation Links (Desktop only) */}
        <nav className="hidden md:flex items-center justify-center gap-1 flex-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = isPathActive(item.url);
            return (
              <Button
                key={item.url}
                variant="ghost"
                size="sm"
                onClick={() => navigate(item.url)}
                className={cn(
                  'flex items-center gap-2 text-sm font-medium rounded-lg h-9 px-3',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.title}</span>
              </Button>
            );
          })}
        </nav>

        {/* Mobile Navigation */}
        <div className="md:hidden flex-1">
          <MobileNavigationEnhanced />
        </div>

        {/* Right: User Section */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Level and Streak - Visually Enhanced (Desktop only) */}
          <div className="hidden xl:flex items-center gap-2 mr-2">
            {/* Level Badge */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 hover:from-purple-500/20 hover:to-blue-500/20 transition-all cursor-help">
                  <Trophy className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-bold text-foreground">Level {level}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <p className="font-semibold">Level {level}</p>
                  <p className="text-muted-foreground">
                    {currentXP} / {xpGoal} XP
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>

            {/* Streak Badge */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 border transition-all cursor-help',
                    dayStreak === 0
                      ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                      : dayStreak < 7
                        ? 'bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/20 hover:from-orange-500/20 hover:to-red-500/20'
                        : 'bg-gradient-to-r from-red-500/10 to-pink-500/10 border-red-500/20 hover:from-red-500/20 hover:to-pink-500/20'
                  )}
                >
                  <Flame
                    className={cn(
                      'w-3.5 h-3.5',
                      dayStreak === 0
                        ? 'text-gray-400'
                        : dayStreak < 7
                          ? 'text-orange-500 dark:text-orange-400'
                          : 'text-red-500 dark:text-red-400 animate-pulse'
                    )}
                  />
                  <span className="text-xs font-bold text-foreground">{dayStreak}d</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <p className="font-semibold">
                    {dayStreak === 0 ? 'Start your streak!' : `${dayStreak} day streak`}
                  </p>
                  <p className="text-muted-foreground">
                    {dayStreak === 0
                      ? 'Complete a quiz today'
                      : dayStreak < 7
                        ? 'Keep going!'
                        : 'Amazing dedication!'}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* User Avatar Dropdown with integrated account menu */}
          <UserDropdownMenu
            currentUser={currentUser}
            unreadCount={unreadCount}
            onOpenNotificationsPanel={() => openPanel('notifications')}
          />
        </div>
      </div>
    </header>
  );
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 -z-10 opacity-20"
        animate={{
          background: [
            'radial-gradient(circle at 50% 50%, rgba(120, 41, 190, 0.5) 0%, rgba(53, 71, 125, 0.5) 50%, rgba(0, 0, 0, 0) 100%)',
            'radial-gradient(circle at 30% 70%, rgba(233, 30, 99, 0.5) 0%, rgba(81, 45, 168, 0.5) 50%, rgba(0, 0, 0, 0) 100%)',
            'radial-gradient(circle at 70% 30%, rgba(76, 175, 80, 0.5) 0%, rgba(32, 119, 188, 0.5) 50%, rgba(0, 0, 0, 0) 100%)',
            'radial-gradient(circle at 50% 50%, rgba(120, 41, 190, 0.5) 0%, rgba(53, 71, 125, 0.5) 50%, rgba(0, 0, 0, 0) 100%)',
          ],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      />

      <RightSidebarProvider>
        <div className="flex flex-col min-h-screen">
          <AuthenticatedHeader />
          <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
          <MobileBottomNav />
        </div>
        <RightSidebar />
      </RightSidebarProvider>
    </div>
  );
}

export default AuthenticatedLayout;
