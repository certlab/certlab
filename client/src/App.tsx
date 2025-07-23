import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { AuthProvider, useAuth } from "@/lib/auth-provider";
import { AchievementNotification } from "@/components/AchievementNotification";
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

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/app" component={Dashboard} />
          <Route path="/app/quiz/:id" component={Quiz} />
          <Route path="/app/results/:id" component={Results} />
          <Route path="/app/review/:id" component={Review} />
          <Route path="/app/lecture/:id" component={Lecture} />
          <Route path="/app/achievements" component={Achievements} />
          <Route path="/app/accessibility" component={Accessibility} />
          <Route path="/app/study-groups" component={StudyGroups} />
          <Route path="/app/challenges" component={ChallengesPage} />
          <Route path="/app/ui-structure" component={UIStructurePage} />
          <Route path="/quiz/:id" component={Quiz} />
          <Route path="/results/:id" component={Results} />
          <Route path="/review/:id" component={Review} />
          <Route path="/lecture/:id" component={Lecture} />
          <Route path="/achievements" component={Achievements} />
          <Route path="/accessibility" component={Accessibility} />
          <Route path="/study-groups" component={StudyGroups} />
          <Route path="/challenges" component={ChallengesPage} />
          <Route path="/ui-structure" component={UIStructurePage} />
          <Route path="/admin" component={AdminDashboard} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
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
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider defaultTheme="light" storageKey="ui-theme">
          <TooltipProvider>
            <Toaster />
            <AppContent />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
