import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Quiz from "@/pages/quiz";
import Results from "@/pages/results";
import Review from "@/pages/review";
import Lecture from "@/pages/lecture";
import Achievements from "@/pages/achievements";
import Accessibility from "@/pages/accessibility";
import AdminDashboard from "@/pages/admin";
import { localStorage } from "@/lib/localStorage";

function Router() {
  const isLoggedIn = localStorage.isLoggedIn();

  if (!isLoggedIn) {
    return <Login />;
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/app" component={Dashboard} />
      <Route path="/app/quiz/:id" component={Quiz} />
      <Route path="/app/results/:id" component={Results} />
      <Route path="/app/review/:id" component={Review} />
      <Route path="/app/lecture/:id" component={Lecture} />
      <Route path="/app/achievements" component={Achievements} />
      <Route path="/app/accessibility" component={Accessibility} />
      <Route path="/quiz/:id" component={Quiz} />
      <Route path="/results/:id" component={Results} />
      <Route path="/review/:id" component={Review} />
      <Route path="/lecture/:id" component={Lecture} />
      <Route path="/achievements" component={Achievements} />
      <Route path="/accessibility" component={Accessibility} />
      <Route path="/admin" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="ui-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
