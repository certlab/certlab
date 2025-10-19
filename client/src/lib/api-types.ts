// API Response Types

// User Response (extend as needed)
export interface UserResponse {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  // Add other user fields as needed
}

// Achievement Response
export interface AchievementResponse {
  badges: any[];
  // Add other achievement fields as needed
}