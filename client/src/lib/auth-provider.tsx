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
        // Initialize storage factory (now always uses Firestore)
        await initializeStorage();

        // Initialize Firebase (now mandatory)
        if (!isFirebaseConfigured()) {
          throw new Error('Firebase configuration is required but not found');
        }

        const initialized = initializeFirebase();
        if (!initialized) {
          throw new Error('Failed to initialize Firebase');
        }

        setFirebaseInitialized(initialized);
        console.log('[AuthProvider] Firebase initialized successfully');

        // Set loading to false after Firebase init
        setIsLoading(false);
      } catch (error) {
        logError('initializeAuth', error);
        setIsLoading(false);
        // Don't continue - Firebase is mandatory
      }
    };

    initializeAuth();
  }, []);

  const loadUser = useCallback(async () => {
    try {
      // Firebase user is now the only source of authentication
      if (!firebaseUser) {
        setUser(null);
        return;
      }

      // Get or create user from Firestore
      let firestoreUser = await storage.getUser(firebaseUser.uid);

      if (!firestoreUser) {
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
        firestoreUser = await storage.getUser(firebaseUser.uid);
      }

      if (firestoreUser) {
        setUser(firestoreUser);
        identifyUser(firestoreUser.id);
      } else {
        setUser(null);
      }
    } catch (error) {
      logError('loadUser', error);
      setUser(null);
    }
  }, [firebaseUser]);

  // Listen to Firebase auth state changes
  useEffect(() => {
    if (!firebaseInitialized) return;

    const unsubscribe = onFirebaseAuthStateChanged(async (fbUser) => {
      const previousFirebaseUser = firebaseUser;

      // Only set loading state for substantive auth changes (sign-in/sign-out)
      // Skip loading for token refreshes and minor state updates
      const isSubstantiveChange =
        (!previousFirebaseUser && fbUser) || // User signed in
        (previousFirebaseUser && !fbUser); // User signed out

      if (isSubstantiveChange) {
        setIsLoading(true);
      }

      setFirebaseUser(fbUser);

      if (fbUser) {
        console.log('[AuthProvider] Firebase user signed in:', fbUser.email);
        await setStorageMode('cloud');
        await storage.setCurrentUserId(fbUser.uid);
      } else {
        console.log('[AuthProvider] Firebase user signed out');
        // Clear storage when user signs out
        await storage.clearCurrentUser();
      }

      // Trigger user load whenever Firebase auth state changes
      await loadUser();

      // Set loading to false after Firebase sync completes
      if (isSubstantiveChange) {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [firebaseInitialized, loadUser, firebaseUser]);

  const logout = useCallback(async () => {
    try {
      // End Dynatrace session
      endSession();

      // Sign out from Firebase (now the only auth method)
      await signOutFromGoogle();

      // Clear storage
      await storage.clearCurrentUser();

      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      logError('logout', error);
    }
  }, []);

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
