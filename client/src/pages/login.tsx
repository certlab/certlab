import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { logError, getUserFriendlyMessage, getErrorTitle, AuthError } from '@/lib/errors';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { signInWithGoogle } from '@/lib/firebase';

/**
 * Google "G" logo SVG icon component
 * Used for Google Sign-In buttons
 */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" role="img" aria-label="Google logo">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function Login() {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the location the user was trying to access before being redirected to login
  const from = (location.state as { from?: string })?.from || '/app';

  // Redirect authenticated users to their intended destination
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, from, navigate]);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);

    try {
      await signInWithGoogle();
      await refreshUser();
      navigate(from, { replace: true });
    } catch (error) {
      logError('handleGoogleSignIn', error);
      const errorCode = error instanceof AuthError ? error.code : undefined;
      toast({
        title: getErrorTitle(errorCode, 'Google Sign-In Failed'),
        description: getUserFriendlyMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Don't render login form if already authenticated
  // The useEffect above will handle the redirect
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(to_bottom,#000,#200d42_34%,#4f21a1_65%,#a46edb_82%)] text-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md border border-[#b48cde]/50 bg-black/60 backdrop-blur-sm animate-slide-up">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 bg-white text-black justify-center items-center rounded-lg inline-flex">
              <i className="fas fa-shield-alt text-2xl"></i>
            </div>
          </div>
          <h1 className="text-2xl font-bold bg-[linear-gradient(to_right,#f87aff,#fb93d0,#ffdd99,#c3f0b2,#2fd8fe)] bg-clip-text text-transparent">
            Sign In to Cert Lab
          </h1>
          <p className="text-white/70 mt-2">
            Master certifications with Helen's AI-powered learning lab
          </p>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <p className="text-center text-white/80 text-sm">
              Sign in with your Google account to get started
            </p>

            <Button
              type="button"
              className="w-full border-[#b48cde]/30 bg-white text-gray-800 hover:bg-gray-100"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <div className="flex items-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span>Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <GoogleIcon className="h-5 w-5" />
                  <span>Sign in with Google</span>
                </div>
              )}
            </Button>
          </div>

          <div className="text-center mt-6">
            <p className="text-xs text-white/50">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
