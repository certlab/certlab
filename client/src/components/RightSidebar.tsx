import { useEffect } from 'react';
import { useRightSidebar } from '@/lib/right-sidebar-provider';
import { useAuth } from '@/lib/auth-provider';
import { useTheme } from '@/lib/theme-provider';
import { themes } from '@/lib/theme-constants';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { cn, getInitials, getUserDisplayName } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { X, LogOut, User, Trophy, Bell, Settings, Check, Palette } from 'lucide-react';

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
  const [, setLocation] = useLocation();
  const { user: currentUser, logout } = useAuth();
  const { closePanel } = useRightSidebar();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    // Close panel and navigate to home page BEFORE logout to prevent 404 flash
    // This ensures we're already on the landing page when auth state changes
    // Note: auth-provider's logout() always clears user state (setUser(null))
    // regardless of storage operation success, so user is always logged out
    closePanel();
    setLocation('/');

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
    setLocation(path);
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

function NotificationsPanel() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex aspect-square size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg">
          <Bell className="size-5" />
        </div>
        <div>
          <h2 className="font-semibold">Notifications</h2>
          <p className="text-xs text-muted-foreground">Stay updated</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-sm">No new notifications</p>
          <p className="text-xs mt-1">Check back later for updates</p>
        </div>
      </div>
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
