import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Shield, BookOpen, Target, ArrowRight, User, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-provider";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Landing() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const handleGoToDashboard = () => {
    setLocation("/app");
  };

  const handleLogout = async () => {
    await logout();
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return '?';
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase() || '?';
  };

  const getUserDisplayName = (user: any) => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) return user.firstName;
    if (user?.lastName) return user.lastName;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation bar for authenticated users */}
      {isAuthenticated && user && (
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-8 h-8 text-primary" />
                <span className="text-xl font-bold text-foreground">Cert Lab</span>
              </div>
              <div className="flex items-center gap-4">
                <Button 
                  onClick={handleGoToDashboard}
                  variant="default"
                  className="flex items-center gap-2"
                  data-testid="go-to-dashboard"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 rounded-full px-2 hover:bg-accent/10">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center shadow-glow">
                          <span className="text-primary-foreground text-sm font-semibold">
                            {getInitials(user.firstName, user.lastName)}
                          </span>
                        </div>
                        <span className="hidden md:block text-foreground text-sm font-medium">
                          {getUserDisplayName(user)}
                        </span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuItem onClick={() => setLocation("/app/profile")}>
                      <User className="w-4 h-4 mr-2" />
                      My Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>
      )}
      
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Master Your Certifications
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            AI-powered learning platform for CISSP, CISM, and other professional certifications
          </p>
          {isAuthenticated ? (
            <div className="space-y-4">
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Welcome back, {getUserDisplayName(user)}!
              </p>
              <Button 
                onClick={handleGoToDashboard} 
                size="lg" 
                className="px-8 py-3 text-lg"
                data-testid="dashboard-button"
              >
                Continue Learning
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ) : (
            <Button 
              onClick={handleLogin} 
              size="lg" 
              className="px-8 py-3 text-lg"
              data-testid="get-started-button"
            >
              Get Started
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="text-center">
            <CardHeader>
              <GraduationCap className="w-12 h-12 mx-auto mb-4 text-blue-500" />
              <CardTitle className="text-lg">Adaptive Learning</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                AI-powered system adapts to your learning pace and identifies knowledge gaps
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Shield className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <CardTitle className="text-lg">Multi-Tenant</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Secure multi-tenant architecture for organizations and teams
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-purple-500" />
              <CardTitle className="text-lg">Smart Lectures</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                AI generates personalized lectures based on your weak topics
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Target className="w-12 h-12 mx-auto mb-4 text-orange-500" />
              <CardTitle className="text-lg">Achievement System</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Gamified progress tracking with badges and level progression
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}