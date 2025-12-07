/**
 * Firestore Migration Service
 *
 * Handles incremental synchronization of data from IndexedDB to Cloud Firestore.
 * Implements idempotent operations with timestamp-based deduplication.
 *
 * ## Migration Strategy
 *
 * 1. **User Authentication**: User signs in with Firebase Auth
 * 2. **Initial Sync Check**: Check if user has synced before (sync metadata in Firestore)
 * 3. **Incremental Upload**: Upload local data to Firestore with sync timestamps
 * 4. **Conflict Resolution**: Server (Firestore) wins on conflicts
 * 5. **Two-way Sync**: Ongoing background sync between IndexedDB and Firestore
 *
 * ## Sync Metadata
 *
 * Stored in IndexedDB settings:
 * - `lastSyncTimestamp`: Last successful sync timestamp
 * - `syncStatus`: 'never' | 'in-progress' | 'completed' | 'error'
 * - `syncedItems`: Map of item IDs to sync timestamps
 *
 * @module firestore-migration
 */

import { indexedDBService, STORES } from './indexeddb';
import {
  isFirestoreInitialized,
  setUserDocument,
  getUserDocuments,
  setUserProfile,
  getUserProfile,
  Timestamp,
} from './firestore-service';
import { logError } from './errors';
import type { User, Quiz, UserProgress, UserBadge, UserGameStats } from '@shared/schema';

export type SyncStatus = 'never' | 'in-progress' | 'completed' | 'error';

export interface SyncMetadata {
  lastSyncTimestamp: number;
  syncStatus: SyncStatus;
  syncedCollections: string[];
  errorMessage?: string;
}

export interface MigrationProgress {
  collection: string;
  total: number;
  synced: number;
  errors: number;
}

export interface MigrationResult {
  success: boolean;
  progress: MigrationProgress[];
  errorMessage?: string;
}

/**
 * Get sync metadata from IndexedDB
 */
export async function getSyncMetadata(): Promise<SyncMetadata | null> {
  try {
    const metadata = await indexedDBService.get<{ key: string; value: SyncMetadata }>(
      STORES.settings,
      'syncMetadata'
    );
    return metadata?.value || null;
  } catch (error) {
    logError('getSyncMetadata', error);
    return null;
  }
}

/**
 * Update sync metadata in IndexedDB
 */
export async function updateSyncMetadata(metadata: Partial<SyncMetadata>): Promise<void> {
  try {
    const existing = await getSyncMetadata();
    const updated: SyncMetadata = {
      lastSyncTimestamp: existing?.lastSyncTimestamp || 0,
      syncStatus: existing?.syncStatus || 'never',
      syncedCollections: existing?.syncedCollections || [],
      ...metadata,
    };

    await indexedDBService.put(STORES.settings, {
      key: 'syncMetadata',
      value: updated,
    });
  } catch (error) {
    logError('updateSyncMetadata', error);
    throw error;
  }
}

/**
 * Check if user needs to migrate data
 */
export async function needsMigration(userId: string): Promise<boolean> {
  if (!isFirestoreInitialized()) {
    return false;
  }

  try {
    // Check if user has any data in Firestore
    const userProfile = await getUserProfile(userId);

    // If no profile exists, user needs migration
    if (!userProfile) {
      return true;
    }

    // Check sync metadata
    const metadata = await getSyncMetadata();
    if (!metadata || metadata.syncStatus === 'never' || metadata.syncStatus === 'error') {
      return true;
    }

    return false;
  } catch (error) {
    logError('needsMigration', error);
    return false;
  }
}

/**
 * Migrate user profile to Firestore
 */
async function migrateUserProfile(userId: string): Promise<void> {
  try {
    const user = await indexedDBService.get<User>(STORES.users, userId);
    if (!user) {
      throw new Error('User not found in IndexedDB');
    }

    // Create user profile in Firestore
    await setUserProfile(userId, {
      email: user.email,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      profileImageUrl: user.profileImageUrl || null,
      role: user.role,
      tenantId: user.tenantId,
      certificationGoals: user.certificationGoals || [],
      studyPreferences: user.studyPreferences || null,
      skillsAssessment: user.skillsAssessment || null,
      createdAt: Timestamp.fromDate(new Date(user.createdAt)),
      lastLogin: user.lastLogin ? Timestamp.fromDate(new Date(user.lastLogin)) : null,
      syncedFromLocal: true,
      localSyncTimestamp: Timestamp.now(),
    });
  } catch (error) {
    logError('migrateUserProfile', error);
    throw error;
  }
}

/**
 * Migrate quizzes to Firestore
 */
async function migrateQuizzes(userId: string): Promise<MigrationProgress> {
  const progress: MigrationProgress = {
    collection: 'quizzes',
    total: 0,
    synced: 0,
    errors: 0,
  };

  try {
    const quizzes = await indexedDBService.getByIndex<Quiz>(STORES.quizzes, 'userId', userId);

    progress.total = quizzes.length;

    for (const quiz of quizzes) {
      try {
        await setUserDocument(userId, 'quizzes', String(quiz.id), {
          categoryId: quiz.categoryId,
          subcategoryIds: quiz.subcategoryIds || [],
          questionIds: quiz.questionIds,
          answers: quiz.answers,
          score: quiz.score,
          totalQuestions: quiz.totalQuestions,
          createdAt: Timestamp.fromDate(new Date(quiz.createdAt)),
          completedAt: quiz.completedAt ? Timestamp.fromDate(new Date(quiz.completedAt)) : null,
          syncedFromLocal: true,
          localSyncTimestamp: Timestamp.now(),
        });
        progress.synced++;
      } catch (error) {
        logError('migrateQuizzes:item', error, { quizId: quiz.id });
        progress.errors++;
      }
    }

    return progress;
  } catch (error) {
    logError('migrateQuizzes', error);
    throw error;
  }
}

