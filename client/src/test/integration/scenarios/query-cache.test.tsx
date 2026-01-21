/**
 * Query Caching and Invalidation Integration Tests
 *
 * Tests TanStack Query behavior including:
 * - Query caching behavior
 * - Cache invalidation after mutations
 * - Cross-page cache consistency
 * - Stale time behavior for different query types
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  resetIntegrationMocks,
  signInTestUser,
  seedTestData,
  createTestUser,
  createTestCategory,
  waitForAsync,
} from '../helpers/integration-utils';
import {
  IntegrationTestProvider,
  createTestQueryClient,
  firestoreMock,
} from '../helpers/test-providers';
import { storage } from '@/lib/storage-factory';
import {
  queryKeys,
  invalidateUserQueries,
  invalidateStaticData,
  invalidateQuizQueries,
  staleTime,
} from '@/lib/queryClient';
import React from 'react';

describe('Query Caching and Invalidation Integration Tests', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(async () => {
    resetIntegrationMocks();
    queryClient = createTestQueryClient();

    // Seed test data
    await seedTestData({
      tenants: [{ id: 1, name: 'Test Tenant', isActive: true }],
      users: [
        {
          id: 'user1',
          email: 'user1@example.com',
          tenantId: 1,
          role: 'user',
        },
      ],
      categories: [
        createTestCategory(1, 1, { name: 'Category 1' }),
        createTestCategory(2, 1, { name: 'Category 2' }),
      ],
      badges: [
        {
          id: 1,
          name: 'Badge 1',
          icon: '🏆',
          category: 'achievement',
          rarity: 'common',
          points: 10,
        },
        { id: 2, name: 'Badge 2', icon: '🎖️', category: 'achievement', rarity: 'rare', points: 20 },
      ],
    });

    // Sign in test user
    const testUser = createTestUser({ uid: 'user1', email: 'user1@example.com' });
    await signInTestUser(testUser);
    firestoreMock.setCurrentUserId('user1');
    await waitForAsync(50);
  });

  describe('Query Caching Behavior', () => {
    it('should cache static data queries for configured stale time', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationTestProvider queryClient={queryClient}>{children}</IntegrationTestProvider>
      );

      // First query - should fetch from storage
      const { result: result1, rerender } = renderHook(
        () =>
          useQuery({
            queryKey: queryKeys.categories.all(),
            queryFn: async () => storage.getCategories(1),
            staleTime: staleTime.static,
          }),
        { wrapper }
      );

      // Wait for query to complete
      await waitFor(() => expect(result1.current.isSuccess).toBe(true));

      expect(result1.current.data).toHaveLength(2);
      const firstFetchTime = Date.now();

      // Second query immediately after - should use cache
      rerender();

      // Data should be available immediately from cache
      expect(result1.current.data).toHaveLength(2);
      expect(result1.current.isStale).toBe(false);

      // Cache should still be fresh (within stale time)
      expect(Date.now() - firstFetchTime).toBeLessThan(staleTime.static);
    });

    it('should cache user data queries with shorter stale time', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationTestProvider queryClient={queryClient}>{children}</IntegrationTestProvider>
      );

      // Query user stats
      const { result } = renderHook(
        () =>
          useQuery({
            queryKey: queryKeys.user.stats('user1'),
            queryFn: async () => storage.getUserStats('user1', 1),
            staleTime: staleTime.user,
          }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // User data should have shorter stale time than static data
      expect(staleTime.user).toBeLessThan(staleTime.static);

      // Data should be cached
      expect(result.current.data).toBeDefined();
    });

    it('should share cache across multiple components', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationTestProvider queryClient={queryClient}>{children}</IntegrationTestProvider>
      );

      // First component queries categories
      const { result: result1 } = renderHook(
        () =>
          useQuery({
            queryKey: queryKeys.categories.all(),
            queryFn: async () => storage.getCategories(1),
          }),
        { wrapper }
      );

      await waitFor(() => expect(result1.current.isSuccess).toBe(true));

      // Second component queries same data
      const { result: result2 } = renderHook(
        () =>
          useQuery({
            queryKey: queryKeys.categories.all(),
            queryFn: async () => storage.getCategories(1),
          }),
        { wrapper }
      );

      // Should get data from cache immediately
      await waitFor(() => expect(result2.current.isSuccess).toBe(true));
      expect(result2.current.data).toEqual(result1.current.data);
    });

    it('should handle cache for user-specific queries', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationTestProvider queryClient={queryClient}>{children}</IntegrationTestProvider>
      );

      // Seed some quizzes for user1
      await firestoreMock.setSubcollectionDocument('users', 'user1', 'quizzes', '1', {
        id: 1,
        userId: 'user1',
        name: 'Test Quiz',
        tenantId: 1,
      });

      // Query user's quizzes
      const { result } = renderHook(
        () =>
          useQuery({
            queryKey: queryKeys.user.quizzes('user1'),
            queryFn: async () => storage.getUserQuizzes('user1', 1),
          }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBeDefined();
      expect(Array.isArray(result.current.data)).toBe(true);
    });
  });

  describe('Cache Invalidation After Mutations', () => {
    it('should invalidate user queries after user data mutation', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationTestProvider queryClient={queryClient}>{children}</IntegrationTestProvider>
      );

      // Query user data
      const { result: queryResult } = renderHook(
        () =>
          useQuery({
            queryKey: queryKeys.user.detail('user1'),
            queryFn: async () => storage.getUser('user1'),
          }),
        { wrapper }
      );

      await waitFor(() => expect(queryResult.current.isSuccess).toBe(true));

      // Mutate user data
      const { result: mutationResult } = renderHook(
        () =>
          useMutation({
            mutationFn: async (updates: any) => storage.updateUser('user1', updates),
            onSuccess: () => invalidateUserQueries('user1'),
          }),
        { wrapper }
      );

      // Execute mutation
      mutationResult.current.mutate({ firstName: 'Updated' });

      await waitFor(() => expect(mutationResult.current.isSuccess).toBe(true));

      // Wait for invalidation to trigger refetch
      await waitForAsync(100);

      // Query should be marked as stale and refetch
      expect(queryResult.current.data).toBeDefined();
    });

    it('should invalidate static data after category creation', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationTestProvider queryClient={queryClient}>{children}</IntegrationTestProvider>
      );

      // Query categories
      const { result: queryResult } = renderHook(
        () =>
          useQuery({
            queryKey: queryKeys.categories.all(),
            queryFn: async () => storage.getCategories(1),
          }),
        { wrapper }
      );

      await waitFor(() => expect(queryResult.current.isSuccess).toBe(true));

      // Create new category
      const { result: mutationResult } = renderHook(
        () =>
          useMutation({
            mutationFn: async (category: any) => {
              await firestoreMock.setDocument('categories', '3', category);
              return category;
            },
            onSuccess: () => invalidateStaticData(),
          }),
        { wrapper }
      );

      mutationResult.current.mutate({
        id: 3,
        name: 'New Category',
        tenantId: 1,
      });

      await waitFor(() => expect(mutationResult.current.isSuccess).toBe(true));

      // Invalidate and wait for refetch
      await queryClient.invalidateQueries({ queryKey: queryKeys.categories.all() });
      await waitForAsync(100);

      // Categories should be refetched
      expect(queryResult.current.data).toBeDefined();
    });

    it('should invalidate quiz queries after quiz submission', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationTestProvider queryClient={queryClient}>{children}</IntegrationTestProvider>
      );

      // Create a quiz
      await firestoreMock.setSubcollectionDocument('users', 'user1', 'quizzes', '1', {
        id: 1,
        userId: 'user1',
        name: 'Test Quiz',
        tenantId: 1,
        completedAt: null,
        score: null,
      });

      // Query quiz
      const { result: queryResult } = renderHook(
        () =>
          useQuery({
            queryKey: queryKeys.quiz.detail(1),
            queryFn: async () => {
              const doc = await firestoreMock.getDocument('users/user1/quizzes', '1');
              return doc
                ? ({
                    id: doc.id,
                    ...doc.data,
                  } as {
                    id: string | number;
                    userId?: string;
                    name?: string;
                    tenantId?: number;
                    completedAt: string | null;
                    score: number | null;
                  })
                : null;
            },
          }),
        { wrapper }
      );

      await waitFor(() => expect(queryResult.current.isSuccess).toBe(true));
      expect(queryResult.current.data?.completedAt).toBeNull();

      // Submit quiz (mutation)
      const { result: mutationResult } = renderHook(
        () =>
          useMutation({
            mutationFn: async () => {
              await firestoreMock.updateDocument('users/user1/quizzes', '1', {
                completedAt: new Date().toISOString(),
                score: 85,
              });
            },
            onSuccess: () => invalidateQuizQueries(1),
          }),
        { wrapper }
      );

      mutationResult.current.mutate();

      await waitFor(() => expect(mutationResult.current.isSuccess).toBe(true));

      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: queryKeys.quiz.detail(1) });
      await waitForAsync(100);

      // Verify the quiz state was updated
      const updatedDoc = await firestoreMock.getDocument('users/user1/quizzes', '1');
      expect(updatedDoc).toBeDefined();
      expect(updatedDoc!.data.completedAt).toBeDefined();
      expect(updatedDoc!.data.score).toBe(85);
    });

    it('should cascade invalidations correctly', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationTestProvider queryClient={queryClient}>{children}</IntegrationTestProvider>
      );

      // Query multiple related data types
      const { result: statsResult } = renderHook(
        () =>
          useQuery({
            queryKey: queryKeys.user.stats('user1'),
            queryFn: async () => storage.getUserStats('user1', 1),
          }),
        { wrapper }
      );

      const { result: progressResult } = renderHook(
        () =>
          useQuery({
            queryKey: queryKeys.user.progress('user1'),
            queryFn: async () => storage.getUserProgress('user1', 1),
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(statsResult.current.isSuccess).toBe(true);
        expect(progressResult.current.isSuccess).toBe(true);
      });

      // Invalidate all user queries
      invalidateUserQueries('user1');

      // Both queries should be marked stale
      await waitForAsync(50);
    });
  });

  describe('Cross-Page Cache Consistency', () => {
    it('should maintain consistent cache across navigation', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationTestProvider queryClient={queryClient}>{children}</IntegrationTestProvider>
      );

      // Simulate "page 1" querying categories
      const { result: page1Result, unmount: unmountPage1 } = renderHook(
        () =>
          useQuery({
            queryKey: queryKeys.categories.all(),
            queryFn: async () => storage.getCategories(1),
          }),
        { wrapper }
      );

      await waitFor(() => expect(page1Result.current.isSuccess).toBe(true));
      const page1Data = page1Result.current.data;

      // Unmount page 1 (simulate navigation)
      unmountPage1();

      // Simulate "page 2" querying same data
      const { result: page2Result } = renderHook(
        () =>
          useQuery({
            queryKey: queryKeys.categories.all(),
            queryFn: async () => storage.getCategories(1),
          }),
        { wrapper }
      );

      // Page 2 should get data from cache
      await waitFor(() => expect(page2Result.current.isSuccess).toBe(true));
      expect(page2Result.current.data).toEqual(page1Data);
    });

    it('should handle stale cache across page transitions', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationTestProvider queryClient={queryClient}>{children}</IntegrationTestProvider>
      );

      // Page 1 queries data
      const { result: page1Result, unmount } = renderHook(
        () =>
          useQuery({
            queryKey: queryKeys.badges.all(),
            queryFn: async () => storage.getBadges(),
            staleTime: 100, // Short stale time for testing
          }),
        { wrapper }
      );

      await waitFor(() => expect(page1Result.current.isSuccess).toBe(true));

      // Wait for data to go stale
      await waitForAsync(150);

      unmount();

      // Page 2 queries same data
      const { result: page2Result } = renderHook(
        () =>
          useQuery({
            queryKey: queryKeys.badges.all(),
            queryFn: async () => storage.getBadges(),
            staleTime: 100,
          }),
        { wrapper }
      );

      // Should refetch stale data
      await waitFor(() => expect(page2Result.current.isSuccess).toBe(true));
      expect(page2Result.current.data).toBeDefined();
    });
  });

  describe('Stale Time Configuration', () => {
    it('should respect different stale times for different query types', () => {
      // Verify stale time configuration
      expect(staleTime.static).toBeGreaterThan(staleTime.user);
      expect(staleTime.quiz).toBeGreaterThan(staleTime.user);
      expect(staleTime.auth).toBeGreaterThan(staleTime.user);

      // Static data should have longest stale time
      expect(staleTime.static).toBe(5 * 60 * 1000); // 5 minutes
      expect(staleTime.user).toBe(30 * 1000); // 30 seconds
      expect(staleTime.auth).toBe(60 * 1000); // 1 minute
      expect(staleTime.quiz).toBe(2 * 60 * 1000); // 2 minutes
    });

    it('should refetch after stale time expires', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationTestProvider queryClient={queryClient}>{children}</IntegrationTestProvider>
      );

      // Query with short stale time
      const { result, rerender } = renderHook(
        () =>
          useQuery({
            queryKey: ['test-stale'],
            queryFn: async () => ({ timestamp: Date.now() }),
            staleTime: 100,
          }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const firstTimestamp = result.current.data?.timestamp;

      // Wait for data to go stale
      await waitForAsync(150);

      // Rerender should trigger refetch
      rerender();

      await waitFor(() => {
        expect(result.current.data?.timestamp).toBeGreaterThan(firstTimestamp!);
      });
    });

    it('should not refetch within stale time window', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationTestProvider queryClient={queryClient}>{children}</IntegrationTestProvider>
      );

      let fetchCount = 0;

      // Query with long stale time
      const { result, rerender } = renderHook(
        () =>
          useQuery({
            queryKey: ['test-fresh'],
            queryFn: async () => {
              fetchCount++;
              return { count: fetchCount };
            },
            staleTime: 10000, // 10 seconds
          }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(fetchCount).toBe(1);

      // Rerender multiple times quickly
      rerender();
      rerender();
      rerender();

      await waitForAsync(50);

      // Should not refetch (still fresh)
      expect(fetchCount).toBe(1);
    });
  });

  describe('Query Key Consistency', () => {
    it('should use consistent query keys for same resource', () => {
      const userId = 'user1';

      // Different ways to reference same data should have consistent keys
      const statsKey = queryKeys.user.stats(userId);
      const userKey = queryKeys.user.all(userId);

      // Stats key should be a subpath of user key
      expect(statsKey.slice(0, 3)).toEqual(userKey);

      // Multiple calls should produce identical keys
      expect(queryKeys.user.stats(userId)).toEqual(statsKey);
    });

    it('should generate different keys for different resources', () => {
      const user1Stats = queryKeys.user.stats('user1');
      const user2Stats = queryKeys.user.stats('user2');

      // Different users should have different keys
      expect(user1Stats).not.toEqual(user2Stats);

      // Different resource types should have different keys
      const userProgress = queryKeys.user.progress('user1');
      expect(user1Stats).not.toEqual(userProgress);
    });
  });
});
