import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardHero from "@/components/DashboardHero";
import LearningModeWizard from "@/components/LearningModeWizard";
import ActivitySidebar from "@/components/ActivitySidebar";
import MasteryMeter from "@/components/MasteryMeter";
import QuickActionsCard from "@/components/QuickActionsCard";
import LearningStreak from "@/components/LearningStreak";
import HelensIntroduction from "@/components/HelensIntroduction";
import GoalSettingWizard from "@/components/GoalSettingWizard";
import NewFeatureBadge from "@/components/NewFeatureBadge";


import PersonalizedInsights from "@/components/PersonalizedInsights";
import ContextualQuickActions from "@/components/ContextualQuickActions";
import QuickStartMode from "@/components/QuickStartMode";
import { shouldShowHelenIntro, shouldShowGoalWizard, markGoalSettingCompleted } from "@/lib/onboarding";
import { calculateContentPriorities, getContentOrder, getPersonalizedInsights } from "@/lib/content-prioritization";
import { useAuth } from "@/lib/auth";
import { checkAndUnlockFeatures, isFeatureUnlocked } from "@/lib/feature-discovery";
import type { UserStats } from "@shared/schema";

export default function Dashboard() {
  const { user: currentUser } = useAuth();
  const [showHelenIntro, setShowHelenIntro] = useState(false);
  const [showGoalWizard, setShowGoalWizard] = useState(false);

  const [isQuickStartMode, setIsQuickStartMode] = useState(false);

  // Get user stats for feature discovery
  const { data: stats } = useQuery<UserStats>({
    queryKey: [`/api/user/${currentUser?.id}/stats`],
    enabled: !!currentUser?.id,
  });

  // Calculate content priorities based on user stats  
  const contentPriorities = calculateContentPriorities(stats, (currentUser as any)?.certificationGoals);
  const contentOrder = getContentOrder(contentPriorities);
  const personalizedInsights = getPersonalizedInsights(contentPriorities);

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



  return (
    <div className="min-h-screen bg-background">
      
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
        {/* Welcome & Overview Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
          {/* Personalized Insights */}
          {personalizedInsights && personalizedInsights.length > 0 && (
            <PersonalizedInsights insights={personalizedInsights} />
          )}
          
          {/* Learning Streak */}
          <LearningStreak />
          
          {/* Dashboard Hero */}
          <DashboardHero />
        </div>

        {/* Learning Configuration Section */}
        <div className="section-alt-bg py-8">
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
              <div className="space-y-4">
                <QuickStartMode
                  stats={stats}
                  isQuickMode={isQuickStartMode}
                  onToggleMode={setIsQuickStartMode}
                />
                <ContextualQuickActions 
                  stats={stats} 
                  userGoals={(currentUser as any)?.certificationGoals}
                />
                {!isQuickStartMode && <QuickActionsCard />}
              </div>
            </div>
          </div>
        </div>

        {/* Progress & Activity Section */}
        <div className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-up"
              style={{ animationDelay: "200ms" }}
            >
              <MasteryMeter />
              <ActivitySidebar />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
