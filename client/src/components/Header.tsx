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
  PlusCircle,
  List,
  Award,
  Wallet,
  Timer,
  Languages,
  Heart,
  Folder,
  Flame,
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
  const { branding } = useBranding();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
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
    <header className="bg-card shadow-sm border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 min-w-0">
          {/* Logo and Credit Balance */}
          <div className="flex items-center space-x-4 flex-shrink-0">
            <div className="flex items-center space-x-3">
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
              <h1 className="text-xl font-semibold text-foreground tracking-tight">
                {branding?.organizationName || 'Cert Lab'}
              </h1>
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
              {/* Level Badge - Visually Enhanced (Extra Large screens only) */}
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
              {/* Streak Badge - Visually Enhanced (Extra Large screens only) */}
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

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <MobileNavigationEnhanced />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center">
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
                  {/* Dashboard - Keep as direct link */}
                  <NavigationMenuItem>
                    <Button
                      variant="ghost"
                      onClick={() => navigate('/app')}
                      className={`h-10 px-3 py-2 ${
                        isActivePath('/app')
                          ? 'text-primary font-semibold border-b-2 border-primary rounded-b-none'
                          : 'text-muted-foreground hover:text-primary'
                      }`}
                    >
                      <Home className="w-4 h-4 mr-2" />
                      {t('nav.dashboard')}
                    </Button>
                  </NavigationMenuItem>

                  {/* Learning Mega Menu */}
                  <NavigationMenuItem>
                    <NavigationMenuTrigger
                      className={`h-10 px-3 py-2 ${
                        isActivePath('/app/daily-challenges') ||
                        isActivePath('/app/performance') ||
                        isActivePath('/app/practice-tests') ||
                        isActivePath('/app/question-bank') ||
                        isActivePath('/app/study-timer') ||
                        isActivePath('/app/analytics')
                          ? 'text-primary font-semibold'
                          : 'text-muted-foreground hover:text-primary'
                      }`}
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Learning
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="grid gap-3 p-6 w-[500px] bg-card">
                        <div className="grid grid-cols-2 gap-3">
                          <NavigationMenuLink
                            className={`block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all cursor-pointer ${
                              isActivePath('/app/daily-challenges')
                                ? 'bg-primary/10 border-2 border-primary'
                                : 'hover:bg-accent/10'
                            }`}
                            onClick={() => navigate('/app/daily-challenges')}
                          >
                            <div className="flex items-center text-sm font-medium leading-none text-foreground">
                              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2">
                                <Target className="w-3 h-3 text-primary" />
                              </div>
                              Daily Challenges
                              <Badge variant="secondary" className="ml-2 text-xs">
                                NEW
                              </Badge>
                            </div>
                            <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                              Complete daily and quick challenges
                            </p>
                          </NavigationMenuLink>
                          <NavigationMenuLink
                            className={`block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all cursor-pointer ${
                              isActivePath('/app/performance')
                                ? 'bg-primary/10 border-2 border-primary'
                                : 'hover:bg-accent/10'
                            }`}
                            onClick={() => navigate('/app/performance')}
                          >
                            <div className="flex items-center text-sm font-medium leading-none text-foreground">
                              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2">
                                <BarChart3 className="w-3 h-3 text-primary" />
                              </div>
                              Performance
                            </div>
                            <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                              Track your learning progress
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
                              isActivePath('/app/question-bank')
                                ? 'bg-primary/10 border-2 border-primary'
                                : 'hover:bg-accent/10'
                            }`}
                            onClick={() => navigate('/app/question-bank')}
                          >
                            <div className="flex items-center text-sm font-medium leading-none text-foreground">
                              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2">
                                <Database className="w-3 h-3 text-primary" />
                              </div>
                              Question Bank
                            </div>
                            <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                              Browse and filter question library
                            </p>
                          </NavigationMenuLink>
                          <NavigationMenuLink
                            className={`block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all cursor-pointer ${
                              isActivePath('/app/study-timer')
                                ? 'bg-primary/10 border-2 border-primary'
                                : 'hover:bg-accent/10'
                            }`}
                            onClick={() => navigate('/app/study-timer')}
                          >
                            <div className="flex items-center text-sm font-medium leading-none text-foreground">
                              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2">
                                <Timer className="w-3 h-3 text-primary" />
                              </div>
                              Study Timer
                            </div>
                            <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                              Track study time and sessions
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
                        </div>
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>

                  {/* Community Mega Menu */}
                  <NavigationMenuItem>
                    <NavigationMenuTrigger
                      className={`h-10 px-3 py-2 ${
                        isActivePath('/app/achievements') ||
                        isActivePath('/app/leaderboard') ||
                        isActivePath('/app/certificates')
                          ? 'text-primary font-semibold'
                          : 'text-muted-foreground hover:text-primary'
                      }`}
                    >
                      <Award className="w-4 h-4 mr-2" />
                      Community
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="grid gap-3 p-6 w-[400px] bg-card">
                        <div className="grid grid-cols-2 gap-3">
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
                              {t('nav.achievements')}
                            </div>
                            <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                              View earned badges and certifications
                            </p>
                          </NavigationMenuLink>
                          <NavigationMenuLink
                            className={`block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all cursor-pointer ${
                              isActivePath('/app/leaderboard')
                                ? 'bg-primary/10 border-2 border-primary'
                                : 'hover:bg-accent/10'
                            }`}
                            onClick={() => navigate('/app/leaderboard')}
                          >
                            <div className="flex items-center text-sm font-medium leading-none text-foreground">
                              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2">
                                <Award className="w-3 h-3 text-primary" />
                              </div>
                              {t('nav.leaderboard')}
                            </div>
                            <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                              Compare rankings and compete
                            </p>
                          </NavigationMenuLink>
                          <NavigationMenuLink
                            className={`block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all cursor-pointer ${
                              isActivePath('/app/certificates')
                                ? 'bg-primary/10 border-2 border-primary'
                                : 'hover:bg-accent/10'
                            }`}
                            onClick={() => navigate('/app/certificates')}
                          >
                            <div className="flex items-center text-sm font-medium leading-none text-foreground">
                              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2">
                                <Award className="w-3 h-3 text-primary" />
                              </div>
                              Certificates
                            </div>
                            <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                              View and download certificates
                            </p>
                          </NavigationMenuLink>
                        </div>
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>

                  {/* Tools & Resources Mega Menu */}
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="text-muted-foreground hover:text-primary h-10 px-3 py-2">
                      <Settings className="w-4 h-4 mr-2" />
                      Tools & Resources
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="grid gap-6 p-6 w-[600px] bg-card">
                        {/* Study Tools Section */}
                        <div>
                          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            Study Tools
                          </h3>
                          <div className="grid grid-cols-4 gap-3">
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
                                isActivePath('/app/enhanced-study-notes')
                                  ? 'bg-primary/10 border-2 border-primary'
                                  : 'hover:bg-accent/10'
                              }`}
                              onClick={() => navigate('/app/enhanced-study-notes')}
                            >
                              <div className="flex items-center text-sm font-medium leading-none text-foreground">
                                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2">
                                  <Sparkles className="w-3 h-3 text-primary" />
                                </div>
                                Enhanced Notes
                              </div>
                              <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                                Advanced note-taking with AI features
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
                                isActivePath('/app/my-quizzes')
                                  ? 'bg-primary/10 border-2 border-primary'
                                  : 'hover:bg-accent/10'
                              }`}
                              onClick={() => navigate('/app/my-quizzes')}
                            >
                              <div className="flex items-center text-sm font-medium leading-none text-foreground">
                                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2">
                                  <List className="w-3 h-3 text-primary" />
                                </div>
                                My Quizzes
                              </div>
                              <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                                Manage and duplicate your quiz templates
                              </p>
                            </NavigationMenuLink>
                          </div>
                        </div>

                        {/* Marketplace & Resources Section */}
                        <div>
                          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4" />
                            Marketplace & Resources
                          </h3>
                          <div className="grid grid-cols-3 gap-3">
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
                            <NavigationMenuLink
                              className={`block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all cursor-pointer ${
                                isActivePath('/app/my-materials')
                                  ? 'bg-primary/10 border-2 border-primary'
                                  : 'hover:bg-accent/10'
                              }`}
                              onClick={() => navigate('/app/my-materials')}
                            >
                              <div className="flex items-center text-sm font-medium leading-none text-foreground">
                                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2">
                                  <Folder className="w-3 h-3 text-primary" />
                                </div>
                                My Materials
                              </div>
                              <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                                View and manage purchased materials
                              </p>
                            </NavigationMenuLink>
                            <NavigationMenuLink
                              className={`block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all cursor-pointer ${
                                isActivePath('/app/wallet')
                                  ? 'bg-primary/10 border-2 border-primary'
                                  : 'hover:bg-accent/10'
                              }`}
                              onClick={() => navigate('/app/wallet')}
                            >
                              <div className="flex items-center text-sm font-medium leading-none text-foreground">
                                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2">
                                  <Wallet className="w-3 h-3 text-primary" />
                                </div>
                                Wallet
                              </div>
                              <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                                Manage tokens and purchases
                              </p>
                            </NavigationMenuLink>
                          </div>
                        </div>

                        {/* Other Features Section - Available to all users */}
                        <div>
                          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Other Features
                          </h3>
                          <div className="grid grid-cols-3 gap-3">
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
                            <NavigationMenuLink
                              className={`block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all cursor-pointer ${
                                isActivePath('/app/personal-import')
                                  ? 'bg-primary/10 border-2 border-primary'
                                  : 'hover:bg-accent/10'
                              }`}
                              onClick={() => navigate('/app/personal-import')}
                            >
                              <div className="flex items-center text-sm font-medium leading-none text-foreground">
                                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2">
                                  <PlusCircle className="w-3 h-3 text-primary" />
                                </div>
                                Import Personal Questions
                              </div>
                              <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                                Import your own questions from YAML files
                              </p>
                            </NavigationMenuLink>
                            <NavigationMenuLink
                              className={`block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all cursor-pointer ${
                                isActivePath('/app/i18n-demo')
                                  ? 'bg-primary/10 border-2 border-primary'
                                  : 'hover:bg-accent/10'
                              }`}
                              onClick={() => navigate('/app/i18n-demo')}
                            >
                              <div className="flex items-center text-sm font-medium leading-none text-foreground">
                                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2">
                                  <Languages className="w-3 h-3 text-primary" />
                                </div>
                                I18n Demo
                              </div>
                              <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                                Internationalization demo page
                              </p>
                            </NavigationMenuLink>
                            <NavigationMenuLink
                              className={`block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all cursor-pointer ${
                                isActivePath('/app/credits')
                                  ? 'bg-primary/10 border-2 border-primary'
                                  : 'hover:bg-accent/10'
                              }`}
                              onClick={() => navigate('/app/credits')}
                            >
                              <div className="flex items-center text-sm font-medium leading-none text-foreground">
                                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2">
                                  <Heart className="w-3 h-3 text-primary" />
                                </div>
                                Credits
                              </div>
                              <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                                Acknowledgments and attributions
                              </p>
                            </NavigationMenuLink>
                          </div>
                        </div>

                        {/* Tools Section - Only for Admin */}
                        {isAdmin && (
                          <div>
                            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              Admin Tools
                            </h3>
                            <div className="grid grid-cols-3 gap-3">
                              <NavigationMenuLink
                                className={`block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all cursor-pointer ${
                                  isActivePath('/app/reporting')
                                    ? 'bg-primary/10 border-2 border-primary'
                                    : 'hover:bg-accent/10'
                                }`}
                                onClick={() => navigate('/app/reporting')}
                              >
                                <div className="flex items-center text-sm font-medium leading-none text-foreground">
                                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2">
                                    <BarChart3 className="w-3 h-3 text-primary" />
                                  </div>
                                  Reporting
                                </div>
                                <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                                  Analytics & progress reports
                                </p>
                              </NavigationMenuLink>
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
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            )}
          </nav>

          {/* User Profile & Theme Toggle */}
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
                      {themes
                        .filter((themeOption) => {
                          // Filter based on org branding settings
                          if (!branding?.allowUserThemeSelection) {
                            // If user theme selection is disabled, only show the default theme
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
