import { createContext, useContext, useEffect, useState } from "react";
import { clientAuth } from "./client-auth";

interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  role: string;
  tenantId: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  switchTenant: (tenantId: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = async () => {
    try {
      const currentUser = await clientAuth.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const logout = async () => {
    try {
      await clientAuth.logout();
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
    }
  };

  const refreshUser = async () => {
    await loadUser();
  };

  const switchTenant = async (tenantId: number) => {
    if (!user) {
      throw new Error('No user logged in');
    }
    
    try {
      // Import clientStorage dynamically to avoid circular dependencies
      const { clientStorage } = await import('./client-storage');
      
      // Validate that the tenant exists and is active
      const tenant = await clientStorage.getTenant(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }
      if (!tenant.isActive) {
        throw new Error('Cannot switch to inactive tenant');
      }
      
      // Update user's tenant
      await clientStorage.updateUser(user.id, { tenantId });
      
      // Reload user to get updated tenant
      await loadUser();
    } catch (error) {
      console.error('Error switching tenant:', error);
      throw error;
    }
  };

  const contextValue: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
    refreshUser,
    switchTenant,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}