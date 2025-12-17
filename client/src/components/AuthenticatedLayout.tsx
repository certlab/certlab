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

interface AuthenticatedLayoutProps {
  children: ReactNode;
}

function AuthenticatedHeader() {
  const { user: currentUser } = useAuth();
  const { togglePanel, isOpen: isRightSidebarOpen } = useRightSidebar();
  const { open: isLeftSidebarOpen, setOpen: setLeftSidebarOpen } = useSidebar();
  const previousLeftSidebarState = useRef<boolean>(true);
  const wasRightSidebarOpen = useRef<boolean>(false);

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

      <div className="flex flex-1 items-center justify-center max-w-2xl mx-auto">
        {/* Centered Search Bar */}
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search dashboard..."
            className="w-full px-4 py-2 pr-10 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
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
