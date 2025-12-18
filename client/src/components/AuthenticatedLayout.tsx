import { ReactNode, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Bell, Shield } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { useAuth } from '@/lib/auth-provider';
import { RightSidebarProvider, useRightSidebar } from '@/lib/right-sidebar-provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AppSidebar } from '@/components/AppSidebar';
import { RightSidebar } from '@/components/RightSidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import type { UserStats } from '@shared/schema';

interface AuthenticatedLayoutProps {
  children: ReactNode;
}

function AuthenticatedHeader() {
  const { user: currentUser } = useAuth();
  const { togglePanel, isOpen: isRightSidebarOpen } = useRightSidebar();
  const { open: isLeftSidebarOpen, setOpen: setLeftSidebarOpen } = useSidebar();
  const previousLeftSidebarState = useRef<boolean>(true);
  const wasRightSidebarOpen = useRef<boolean>(false);

  // Get user stats for level and XP
  const { data: stats } = useQuery<UserStats>({
    queryKey: queryKeys.user.stats(currentUser?.id),
    enabled: !!currentUser?.id,
  });

  // Calculate level and XP based on total quizzes and average score
  // Level = Math.floor(totalQuizzes / 10) + 1
  const level = stats ? Math.floor((stats.totalQuizzes || 0) / 10) + 1 : 1;
  const currentXP = stats
    ? ((stats.totalQuizzes || 0) % 10) * 250 + Math.floor((stats.averageScore || 0) * 5)
    : 0;
  const xpGoal = level * 1000; // Each level requires progressively more XP
  const xpProgress = (currentXP / xpGoal) * 100;

  // Calculate streak
  const dayStreak = stats?.currentStreak || 0;

  // Collapse left sidebar when right sidebar opens, restore when it closes
  useEffect(() => {
    if (isRightSidebarOpen && !wasRightSidebarOpen.current) {
      // Right sidebar just opened - save current left sidebar state and collapse it
      previousLeftSidebarState.current = isLeftSidebarOpen;
      setLeftSidebarOpen(false);
    } else if (!isRightSidebarOpen && wasRightSidebarOpen.current) {
      // Right sidebar just closed - restore previous left sidebar state
      setLeftSidebarOpen(previousLeftSidebarState.current);
    }
    wasRightSidebarOpen.current = isRightSidebarOpen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRightSidebarOpen, setLeftSidebarOpen]);

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 backdrop-blur-sm shadow-sm">
      <SidebarTrigger className="rounded-xl flex-shrink-0" />

      {/* Level and XP Progress Bar - New Design */}
      <div className="hidden lg:flex items-center gap-3 flex-1">
        {/* SCHOLAR Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-md">
          <Shield className="w-5 h-5 fill-current" aria-hidden="true" />
          <span className="text-sm font-bold tracking-wide">SCHOLAR</span>
        </div>

        {/* Level and Progress Container */}
        <div className="flex-1 flex items-center gap-4">
          {/* Level Text */}
          <div className="text-sm font-semibold whitespace-nowrap">Level {level}</div>

          {/* Progress Bar */}
          <div className="flex-1 relative">
            <div className="relative w-full bg-secondary/50 rounded-full h-6 border border-border/50">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${xpProgress}%` }}
                role="progressbar"
                aria-valuenow={currentXP}
                aria-valuemin={0}
                aria-valuemax={xpGoal}
                aria-label="Experience progress"
              ></div>
              {/* XP Text Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-medium text-foreground drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  {currentXP} / {xpGoal} XP
                </span>
              </div>
            </div>
          </div>

          {/* Day Streak */}
          <div className="text-sm font-medium whitespace-nowrap">{dayStreak} Day Streak</div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Notifications - Opens right sidebar */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full relative bg-primary text-primary-foreground hover:bg-primary/90 h-10 w-10"
              onClick={() => togglePanel('notifications')}
              aria-label="Open notifications panel"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-background"></span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Notifications</TooltipContent>
        </Tooltip>

        {/* User Avatar - Opens right sidebar */}
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full p-0 bg-white hover:bg-white/90"
          onClick={() => togglePanel('user')}
          aria-label="Open user panel"
        >
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-white text-foreground font-semibold text-sm border-2 border-border">
              {currentUser ? getInitials(currentUser.firstName, currentUser.lastName) : '?'}
            </AvatarFallback>
          </Avatar>
        </Button>
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
        <SidebarProvider defaultOpen={true}>
          <AppSidebar />
          <SidebarInset>
            <AuthenticatedHeader />
            <main id="main-content" tabIndex={-1} className="flex-1 p-4 md:p-6">
              {children}
            </main>
          </SidebarInset>
          <RightSidebar />
        </SidebarProvider>
      </RightSidebarProvider>
    </div>
  );
}

export default AuthenticatedLayout;
