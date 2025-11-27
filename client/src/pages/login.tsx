import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clientAuth } from "@/lib/client-auth";
import { useLocation } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User as UserIcon, Info, AlertTriangle } from "lucide-react";
import { logError, getUserFriendlyMessage, getErrorTitle } from "@/lib/errors";

interface StoredUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  hasPassword: boolean;
}

export default function Login() {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerFirstName, setRegisterFirstName] = useState("");
  const [registerLastName, setRegisterLastName] = useState("");
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
    return availableAccounts.find(
      (account) => account.email.toLowerCase() === email.toLowerCase()
    );
  };

  const handleAccountSelect = (account: StoredUser) => {
    setSelectedAccount(account);
    setLoginEmail(account.email);
    // Clear password field when selecting account
    setLoginPassword("");
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
        setLocation("/app");
      } else {
        toast({
          title: getErrorTitle(result.errorCode, "Login Failed"),
          description: result.message || "Unable to login",
          variant: "destructive",
        });
      }
    } catch (error) {
      logError('handleLogin', error, { email: loginEmail, hasSelectedAccount: !!selectedAccount });
      toast({
        title: "Login Failed",
        description: getUserFriendlyMessage(error),
        variant: "destructive",
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
        setLocation("/app");
      } else {
        toast({
          title: getErrorTitle(result.errorCode, "Registration Failed"),
          description: result.message || "Unable to create account",
          variant: "destructive",
        });
      }
    } catch (error) {
      logError('handleRegister', error, { email: registerEmail });
      toast({
        title: "Registration Failed",
        description: getUserFriendlyMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    window.location.href = "/";
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

        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Available Accounts Section */}
                {availableAccounts.length > 0 && (
                  <div className="space-y-2">
                    <Label id="accounts-label">Available Accounts</Label>
                    <div 
                      className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2"
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
                          className={`w-full p-3 rounded-lg border text-left transition-all hover:border-primary hover:bg-primary/5 ${
                            selectedAccount?.id === account.id
                              ? "border-primary bg-primary/10"
                              : "border-gray-200 dark:border-gray-700"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {account.firstName && account.lastName
                                  ? `${account.firstName} ${account.lastName}`
                                  : account.email}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {account.firstName && account.lastName ? account.email : ""}
                              </div>
                            </div>
                            {!account.hasPassword && (
                              <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100 px-2 py-1 rounded">
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
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={loginEmail}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                
                {/* Only show password field if account requires password */}
                {(!selectedAccount || selectedAccount.hasPassword) && (
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required={!selectedAccount || selectedAccount.hasPassword}
                      disabled={isLoading}
                    />
                  </div>
                )}

                {selectedAccount && !selectedAccount.hasPassword && (
                  <Alert className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertDescription className="text-amber-800 dark:text-amber-200">
                      <strong>Security Warning:</strong> This account has no password protection. 
                      Anyone with access to this browser can login. 
                      Your session will automatically expire after 24 hours for security.
                      <span className="block mt-1 text-xs">
                        Consider setting a password in your profile settings for added security.
                      </span>
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Logging in...</span>
                    </div>
                  ) : (
                    "Login"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Password (Optional)</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="••••••••"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    disabled={isLoading}
                    minLength={registerPassword ? 8 : undefined}
                  />
                  <p className="text-xs text-muted-foreground">
                    You can set a password later in your profile settings for added security
                  </p>
                </div>
                
                {/* Security warning for password-less accounts */}
                {!registerPassword && (
                  <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertDescription className="text-amber-800 dark:text-amber-200">
                      <strong>Security Notice:</strong> Without a password, anyone with access to this device can login to your account. Consider setting a password for added security.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="register-firstname">First Name</Label>
                  <Input
                    id="register-firstname"
                    type="text"
                    placeholder="John"
                    value={registerFirstName}
                    onChange={(e) => setRegisterFirstName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-lastname">Last Name</Label>
                  <Input
                    id="register-lastname"
                    type="text"
                    placeholder="Doe"
                    value={registerLastName}
                    onChange={(e) => setRegisterLastName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creating account...</span>
                    </div>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="text-center mt-4">
            <p className="text-xs text-gray-500">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
