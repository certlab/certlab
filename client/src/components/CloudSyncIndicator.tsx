/**
 * Cloud Sync Indicator Component
 *
 * Displays the current cloud sync status in the header.
 * Shows whether the user is synced with Firebase or using local-only mode.
 */

import { CloudOff, Cloud } from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface CloudSyncIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

export function CloudSyncIndicator({ className, showLabel = false }: CloudSyncIndicatorProps) {
  const { isCloudSyncEnabled, firebaseUser } = useAuth();

  // Determine the sync status
  const syncStatus = isCloudSyncEnabled && firebaseUser ? 'synced' : 'local';

  const getStatusInfo = () => {
    switch (syncStatus) {
      case 'synced':
        return {
          icon: Cloud,
          label: 'Cloud Sync Active',
          description: 'Your data is synced with Firebase',
          color: 'text-green-500',
        };
      case 'local':
      default:
        return {
          icon: CloudOff,
          label: 'Local Only',
          description: 'Data stored locally in your browser',
          color: 'text-muted-foreground',
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-2 cursor-help', className)}>
            <StatusIcon className={cn('h-4 w-4', statusInfo.color)} />
            {showLabel && (
              <span className={cn('text-sm font-medium', statusInfo.color)}>
                {statusInfo.label}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold">{statusInfo.label}</p>
            <p className="text-sm text-muted-foreground">{statusInfo.description}</p>
            {firebaseUser && (
              <p className="text-xs text-muted-foreground mt-2">
                Signed in as: {firebaseUser.email}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
