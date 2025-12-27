import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-provider';

/**
 * Hook to validate session state and provide loading indicators
 * Ensures consistent session validation across all pages
 */
export function useSessionValidator() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    // Session is valid once auth is not loading
    if (!isLoading) {
      setIsValidating(false);
    }
  }, [isLoading]);

  return {
    isValidating: isLoading || isValidating,
    isAuthenticated,
    user,
    isSessionValid: !isLoading && isAuthenticated,
  };
}
