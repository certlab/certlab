import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { clientStorage } from "./client-storage";
import { clientAuth } from "./client-auth";

// Client-side query handler that uses IndexedDB
type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const key = queryKey as string[];
    const path = key.join("/");

    // Handle auth user query
    if (path === "/api/auth/user") {
      const user = await clientAuth.getCurrentUser();
      if (!user && unauthorizedBehavior === "throw") {
        throw new Error("Unauthorized");
      }
      return user;
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
          return await clientStorage.getUserStats(userId, tenantId);
        }
        if (path.includes("/quizzes")) {
          return await clientStorage.getUserQuizzes(userId, tenantId);
        }
        if (path.includes("/progress")) {
          return await clientStorage.getUserProgress(userId, tenantId);
        }
        if (path.includes("/mastery")) {
          return await clientStorage.getCertificationMasteryScores(userId, tenantId);
        }
        if (path.includes("/lectures")) {
          return await clientStorage.getUserLectures(userId, tenantId);
        }
        if (path.includes("/achievement-progress")) {
          // Return achievement progress data with all badges and user's progress
          const allBadges = await clientStorage.getBadges();
          const userBadges = await clientStorage.getUserBadges(userId, tenantId);
          const userBadgeIds = userBadges.map(ub => ub.badgeId);
          const gameStats = await clientStorage.getUserGameStats(userId);
          const userQuizzes = await clientStorage.getUserQuizzes(userId, tenantId);
          const completedQuizzes = userQuizzes.filter(q => q.completedAt).length;
          // Get user's best quiz score for score-based achievements
          const bestScore = completedQuizzes > 0 
            ? Math.max(0, ...userQuizzes.filter(q => q.completedAt && q.score !== null).map(q => q.score!))
            : 0;
          
          const progressData = allBadges.map(badge => {
            const userBadge = userBadges.find(ub => ub.badgeId === badge.id);
            const earned = userBadgeIds.includes(badge.id);
            
            // Calculate progress based on badge requirements
            let progress = 0;
            let progressText = "";
            
            if (earned) {
              progress = 100;
              progressText = "Completed!";
            } else if (badge.requirement) {
              // Try to calculate progress based on requirement type
              const req = badge.requirement;
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
            unlockedBadges: userBadgeIds,
            progressData
          };
        }
        if (path.includes("/achievements")) {
          // Return full achievement data with badges, game stats, and new badge count
          const userBadges = await clientStorage.getUserBadges(userId, tenantId);
          const allBadges = await clientStorage.getBadges();
          const gameStats = await clientStorage.getUserGameStats(userId, tenantId);
          
          // Fallback badge for when badge details are not found
          const createFallbackBadge = (badgeId: number) => ({
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
          
          // Map user badges with full badge details
          const badgesWithDetails = userBadges.map(userBadge => {
            const badge = allBadges.find(b => b.id === userBadge.badgeId);
            return {
              id: userBadge.id,
              badgeId: userBadge.badgeId,
              userId: userBadge.userId,
              earnedAt: userBadge.earnedAt,
              progress: userBadge.progress,
              isNotified: userBadge.isNotified,
              badge: badge || createFallbackBadge(userBadge.badgeId)
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
          };
        }
        if (path.includes("/practice-test-attempts")) {
          return await clientStorage.getPracticeTestAttempts(userId);
        }
        if (path.includes("/token-balance") || path.includes("/tokens")) {
          return { balance: await clientStorage.getUserTokenBalance(userId) };
        }
        // Default to getting user
        const match = path.match(/\/api\/user\/([^\/]+)$/);
        if (match) {
          const uid = match[1];
          return await clientStorage.getUser(uid);
        }
      }

      // Handle tenants
      if (path === "/api/tenants") {
        return await clientStorage.getTenants();
      }
      
      // Handle specific tenant query
      if (path.startsWith("/api/tenants/")) {
        const match = path.match(/\/api\/tenants\/(\d+)/);
        if (match) {
          const tenantId = parseInt(match[1]);
          return await clientStorage.getTenant(tenantId);
        }
      }

      // Handle categories
      if (path === "/api/categories") {
        // Get current user to determine tenantId
        const userId = await clientStorage.getCurrentUserId();
        if (!userId) return await clientStorage.getCategories(1); // Anonymous users see tenant 1 (default tenant)
        
        const user = await clientStorage.getUser(userId);
        const tenantId = user?.tenantId || 1;
        return await clientStorage.getCategories(tenantId);
      }

      // Handle subcategories
      if (path === "/api/subcategories") {
        // Get current user to determine tenantId
        const userId = await clientStorage.getCurrentUserId();
        if (!userId) return await clientStorage.getSubcategories(undefined, 1);
        
        const user = await clientStorage.getUser(userId);
        const tenantId = user?.tenantId || 1;
        return await clientStorage.getSubcategories(undefined, tenantId);
      }

      // Handle badges
      if (path === "/api/badges") {
        return await clientStorage.getBadges();
      }

      // Handle quiz queries
      if (path.startsWith("/api/quiz/")) {
        // Check for quiz questions endpoint first
        const questionsMatch = path.match(/\/api\/quiz\/(\d+)\/questions$/);
        if (questionsMatch) {
          const quizId = parseInt(questionsMatch[1]);
          return await clientStorage.getQuizQuestions(quizId);
        }
        
        // Then check for quiz details
        const match = path.match(/\/api\/quiz\/(\d+)$/);
        if (match) {
          const quizId = parseInt(match[1]);
          return await clientStorage.getQuiz(quizId);
        }
      }

      // Handle lecture queries
      if (path.startsWith("/api/lecture/")) {
        const match = path.match(/\/api\/lecture\/(\d+)/);
        if (match) {
          const lectureId = parseInt(match[1]);
          return await clientStorage.getLecture(lectureId);
        }
      }

      // Handle practice tests
      if (path === "/api/practice-tests") {
        return await clientStorage.getPracticeTests();
      }

      // Default: return null for unsupported queries
      console.warn(`Unsupported query path: ${path}`);
      return null;
    } catch (error) {
      console.error(`Query error for ${path}:`, error);
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
      throw error;
    }
  };

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
