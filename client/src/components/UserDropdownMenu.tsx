import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/lib/theme-provider';
import { themes } from '@/lib/theme-constants';
import { useAuth } from '@/lib/auth-provider';
import { useUnreadNotifications } from '@/hooks/use-unread-notifications';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Bell, Trophy, Palette, LogOut, Check } from 'lucide-react';
import { formatNotificationCount, getInitials, getUserDisplayName } from '@/lib/utils';
import type { UserGameStats } from '@shared/schema';

interface UserDropdownMenuProps {
  currentUser: any;
  tokenData?: { balance: number };
  unreadCount: number;
  onOpenNotificationsPanel?: () => void;
}

export function UserDropdownMenu({
  currentUser,
  tokenData,
  unreadCount,
  onOpenNotificationsPanel,
}: UserDropdownMenuProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();

  const handleSignOut = async () => {
    // Navigate to home page BEFORE logout to prevent 404 flash
    navigate('/');

    try {
      await logout();
      toast({
        title: 'Signed out successfully',
        description: 'You have been logged out of your account.',
      });
    } catch (_error) {
      toast({
        title: 'Signed out',
        description: 'You have been logged out of your account.',
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full p-0 hover:bg-accent/10"
          aria-label={
            unreadCount > 0
              ? `User menu - ${formatNotificationCount(unreadCount)}`
              : `User menu for ${getUserDisplayName(currentUser)}`
          }
        >
          <Avatar className="h-10 w-10">
            {currentUser?.profileImageUrl && (
              <AvatarImage
                src={currentUser.profileImageUrl}
                alt={getUserDisplayName(currentUser)}
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
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 p-2" align="end">
        {/* User Info Header */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/5 mb-2">
          <Avatar className="w-12 h-12 shadow-glow">
            {currentUser?.profileImageUrl && (
              <AvatarImage
                src={currentUser.profileImageUrl}
                alt={getUserDisplayName(currentUser)}
              />
            )}
            <AvatarFallback className="gradient-primary text-primary-foreground text-lg font-semibold">
              {currentUser ? getInitials(currentUser.firstName, currentUser.lastName) : '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold">
              {currentUser ? getUserDisplayName(currentUser) : 'User'}
            </p>
            <p className="text-xs text-muted-foreground">Certification Student</p>
          </div>
        </div>

        {/* Notifications Alert */}
        {unreadCount > 0 && onOpenNotificationsPanel && (
          <>
            <div className="px-3 py-2 bg-destructive/10 rounded-md mb-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-destructive">Notifications</p>
                <Badge
                  variant="destructive"
                  className="text-xs h-5 px-2"
                  aria-label={formatNotificationCount(unreadCount, false)}
                >
                  {unreadCount}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                You have {formatNotificationCount(unreadCount)}!
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onOpenNotificationsPanel}
              >
                <Bell className="w-4 h-4 mr-2" />
                View Notifications
              </Button>
            </div>
            <DropdownMenuSeparator className="my-2" />
          </>
        )}

        {/* User Navigation Links */}
        <DropdownMenuItem
          onClick={() => navigate('/app/profile')}
          className="cursor-pointer rounded-md py-2.5 px-3"
        >
          <User className="w-4 h-4 mr-3 text-primary" />
          <span className="font-medium">My Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate('/app/achievements')}
          className="cursor-pointer rounded-md py-2.5 px-3"
        >
          <Trophy className="w-4 h-4 mr-3 text-primary" />
          <span className="font-medium">My Achievements</span>
        </DropdownMenuItem>
        {unreadCount === 0 && onOpenNotificationsPanel && (
          <DropdownMenuItem
            onClick={onOpenNotificationsPanel}
            className="cursor-pointer rounded-md py-2.5 px-3"
          >
            <Bell className="w-4 h-4 mr-3 text-primary" />
            <span className="font-medium">Notifications</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="my-2" />

        {/* Theme Selection */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer rounded-md py-2.5 px-3">
            <Palette className="w-4 h-4 mr-3 text-primary" />
            <span className="font-medium">Theme</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">
              Choose your theme
            </DropdownMenuLabel>
            {themes.map((themeOption) => {
              const Icon = themeOption.icon;
              const isSelected = theme === themeOption.value;
              return (
                <DropdownMenuItem
                  key={themeOption.value}
                  onClick={() => setTheme(themeOption.value)}
                  className="cursor-pointer rounded-md py-2.5 px-3"
                >
                  <div className="flex items-center gap-3 w-full">
                    <div
                      className={`flex aspect-square size-6 items-center justify-center rounded-lg ${
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{themeOption.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {themeOption.description}
                      </p>
                    </div>
                    {isSelected && <Check className="size-4 text-primary flex-shrink-0" />}
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator className="my-2" />

        {/* Sign Out */}
        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer rounded-md py-2.5 px-3 text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <LogOut className="w-4 h-4 mr-3" />
          <span className="font-medium">Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
