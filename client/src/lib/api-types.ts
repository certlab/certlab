// API Response Types

// User Response (extend as needed)
export interface UserResponse {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  // Add other user fields as needed
}

// Subscription Status Response
export interface SubscriptionStatusResponse {
  isConfigured: boolean;
  isSubscribed: boolean;
  plan: string;
  status: string;
  expiresAt?: string;
  features: string[];
  limits: {
    quizzesPerDay: number;
    categoriesAccess: string[];
    analyticsAccess: string;
  };
  dailyQuizCount: number;
}

// Achievement Response
export interface AchievementResponse {
  badges: any[];
  // Add other achievement fields as needed
}