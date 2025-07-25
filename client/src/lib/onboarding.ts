/**
 * Onboarding system for tracking user introduction progress
 */

export interface OnboardingState {
  helenIntroCompleted: boolean;
  featureDiscoveryLevel: number;
  goalSettingCompleted: boolean;
  lastUpdated: string;
}

const ONBOARDING_STORAGE_KEY = 'cert-lab-onboarding';

export const getOnboardingState = (): OnboardingState => {
  try {
    const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to parse onboarding state:', error);
  }
  
  // Default state for new users
  return {
    helenIntroCompleted: false,
    featureDiscoveryLevel: 1,
    goalSettingCompleted: false,
    lastUpdated: new Date().toISOString(),
  };
};

export const updateOnboardingState = (updates: Partial<OnboardingState>): void => {
  const currentState = getOnboardingState();
  const newState = {
    ...currentState,
    ...updates,
    lastUpdated: new Date().toISOString(),
  };
  
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(newState));
  } catch (error) {
    console.warn('Failed to save onboarding state:', error);
  }
};

export const markHelenIntroCompleted = (): void => {
  updateOnboardingState({ helenIntroCompleted: true });
};

export const shouldShowHelenIntro = (): boolean => {
  const state = getOnboardingState();
  return !state.helenIntroCompleted;
};

export const shouldShowGoalWizard = (): boolean => {
  const state = getOnboardingState();
  return !state.goalSettingCompleted;
};

export const markGoalSettingCompleted = (): void => {
  updateOnboardingState({ goalSettingCompleted: true });
};

export const resetOnboarding = (): void => {
  try {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to reset onboarding state:', error);
  }
};