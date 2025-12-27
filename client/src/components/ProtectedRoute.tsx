import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth-provider';
import { SessionLoader } from '@/components/SessionLoader';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * ProtectedRoute component that wraps routes requiring authentication.
 *
 * - Shows a session loader while checking authentication status
 * - Redirects to landing page (/) if user is not authenticated
 * - Saves the attempted location in navigation state for post-login redirect
 * - Renders children if user is authenticated
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show session loader while checking authentication
  if (isLoading) {
    return <SessionLoader message="Loading application..." />;
  }

  // Redirect to landing page if not authenticated
  // Save the current location so we can redirect back after login
  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location.pathname }} replace />;
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
}
