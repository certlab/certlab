/**
 * Analytics Reporting Service
 *
 * Provides comprehensive analytics and reporting for admins/authors to track:
 * - Learner progress by quiz/material, user, and cohort
 * - Engagement metrics: time on task, completion rates, attempts, feedback
 * - Data export capabilities: CSV, Excel
 * - Filtering and segmentation: group, material type, date range
 */

import type {
  Quiz,
  User,
  MasteryScore,
  UserProgress,
  StudyGroup,
  Challenge,
  ChallengeAttempt,
} from '@shared/schema';

// ============================================================================
// Filter Types
// ============================================================================

export interface ReportFilters {
  dateFrom?: Date;
  dateTo?: Date;
  groupIds?: number[];
  materialType?: 'quiz' | 'challenge' | 'lecture' | 'all';
  userIds?: string[];
  categoryIds?: number[];
}

// ============================================================================
// Report Data Types
// ============================================================================

export interface LearnerProgressReport {
  userId: string;
  userName: string;
  email: string;
  totalQuizzes: number;
  completedQuizzes: number;
  averageScore: number;
  completionRate: number;
  timeSpent: number; // in minutes
  lastActive: Date | null;
  strengths: string[]; // categories with high scores
  weaknesses: string[]; // categories with low scores
}

export interface QuizPerformanceReport {
  quizId: number;
  quizTitle: string;
  totalAttempts: number;
  uniqueUsers: number;
  averageScore: number;
  completionRate: number;
  averageTimeSpent: number; // in minutes
  scoreDistribution: {
    range: string; // e.g., "0-20", "21-40"
    count: number;
  }[];
  mostMissedQuestions: {
    questionId: number;
    text: string;
    missRate: number;
  }[];
}

export interface EngagementMetrics {
  totalUsers: number;
  activeUsers: number;
  totalQuizzes: number;
  completedQuizzes: number;
  averageSessionTime: number; // in minutes
  dailyActiveUsers: { date: string; count: number }[];
  engagementOverTime: { date: string; quizzes: number; users: number }[];
  completionRateByCategory: { categoryId: number; categoryName: string; rate: number }[];
}

export interface CohortAnalysis {
  groupId: number;
  groupName: string;
  memberCount: number;
  averageScore: number;
  completionRate: number;
  activeMembers: number;
  totalQuizzes: number;
  strengths: string[];
  weaknesses: string[];
}

export interface FeedbackAnalysis {
  totalFeedback: number;
  averageRating: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  commonThemes: { theme: string; count: number }[];
  feedbackByCategory: { categoryId: number; categoryName: string; rating: number }[];
}

// ============================================================================
// Analytics Reporting Service
// ============================================================================

export class AnalyticsReportingService {
  /**
   * Generate learner progress report
   */
  generateLearnerProgressReport(
    users: User[],
    quizzes: Quiz[],
    masteryScores: MasteryScore[],
    filters?: ReportFilters
  ): LearnerProgressReport[] {
    const filteredQuizzes = this.filterQuizzes(quizzes, filters);

    return users.map((user) => {
      const userQuizzes = filteredQuizzes.filter((q) => q.userId === user.id);
      const completedQuizzes = userQuizzes.filter((q) => q.completedAt);
      const userMastery = masteryScores.filter((m) => m.userId === user.id);

      // Calculate time spent (estimate based on quiz duration)
      const timeSpent = completedQuizzes.reduce((total, quiz) => {
        if (quiz.completedAt && quiz.startedAt) {
          const duration =
            new Date(quiz.completedAt).getTime() - new Date(quiz.startedAt).getTime();
          return total + duration / (1000 * 60); // Convert to minutes
        }
        return total;
      }, 0);

      // Calculate average score
      const scores = completedQuizzes.map((q) => q.score || 0);
      const averageScore =
        scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      // Find strengths and weaknesses
      const categoryScores = new Map<number, { total: number; count: number }>();
      userMastery.forEach((m) => {
        const existing = categoryScores.get(m.categoryId) || { total: 0, count: 0 };
        categoryScores.set(m.categoryId, {
          total: existing.total + m.rollingAverage,
          count: existing.count + 1,
        });
      });

      const sortedCategories = Array.from(categoryScores.entries())
        .map(([id, data]) => ({ id, avg: data.total / data.count }))
        .sort((a, b) => b.avg - a.avg);

      const strengths = sortedCategories.slice(0, 3).map((c) => `Category ${c.id}`);
      const weaknesses = sortedCategories
        .slice(-3)
        .reverse()
        .map((c) => `Category ${c.id}`);

      // Get last active date
      const lastActive =
        completedQuizzes.length > 0
          ? new Date(
              Math.max(...completedQuizzes.map((q) => new Date(q.completedAt || 0).getTime()))
            )
          : null;

      return {
        userId: user.id,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        email: user.email,
        totalQuizzes: userQuizzes.length,
        completedQuizzes: completedQuizzes.length,
        averageScore,
        completionRate:
          userQuizzes.length > 0
            ? Math.round((completedQuizzes.length / userQuizzes.length) * 100)
            : 0,
        timeSpent: Math.round(timeSpent),
        lastActive,
        strengths,
        weaknesses,
      };
    });
  }

