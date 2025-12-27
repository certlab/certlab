import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUnreadNotifications } from './use-unread-notifications';
import * as authProvider from '@/lib/auth-provider';
import type { ReactNode } from 'react';

// Mock the auth provider
vi.mock('@/lib/auth-provider', () => ({
  useAuth: vi.fn(),
}));

describe('useUnreadNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return zero unreadCount when user is not authenticated', () => {
    vi.mocked(authProvider.useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      signInWithGoogle: vi.fn(),
    } as any);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          staleTime: Infinity,
        },
      },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUnreadNotifications(), { wrapper });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.achievements).toBeUndefined();
  });

  it('should return zero unreadCount when no badges exist', () => {
    const mockUser = { id: 1, email: 'test@example.com' };
    vi.mocked(authProvider.useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      signInWithGoogle: vi.fn(),
    } as any);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          staleTime: Infinity,
        },
      },
    });

    // Pre-populate the cache with empty badges
    queryClient.setQueryData(['/api', 'user', mockUser.id, 'achievements'], {
      badges: [],
      gameStats: {
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalBadgesEarned: 0,
      },
      newBadges: 0,
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUnreadNotifications(), { wrapper });

    expect(result.current.unreadCount).toBe(0);
  });

  it('should count unread notifications correctly when badges have mixed notification states', () => {
    const mockUser = { id: 1, email: 'test@example.com' };
    vi.mocked(authProvider.useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      signInWithGoogle: vi.fn(),
    } as any);

    const mockBadges = [
      {
        id: 1,
        badgeId: 101,
        userId: 1,
        earnedAt: '2024-01-01',
        isNotified: false, // Unread
        badge: {
          id: 101,
          name: 'First Quiz',
          description: 'Complete your first quiz',
          icon: '🎯',
          points: 10,
          rarity: 'common',
          color: 'blue',
        },
      },
      {
        id: 2,
        badgeId: 102,
        userId: 1,
        earnedAt: '2024-01-02',
        isNotified: true, // Read
        badge: {
          id: 102,
          name: 'Quiz Master',
          description: 'Complete 10 quizzes',
          icon: '🏆',
          points: 50,
          rarity: 'rare',
          color: 'gold',
        },
      },
      {
        id: 3,
        badgeId: 103,
        userId: 1,
        earnedAt: '2024-01-03',
        isNotified: false, // Unread
        badge: {
          id: 103,
          name: 'Streak Champion',
          description: 'Maintain a 7-day streak',
          icon: '🔥',
          points: 100,
          rarity: 'legendary',
          color: 'rainbow',
        },
      },
    ];

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          staleTime: Infinity,
        },
      },
    });

    // Pre-populate the cache
    queryClient.setQueryData(['/api', 'user', mockUser.id, 'achievements'], {
      badges: mockBadges,
      gameStats: {
        totalPoints: 160,
        currentStreak: 7,
        longestStreak: 7,
        totalBadgesEarned: 3,
      },
      newBadges: 2,
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUnreadNotifications(), { wrapper });

    // Should count 2 badges with isNotified: false
    expect(result.current.unreadCount).toBe(2);
    expect(result.current.achievements?.badges).toHaveLength(3);
  });

  it('should return zero when all badges are notified', () => {
    const mockUser = { id: 1, email: 'test@example.com' };
    vi.mocked(authProvider.useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      signInWithGoogle: vi.fn(),
    } as any);

    const mockBadges = [
      {
        id: 1,
        badgeId: 101,
        userId: 1,
        earnedAt: '2024-01-01',
        isNotified: true,
        badge: {
          id: 101,
          name: 'Badge 1',
          description: 'Description 1',
          icon: '🎯',
          points: 10,
          rarity: 'common',
          color: 'blue',
        },
      },
      {
        id: 2,
        badgeId: 102,
        userId: 1,
        earnedAt: '2024-01-02',
        isNotified: true,
        badge: {
          id: 102,
          name: 'Badge 2',
          description: 'Description 2',
          icon: '🏆',
          points: 20,
          rarity: 'rare',
          color: 'gold',
        },
      },
    ];

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          staleTime: Infinity,
        },
      },
    });

    queryClient.setQueryData(['/api', 'user', mockUser.id, 'achievements'], {
      badges: mockBadges,
      gameStats: {
        totalPoints: 30,
        currentStreak: 1,
        longestStreak: 1,
        totalBadgesEarned: 2,
      },
      newBadges: 0,
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUnreadNotifications(), { wrapper });

    expect(result.current.unreadCount).toBe(0);
  });

  it('should handle undefined achievements gracefully', () => {
    const mockUser = { id: 1, email: 'test@example.com' };
    vi.mocked(authProvider.useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      signInWithGoogle: vi.fn(),
    } as any);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          staleTime: Infinity,
        },
      },
    });

    // Don't set any data in the cache
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUnreadNotifications(), { wrapper });

    // Should default to 0 when data is undefined
    expect(result.current.unreadCount).toBe(0);
  });
});
