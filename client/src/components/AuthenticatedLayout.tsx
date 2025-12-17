import { ReactNode, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
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
import { calculateLevelAndXP } from '@/lib/level-utils';
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
    <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
      <SidebarTrigger className="rounded-xl" />

      {/* Level and XP Progress Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg">
          {level}
        </div>
        <div className="flex-1">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-sm font-semibold">Level {level}</span>
            <span className="text-xs text-muted-foreground">{currentXP} XP</span>
          </div>
          <div className="text-xs text-muted-foreground mb-1">SCHOLAR</div>
          <div className="relative w-full bg-secondary rounded-full h-2">
            <div
              className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${xpProgress}%` }}
              role="progressbar"
              aria-valuenow={currentXP}
              aria-valuemin={0}
              aria-valuemax={xpGoal}
              aria-label="Experience progress"
            ></div>
          </div>
          <div className="text-xs text-muted-foreground text-right mt-0.5">{xpGoal} XP GOAL</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications - Opens right sidebar */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full relative bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => togglePanel('notifications')}
              aria-label="Open notifications panel"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Notifications</TooltipContent>
        </Tooltip>

        {/* User Avatar - Opens right sidebar */}
        <Button
          variant="ghost"
          className="relative h-9 w-9 rounded-full p-0 bg-white hover:bg-white/90"
          onClick={() => togglePanel('user')}
          aria-label="Open user panel"
        >
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-white text-foreground font-semibold text-sm border border-border">
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
