/**
 * TanStack Query Client Configuration
 * 
 * This module configures the TanStack Query (React Query) client for
 * managing asynchronous data fetching and caching. In CertLab's client-only
 * architecture, queries are routed to IndexedDB via the clientStorage service
 * instead of making HTTP requests.
 * 
 * ## Architecture
 * 
 * ```
 * React Component
 *       ↓
 * TanStack Query (useQuery)
 *       ↓
 * getQueryFn (this module)
 *       ↓
 * clientStorage (IndexedDB wrapper)
 *       ↓
 * IndexedDB
 * ```
 * 
 * ## Query Path Routing
 * 
 * The `getQueryFn` function interprets query keys as API-like paths
 * (e.g., `/api/user/123/stats`) and routes them to the appropriate
 * clientStorage methods. This maintains API-compatible query keys
 * while operating entirely client-side.
 * 
 * ## Supported Query Paths
 * 
 * - `/api/auth/user` - Current authenticated user
 * - `/api/user/:id/*` - User-specific data (stats, quizzes, progress, etc.)
 * - `/api/categories` - Certification categories
 * - `/api/subcategories` - Category subcategories
 * - `/api/badges` - Achievement badges
 * - `/api/quiz/:id` - Quiz details
 * - `/api/quiz/:id/questions` - Quiz questions
 * - `/api/lecture/:id` - Lecture content
 * - `/api/practice-tests` - Practice test configurations
 * - `/api/tenants` - Multi-tenant organizations
 * - `/api/admin/*` - Admin queries
 * 
 * ## Caching Strategy
 * 
 * Different query types use appropriate stale times based on how frequently
 * the underlying data changes:
 * 
 * - **Static data** (categories, badges, practice tests): 5 minutes
 *   These rarely change during a session and can be cached longer.
 * 
 * - **User data** (stats, progress, achievements): 30 seconds
 *   These change frequently during active usage and need shorter cache times.
 * 
 * - **Auth data**: 1 minute
 *   Balance between performance and security responsiveness.
 * 
 * Cache is automatically invalidated after mutations using the provided
 * helper functions: `invalidateUserQueries`, `invalidateAllUserData`,
 * `invalidateStaticData`, and `invalidateQuizQueries`.
 * 
 * @module queryClient
 */

import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { clientStorage } from "./client-storage";
import { clientAuth } from "./client-auth";

/**
 * Stale time constants for different query types (in milliseconds).
 * 
 * These values determine how long cached data is considered "fresh"
 * before TanStack Query marks it as stale and eligible for refetching.
 * 
 * In CertLab's client-only architecture with IndexedDB, these times are
 * primarily used to:
 * 1. Control when background refetches occur
 * 2. Determine if cached data should be used immediately vs. refetched
 * 3. Optimize performance by reducing unnecessary IndexedDB reads
 */
export const staleTime = {
  /**
   * Static reference data that rarely changes during a session.
   * Examples: categories, badges, practice test definitions, tenants
   * 
   * 5 minutes - long enough to avoid repeated reads, short enough
   * to pick up admin changes within a reasonable timeframe.
   */
  static: 5 * 60 * 1000, // 5 minutes
  
  /**
   * User-specific data that changes frequently during active usage.
   * Examples: user stats, progress, achievements, quizzes, mastery scores
   * 
   * 30 seconds - ensures UI reflects recent quiz completions and
   * achievement unlocks without excessive refetching.
   */
  user: 30 * 1000, // 30 seconds
  
  /**
   * Authentication and session data.
   * Examples: current user, auth status
   * 
   * 1 minute - balances security responsiveness with performance.
   * Auth state changes (login/logout) should trigger immediate invalidation
   * regardless of stale time.
   */
  auth: 60 * 1000, // 1 minute
  
  /**
   * Quiz-related data that's typically stable during a session.
   * Examples: quiz details, quiz questions
   * 
   * 2 minutes - quiz content doesn't change frequently, but we want
   * to reflect any updates within a reasonable time.
   */
  quiz: 2 * 60 * 1000, // 2 minutes
} as const;

