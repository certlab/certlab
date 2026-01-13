/**
 * Notification Service
 *
 * Handles business logic for creating and managing notifications.
 * Checks user preferences before creating notifications.
 *
 * @module notification-service
 */

import { storage } from './storage-factory';
import { logInfo, logError } from './errors';
import { sanitizeInput } from './sanitize';
import type { InsertNotification, NotificationType, Notification } from '@shared/schema';

/**
 * Validate that a URL is an internal application path
 * Returns sanitized URL if valid, undefined if invalid
 */
function validateInternalUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;

  // Sanitize the input first
  const sanitized = sanitizeInput(url, 500);

  // Only allow internal paths starting with /app/ or /
  if (sanitized.startsWith('/app/') || sanitized.startsWith('/')) {
    // Check for protocol patterns specifically (http://, https://, etc.)
    if (sanitized.match(/^[a-z]+:\/\//i)) {
      logError('validateInternalUrl', new Error('External URL not allowed'), { url: sanitized });
      return undefined;
    }
    return sanitized;
  }

  logError('validateInternalUrl', new Error('Invalid internal URL'), { url: sanitized });
  return undefined;
}

/**
 * Notification Service Class
 * Provides methods for creating different types of notifications
 */
export class NotificationService {
  /**
   * Create a notification if user preferences allow it
   */
  private async createNotificationIfEnabled(
    notification: InsertNotification
  ): Promise<Notification | null> {
    try {
      // Check user preferences
      const preferences = await storage.getNotificationPreferences(notification.userId);

      if (!preferences) {
        // If no preferences, create with defaults (all enabled except email/sms)
        return await storage.createNotification(notification);
      }

      // Check if this notification type is enabled
      const typeEnabled = this.isNotificationTypeEnabled(notification.type, preferences);

      if (!typeEnabled) {
        logInfo('createNotificationIfEnabled', {
          userId: notification.userId,
          type: notification.type,
          skipped: true,
        });
        return null;
      }

      return await storage.createNotification(notification);
    } catch (error) {
      logError('createNotificationIfEnabled', error, { notification });
      return null;
    }
  }

  /**
   * Check if a notification type is enabled in user preferences
   */
  private isNotificationTypeEnabled(
    type: NotificationType,
    preferences: import('@shared/schema').NotificationPreferences
  ): boolean {
    switch (type) {
      case 'assignment':
        return preferences.assignments ?? true;
      case 'completion':
        return preferences.completions ?? true;
      case 'results':
        return preferences.results ?? true;
      case 'reminder':
        return preferences.reminders ?? true;
      case 'achievement':
        return preferences.achievements ?? true;
      default:
        return true;
    }
  }

  /**
   * Create an assignment notification
   */
  async notifyAssignment(
    userId: string,
    tenantId: number,
    options: {
      quizId?: number;
      courseId?: number;
      assignedBy?: string;
      dueDate?: Date;
    }
  ): Promise<Notification | null> {
    const notification: InsertNotification = {
      userId,
      tenantId,
      type: 'assignment',
      title: 'New Assignment',
      message: options.courseId
        ? 'You have been assigned a new course'
        : 'You have been assigned a new quiz',
      actionUrl: options.quizId ? `/app/quiz/${options.quizId}` : undefined,
      actionLabel: 'View Assignment',
      metadata: {
        quizId: options.quizId,
        courseId: options.courseId,
        assignedBy: options.assignedBy,
        dueDate: options.dueDate?.toISOString(),
      },
    };

    return this.createNotificationIfEnabled(notification);
  }

