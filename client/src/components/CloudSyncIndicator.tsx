/**
 * Cloud Sync Indicator Component
 *
 * Displays the current cloud sync status in the header with real-time connection monitoring.
 * Shows whether the user is synced with Firebase, connection status, and any sync issues.
 */

import { CloudOff, Cloud, CloudAlert, Loader2, WifiOff, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';
import { useFirestoreConnection } from '@/hooks/useFirestoreConnection';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface CloudSyncIndicatorProps {
  className?: string;
  showLabel?: boolean;
  showDetailedStatus?: boolean;
}

export function CloudSyncIndicator({
  className,
  showLabel = false,
  showDetailedStatus = false,
}: CloudSyncIndicatorProps) {
  const { isCloudSyncEnabled, firebaseUser } = useAuth();
  const { status, isOnline, isSyncing, error, debugInfo } = useFirestoreConnection();

  const getStatusInfo = () => {
    // If cloud sync is disabled or user is not logged in
    if (!isCloudSyncEnabled || !firebaseUser) {
      return {
        icon: CloudOff,
        label: 'Local Only',
        description: 'Data stored locally in your browser',
        color: 'text-muted-foreground',
        showWarning: false,
      };
    }

    // Firestore connection status
    switch (status) {
      case 'connected':
        return {
          icon: isSyncing ? Loader2 : Cloud,
          label: isSyncing ? 'Syncing...' : 'Connected',
          description: 'Your data is synced with Firebase',
          color: 'text-green-500',
          showWarning: false,
          animate: isSyncing,
        };

      case 'offline':
        return {
          icon: WifiOff,
          label: 'Offline',
          description: 'No internet connection. Changes will sync when you reconnect.',
          color: 'text-yellow-500',
          showWarning: true,
        };

      case 'reconnecting':
        return {
          icon: Loader2,
          label: 'Reconnecting...',
          description: `Attempting to reconnect to Firebase... (Attempt ${(debugInfo?.reconnectAttempts ?? 0) + 1})`,
          color: 'text-yellow-500',
          showWarning: true,
          animate: true,
        };

      case 'error':
        return {
          icon: CloudAlert,
          label: 'Connection Error',
          description: 'Failed to connect to Firebase. Please check your connection.',
          color: 'text-red-500',
          showWarning: false,
        };

      case 'disabled':
      default:
        return {
          icon: CloudOff,
          label: 'Sync Disabled',
          description: 'Firebase is not configured',
          color: 'text-muted-foreground',
          showWarning: false,
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn('flex items-center gap-2 cursor-help', className)}
            data-testid="cloud-sync-indicator"
            data-status={status}
          >
            <StatusIcon
              className={cn('h-4 w-4', statusInfo.color, statusInfo.animate && 'animate-spin')}
            />
            {statusInfo.showWarning && (
              <AlertCircle className="h-3 w-3 text-yellow-500" aria-label="Warning" />
            )}
            {showLabel && (
              <span className={cn('text-sm font-medium', statusInfo.color)}>
                {statusInfo.label}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-2">
            <div>
              <p className="font-semibold">{statusInfo.label}</p>
              <p className="text-sm text-muted-foreground">{statusInfo.description}</p>
            </div>

            {firebaseUser && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Signed in as: <span className="font-medium">{firebaseUser.email}</span>
                </p>
              </div>
            )}

            {error && (
              <div className="pt-2 border-t border-red-500/20 bg-red-500/10 -mx-3 -mb-3 px-3 py-2 rounded-b-md">
                <p className="text-xs font-semibold text-red-500 mb-1">Error Details:</p>
                <p className="text-xs text-red-400 font-mono">{error.message}</p>
              </div>
            )}

            {showDetailedStatus && debugInfo && (
              <div className="pt-2 border-t border-border text-xs space-y-1">
                <p className="font-semibold text-muted-foreground">Debug Information:</p>
                <div className="space-y-0.5 font-mono">
                  <p>Browser Online: {isOnline ? '✓' : '✗'}</p>
                  <p>Firestore Initialized: {debugInfo.isFirestoreInitialized ? '✓' : '✗'}</p>
                  <p>Authenticated: {debugInfo.isAuthenticated ? '✓' : '✗'}</p>
                  {debugInfo.lastSuccessfulSync && (
                    <p>
                      Last Sync:{' '}
                      {formatDistanceToNow(debugInfo.lastSuccessfulSync, { addSuffix: true })}
                    </p>
                  )}
                  {debugInfo.reconnectAttempts > 0 && (
                    <p>Reconnect Attempts: {debugInfo.reconnectAttempts}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
