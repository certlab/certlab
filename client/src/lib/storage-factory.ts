/**
 * Storage Factory
 *
 * Provides a unified storage interface using Firestore for cloud storage.
 * Firebase and Firestore are now mandatory for the application.
 *
 * ## Architecture
 *
 * - **Primary storage**: Uses Firestore via firestore-storage.ts
 * - **Offline fallback**: IndexedDB cache for offline access (read-only)
 *
 * ## Usage
 *
 * ```typescript
 * import { storage } from './storage-factory';
 *
 * // Use storage (always uses Firestore)
 * const quizzes = await storage.getUserQuizzes(userId);
 * ```
 *
 * @module storage-factory
 */

import { clientStorage } from './client-storage';
import { firestoreStorage } from './firestore-storage';
import { initializeFirestoreService, isFirestoreInitialized } from './firestore-service';
import { getCurrentFirebaseUser } from './firebase';
import { logError } from './errors';
import type { IClientStorage } from '@shared/storage-interface';
import type { StudyTimerSettings, StudyTimerSession, StudyTimerStats } from '@shared/schema';

/**
 * Storage mode type - now always 'cloud' (Firestore)
 */
export type StorageMode = 'cloud';

/**
 * Storage mode constant - always cloud (Firestore)
 */
const STORAGE_MODE: StorageMode = 'cloud';

/**
 * Whether Firestore is available
 */
let firestoreAvailable = false;

/**
 * Initialize the storage system
 * This should be called on app startup
 * Firestore is now mandatory
 */
export async function initializeStorage(): Promise<void> {
  try {
    // Initialize Firestore (mandatory)
    firestoreAvailable = await initializeFirestoreService();

    if (!firestoreAvailable) {
      throw new Error('Failed to initialize Firestore - this is required for the application');
    }

    console.log('[Storage Factory] Firestore initialized successfully');

    // Check if user is logged in with Firebase
    const firebaseUser = getCurrentFirebaseUser();
    if (firebaseUser) {
      console.log('[Storage Factory] Firebase user detected, cloud storage enabled');
      await firestoreStorage.setCurrentUserId(firebaseUser.uid);
    }
  } catch (error) {
    logError('initializeStorage', error);
    throw error; // Re-throw since Firestore is now mandatory
  }
}

/**
 * Get the current storage mode (always 'cloud')
 */
export function getStorageMode(): StorageMode {
  return STORAGE_MODE;
}

/**
 * Check if cloud sync is available (always true when Firestore is initialized)
 */
export function isCloudSyncAvailable(): boolean {
  return firestoreAvailable && isFirestoreInitialized();
}

/**
 * Check if currently using cloud sync (always true)
 */
export function isUsingCloudSync(): boolean {
  return firestoreAvailable;
}

/**
 * Storage adapter that always uses Firestore
 */
class StorageRouter implements IClientStorage {
  /**
   * Get the active storage backend (always Firestore)
   */
  private getActiveStorage(): IClientStorage {
    if (!firestoreAvailable) {
      throw new Error('Firestore is not available - this is required for the application');
    }
    return firestoreStorage;
  }

  /**
   * Execute a Firestore operation with error logging
   * All storage operations are routed through Firestore (mandatory backend)
   */
  private async executeFirestoreOperation<T>(
    operation: (storage: IClientStorage) => Promise<T>,
    operationName: string
  ): Promise<T> {
    try {
      const storage = this.getActiveStorage();
      return await operation(storage);
    } catch (error) {
      logError(operationName, error);
      throw error;
    }
  }

  // ==========================================
  // Session Management
  // ==========================================

  async getCurrentUserId(): Promise<string | null> {
    return this.executeFirestoreOperation((s) => s.getCurrentUserId(), 'getCurrentUserId');
  }

  async setCurrentUserId(userId: string): Promise<void> {
    // Only set in Firestore (now the single source of truth)
    return this.executeFirestoreOperation((s) => s.setCurrentUserId(userId), 'setCurrentUserId');
  }