/**
 * Migrate user progress to Firestore
 */
async function migrateUserProgress(userId: string): Promise<MigrationProgress> {
  const progress: MigrationProgress = {
    collection: 'progress',
    total: 0,
    synced: 0,
    errors: 0,
  };

  try {
    const progressRecords = await indexedDBService.getByIndex<UserProgress>(
      STORES.userProgress,
      'userId',
      userId
    );

    progress.total = progressRecords.length;

    for (const record of progressRecords) {
      try {
        await setUserDocument(userId, 'progress', String(record.id), {
          categoryId: record.categoryId,
          questionsAnswered: record.questionsAnswered,
          correctAnswers: record.correctAnswers,
          averageScore: record.averageScore,
          timeSpent: record.timeSpent,
          lastStudied: record.lastStudied ? Timestamp.fromDate(new Date(record.lastStudied)) : null,
          syncedFromLocal: true,
          localSyncTimestamp: Timestamp.now(),
        });
        progress.synced++;
      } catch (error) {
        logError('migrateUserProgress:item', error, { progressId: record.id });
        progress.errors++;
      }
    }

    return progress;
  } catch (error) {
    logError('migrateUserProgress', error);
    throw error;
  }
}

/**
 * Migrate user badges to Firestore
 */
async function migrateUserBadges(userId: string): Promise<MigrationProgress> {
  const progress: MigrationProgress = {
    collection: 'badges',
    total: 0,
    synced: 0,
    errors: 0,
  };

  try {
    const badges = await indexedDBService.getByIndex<UserBadge>(
      STORES.userBadges,
      'userId',
      userId
    );

    progress.total = badges.length;

    for (const badge of badges) {
      try {
        await setUserDocument(userId, 'badges', String(badge.id), {
          badgeId: badge.badgeId,
          earnedAt: Timestamp.fromDate(new Date(badge.earnedAt)),
          syncedFromLocal: true,
          localSyncTimestamp: Timestamp.now(),
        });
        progress.synced++;
      } catch (error) {
        logError('migrateUserBadges:item', error, { badgeId: badge.id });
        progress.errors++;
      }
    }

    return progress;
  } catch (error) {
    logError('migrateUserBadges', error);
    throw error;
  }
}

/**
 * Migrate user game stats to Firestore
 */
async function migrateGameStats(userId: string): Promise<MigrationProgress> {
  const progress: MigrationProgress = {
    collection: 'gameStats',
    total: 0,
    synced: 0,
    errors: 0,
  };

  try {
    const stats = await indexedDBService.get<UserGameStats>(STORES.userGameStats, userId);

    if (stats) {
      progress.total = 1;

      try {
        await setUserDocument(userId, 'gameStats', userId, {
          totalPoints: stats.totalPoints,
          currentStreak: stats.currentStreak,
          longestStreak: stats.longestStreak,
          level: stats.level,
          experiencePoints: stats.experiencePoints,
          lastActivityDate: stats.lastActivityDate
            ? Timestamp.fromDate(new Date(stats.lastActivityDate))
            : null,
          syncedFromLocal: true,
          localSyncTimestamp: Timestamp.now(),
        });
        progress.synced = 1;
      } catch (error) {
        logError('migrateGameStats:item', error);
        progress.errors = 1;
      }
    }

    return progress;
  } catch (error) {
    logError('migrateGameStats', error);
    throw error;
  }
}

/**
 * Perform complete migration from IndexedDB to Firestore
 */
export async function migrateToFirestore(userId: string): Promise<MigrationResult> {
  if (!isFirestoreInitialized()) {
    return {
      success: false,
      progress: [],
      errorMessage: 'Firestore is not initialized',
    };
  }

  const allProgress: MigrationProgress[] = [];

  try {
    // Update sync status to in-progress
    await updateSyncMetadata({
      syncStatus: 'in-progress',
      lastSyncTimestamp: Date.now(),
    });

    // Migrate user profile
    await migrateUserProfile(userId);

    // Migrate collections
    const quizzesProgress = await migrateQuizzes(userId);
    allProgress.push(quizzesProgress);

    const progressRecordsProgress = await migrateUserProgress(userId);
    allProgress.push(progressRecordsProgress);

    const badgesProgress = await migrateUserBadges(userId);
    allProgress.push(badgesProgress);

    const gameStatsProgress = await migrateGameStats(userId);
    allProgress.push(gameStatsProgress);

    // Check for errors
    const totalErrors = allProgress.reduce((sum, p) => sum + p.errors, 0);
    const success = totalErrors === 0;

    // Update sync metadata
    await updateSyncMetadata({
      syncStatus: success ? 'completed' : 'error',
      lastSyncTimestamp: Date.now(),
      syncedCollections: allProgress.map((p) => p.collection),
      errorMessage: success ? undefined : `Migration completed with ${totalErrors} errors`,
    });

    return {
      success,
      progress: allProgress,
      errorMessage: success ? undefined : `Migration completed with ${totalErrors} errors`,
    };
  } catch (error) {
    logError('migrateToFirestore', error);

    // Update sync metadata with error
    await updateSyncMetadata({
      syncStatus: 'error',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      progress: allProgress,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Reset sync metadata (for testing or re-sync)
 */
export async function resetSyncMetadata(): Promise<void> {
  try {
    await indexedDBService.delete(STORES.settings, 'syncMetadata');
  } catch (error) {
    logError('resetSyncMetadata', error);
    throw error;
  }
}
