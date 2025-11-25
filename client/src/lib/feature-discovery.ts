/**
 * Feature discovery system for progressive disclosure of platform capabilities
 */

export interface FeatureDiscoveryState {
  level: number;
  unlockedFeatures: string[];
  newFeatures: string[];
  lastUpdated: string;
}

export interface Feature {
  id: string;
  name: string;
  description: string;
  requiredLevel: number;
  unlockCriteria: {
    quizzesCompleted?: number;
    achievementsEarned?: number;
    daysActive?: number;
    actions?: string[];
  };
}

const FEATURE_DISCOVERY_STORAGE_KEY = 'cert-lab-feature-discovery';

// Define all features with their unlock criteria
export const FEATURES: Feature[] = [
  // Level 1 - Basic Features (Always available)
  {
    id: 'basic-quiz',
    name: 'Basic Quiz Creation',
    description: 'Create and take quizzes',
    requiredLevel: 1,
    unlockCriteria: {},
  },
  {
    id: 'helen-recommendations',
    name: 'Helen Recommendations',
    description: 'AI-powered study suggestions',
    requiredLevel: 1,
    unlockCriteria: {},
  },
  
  // Level 2 - Intermediate Features
  {
    id: 'advanced-wizard',
    name: 'Advanced Quiz Wizard',
    description: 'Detailed quiz configuration options',
    requiredLevel: 2,
    unlockCriteria: {
      quizzesCompleted: 3,
    },
  },
  {
    id: 'achievements',
    name: 'Achievement System',
    description: 'Track badges and milestones',
    requiredLevel: 2,
    unlockCriteria: {
      quizzesCompleted: 2,
    },
  },
  
  // Level 3 - Advanced Features
  {
    id: 'accessibility-tools',
    name: 'Accessibility Tools',
    description: 'Color contrast and accessibility features',
    requiredLevel: 3,
    unlockCriteria: {
      quizzesCompleted: 10,
      daysActive: 3,
    },
  },
  {
    id: 'ui-structure',
    name: 'UI Structure Visualization',
    description: 'Interactive application architecture view',
    requiredLevel: 3,
    unlockCriteria: {
      quizzesCompleted: 15,
      daysActive: 7,
    },
  },
  {
    id: 'admin-tools',
    name: 'Admin Dashboard',
    description: 'Administrative functions and analytics',
    requiredLevel: 3,
    unlockCriteria: {
      quizzesCompleted: 20,
      achievementsEarned: 5,
      daysActive: 14,
    },
  },
];

export const getFeatureDiscoveryState = (): FeatureDiscoveryState => {
  try {
    const stored = localStorage.getItem(FEATURE_DISCOVERY_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to parse feature discovery state:', error);
  }
  
  // Default state for new users
  return {
    level: 1,
    unlockedFeatures: ['basic-quiz', 'helen-recommendations'],
    newFeatures: [],
    lastUpdated: new Date().toISOString(),
  };
};

export const updateFeatureDiscoveryState = (updates: Partial<FeatureDiscoveryState>): void => {
  const currentState = getFeatureDiscoveryState();
  const newState = {
    ...currentState,
    ...updates,
    lastUpdated: new Date().toISOString(),
  };
  
  try {
    localStorage.setItem(FEATURE_DISCOVERY_STORAGE_KEY, JSON.stringify(newState));
  } catch (error) {
    console.warn('Failed to save feature discovery state:', error);
  }
};

export const checkAndUnlockFeatures = async (userStats: any): Promise<string[]> => {
  const currentState = getFeatureDiscoveryState();
  const newlyUnlockedFeatures: string[] = [];
  
  // Calculate user progress metrics
  const quizzesCompleted = userStats?.totalQuizzes || 0;
  const achievementsEarned = userStats?.totalBadges || 0;
  
  // Simple days active calculation (could be enhanced with actual login tracking)
  const accountAge = new Date().getTime() - new Date(currentState.lastUpdated).getTime();
  const daysActive = Math.floor(accountAge / (1000 * 60 * 60 * 24)) + 1;
  
  // Check each feature for unlock eligibility
  for (const feature of FEATURES) {
    if (currentState.unlockedFeatures.includes(feature.id)) {
      continue; // Already unlocked
    }
    
    const criteria = feature.unlockCriteria;
    let canUnlock = true;
    
    if (criteria.quizzesCompleted && quizzesCompleted < criteria.quizzesCompleted) {
      canUnlock = false;
    }
    if (criteria.achievementsEarned && achievementsEarned < criteria.achievementsEarned) {
      canUnlock = false;
    }
    if (criteria.daysActive && daysActive < criteria.daysActive) {
      canUnlock = false;
    }
    
    if (canUnlock) {
      newlyUnlockedFeatures.push(feature.id);
    }
  }
  
  // Update state if there are new features
  if (newlyUnlockedFeatures.length > 0) {
    const newLevel = Math.max(
      currentState.level,
      Math.max(...newlyUnlockedFeatures.map(id => 
        FEATURES.find(f => f.id === id)?.requiredLevel || 1
      ))
    );
    
    updateFeatureDiscoveryState({
      level: newLevel,
      unlockedFeatures: [...currentState.unlockedFeatures, ...newlyUnlockedFeatures],
      newFeatures: [...currentState.newFeatures, ...newlyUnlockedFeatures],
    });
  }
  
  return newlyUnlockedFeatures;
};

export const isFeatureUnlocked = (featureId: string): boolean => {
  const state = getFeatureDiscoveryState();
  return state.unlockedFeatures.includes(featureId);
};

export const isFeatureNew = (featureId: string): boolean => {
  const state = getFeatureDiscoveryState();
  return state.newFeatures.includes(featureId);
};

export const markFeatureAsSeen = (featureId: string): void => {
  const state = getFeatureDiscoveryState();
  const newFeatures = state.newFeatures.filter(id => id !== featureId);
  
  updateFeatureDiscoveryState({
    newFeatures,
  });
};

export const getFeatureById = (featureId: string): Feature | undefined => {
  return FEATURES.find(f => f.id === featureId);
};

export const getUnlockedFeatures = (): Feature[] => {
  const state = getFeatureDiscoveryState();
  return FEATURES.filter(f => state.unlockedFeatures.includes(f.id));
};

export const getNextFeatureToUnlock = (userStats: any): Feature | null => {
  const state = getFeatureDiscoveryState();
  const quizzesCompleted = userStats?.totalQuizzes || 0;
  const achievementsEarned = userStats?.totalBadges || 0;
  
  // Find the next feature that's closest to being unlocked
  const lockedFeatures = FEATURES.filter(f => !state.unlockedFeatures.includes(f.id));
  
  let nextFeature: Feature | null = null;
  let smallestGap = Infinity;
  
  for (const feature of lockedFeatures) {
    const criteria = feature.unlockCriteria;
    let gap = 0;
    
    if (criteria.quizzesCompleted && quizzesCompleted < criteria.quizzesCompleted) {
      gap += criteria.quizzesCompleted - quizzesCompleted;
    }
    if (criteria.achievementsEarned && achievementsEarned < criteria.achievementsEarned) {
      gap += criteria.achievementsEarned - achievementsEarned;
    }
    
    if (gap < smallestGap && gap > 0) {
      smallestGap = gap;
      nextFeature = feature;
    }
  }
  
  return nextFeature;
};