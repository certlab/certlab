import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/lib/theme-provider';
import { AuthProvider, useAuth } from '@/lib/auth-provider';
import { UnhandledRejectionHandler } from '@/components/UnhandledRejectionHandler';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SessionLoader } from '@/components/SessionLoader';
import PageLoader from '@/components/PageLoader';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ConfigurationError } from '@/components/ConfigurationError';
import { validateRequiredConfiguration } from '@/lib/config-validator';
import { useMobileKeyboard } from '@/hooks/use-mobile-keyboard';
// Landing page is eagerly loaded for fast first paint (initial route)
import Landing from '@/pages/landing';
import { lazy, Suspense, useEffect } from 'react';

// Lazy load page components for code splitting
const NotFound = lazy(() => import('@/pages/not-found'));
const Dashboard = lazy(() => import('@/pages/dashboard'));
const Quiz = lazy(() => import('@/pages/quiz'));
const Results = lazy(() => import('@/pages/results'));
const Review = lazy(() => import('@/pages/review'));
const Lecture = lazy(() => import('@/pages/lecture'));
const StudyNotesPage = lazy(() => import('@/pages/study-notes'));
const EnhancedStudyNotesPage = lazy(() => import('@/pages/enhanced-study-notes'));
const StudyTimerPage = lazy(() => import('@/pages/study-timer'));
const CertificatesPage = lazy(() => import('@/pages/certificates'));
const VerifyCertificatePage = lazy(() => import('@/pages/verify-certificate'));
const Achievements = lazy(() => import('@/pages/achievements'));
const Analytics = lazy(() => import('@/pages/analytics'));
const DailyChallenges = lazy(() => import('@/pages/daily-challenges'));
const Accessibility = lazy(() => import('@/pages/accessibility'));
const AdminDashboard = lazy(() => import('@/pages/admin'));
const UIStructurePage = lazy(() => import('@/pages/ui-structure'));

const CreditsPage = lazy(() => import('@/pages/credits'));
const ProfilePage = lazy(() => import('@/pages/profile'));
const PracticeTests = lazy(() => import('@/pages/practice-tests'));
const DataImportPage = lazy(() => import('@/pages/data-import'));
const MarketplacePage = lazy(() => import('@/pages/marketplace'));
const ProductDetailPage = lazy(() => import('@/pages/product-detail'));
const QuestionBankPage = lazy(() => import('@/pages/question-bank'));
const WalletPage = lazy(() => import('@/pages/wallet'));
const PerformancePage = lazy(() => import('@/pages/performance'));
const QuizBuilderPage = lazy(() => import('@/pages/quiz-builder'));
const MyQuizzesPage = lazy(() => import('@/pages/my-quizzes'));
const MyMaterialsPage = lazy(() => import('@/pages/my-materials'));

// Get the base path from Vite's configuration
// For GitHub Pages deployment at /certlab/, BASE_URL is '/certlab/'
// React Router's BrowserRouter uses basename prop which expects the trailing slash removed
// For root deployments where BASE_URL is '/', we use an empty string
const BASE_PATH =
  import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '');