/**
 * Query Key Factory
 * 
 * Standardized query key generation following TanStack Query best practices.
 * All query keys use an array format: [scope, ...identifiers, resource]
 * 
 * Benefits:
 * - Consistent invalidation patterns (can invalidate by prefix)
 * - Type-safe query key generation
 * - Centralized documentation of all query keys
 * 
 * Example usage:
 *   queryKey: queryKeys.user.stats(userId)
 *   queryKey: queryKeys.categories.all()
 *   queryKey: queryKeys.quiz.detail(quizId)
 * 
 * Invalidation:
 *   queryClient.invalidateQueries({ queryKey: queryKeys.user.all(userId) }) // Invalidates all user queries
 *   queryClient.invalidateQueries({ queryKey: queryKeys.categories.all() }) // Invalidates categories
 */
export const queryKeys = {
  // Auth queries
  auth: {
    user: () => ["/api", "auth", "user"] as const,
  },
  
  // User-specific queries - all prefixed with /api/user/{userId}
  // Note: `all()` and `detail()` return identical keys intentionally - `all()` is for
  // prefix-based invalidation of all user queries, while `detail()` is for fetching
  // user details. Use `all()` when invalidating multiple user-related caches.
  user: {
    all: (userId: string | undefined) => ["/api", "user", userId] as const,
    detail: (userId: string | undefined) => ["/api", "user", userId] as const,
    stats: (userId: string | undefined) => ["/api", "user", userId, "stats"] as const,
    quizzes: (userId: string | undefined) => ["/api", "user", userId, "quizzes"] as const,
    progress: (userId: string | undefined) => ["/api", "user", userId, "progress"] as const,
    mastery: (userId: string | undefined) => ["/api", "user", userId, "mastery"] as const,
    lectures: (userId: string | undefined) => ["/api", "user", userId, "lectures"] as const,
    achievements: (userId: string | undefined) => ["/api", "user", userId, "achievements"] as const,
    achievementProgress: (userId: string | undefined) => ["/api", "user", userId, "achievement-progress"] as const,
    practiceTestAttempts: (userId: string | undefined) => ["/api", "user", userId, "practice-test-attempts"] as const,
    tokenBalance: (userId: string | undefined) => ["/api", "user", userId, "token-balance"] as const,
    challenges: (userId: string | undefined) => ["/api", "user", userId, "challenges"] as const,
    challengeAttempts: (userId: string | undefined) => ["/api", "user", userId, "challenge-attempts"] as const,
    studyPlan: (userId: string | undefined) => ["/api", "user", userId, "study-plan"] as const,
  },
  
  // Category queries
  categories: {
    all: () => ["/api", "categories"] as const,
  },
  
  // Subcategory queries
  subcategories: {
    all: () => ["/api", "subcategories"] as const,
  },
  
  // Badge queries
  badges: {
    all: () => ["/api", "badges"] as const,
  },
  
  // Quiz queries
  quiz: {
    detail: (quizId: number | string | undefined) => ["/api", "quiz", quizId] as const,
    questions: (quizId: number | string | undefined) => ["/api", "quiz", quizId, "questions"] as const,
  },
  
  // Lecture queries
  lecture: {
    detail: (lectureId: number | string | undefined) => ["/api", "lecture", lectureId] as const,
  },
  
  // Practice test queries
  practiceTests: {
    all: () => ["/api", "practice-tests"] as const,
  },
  
  // Tenant queries
  tenants: {
    all: () => ["/api", "tenants"] as const,
    detail: (tenantId: number | null | undefined) => ["/api", "tenants", tenantId] as const,
  },
  
  // Admin queries
  admin: {
    tenants: {
      all: () => ["/api", "admin", "tenants"] as const,
      stats: (tenantId: number | null | undefined) => ["/api", "admin", "tenants", tenantId, "stats"] as const,
      categories: (tenantId: number | null | undefined) => ["/api", "admin", "tenants", tenantId, "categories"] as const,
      questions: (tenantId: number | null | undefined) => ["/api", "admin", "tenants", tenantId, "questions"] as const,
      users: (tenantId: number | null | undefined) => ["/api", "admin", "tenants", tenantId, "users"] as const,
    },
  },
  
  // Credits queries
  credits: {
    products: () => ["/api", "credits", "products"] as const,
    balance: () => ["/api", "credits", "balance"] as const,
  },
  
  // Subscription queries
  subscription: {
    status: () => ["/api", "subscription", "status"] as const,
  },
} as const;