  /**
   * Create a completion notification
   */
  async notifyCompletion(
    userId: string,
    tenantId: number,
    options: {
      quizId?: number;
      courseId?: number;
      score?: number;
      passed?: boolean;
    }
  ): Promise<Notification | null> {
    const notification: InsertNotification = {
      userId,
      tenantId,
      type: 'completion',
      title: 'Quiz Completed!',
      message: options.passed
        ? `Great job! You passed with a score of ${options.score}%`
        : `Quiz completed. Score: ${options.score}%`,
      actionUrl: options.quizId ? `/app/quiz/${options.quizId}/results` : undefined,
      actionLabel: 'View Results',
      metadata: {
        quizId: options.quizId,
        courseId: options.courseId,
        score: options.score,
        passed: options.passed,
      },
    };

    return this.createNotificationIfEnabled(notification);
  }

  /**
   * Create a results notification
   */
  async notifyResults(
    userId: string,
    tenantId: number,
    options: {
      quizId: number;
      score: number;
      passed: boolean;
      totalQuestions?: number;
      correctAnswers?: number;
    }
  ): Promise<Notification | null> {
    const notification: InsertNotification = {
      userId,
      tenantId,
      type: 'results',
      title: options.passed ? 'Quiz Passed! 🎉' : 'Quiz Results Available',
      message: options.passed
        ? `Congratulations! You scored ${options.score}% (${options.correctAnswers}/${options.totalQuestions})`
        : `Your score: ${options.score}% (${options.correctAnswers}/${options.totalQuestions}). Keep practicing!`,
      actionUrl: `/app/quiz/${options.quizId}/results`,
      actionLabel: 'View Details',
      metadata: {
        quizId: options.quizId,
        score: options.score,
        passed: options.passed,
        totalQuestions: options.totalQuestions,
        correctAnswers: options.correctAnswers,
      },
    };

    return this.createNotificationIfEnabled(notification);
  }

  /**
   * Create a reminder notification
   */
  async notifyReminder(
    userId: string,
    tenantId: number,
    options: {
      reminderType: 'deadline' | 'streak' | 'daily_reward';
      message: string;
      actionUrl?: string;
      actionLabel?: string;
      metadata?: Record<string, any>;
      expiresAt?: Date;
    }
  ): Promise<Notification | null> {
    let title = 'Reminder';

    switch (options.reminderType) {
      case 'deadline':
        title = '⏰ Upcoming Deadline';
        break;
      case 'streak':
        title = '🔥 Streak Alert';
        break;
      case 'daily_reward':
        title = '🎁 Daily Reward Available';
        break;
    }

    // Validate and sanitize inputs
    const sanitizedMessage = sanitizeInput(options.message, 1000);
    const validatedActionUrl = validateInternalUrl(options.actionUrl);
    const sanitizedActionLabel = options.actionLabel
      ? sanitizeInput(options.actionLabel, 50)
      : 'Take Action';

    const notification: InsertNotification = {
      userId,
      tenantId,
      type: 'reminder',
      title,
      message: sanitizedMessage,
      actionUrl: validatedActionUrl,
      actionLabel: sanitizedActionLabel,
      metadata: {
        reminderType: options.reminderType,
        ...options.metadata,
      },
      expiresAt: options.expiresAt,
    };

    return this.createNotificationIfEnabled(notification);
  }

  /**
   * Create an achievement notification
   */
  async notifyAchievement(
    userId: string,
    tenantId: number,
    options: {
      badgeId: number;
      badgeName: string;
      badgeDescription: string;
      points?: number;
    }
  ): Promise<Notification | null> {
    const notification: InsertNotification = {
      userId,
      tenantId,
      type: 'achievement',
      title: '🏆 Achievement Unlocked!',
      message: `${options.badgeName}: ${options.badgeDescription}`,
      actionUrl: '/app/achievements',
      actionLabel: 'View Achievements',
      metadata: {
        badgeId: options.badgeId,
        badgeName: options.badgeName,
        points: options.points,
      },
    };

    return this.createNotificationIfEnabled(notification);
  }

  /**
   * Clean up expired notifications for a user
   */
  async cleanupExpiredNotifications(userId: string): Promise<void> {
    try {
      await storage.deleteExpiredNotifications(userId);
    } catch (error) {
      logError('cleanupExpiredNotifications', error, { userId });
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
