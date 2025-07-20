import Header from "@/components/Header";
import StatsCards from "@/components/StatsCards";
import LearningModeSelector from "@/components/LearningModeSelector";
import ActivitySidebar from "@/components/ActivitySidebar";
import MasteryMeter from "@/components/MasteryMeter";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StatsCards />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <LearningModeSelector />
          </div>
          <div>
            <ActivitySidebar />
          </div>
        </div>

        {/* Mastery Progress Section */}
        <div className="mt-8">
          <MasteryMeter />
        </div>
      </main>
    </div>
  );
}