function Router() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';

  // Landing page should never have authenticated layout
  if (location.pathname === '/' || location.pathname === '') {
    // Show session loader while auth is initializing to prevent flash of landing page
    // before redirecting authenticated users to dashboard
    if (isLoading) {
      return <SessionLoader message="Initializing application..." />;
    }

    // Redirect authenticated users to dashboard
    // This ensures that users who refresh on /app and briefly get redirected to /
    // will automatically be sent back to /app once auth state is confirmed
    if (isAuthenticated) {
      return <Navigate to="/app" replace />;
    }

    return (
      <div className="min-h-screen bg-background">
        <ErrorBoundary>
          <Landing />
        </ErrorBoundary>
      </div>
    );
  }

  // For app routes, use ProtectedRoute to handle authentication
  // Determine if current route is an authenticated app route (starts with /app or /admin)
  const isAppRoute = location.pathname.startsWith('/app') || location.pathname.startsWith('/admin');

  if (isAppRoute) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          {/* Skip to main content link for keyboard navigation */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-background focus:text-foreground focus:px-4 focus:py-2 focus:rounded-md focus:border focus:border-primary focus:shadow-lg"
          >
            Skip to main content
          </a>
          <AuthenticatedLayout>
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/app" element={<Dashboard />} />
                  <Route path="/app/dashboard" element={<Dashboard />} />
                  <Route path="/app/profile" element={<ProfilePage />} />
                  <Route path="/app/wallet" element={<WalletPage />} />
                  <Route path="/app/performance" element={<PerformancePage />} />
                  <Route path="/app/quiz/:id" element={<Quiz />} />
                  <Route path="/app/results/:id" element={<Results />} />
                  <Route path="/app/review/:id" element={<Review />} />
                  <Route path="/app/lecture/:id" element={<Lecture />} />
                  <Route path="/app/study-notes" element={<StudyNotesPage />} />
                  <Route path="/app/enhanced-study-notes" element={<EnhancedStudyNotesPage />} />
                  <Route path="/app/study-timer" element={<StudyTimerPage />} />
                  <Route path="/app/certificates" element={<CertificatesPage />} />
                  <Route
                    path="/app/verify-certificate/:verificationId?"
                    element={<VerifyCertificatePage />}
                  />
                  <Route path="/app/achievements" element={<Achievements />} />
                  <Route path="/app/analytics" element={<Analytics />} />
                  <Route path="/app/daily-challenges" element={<DailyChallenges />} />
                  <Route path="/app/accessibility" element={<Accessibility />} />
                  <Route path="/app/practice-tests" element={<PracticeTests />} />

                  <Route path="/app/marketplace" element={<MarketplacePage />} />
                  <Route path="/app/marketplace/:id" element={<ProductDetailPage />} />
                  {isAdmin && <Route path="/app/ui-structure" element={<UIStructurePage />} />}
                  <Route path="/app/credits" element={<CreditsPage />} />
                  <Route path="/app/data-import" element={<DataImportPage />} />
                  <Route path="/app/question-bank" element={<QuestionBankPage />} />
                  <Route path="/app/quiz-builder" element={<QuizBuilderPage />} />
                  <Route path="/app/my-quizzes" element={<MyQuizzesPage />} />
                  <Route path="/app/my-materials" element={<MyMaterialsPage />} />
                  {isAdmin && <Route path="/admin" element={<AdminDashboard />} />}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </AuthenticatedLayout>
        </div>
      </ProtectedRoute>
    );
  }

  // For all other paths (except root which is handled above), handle public routes
  // Public certificate verification - accessible without authentication
  if (location.pathname.startsWith('/verify-certificate')) {
    return (
      <div className="min-h-screen bg-background">
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route
                path="/verify-certificate/:verificationId?"
                element={<VerifyCertificatePage />}
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
    );
  }

  // For all other paths, show 404
  return (
    <div className="min-h-screen bg-background">
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

function AppContent() {
  const { user, isAuthenticated } = useAuth();

  // Enable mobile keyboard handling improvements
  useMobileKeyboard();

  return <Router />;
}

function App() {
  // Validate required configuration in production
  const configValidation = validateRequiredConfiguration();

  useEffect(() => {
    // Seed initial data on first load
    import('./lib/seed-data').then(({ ensureDataSeeded }) => {
      ensureDataSeeded();
    });
  }, []);

  // If configuration is invalid, show error page and block app
  if (!configValidation.isValid) {
    return <ConfigurationError errors={configValidation.errors} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider defaultTheme="light" storageKey="ui-theme">
          <TooltipProvider>
            <BrowserRouter basename={BASE_PATH}>
              <Toaster />
              <UnhandledRejectionHandler />
              <AppContent />
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
