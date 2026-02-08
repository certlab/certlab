import { useAuth } from '@/lib/auth-provider';
import { useBranding } from '@/lib/branding-provider';
import { Button } from '@/components/ui/button';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { CloudSyncIndicator } from '@/components/CloudSyncIndicator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatNotificationCount, cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { calculateLevelFromPoints, calculatePointsForLevel } from '@/lib/level-utils';
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
import {
  Settings,
  Shield,
  ChevronDown,
  User,
  Coins,
  Snowflake,
  Bell,
  Palette,
  Check,
  LogOut,
  Wallet,
  Trophy,
  Flame,
} from 'lucide-react';
import { useTheme } from '@/lib/theme-provider';
import { themes } from '@/lib/theme-constants';
import TenantSwitcher from '@/components/TenantSwitcher';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import type { UserGameStats } from '@shared/schema';
import { useUnreadNotifications } from '@/hooks/use-unread-notifications';
import { SidebarTrigger } from '@/components/ui/sidebar';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: currentUser, logout } = useAuth();
  const { branding } = useBranding();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const isAdminArea = location.pathname.startsWith('/admin');

  // Get token balance
  const { data: tokenData } = useQuery<{ balance: number }>({
    queryKey: queryKeys.user.tokenBalance(currentUser?.id),
    enabled: !!currentUser?.id,
  });

  // Get user game stats for streak freeze indicator
  const { data: gameStats } = useQuery<UserGameStats>({
    queryKey: queryKeys.user.stats(currentUser?.id),
    enabled: !!currentUser?.id,
  });

  // Get unread notifications count using custom hook
  const { unreadCount } = useUnreadNotifications();

  // Calculate level from totalPoints
  const totalPoints = gameStats?.totalPoints || 0;
  const level = calculateLevelFromPoints(totalPoints);

  // Calculate XP progress for current level
  const currentLevelStartPoints = calculatePointsForLevel(level);
  const pointsInCurrentLevel = totalPoints - currentLevelStartPoints;
  const pointsNeededForLevel = level * 100;

  // For display: current XP and XP goal
  const currentXP = pointsInCurrentLevel;
  const xpGoal = pointsNeededForLevel;

  // Calculate streak from game stats
  const dayStreak = gameStats?.currentStreak || 0;

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

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    if (!firstName && !lastName) return '?';
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase() || '?';
  };

  const getUserDisplayName = (user: any) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) return user.firstName;
    if (user.lastName) return user.lastName;
    if (user.email) return user.email.split('@')[0];
    return 'User';
  };

  return (
    <header className="bg-card shadow-sm border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 min-w-0">
          {/* Logo and Badges */}
          <div className="flex items-center space-x-4 flex-shrink-0">
            <div className="flex items-center space-x-3">
              {/* Sidebar Toggle for Mobile */}
              <div className="md:hidden">
                <SidebarTrigger />
              </div>

              {/* Logo - use org branding if available */}
              {branding?.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={branding.organizationName || 'Logo'}
                  className="object-contain"
                  style={{
                    width: `${branding.logoWidth || 40}px`,
                    height: `${branding.logoHeight || 40}px`,
                  }}
                />
              ) : (
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                  <Shield className="w-6 h-6 text-white" />
                </div>
              )}
              <h1 className="text-xl font-semibold text-foreground tracking-tight hidden md:block">
                {branding?.organizationName || 'Cert Lab'}
              </h1>
              {/* Token Balance Display */}
              {tokenData && currentUser && (
                <Badge
                  variant="secondary"
                  className="hidden lg:flex ml-2 px-3 py-1 cursor-pointer hover:bg-secondary/80 transition-colors"
                  onClick={() => navigate('/app/wallet')}
                  role="button"
                  tabIndex={0}
                  aria-label={`${tokenData.balance} tokens available. Click to manage tokens.`}
                >
                  <Coins className="w-4 h-4 mr-1.5 text-amber-500" aria-hidden="true" />
                  <span className="font-medium">{tokenData.balance}</span>
                  <span className="ml-1 text-xs text-muted-foreground">tokens</span>
                </Badge>
              )}
              {/* Level Badge */}
              {currentUser && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className="hidden xl:flex ml-2 items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 hover:from-purple-500/20 hover:to-blue-500/20 transition-all cursor-help">
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
              )}
              {/* Streak Badge */}
              {currentUser && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      className={cn(
                        'hidden xl:flex ml-2 items-center gap-1.5 px-3 py-1.5 border transition-all cursor-help',
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
              )}
              {/* Streak Freeze Indicator */}
              {gameStats &&
                currentUser &&
                gameStats.streakFreezes &&
                gameStats.streakFreezes > 0 && (
                  <Badge
                    variant="outline"
                    className="hidden lg:flex ml-2 px-3 py-1 border-blue-400 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 cursor-help"
                    title={`You have ${gameStats.streakFreezes} streak freeze${gameStats.streakFreezes > 1 ? 's' : ''} available. Use them to protect your study streak!`}
                    data-testid="streak-freeze-badge"
                    aria-label={`${gameStats.streakFreezes} streak freeze${gameStats.streakFreezes > 1 ? 's' : ''} available`}
                  >
                    <Snowflake className="w-4 h-4 mr-1.5" aria-hidden="true" />
                    <span className="font-medium">{gameStats.streakFreezes}</span>
                    <span className="ml-1 text-xs">
                      freeze{gameStats.streakFreezes > 1 ? 's' : ''}
                    </span>
                  </Badge>
                )}
            </div>
            {/* Tenant Switcher - Large screens only */}
            {!isAdminArea && (
              <div className="hidden lg:block">
                <TenantSwitcher />
              </div>
            )}
          </div>

          {/* Admin Mode Badge (if in admin area) */}
          {isAdminArea && (
            <Badge variant="secondary" className="text-xs">
              <Settings className="w-3 h-3 mr-1" />
              Admin Mode
            </Badge>
          )}

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Cloud Sync Indicator */}
            {currentUser && (
              <div className="hidden md:block">
                <CloudSyncIndicator />
              </div>
            )}

            {/* User Profile */}
            {currentUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 rounded-full px-2 hover:bg-accent/10"
                    aria-label={
                      unreadCount > 0
                        ? `User menu - ${formatNotificationCount(unreadCount)}`
                        : `User menu for ${getUserDisplayName(currentUser)}`
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <Avatar className="w-8 h-8 shadow-glow">
                          {currentUser.profileImageUrl && (
                            <AvatarImage
                              src={currentUser.profileImageUrl}
                              alt={getUserDisplayName(currentUser)}
                            />
                          )}
                          <AvatarFallback className="gradient-primary text-primary-foreground text-sm font-semibold">
                            {getInitials(currentUser.firstName, currentUser.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        {/* Red ring indicator for unread notifications */}
                        {unreadCount > 0 && (
                          <span
                            className="absolute inset-0 rounded-full ring-2 ring-red-500 pointer-events-none"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <span className="hidden lg:block text-foreground text-sm font-medium max-w-[120px] truncate">
                        {getUserDisplayName(currentUser)}
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 p-2" align="end">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/5">
                    <Avatar className="w-12 h-12 shadow-glow">
                      {currentUser.profileImageUrl && (
                        <AvatarImage
                          src={currentUser.profileImageUrl}
                          alt={getUserDisplayName(currentUser)}
                        />
                      )}
                      <AvatarFallback className="gradient-primary text-primary-foreground text-lg font-semibold">
                        {getInitials(currentUser.firstName, currentUser.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold">{getUserDisplayName(currentUser)}</p>
                      <p className="text-xs text-muted-foreground">Certification Student</p>
                      {/* Token Balance Info */}
                      {tokenData && (
                        <div className="mt-1">
                          <Badge variant="secondary" className="text-xs">
                            <Coins className="w-3 h-3 mr-1 text-amber-500" />
                            {tokenData.balance} tokens
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  <DropdownMenuSeparator className="my-2" />

                  {/* Profile */}
                  <DropdownMenuItem
                    onClick={() => navigate('/app/profile')}
                    className="cursor-pointer rounded-md py-2.5 px-3"
                  >
                    <User className="w-4 h-4 mr-3" />
                    <span className="font-medium">{t('nav.profile')}</span>
                  </DropdownMenuItem>

                  {/* Wallet */}
                  <DropdownMenuItem
                    onClick={() => navigate('/app/wallet')}
                    className="cursor-pointer rounded-md py-2.5 px-3"
                  >
                    <Wallet className="w-4 h-4 mr-3" />
                    <span className="font-medium">Wallet</span>
                    {tokenData && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {tokenData.balance}
                      </Badge>
                    )}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-2" />

                  {/* Theme Submenu */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer rounded-md py-2.5 px-3">
                      <Palette className="w-4 h-4 mr-3" />
                      <span className="font-medium">Theme</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-60">
                      {themes
                        .filter((themeOption) => {
                          // Always show the default theme
                          if (branding?.defaultTheme) {
                            return themeOption.value === (branding?.defaultTheme || 'light');
                          }
                          // If enabled themes list is empty or undefined, show all themes
                          if (!branding?.enabledThemes || branding.enabledThemes.length === 0) {
                            return true;
                          }
                          // Otherwise, only show enabled themes
                          return branding.enabledThemes.includes(themeOption.value);
                        })
                        .map((themeOption) => {
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
                                {isSelected && (
                                  <Check className="size-4 text-primary flex-shrink-0" />
                                )}
                              </div>
                            </DropdownMenuItem>
                          );
                        })}
                      {(!branding?.allowUserThemeSelection ||
                        (branding?.enabledThemes && branding.enabledThemes.length > 0)) && (
                        <div className="px-3 py-2 text-xs text-muted-foreground border-t mt-1">
                          {!branding?.allowUserThemeSelection
                            ? 'Theme selection is managed by your organization'
                            : `${branding?.enabledThemes?.length || 0} theme(s) available`}
                        </div>
                      )}
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
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