  /**
   * Generate quiz performance report
   */
  generateQuizPerformanceReport(quizzes: Quiz[], filters?: ReportFilters): QuizPerformanceReport[] {
    const filteredQuizzes = this.filterQuizzes(quizzes, filters);

    // Group quizzes by title (same quiz taken multiple times)
    const quizGroups = new Map<string, Quiz[]>();
    filteredQuizzes.forEach((quiz) => {
      const group = quizGroups.get(quiz.title) || [];
      group.push(quiz);
      quizGroups.set(quiz.title, group);
    });

    return Array.from(quizGroups.entries()).map(([title, attempts]) => {
      const completed = attempts.filter((q) => q.completedAt);
      const scores = completed.map((q) => q.score || 0);
      const uniqueUsers = new Set(attempts.map((q) => q.userId)).size;

      // Calculate average score
      const averageScore =
        scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      // Calculate average time spent
      const timesSpent = completed.map((quiz) => {
        if (quiz.completedAt && quiz.startedAt) {
          return (
            (new Date(quiz.completedAt).getTime() - new Date(quiz.startedAt).getTime()) /
            (1000 * 60)
          );
        }
        return 0;
      });
      const averageTimeSpent =
        timesSpent.length > 0
          ? Math.round(timesSpent.reduce((a, b) => a + b, 0) / timesSpent.length)
          : 0;

      // Calculate score distribution
      const scoreDistribution = [
        { range: '0-20', count: scores.filter((s) => s <= 20).length },
        { range: '21-40', count: scores.filter((s) => s > 20 && s <= 40).length },
        { range: '41-60', count: scores.filter((s) => s > 40 && s <= 60).length },
        { range: '61-80', count: scores.filter((s) => s > 60 && s <= 80).length },
        { range: '81-100', count: scores.filter((s) => s > 80).length },
      ];

      // Most missed questions (placeholder - would need answer data)
      const mostMissedQuestions: { questionId: number; text: string; missRate: number }[] = [];

      return {
        quizId: attempts[0]?.id || 0,
        quizTitle: title,
        totalAttempts: attempts.length,
        uniqueUsers,
        averageScore,
        completionRate:
          attempts.length > 0 ? Math.round((completed.length / attempts.length) * 100) : 0,
        averageTimeSpent,
        scoreDistribution,
        mostMissedQuestions,
      };
    });
  }

