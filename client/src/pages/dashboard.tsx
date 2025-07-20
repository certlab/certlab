import Header from "@/components/Header";
import DashboardHero from "@/components/DashboardHero";
import LearningModeSelector from "@/components/LearningModeSelector";
import ActivitySidebar from "@/components/ActivitySidebar";
import MasteryMeter from "@/components/MasteryMeter";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <DashboardHero />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          <div className="lg:col-span-2 order-2 lg:order-1">
            <LearningModeSelector />
          </div>
          <div className="order-1 lg:order-2">
            <ActivitySidebar />
          </div>
        </div>

        {/* Mastery Progress Section */}
        <div className="mt-4 sm:mt-6 lg:mt-8">
          <MasteryMeter />
        </div>
      </main>
    </div>
  );
}
