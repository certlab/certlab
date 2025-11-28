import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clientAuth } from "./client-auth";
import { clientStorage } from "./client-storage";
import { logError } from "./errors";

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

  const loadUser = useCallback(async () => {
    try {
      const currentUser = await clientAuth.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      logError('loadUser', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const logout = useCallback(async () => {
    // Construct the logout redirect URL dynamically based on environment configuration
    // Uses BASE_URL from vite.config.ts combined with current origin
    const logoutUrl = window.location.origin + (import.meta.env.BASE_URL || '/');
    
    // Delay before redirect to allow toast notifications to be visible
    const LOGOUT_DELAY_MS = 1000;
    
    try {
      const result = await clientAuth.logout();
      if (!result.success) {
        logError('logout', new Error(result.message || 'Logout failed'));
      }
      setUser(null);
      // Wait briefly to allow any toast notifications to be visible
      await new Promise((resolve) => setTimeout(resolve, LOGOUT_DELAY_MS));
    } catch (error) {
      logError('logout', error);
    } finally {
      // Always redirect to the landing page, even on error
      window.location.href = logoutUrl;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  const switchTenant = useCallback(async (tenantId: number) => {
    if (!user) {
      throw new Error('No user logged in');
    }
    
    try {
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
      logError('switchTenant', error, { tenantId });
      throw error;
    }
  }, [user, loadUser]);

  const contextValue = useMemo<AuthContextType>(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
    refreshUser,
    switchTenant,
  }), [user, isLoading, logout, refreshUser, switchTenant]);

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