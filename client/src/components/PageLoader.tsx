import { LoadingSpinner } from "@/components/ui/loading-spinner";

/**
 * Loading component used as fallback during lazy loading of pages
 */
export default function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <LoadingSpinner size="lg" label="Loading page..." />
    </div>
  );
}
