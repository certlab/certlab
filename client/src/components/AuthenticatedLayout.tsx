import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Home, ShoppingBag, Shield, Timer } from 'lucide-react';
import { getInitials, formatNotificationCount } from '@/lib/utils';
import { useAuth } from '@/lib/auth-provider';
import { RightSidebarProvider, useRightSidebar } from '@/lib/right-sidebar-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RightSidebar } from '@/components/RightSidebar';
import { useUnreadNotifications } from '@/hooks/use-unread-notifications';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import type { UserStats } from '@shared/schema';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import MobileNavigationEnhanced from '@/components/MobileNavigationEnhanced';
import MobileBottomNav from '@/components/MobileBottomNav';

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
  const { togglePanel } = useRightSidebar();
  const location = useLocation();
  const navigate = useNavigate();

  // Get user stats for level and XP
  const { data: stats } = useQuery<UserStats>({
    queryKey: queryKeys.user.stats(currentUser?.id),
    enabled: !!currentUser?.id,
  });

  // Get unread notifications count using custom hook
  const { unreadCount } = useUnreadNotifications();

  // Calculate level and XP based on total quizzes and average score
  const level = stats ? Math.floor((stats.totalQuizzes || 0) / 10) + 1 : 1;
  const currentXP = stats
    ? ((stats.totalQuizzes || 0) % 10) * 250 + Math.floor((stats.averageScore || 0) * 5)
    : 0;
  const xpGoal = level * 1000;
  const xpProgress = (currentXP / xpGoal) * 100;

  // Calculate streak
  const dayStreak = stats?.currentStreak || 0;

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
                <span className="hidden lg:inline">{item.title}</span>
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
          {/* Level, XP, and Streak (Desktop only) */}
          <div className="hidden xl:flex items-center gap-3 mr-2">
            <div className="flex items-center gap-2 bg-accent/50 rounded-lg px-3 py-1.5">
              <div className="text-xs font-semibold whitespace-nowrap">Level {level}</div>
              <div className="w-24 h-2 bg-secondary/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                  style={{ width: `${xpProgress}%` }}
                  role="progressbar"
                  aria-valuenow={currentXP}
                  aria-valuemin={0}
                  aria-valuemax={xpGoal}
                  aria-label="Experience progress"
                ></div>
              </div>
              <div className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {dayStreak}d
              </div>
            </div>
          </div>

          {/* User Avatar - with red ring indicator when notifications exist */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full p-0 bg-white hover:bg-white/90"
                onClick={() => {
                  // Smart behavior: Open notifications panel if unread notifications exist,
                  // otherwise open user panel for profile/settings access
                  togglePanel(unreadCount > 0 ? 'notifications' : 'user');
                }}
                aria-label={
                  unreadCount > 0
                    ? `Open notifications - ${formatNotificationCount(unreadCount)}`
                    : 'Open user menu'
                }
              >
                <Avatar className="h-10 w-10">
                  {currentUser?.profileImageUrl && (
                    <AvatarImage
                      src={currentUser.profileImageUrl}
                      alt={currentUser.firstName || currentUser.email}
                    />
                  )}
                  <AvatarFallback className="bg-white text-foreground font-semibold text-sm border-2 border-border">
                    {currentUser ? getInitials(currentUser.firstName, currentUser.lastName) : '?'}
                  </AvatarFallback>
                </Avatar>
                {/* Red ring indicator for unread notifications */}
                {unreadCount > 0 && (
                  <span
                    className="absolute inset-0 rounded-full ring-2 ring-red-500 pointer-events-none"
                    aria-hidden="true"
                  />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {unreadCount > 0 ? formatNotificationCount(unreadCount) : 'User menu'}
            </TooltipContent>
          </Tooltip>
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
