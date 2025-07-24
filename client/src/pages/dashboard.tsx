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
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome & Quick Stats */}
        <div className="mb-8">
          <DashboardHero />
        </div>

        {/* Main Learning Tools */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Start Learning - Primary Action */}
          <div className="lg:col-span-2">
            <LearningModeWizard />
          </div>

          {/* Quick Actions */}
          <div>
            <QuickActionsCard />
          </div>
        </div>

        {/* Progress & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <MasteryMeter />
          <ActivitySidebar />
        </div>
      </main>
    </div>
  );
}
