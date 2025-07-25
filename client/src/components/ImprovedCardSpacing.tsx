import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ImprovedCardSpacingProps {
  children: ReactNode;
  title?: string;
  description?: string;
  variant?: 'compact' | 'default' | 'spacious';
  density?: 'tight' | 'comfortable' | 'loose';
  className?: string;
  headerActions?: ReactNode;
  badge?: string;
  icon?: ReactNode;
}

export default function ImprovedCardSpacing({
  children,
  title,
  description,
  variant = 'default',
  density = 'comfortable', 
  className = "",
  headerActions,
  badge,
  icon
}: ImprovedCardSpacingProps) {
  
  // Spacing variant classes
  const variantClasses = {
    compact: 'card-compact',
    default: 'card-breathing',
    spacious: 'card-spacious card-breathing-extra'
  };

  // Content density classes  
  const densityClasses = {
    tight: 'content-breathing-dense text-density-tight',
    comfortable: 'content-breathing text-density-comfortable',
    loose: 'content-breathing-loose'
  };

  return (
    <Card className={`card-enhanced ${className}`}>
      {(title || description || headerActions) && (
        <CardHeader className={`${variantClasses[variant]} pb-3`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {title && (
                <CardTitle className="visual-priority-medium flex items-center gap-2">
                  {icon && <span className="flex-shrink-0">{icon}</span>}
                  <span className="truncate">{title}</span>
                  {badge && (
                    <Badge variant="outline" className="text-xs ml-2">
                      {badge}
                    </Badge>
                  )}
                </CardTitle>
              )}
              {description && (
                <p className="visual-priority-low mt-1.5 text-relaxed">
                  {description}
                </p>
              )}
            </div>
            {headerActions && (
              <div className="flex-shrink-0">
                {headerActions}
              </div>
            )}
          </div>
        </CardHeader>
      )}
      
      <CardContent className={`${variantClasses[variant]} ${densityClasses[density]} pt-0`}>
        {children}
      </CardContent>
    </Card>
  );
}

// Specialized spacing components for common use cases
export function CompactCard({ children, ...props }: Omit<ImprovedCardSpacingProps, 'variant'>) {
  return (
    <ImprovedCardSpacing variant="compact" density="tight" {...props}>
      {children}
    </ImprovedCardSpacing>
  );
}

export function SpaciousCard({ children, ...props }: Omit<ImprovedCardSpacingProps, 'variant'>) {
  return (
    <ImprovedCardSpacing variant="spacious" density="loose" {...props}>
      {children}
    </ImprovedCardSpacing>
  );
}

export function StatsCard({ 
  title, 
  value, 
  change, 
  description,
  icon,
  className = "",
  ...props 
}: {
  title: string;
  value: string | number;
  change?: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <ImprovedCardSpacing
      title={title}
      description={description}
      icon={icon}
      variant="default"
      density="comfortable"
      className={`section-rhythm ${className}`}
      {...props}
    >
      <div className="space-y-2">
        <div className="metric-value">
          {value}
        </div>
        {change && (
          <div className="metric-change positive">
            {change}
          </div>
        )}
      </div>
    </ImprovedCardSpacing>
  );
}

export function ActionCard({
  title,
  description,
  actionText,
  onAction,
  icon,
  children,
  className = "",
  ...props
}: {
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <ImprovedCardSpacing
      title={title}
      description={description}
      icon={icon}
      variant="default"
      density="comfortable"
      className={`section-rhythm hover:shadow-md transition-shadow ${className}`}
      headerActions={
        actionText && onAction ? (
          <button
            onClick={onAction}
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            {actionText}
          </button>
        ) : undefined
      }
      {...props}
    >
      {children}
    </ImprovedCardSpacing>
  );
}