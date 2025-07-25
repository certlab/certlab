import Header from "@/components/Header";
import DashboardHero from "@/components/DashboardHero";
import DashboardStats from "@/components/DashboardStats";
import LearningModeWizard from "@/components/LearningModeWizard";
import ActivitySidebar from "@/components/ActivitySidebar";
import MasteryMeter from "@/components/MasteryMeter";
import QuickActionsCard from "@/components/QuickActionsCard";
import StudyGroupCard from "@/components/StudyGroupCard";
import PracticeTestMode from "@/components/PracticeTestMode";
import LearningStreak from "@/components/LearningStreak";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="relative z-10">
        {/* Section 1: Welcome & Overview */}
        <section className="dashboard-section">
          <div className="section-header">
            <h2>Welcome to Your Learning Dashboard</h2>
            <p>
              Track your progress, view achievements, and see personalized
              insights from Helen, your AI learning assistant.
            </p>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in">
            <LearningStreak />
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in">
            <DashboardHero />
          </div>
        </section>

        {/* Section 2: Learning Streak (Alternating Background) */}
        <section className="dashboard-section">
          <div className="section-header">
            <h2>Your Learning Journey</h2>
            <p>
              Stay motivated with your daily learning streak and build
              consistent study habits for certification success.
            </p>
          </div>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 animate-slide-up"></div>
        </section>

        {/* Section 3: Learning Configuration (Alternating Background) */}
        <section className="dashboard-section section-alt-bg">
          <div className="section-header">
            <h2>Start Your Learning Session</h2>
            <p>
              Configure your study session with Helen's intelligent
              recommendations and personalized settings.
            </p>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up">
              <div className="lg:col-span-2">
                <LearningModeWizard />
              </div>
              <div>
                <QuickActionsCard />
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Progress & Activity */}
        <section className="dashboard-section">
          <div className="section-header">
            <h2>Progress & Learning Activity</h2>
            <p>
              Monitor your mastery levels, recent quiz activity, and track your
              certification journey.
            </p>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-up"
              style={{ animationDelay: "200ms" }}
            >
              <MasteryMeter />
              <ActivitySidebar />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