  /**
   * Generate engagement metrics
   */
  generateEngagementMetrics(
    users: User[],
    quizzes: Quiz[],
    filters?: ReportFilters
  ): EngagementMetrics {
    const filteredQuizzes = this.filterQuizzes(quizzes, filters);
    const completedQuizzes = filteredQuizzes.filter((q) => q.completedAt);

    // Calculate active users (completed at least one quiz)
    const activeUserIds = new Set(completedQuizzes.map((q) => q.userId));
    const activeUsers = activeUserIds.size;

    // Calculate average session time
    const sessionTimes = completedQuizzes.map((quiz) => {
      if (quiz.completedAt && quiz.startedAt) {
        return (
          (new Date(quiz.completedAt).getTime() - new Date(quiz.startedAt).getTime()) / (1000 * 60)
        );
      }
      return 0;
    });
    const averageSessionTime =
      sessionTimes.length > 0
        ? Math.round(sessionTimes.reduce((a, b) => a + b, 0) / sessionTimes.length)
        : 0;

    // Daily active users
    const dailyUsers = new Map<string, Set<string>>();
    completedQuizzes.forEach((quiz) => {
      if (quiz.completedAt) {
        const date = new Date(quiz.completedAt).toISOString().split('T')[0];
        const users = dailyUsers.get(date) || new Set();
        users.add(quiz.userId);
        dailyUsers.set(date, users);
      }
    });

    const dailyActiveUsers = Array.from(dailyUsers.entries())
      .map(([date, users]) => ({ date, count: users.size }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Engagement over time
    const dailyQuizzes = new Map<string, number>();
    completedQuizzes.forEach((quiz) => {
      if (quiz.completedAt) {
        const date = new Date(quiz.completedAt).toISOString().split('T')[0];
        dailyQuizzes.set(date, (dailyQuizzes.get(date) || 0) + 1);
      }
    });

    const engagementOverTime = Array.from(dailyQuizzes.entries())
      .map(([date, quizzes]) => ({
        date,
        quizzes,
        users: dailyUsers.get(date)?.size || 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Completion rate by category
    const categoryCompletion = new Map<number, { total: number; completed: number }>();
    filteredQuizzes.forEach((quiz) => {
      (quiz.categoryIds as number[]).forEach((catId: number) => {
        const data = categoryCompletion.get(catId) || { total: 0, completed: 0 };
        data.total++;
        if (quiz.completedAt) data.completed++;
        categoryCompletion.set(catId, data);
      });
    });

    const completionRateByCategory = Array.from(categoryCompletion.entries()).map(
      ([categoryId, data]) => ({
        categoryId,
        categoryName: `Category ${categoryId}`,
        rate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      })
    );

    return {
      totalUsers: users.length,
      activeUsers,
      totalQuizzes: filteredQuizzes.length,
      completedQuizzes: completedQuizzes.length,
      averageSessionTime,
      dailyActiveUsers,
      engagementOverTime,
      completionRateByCategory,
    };
  }

  /**
   * Generate cohort analysis
   */
  generateCohortAnalysis(
    groups: StudyGroup[],
    quizzes: Quiz[],
    masteryScores: MasteryScore[]
  ): CohortAnalysis[] {
    return groups.map((group) => {
      // This is a placeholder - would need actual membership data
      const memberCount = 0;
      const groupQuizzes = quizzes.filter((q) => {
        // Would need to filter by group membership
        return false;
      });

      return {
        groupId: group.id,
        groupName: group.name,
        memberCount,
        averageScore: 0,
        completionRate: 0,
        activeMembers: 0,
        totalQuizzes: groupQuizzes.length,
        strengths: [],
        weaknesses: [],
      };
    });
  }

  /**
   * Filter quizzes based on report filters
   */
  private filterQuizzes(quizzes: Quiz[], filters?: ReportFilters): Quiz[] {
    if (!filters) return quizzes;

    return quizzes.filter((quiz) => {
      // Date range filter
      if (filters.dateFrom && quiz.startedAt) {
        if (new Date(quiz.startedAt) < filters.dateFrom) return false;
      }
      if (filters.dateTo && quiz.startedAt) {
        if (new Date(quiz.startedAt) > filters.dateTo) return false;
      }

      // Material type filter
      if (filters.materialType && filters.materialType !== 'all') {
        if (filters.materialType === 'quiz' && quiz.mode !== 'quiz') return false;
        if (filters.materialType === 'challenge' && quiz.mode !== 'challenge') return false;
      }

      // User filter
      if (filters.userIds && filters.userIds.length > 0) {
        if (!filters.userIds.includes(quiz.userId)) return false;
      }

      // Category filter
      if (filters.categoryIds && filters.categoryIds.length > 0) {
        const quizCategories = quiz.categoryIds as number[];
        if (!quizCategories.some((id) => filters.categoryIds!.includes(id))) return false;
      }

      return true;
    });
  }

  /**
   * Export data to CSV format
   */
  exportToCSV(data: any[], filename: string): void {
    if (data.length === 0) return;

    // Get headers from first object
    const headers = Object.keys(data[0]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            // Handle arrays, objects, and special characters
            if (Array.isArray(value)) return `"${value.join('; ')}"`;
            if (typeof value === 'object' && value !== null) return `"${JSON.stringify(value)}"`;
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? '';
          })
          .join(',')
      ),
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Generate print-friendly HTML for reports
   */
  generatePrintView(title: string, data: any[]): string {
    const headers = data.length > 0 ? Object.keys(data[0]) : [];

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #0066cc; color: white; padding: 10px; text-align: left; }
            td { border: 1px solid #ddd; padding: 8px; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            .print-date { color: #666; font-size: 12px; margin-top: 10px; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="print-date">Generated: ${new Date().toLocaleString()}</div>
          <table>
            <thead>
              <tr>
                ${headers.map((h) => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (row) => `
                <tr>
                  ${headers
                    .map((h) => {
                      const value = row[h];
                      if (Array.isArray(value)) return `<td>${value.join(', ')}</td>`;
                      if (typeof value === 'object' && value !== null)
                        return `<td>${JSON.stringify(value)}</td>`;
                      return `<td>${value ?? ''}</td>`;
                    })
                    .join('')}
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
          <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #0066cc; color: white; border: none; cursor: pointer;">Print Report</button>
        </body>
      </html>
    `;
  }

  /**
   * Open print view in new window
   */
  openPrintView(title: string, data: any[]): void {
    const html = this.generatePrintView(title, data);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  }
}

// Export singleton instance
export const analyticsReportingService = new AnalyticsReportingService();
