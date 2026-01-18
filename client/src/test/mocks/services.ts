/**
 * Service mocking utilities for tests
 * Provides mocks for gamification, analytics, storage, and other services
 */
import { vi } from 'vitest';

/**
 * Mock gamification/achievement service
 */
export const mockAchievementService = () => ({
  checkForNewBadges: vi.fn().mockResolvedValue([]),
  awardBadge: vi.fn().mockResolvedValue(undefined),
  calculatePoints: vi.fn().mockReturnValue(0),
  updateUserStats: vi.fn().mockResolvedValue(undefined),
  checkStreak: vi.fn().mockResolvedValue({ currentStreak: 0, isActive: false }),
});

/**
 * Mock analytics service
 */
export const mockAnalyticsService = () => ({
  trackEvent: vi.fn(),
  trackPageView: vi.fn(),
  trackUserAction: vi.fn(),
  trackQuizCompletion: vi.fn(),
  trackError: vi.fn(),
});

/**
 * Mock notification service
 */
export const mockNotificationService = () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
  getUnreadCount: vi.fn().mockResolvedValue(0),
  markAsRead: vi.fn().mockResolvedValue(undefined),
  getNotifications: vi.fn().mockResolvedValue([]),
  dismissNotification: vi.fn().mockResolvedValue(undefined),
});

/**
 * Mock toast service (from use-toast hook)
 */
export const mockToast = () => ({
  toast: vi.fn(),
  dismiss: vi.fn(),
  toasts: [],
});

/**
 * Mock quiz grading service
 */
export const mockQuizGradingService = () => ({
  gradeQuiz: vi.fn().mockReturnValue({
    score: 100,
    correctAnswers: 10,
    totalQuestions: 10,
    isPassing: true,
  }),
  gradeAnswer: vi.fn().mockReturnValue({ isCorrect: true }),
  calculatePercentage: vi.fn().mockReturnValue(100),
});

/**
 * Mock learning materials API
 */
export const mockLearningMaterialsApi = () => ({
  getMaterials: vi.fn().mockResolvedValue([]),
  getMaterialById: vi.fn().mockResolvedValue(null),
  createMaterial: vi.fn().mockResolvedValue(null),
  updateMaterial: vi.fn().mockResolvedValue(null),
  deleteMaterial: vi.fn().mockResolvedValue(undefined),
});

/**
 * Mock collaborative editing service
 */
export const mockCollaborativeEditingService = () => ({
  startSession: vi.fn().mockResolvedValue({ sessionId: 'test-session' }),
  endSession: vi.fn().mockResolvedValue(undefined),
  broadcastPresence: vi.fn().mockResolvedValue(undefined),
  getActiveEditors: vi.fn().mockResolvedValue([]),
  acquireLock: vi.fn().mockResolvedValue(true),
  releaseLock: vi.fn().mockResolvedValue(undefined),
});

/**
 * Mock quiz version history service
 */
export const mockQuizVersionHistoryService = () => ({
  createVersion: vi.fn().mockResolvedValue({ versionNumber: 1 }),
  getVersions: vi.fn().mockResolvedValue([]),
  getVersion: vi.fn().mockResolvedValue(null),
  restoreVersion: vi.fn().mockResolvedValue(undefined),
});

/**
 * Mock permissions service
 */
export const mockPermissionsService = () => ({
  canAccessResource: vi.fn().mockResolvedValue({ allowed: true }),
  canEditResource: vi.fn().mockResolvedValue(true),
  canDeleteResource: vi.fn().mockResolvedValue(true),
  checkPrerequisites: vi.fn().mockResolvedValue({ met: true }),
  isResourceOwner: vi.fn().mockReturnValue(true),
});

/**
 * Sets up all common service mocks
 *
 * @deprecated This function contains vi.mock() calls which are hoisted by Vitest
 * and cannot be called at runtime. Define mocks inline at the top level of your
 * test file instead. See the mock utility functions above for reference implementations.
 */
export const setupServiceMocks = () => {
  throw new Error(
    'setupServiceMocks should not be used. ' +
      'Vitest hoists vi.mock() calls, so they cannot be called inside a function. ' +
      'Define mocks inline at the top level of your test file instead.'
  );
};
