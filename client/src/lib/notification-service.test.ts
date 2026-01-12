import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationService } from './notification-service';
import type { NotificationPreferences } from '@shared/schema';

// Mock the storage module
vi.mock('./storage-factory', () => ({
  storage: {
    createNotification: vi.fn(),
    getNotificationPreferences: vi.fn(),
  },
}));

// Mock the errors module
vi.mock('./errors', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
}));

// Mock the sanitize module
vi.mock('./sanitize', () => ({
  sanitizeInput: vi.fn((input: string) => input),
}));

import { storage } from './storage-factory';

describe('NotificationService', () => {
  const mockUserId = 'user123';
  const mockTenantId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Preference-aware notification creation', () => {
    it('should create notification when preferences allow it', async () => {
      const mockPreferences: NotificationPreferences = {
        userId: mockUserId,
        assignments: true,
        completions: true,
        results: true,
        reminders: true,
        achievements: true,
        emailEnabled: false,
        smsEnabled: false,
        updatedAt: new Date(),
      };

      const mockNotification = {
        id: '1',
        userId: mockUserId,
        tenantId: mockTenantId,
        type: 'results' as const,
        title: 'Quiz Passed! 🎉',
        message: 'Congratulations! You scored 92% (46/50)',
        isRead: false,
        isDismissed: false,
        createdAt: new Date(),
      };

      vi.mocked(storage.getNotificationPreferences).mockResolvedValue(mockPreferences);
      vi.mocked(storage.createNotification).mockResolvedValue(mockNotification);

      const result = await notificationService.notifyResults(mockUserId, mockTenantId, {
        quizId: 1,
        score: 92,
        passed: true,
        totalQuestions: 50,
        correctAnswers: 46,
      });

      expect(result).toBeDefined();
      expect(storage.createNotification).toHaveBeenCalled();
    });

    it('should skip notification when user has disabled that type', async () => {
      const mockPreferences: NotificationPreferences = {
        userId: mockUserId,
        assignments: true,
        completions: true,
        results: false, // Results disabled
        reminders: true,
        achievements: true,
        emailEnabled: false,
        smsEnabled: false,
        updatedAt: new Date(),
      };

      vi.mocked(storage.getNotificationPreferences).mockResolvedValue(mockPreferences);

      const result = await notificationService.notifyResults(mockUserId, mockTenantId, {
        quizId: 1,
        score: 92,
        passed: true,
        totalQuestions: 50,
        correctAnswers: 46,
      });

      expect(result).toBeNull();
      expect(storage.createNotification).not.toHaveBeenCalled();
    });

    it('should create notification with default preferences when none exist', async () => {
      const mockNotification = {
        id: '1',
        userId: mockUserId,
        tenantId: mockTenantId,
        type: 'completion' as const,
        title: 'Quiz Completed!',
        message: 'Great job! You passed with a score of 85%',
        isRead: false,
        isDismissed: false,
        createdAt: new Date(),
      };

      vi.mocked(storage.getNotificationPreferences).mockResolvedValue(null);
      vi.mocked(storage.createNotification).mockResolvedValue(mockNotification);

      const result = await notificationService.notifyCompletion(mockUserId, mockTenantId, {
        quizId: 1,
        score: 85,
        passed: true,
      });

      expect(result).toBeDefined();
      expect(storage.createNotification).toHaveBeenCalled();
    });
  });

  describe('notifyAssignment', () => {
    it('should create assignment notification with correct fields', async () => {
      const mockNotification = {
        id: '1',
        userId: mockUserId,
        tenantId: mockTenantId,
        type: 'assignment' as const,
        title: 'New Assignment',
        message: 'You have been assigned a new quiz',
        actionUrl: '/app/quiz/123',
        actionLabel: 'View Assignment',
        isRead: false,
        isDismissed: false,
        createdAt: new Date(),
      };

      vi.mocked(storage.getNotificationPreferences).mockResolvedValue(null);
      vi.mocked(storage.createNotification).mockResolvedValue(mockNotification);

      const result = await notificationService.notifyAssignment(mockUserId, mockTenantId, {
        quizId: 123,
        assignedBy: 'instructor@test.com',
      });

      expect(result).toBeDefined();
      expect(storage.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'assignment',
          actionUrl: '/app/quiz/123',
          metadata: expect.objectContaining({
            quizId: 123,
            assignedBy: 'instructor@test.com',
          }),
        })
      );
    });
  });

  describe('notifyCompletion', () => {
    it('should create completion notification for passed quiz', async () => {
      const mockNotification = {
        id: '1',
        userId: mockUserId,
        tenantId: mockTenantId,
        type: 'completion' as const,
        title: 'Quiz Completed!',
        message: 'Great job! You passed with a score of 85%',
        isRead: false,
        isDismissed: false,
        createdAt: new Date(),
      };

      vi.mocked(storage.getNotificationPreferences).mockResolvedValue(null);
      vi.mocked(storage.createNotification).mockResolvedValue(mockNotification);

      const result = await notificationService.notifyCompletion(mockUserId, mockTenantId, {
        quizId: 1,
        score: 85,
        passed: true,
      });

      expect(result).toBeDefined();
      expect(storage.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'completion',
          metadata: expect.objectContaining({
            score: 85,
            passed: true,
          }),
        })
      );
    });
  });

  describe('notifyResults', () => {
    it('should create results notification with score details', async () => {
      const mockNotification = {
        id: '1',
        userId: mockUserId,
        tenantId: mockTenantId,
        type: 'results' as const,
        title: 'Quiz Passed! 🎉',
        message: 'Congratulations! You scored 92% (46/50)',
        isRead: false,
        isDismissed: false,
        createdAt: new Date(),
      };

      vi.mocked(storage.getNotificationPreferences).mockResolvedValue(null);
      vi.mocked(storage.createNotification).mockResolvedValue(mockNotification);

      const result = await notificationService.notifyResults(mockUserId, mockTenantId, {
        quizId: 1,
        score: 92,
        passed: true,
        totalQuestions: 50,
        correctAnswers: 46,
      });

      expect(result).toBeDefined();
      expect(storage.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'results',
          actionUrl: '/app/quiz/1/results',
          metadata: expect.objectContaining({
            score: 92,
            passed: true,
            totalQuestions: 50,
            correctAnswers: 46,
          }),
        })
      );
    });
  });

  describe('notifyReminder', () => {
    it('should create reminder notification with validated URL', async () => {
      const mockNotification = {
        id: '1',
        userId: mockUserId,
        tenantId: mockTenantId,
        type: 'reminder' as const,
        title: '🔥 Streak Alert',
        message: 'Your 7-day streak is about to end!',
        isRead: false,
        isDismissed: false,
        createdAt: new Date(),
      };

      vi.mocked(storage.getNotificationPreferences).mockResolvedValue(null);
      vi.mocked(storage.createNotification).mockResolvedValue(mockNotification);

      const result = await notificationService.notifyReminder(mockUserId, mockTenantId, {
        reminderType: 'streak',
        message: 'Your 7-day streak is about to end!',
        actionUrl: '/app/dashboard',
        actionLabel: 'Take Quiz',
      });

      expect(result).toBeDefined();
      expect(storage.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'reminder',
          title: '🔥 Streak Alert',
          metadata: expect.objectContaining({
            reminderType: 'streak',
          }),
        })
      );
    });

    it('should set different titles based on reminder type', async () => {
      vi.mocked(storage.getNotificationPreferences).mockResolvedValue(null);
      vi.mocked(storage.createNotification).mockResolvedValue({
        id: '1',
        userId: mockUserId,
        tenantId: mockTenantId,
        type: 'reminder' as const,
        title: '🎁 Daily Reward Available',
        message: 'Test',
        isRead: false,
        isDismissed: false,
        createdAt: new Date(),
      });

      await notificationService.notifyReminder(mockUserId, mockTenantId, {
        reminderType: 'daily_reward',
        message: 'Test message',
      });

      expect(storage.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '🎁 Daily Reward Available',
        })
      );
    });
  });

  describe('notifyAchievement', () => {
    it('should create achievement notification', async () => {
      const mockNotification = {
        id: '1',
        userId: mockUserId,
        tenantId: mockTenantId,
        type: 'achievement' as const,
        title: '🏆 Achievement Unlocked!',
        message: 'Quiz Master: Completed 50 quizzes with 90%+ score',
        isRead: false,
        isDismissed: false,
        createdAt: new Date(),
      };

      vi.mocked(storage.getNotificationPreferences).mockResolvedValue(null);
      vi.mocked(storage.createNotification).mockResolvedValue(mockNotification);

      const result = await notificationService.notifyAchievement(mockUserId, mockTenantId, {
        badgeId: 5,
        badgeName: 'Quiz Master',
        badgeDescription: 'Completed 50 quizzes with 90%+ score',
        points: 100,
      });

      expect(result).toBeDefined();
      expect(storage.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'achievement',
          actionUrl: '/app/achievements',
          metadata: expect.objectContaining({
            badgeId: 5,
            points: 100,
          }),
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle errors gracefully and return null', async () => {
      vi.mocked(storage.getNotificationPreferences).mockRejectedValue(new Error('Database error'));

      const result = await notificationService.notifyResults(mockUserId, mockTenantId, {
        quizId: 1,
        score: 85,
        passed: true,
      });

      expect(result).toBeNull();
    });
  });
});
