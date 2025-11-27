/**
 * Loading component used as fallback during lazy loading of pages
 */
export default function PageLoader() {
  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <span className="sr-only">Loading page...</span>
    </div>
  );
}
