import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clientAuth } from './client-auth';
import { logError } from './errors';
import {
  initializeFirebase,
  isFirebaseConfigured,
  onFirebaseAuthStateChanged,
  signOutFromGoogle,
  type FirebaseUser,
} from './firebase';
import { initializeStorage, setStorageMode, isCloudSyncAvailable } from './storage-factory';
import { storage } from './storage-factory';
import { identifyUser, endSession } from './dynatrace';

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
  tenantId: number | undefined;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  switchTenant: (tenantId: number) => Promise<void>;
  isCloudSyncEnabled: boolean;
  firebaseUser: FirebaseUser | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);

  // Initialize Firebase and storage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Initialize storage factory
        await initializeStorage();

        // Initialize Firebase if configured
        if (isFirebaseConfigured()) {
          const initialized = initializeFirebase();
          setFirebaseInitialized(initialized);

          if (initialized) {
            console.log('[AuthProvider] Firebase initialized successfully');
          }
        }
      } catch (error) {
        logError('initializeAuth', error);
      }
    };

    initializeAuth();
  }, []);

  const loadUser = useCallback(async () => {
    try {
      // First, try to get user from local storage (for backward compatibility)
      const currentUser = await clientAuth.getCurrentUser();
      setUser(currentUser);

      // Identify user in Dynatrace for session tracking
      if (currentUser) {
        identifyUser(currentUser.id);
      }

      // If we have a Firebase user, sync with Firestore
      if (firebaseUser && isCloudSyncAvailable()) {
        try {
          // Try to get user from Firestore
          const firestoreUser = await storage.getUser(firebaseUser.uid);

          if (firestoreUser) {
            setUser(firestoreUser);
            identifyUser(firestoreUser.id);
          } else if (currentUser) {
            // Create user in Firestore if they don't exist
            await storage.createUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              firstName: firebaseUser.displayName?.split(' ')[0] || null,
              lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || null,
              profileImageUrl: firebaseUser.photoURL,
              role: 'user',
              tenantId: 1,
            });

            // Reload from Firestore
            const newUser = await storage.getUser(firebaseUser.uid);
            if (newUser) {
              setUser(newUser);
              identifyUser(newUser.id);
            }
          }
        } catch (error) {
          logError('loadUser.firestore', error);
          // Continue with local user if Firestore fails
        }
      }
    } catch (error) {
      logError('loadUser', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [firebaseUser]);

  // Listen to Firebase auth state changes
  useEffect(() => {
    if (!firebaseInitialized) return;

    const unsubscribe = onFirebaseAuthStateChanged(async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        console.log('[AuthProvider] Firebase user signed in:', fbUser.email);
        await setStorageMode('cloud');
        await storage.setCurrentUserId(fbUser.uid);
      } else {
        console.log('[AuthProvider] Firebase user signed out');
        await setStorageMode('local');
      }

      // Trigger user load whenever Firebase auth state changes
      await loadUser();
    });

    return () => unsubscribe();
  }, [firebaseInitialized, loadUser]);

  // Initial load from local storage
  useEffect(() => {
    if (!firebaseInitialized) {
      loadUser();
    }
  }, [firebaseInitialized, loadUser]);

  const logout = useCallback(async () => {
    try {
      // End Dynatrace session
      endSession();

      // Sign out from Firebase if authenticated
      if (firebaseUser) {
        await signOutFromGoogle();
      }

      // Clear local auth
      const result = await clientAuth.logout();
      if (!result.success) {
        logError('logout', new Error(result.message || 'Logout failed'));
      }

      // Clear storage
      await storage.clearCurrentUser();

      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      logError('logout', error);
    }
  }, [firebaseUser]);

  const refreshUser = useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  const switchTenant = useCallback(
    async (tenantId: number) => {
      if (!user) {
        throw new Error('No user logged in');
      }

      try {
        // Validate that the tenant exists and is active
        const tenant = await storage.getTenant(tenantId);
        if (!tenant) {
          throw new Error('Tenant not found');
        }
        if (!tenant.isActive) {
          throw new Error('Cannot switch to inactive tenant');
        }

        // Update user's tenant
        await storage.updateUser(user.id, { tenantId });

        // Reload user to get updated tenant
        await loadUser();
      } catch (error) {
        logError('switchTenant', error, { tenantId });
        throw error;
      }
    },
    [user, loadUser]
  );

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      tenantId: user?.tenantId,
      logout,
      refreshUser,
      switchTenant,
      isCloudSyncEnabled: !!firebaseUser && isCloudSyncAvailable(),
      firebaseUser,
    }),
    [user, isLoading, logout, refreshUser, switchTenant, firebaseUser]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
