/**
 * Tests for ContributionHeatmap component
 * Tests Firebase connectivity requirement
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test/mocks/providers';
import ContributionHeatmap from './ContributionHeatmap';

// Mock dependencies
vi.mock('@/lib/auth-provider', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-123', email: 'test@example.com' },
  })),
}));

vi.mock('@/lib/storage-factory', () => ({
  isCloudSyncAvailable: vi.fn(),
}));

vi.mock('@/lib/queryClient', () => ({
  queryKeys: {
    user: {
      quizzes: (userId: string | undefined) => ['quizzes', userId],
    },
  },
}));

describe('ContributionHeatmap', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Create a new QueryClient for each test with default queryFn
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('should show Firebase error when cloud sync is not available', async () => {
    const { isCloudSyncAvailable } = await import('@/lib/storage-factory');
    vi.mocked(isCloudSyncAvailable).mockReturnValue(false);

    render(
      <QueryClientProvider client={queryClient}>
        <ContributionHeatmap />
      </QueryClientProvider>
    );

    // Check for error message elements
    expect(screen.getByText('Firebase Not Connected')).toBeInTheDocument();
    expect(
      screen.getByText(/activity heatmap requires full Firebase\/Firestore connectivity/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Ensure Firebase is properly configured/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Firestore SDK automatically caches data for offline viewing/i)
    ).toBeInTheDocument();
  });

  it('should show loading state when Firebase is available and data is loading', async () => {
    const { isCloudSyncAvailable } = await import('@/lib/storage-factory');
    vi.mocked(isCloudSyncAvailable).mockReturnValue(true);

    render(
      <QueryClientProvider client={queryClient}>
        <ContributionHeatmap />
      </QueryClientProvider>
    );

    // Check for loading message
    expect(screen.getByText(/Loading your activity history/i)).toBeInTheDocument();
  });

  it('should not fetch quiz data when Firebase is unavailable', async () => {
    const { isCloudSyncAvailable } = await import('@/lib/storage-factory');
    vi.mocked(isCloudSyncAvailable).mockReturnValue(false);

    const querySpy = vi.fn();
    // Use the actual query key structure that matches the component
    queryClient.setQueryDefaults(['/api', 'user', 'test-user-123', 'quizzes'], {
      queryFn: querySpy,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ContributionHeatmap />
      </QueryClientProvider>
    );

    // Query should not be executed when Firebase is unavailable
    expect(querySpy).not.toHaveBeenCalled();
  });

  it('should display CloudOff icon when Firebase is not available', async () => {
    const { isCloudSyncAvailable } = await import('@/lib/storage-factory');
    vi.mocked(isCloudSyncAvailable).mockReturnValue(false);

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <ContributionHeatmap />
      </QueryClientProvider>
    );

    // Check that the CloudOff icon is rendered (it's an SVG)
    const svgElements = container.querySelectorAll('svg');
    expect(svgElements.length).toBeGreaterThan(0);
  });

  it('should render heatmap title with Activity Level heading', async () => {
    const { isCloudSyncAvailable } = await import('@/lib/storage-factory');
    vi.mocked(isCloudSyncAvailable).mockReturnValue(false);

    render(
      <QueryClientProvider client={queryClient}>
        <ContributionHeatmap />
      </QueryClientProvider>
    );

    // Title should be present regardless of Firebase state
    expect(screen.getByText('Activity Level')).toBeInTheDocument();
  });

  it('should provide troubleshooting steps in error message', async () => {
    const { isCloudSyncAvailable } = await import('@/lib/storage-factory');
    vi.mocked(isCloudSyncAvailable).mockReturnValue(false);

    render(
      <QueryClientProvider client={queryClient}>
        <ContributionHeatmap />
      </QueryClientProvider>
    );

    // Check for troubleshooting steps
    expect(screen.getByText(/To enable this feature:/i)).toBeInTheDocument();
    // Updated: Message varies based on auth state - when user is authenticated (as in mock)
    expect(screen.getByText(/Firebase connectivity lost/i)).toBeInTheDocument();
    expect(screen.getByText(/check your internet connection/i)).toBeInTheDocument();
  });

  it('should show sign-in message when user is not authenticated', async () => {
    const { isCloudSyncAvailable } = await import('@/lib/storage-factory');
    const { useAuth } = await import('@/lib/auth-provider');

    vi.mocked(isCloudSyncAvailable).mockReturnValue(false);
    // Mock unauthenticated state
    vi.mocked(useAuth).mockReturnValue({
      user: null,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <ContributionHeatmap />
      </QueryClientProvider>
    );

    // When not authenticated, should show sign-in message
    expect(screen.getByText(/Sign in with your Firebase account/i)).toBeInTheDocument();
  });

  it('should display "last 28 days" in the title when data is available', async () => {
    const { isCloudSyncAvailable } = await import('@/lib/storage-factory');
    vi.mocked(isCloudSyncAvailable).mockReturnValue(true);

    // Mock quiz data
    queryClient.setQueryData(
      ['quizzes', 'test-user-123'],
      [
        {
          id: '1',
          completedAt: new Date().toISOString(),
          mode: 'practice',
          isPassing: true,
          title: 'Test Quiz',
        },
      ]
    );

    render(
      <QueryClientProvider client={queryClient}>
        <ContributionHeatmap />
      </QueryClientProvider>
    );

    // Should show "last 28 days" in the title
    expect(screen.getByText(/in last 28 days/i)).toBeInTheDocument();
  });

  it('should display "past 4 weeks" in the description', async () => {
    const { isCloudSyncAvailable } = await import('@/lib/storage-factory');
    vi.mocked(isCloudSyncAvailable).mockReturnValue(true);

    // Mock quiz data
    queryClient.setQueryData(['quizzes', 'test-user-123'], []);

    render(
      <QueryClientProvider client={queryClient}>
        <ContributionHeatmap />
      </QueryClientProvider>
    );

    // Should show "past 4 weeks" in the description
    expect(screen.getByText(/over the past 4 weeks/i)).toBeInTheDocument();
  });
});
