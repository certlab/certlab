import { useState, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Shield, BookOpen, Target, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-provider";
import { useLocation } from "wouter";

// Lazy load Login component to reduce initial bundle size
const Login = lazy(() => import("./login"));

export default function Landing() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [showLogin, setShowLogin] = useState(false);
  
  const handleLogin = () => {
    setShowLogin(true);
  };

  const handleGoToDashboard = () => {
    setLocation("/app");
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

  if (showLogin) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-background flex items-center justify-center" role="status" aria-live="polite">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <span className="sr-only">Loading login...</span>
        </div>
      }>
        <Login />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Master Your Certifications
          </h1>
          <p className="text-xl text-gray-700 dark:text-gray-200 mb-8">
            AI-powered learning platform for CISSP, CISM, and other professional certifications
          </p>
          {isAuthenticated ? (
            <div className="space-y-4">
              <p className="text-lg text-gray-700 dark:text-gray-200">
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
              <p className="text-sm text-muted-foreground">
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
              <p className="text-sm text-muted-foreground">
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
              <p className="text-sm text-muted-foreground">
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
              <p className="text-sm text-muted-foreground">
                Gamified progress tracking with badges and level progression
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}