  async clearCurrentUser(): Promise<void> {
    // Only clear from Firestore (now mandatory)
    return this.executeFirestoreOperation((s) => s.clearCurrentUser(), 'clearCurrentUser');
  }

  async getAllUsers(): Promise<any[]> {
    return this.executeFirestoreOperation((s) => s.getAllUsers(), 'getAllUsers');
  }

  // ==========================================
  // Tenant Management
  // ==========================================

  async getTenants(): Promise<any[]> {
    return this.executeFirestoreOperation((s) => s.getTenants(), 'getTenants');
  }

  async getTenant(id: number): Promise<any> {
    return this.executeFirestoreOperation((s) => s.getTenant(id), 'getTenant');
  }

  async createTenant(tenant: any): Promise<any> {
    return this.executeFirestoreOperation((s) => s.createTenant(tenant), 'createTenant');
  }

  async updateTenant(id: number, updates: any): Promise<any> {
    return this.executeFirestoreOperation((s) => s.updateTenant(id, updates), 'updateTenant');
  }

  async getUsersByTenant(tenantId: number): Promise<any[]> {
    return this.executeFirestoreOperation((s) => s.getUsersByTenant(tenantId), 'getUsersByTenant');
  }

  // ==========================================
  // User Management
  // ==========================================

  async getUser(id: string): Promise<any> {
    return this.executeFirestoreOperation((s) => s.getUser(id), 'getUser');
  }

  async getUserById(id: string): Promise<any> {
    return this.executeFirestoreOperation((s) => s.getUserById(id), 'getUserById');
  }

  async getUserByEmail(email: string): Promise<any> {
    return this.executeFirestoreOperation((s) => s.getUserByEmail(email), 'getUserByEmail');
  }

  async createUser(user: any): Promise<any> {
    return this.executeFirestoreOperation((s) => s.createUser(user), 'createUser');
  }

  async updateUser(id: string, updates: any): Promise<any> {
    return this.executeFirestoreOperation((s) => s.updateUser(id, updates), 'updateUser');
  }

  async updateUserGoals(id: string, goals: any): Promise<any> {
    return this.executeFirestoreOperation((s) => s.updateUserGoals(id, goals), 'updateUserGoals');
  }

  // ==========================================
  // Quest Management
  // ==========================================

  async getQuests(): Promise<any[]> {
    return this.executeFirestoreOperation((s) => (s as any).getQuests(), 'getQuests');
  }

  async getActiveQuests(): Promise<any[]> {
    return this.executeFirestoreOperation((s) => (s as any).getActiveQuests(), 'getActiveQuests');
  }

  async getUserQuestProgressByQuest(
    userId: string,
    questId: number,
    tenantId: number
  ): Promise<any> {
    return this.executeFirestoreOperation(
      (s) => (s as any).getUserQuestProgressByQuest(userId, questId, tenantId),
      'getUserQuestProgressByQuest'
    );
  }

  async updateUserQuestProgress(
    userId: string,
    questId: number,
    progress: number,
    tenantId: number
  ): Promise<void> {
    return this.executeFirestoreOperation(
      (s) => (s as any).updateUserQuestProgress(userId, questId, progress, tenantId),
      'updateUserQuestProgress'
    );
  }

  async completeQuest(userId: string, questId: number, tenantId: number): Promise<void> {
    return this.executeFirestoreOperation(
      (s) => (s as any).completeQuest(userId, questId, tenantId),
      'completeQuest'
    );
  }

  async claimQuestReward(userId: string, questId: number, tenantId: number): Promise<void> {
    return this.executeFirestoreOperation(
      (s) => (s as any).claimQuestReward(userId, questId, tenantId),
      'claimQuestReward'
    );
  }

  // ==========================================
  // Title Management
  // ==========================================

  async unlockTitle(
    userId: string,
    title: string,
    description: string,
    source: string,
    tenantId: number
  ): Promise<void> {
    return this.executeFirestoreOperation(
      (s) => (s as any).unlockTitle(userId, title, description, source, tenantId),
      'unlockTitle'
    );
  }

