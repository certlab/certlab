import { localStorage } from "@/lib/localStorage";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Header() {
  const [, setLocation] = useLocation();
  const currentUser = localStorage.getCurrentUser();
  const { toast } = useToast();

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
          
          <nav className="hidden md:flex items-center space-x-6">
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/")}
              className="text-muted-foreground hover:text-primary"
            >
              Dashboard
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/admin")}
              className="text-muted-foreground hover:text-primary"
            >
              <i className="fas fa-cog mr-2"></i>
              Admin
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/accessibility")}
              className="text-muted-foreground hover:text-primary"
            >
              <i className="fas fa-universal-access mr-2"></i>
              Accessibility
            </Button>
          </nav>

          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {currentUser && (
              <div className="hidden md:flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground text-sm font-medium">
                    {getInitials(currentUser.username)}
                  </span>
                </div>
                <span className="text-foreground text-sm">{currentUser.username}</span>
              </div>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <i className="fas fa-sign-out-alt mr-2"></i>
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
