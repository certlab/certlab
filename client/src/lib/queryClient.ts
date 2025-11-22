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

        if (path.includes("/stats")) {
          return await clientStorage.getUserStats(userId);
        }
        if (path.includes("/quizzes")) {
          return await clientStorage.getUserQuizzes(userId);
        }
        if (path.includes("/progress")) {
          return await clientStorage.getUserProgress(userId);
        }
        if (path.includes("/mastery")) {
          return await clientStorage.getCertificationMasteryScores(userId);
        }
        if (path.includes("/lectures")) {
          return await clientStorage.getUserLectures(userId);
        }
        if (path.includes("/achievements")) {
          return await clientStorage.getUserBadges(userId);
        }
        if (path.includes("/study-groups")) {
          return await clientStorage.getUserStudyGroups(userId);
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

      // Handle categories
      if (path === "/api/categories") {
        return await clientStorage.getCategories();
      }

      // Handle subcategories
      if (path === "/api/subcategories") {
        return await clientStorage.getSubcategories();
      }

      // Handle badges
      if (path === "/api/badges") {
        return await clientStorage.getBadges();
      }

      // Handle quiz queries
      if (path.startsWith("/api/quiz/")) {
        const match = path.match(/\/api\/quiz\/(\d+)/);
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

      // Handle study groups
      if (path === "/api/study-groups") {
        return await clientStorage.getStudyGroups();
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