  async getUserTitles(userId: string, tenantId: number): Promise<any[]> {
    return this.executeFirestoreOperation(
      (s) => (s as any).getUserTitles(userId, tenantId),
      'getUserTitles'
    );
  }

  async setSelectedTitle(userId: string, title: string | null): Promise<void> {
    return this.executeFirestoreOperation(
      (s) => (s as any).setSelectedTitle(userId, title),
      'setSelectedTitle'
    );
  }

  // ==========================================
  // Daily Rewards
  // ==========================================

  async hasClaimedDailyReward(userId: string, day: number): Promise<boolean> {
    return this.executeFirestoreOperation(
      (s) => (s as any).hasClaimedDailyReward(userId, day),
      'hasClaimedDailyReward'
    );
  }

  async claimDailyReward(userId: string, day: number, tenantId: number): Promise<any> {
    return this.executeFirestoreOperation(
      (s) => (s as any).claimDailyReward(userId, day, tenantId),
      'claimDailyReward'
    );
  }

  // ==========================================
  // Categories
  // ==========================================

  async getCategories(tenantId?: number): Promise<any[]> {
    return this.executeFirestoreOperation((s) => s.getCategories(tenantId), 'getCategories');
  }

  async createCategory(category: any): Promise<any> {
    return this.executeFirestoreOperation((s) => s.createCategory(category), 'createCategory');
  }

  async updateCategory(id: number, updates: any): Promise<any> {
    return this.executeFirestoreOperation((s) => s.updateCategory(id, updates), 'updateCategory');
  }

  async deleteCategory(id: number): Promise<void> {
    return this.executeFirestoreOperation((s) => s.deleteCategory(id), 'deleteCategory');
  }

  // ==========================================
  // Subcategories
  // ==========================================

  async getSubcategories(categoryId?: number, tenantId?: number): Promise<any[]> {
    return this.executeFirestoreOperation(
      (s) => s.getSubcategories(categoryId, tenantId),
      'getSubcategories'
    );
  }

  async createSubcategory(subcategory: any): Promise<any> {
    return this.executeFirestoreOperation(
      (s) => s.createSubcategory(subcategory),
      'createSubcategory'
    );
  }

  async updateSubcategory(id: number, updates: any): Promise<any> {
    return this.executeFirestoreOperation(
      (s) => s.updateSubcategory(id, updates),
      'updateSubcategory'
    );
  }

  async deleteSubcategory(id: number): Promise<void> {
    return this.executeFirestoreOperation((s) => s.deleteSubcategory(id), 'deleteSubcategory');
  }

  // ==========================================
  // Questions
  // ==========================================

  async getQuestionsByCategories(
    categoryIds: number[],
    subcategoryIds?: number[],
    difficultyLevels?: number[],
    tenantId?: number
  ): Promise<any[]> {
    return this.executeFirestoreOperation(
      (s) => s.getQuestionsByCategories(categoryIds, subcategoryIds, difficultyLevels, tenantId),
      'getQuestionsByCategories'
    );
  }

  async getQuestion(id: number): Promise<any> {
    return this.executeFirestoreOperation((s) => s.getQuestion(id), 'getQuestion');
  }

  async createQuestion(question: any): Promise<any> {
    return this.executeFirestoreOperation((s) => s.createQuestion(question), 'createQuestion');
  }

  async updateQuestion(id: number, updates: any): Promise<any> {
    return this.executeFirestoreOperation((s) => s.updateQuestion(id, updates), 'updateQuestion');
  }

  async deleteQuestion(id: number): Promise<void> {
    return this.executeFirestoreOperation((s) => s.deleteQuestion(id), 'deleteQuestion');
  }

  async getQuestionsByTenant(tenantId: number): Promise<any[]> {
    return this.executeFirestoreOperation(
      (s) => s.getQuestionsByTenant(tenantId),
      'getQuestionsByTenant'
    );
  }

  // ==========================================
  // Quizzes
  // ==========================================

  async createQuiz(quiz: any): Promise<any> {
    return this.executeFirestoreOperation((s) => s.createQuiz(quiz), 'createQuiz');
  }

