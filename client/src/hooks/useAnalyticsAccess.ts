import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

export type AnalyticsAccessLevel = 'basic' | 'advanced' | 'full';

interface AnalyticsFeatures {
  // Basic (Free) features
  overallScore: boolean;
  passFailStatus: boolean;
  basicProgress: boolean;
  
  // Advanced (Pro) features
  detailedMetrics: boolean;
  performanceTrends: boolean;
  categoryBreakdown: boolean;
  timeAnalysis: boolean;
  weakAreasIdentification: boolean;
  comparisons: boolean;
  
  // Full (Enterprise) features
  exportData: boolean;
  advancedInsights: boolean;
  predictiveAnalytics: boolean;
  customReports: boolean;
  teamAnalytics: boolean;
}

interface AnalyticsAccessResponse {
  level: AnalyticsAccessLevel;
  features: AnalyticsFeatures;
  isLoading: boolean;
  canAccess: (minLevel: AnalyticsAccessLevel) => boolean;
}

export function useAnalyticsAccess(): AnalyticsAccessResponse {
  const { user } = useAuth();
  
  const { data: subscription, isLoading } = useQuery({
    queryKey: ["/api/subscription/status"],
    enabled: !!user,
  });
  
  // Get analytics access level from subscription or default to basic
  const level: AnalyticsAccessLevel = 
    subscription?.limits?.analyticsAccess as AnalyticsAccessLevel || 'basic';
  
  // Define feature access based on level
  const features: AnalyticsFeatures = {
    // Basic features (available to all)
    overallScore: true,
    passFailStatus: true,
    basicProgress: true,
    
    // Advanced features (Pro and Enterprise)
    detailedMetrics: level === 'advanced' || level === 'full',
    performanceTrends: level === 'advanced' || level === 'full',
    categoryBreakdown: level === 'advanced' || level === 'full',
    timeAnalysis: level === 'advanced' || level === 'full',
    weakAreasIdentification: level === 'advanced' || level === 'full',
    comparisons: level === 'advanced' || level === 'full',
    
    // Full features (Enterprise only)
    exportData: level === 'full',
    advancedInsights: level === 'full',
    predictiveAnalytics: level === 'full',
    customReports: level === 'full',
    teamAnalytics: level === 'full',
  };
  
  // Helper function to check if user can access a minimum level
  const canAccess = (minLevel: AnalyticsAccessLevel): boolean => {
    const levelOrder: Record<AnalyticsAccessLevel, number> = {
      basic: 1,
      advanced: 2,
      full: 3,
    };
    
    return levelOrder[level] >= levelOrder[minLevel];
  };
  
  return {
    level,
    features,
    isLoading,
    canAccess,
  };
}

// Component for displaying locked analytics with upgrade prompt
export function LockedAnalytics({ 
  title,
  requiredLevel,
  children
}: { 
  title: string;
  requiredLevel: AnalyticsAccessLevel;
  children?: React.ReactNode;
}) {
  const getPlanName = (level: AnalyticsAccessLevel) => {
    switch(level) {
      case 'advanced': return 'Pro';
      case 'full': return 'Enterprise';
      default: return 'Pro';
    }
  };
  
  return (
    <div className="relative">
      {/* Blurred content preview */}
      <div className="filter blur-sm opacity-50 pointer-events-none select-none">
        {children || (
          <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-lg" />
        )}
      </div>
      
      {/* Overlay with upgrade prompt */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg border-2 border-dashed border-primary/20">
        <div className="text-center space-y-4 px-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {getPlanName(requiredLevel)} plan required
            </p>
          </div>
          
          <a 
            href="/app/subscription-plans"
            className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            Upgrade to {getPlanName(requiredLevel)}
          </a>
        </div>
      </div>
    </div>
  );
}