import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import DashboardHero from "@/components/DashboardHero";
import LearningModeWizard from "@/components/LearningModeWizard";
import ActivitySidebar from "@/components/ActivitySidebar";
import MasteryMeter from "@/components/MasteryMeter";
import QuickActionsCard from "@/components/QuickActionsCard";
import LearningStreak from "@/components/LearningStreak";
import HelensIntroduction from "@/components/HelensIntroduction";
import GoalSettingWizard from "@/components/GoalSettingWizard";
import NewFeatureBadge from "@/components/NewFeatureBadge";
import CollapsibleSection from "@/components/CollapsibleSection";
import QuickViewToggle from "@/components/QuickViewToggle";
import { shouldShowHelenIntro, shouldShowGoalWizard, markGoalSettingCompleted } from "@/lib/onboarding";
import { useAuth } from "@/lib/auth";
import { checkAndUnlockFeatures, isFeatureUnlocked } from "@/lib/feature-discovery";
import type { UserStats } from "@shared/schema";

export default function Dashboard() {
  const { user: currentUser } = useAuth();
  const [showHelenIntro, setShowHelenIntro] = useState(false);
  const [showGoalWizard, setShowGoalWizard] = useState(false);
  const [isQuickView, setIsQuickView] = useState(false);

  // Get user stats for feature discovery
  const { data: stats } = useQuery<UserStats>({
    queryKey: [`/api/user/${currentUser?.id}/stats`],
    enabled: !!currentUser?.id,
  });

  useEffect(() => {
    // Check if user should see Helen introduction
    const shouldShow = shouldShowHelenIntro();
    if (shouldShow) {
      // Small delay to let the dashboard load first
      const timer = setTimeout(() => {
        setShowHelenIntro(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Check for newly unlocked features
  useEffect(() => {
    if (stats && currentUser?.id) {
      checkAndUnlockFeatures(stats).then(newFeatures => {
        if (newFeatures.length > 0) {
          console.log('New features unlocked:', newFeatures);
          // Could show a toast notification here
        }
      });
    }
  }, [stats, currentUser?.id]);

  const handleIntroComplete = () => {
    setShowHelenIntro(false);
    
    // After Helen intro, check if we should show goal wizard
    if (shouldShowGoalWizard()) {
      setTimeout(() => {
        setShowGoalWizard(true);
      }, 500);
    }
  };

  const handleGoalWizardComplete = () => {
    setShowGoalWizard(false);
    markGoalSettingCompleted();
  };

  const handleQuickViewToggle = (quickView: boolean) => {
    setIsQuickView(quickView);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Quick View Toggle */}
      <QuickViewToggle onToggle={handleQuickViewToggle} />
      
      {/* Helen's Introduction Modal */}
      <HelensIntroduction 
        isOpen={showHelenIntro} 
        onComplete={handleIntroComplete} 
      />
      
      {/* Goal Setting Wizard */}
      <GoalSettingWizard
        isOpen={showGoalWizard}
        onComplete={handleGoalWizardComplete}
      />

      <main className="relative z-10">
        {/* Section 1: Welcome & Overview */}
        <CollapsibleSection
          id="welcome-overview"
          title="Welcome to Your Learning Dashboard"
          description="Track your progress, view achievements, and see personalized insights from Helen, your AI learning assistant."
          defaultExpanded={true}
          showToggle={!isQuickView}
        >
          {!isQuickView && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in">
              <LearningStreak />
            </div>
          )}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in">
            <DashboardHero />
          </div>
        </CollapsibleSection>

        {/* Section 2: Learning Configuration (Alternating Background) */}
        <CollapsibleSection
          id="learning-session"
          title="Start Your Learning Session"
          description="Configure your study session with Helen's intelligent recommendations and personalized settings."
          defaultExpanded={true}
          className="section-alt-bg"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up">
              <div className="lg:col-span-2">
                {isFeatureUnlocked('advanced-wizard') ? (
                  <NewFeatureBadge featureId="advanced-wizard">
                    <LearningModeWizard />
                  </NewFeatureBadge>
                ) : (
                  <LearningModeWizard />
                )}
              </div>
              <div>
                <QuickActionsCard />
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Section 3: Progress & Activity */}
        {!isQuickView && (
          <CollapsibleSection
            id="progress-activity"
            title="Progress & Learning Activity"
            description="Monitor your mastery levels, recent quiz activity, and track your certification journey."
            defaultExpanded={false}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div
                className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-up"
                style={{ animationDelay: "200ms" }}
              >
                <MasteryMeter />
                <ActivitySidebar />
              </div>
            </div>
          </CollapsibleSection>
        )}
      </main>
    </div>
  );
}