  async getQuiz(id: number): Promise<any> {
    return this.executeFirestoreOperation((s) => s.getQuiz(id), 'getQuiz');
  }

  async getUserQuizzes(userId: string, tenantId?: number): Promise<any[]> {
    return this.executeFirestoreOperation(
      (s) => s.getUserQuizzes(userId, tenantId),
      'getUserQuizzes'
    );
  }

  async updateQuiz(id: number, updates: any): Promise<any> {
    return this.executeFirestoreOperation((s) => s.updateQuiz(id, updates), 'updateQuiz');
  }

  async getQuizQuestions(quizId: number): Promise<any[]> {
    return this.executeFirestoreOperation((s) => s.getQuizQuestions(quizId), 'getQuizQuestions');
  }

  async submitQuiz(quizId: number, answers: any[]): Promise<any> {
    return this.executeFirestoreOperation((s) => s.submitQuiz(quizId, answers), 'submitQuiz');
  }

  // ==========================================
  // User Progress
  // ==========================================

  async getUserProgress(userId: string, tenantId?: number): Promise<any[]> {
    return this.executeFirestoreOperation(
      (s) => s.getUserProgress(userId, tenantId),
      'getUserProgress'
    );
  }

  async updateUserProgress(
    userId: string,
    categoryId: number,
    progress: any,
    tenantId?: number
  ): Promise<any> {
    return this.executeFirestoreOperation(
      (s) => s.updateUserProgress(userId, categoryId, progress, tenantId),
      'updateUserProgress'
    );
  }

  async getUserStats(userId: string, tenantId?: number): Promise<any> {
    return this.executeFirestoreOperation((s) => s.getUserStats(userId, tenantId), 'getUserStats');
  }

  // ==========================================
  // Lectures
  // ==========================================

  async createLecture(
    userId: string,
    quizId: number,
    title: string,
    content: string,
    topics: string[],
    categoryId: number,
    tenantId?: number
  ): Promise<any> {
    return this.executeFirestoreOperation(
      (s) => s.createLecture(userId, quizId, title, content, topics, categoryId, tenantId),
      'createLecture'
    );
  }

  async getUserLectures(userId: string, tenantId?: number): Promise<any[]> {
    return this.executeFirestoreOperation(
      (s) => s.getUserLectures(userId, tenantId),
      'getUserLectures'
    );
  }

  async getLecture(id: number): Promise<any> {
    return this.executeFirestoreOperation((s) => s.getLecture(id), 'getLecture');
  }

  // ==========================================
  // Mastery Scores
  // ==========================================

  async updateMasteryScore(
    userId: string,
    categoryId: number,
    subcategoryId: number,
    isCorrect: boolean
  ): Promise<void> {
    return this.executeFirestoreOperation(
      (s) => s.updateMasteryScore(userId, categoryId, subcategoryId, isCorrect),
      'updateMasteryScore'
    );
  }

  async getUserMasteryScores(userId: string, tenantId?: number): Promise<any[]> {
    return this.executeFirestoreOperation(
      (s) => s.getUserMasteryScores(userId, tenantId),
      'getUserMasteryScores'
    );
  }

  async calculateOverallMasteryScore(userId: string, tenantId?: number): Promise<number> {
    return this.executeFirestoreOperation(
      (s) => s.calculateOverallMasteryScore(userId, tenantId),
      'calculateOverallMasteryScore'
    );
  }

  async getCertificationMasteryScores(userId: string, tenantId?: number): Promise<any[]> {
    return this.executeFirestoreOperation(
      (s) => s.getCertificationMasteryScores(userId, tenantId),
      'getCertificationMasteryScores'
    );
  }

  // ==========================================
  // Badges
  // ==========================================

  async getBadges(): Promise<any[]> {
    return this.executeFirestoreOperation((s) => s.getBadges(), 'getBadges');
  }

  async getUserBadges(userId: string, tenantId?: number): Promise<any[]> {
    return this.executeFirestoreOperation(
      (s) => s.getUserBadges(userId, tenantId),
      'getUserBadges'
    );
  }

