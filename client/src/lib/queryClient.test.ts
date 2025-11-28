import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  staleTime, 
  queryKeys, 
  queryClient,
  invalidateUserQueries,
  invalidateAllUserData,
  invalidateStaticData,
  invalidateQuizQueries,
} from './queryClient';

describe('staleTime constants', () => {
  it('should have appropriate stale times for different data types', () => {
    // Static data should have longer stale time (5 minutes)
    expect(staleTime.static).toBe(5 * 60 * 1000);
    
    // User data should have shorter stale time (30 seconds)
    expect(staleTime.user).toBe(30 * 1000);
    
    // Auth data should have medium stale time (1 minute)
    expect(staleTime.auth).toBe(60 * 1000);
    
    // Quiz data should have medium stale time (2 minutes)
    expect(staleTime.quiz).toBe(2 * 60 * 1000);
  });

  it('should have static data stale time greater than user data', () => {
    expect(staleTime.static).toBeGreaterThan(staleTime.user);
  });

  it('should have quiz stale time greater than user data', () => {
    expect(staleTime.quiz).toBeGreaterThan(staleTime.user);
  });
});

describe('queryKeys', () => {
  it('should generate correct auth query keys', () => {
    expect(queryKeys.auth.user()).toEqual(["/api", "auth", "user"]);
  });

  it('should generate correct user query keys', () => {
    const userId = "test-user-123";
    expect(queryKeys.user.all(userId)).toEqual(["/api", "user", userId]);
    expect(queryKeys.user.stats(userId)).toEqual(["/api", "user", userId, "stats"]);
    expect(queryKeys.user.quizzes(userId)).toEqual(["/api", "user", userId, "quizzes"]);
    expect(queryKeys.user.progress(userId)).toEqual(["/api", "user", userId, "progress"]);
    expect(queryKeys.user.achievements(userId)).toEqual(["/api", "user", userId, "achievements"]);
  });

  it('should generate correct static data query keys', () => {
    expect(queryKeys.categories.all()).toEqual(["/api", "categories"]);
    expect(queryKeys.subcategories.all()).toEqual(["/api", "subcategories"]);
    expect(queryKeys.badges.all()).toEqual(["/api", "badges"]);
    expect(queryKeys.practiceTests.all()).toEqual(["/api", "practice-tests"]);
    expect(queryKeys.tenants.all()).toEqual(["/api", "tenants"]);
  });

  it('should generate correct quiz query keys', () => {
    expect(queryKeys.quiz.detail(123)).toEqual(["/api", "quiz", 123]);
    expect(queryKeys.quiz.questions(123)).toEqual(["/api", "quiz", 123, "questions"]);
  });

  it('should handle undefined userId gracefully', () => {
    expect(queryKeys.user.all(undefined)).toEqual(["/api", "user", undefined]);
    expect(queryKeys.user.stats(undefined)).toEqual(["/api", "user", undefined, "stats"]);
  });
});

describe('queryClient configuration', () => {
  it('should use user stale time as default', () => {
    const defaultOptions = queryClient.getDefaultOptions();
    expect(defaultOptions.queries?.staleTime).toBe(staleTime.user);
  });

  it('should disable refetch on window focus', () => {
    const defaultOptions = queryClient.getDefaultOptions();
    expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
  });

  it('should disable automatic retries', () => {
    const defaultOptions = queryClient.getDefaultOptions();
    expect(defaultOptions.queries?.retry).toBe(false);
    expect(defaultOptions.mutations?.retry).toBe(false);
  });
});

describe('cache invalidation helpers', () => {
  beforeEach(() => {
    // Clear all queries before each test
    queryClient.clear();
  });

  describe('invalidateUserQueries', () => {
    it('should not throw when userId is undefined', () => {
      expect(() => invalidateUserQueries(undefined)).not.toThrow();
    });

    it('should invalidate user queries when userId is provided', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const userId = "test-user-123";
      
      invalidateUserQueries(userId);
      
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.user.all(userId),
      });
      
      invalidateSpy.mockRestore();
    });
  });

  describe('invalidateAllUserData', () => {
    it('should invalidate auth and all user queries when no userId provided', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      
      invalidateAllUserData();
      
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.auth.user(),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["/api", "user"],
      });
      
      invalidateSpy.mockRestore();
    });

    it('should invalidate auth and specific user queries when userId provided', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const userId = "test-user-123";
      
      invalidateAllUserData(userId);
      
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.auth.user(),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.user.all(userId),
      });
      
      invalidateSpy.mockRestore();
    });
  });

  describe('invalidateStaticData', () => {
    it('should invalidate all static data caches', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      
      invalidateStaticData();
      
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.categories.all() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.subcategories.all() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.badges.all() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.practiceTests.all() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.tenants.all() });
      
      invalidateSpy.mockRestore();
    });
  });

  describe('invalidateQuizQueries', () => {
    it('should invalidate specific quiz when quizId provided', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const quizId = 123;
      
      invalidateQuizQueries(quizId);
      
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.quiz.detail(quizId) });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.quiz.questions(quizId) });
      
      invalidateSpy.mockRestore();
    });

    it('should invalidate all quiz queries when no quizId provided', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      
      invalidateQuizQueries();
      
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["/api", "quiz"] });
      
      invalidateSpy.mockRestore();
    });
  });
});
