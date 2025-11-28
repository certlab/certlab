import * as React from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export interface ContentSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of lines to show in the skeleton */
  lines?: number
  /** Show a header skeleton */
  showHeader?: boolean
  /** Show an image/avatar skeleton */
  showAvatar?: boolean
}

/**
 * A consistent content skeleton component for content-heavy pages.
 * Provides a visual placeholder while content is loading.
 */
const ContentSkeleton = React.forwardRef<HTMLDivElement, ContentSkeletonProps>(
  ({ className, lines = 4, showHeader = true, showAvatar = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        aria-label="Loading content..."
        className={cn("space-y-4", className)}
        {...props}
      >
        {showHeader && (
          <div className="flex items-center gap-4">
            {showAvatar && <Skeleton className="h-12 w-12 rounded-full" />}
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
        )}
        <div className="space-y-3">
          {Array.from({ length: lines }).map((_, index) => (
            <Skeleton
              key={index}
              className={cn(
                "h-4",
                index === lines - 1 ? "w-1/2" : "w-full"
              )}
            />
          ))}
        </div>
      </div>
    )
  }
)
ContentSkeleton.displayName = "ContentSkeleton"

export { ContentSkeleton }
