import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { logError } from './errors';
import {
  initializeFirebase,
  isFirebaseConfigured,
  onFirebaseAuthStateChanged,
  signOutFromGoogle,
  type FirebaseUser,
} from './firebase';
import { initializeStorage, isCloudSyncAvailable } from './storage-factory';
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

// Session storage keys for optimistic auth state
const AUTH_STATE_KEY = 'certlab_auth_state';
const AUTH_USER_KEY = 'certlab_auth_user';
const AUTH_TIMESTAMP_KEY = 'certlab_auth_timestamp';

// Session considered stale after 24 hours
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Helper to get cached auth state synchronously
function getCachedAuthState(): { isAuthenticated: boolean; user: User | null } {
  try {
    // Check if sessionStorage is available (not in SSR or restricted environments)
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return { isAuthenticated: false, user: null };
    }

    const authState = sessionStorage.getItem(AUTH_STATE_KEY);
    const userJson = sessionStorage.getItem(AUTH_USER_KEY);
    const timestamp = sessionStorage.getItem(AUTH_TIMESTAMP_KEY);

    if (authState === 'authenticated' && userJson && timestamp) {
      const timestampNum = parseInt(timestamp, 10);

      // Validate timestamp is a valid number
      if (isNaN(timestampNum)) {
        console.warn('[Auth] Invalid cached timestamp, clearing cache');
        sessionStorage.removeItem(AUTH_STATE_KEY);
        sessionStorage.removeItem(AUTH_USER_KEY);
        sessionStorage.removeItem(AUTH_TIMESTAMP_KEY);
        return { isAuthenticated: false, user: null };
      }

      const sessionAge = Date.now() - timestampNum;

      // Check if session is stale
      if (sessionAge > SESSION_MAX_AGE_MS) {
        console.log('[Auth] Cached session is stale, clearing cache');
        // Clear stale session
        sessionStorage.removeItem(AUTH_STATE_KEY);
        sessionStorage.removeItem(AUTH_USER_KEY);
        sessionStorage.removeItem(AUTH_TIMESTAMP_KEY);
        return { isAuthenticated: false, user: null };
      }

      // Parse cached user data with error handling
      try {
        const user = JSON.parse(userJson) as User;
        return { isAuthenticated: true, user };
      } catch (parseError) {
        console.warn('[Auth] Failed to parse cached user data, clearing cache:', parseError);
        sessionStorage.removeItem(AUTH_STATE_KEY);
        sessionStorage.removeItem(AUTH_USER_KEY);
        sessionStorage.removeItem(AUTH_TIMESTAMP_KEY);
        return { isAuthenticated: false, user: null };
      }
    }
  } catch (error) {
    console.warn('[Auth] Failed to read cached auth state:', error);
  }

  return { isAuthenticated: false, user: null };
}

// Helper to cache auth state synchronously
function cacheAuthState(isAuthenticated: boolean, user: User | null) {
  try {
    // Check if sessionStorage is available (not in SSR or restricted environments)
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return;
    }

    if (isAuthenticated && user) {
      sessionStorage.setItem(AUTH_STATE_KEY, 'authenticated');
      sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      sessionStorage.setItem(AUTH_TIMESTAMP_KEY, Date.now().toString());
    } else {
      sessionStorage.removeItem(AUTH_STATE_KEY);
      sessionStorage.removeItem(AUTH_USER_KEY);
      sessionStorage.removeItem(AUTH_TIMESTAMP_KEY);
    }
  } catch (error) {
    console.warn('[Auth] Failed to cache auth state:', error);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize with cached auth state to prevent flash
  const cachedAuth = getCachedAuthState();
  const [user, setUser] = useState<User | null>(cachedAuth.user);
  // Always start with loading state true - will be set to false after auth validation completes
  // This ensures we validate the session (even cached ones) before showing content
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);

  // Initialize Firebase and storage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // In development, Firebase is optional - use local auth as fallback
        const isDevelopment = import.meta.env.DEV;

        // Check Firebase configuration first
        if (!isFirebaseConfigured()) {
          if (!isDevelopment) {
            // Firebase is required in production
            const error = new Error('Firebase configuration is required but not found');
            setInitError(error);
            setIsLoading(false);
            setAuthInitialized(true);
            return;
          }
          // In development, continue without Firebase
          console.warn('[Auth] Firebase not configured, using local authentication only');
          setFirebaseInitialized(true);
          await initializeStorage(null);

          // Check for existing local session
          const currentUserId = await storage.getCurrentUserId();
          if (currentUserId) {
            const existingUser = await storage.getUserById(currentUserId);
            if (existingUser) {
              setUser(existingUser);
              cacheAuthState(true, existingUser);
              identifyUser(existingUser.id);
            } else {
              // Session was invalid, clear cache
              cacheAuthState(false, null);
              setUser(null);
            }
          } else {
            // No session found, clear any stale cache
            cacheAuthState(false, null);
            setUser(null);
          }

          setIsLoading(false);
          setAuthInitialized(true);
          return;
        }

        // Initialize Firebase before storage
        const initialized = await initializeFirebase();
        if (!initialized) {
          const error = new Error('Failed to initialize Firebase');
          setInitError(error);
          setIsLoading(false);
          setAuthInitialized(true);
          return;
        }

        setFirebaseInitialized(initialized);
        console.log('[AuthProvider] Firebase initialized successfully');

        // Initialize storage factory after Firebase is ready
        await initializeStorage();

        // Don't set loading to false yet - wait for Firebase auth state listener
        // to determine if user is authenticated
      } catch (error) {
        logError('initializeAuth', error);
        setInitError(error instanceof Error ? error : new Error('Unknown initialization error'));
        setIsLoading(false);
        setAuthInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  const loadUser = useCallback(async (): Promise<User | null> => {
    try {
      // Firebase user is now the only source of authentication
      if (!firebaseUser) {
        setUser(null);
        cacheAuthState(false, null);
        return null;
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
        cacheAuthState(true, firestoreUser);
        identifyUser(firestoreUser.id);
        return firestoreUser;
      } else {
        setUser(null);
        cacheAuthState(false, null);
        return null;
      }
    } catch (error) {
      logError('loadUser', error);
      setUser(null);
      cacheAuthState(false, null);
      return null;
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

      if (isSubstantiveChange && authInitialized) {
        setIsLoading(true);
      }

      setFirebaseUser(fbUser);

      if (fbUser) {
        console.log('[AuthProvider] Firebase user signed in:', fbUser.email);
        await storage.setCurrentUserId(fbUser.uid);
      } else {
        console.log('[AuthProvider] Firebase user signed out');
        // Clear storage when user signs out
        await storage.clearCurrentUser();
      }

      // Trigger user load whenever Firebase auth state changes
      const loadedUser = await loadUser();

      // Mark auth as initialized after first load
      if (!authInitialized) {
        setAuthInitialized(true);
      }

      // Set loading to false after Firebase sync completes
      if (isSubstantiveChange || !authInitialized) {
        setIsLoading(false);
      }

      // Process daily login for gamification (non-blocking)
      // This runs in the background after user is loaded and UI is unblocked
      if (fbUser && loadedUser) {
        void (async () => {
          try {
            const { gamificationService } = await import('./gamification-service');
            await gamificationService.processDailyLogin(fbUser.uid, loadedUser.tenantId);
          } catch (error) {
            console.error('Failed to process daily login:', error);
          }
        })();
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

      // Clear cached auth state
      cacheAuthState(false, null);
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

  // If there was an initialization error, throw it so ErrorBoundary can catch it
  if (initError) {
    throw initError;
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
