import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const handleReplitLogin = () => {
    setIsLoading(true);
    try {
      // Redirect to Replit Auth
      window.location.href = '/api/login';
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Unable to start authentication. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    window.location.href = '/';
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md material-shadow animate-slide-up">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <i className="fas fa-shield-alt text-primary text-3xl"></i>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Welcome to Cert Lab
          </CardTitle>
          <p className="text-gray-600">
            Master certifications with Helen's AI-powered learning lab
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Sign in to continue</h3>
            <p className="text-sm text-gray-600 mb-6">
              Use your Replit account to access Cert Lab
            </p>
          </div>

          <Button
            onClick={handleReplitLogin}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Connecting...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.5 4.5c-1.5 0-2.5 1-2.5 2.5v10c0 1.5 1 2.5 2.5 2.5h9c1.5 0 2.5-1 2.5-2.5V7c0-1.5-1-2.5-2.5-2.5h-9zm0 1.5h9c.5 0 1 .5 1 1v10c0 .5-.5 1-1 1h-9c-.5 0-1-.5-1-1V7c0-.5.5-1 1-1z"/>
                </svg>
                <span>Continue with Replit</span>
              </div>
            )}
          </Button>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
