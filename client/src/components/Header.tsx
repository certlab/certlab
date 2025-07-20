import { localStorage } from "@/lib/localStorage";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Accessibility
} from "lucide-react";

export default function Header() {
  const [location, setLocation] = useLocation();
  const currentUser = localStorage.getCurrentUser();
  const { toast } = useToast();
  const isAdminArea = location.startsWith('/admin');

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest({
        method: "POST",
        endpoint: "/api/logout",
      });
    },
    onSuccess: () => {
      localStorage.clearCurrentUser();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account.",
      });
      setLocation("/");
    },
    onError: () => {
      // Even if the API call fails, we should still log out locally
      localStorage.clearCurrentUser();
      setLocation("/");
    }
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <header className="bg-card shadow-sm border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <i className="fas fa-shield-alt text-primary text-2xl"></i>
              <h1 className="text-xl font-medium text-foreground">SecuraCert</h1>
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

                  {/* Learning Section */}
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="text-muted-foreground hover:text-primary">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Learning
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="grid gap-3 p-4 w-[450px] md:w-[500px]">
                        <div className="grid grid-cols-2 gap-3">
                          <NavigationMenuLink 
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground cursor-pointer"
                            onClick={() => setLocation("/achievements")}
                          >
                            <div className="flex items-center text-sm font-medium leading-none">
                              <Trophy className="w-4 h-4 mr-2" />
                              Achievements
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              View earned badges and certifications
                            </p>
                          </NavigationMenuLink>
                          <NavigationMenuLink 
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground cursor-pointer opacity-60 pointer-events-none"
                          >
                            <div className="flex items-center text-sm font-medium leading-none">
                              <BarChart3 className="w-4 h-4 mr-2" />
                              Progress Reports
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Detailed learning analytics (Coming Soon)
                            </p>
                          </NavigationMenuLink>
                          <NavigationMenuLink 
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground cursor-pointer opacity-60 pointer-events-none"
                          >
                            <div className="flex items-center text-sm font-medium leading-none">
                              <FileText className="w-4 h-4 mr-2" />
                              Study Materials
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Downloadable resources (Coming Soon)
                            </p>
                          </NavigationMenuLink>
                          <NavigationMenuLink 
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground cursor-pointer opacity-60 pointer-events-none"
                          >
                            <div className="flex items-center text-sm font-medium leading-none">
                              <Users className="w-4 h-4 mr-2" />
                              Study Groups
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Collaborative learning (Coming Soon)
                            </p>
                          </NavigationMenuLink>
                        </div>
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>

                  {/* Tools Section */}
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="text-muted-foreground hover:text-primary">
                      <Shield className="w-4 h-4 mr-2" />
                      Tools
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="grid gap-3 p-4 w-[300px]">
                        <NavigationMenuLink 
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground cursor-pointer"
                          onClick={() => setLocation("/accessibility")}
                        >
                          <div className="flex items-center text-sm font-medium leading-none">
                            <Accessibility className="w-4 h-4 mr-2" />
                            Accessibility
                          </div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            Accessibility features and settings
                          </p>
                        </NavigationMenuLink>
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>

                  {/* Admin Section */}
                  <NavigationMenuItem>
                    <Button 
                      variant="ghost" 
                      onClick={() => setLocation("/admin")}
                      className="text-muted-foreground hover:text-primary h-10 px-4 py-2"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Admin
                    </Button>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            )}
          </nav>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {isAdminArea ? (
                  <>
                    <DropdownMenuItem 
                      onClick={() => setLocation("/app")}
                      className="cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to App
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem 
                      onClick={() => setLocation("/app")}
                      className="cursor-pointer"
                    >
                      <Home className="w-4 h-4 mr-2" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setLocation("/achievements")}
                      className="cursor-pointer"
                    >
                      <Trophy className="w-4 h-4 mr-2" />
                      Achievements
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setLocation("/accessibility")}
                      className="cursor-pointer"
                    >
                      <Accessibility className="w-4 h-4 mr-2" />
                      Accessibility
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setLocation("/admin")}
                      className="cursor-pointer"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Admin
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center space-x-4">
            <ThemeToggle />
            
            {/* User Account Section */}
            {currentUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 rounded-full">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-primary-foreground text-sm font-medium">
                          {getInitials(currentUser.username)}
                        </span>
                      </div>
                      <span className="hidden md:block text-foreground text-sm">{currentUser.username}</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{currentUser.username}</p>
                      <p className="text-xs text-muted-foreground">
                        Learning Platform User
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setLocation("/achievements")}
                    className="cursor-pointer"
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    My Achievements
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    disabled
                    className="cursor-not-allowed opacity-60"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Account Settings (Coming Soon)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
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