  async createUserBadge(userBadge: any): Promise<any> {
    return this.executeFirestoreOperation((s) => s.createUserBadge(userBadge), 'createUserBadge');
  }

  async updateUserBadge(id: number, updates: any): Promise<any> {
    return this.executeFirestoreOperation((s) => s.updateUserBadge(id, updates), 'updateUserBadge');
  }

  // ==========================================
  // Game Stats
  // ==========================================

  async getUserGameStats(userId: string): Promise<any> {
    return this.executeFirestoreOperation((s) => s.getUserGameStats(userId), 'getUserGameStats');
  }

  async updateUserGameStats(userId: string, updates: any): Promise<any> {
    return this.executeFirestoreOperation(
      (s) => s.updateUserGameStats(userId, updates),
      'updateUserGameStats'
    );
  }

  // ==========================================
  // Challenges
  // ==========================================

  async getChallenges(userId?: string): Promise<any[]> {
    return this.executeFirestoreOperation((s) => s.getChallenges(userId), 'getChallenges');
  }

  async getChallenge(id: number): Promise<any> {
    return this.executeFirestoreOperation((s) => s.getChallenge(id), 'getChallenge');
  }

  async createChallenge(challenge: any): Promise<any> {
    return this.executeFirestoreOperation((s) => s.createChallenge(challenge), 'createChallenge');
  }

  async getChallengeAttempts(userId: string): Promise<any[]> {
    return this.executeFirestoreOperation(
      (s) => s.getChallengeAttempts(userId),
      'getChallengeAttempts'
    );
  }

  async createChallengeAttempt(attempt: any): Promise<any> {
    return this.executeFirestoreOperation(
      (s) => s.createChallengeAttempt(attempt),
      'createChallengeAttempt'
    );
  }

  // ==========================================
  // Study Groups
  // ==========================================

  async getStudyGroups(): Promise<any[]> {
    return this.executeFirestoreOperation((s) => s.getStudyGroups(), 'getStudyGroups');
  }

  async getStudyGroup(id: number): Promise<any> {
    return this.executeFirestoreOperation((s) => s.getStudyGroup(id), 'getStudyGroup');
  }

  async createStudyGroup(group: any): Promise<any> {
    return this.executeFirestoreOperation((s) => s.createStudyGroup(group), 'createStudyGroup');
  }

  async getUserStudyGroups(userId: string): Promise<any[]> {
    return this.executeFirestoreOperation(
      (s) => s.getUserStudyGroups(userId),
      'getUserStudyGroups'
    );
  }

  async joinStudyGroup(userId: string, groupId: number): Promise<any> {
    return this.executeFirestoreOperation(
      (s) => s.joinStudyGroup(userId, groupId),
      'joinStudyGroup'
    );
  }

  async leaveStudyGroup(userId: string, groupId: number): Promise<void> {
    return this.executeFirestoreOperation(
      (s) => s.leaveStudyGroup(userId, groupId),
      'leaveStudyGroup'
    );
  }

  // ==========================================
  // Practice Tests
  // ==========================================

  async getPracticeTests(): Promise<any[]> {
    return this.executeFirestoreOperation((s) => s.getPracticeTests(), 'getPracticeTests');
  }

  async getPracticeTest(id: number): Promise<any> {
    return this.executeFirestoreOperation((s) => s.getPracticeTest(id), 'getPracticeTest');
  }

  async createPracticeTest(test: any): Promise<any> {
    return this.executeFirestoreOperation((s) => s.createPracticeTest(test), 'createPracticeTest');
  }

  async getPracticeTestAttempts(userId: string, testId?: number): Promise<any[]> {
    return this.executeFirestoreOperation(
      (s) => s.getPracticeTestAttempts(userId, testId),
      'getPracticeTestAttempts'
    );
  }

  async createPracticeTestAttempt(attempt: any): Promise<any> {
    return this.executeFirestoreOperation(
      (s) => s.createPracticeTestAttempt(attempt),
      'createPracticeTestAttempt'
    );
  }

  async updatePracticeTestAttempt(id: number, updates: any): Promise<any> {
    return this.executeFirestoreOperation(
      (s) => s.updatePracticeTestAttempt(id, updates),
      'updatePracticeTestAttempt'
    );
  }

