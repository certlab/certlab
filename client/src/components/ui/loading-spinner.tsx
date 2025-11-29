import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const loadingSpinnerVariants = cva('animate-spin', {
  variants: {
    size: {
      default: 'h-8 w-8',
      sm: 'h-4 w-4',
      lg: 'h-12 w-12',
      xl: 'h-16 w-16',
    },
    variant: {
      default: 'text-primary',
      muted: 'text-muted-foreground',
      white: 'text-white',
      black: 'text-black',
    },
  },
  defaultVariants: {
    size: 'default',
    variant: 'default',
  },
});

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof loadingSpinnerVariants> {
  /** Accessible label for screen readers */
  label?: string;
}

/**
 * A consistent loading spinner component used throughout the application.
 * Uses Lucide's Loader2 icon for a polished, accessible loading indicator.
 */
const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size, variant, label = 'Loading...', ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        className={cn('inline-flex items-center justify-center', className)}
        {...props}
      >
        <Loader2 className={cn(loadingSpinnerVariants({ size, variant }))} />
        <span className="sr-only">{label}</span>
      </div>
    );
  }
);
LoadingSpinner.displayName = 'LoadingSpinner';

export { LoadingSpinner, loadingSpinnerVariants };
