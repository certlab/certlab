import { useEffect, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

/**
 * Error categories for unhandled promise rejections.
 * Used to provide appropriate user messaging and recovery options.
 */
type ErrorCategory = "network" | "storage" | "authentication" | "unknown";

/**
 * Categorizes an error based on its message or type.
 * @param error - The error to categorize
 * @returns The error category
 */
function categorizeError(error: unknown): ErrorCategory {
  if (!error) return "unknown";

  const errorMessage =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  // Network-related errors
  if (
    errorMessage.includes("network") ||
    errorMessage.includes("fetch") ||
    errorMessage.includes("failed to fetch") ||
    errorMessage.includes("net::") ||
    errorMessage.includes("connection") ||
    errorMessage.includes("timeout") ||
    errorMessage.includes("offline")
  ) {
    return "network";
  }

  // IndexedDB/Storage errors
  if (
    errorMessage.includes("indexeddb") ||
    errorMessage.includes("storage") ||
    errorMessage.includes("quota") ||
    errorMessage.includes("database") ||
    errorMessage.includes("transaction")
  ) {
    return "storage";
  }

  // Authentication errors
  if (
    errorMessage.includes("unauthorized") ||
    errorMessage.includes("authentication") ||
    errorMessage.includes("not authenticated") ||
    errorMessage.includes("401") ||
    errorMessage.includes("login")
  ) {
    return "authentication";
  }

  return "unknown";
}

/**
 * Gets user-friendly error information based on the category.
 * @param category - The error category
 * @returns Object with title and description for the toast
 */
function getErrorInfo(category: ErrorCategory): {
  title: string;
  description: string;
} {
  switch (category) {
    case "network":
      return {
        title: "Connection Issue",
        description:
          "Unable to complete the request. Please check your internet connection.",
      };
    case "storage":
      return {
        title: "Storage Error",
        description:
          "There was a problem saving your data. Please ensure you have sufficient storage space.",
      };
    case "authentication":
      return {
        title: "Session Expired",
        description:
          "Your session may have expired. Please try logging in again.",
      };
    default:
      return {
        title: "Something went wrong",
        description:
          "An unexpected error occurred. Please try again.",
      };
  }
}

/**
 * A component that listens for unhandled promise rejections and displays
 * user-friendly error notifications with retry options.
 * 
 * This component should be mounted once at the app level.
 */
export function UnhandledRejectionHandler() {
  // Handle retry action by reloading the page as a recovery strategy
  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      
      // Log the error for debugging purposes
      console.error("Unhandled promise rejection:", error);

      // Prevent the default browser error handling
      event.preventDefault();

      // Categorize the error
      const category = categorizeError(error);
      const { title, description } = getErrorInfo(category);

      // Show user-friendly toast notification with retry option
      toast({
        variant: "destructive",
        title,
        description,
        action: (
          <ToastAction altText="Try again" onClick={handleRetry}>
            Try Again
          </ToastAction>
        ),
      });
    };

    // Add the event listener
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    // Cleanup on unmount
    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
    };
  }, [handleRetry]);

  // This component doesn't render anything
  return null;
}