/**
 * Fetches shared achievement data needed by multiple endpoints.
 * Consolidates data retrieval to reduce duplication between
 * `/achievement-progress` and `/achievements` endpoints.
 * 
 * @param userId - The user's unique identifier
 * @param tenantId - The tenant ID for data isolation
 * @returns Object containing badges, user badges, game stats, and quizzes
 */
async function getAchievementData(userId: string, tenantId: number) {
  const allBadges = await clientStorage.getBadges();
  const userBadges = await clientStorage.getUserBadges(userId, tenantId);
  const gameStats = await clientStorage.getUserGameStats(userId);
  const userQuizzes = await clientStorage.getUserQuizzes(userId, tenantId);
  return { allBadges, userBadges, gameStats, userQuizzes };
}

/**
 * Creates a placeholder badge for when badge details are not found.
 * 
 * This can happen if:
 * - A badge is deleted while users still have references to it
 * - There's a data integrity issue between userBadges and badges stores
 * 
 * @param badgeId - The ID of the missing badge
 * @returns A placeholder badge object with default values
 */
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

/**
 * Type definition for badge requirement criteria.
 * Used to calculate progress towards earning badges.
 */
interface BadgeRequirement {
  /** Type of requirement: quiz completion count, streak days, or score threshold */
  type: "quiz_count" | "streak" | "score";
  /** The target value to achieve */
  value: number;
}

/**
 * Behavior options for handling 401 Unauthorized responses.
 */
type UnauthorizedBehavior = "returnNull" | "throw";

/**
 * Creates a query function that routes API-like paths to IndexedDB operations.
 * 
 * This function factory creates the query function used by TanStack Query.
 * It interprets query keys as URL paths and routes them to the appropriate
 * clientStorage methods, simulating a REST API while operating entirely
 * on local IndexedDB data.
 * 
 * @template T - The expected return type of the query
 * @param options - Configuration for unauthorized response handling
 * @param options.on401 - How to handle unauthorized access ("returnNull" or "throw")
 * @returns A QueryFunction compatible with TanStack Query
 * 
 * @example
 * ```typescript
 * // Usage in queryClient configuration
 * const queryClient = new QueryClient({
 *   defaultOptions: {
 *     queries: {
 *       queryFn: getQueryFn({ on401: "throw" }),
 *     },
 *   },
 * });
 * 
 * // In a component
 * const { data: user } = useQuery({
 *   queryKey: ["/api/auth/user"],
 * });
 * ```
 */
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

/**
 * Makes an API request.
 * 
 * @deprecated This function is deprecated. Use clientStorage methods directly.
 * The function is kept for backward compatibility during migration.
 * 
 * @param options - Request options
 * @param options.method - HTTP method (GET, POST, PUT, DELETE, etc.)
 * @param options.endpoint - API endpoint path (e.g., "/api/users")
 * @param options.data - Optional request body data of any serializable type
 * @returns A mock Response indicating deprecation (status 501)
 * 
 * @see clientStorage for direct data access methods
 */
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

