import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { clientAuth } from '@/lib/client-auth';
import { useLocation } from 'wouter';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User as UserIcon, Info, AlertTriangle } from 'lucide-react';
import { logError, getUserFriendlyMessage, getErrorTitle } from '@/lib/errors';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

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
  const [availableAccounts, setAvailableAccounts] = useState<StoredUser[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<StoredUser | null>(null);
  const { toast } = useToast();
  const { isAuthenticated, refreshUser } = useAuth();
  const [, setLocation] = useLocation();

  // Load available accounts on mount
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
        setLocation('/app');
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
        // Use relative navigation for GitHub Pages compatibility
        setLocation('/app');
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

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    window.location.href = '/';
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
                  disabled={isLoading}
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
                  disabled={isLoading}
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
