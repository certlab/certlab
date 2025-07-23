import Header from "@/components/Header";
import DashboardHero from "@/components/DashboardHero";
import LearningModeSelector from "@/components/LearningModeSelector";
import ActivitySidebar from "@/components/ActivitySidebar";
import MasteryMeter from "@/components/MasteryMeter";
import StudyPlanCard from "@/components/StudyPlanCard";
import WeeklyProgress from "@/components/WeeklyProgress";
import QuickActionsCard from "@/components/QuickActionsCard";
import StudyGroupCard from "@/components/StudyGroupCard";
import PracticeTestMode from "@/components/PracticeTestMode";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <DashboardHero />
        
        {/* Enhanced Study Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 layout-container">
          {/* Main Study Area */}
          <div className="lg:col-span-2 order-3 lg:order-1 grid-item">
            <LearningModeSelector />
          </div>
          
          {/* Study Planning Sidebar */}
          <div className="lg:col-span-1 order-1 lg:order-2 space-y-4 grid-item">
            <StudyPlanCard />
            <QuickActionsCard />
          </div>
          
          {/* Activity & Progress Sidebar */}
          <div className="lg:col-span-1 order-2 lg:order-3 space-y-4 grid-item">
            <WeeklyProgress />
            <ActivitySidebar />
          </div>
        </div>

        {/* Section Separator */}
        <div className="section-separator mt-8 sm:mt-10 lg:mt-12"></div>

        {/* Advanced Features Section */}
        <div className="mt-8 sm:mt-10 lg:mt-12 space-y-6 section-separator">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 layout-container">
            <div className="grid-item">
              <StudyGroupCard />
            </div>
            <div className="grid-item">
              <PracticeTestMode />
            </div>
          </div>
        </div>

        {/* Mastery Progress Section */}
        <div id="progress-section" className="mt-4 sm:mt-6 lg:mt-8">
          <MasteryMeter />
        </div>
      </main>
    </div>
  );
}
