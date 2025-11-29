import { ReactNode, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Bell, Search, Settings } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { useAuth } from '@/lib/auth-provider';
import { RightSidebarProvider, useRightSidebar } from '@/lib/right-sidebar-provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  // Collapse left sidebar when right sidebar opens, restore when it closes
  useEffect(() => {
    if (isRightSidebarOpen) {
      // Save current left sidebar state before collapsing
      previousLeftSidebarState.current = isLeftSidebarOpen;
      setLeftSidebarOpen(false);
    } else {
      // Restore previous left sidebar state when right sidebar closes
      setLeftSidebarOpen(previousLeftSidebarState.current);
    }
  }, [isRightSidebarOpen, setLeftSidebarOpen, isLeftSidebarOpen]);

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
      <SidebarTrigger className="rounded-xl" />

      <div className="flex flex-1 items-center justify-between">
        <h1 className="text-xl font-semibold">Cert Lab</h1>

        <div className="flex items-center gap-3">
          {/* TODO: Search functionality - currently a placeholder for future implementation */}
          <div className="hidden md:block relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search..." className="w-[200px] rounded-xl pl-9" />
          </div>

          {/* Settings/Theme Toggle - Opens right sidebar */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 rounded-xl"
                onClick={() => togglePanel('settings')}
                aria-label="Open settings panel"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>

          {/* Notifications - Opens right sidebar */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl relative"
                onClick={() => togglePanel('notifications')}
                aria-label="Open notifications panel"
              >
                <Bell className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Notifications</TooltipContent>
          </Tooltip>

          {/* User Avatar - Opens right sidebar */}
          <Button
            variant="ghost"
            className="relative h-9 w-9 rounded-full p-0"
            onClick={() => togglePanel('user')}
            aria-label="Open user panel"
          >
            <Avatar className="h-9 w-9 border-2 border-primary">
              <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white text-sm">
                {currentUser ? getInitials(currentUser.firstName, currentUser.lastName) : '?'}
              </AvatarFallback>
            </Avatar>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
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
