import { useAuth } from '@/lib/auth-provider';
import { Button } from '@/components/ui/button';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CloudSyncIndicator } from '@/components/CloudSyncIndicator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatNotificationCount } from '@/lib/utils';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
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
  Home,
  Settings,
  BookOpen,
  Trophy,
  Target,
  BarChart3,
  Database,
  Shield,
  ArrowLeft,
  ChevronDown,
  Accessibility,
  User,
  FileText,
  Sparkles,
  Coins,
  ShoppingCart,
  Snowflake,
  Bell,
  Palette,
  Check,
  LogOut,
} from 'lucide-react';
import { useTheme } from '@/lib/theme-provider';
import { themes } from '@/lib/theme-constants';
import MobileNavigationEnhanced from '@/components/MobileNavigationEnhanced';
import TenantSwitcher from '@/components/TenantSwitcher';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import type { UserGameStats } from '@shared/schema';
import { useUnreadNotifications } from '@/hooks/use-unread-notifications';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: currentUser, logout } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const isAdminArea = location.pathname.startsWith('/admin');
  const isAdmin = currentUser?.role === 'admin';

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

  const handleSignOut = async () => {
    // Navigate to home page BEFORE logout to prevent 404 flash
    // This ensures we're already on the landing page when auth state changes
    // Note: auth-provider's logout() always clears user state (setUser(null))
    // regardless of storage operation success, so user is always logged out
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

  // Helper function to check if a path is active
  const isActivePath = (path: string) => {
    // For exact match routes (Dashboard can be /app or /app/dashboard)
    if (path === '/app' || path === '/app/dashboard') {
      return location.pathname === '/app' || location.pathname === '/app/dashboard';
    }
    // For all other routes, check if pathname starts with the path
    // This handles both exact matches and sub-routes (e.g., /app/marketplace and /app/marketplace/123)
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <header className="bg-card shadow-sm border-b border-border sticky top-0 z-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 min-w-0">
          {/* Logo and Credit Balance */}
          <div className="flex items-center space-x-4 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-foreground tracking-tight">Cert Lab</h1>
              {/* Token Balance Display - Hidden on medium screens to save space */}
              {tokenData && currentUser && (
                <Badge
                  variant="secondary"
                  className="hidden lg:flex ml-2 px-3 py-1 cursor-pointer hover:bg-secondary/80 transition-colors"
                  onClick={() => navigate('/app/dashboard')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate('/app/dashboard');
                    }
                  }}
                  data-testid="token-balance-badge"
                  title="Click to manage tokens"
                  role="button"
                  tabIndex={0}
                  aria-label={`${tokenData.balance} tokens available. Click to manage tokens.`}
                >
                  <Coins className="w-4 h-4 mr-1.5 text-amber-500" aria-hidden="true" />
                  <span className="font-medium">{tokenData.balance}</span>
                  <span className="ml-1 text-xs text-muted-foreground">tokens</span>
                </Badge>
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

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <MobileNavigationEnhanced />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center min-w-0 shrink">
            {isAdminArea ? (
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="text-xs">
                  <Settings className="w-3 h-3 mr-1" />
                  Admin Mode
                </Badge>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/app')}
                  className="text-muted-foreground hover:text-primary"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to App
                </Button>
              </div>
            ) : (
              <NavigationMenu>
                <NavigationMenuList>
                  {/* Dashboard */}
                  <NavigationMenuItem>
                    <Button
                      variant="ghost"
                      onClick={() => navigate('/app')}
                      className={`h-10 px-4 py-2 ${
                        isActivePath('/app')
                          ? 'text-primary font-semibold border-b-2 border-primary rounded-b-none'
                          : 'text-muted-foreground hover:text-primary'
                      }`}
                    >
                      <Home className="w-4 h-4 mr-2" />
                      Dashboard
                    </Button>
                  </NavigationMenuItem>

                  {/* Achievements */}
                  <NavigationMenuItem>
                    <Button
                      variant="ghost"
                      onClick={() => navigate('/app/achievements')}
                      className={`h-10 px-4 py-2 ${
                        isActivePath('/app/achievements')
                          ? 'text-primary font-semibold border-b-2 border-primary rounded-b-none'
                          : 'text-muted-foreground hover:text-primary'
                      }`}
                    >
                      <Trophy className="w-4 h-4 mr-2" />
                      Achievements
                    </Button>
                  </NavigationMenuItem>

                  {/* Daily Challenges - NEW */}
                  <NavigationMenuItem>
                    <Button
                      variant="ghost"
                      onClick={() => navigate('/app/daily-challenges')}
                      className={`h-10 px-4 py-2 ${
                        isActivePath('/app/daily-challenges')
                          ? 'text-primary font-semibold border-b-2 border-primary rounded-b-none'
                          : 'text-muted-foreground hover:text-primary'
                      }`}
                    >
                      <Target className="w-4 h-4 mr-2" />
                      Daily Challenges
                      <Badge variant="secondary" className="ml-2 text-xs">
                        NEW
                      </Badge>
                    </Button>
                  </NavigationMenuItem>

                  {/* Performance */}
                  <NavigationMenuItem>
                    <Button
                      variant="ghost"
                      onClick={() => navigate('/app/performance')}
                      className={`h-10 px-4 py-2 ${
                        isActivePath('/app/performance')
                          ? 'text-primary font-semibold border-b-2 border-primary rounded-b-none'
                          : 'text-muted-foreground hover:text-primary'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Performance
                    </Button>
                  </NavigationMenuItem>

                  {/* Tools & Features */}
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="text-muted-foreground hover:text-primary h-10 px-4 py-2">
                      <Settings className="w-4 h-4 mr-2" />
                      Tools & Features
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="grid gap-6 p-6 w-[600px] bg-card">
                        {/* Learning Section */}
                        <div>
                          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            Learning Features
                          </h3>
                          <div className="grid grid-cols-4 gap-3">
                            <NavigationMenuLink
                              className={`block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all cursor-pointer ${
                                isActivePath('/app/achievements')
                                  ? 'bg-primary/10 border-2 border-primary'
                                  : 'hover:bg-accent/10'
                              }`}
                              onClick={() => navigate('/app/achievements')}
                            >
                              <div className="flex items-center text-sm font-medium leading-none text-foreground">
                                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2">
                                  <Trophy className="w-3 h-3 text-primary" />
                                </div>
                                Achievements
                              </div>
                              <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                                View earned badges and certifications
                              </p>
                            </NavigationMenuLink>
                            <NavigationMenuLink
                              className={`block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all cursor-pointer ${
                                isActivePath('/app/analytics')
                                  ? 'bg-primary/10 border-2 border-primary'
                                  : 'hover:bg-accent/10'
                              }`}
                              onClick={() => navigate('/app/analytics')}
                            >
                              <div className="flex items-center text-sm font-medium leading-none text-foreground">
                                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2">
                                  <BarChart3 className="w-3 h-3 text-primary" />
                                </div>
                                Analytics
                              </div>
                              <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                                Deep insights into learning patterns
                              </p>
                            </NavigationMenuLink>
                            <NavigationMenuLink
                              className={`block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all cursor-pointer ${
                                isActivePath('/app/practice-tests')
                                  ? 'bg-primary/10 border-2 border-primary'
                                  : 'hover:bg-accent/10'
                              }`}
                              onClick={() => navigate('/app/practice-tests')}
                            >
                              <div className="flex items-center text-sm font-medium leading-none text-foreground">
                                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2">
                                  <FileText className="w-3 h-3 text-primary" />
                                </div>
                                Practice Tests
                              </div>
                              <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                                Take full-length practice exams
                              </p>
                            </NavigationMenuLink>
                            <NavigationMenuLink
                              className={`block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all cursor-pointer ${
                                isActivePath('/app/study-notes')
                                  ? 'bg-primary/10 border-2 border-primary'
                                  : 'hover:bg-accent/10'
                              }`}
                              onClick={() => navigate('/app/study-notes')}
                            >
                              <div className="flex items-center text-sm font-medium leading-none text-foreground">
                                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2">
                                  <BookOpen className="w-3 h-3 text-primary" />
                                </div>
                                Study Notes
                              </div>
                              <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                                View and export saved study notes
                              </p>
                            </NavigationMenuLink>
                            <NavigationMenuLink
                              className={`block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all cursor-pointer ${
                                isActivePath('/app/quiz-builder')
                                  ? 'bg-primary/10 border-2 border-primary'
                                  : 'hover:bg-accent/10'
                              }`}
                              onClick={() => navigate('/app/quiz-builder')}
                            >
                              <div className="flex items-center text-sm font-medium leading-none text-foreground">
                                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2">
                                  <PlusCircle className="w-3 h-3 text-primary" />
                                </div>
                                Quiz Builder
                              </div>
                              <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                                Create custom quizzes with your own questions
                              </p>
                            </NavigationMenuLink>
                            <NavigationMenuLink
                              className={`block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all cursor-pointer ${
                                isActivePath('/app/marketplace')
                                  ? 'bg-primary/10 border-2 border-primary'
                                  : 'hover:bg-accent/10'
                              }`}
                              onClick={() => navigate('/app/marketplace')}
                            >
                              <div className="flex items-center text-sm font-medium leading-none text-foreground">
                                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2">
                                  <ShoppingCart className="w-3 h-3 text-primary" />
                                </div>
                                Study Materials
                              </div>
                              <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                                Browse and purchase study materials
                              </p>
                            </NavigationMenuLink>
                          </div>
                        </div>

                        {/* Tools Section - Only for Admin */}
                        {isAdmin && (
                          <div>
                            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              Developer Tools
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                              <NavigationMenuLink
                                className={`block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all cursor-pointer ${
                                  isActivePath('/app/accessibility')
                                    ? 'bg-primary/10 border-2 border-primary'
                                    : 'hover:bg-accent/10'
                                }`}
                                onClick={() => navigate('/app/accessibility')}
                              >
                                <div className="flex items-center text-sm font-medium leading-none text-foreground">
                                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2">
                                    <Accessibility className="w-3 h-3 text-primary" />
                                  </div>
                                  Accessibility
                                </div>
                                <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                                  Check color contrast and accessibility
                                </p>
                              </NavigationMenuLink>
                              <NavigationMenuLink
                                className={`block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all cursor-pointer ${
                                  isActivePath('/app/ui-structure')
                                    ? 'bg-primary/10 border-2 border-primary'
                                    : 'hover:bg-accent/10'
                                }`}
                                onClick={() => navigate('/app/ui-structure')}
                              >
                                <div className="flex items-center text-sm font-medium leading-none text-foreground">
                                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2">
                                    <Database className="w-3 h-3 text-primary" />
                                  </div>
                                  UI Structure
                                </div>
                                <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                                  Interactive application architecture
                                </p>
                              </NavigationMenuLink>
                            </div>
                          </div>
                        )}

                        {/* Admin Section - Only for Admin */}
                        {isAdmin && (
                          <div>
                            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                              <Settings className="w-4 h-4" />
                              Administration
                            </h3>
                            <NavigationMenuLink
                              className={`block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all cursor-pointer ${
                                isActivePath('/admin')
                                  ? 'bg-primary/10 border-2 border-primary'
                                  : 'hover:bg-accent/10'
                              }`}
                              onClick={() => navigate('/admin')}
                            >
                              <div className="flex items-center text-sm font-medium leading-none text-foreground">
                                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2">
                                  <Settings className="w-3 h-3 text-primary" />
                                </div>
                                Admin Dashboard
                              </div>
                              <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                                Manage users, content, and system settings
                              </p>
                            </NavigationMenuLink>
                          </div>
                        )}

                        {/* Data Import Section - Available to all users */}
                        <div>
                          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            Data Management
                          </h3>
                          <NavigationMenuLink
                            className={`block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all cursor-pointer ${
                              isActivePath('/app/data-import')
                                ? 'bg-primary/10 border-2 border-primary'
                                : 'hover:bg-accent/10'
                            }`}
                            onClick={() => navigate('/app/data-import')}
                          >
                            <div className="flex items-center text-sm font-medium leading-none text-foreground">
                              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2">
                                <Database className="w-3 h-3 text-primary" />
                              </div>
                              Import Sample Data
                            </div>
                            <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                              Load 500+ practice questions per certification
                            </p>
                          </NavigationMenuLink>
                        </div>
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            )}
          </nav>

          {/* User Profile & Theme Toggle */}
          <div className="flex items-center space-x-2 flex-shrink-0">
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
                  {/* Token Summary */}
                  {tokenData && (
                    <>
                      <DropdownMenuSeparator className="my-2" />
                      <div className="px-3 py-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Token Balance:
                        </p>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Coins className="w-3 h-3 text-amber-500" />
                            <span>{tokenData.balance} available tokens</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span>1 token per question</span>
                          </div>
                          {tokenData.balance < 20 && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <Sparkles className="w-3 h-3 text-purple-500" />
                              <button
                                onClick={() => navigate('/app/dashboard')}
                                className="text-purple-600 hover:underline"
                              >
                                Add more tokens (free)
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                  {/* Notifications Section */}
                  {unreadCount > 0 && (
                    <>
                      <DropdownMenuSeparator className="my-2" />
                      <div className="px-3 py-2">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-muted-foreground">Notifications</p>
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
                          onClick={() => navigate('/app/achievements')}
                          aria-label={`Navigate to achievements page to view ${formatNotificationCount(unreadCount)}`}
                        >
                          <Bell className="w-4 h-4 mr-2" />
                          View All Notifications
                        </Button>
                      </div>
                    </>
                  )}
                  <DropdownMenuSeparator className="my-2" />

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
                              {isSelected && (
                                <Check className="size-4 text-primary flex-shrink-0" />
                              )}
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
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
