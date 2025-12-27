import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface SessionLoaderProps {
  message?: string;
}

/**
 * SessionLoader component - Displays during session validation
 * Provides consistent loading experience across the app
 */
export function SessionLoader({ message = 'Validating session...' }: SessionLoaderProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="xl" label={message} />
        <div className="text-muted-foreground text-sm animate-pulse">
          Please wait while we verify your session
        </div>
      </div>
    </div>
  );
}
