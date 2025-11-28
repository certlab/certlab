import { useAuth } from '@/lib/auth-provider';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/dropdown-menu';
import {
  Home,
  Settings,
  BookOpen,
  Trophy,
  BarChart3,
  Database,
  Shield,
  ArrowLeft,
  ChevronDown,
  Accessibility,
  User,
  FileText,
  Crown,
  Sparkles,
  Coins,
} from 'lucide-react';
import MobileNavigationEnhanced from '@/components/MobileNavigationEnhanced';
import TenantSwitcher from '@/components/TenantSwitcher';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';

export default function Header() {
  const [location, setLocation] = useLocation();
  const { user: currentUser, logout } = useAuth();
  const { toast } = useToast();
  const isAdminArea = location.startsWith('/admin');
  const isAdmin = currentUser?.role === 'admin';

  // Get token balance
  const { data: tokenData } = useQuery<{ balance: number }>({
    queryKey: queryKeys.user.tokenBalance(currentUser?.id),
    enabled: !!currentUser?.id,
    staleTime: 0, // Always refetch when invalidated
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  const handleSignOut = async () => {
    try {
      await logout();
      toast({
        title: 'Signed out successfully',
        description: 'You have been logged out of your account.',
      });
      // Note: logout() handles the redirect to the production URL
    } catch (error) {
      toast({
        title: 'Signed out',
        description: 'You have been logged out of your account.',
      });
      // Note: logout() handles the redirect to the production URL
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
                  onClick={() => setLocation('/app/dashboard')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setLocation('/app/dashboard');
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
                  onClick={() => setLocation('/app')}
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
                      onClick={() => setLocation('/app')}
                      className="text-muted-foreground hover:text-primary h-10 px-4 py-2"
                    >
                      <Home className="w-4 h-4 mr-2" />
                      Dashboard
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
                          <div className="grid grid-cols-3 gap-3">
                            <NavigationMenuLink
                              className="block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all hover:bg-accent/10 cursor-pointer"
                              onClick={() => setLocation('/app/achievements')}
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
                              className="block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all hover:bg-accent/10 cursor-pointer"
                              onClick={() => setLocation('/app/practice-tests')}
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
                              className="block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all hover:bg-accent/10 cursor-pointer"
                              onClick={() => setLocation('/app/study-notes')}
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
                                className="block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all hover:bg-accent/10 cursor-pointer"
                                onClick={() => setLocation('/accessibility')}
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
                                className="block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all hover:bg-accent/10 cursor-pointer"
                                onClick={() => setLocation('/ui-structure')}
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
                              className="block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all hover:bg-accent/10 cursor-pointer"
                              onClick={() => setLocation('/admin')}
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
                            className="block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all hover:bg-accent/10 cursor-pointer"
                            onClick={() => setLocation('/app/data-import')}
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
            {/* Desktop Theme Toggle */}
            <div className="hidden md:block">
              <ThemeToggle />
            </div>

            {/* User Profile */}
            {currentUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 rounded-full px-2 hover:bg-accent/10"
                    aria-label={`User menu for ${getUserDisplayName(currentUser)}`}
                  >
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center shadow-glow"
                        aria-hidden="true"
                      >
                        <span className="text-primary-foreground text-sm font-semibold">
                          {getInitials(currentUser.firstName, currentUser.lastName)}
                        </span>
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
                    <div className="w-12 h-12 gradient-primary rounded-full flex items-center justify-center shadow-glow">
                      <span className="text-primary-foreground text-lg font-semibold">
                        {getInitials(currentUser.firstName, currentUser.lastName)}
                      </span>
                    </div>
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
                                onClick={() => setLocation('/app/dashboard')}
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
                  <DropdownMenuSeparator className="my-2" />
                  <DropdownMenuItem
                    onClick={() => setLocation('/app/achievements')}
                    className="cursor-pointer rounded-md py-2.5 px-3"
                  >
                    <Trophy className="w-4 h-4 mr-3 text-primary" />
                    <span className="font-medium">My Achievements</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setLocation('/app/profile')}
                    className="cursor-pointer rounded-md py-2.5 px-3"
                  >
                    <User className="w-4 h-4 mr-3 text-primary" />
                    <span className="font-medium">My Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Sign Out
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