  // ==========================================
  // Token Management
  // ==========================================

  async getUserTokenBalance(userId: string): Promise<number> {
    return this.executeFirestoreOperation(
      (s) => s.getUserTokenBalance(userId),
      'getUserTokenBalance'
    );
  }

  async addTokens(userId: string, amount: number): Promise<number> {
    return this.executeFirestoreOperation((s) => s.addTokens(userId, amount), 'addTokens');
  }

  async consumeTokens(userId: string, amount: number): Promise<any> {
    return this.executeFirestoreOperation((s) => s.consumeTokens(userId, amount), 'consumeTokens');
  }

  calculateQuizTokenCost(questionCount: number): number {
    return this.getActiveStorage().calculateQuizTokenCost(questionCount);
  }

  // ==========================================
  // Study Timer Methods
  // ==========================================

  async getStudyTimerSettings(userId: string): Promise<StudyTimerSettings | null> {
    try {
      return await clientStorage.getStudyTimerSettings(userId);
    } catch (error) {
      logError('getStudyTimerSettings', error);
      throw error;
    }
  }

  async saveStudyTimerSettings(settings: Partial<StudyTimerSettings>): Promise<StudyTimerSettings> {
    try {
      return await clientStorage.saveStudyTimerSettings(settings);
    } catch (error) {
      logError('saveStudyTimerSettings', error);
      throw error;
    }
  }

  async createStudyTimerSession(session: Partial<StudyTimerSession>): Promise<StudyTimerSession> {
    try {
      return await clientStorage.createStudyTimerSession(session);
    } catch (error) {
      logError('createStudyTimerSession', error);
      throw error;
    }
  }

  async updateStudyTimerSession(
    sessionId: number,
    updates: Partial<StudyTimerSession>
  ): Promise<StudyTimerSession> {
    try {
      return await clientStorage.updateStudyTimerSession(sessionId, updates);
    } catch (error) {
      logError('updateStudyTimerSession', error);
      throw error;
    }
  }

  async getStudyTimerSessionsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<StudyTimerSession[]> {
    try {
      return await clientStorage.getStudyTimerSessionsByDateRange(userId, startDate, endDate);
    } catch (error) {
      logError('getStudyTimerSessionsByDateRange', error);
      throw error;
    }
  }

  async getStudyTimerSessions(userId: string): Promise<StudyTimerSession[]> {
    try {
      return await clientStorage.getStudyTimerSessions(userId);
    } catch (error) {
      logError('getStudyTimerSessions', error);
      throw error;
    }
  }

  async getStudyTimerStats(userId: string): Promise<StudyTimerStats> {
    try {
      return await clientStorage.getStudyTimerStats(userId);
    } catch (error) {
      logError('getStudyTimerStats', error);
      throw error;
    }
  }

  // ==========================================
  // Smart Study Recommendations
  // ==========================================

  async getStudyRecommendations(
    userId: string
  ): Promise<import('./smart-recommendations').StudyRecommendation[]> {
    return this.executeFirestoreOperation(
      (s) => s.getStudyRecommendations(userId),
      'getStudyRecommendations'
    );
  }

  async getReadinessScore(
    userId: string
  ): Promise<import('./smart-recommendations').ReadinessScore> {
    return this.executeFirestoreOperation((s) => s.getReadinessScore(userId), 'getReadinessScore');
  }

  async getTimeOfDayPerformance(
    userId: string
  ): Promise<import('./smart-recommendations').TimeOfDayPerformance[]> {
    return this.executeFirestoreOperation(
      (s) => s.getTimeOfDayPerformance(userId),
      'getTimeOfDayPerformance'
    );
  }

  async getLearningVelocity(
    userId: string
  ): Promise<import('./smart-recommendations').LearningVelocity> {
    return this.executeFirestoreOperation(
      (s) => s.getLearningVelocity(userId),
      'getLearningVelocity'
    );
  }

