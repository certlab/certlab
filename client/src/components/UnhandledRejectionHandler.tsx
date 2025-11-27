import { useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

/**
 * Error categories for unhandled promise rejections.
 * Used to provide appropriate user messaging and recovery options.
 */
type ErrorCategory = "storage" | "authentication" | "unknown";

/**
 * Categorizes an error based on its message or type.
 * Since CertLab is a client-side app using IndexedDB for storage,
 * we focus on storage and authentication errors as the primary categories.
 * @param error - The error to categorize
 * @returns The error category
 */
function categorizeError(error: unknown): ErrorCategory {
  if (!error) return "unknown";

  const errorMessage =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  // IndexedDB/Storage errors - primary error type for this client-side app
  if (
    errorMessage.includes("indexeddb") ||
    errorMessage.includes("storage") ||
    errorMessage.includes("quota") ||
    errorMessage.includes("database") ||
    errorMessage.includes("transaction") ||
    errorMessage.includes("failed to open")
  ) {
    return "storage";
  }

  // Authentication errors
  if (
    errorMessage.includes("unauthorized") ||
    errorMessage.includes("authentication") ||
    errorMessage.includes("not authenticated") ||
    errorMessage.includes("login") ||
    errorMessage.includes("401")
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
    case "storage":
      return {
        title: "Storage Error",
        description:
          "There was a problem with your browser storage. Please ensure you have sufficient space or try clearing old data.",
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
 * user-friendly error notifications with category-appropriate actions.
 * 
 * This component should be mounted once at the app level.
 */
export function UnhandledRejectionHandler() {
  const { toast } = useToast();

  // Handle retry action by reloading the page - only for errors where reload helps
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

      // Show user-friendly toast notification with category-appropriate action
      // Storage errors: dismissable only (reload won't help with quota issues)
      // Auth/Unknown errors: offer retry via page reload
      if (category === "storage") {
        toast({
          variant: "destructive",
          title,
          description,
        });
      } else {
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
      }
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
  }, [toast, handleRetry]);

  // This component doesn't render anything
  return null;
}
