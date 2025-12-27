import { useAuth } from '@/lib/auth-provider';

/**
 * Hook to validate session state and provide loading indicators
 * Ensures consistent session validation across all pages
 *
 * Note: This is a convenience wrapper around useAuth that provides
 * a more semantic API for pages that need explicit session checking.
 */
export function useSessionValidator() {
  const { isAuthenticated, isLoading, user } = useAuth();

  return {
    // isValidating is an alias for isLoading for better semantics
    isValidating: isLoading,
    isAuthenticated,
    user,
    isSessionValid: !isLoading && isAuthenticated,
  };
}
