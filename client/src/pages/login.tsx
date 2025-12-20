import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { clientAuth } from '@/lib/client-auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User as UserIcon, AlertTriangle } from 'lucide-react';
import { logError, getUserFriendlyMessage, getErrorTitle } from '@/lib/errors';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Separator } from '@/components/ui/separator';

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

interface StoredUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  hasPassword: boolean;
}

export default function Login() {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerFirstName, setRegisterFirstName] = useState('');
  const [registerLastName, setRegisterLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [availableAccounts, setAvailableAccounts] = useState<StoredUser[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<StoredUser | null>(null);
  // Check Google auth availability once at initialization since it depends on build-time env vars
  const [isGoogleAuthAvailable] = useState(() => clientAuth.isGoogleAuthAvailable());
  const { toast } = useToast();
  const { isAuthenticated, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the location the user was trying to access before being redirected to login
  const from = (location.state as { from?: string })?.from || '/app';

  // Load accounts on mount
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        // getAllUsers now returns hasPassword in each user object
        const users = await clientAuth.getAllUsers();
        setAvailableAccounts(users);
      } catch (error) {
        logError('loadAccounts', error, { component: 'Login' });
      }
    };
    loadAccounts();
  }, []);

  // Redirect authenticated users to their intended destination
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, from, navigate]);

  // Check if manually entered email matches a password-less account
  const getMatchingAccount = (email: string): StoredUser | undefined => {
    return availableAccounts.find((account) => account.email.toLowerCase() === email.toLowerCase());
  };

  const handleAccountSelect = (account: StoredUser) => {
    setSelectedAccount(account);
    setLoginEmail(account.email);
    // Clear password field when selecting account
    setLoginPassword('');
  };

  const handleEmailChange = (email: string) => {
    setLoginEmail(email);
    // Check if the entered email matches any account
    const matchingAccount = getMatchingAccount(email);
    if (matchingAccount) {
      setSelectedAccount(matchingAccount);
    } else {
      setSelectedAccount(null);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Determine if account requires password
      const accountHasPassword = selectedAccount?.hasPassword ?? true;

      // Use appropriate login method
      const result = !accountHasPassword
        ? await clientAuth.loginPasswordless(loginEmail)
        : await clientAuth.login(loginEmail, loginPassword);

      if (result.success) {
        await refreshUser();
        navigate(from, { replace: true });
      } else {
        toast({
          title: getErrorTitle(result.errorCode, 'Login Failed'),
          description: result.message || 'Unable to login',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logError('handleLogin', error, { email: loginEmail, hasSelectedAccount: !!selectedAccount });
      toast({
        title: 'Login Failed',
        description: getUserFriendlyMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await clientAuth.register(
        registerEmail,
        registerPassword,
        registerFirstName,
        registerLastName
      );

      if (result.success) {
        // Refresh the auth context to update isAuthenticated state
        await refreshUser();
        // Navigate to the page user was trying to access, or /app if registering from landing
        navigate(from, { replace: true });
      } else {
        toast({
          title: getErrorTitle(result.errorCode, 'Registration Failed'),
          description: result.message || 'Unable to create account',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logError('handleRegister', error, { email: registerEmail });
      toast({
        title: 'Registration Failed',
        description: getUserFriendlyMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);

    try {
      const result = await clientAuth.signInWithGoogle();

      if (result.success) {
        await refreshUser();
        navigate(from, { replace: true });
      } else {
        toast({
          title: getErrorTitle(result.errorCode, 'Google Sign-In Failed'),
          description: result.message || 'Unable to sign in with Google',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logError('handleGoogleSignIn', error);
      toast({
        title: 'Google Sign-In Failed',
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
          <CardTitle className="text-2xl font-bold bg-[linear-gradient(to_right,#f87aff,#fb93d0,#ffdd99,#c3f0b2,#2fd8fe)] bg-clip-text text-transparent">
            Welcome to Cert Lab
          </CardTitle>
          <p className="text-white/70">
            Master certifications with Helen's AI-powered learning lab
          </p>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-[#200d42]/50 border border-[#b48cde]/30">
              <TabsTrigger
                value="login"
                className="data-[state=active]:bg-[#9560eb] data-[state=active]:text-white text-white/70"
              >
                Login
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="data-[state=active]:bg-[#9560eb] data-[state=active]:text-white text-white/70"
              >
                Register
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Available Accounts Section */}
                {availableAccounts.length > 0 && (
                  <div className="space-y-2">
                    <Label id="accounts-label" className="text-white">
                      Available Accounts
                    </Label>
                    <div
                      className="space-y-2 max-h-60 overflow-y-auto border border-[#b48cde]/30 rounded-md p-2"
                      role="radiogroup"
                      aria-labelledby="accounts-label"
                    >
                      {availableAccounts.map((account) => (
                        <button
                          key={account.id}
                          type="button"
                          role="radio"
                          aria-checked={selectedAccount?.id === account.id}
                          onClick={() => handleAccountSelect(account)}
                          className={`w-full p-3 rounded-lg border text-left transition-all hover:border-[#9560eb] hover:bg-[#200d42]/50 ${
                            selectedAccount?.id === account.id
                              ? 'border-[#9560eb] bg-[#200d42]/70'
                              : 'border-[#b48cde]/30'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-5 w-5 text-[#b48cde]" />
                            <div className="flex-1">
                              <div className="font-medium text-sm text-white">
                                {account.firstName && account.lastName
                                  ? `${account.firstName} ${account.lastName}`
                                  : account.email}
                              </div>
                              <div className="text-xs text-white/70">
                                {account.firstName && account.lastName ? account.email : ''}
                              </div>
                            </div>
                            {!account.hasPassword && (
                              <span className="text-xs bg-amber-900 text-amber-100 px-2 py-1 rounded">
                                No password
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-white">
                    Email
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={loginEmail}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    required
                    disabled={isLoading}
                    className="bg-[#200d42]/50 border-[#b48cde]/30 text-white placeholder:text-white/50 focus:border-[#9560eb]"
                  />
                </div>

                {/* Only show password field if account requires password */}
                {(!selectedAccount || selectedAccount.hasPassword) && (
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-white">
                      Password
                    </Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required={!selectedAccount || selectedAccount.hasPassword}
                      disabled={isLoading}
                      className="bg-[#200d42]/50 border-[#b48cde]/30 text-white placeholder:text-white/50 focus:border-[#9560eb]"
                    />
                  </div>
                )}

                {selectedAccount && !selectedAccount.hasPassword && (
                  <Alert className="border-amber-700 bg-amber-950">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <AlertDescription className="text-amber-200">
                      <strong>Security Warning:</strong> This account has no password protection.
                      Anyone with access to this browser can login. Your session will automatically
                      expire after 24 hours for security.
                      <span className="block mt-1 text-xs">
                        Consider setting a password in your profile settings for added security.
                      </span>
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full bg-[#9560eb] text-white hover:bg-[#a46edb]"
                  disabled={isLoading || isGoogleLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner size="sm" variant="white" />
                      <span>Logging in...</span>
                    </div>
                  ) : (
                    'Login'
                  )}
                </Button>

                {/* Google Sign-In */}
                {isGoogleAuthAvailable && (
                  <>
                    <div className="relative my-4">
                      <Separator className="bg-[#b48cde]/30" />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 px-2 text-xs text-white/50">
                        or
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-[#b48cde]/30 bg-white text-gray-800 hover:bg-gray-100"
                      onClick={handleGoogleSignIn}
                      disabled={isLoading || isGoogleLoading}
                    >
                      {isGoogleLoading ? (
                        <div className="flex items-center space-x-2">
                          <LoadingSpinner size="sm" />
                          <span>Signing in...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <GoogleIcon className="h-5 w-5" />
                          <span>Continue with Google</span>
                        </div>
                      )}
                    </Button>
                  </>
                )}
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-white">
                    Email
                  </Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="bg-[#200d42]/50 border-[#b48cde]/30 text-white placeholder:text-white/50 focus:border-[#9560eb]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-white">
                    Password (Optional)
                  </Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="••••••••"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    disabled={isLoading}
                    minLength={registerPassword ? 8 : undefined}
                    className="bg-[#200d42]/50 border-[#b48cde]/30 text-white placeholder:text-white/50 focus:border-[#9560eb]"
                  />
                  <p className="text-xs text-white/70">
                    You can set a password later in your profile settings for added security
                  </p>
                </div>

                {/* Security warning for password-less accounts */}
                {!registerPassword && (
                  <Alert className="border-amber-800 bg-amber-950">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <AlertDescription className="text-amber-200">
                      <strong>Security Notice:</strong> Without a password, anyone with access to
                      this device can login to your account. Consider setting a password for added
                      security.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="register-firstname" className="text-white">
                    First Name
                  </Label>
                  <Input
                    id="register-firstname"
                    type="text"
                    placeholder="John"
                    value={registerFirstName}
                    onChange={(e) => setRegisterFirstName(e.target.value)}
                    disabled={isLoading}
                    className="bg-[#200d42]/50 border-[#b48cde]/30 text-white placeholder:text-white/50 focus:border-[#9560eb]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-lastname" className="text-white">
                    Last Name
                  </Label>
                  <Input
                    id="register-lastname"
                    type="text"
                    placeholder="Doe"
                    value={registerLastName}
                    onChange={(e) => setRegisterLastName(e.target.value)}
                    disabled={isLoading}
                    className="bg-[#200d42]/50 border-[#b48cde]/30 text-white placeholder:text-white/50 focus:border-[#9560eb]"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#9560eb] text-white hover:bg-[#a46edb]"
                  disabled={isLoading || isGoogleLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner size="sm" variant="white" />
                      <span>Creating account...</span>
                    </div>
                  ) : (
                    'Create Account'
                  )}
                </Button>

                {/* Google Sign-Up */}
                {isGoogleAuthAvailable && (
                  <>
                    <div className="relative my-4">
                      <Separator className="bg-[#b48cde]/30" />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 px-2 text-xs text-white/50">
                        or
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-[#b48cde]/30 bg-white text-gray-800 hover:bg-gray-100"
                      onClick={handleGoogleSignIn}
                      disabled={isLoading || isGoogleLoading}
                    >
                      {isGoogleLoading ? (
                        <div className="flex items-center space-x-2">
                          <LoadingSpinner size="sm" />
                          <span>Signing up...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <GoogleIcon className="h-5 w-5" />
                          <span>Sign up with Google</span>
                        </div>
                      )}
                    </Button>
                  </>
                )}
              </form>
            </TabsContent>
          </Tabs>

          <div className="text-center mt-4">
            <p className="text-xs text-white/50">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
