import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import NewFeatureBadge from "@/components/NewFeatureBadge";
import { isFeatureUnlocked } from "@/lib/feature-discovery";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  Home, 
  Settings, 
  Menu, 
  BookOpen, 
  Trophy, 
  BarChart3,
  FileText,
  Users,
  Database,
  Shield,
  ArrowLeft,
  ChevronDown,
  Accessibility,
  X
} from "lucide-react";

export default function Header() {
  const [location, setLocation] = useLocation();
  const { user: currentUser, logout } = useAuth();
  const { toast } = useToast();
  const isAdminArea = location.startsWith('/admin');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account.",
      });
      setLocation("/");
    } catch (error) {
      // Even if the API call fails, we should still log out locally
      toast({
        title: "Signed out",
        description: "You have been logged out of your account.",
      });
      setLocation("/");
    }
  };



  const getInitials = (firstName?: string, lastName?: string) => {
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
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 group cursor-pointer">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-foreground tracking-tight">Cert Lab</h1>
            </div>
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
                  onClick={() => setLocation("/app")}
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
                      onClick={() => setLocation("/app")}
                      className="text-muted-foreground hover:text-primary h-10 px-4 py-2"
                    >
                      <Home className="w-4 h-4 mr-2" />
                      Dashboard
                    </Button>
                  </NavigationMenuItem>

                  {/* Tools & Features Mega Menu */}
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="text-muted-foreground hover:text-primary h-10 px-4 py-2 font-medium transition-colors">
                      <Settings className="w-4 h-4 mr-2" />
                      Tools & Features
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="grid gap-6 p-6 w-[600px] md:w-[700px] bg-card">
                        {/* Learning Section */}
                        <div>
                          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            Learning Features
                          </h3>
                          <div className="grid grid-cols-2 gap-3">
                            <NewFeatureBadge featureId="achievements">
                              <NavigationMenuLink 
                                className="block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all hover:bg-accent/10 hover:shadow-soft focus:bg-accent/10 focus:shadow-soft cursor-pointer group"
                                onClick={() => setLocation("/achievements")}
                              >
                              <div className="flex items-center text-sm font-medium leading-none text-foreground group-hover:text-primary transition-colors">
                                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2 group-hover:bg-primary/20 transition-colors">
                                  <Trophy className="w-3 h-3 text-primary" />
                                </div>
                                Achievements
                              </div>
                              <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                                View earned badges and certifications
                              </p>
                              </NavigationMenuLink>
                            </NewFeatureBadge>
                            <NewFeatureBadge featureId="study-groups">
                              <NavigationMenuLink 
                                className="block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all hover:bg-accent/10 hover:shadow-soft focus:bg-accent/10 focus:shadow-soft cursor-pointer group"
                                onClick={() => setLocation("/study-groups")}
                              >
                              <div className="flex items-center text-sm font-medium leading-none text-foreground group-hover:text-primary transition-colors">
                                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2 group-hover:bg-primary/20 transition-colors">
                                  <Users className="w-3 h-3 text-primary" />
                                </div>
                                Study Groups
                              </div>
                              <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                                Collaborate with other learners
                              </p>
                              </NavigationMenuLink>
                            </NewFeatureBadge>
                          </div>
                        </div>

                        {/* Tools Section */}
                        <div>
                          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Developer Tools
                          </h3>
                          <div className="grid grid-cols-2 gap-3">
                            <NavigationMenuLink 
                              className="block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all hover:bg-accent/10 hover:shadow-soft focus:bg-accent/10 focus:shadow-soft cursor-pointer group"
                              onClick={() => setLocation("/accessibility")}
                            >
                              <div className="flex items-center text-sm font-medium leading-none text-foreground group-hover:text-primary transition-colors">
                                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2 group-hover:bg-primary/20 transition-colors">
                                  <Accessibility className="w-3 h-3 text-primary" />
                                </div>
                                Accessibility
                              </div>
                              <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                                Check color contrast and accessibility features
                              </p>
                            </NavigationMenuLink>
                            <NavigationMenuLink 
                              className="block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all hover:bg-accent/10 hover:shadow-soft focus:bg-accent/10 focus:shadow-soft cursor-pointer group"
                              onClick={() => setLocation("/ui-structure")}
                            >
                              <div className="flex items-center text-sm font-medium leading-none text-foreground group-hover:text-primary transition-colors">
                                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2 group-hover:bg-primary/20 transition-colors">
                                  <Database className="w-3 h-3 text-primary" />
                                </div>
                                UI Structure
                              </div>
                              <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                                Interactive visualization of application architecture
                              </p>
                            </NavigationMenuLink>
                          </div>
                        </div>

                        {/* Admin Section */}
                        <div>
                          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Administration
                          </h3>
                          <div className="grid grid-cols-1 gap-3">
                            <NavigationMenuLink 
                              className="block select-none space-y-2 rounded-lg p-3 leading-none no-underline outline-none transition-all hover:bg-accent/10 hover:shadow-soft focus:bg-accent/10 focus:shadow-soft cursor-pointer group"
                              onClick={() => setLocation("/admin")}
                            >
                              <div className="flex items-center text-sm font-medium leading-none text-foreground group-hover:text-primary transition-colors">
                                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2 group-hover:bg-primary/20 transition-colors">
                                  <Settings className="w-3 h-3 text-primary" />
                                </div>
                                Admin Dashboard
                              </div>
                              <p className="text-xs leading-relaxed text-muted-foreground pl-8">
                                Manage users, content, and system settings
                              </p>
                            </NavigationMenuLink>
                          </div>
                        </div>
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            )}
          </nav>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center space-x-2">
            <ThemeToggle />
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px]">
                <SheetHeader className="pb-6 border-b">
                  <SheetTitle className="text-left">Navigation</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col space-y-4 mt-6">
                  {isAdminArea ? (
                    <>
                      <Button 
                        variant="ghost" 
                        onClick={() => {
                          setLocation("/app");
                          setMobileMenuOpen(false);
                        }}
                        className="justify-start w-full"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to App
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        variant="ghost" 
                        onClick={() => {
                          setLocation("/app");
                          setMobileMenuOpen(false);
                        }}
                        className="justify-start w-full"
                      >
                        <Home className="w-4 h-4 mr-2" />
                        Dashboard
                      </Button>
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">Learning</div>
                        <Button 
                          variant="ghost" 
                          onClick={() => {
                            setLocation("/achievements");
                            setMobileMenuOpen(false);
                          }}
                          className="justify-start w-full"
                        >
                          <Trophy className="w-4 h-4 mr-2" />
                          Achievements
                        </Button>
                        <Button 
                          variant="ghost" 
                          onClick={() => {
                            setLocation("/study-groups");
                            setMobileMenuOpen(false);
                          }}
                          className="justify-start w-full"
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Study Groups
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">Tools</div>
                        <Button 
                          variant="ghost" 
                          onClick={() => {
                            setLocation("/accessibility");
                            setMobileMenuOpen(false);
                          }}
                          className="justify-start w-full"
                        >
                          <Accessibility className="w-4 h-4 mr-2" />
                          Accessibility
                        </Button>
                        <Button 
                          variant="ghost" 
                          onClick={() => {
                            setLocation("/ui-structure");
                            setMobileMenuOpen(false);
                          }}
                          className="justify-start w-full"
                        >
                          <Database className="w-4 h-4 mr-2" />
                          UI Structure
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">Admin</div>
                        <Button 
                          variant="ghost" 
                          onClick={() => {
                            setLocation("/admin");
                            setMobileMenuOpen(false);
                          }}
                          className="justify-start w-full"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Admin Dashboard
                        </Button>
                      </div>
                    </>
                  )}
                </div>
                {currentUser && (
                  <div className="mt-auto pt-6 border-t">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/5 mb-4">
                      <div className="w-10 h-10 gradient-primary rounded-full flex items-center justify-center shadow-glow">
                        <span className="text-primary-foreground text-sm font-semibold">
                          {getInitials(currentUser.firstName, currentUser.lastName)}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <p className="text-sm font-semibold">{getUserDisplayName(currentUser)}</p>
                        <p className="text-xs text-muted-foreground">
                          Certification Student
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <ThemeToggle />
            
            {/* User Account Section */}
            {currentUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 rounded-full px-2 hover:bg-accent/10 transition-all">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center shadow-glow">
                        <span className="text-primary-foreground text-sm font-semibold">
                          {getInitials(currentUser.firstName, currentUser.lastName)}
                        </span>
                      </div>
                      <span className="hidden md:block text-foreground text-sm font-medium">{getUserDisplayName(currentUser)}</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 p-2" align="end" forceMount>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/5">
                    <div className="w-12 h-12 gradient-primary rounded-full flex items-center justify-center shadow-glow">
                      <span className="text-primary-foreground text-lg font-semibold">
                        {getInitials(currentUser.firstName, currentUser.lastName)}
                      </span>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold">{getUserDisplayName(currentUser)}</p>
                      <p className="text-xs text-muted-foreground">
                        Certification Student
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="my-2" />
                  <DropdownMenuItem 
                    onClick={() => setLocation("/achievements")}
                    className="cursor-pointer rounded-md py-2.5 px-3 focus:bg-accent/10"
                  >
                    <Trophy className="w-4 h-4 mr-3 text-primary" />
                    <span className="font-medium">My Achievements</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    disabled
                    className="cursor-not-allowed opacity-60 rounded-md py-2.5 px-3"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Account Settings (Coming Soon)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleLogout}
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
