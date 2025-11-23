import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { AuthProvider, useAuth } from "@/lib/auth-provider";
import { AchievementNotification } from "@/components/AchievementNotification";
import Header from "@/components/Header";
import BreadcrumbNavigation from "@/components/BreadcrumbNavigation";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Landing from "@/pages/landing";
import Quiz from "@/pages/quiz";
import Results from "@/pages/results";
import Review from "@/pages/review";
import Lecture from "@/pages/lecture";
import Achievements from "@/pages/achievements";
import Accessibility from "@/pages/accessibility";
import StudyGroups from "@/pages/study-groups";
import AdminDashboard from "@/pages/admin";
import UIStructurePage from "@/pages/ui-structure";
import ChallengesPage from "@/pages/challenges";
import CreditsPage from "@/pages/credits";
import ProfilePage from "@/pages/profile";
import PracticeTests from "@/pages/practice-tests";
import DataImportPage from "@/pages/data-import";
import { useEffect } from "react";

// Get the base path from Vite's configuration
// For GitHub Pages deployment at /certlab/, BASE_URL is '/certlab/'
// We remove the trailing slash to match wouter's expected format
// For root deployments where BASE_URL is '/', we use an empty string
const BASE_PATH = import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '');

// Global unhandled rejection handler
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault(); // Prevent the default browser error
  });
}

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location] = useLocation();
  const isAdmin = user?.role === 'admin';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isAuthenticated ? (
        <>
          <Header />
          <BreadcrumbNavigation />
          <main>
            <Switch>
              <Route path="/" component={Landing} />
              <Route path="/app" component={Dashboard} />
              <Route path="/app/dashboard" component={Dashboard} />
              <Route path="/app/profile" component={ProfilePage} />
              <Route path="/app/quiz/:id" component={Quiz} />
              <Route path="/app/results/:id" component={Results} />
              <Route path="/app/review/:id" component={Review} />
              <Route path="/app/lecture/:id" component={Lecture} />
              <Route path="/app/achievements" component={Achievements} />
              <Route path="/app/accessibility" component={Accessibility} />
              <Route path="/app/study-groups" component={StudyGroups} />
              <Route path="/app/practice-tests" component={PracticeTests} />
              <Route path="/app/challenges" component={ChallengesPage} />
              {isAdmin && <Route path="/app/ui-structure" component={UIStructurePage} />}
              <Route path="/app/credits" component={CreditsPage} />
              <Route path="/app/data-import" component={DataImportPage} />
              {isAdmin && <Route path="/admin" component={AdminDashboard} />}
              <Route component={NotFound} />
            </Switch>
          </main>
        </>
      ) : (
        <Switch>
          {/* Landing page is always available at root */}
          <Route path="/" component={Landing} />
          {/* Redirect non-authenticated users trying to access protected routes */}
          <Route path="/app/*" component={Landing} />
          <Route component={NotFound} />
        </Switch>
      )}
    </div>
  );
}

function AppContent() {
  const { user, isAuthenticated } = useAuth();

  return (
    <>
      <Router />
      {isAuthenticated && user && (
        <AchievementNotification userId={user.id} />
      )}
    </>
  );
}

function App() {
  useEffect(() => {
    // Seed initial data on first load
    import('./lib/seed-data').then(({ ensureDataSeeded }) => {
      ensureDataSeeded();
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider defaultTheme="light" storageKey="ui-theme">
          <TooltipProvider>
            <WouterRouter base={BASE_PATH}>
              <Toaster />
              <AppContent />
            </WouterRouter>
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
