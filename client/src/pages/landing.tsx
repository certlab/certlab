import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Shield, BookOpen, Target, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-provider";
import { useLocation } from "wouter";

export default function Landing() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  
  const handleLogin = () => {
    window.location.href = "/api/login";
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
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