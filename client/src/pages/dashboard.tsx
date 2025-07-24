import Header from "@/components/Header";
import DashboardHero from "@/components/DashboardHero";
import DashboardStats from "@/components/DashboardStats";
import LearningModeWizard from "@/components/LearningModeWizard";
import ActivitySidebar from "@/components/ActivitySidebar";
import MasteryMeter from "@/components/MasteryMeter";
import QuickActionsCard from "@/components/QuickActionsCard";
import StudyGroupCard from "@/components/StudyGroupCard";
import PracticeTestMode from "@/components/PracticeTestMode";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Header />
      
      {/* Beautiful background patterns */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-3xl"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full bg-gradient-to-br from-secondary/10 to-transparent blur-3xl"></div>
        <div className="absolute -bottom-40 right-1/4 w-80 h-80 rounded-full bg-gradient-to-br from-accent/10 to-transparent blur-3xl"></div>
      </div>
      
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome & Quick Stats with enhanced spacing */}
        <div className="mb-12 animate-fade-in">
          <DashboardHero />
        </div>

        {/* Main Learning Tools with beautiful spacing */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12 animate-slide-up">
          {/* Start Learning - Primary Action */}
          <div className="lg:col-span-2">
            <LearningModeWizard />
          </div>

          {/* Quick Actions */}
          <div>
            <QuickActionsCard />
          </div>
        </div>

        {/* Progress & Activity with enhanced design */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <MasteryMeter />
          <ActivitySidebar />
        </div>
      </main>
    </div>
  );
}
