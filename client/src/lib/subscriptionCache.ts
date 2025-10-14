import { QueryClient } from "@tanstack/react-query";

/**
 * Invalidates all subscription-related queries to ensure UI is in sync with server state
 * @param queryClient - The TanStack Query client instance
 */
export async function invalidateSubscriptionQueries(queryClient: QueryClient): Promise<void> {
  // Invalidate all queries that might be affected by subscription changes
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] }),
    queryClient.invalidateQueries({ queryKey: ["/api/user"] }),
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] }),
    // Invalidate any user-specific queries
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const key = query.queryKey;
        if (Array.isArray(key) && key.length > 0) {
          const firstKey = key[0];
          return typeof firstKey === 'string' && 
            (firstKey.includes('/api/user/') || 
             firstKey.includes('subscription') ||
             firstKey.includes('quiz'));
        }
        return false;
      }
    })
  ]);
}

/**
 * Invalidates quiz-related queries after quiz creation/completion
 * @param queryClient - The TanStack Query client instance
 * @param userId - Optional user ID for specific queries
 */
export async function invalidateQuizQueries(
  queryClient: QueryClient, 
  userId?: string
): Promise<void> {
  const queries = [
    queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] }),
    queryClient.invalidateQueries({ queryKey: ["/api/user"] }),
  ];
  
  if (userId) {
    queries.push(
      queryClient.invalidateQueries({ queryKey: [`/api/user/${userId}`] }),
      queryClient.invalidateQueries({ queryKey: [`/api/user/${userId}/quizzes`] }),
      queryClient.invalidateQueries({ queryKey: [`/api/user/${userId}/practice-test-attempts`] })
    );
  }
  
  await Promise.all(queries);
}

/**
 * Prefetches subscription status if not already cached
 * @param queryClient - The TanStack Query client instance
 */
export async function prefetchSubscriptionStatus(queryClient: QueryClient): Promise<void> {
  const existingData = queryClient.getQueryData(["/api/subscription/status"]);
  
  if (!existingData) {
    await queryClient.prefetchQuery({
      queryKey: ["/api/subscription/status"],
      staleTime: 30 * 1000, // 30 seconds
    });
  }
}

/**
 * Sets optimistic update for subscription status
 * @param queryClient - The TanStack Query client instance
 * @param newPlan - The new plan to set optimistically
 */
export function setOptimisticSubscription(
  queryClient: QueryClient, 
  newPlan: 'free' | 'pro' | 'enterprise'
): void {
  const currentData = queryClient.getQueryData(["/api/subscription/status"]) as any;
  
  if (currentData) {
    queryClient.setQueryData(["/api/subscription/status"], {
      ...currentData,
      plan: newPlan,
      isSubscribed: newPlan !== 'free',
      status: newPlan !== 'free' ? 'active' : 'inactive',
      // Update limits based on plan
      limits: {
        quizzesPerDay: newPlan === 'free' ? 5 : -1,
        categoriesAccess: newPlan === 'free' ? ['basic'] : ['all'],
        analyticsAccess: newPlan === 'free' ? 'basic' : newPlan === 'pro' ? 'advanced' : 'enterprise',
      }
    });
  }
}