  async analyzePerformance(
    userId: string,
    categoryId?: number,
    subcategoryId?: number
  ): Promise<import('./smart-recommendations').PerformanceMetrics> {
    return this.executeFirestoreOperation(
      (s) => s.analyzePerformance(userId, categoryId, subcategoryId),
      'analyzePerformance'
    );
  }

  // ==========================================
  // Data Management
  // ==========================================

  async exportData(): Promise<string> {
    return this.executeFirestoreOperation((s) => s.exportData(), 'exportData');
  }

  async importData(jsonData: string): Promise<void> {
    return this.executeFirestoreOperation((s) => s.importData(jsonData), 'importData');
  }

  async clearAllData(): Promise<void> {
    return this.executeFirestoreOperation((s) => s.clearAllData(), 'clearAllData');
  }

  // ==========================================
  // Performance Analytics
  // ==========================================

  async getPerformanceOverTime(
    userId: string,
    tenantId: number = 1,
    days: number = 30
  ): Promise<Array<{ date: string; score: number; quizCount: number }>> {
    return this.executeFirestoreOperation(
      (s) => s.getPerformanceOverTime(userId, tenantId, days),
      'getPerformanceOverTime'
    );
  }

  async getCategoryBreakdown(
    userId: string,
    tenantId: number = 1
  ): Promise<
    Array<{
      categoryId: number;
      categoryName: string;
      score: number;
      questionsAnswered: number;
      correctAnswers: number;
      subcategories: Array<{
        subcategoryId: number;
        subcategoryName: string;
        score: number;
        questionsAnswered: number;
        correctAnswers: number;
      }>;
    }>
  > {
    return this.executeFirestoreOperation(
      (s) => s.getCategoryBreakdown(userId, tenantId),
      'getCategoryBreakdown'
    );
  }

  async getStudyTimeDistribution(
    userId: string,
    tenantId: number = 1
  ): Promise<{
    totalMinutes: number;
    averageSessionMinutes: number;
    byDayOfWeek: Array<{ day: string; minutes: number; sessions: number }>;
    byTimeOfDay: Array<{ hour: number; minutes: number; sessions: number }>;
  }> {
    return this.executeFirestoreOperation(
      (s) => s.getStudyTimeDistribution(userId, tenantId),
      'getStudyTimeDistribution'
    );
  }

  async getStrengthWeaknessAnalysis(
    userId: string,
    tenantId: number = 1
  ): Promise<
    Array<{
      categoryId: number;
      categoryName: string;
      subcategoryId: number;
      subcategoryName: string;
      masteryLevel: 'weak' | 'developing' | 'strong' | 'mastered';
      score: number;
      questionsAnswered: number;
    }>
  > {
    return this.executeFirestoreOperation(
      (s) => s.getStrengthWeaknessAnalysis(userId, tenantId),
      'getStrengthWeaknessAnalysis'
    );
  }

  async getStudyConsistency(
    userId: string,
    tenantId: number = 1,
    days: number = 90
  ): Promise<{
    currentStreak: number;
    longestStreak: number;
    activeDays: number;
    totalDays: number;
    calendar: Array<{ date: string; quizCount: number; totalScore: number }>;
  }> {
    return this.executeFirestoreOperation(
      (s) => s.getStudyConsistency(userId, tenantId, days),
      'getStudyConsistency'
    );
  }

  async getPerformanceSummary(
    userId: string,
    tenantId: number = 1
  ): Promise<{
    overview: {
      totalQuizzes: number;
      totalQuestions: number;
      averageScore: number;
      passingRate: number;
      studyStreak: number;
      totalStudyTime: number;
    };
    recentTrend: 'improving' | 'stable' | 'declining';
    topCategories: Array<{ categoryId: number; categoryName: string; score: number }>;
    weakCategories: Array<{ categoryId: number; categoryName: string; score: number }>;
  }> {
    return this.executeFirestoreOperation(
      (s) => s.getPerformanceSummary(userId, tenantId),
      'getPerformanceSummary'
    );
  }
}

// Export the storage router as the default storage interface
export const storage = new StorageRouter();

// For backward compatibility, also export as default
export default storage;
