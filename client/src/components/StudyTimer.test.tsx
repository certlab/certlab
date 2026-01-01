import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StudyTimer } from './StudyTimer';
import * as authProvider from '@/lib/auth-provider';
import * as storageFactory from '@/lib/storage-factory';

// Mock the auth provider
vi.mock('@/lib/auth-provider', () => ({
  useAuth: vi.fn(),
}));

// Mock the storage factory
vi.mock('@/lib/storage-factory', () => ({
  storage: {
    getStudyTimerSettings: vi.fn(),
    getStudyTimerSessionsByDateRange: vi.fn(),
    createStudyTimerSession: vi.fn(),
    updateStudyTimerSession: vi.fn(),
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('StudyTimer - Activity Label Limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(authProvider.useAuth).mockReturnValue({
      user: { id: 'test-user', email: 'test@example.com', username: 'testuser' },
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
      register: vi.fn(),
      updateUserProfile: vi.fn(),
    } as any);

    vi.mocked(storageFactory.storage.getStudyTimerSettings).mockResolvedValue({
      id: 1,
      userId: 'test-user',
      tenantId: 1,
      workDuration: 25,
      breakDuration: 5,
      longBreakDuration: 15,
      sessionsUntilLongBreak: 4,
      autoStartBreaks: false,
      autoStartWork: false,
      enableNotifications: true,
      enableSound: true,
      dailyGoalMinutes: 120,
      updatedAt: new Date(),
    });

    vi.mocked(storageFactory.storage.getStudyTimerSessionsByDateRange).mockResolvedValue([]);
  });

  it('should start with 4 default activities', async () => {
    render(<StudyTimer />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Study')).toBeInTheDocument();
      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByText('Exercise')).toBeInTheDocument();
      expect(screen.getByText('Meditation')).toBeInTheDocument();
    });
  });

  it('should allow adding a 5th activity', async () => {
    const user = userEvent.setup();
    render(<StudyTimer />, { wrapper: createWrapper() });

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Activity Timer')).toBeInTheDocument();
    });

    // Click the Add button
    const addButton = screen.getByRole('button', { name: /add/i });
    await user.click(addButton);

    // Wait for dialog to open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Fill in the activity name
    const input = screen.getByPlaceholderText(/activity name/i);
    await user.type(input, 'Test');

    // Click the Add Activity button in the dialog
    const dialogAddButton = screen.getByRole('button', { name: /add activity/i });
    await user.click(dialogAddButton);

    // Verify the new activity appears as a button
    await waitFor(() => {
      const activityButton = screen.getByRole('button', { name: 'Test', pressed: true });
      expect(activityButton).toBeInTheDocument();
    });
  });

  it('should disable the Add button when 5 activities exist', async () => {
    const user = userEvent.setup();
    render(<StudyTimer />, { wrapper: createWrapper() });

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Activity Timer')).toBeInTheDocument();
    });

    // Add a 5th activity
    const addButton = screen.getByRole('button', { name: /add/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/activity name/i);
    await user.type(input, 'Fifth Activity');

    const dialogAddButton = screen.getByRole('button', { name: /add activity/i });
    await user.click(dialogAddButton);

    // Wait for the activity to be added and dialog to close
    await waitFor(() => {
      const activityButton = screen.getByRole('button', { name: 'Fifth Activity', pressed: true });
      expect(activityButton).toBeInTheDocument();
    });

    // Now the Add button should be disabled
    await waitFor(() => {
      const addButtonAfter = screen.getByRole('button', { name: /add/i });
      expect(addButtonAfter).toBeDisabled();
    });
  });

  it('should show title text explaining the limit when Add button is disabled', async () => {
    const user = userEvent.setup();
    render(<StudyTimer />, { wrapper: createWrapper() });

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Activity Timer')).toBeInTheDocument();
    });

    // Add a 5th activity
    const addButton = screen.getByRole('button', { name: /add/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/activity name/i);
    await user.type(input, 'Fifth');

    const dialogAddButton = screen.getByRole('button', { name: /add activity/i });
    await user.click(dialogAddButton);

    // Wait for the activity to be added
    await waitFor(() => {
      const activityButton = screen.getByRole('button', { name: 'Fifth', pressed: true });
      expect(activityButton).toBeInTheDocument();
    });

    // Check the title attribute of the disabled Add button
    await waitFor(() => {
      const addButtonAfter = screen.getByRole('button', { name: /add/i });
      expect(addButtonAfter).toHaveAttribute('title', 'Maximum of 5 activities allowed');
    });
  });
});