/**
 * Configured TanStack Query client instance for the application.
 * 
 * Configuration:
 * - Uses the custom getQueryFn for IndexedDB-based data fetching
 * - Default stale time is 30 seconds (staleTime.user) - optimal for frequently changing user data
 * - Individual queries can override with longer stale times using staleTime.static (5 min),
 *   staleTime.auth (1 min), or staleTime.quiz (2 min)
 * - Disables window focus refetching (data is local, no need to refresh on focus)
 * - Disables retries (IndexedDB operations are synchronous and deterministic)
 * 
 * @example
 * ```tsx
 * // Wrap your app with QueryClientProvider
 * import { queryClient } from './lib/queryClient';
 * 
 * function App() {
 *   return (
 *     <QueryClientProvider client={queryClient}>
 *       <YourApp />
 *     </QueryClientProvider>
 *   );
 * }
 * ```
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      // Default stale time for user data - most common query type
      // Individual queries can override this using the staleTime constants
      staleTime: staleTime.user,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Invalidates user-specific queries after mutations that modify user data.
 * 
 * Use this after mutations that affect user stats, progress, achievements,
 * or other user-specific data. This ensures the UI reflects the latest
 * data from IndexedDB.
 * 
 * @param userId - The user ID whose queries should be invalidated
 * 
 * @example
 * ```typescript
 * const mutation = useMutation({
 *   mutationFn: async (data) => {
 *     await clientStorage.updateUserProgress(userId, data);
 *   },
 *   onSuccess: () => {
 *     invalidateUserQueries(userId);
 *   },
 * });
 * ```
 */
export function invalidateUserQueries(userId: string | undefined): void {
  if (!userId) return;
  
  queryClient.invalidateQueries({ 
    queryKey: queryKeys.user.all(userId),
  });
}

/**
 * Invalidates all user-related data including auth state.
 * 
 * Use this after significant user actions like:
 * - Login/logout
 * - Account deletion
 * - Tenant switching
 * 
 * @param userId - Optional user ID for targeted invalidation.
 *                 If not provided, invalidates all user queries.
 * 
 * @example
 * ```typescript
 * // After logout
 * await clientAuth.logout();
 * invalidateAllUserData();
 * ```
 */
export function invalidateAllUserData(userId?: string): void {
  // Invalidate auth state
  queryClient.invalidateQueries({ 
    queryKey: queryKeys.auth.user(),
  });
  
  // Invalidate user-specific data if userId provided
  if (userId) {
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.user.all(userId),
    });
  } else {
    // Invalidate all user queries by prefix
    queryClient.invalidateQueries({ 
      queryKey: ["/api", "user"],
    });
  }
}

/**
 * Invalidates static reference data caches.
 * 
 * Use this after admin operations that modify categories, badges,
 * or other reference data. This is typically only needed after
 * admin mutations.
 * 
 * @example
 * ```typescript
 * // After admin creates a new category
 * await clientStorage.createCategory(data);
 * invalidateStaticData();
 * ```
 */
export function invalidateStaticData(): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.categories.all() });
  queryClient.invalidateQueries({ queryKey: queryKeys.subcategories.all() });
  queryClient.invalidateQueries({ queryKey: queryKeys.badges.all() });
  queryClient.invalidateQueries({ queryKey: queryKeys.practiceTests.all() });
  queryClient.invalidateQueries({ queryKey: queryKeys.tenants.all() });
}

/**
 * Invalidates quiz-related caches.
 * 
 * Use this after mutations that modify quiz state, such as
 * completing a quiz or updating quiz questions.
 * 
 * @param quizId - Optional quiz ID for targeted invalidation
 * 
 * @example
 * ```typescript
 * // After completing a quiz
 * await clientStorage.completeQuiz(quizId, results);
 * invalidateQuizQueries(quizId);
 * invalidateUserQueries(userId); // Also update user stats
 * ```
 */
export function invalidateQuizQueries(quizId?: number | string): void {
  if (quizId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.quiz.detail(quizId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.quiz.questions(quizId) });
  } else {
    // Invalidate all quiz queries
    queryClient.invalidateQueries({ queryKey: ["/api", "quiz"] });
  }
}
