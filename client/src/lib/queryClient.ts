import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { clientStorage } from "./client-storage";
import { clientAuth } from "./client-auth";

// Helper function to fetch shared achievement data from multiple IndexedDB stores
// Used by both /achievement-progress and /achievements endpoints to reduce duplication
async function getAchievementData(userId: string, tenantId: number) {
  const allBadges = await clientStorage.getBadges();
  const userBadges = await clientStorage.getUserBadges(userId, tenantId);
  const gameStats = await clientStorage.getUserGameStats(userId);
  const userQuizzes = await clientStorage.getUserQuizzes(userId, tenantId);
  return { allBadges, userBadges, gameStats, userQuizzes };
}

// Placeholder badge for when badge details are not found in the database.
// This can happen if a badge is deleted while users still have references to it,
// or if there's a data integrity issue between userBadges and badges stores.
const createUnknownBadge = (badgeId: number) => ({
  id: badgeId,
  name: "Unknown Badge",
  description: "",
  icon: "🏆",
  category: "special",
  requirement: null,
  color: "blue",
  rarity: "common",
  points: 0
});

// Type for badge requirements
interface BadgeRequirement {
  type: "quiz_count" | "streak" | "score";
  value: number;
}

// Client-side query handler that uses IndexedDB
type UnauthorizedBehavior = "returnNull" | "throw";
export function getQueryFn<T>(options: {
  on401: UnauthorizedBehavior;
}): QueryFunction<T> {
  const { on401: unauthorizedBehavior } = options;
  return async ({ queryKey }) => {
    const key = queryKey as string[];
    const path = key.join("/");

    // Handle auth user query
    if (path === "/api/auth/user") {
      const user = await clientAuth.getCurrentUser();
      if (!user && unauthorizedBehavior === "throw") {
        throw new Error("Unauthorized");
      }
      return user as T;
    }

    // Parse the path to determine what data to fetch
    // This is a simplified router for client-side queries
    try {
      // Handle user queries
      if (path.startsWith("/api/user/")) {
        const userId = await clientStorage.getCurrentUserId();
        if (!userId) throw new Error("Not authenticated");

        // Get user's current tenant for data isolation
        const user = await clientStorage.getUser(userId);
        const tenantId = user?.tenantId || 1;

        if (path.includes("/stats")) {
          return await clientStorage.getUserStats(userId, tenantId) as T;
        }
        if (path.includes("/quizzes")) {
          return await clientStorage.getUserQuizzes(userId, tenantId) as T;
        }
        if (path.includes("/progress")) {
          return await clientStorage.getUserProgress(userId, tenantId) as T;
        }
        if (path.includes("/mastery")) {
          return await clientStorage.getCertificationMasteryScores(userId, tenantId) as T;
        }
        if (path.includes("/lectures")) {
          return await clientStorage.getUserLectures(userId, tenantId) as T;
        }
        if (path.includes("/achievement-progress")) {
          // Return achievement progress data with all badges and user's progress
          const { allBadges, userBadges, gameStats, userQuizzes } = await getAchievementData(userId, tenantId);
          
          // Create lookup Maps for O(1) access instead of O(n) find operations
          const userBadgeLookup = new Map(userBadges.map(ub => [ub.badgeId, ub]));
          const userBadgeIds = new Set(userBadges.map(ub => ub.badgeId));
          const completedQuizzes = userQuizzes.filter(q => q.completedAt).length;
          // Get user's best quiz score for score-based achievements
          // Use Math.max(0, ...) to ensure we get 0 instead of -Infinity if no valid scores exist
          const bestScore = completedQuizzes > 0 
            ? Math.max(0, ...userQuizzes.filter(q => q.completedAt && q.score !== null).map(q => q.score!))
            : 0;
          
          const progressData = allBadges.map(badge => {
            const userBadge = userBadgeLookup.get(badge.id);
            const earned = userBadgeIds.has(badge.id);
            
            // Calculate progress based on badge requirements
            let progress = 0;
            let progressText = "";
            
            if (earned) {
              progress = 100;
              progressText = "Completed!";
            } else if (badge.requirement) {
              // Try to calculate progress based on requirement type
              const req = badge.requirement as BadgeRequirement;
              if (req.type === "quiz_count") {
                progress = Math.min(100, Math.round((completedQuizzes / req.value) * 100));
                progressText = `${completedQuizzes}/${req.value} quizzes completed`;
              } else if (req.type === "streak") {
                const currentStreak = gameStats?.currentStreak || 0;
                progress = Math.min(100, Math.round((currentStreak / req.value) * 100));
                progressText = `${currentStreak}/${req.value} day streak`;
              } else if (req.type === "score") {
                // Calculate progress based on user's best quiz score vs target
                progress = Math.min(100, Math.round((bestScore / req.value) * 100));
                progressText = bestScore > 0 
                  ? `Best score: ${bestScore}% (target: ${req.value}%)`
                  : `Achieve ${req.value}% on a quiz`;
              }
            }
            
            return {
              badge,
              earned,
              progress: userBadge?.progress || progress,
              progressText
            };
          });
          
          return {
            unlockedBadges: Array.from(userBadgeIds),
            progressData
          } as T;
        }
        if (path.includes("/achievements")) {
          // Return full achievement data with badges, game stats, and new badge count
          const { allBadges, userBadges, gameStats } = await getAchievementData(userId, tenantId);
          
          // Create badge lookup Map for O(1) access instead of O(n) find operations
          const badgeLookup = new Map(allBadges.map(b => [b.id, b]));
          
          // Map user badges with full badge details
          const badgesWithDetails = userBadges.map(userBadge => {
            const badge = badgeLookup.get(userBadge.badgeId);
            return {
              id: userBadge.id,
              badgeId: userBadge.badgeId,
              userId: userBadge.userId,
              earnedAt: userBadge.earnedAt,
              progress: userBadge.progress,
              isNotified: userBadge.isNotified,
              badge: badge || createUnknownBadge(userBadge.badgeId)
            };
          });
          
          // Count new (unnotified) badges
          const newBadges = userBadges.filter(ub => !ub.isNotified).length;
          
          return {
            badges: badgesWithDetails,
            gameStats: gameStats || {
              totalPoints: 0,
              currentStreak: 0,
              longestStreak: 0,
              totalBadgesEarned: userBadges.length,
              level: 1,
              nextLevelPoints: 100
            },
            newBadges
          } as T;
        }
        if (path.includes("/practice-test-attempts")) {
          return await clientStorage.getPracticeTestAttempts(userId) as T;
        }
        if (path.includes("/token-balance") || path.includes("/tokens")) {
          return { balance: await clientStorage.getUserTokenBalance(userId) } as T;
        }
        // Default to getting user
        const match = path.match(/\/api\/user\/([^\/]+)$/);
        if (match) {
          const uid = match[1];
          return await clientStorage.getUser(uid) as T;
        }
      }

      // Handle tenants
      if (path === "/api/tenants") {
        return await clientStorage.getTenants() as T;
      }
      
      // Handle specific tenant query
      if (path.startsWith("/api/tenants/")) {
        const match = path.match(/\/api\/tenants\/(\d+)/);
        if (match) {
          const tenantId = parseInt(match[1]);
          return await clientStorage.getTenant(tenantId) as T;
        }
      }

      // Handle categories
      if (path === "/api/categories") {
        // Get current user to determine tenantId
        const userId = await clientStorage.getCurrentUserId();
        if (!userId) return await clientStorage.getCategories(1) as T; // Anonymous users see tenant 1 (default tenant)
        
        const user = await clientStorage.getUser(userId);
        const tenantId = user?.tenantId || 1;
        return await clientStorage.getCategories(tenantId) as T;
      }

      // Handle subcategories
      if (path === "/api/subcategories") {
        // Get current user to determine tenantId
        const userId = await clientStorage.getCurrentUserId();
        if (!userId) return await clientStorage.getSubcategories(undefined, 1) as T;
        
        const user = await clientStorage.getUser(userId);
        const tenantId = user?.tenantId || 1;
        return await clientStorage.getSubcategories(undefined, tenantId) as T;
      }

      // Handle badges
      if (path === "/api/badges") {
        return await clientStorage.getBadges() as T;
      }

      // Handle quiz queries
      if (path.startsWith("/api/quiz/")) {
        // Check for quiz questions endpoint first
        const questionsMatch = path.match(/\/api\/quiz\/(\d+)\/questions$/);
        if (questionsMatch) {
          const quizId = parseInt(questionsMatch[1]);
          return await clientStorage.getQuizQuestions(quizId) as T;
        }
        
        // Then check for quiz details
        const match = path.match(/\/api\/quiz\/(\d+)$/);
        if (match) {
          const quizId = parseInt(match[1]);
          return await clientStorage.getQuiz(quizId) as T;
        }
      }

      // Handle lecture queries
      if (path.startsWith("/api/lecture/")) {
        const match = path.match(/\/api\/lecture\/(\d+)/);
        if (match) {
          const lectureId = parseInt(match[1]);
          return await clientStorage.getLecture(lectureId) as T;
        }
      }

      // Handle practice tests
      if (path === "/api/practice-tests") {
        return await clientStorage.getPracticeTests() as T;
      }

      // Handle admin tenant queries
      if (path === "/api/admin/tenants") {
        return await clientStorage.getTenants() as T;
      }

      // Handle admin tenant stats
      const tenantStatsMatch = path.match(/\/api\/admin\/tenants\/(\d+)\/stats/);
      if (tenantStatsMatch) {
        const tenantId = parseInt(tenantStatsMatch[1]);
        const categories = await clientStorage.getCategories(tenantId);
        const subcategories = await clientStorage.getSubcategories(undefined, tenantId);
        const questions = await clientStorage.getQuestionsByTenant(tenantId);
        const users = await clientStorage.getUsersByTenant(tenantId);
        return {
          categories: categories.length,
          subcategories: subcategories.length,
          questions: questions.length,
          users: users.length,
        } as T;
      }

      // Handle admin tenant categories
      const tenantCategoriesMatch = path.match(/\/api\/admin\/tenants\/(\d+)\/categories/);
      if (tenantCategoriesMatch) {
        const tenantId = parseInt(tenantCategoriesMatch[1]);
        return await clientStorage.getCategories(tenantId) as T;
      }

      // Handle admin tenant questions
      const tenantQuestionsMatch = path.match(/\/api\/admin\/tenants\/(\d+)\/questions/);
      if (tenantQuestionsMatch) {
        const tenantId = parseInt(tenantQuestionsMatch[1]);
        return await clientStorage.getQuestionsByTenant(tenantId) as T;
      }

      // Handle admin tenant users
      const tenantUsersMatch = path.match(/\/api\/admin\/tenants\/(\d+)\/users/);
      if (tenantUsersMatch) {
        const tenantId = parseInt(tenantUsersMatch[1]);
        return await clientStorage.getUsersByTenant(tenantId) as T;
      }

      // Default: return null for unsupported queries
      console.warn(`Unsupported query path: ${path}`);
      return null as T;
    } catch (error) {
      console.error(`Query error for ${path}:`, error);
      if (unauthorizedBehavior === "returnNull") {
        return null as T;
      }
      throw error;
    }
  };
}

export async function apiRequest({
  method,
  endpoint,
  data
}: {
  method: string;
  endpoint: string;
  data?: unknown | undefined;
}): Promise<Response> {
  // This function is kept for compatibility but gradually being deprecated
  // TODO: Replace all apiRequest calls with direct clientStorage calls
  console.warn(
    `⚠️ apiRequest to ${endpoint} is deprecated. ` +
    `Please use clientStorage methods directly. ` +
    `See MIGRATION_STATUS.md for migration guide.`
  );
  
  // Return a mock Response for now to avoid breaking existing code
  return new Response(JSON.stringify({ message: "API deprecated - use clientStorage" }), {
    status: 501,
    statusText: "Not Implemented",
  });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
