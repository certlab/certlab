/**
 * Storage Factory
 *
 * Provides a unified storage interface using Firestore for cloud storage.
 * Firebase and Firestore are MANDATORY for the application.
 *
 * ## Architecture
 *
 * - **Primary storage**: Uses Firestore via firestore-storage.ts (REQUIRED)
 * - **Offline support**: Firestore SDK provides automatic offline persistence with IndexedDB cache
 * - **Cloud-first**: All data operations go through Firestore
 *
 * ## Important Notes
 *
 * - **Firebase/Firestore is MANDATORY**: Application will not function without it.
 * - **No local fallback**: IndexedDB standalone storage has been removed.
 * - **Offline caching**: Firestore SDK manages IndexedDB caching automatically for offline support.
 *
 * ## Usage
 *
 * ```typescript
 * import { storage } from './storage-factory';
 *
 * // Use storage (always routes to Firestore)
 * const quizzes = await storage.getUserQuizzes(userId);
 *
 * // Check if cloud sync is available
 * if (isCloudSyncAvailable()) {
 *   // Cloud storage is ready
 * }
 * ```
 *
 * @module storage-factory
 */

import { firestoreStorage } from './firestore-storage';
import { initializeFirestoreService, isFirestoreInitialized } from './firestore-service';
import { getCurrentFirebaseUser } from './firebase';
import { logError } from './errors';
import type { IClientStorage } from '@shared/storage-interface';
import type {
  StudyTimerSettings,
  StudyTimerSession,
  StudyTimerStats,
  Quest,
  UserQuestProgress,
  UserTitle,
  UserDailyReward,
  DailyReward,
  Quiz,
  QuizVersion,
  QuizTemplate,
  Product,
  Purchase,
  InsertProduct,
  InsertPurchase,
  Group,
  GroupMember,
  AccessCheckResult,
} from '@shared/schema';

/**
 * Storage mode type - always 'cloud' (Firestore)
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
 * Firestore is mandatory for the application
 */
export async function initializeStorage(firebaseUser?: any | null): Promise<void> {
  try {
    // Initialize Firestore (mandatory)
    firestoreAvailable = await initializeFirestoreService();

    if (!firestoreAvailable) {
      throw new Error(
        'Failed to initialize Firestore. This application cannot run without Firebase/Firestore.\n' +
          '- Verify that your Firebase project configuration is correctly set in client/src/lib/firebase.ts.\n' +
          '- Ensure your Firebase Web config (apiKey, authDomain, projectId, etc.) matches the values from the Firebase console.\n' +
          '- For setup instructions, see: https://firebase.google.com/docs/web/setup\n'
      );
    }

    console.log('[Storage Factory] Firestore initialized successfully');

    // Check if user is logged in with Firebase
    const currentFirebaseUser = firebaseUser || getCurrentFirebaseUser();
    if (currentFirebaseUser) {
      console.log('[Storage Factory] Firebase user detected, cloud storage enabled');
      await firestoreStorage.setCurrentUserId(currentFirebaseUser.uid);
    }
  } catch (error) {
    logError('initializeStorage', error);
    throw error; // Re-throw since Firestore is mandatory
  }
}

/**
 * Get the current storage mode (always 'cloud')
 */
export function getStorageMode(): StorageMode {
  return STORAGE_MODE;
}

/**
 * Check if cloud sync is available (Firestore is initialized)
 */
export function isCloudSyncAvailable(): boolean {
  return firestoreAvailable && isFirestoreInitialized();
}

/**
 * Check if currently using cloud sync (always true when Firestore is available)
 */
export function isUsingCloudSync(): boolean {
  return firestoreAvailable;
}

/**
 * Storage adapter that uses Firestore exclusively
 */
class StorageRouter implements IClientStorage {
  /**
   * Get the active storage backend (always Firestore)
   * @throws {Error} If Firestore is not initialized. This indicates a critical initialization failure
   * that should have been caught during app startup in initializeStorage().
   */
  private getActiveStorage(): IClientStorage {
    if (!firestoreAvailable) {
      throw new Error(
        'Firestore is not available. This indicates a critical initialization failure.\n' +
          'Storage operations cannot proceed without Firestore.\n' +
          'Ensure initializeStorage() is called and completes successfully before any storage operations.'
      );
    }
    return firestoreStorage;
  }

  /**
   * Execute a storage operation with error logging
   * Always routes to Firestore
   */
  private async executeStorageOperation<T>(
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
    return this.executeStorageOperation((s) => s.getCurrentUserId(), 'getCurrentUserId');
  }

  async setCurrentUserId(userId: string): Promise<void> {
    // Only set in Firestore (now the single source of truth)
    return this.executeStorageOperation((s) => s.setCurrentUserId(userId), 'setCurrentUserId');
  }

  async clearCurrentUser(): Promise<void> {
    // Only clear from Firestore (now mandatory)
    return this.executeStorageOperation((s) => s.clearCurrentUser(), 'clearCurrentUser');
  }

  async getAllUsers(): Promise<any[]> {
    return this.executeStorageOperation((s) => s.getAllUsers(), 'getAllUsers');
  }

  async getAllQuizzes(): Promise<any[]> {
    return this.executeStorageOperation((s) => s.getAllQuizzes(), 'getAllQuizzes');
  }

  async getAllMasteryScores(): Promise<any[]> {
    return this.executeStorageOperation((s) => s.getAllMasteryScores(), 'getAllMasteryScores');
  }

  // ==========================================
  // Tenant Management
  // ==========================================

  async getTenants(): Promise<any[]> {
    return this.executeStorageOperation((s) => s.getTenants(), 'getTenants');
  }

  async getTenant(id: number): Promise<any> {
    return this.executeStorageOperation((s) => s.getTenant(id), 'getTenant');
  }

  async createTenant(tenant: any): Promise<any> {
    return this.executeStorageOperation((s) => s.createTenant(tenant), 'createTenant');
  }

  async updateTenant(id: number, updates: any): Promise<any> {
    return this.executeStorageOperation((s) => s.updateTenant(id, updates), 'updateTenant');
  }

  async getUsersByTenant(tenantId: number): Promise<any[]> {
    return this.executeStorageOperation((s) => s.getUsersByTenant(tenantId), 'getUsersByTenant');
  }

  // ==========================================
  // User Management
  // ==========================================

  async getUser(id: string): Promise<any> {
    return this.executeStorageOperation((s) => s.getUser(id), 'getUser');
  }

  async getUserById(id: string): Promise<any> {
    return this.executeStorageOperation((s) => s.getUserById(id), 'getUserById');
  }

  async getUserByEmail(email: string): Promise<any> {
    return this.executeStorageOperation((s) => s.getUserByEmail(email), 'getUserByEmail');
  }

  async createUser(user: any): Promise<any> {
    return this.executeStorageOperation((s) => s.createUser(user), 'createUser');
  }

  async updateUser(id: string, updates: any): Promise<any> {
    return this.executeStorageOperation((s) => s.updateUser(id, updates), 'updateUser');
  }

  async updateUserGoals(id: string, goals: any): Promise<any> {
    return this.executeStorageOperation((s) => s.updateUserGoals(id, goals), 'updateUserGoals');
  }

  // ==========================================
  // Quest Management
  // ==========================================

  async getQuests(): Promise<Quest[]> {
    return this.executeStorageOperation((s) => s.getQuests(), 'getQuests');
  }

  async getActiveQuests(): Promise<Quest[]> {
    return this.executeStorageOperation((s) => s.getActiveQuests(), 'getActiveQuests');
  }

  async getUserQuestProgressByQuest(
    userId: string,
    questId: number,
    tenantId: number
  ): Promise<UserQuestProgress | null> {
    return this.executeStorageOperation(
      (s) => s.getUserQuestProgressByQuest(userId, questId, tenantId),
      'getUserQuestProgressByQuest'
    );
  }

  async updateUserQuestProgress(
    userId: string,
    questId: number,
    progress: number,
    tenantId: number
  ): Promise<void> {
    return this.executeStorageOperation(
      (s) => s.updateUserQuestProgress(userId, questId, progress, tenantId),
      'updateUserQuestProgress'
    );
  }

  async completeQuest(userId: string, questId: number, tenantId: number): Promise<void> {
    return this.executeStorageOperation(
      (s) => s.completeQuest(userId, questId, tenantId),
      'completeQuest'
    );
  }

  async claimQuestReward(userId: string, questId: number, tenantId: number): Promise<void> {
    return this.executeStorageOperation(
      (s) => s.claimQuestReward(userId, questId, tenantId),
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
    return this.executeStorageOperation(
      (s) => s.unlockTitle(userId, title, description, source, tenantId),
      'unlockTitle'
    );
  }

  async getUserTitles(userId: string, tenantId: number): Promise<UserTitle[]> {
    return this.executeStorageOperation((s) => s.getUserTitles(userId, tenantId), 'getUserTitles');
  }

  async setSelectedTitle(userId: string, title: string | null): Promise<void> {
    return this.executeStorageOperation(
      (s) => s.setSelectedTitle(userId, title),
      'setSelectedTitle'
    );
  }

  // ==========================================
  // Daily Rewards
  // ==========================================

  async hasClaimedDailyReward(userId: string, day: number): Promise<boolean> {
    return this.executeStorageOperation(
      (s) => s.hasClaimedDailyReward(userId, day),
      'hasClaimedDailyReward'
    );
  }

  async claimDailyReward(userId: string, day: number, tenantId: number): Promise<UserDailyReward> {
    return this.executeStorageOperation(
      (s) => s.claimDailyReward(userId, day, tenantId),
      'claimDailyReward'
    );
  }

  // ==========================================
  // Categories
  // ==========================================

  async getCategories(tenantId?: number): Promise<any[]> {
    return this.executeStorageOperation((s) => s.getCategories(tenantId), 'getCategories');
  }

  async createCategory(category: any): Promise<any> {
    return this.executeStorageOperation((s) => s.createCategory(category), 'createCategory');
  }

  async updateCategory(id: number, updates: any): Promise<any> {
    return this.executeStorageOperation((s) => s.updateCategory(id, updates), 'updateCategory');
  }

  async deleteCategory(id: number): Promise<void> {
    return this.executeStorageOperation((s) => s.deleteCategory(id), 'deleteCategory');
  }

  // ==========================================
  // Subcategories
  // ==========================================

  async getSubcategories(categoryId?: number, tenantId?: number): Promise<any[]> {
    return this.executeStorageOperation(
      (s) => s.getSubcategories(categoryId, tenantId),
      'getSubcategories'
    );
  }

  async createSubcategory(subcategory: any): Promise<any> {
    return this.executeStorageOperation(
      (s) => s.createSubcategory(subcategory),
      'createSubcategory'
    );
  }

  async updateSubcategory(id: number, updates: any): Promise<any> {
    return this.executeStorageOperation(
      (s) => s.updateSubcategory(id, updates),
      'updateSubcategory'
    );
  }

  async deleteSubcategory(id: number): Promise<void> {
    return this.executeStorageOperation((s) => s.deleteSubcategory(id), 'deleteSubcategory');
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
    return this.executeStorageOperation(
      (s) => s.getQuestionsByCategories(categoryIds, subcategoryIds, difficultyLevels, tenantId),
      'getQuestionsByCategories'
    );
  }

  async getQuestion(id: number): Promise<any> {
    return this.executeStorageOperation((s) => s.getQuestion(id), 'getQuestion');
  }

  async createQuestion(question: any): Promise<any> {
    return this.executeStorageOperation((s) => s.createQuestion(question), 'createQuestion');
  }

  async updateQuestion(id: number, updates: any): Promise<any> {
    return this.executeStorageOperation((s) => s.updateQuestion(id, updates), 'updateQuestion');
  }

  async deleteQuestion(id: number): Promise<void> {
    return this.executeStorageOperation((s) => s.deleteQuestion(id), 'deleteQuestion');
  }

  async getQuestionsByTenant(tenantId: number): Promise<any[]> {
    return this.executeStorageOperation(
      (s) => s.getQuestionsByTenant(tenantId),
      'getQuestionsByTenant'
    );
  }

  // ==========================================
  // Quizzes
  // ==========================================

  async createQuiz(quiz: any): Promise<any> {
    return this.executeStorageOperation((s) => s.createQuiz(quiz), 'createQuiz');
  }

  async getQuiz(id: number): Promise<any> {
    return this.executeStorageOperation((s) => s.getQuiz(id), 'getQuiz');
  }

  async getUserQuizzes(userId: string, tenantId?: number): Promise<any[]> {
    return this.executeStorageOperation(
      (s) => s.getUserQuizzes(userId, tenantId),
      'getUserQuizzes'
    );
  }

  async updateQuiz(id: number, updates: any): Promise<any> {
    return this.executeStorageOperation((s) => s.updateQuiz(id, updates), 'updateQuiz');
  }

  async getQuizQuestions(quizId: number): Promise<any[]> {
    return this.executeStorageOperation((s) => s.getQuizQuestions(quizId), 'getQuizQuestions');
  }

  async submitQuiz(quizId: number, answers: any[]): Promise<any> {
    return this.executeStorageOperation((s) => s.submitQuiz(quizId, answers), 'submitQuiz');
  }

  // ==========================================
  // Quiz Version History
  // ==========================================

  async createQuizVersion(
    quizId: number,
    quizData: Partial<Quiz>,
    changeDescription?: string,
    collectionName: 'quizzes' | 'quizTemplates' = 'quizTemplates'
  ): Promise<QuizVersion> {
    return this.executeStorageOperation(
      (s) => (s as any).createQuizVersion(quizId, quizData, changeDescription, collectionName),
      'createQuizVersion'
    );
  }

  async getQuizVersions(
    quizId: number,
    collectionName: 'quizzes' | 'quizTemplates' = 'quizTemplates'
  ): Promise<QuizVersion[]> {
    return this.executeStorageOperation(
      (s) => (s as any).getQuizVersions(quizId, collectionName),
      'getQuizVersions'
    );
  }

  async getQuizVersion(
    quizId: number,
    versionId: string,
    collectionName: 'quizzes' | 'quizTemplates' = 'quizTemplates'
  ): Promise<QuizVersion | null> {
    return this.executeStorageOperation(
      (s) => (s as any).getQuizVersion(quizId, versionId, collectionName),
      'getQuizVersion'
    );
  }

  async restoreQuizVersion(
    quizId: number,
    versionId: string,
    collectionName: 'quizzes' | 'quizTemplates' = 'quizTemplates'
  ): Promise<Quiz> {
    return this.executeStorageOperation(
      (s) => (s as any).restoreQuizVersion(quizId, versionId, collectionName),
      'restoreQuizVersion'
    );
  }

  // ==========================================
  // Quiz Templates
  // ==========================================

  async getUserQuizTemplates(userId: string, tenantId?: number): Promise<QuizTemplate[]> {
    return this.executeStorageOperation(
      (s) => s.getUserQuizTemplates(userId, tenantId),
      'getUserQuizTemplates'
    );
  }

  async getQuizTemplate(userId: string, templateId: number): Promise<QuizTemplate | undefined> {
    return this.executeStorageOperation(
      (s) => s.getQuizTemplate(userId, templateId),
      'getQuizTemplate'
    );
  }

  async duplicateQuizTemplate(templateId: number, userId: string): Promise<QuizTemplate> {
    return this.executeStorageOperation(
      (s) => s.duplicateQuizTemplate(templateId, userId),
      'duplicateQuizTemplate'
    );
  }

  async deleteQuizTemplate(templateId: number, userId: string): Promise<void> {
    return this.executeStorageOperation(
      (s) => s.deleteQuizTemplate(templateId, userId),
      'deleteQuizTemplate'
    );
  }

  // ==========================================
  // User Progress
  // ==========================================

  async getUserProgress(userId: string, tenantId?: number): Promise<any[]> {
    return this.executeStorageOperation(
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
    return this.executeStorageOperation(
      (s) => s.updateUserProgress(userId, categoryId, progress, tenantId),
      'updateUserProgress'
    );
  }

  async getUserStats(userId: string, tenantId?: number): Promise<any> {
    return this.executeStorageOperation((s) => s.getUserStats(userId, tenantId), 'getUserStats');
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
    return this.executeStorageOperation(
      (s) => s.createLecture(userId, quizId, title, content, topics, categoryId, tenantId),
      'createLecture'
    );
  }

  async getUserLectures(userId: string, tenantId?: number): Promise<any[]> {
    return this.executeStorageOperation(
      (s) => s.getUserLectures(userId, tenantId),
      'getUserLectures'
    );
  }

  async getLecture(id: number): Promise<any> {
    return this.executeStorageOperation((s) => s.getLecture(id), 'getLecture');
  }

  async updateLecture(id: number, updates: Partial<any>): Promise<any> {
    return this.executeStorageOperation((s) => s.updateLecture(id, updates), 'updateLecture');
  }

  async deleteLecture(id: number, userId: string): Promise<void> {
    return this.executeStorageOperation((s) => s.deleteLecture(id, userId), 'deleteLecture');
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
    return this.executeStorageOperation(
      (s) => s.updateMasteryScore(userId, categoryId, subcategoryId, isCorrect),
      'updateMasteryScore'
    );
  }

  async getUserMasteryScores(userId: string, tenantId?: number): Promise<any[]> {
    return this.executeStorageOperation(
      (s) => s.getUserMasteryScores(userId, tenantId),
      'getUserMasteryScores'
    );
  }

  async calculateOverallMasteryScore(userId: string, tenantId?: number): Promise<number> {
    return this.executeStorageOperation(
      (s) => s.calculateOverallMasteryScore(userId, tenantId),
      'calculateOverallMasteryScore'
    );
  }

  async getCertificationMasteryScores(userId: string, tenantId?: number): Promise<any[]> {
    return this.executeStorageOperation(
      (s) => s.getCertificationMasteryScores(userId, tenantId),
      'getCertificationMasteryScores'
    );
  }

  // ==========================================
  // Badges
  // ==========================================

  async getBadges(): Promise<any[]> {
    return this.executeStorageOperation((s) => s.getBadges(), 'getBadges');
  }

  async getUserBadges(userId: string, tenantId?: number): Promise<any[]> {
    return this.executeStorageOperation((s) => s.getUserBadges(userId, tenantId), 'getUserBadges');
  }

  async createUserBadge(userBadge: any): Promise<any> {
    return this.executeStorageOperation((s) => s.createUserBadge(userBadge), 'createUserBadge');
  }

  async updateUserBadge(id: number, updates: any): Promise<any> {
    return this.executeStorageOperation((s) => s.updateUserBadge(id, updates), 'updateUserBadge');
  }

  // ==========================================
  // Game Stats
  // ==========================================

  async getUserGameStats(userId: string): Promise<any> {
    return this.executeStorageOperation((s) => s.getUserGameStats(userId), 'getUserGameStats');
  }

  async updateUserGameStats(userId: string, updates: any): Promise<any> {
    return this.executeStorageOperation(
      (s) => s.updateUserGameStats(userId, updates),
      'updateUserGameStats'
    );
  }

  // ==========================================
  // Challenges
  // ==========================================

  async getChallenges(userId?: string): Promise<any[]> {
    return this.executeStorageOperation((s) => s.getChallenges(userId), 'getChallenges');
  }

  async getChallenge(id: number): Promise<any> {
    return this.executeStorageOperation((s) => s.getChallenge(id), 'getChallenge');
  }

  async createChallenge(challenge: any): Promise<any> {
    return this.executeStorageOperation((s) => s.createChallenge(challenge), 'createChallenge');
  }

  async getChallengeAttempts(userId: string): Promise<any[]> {
    return this.executeStorageOperation(
      (s) => s.getChallengeAttempts(userId),
      'getChallengeAttempts'
    );
  }

  async createChallengeAttempt(attempt: any): Promise<any> {
    return this.executeStorageOperation(
      (s) => s.createChallengeAttempt(attempt),
      'createChallengeAttempt'
    );
  }

  // ==========================================
  // Study Groups
  // ==========================================

  async getStudyGroups(): Promise<any[]> {
    return this.executeStorageOperation((s) => s.getStudyGroups(), 'getStudyGroups');
  }

  async getStudyGroup(id: number): Promise<any> {
    return this.executeStorageOperation((s) => s.getStudyGroup(id), 'getStudyGroup');
  }

  async createStudyGroup(group: any): Promise<any> {
    return this.executeStorageOperation((s) => s.createStudyGroup(group), 'createStudyGroup');
  }

  async getUserStudyGroups(userId: string): Promise<any[]> {
    return this.executeStorageOperation((s) => s.getUserStudyGroups(userId), 'getUserStudyGroups');
  }

  async joinStudyGroup(userId: string, groupId: number): Promise<any> {
    return this.executeStorageOperation((s) => s.joinStudyGroup(userId, groupId), 'joinStudyGroup');
  }

  async leaveStudyGroup(userId: string, groupId: number): Promise<void> {
    return this.executeStorageOperation(
      (s) => s.leaveStudyGroup(userId, groupId),
      'leaveStudyGroup'
    );
  }

  // ==========================================
  // Practice Tests
  // ==========================================

  async getPracticeTests(): Promise<any[]> {
    return this.executeStorageOperation((s) => s.getPracticeTests(), 'getPracticeTests');
  }

  async getPracticeTest(id: number): Promise<any> {
    return this.executeStorageOperation((s) => s.getPracticeTest(id), 'getPracticeTest');
  }

  async createPracticeTest(test: any): Promise<any> {
    return this.executeStorageOperation((s) => s.createPracticeTest(test), 'createPracticeTest');
  }

  async getPracticeTestAttempts(userId: string, testId?: number): Promise<any[]> {
    return this.executeStorageOperation(
      (s) => s.getPracticeTestAttempts(userId, testId),
      'getPracticeTestAttempts'
    );
  }

  async createPracticeTestAttempt(attempt: any): Promise<any> {
    return this.executeStorageOperation(
      (s) => s.createPracticeTestAttempt(attempt),
      'createPracticeTestAttempt'
    );
  }

  async updatePracticeTestAttempt(id: number, updates: any): Promise<any> {
    return this.executeStorageOperation(
      (s) => s.updatePracticeTestAttempt(id, updates),
      'updatePracticeTestAttempt'
    );
  }

  // ==========================================
  // Token Management
  // ==========================================

  async getUserTokenBalance(userId: string): Promise<number> {
    return this.executeStorageOperation(
      (s) => s.getUserTokenBalance(userId),
      'getUserTokenBalance'
    );
  }

  async addTokens(userId: string, amount: number): Promise<number> {
    return this.executeStorageOperation((s) => s.addTokens(userId, amount), 'addTokens');
  }

  async consumeTokens(userId: string, amount: number): Promise<any> {
    return this.executeStorageOperation((s) => s.consumeTokens(userId, amount), 'consumeTokens');
  }

  calculateQuizTokenCost(questionCount: number): number {
    return this.getActiveStorage().calculateQuizTokenCost(questionCount);
  }

  // ==========================================
  // Study Timer Methods
  // ==========================================

  async getStudyTimerSettings(userId: string): Promise<StudyTimerSettings | null> {
    return this.executeStorageOperation(
      (s) => s.getStudyTimerSettings(userId),
      'getStudyTimerSettings'
    );
  }

  async updateStudyTimerSettings(
    userId: string,
    settings: Partial<StudyTimerSettings>
  ): Promise<StudyTimerSettings> {
    return this.executeStorageOperation(
      (s) => s.updateStudyTimerSettings(userId, settings),
      'updateStudyTimerSettings'
    );
  }

  async createStudyTimerSession(session: Partial<StudyTimerSession>): Promise<StudyTimerSession> {
    return this.executeStorageOperation(
      (s) => s.createStudyTimerSession(session),
      'createStudyTimerSession'
    );
  }

  async updateStudyTimerSession(
    sessionId: string | number,
    updates: Partial<StudyTimerSession>
  ): Promise<StudyTimerSession> {
    return this.executeStorageOperation(
      (s) => s.updateStudyTimerSession(sessionId, updates),
      'updateStudyTimerSession'
    );
  }

  async getStudyTimerSessionsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<StudyTimerSession[]> {
    return this.executeStorageOperation(
      (s) => s.getStudyTimerSessionsByDateRange(userId, startDate, endDate),
      'getStudyTimerSessionsByDateRange'
    );
  }

  async getStudyTimerStats(userId: string): Promise<StudyTimerStats> {
    return this.executeStorageOperation((s) => s.getStudyTimerStats(userId), 'getStudyTimerStats');
  }

  // ==========================================
  // Smart Study Recommendations
  // ==========================================

  async getStudyRecommendations(
    userId: string
  ): Promise<import('./smart-recommendations').StudyRecommendation[]> {
    return this.executeStorageOperation(
      (s) => s.getStudyRecommendations(userId),
      'getStudyRecommendations'
    );
  }

  async getReadinessScore(
    userId: string
  ): Promise<import('./smart-recommendations').ReadinessScore> {
    return this.executeStorageOperation((s) => s.getReadinessScore(userId), 'getReadinessScore');
  }

  async getTimeOfDayPerformance(
    userId: string
  ): Promise<import('./smart-recommendations').TimeOfDayPerformance[]> {
    return this.executeStorageOperation(
      (s) => s.getTimeOfDayPerformance(userId),
      'getTimeOfDayPerformance'
    );
  }

  async getLearningVelocity(
    userId: string
  ): Promise<import('./smart-recommendations').LearningVelocity> {
    return this.executeStorageOperation(
      (s) => s.getLearningVelocity(userId),
      'getLearningVelocity'
    );
  }

  async analyzePerformance(
    userId: string,
    categoryId?: number,
    subcategoryId?: number
  ): Promise<import('./smart-recommendations').PerformanceMetrics> {
    return this.executeStorageOperation(
      (s) => s.analyzePerformance(userId, categoryId, subcategoryId),
      'analyzePerformance'
    );
  }

  // ==========================================
  // Data Management
  // ==========================================

  async exportData(): Promise<string> {
    return this.executeStorageOperation((s) => s.exportData(), 'exportData');
  }

  async importData(jsonData: string): Promise<void> {
    return this.executeStorageOperation((s) => s.importData(jsonData), 'importData');
  }

  async clearAllData(): Promise<void> {
    return this.executeStorageOperation((s) => s.clearAllData(), 'clearAllData');
  }

  // ==========================================
  // Performance Analytics
  // ==========================================

  async getPerformanceOverTime(
    userId: string,
    tenantId: number = 1,
    days: number = 30
  ): Promise<Array<{ date: string; score: number; quizCount: number }>> {
    return this.executeStorageOperation(
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
    return this.executeStorageOperation(
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
    return this.executeStorageOperation(
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
    return this.executeStorageOperation(
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
    return this.executeStorageOperation(
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
    return this.executeStorageOperation(
      (s) => s.getPerformanceSummary(userId, tenantId),
      'getPerformanceSummary'
    );
  }

  // ==========================================
  // Study Notes (not in IClientStorage interface)
  // ==========================================
  // TODO: These methods should be added to IClientStorage interface

  async getUserStudyNotes(userId: string, tenantId?: number): Promise<any[]> {
    return this.executeStorageOperation(
      (s) => (s as any).getUserStudyNotes(userId, tenantId),
      'getUserStudyNotes'
    );
  }

  async createStudyNote(studyNote: any): Promise<any> {
    return this.executeStorageOperation(
      (s) => (s as any).createStudyNote(studyNote),
      'createStudyNote'
    );
  }

  async updateStudyNote(id: number, updates: any): Promise<any> {
    return this.executeStorageOperation(
      (s) => (s as any).updateStudyNote(id, updates),
      'updateStudyNote'
    );
  }

  async deleteStudyNote(id: number): Promise<void> {
    return this.executeStorageOperation((s) => (s as any).deleteStudyNote(id), 'deleteStudyNote');
  }

  // ==========================================
  // Quest Methods (not in IClientStorage interface)
  // ==========================================
  // TODO: These methods should be added to IClientStorage interface

  async getQuestsByType(type: string): Promise<any[]> {
    // Fallback implementation: filter all quests by type
    const quests = await this.getQuests();
    return quests.filter((quest: any) => quest.type === type);
  }

  async getUserQuestProgress(userId: string, tenantId: number): Promise<any[]> {
    // TODO: Implement proper method in storage interface
    console.warn(
      '[StorageRouter] getUserQuestProgress not yet implemented - returning empty array'
    );
    return [];
  }

  // ==========================================
  // Daily Rewards
  // ==========================================

  async getDailyRewards(): Promise<DailyReward[]> {
    return this.executeStorageOperation((s) => s.getDailyRewards(), 'getDailyRewards');
  }

  async getUserDailyRewards(userId: string, tenantId: number): Promise<UserDailyReward[]> {
    return this.executeStorageOperation(
      (s) => s.getUserDailyRewards(userId, tenantId),
      'getUserDailyRewards'
    );
  }

  // ==========================================
  // Product Management
  // ==========================================

  async getProducts(tenantId?: number): Promise<Product[]> {
    return this.executeStorageOperation((s) => s.getProducts(tenantId), 'getProducts');
  }

  async getProduct(id: number): Promise<Product | null> {
    return this.executeStorageOperation((s) => s.getProduct(id), 'getProduct');
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    return this.executeStorageOperation((s) => s.createProduct(product), 'createProduct');
  }

  async updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product | null> {
    return this.executeStorageOperation((s) => s.updateProduct(id, updates), 'updateProduct');
  }

  async deleteProduct(id: number): Promise<void> {
    return this.executeStorageOperation((s) => s.deleteProduct(id), 'deleteProduct');
  }

  // ==========================================
  // Purchase Management
  // ==========================================

  async getUserPurchases(userId: string): Promise<Purchase[]> {
    return this.executeStorageOperation((s) => s.getUserPurchases(userId), 'getUserPurchases');
  }

  async getPurchase(id: number): Promise<Purchase | null> {
    return this.executeStorageOperation((s) => s.getPurchase(id), 'getPurchase');
  }

  async getUserPurchase(userId: string, productId: number): Promise<Purchase | null> {
    return this.executeStorageOperation(
      (s) => s.getUserPurchase(userId, productId),
      'getUserPurchase'
    );
  }

  async createPurchase(purchase: InsertPurchase): Promise<Purchase> {
    return this.executeStorageOperation((s) => s.createPurchase(purchase), 'createPurchase');
  }

  async updatePurchase(id: number, updates: Partial<InsertPurchase>): Promise<Purchase | null> {
    return this.executeStorageOperation((s) => s.updatePurchase(id, updates), 'updatePurchase');
  }

  async getAllPurchases(tenantId?: number): Promise<Purchase[]> {
    return this.executeStorageOperation((s) => s.getAllPurchases(tenantId), 'getAllPurchases');
  }

  async refundPurchase(id: number): Promise<Purchase | null> {
    return this.executeStorageOperation((s) => s.refundPurchase(id), 'refundPurchase');
  }

  async checkProductAccess(userId: string, productId: number): Promise<boolean> {
    return this.executeStorageOperation(
      (s) => s.checkProductAccess(userId, productId),
      'checkProductAccess'
    );
  }

  // ==========================================
  // Access Control & Permissions
  // ==========================================

  async checkAccess(
    userId: string,
    resourceType: 'quiz' | 'lecture' | 'template',
    resourceId: number
  ): Promise<AccessCheckResult> {
    return this.executeStorageOperation(
      (s) => s.checkAccess(userId, resourceType, resourceId),
      'checkAccess'
    );
  }

  async checkPurchase(userId: string, productId: string): Promise<boolean> {
    return this.executeStorageOperation((s) => s.checkPurchase(userId, productId), 'checkPurchase');
  }

  async isUserInGroups(userId: string, groupIds: number[]): Promise<boolean> {
    return this.executeStorageOperation(
      (s) => s.isUserInGroups(userId, groupIds),
      'isUserInGroups'
    );
  }

  async getUserGroups(userId: string): Promise<Group[]> {
    return this.executeStorageOperation((s) => s.getUserGroups(userId), 'getUserGroups');
  }

  async createGroup(group: Partial<Group>): Promise<Group> {
    return this.executeStorageOperation((s) => s.createGroup(group), 'createGroup');
  }

  async updateGroup(groupId: number, updates: Partial<Group>): Promise<Group> {
    return this.executeStorageOperation((s) => s.updateGroup(groupId, updates), 'updateGroup');
  }

  async deleteGroup(groupId: number): Promise<void> {
    return this.executeStorageOperation((s) => s.deleteGroup(groupId), 'deleteGroup');
  }

  async addGroupMember(groupId: number, userId: string, addedBy: string): Promise<void> {
    return this.executeStorageOperation(
      (s) => s.addGroupMember(groupId, userId, addedBy),
      'addGroupMember'
    );
  }

  async removeGroupMember(groupId: number, userId: string): Promise<void> {
    return this.executeStorageOperation(
      (s) => s.removeGroupMember(groupId, userId),
      'removeGroupMember'
    );
  }

  async getGroupMembers(groupId: number): Promise<GroupMember[]> {
    return this.executeStorageOperation((s) => s.getGroupMembers(groupId), 'getGroupMembers');
  }

  async getAllGroups(tenantId?: number): Promise<Group[]> {
    return this.executeStorageOperation((s) => s.getAllGroups(tenantId), 'getAllGroups');
  }

  // ==========================================
  // Template Library
  // ==========================================

  async createQuizTemplateLibrary(
    template: Omit<
      import('@shared/schema').QuizTemplateLibrary,
      'id' | 'createdAt' | 'updatedAt' | 'usageCount'
    >
  ): Promise<import('@shared/schema').QuizTemplateLibrary> {
    return this.executeStorageOperation(
      (s) => s.createQuizTemplateLibrary(template),
      'createQuizTemplateLibrary'
    );
  }

  async createMaterialTemplateLibrary(
    template: Omit<
      import('@shared/schema').MaterialTemplateLibrary,
      'id' | 'createdAt' | 'updatedAt' | 'usageCount'
    >
  ): Promise<import('@shared/schema').MaterialTemplateLibrary> {
    return this.executeStorageOperation(
      (s) => s.createMaterialTemplateLibrary(template),
      'createMaterialTemplateLibrary'
    );
  }

  async getQuizTemplateLibrary(
    templateId: number,
    userId: string
  ): Promise<import('@shared/schema').QuizTemplateLibrary | null> {
    return this.executeStorageOperation(
      (s) => s.getQuizTemplateLibrary(templateId, userId),
      'getQuizTemplateLibrary'
    );
  }

  async getMaterialTemplateLibrary(
    templateId: number,
    userId: string
  ): Promise<import('@shared/schema').MaterialTemplateLibrary | null> {
    return this.executeStorageOperation(
      (s) => s.getMaterialTemplateLibrary(templateId, userId),
      'getMaterialTemplateLibrary'
    );
  }

  async searchTemplateLibrary(
    filters: import('@shared/schema').TemplateSearchFilters,
    userId: string,
    tenantId: number
  ): Promise<import('@shared/schema').TemplateLibraryItem[]> {
    return this.executeStorageOperation(
      (s) => s.searchTemplateLibrary(filters, userId, tenantId),
      'searchTemplateLibrary'
    );
  }

  async updateQuizTemplateLibrary(
    templateId: number,
    updates: Partial<import('@shared/schema').QuizTemplateLibrary>,
    userId: string
  ): Promise<import('@shared/schema').QuizTemplateLibrary> {
    return this.executeStorageOperation(
      (s) => s.updateQuizTemplateLibrary(templateId, updates, userId),
      'updateQuizTemplateLibrary'
    );
  }

  async updateMaterialTemplateLibrary(
    templateId: number,
    updates: Partial<import('@shared/schema').MaterialTemplateLibrary>,
    userId: string
  ): Promise<import('@shared/schema').MaterialTemplateLibrary> {
    return this.executeStorageOperation(
      (s) => s.updateMaterialTemplateLibrary(templateId, updates, userId),
      'updateMaterialTemplateLibrary'
    );
  }

  async deleteTemplateLibrary(
    templateId: number,
    templateType: 'quiz' | 'material',
    userId: string
  ): Promise<void> {
    return this.executeStorageOperation(
      (s) => s.deleteTemplateLibrary(templateId, templateType, userId),
      'deleteTemplateLibrary'
    );
  }

  async incrementTemplateUsage(
    templateId: number,
    templateType: 'quiz' | 'material'
  ): Promise<void> {
    return this.executeStorageOperation(
      (s) => s.incrementTemplateUsage(templateId, templateType),
      'incrementTemplateUsage'
    );
  }

  async checkTemplateDuplicate(
    title: string,
    templateType: 'quiz' | 'material',
    userId: string,
    tenantId: number
  ): Promise<{ isDuplicate: boolean; existingTemplateId?: number }> {
    return this.executeStorageOperation(
      (s) => s.checkTemplateDuplicate(title, templateType, userId, tenantId),
      'checkTemplateDuplicate'
    );
  }

  async getUserTemplates(
    userId: string,
    templateType?: 'quiz' | 'material',
    tenantId?: number
  ): Promise<import('@shared/schema').TemplateLibraryItem[]> {
    return this.executeStorageOperation(
      (s) => s.getUserTemplates(userId, templateType, tenantId),
      'getUserTemplates'
    );
  }

  async getPopularTemplates(
    templateType?: 'quiz' | 'material',
    limit?: number,
    tenantId?: number
  ): Promise<import('@shared/schema').TemplateLibraryItem[]> {
    return this.executeStorageOperation(
      (s) => s.getPopularTemplates(templateType, limit, tenantId),
      'getPopularTemplates'
    );
  }

  async getRecentTemplates(
    templateType?: 'quiz' | 'material',
    limit?: number,
    tenantId?: number
  ): Promise<import('@shared/schema').TemplateLibraryItem[]> {
    return this.executeStorageOperation(
      (s) => s.getRecentTemplates(templateType, limit, tenantId),
      'getRecentTemplates'
    );
  }

  // ==========================================
  // Certificates
  // ==========================================

  async createCertificate(
    certificate: Omit<import('@shared/schema').Certificate, 'id' | 'createdAt'>
  ): Promise<import('@shared/schema').Certificate> {
    return this.executeStorageOperation(
      (s) => s.createCertificate(certificate),
      'createCertificate'
    );
  }

  async getCertificate(
    certificateId: number,
    userId: string
  ): Promise<import('@shared/schema').Certificate | null> {
    return this.executeStorageOperation(
      (s) => s.getCertificate(certificateId, userId),
      'getCertificate'
    );
  }

  async getUserCertificates(
    userId: string,
    tenantId: number
  ): Promise<import('@shared/schema').Certificate[]> {
    return this.executeStorageOperation(
      (s) => s.getUserCertificates(userId, tenantId),
      'getUserCertificates'
    );
  }

  async getCertificateByVerificationId(
    verificationId: string
  ): Promise<import('@shared/schema').Certificate | null> {
    return this.executeStorageOperation(
      (s) => s.getCertificateByVerificationId(verificationId),
      'getCertificateByVerificationId'
    );
  }

  async deleteCertificate(certificateId: number, userId: string): Promise<void> {
    return this.executeStorageOperation(
      (s) => s.deleteCertificate(certificateId, userId),
      'deleteCertificate'
    );
  }

  async getCertificateTemplates(
    tenantId: number
  ): Promise<import('@shared/schema').CertificateTemplate[]> {
    return this.executeStorageOperation(
      (s) => s.getCertificateTemplates(tenantId),
      'getCertificateTemplates'
    );
  }

  async getCertificateTemplate(
    templateId: number
  ): Promise<import('@shared/schema').CertificateTemplate | null> {
    return this.executeStorageOperation(
      (s) => s.getCertificateTemplate(templateId),
      'getCertificateTemplate'
    );
  }

  async createCertificateTemplate(
    template: Omit<import('@shared/schema').CertificateTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<import('@shared/schema').CertificateTemplate> {
    return this.executeStorageOperation(
      (s) => s.createCertificateTemplate(template),
      'createCertificateTemplate'
    );
  }

  async updateCertificateTemplate(
    templateId: number,
    updates: Partial<import('@shared/schema').CertificateTemplate>
  ): Promise<import('@shared/schema').CertificateTemplate> {
    return this.executeStorageOperation(
      (s) => s.updateCertificateTemplate(templateId, updates),
      'updateCertificateTemplate'
    );
  }

  async deleteCertificateTemplate(templateId: number): Promise<void> {
    return this.executeStorageOperation(
      (s) => s.deleteCertificateTemplate(templateId),
      'deleteCertificateTemplate'
    );
  }

  // ==========================================
  // Notification Management (Delegated to storage implementation)
  // ==========================================

  async getUserNotifications(
    userId: string,
    options?: {
      includeRead?: boolean;
      includeDismissed?: boolean;
      types?: import('@shared/schema').NotificationType[];
      limit?: number;
    }
  ): Promise<import('@shared/schema').Notification[]> {
    return this.executeStorageOperation(
      (s) => s.getUserNotifications(userId, options),
      'getUserNotifications'
    );
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    return this.executeStorageOperation(
      (s) => s.getUnreadNotificationCount(userId),
      'getUnreadNotificationCount'
    );
  }

  async createNotification(
    notification: import('@shared/schema').InsertNotification
  ): Promise<import('@shared/schema').Notification> {
    return this.executeStorageOperation(
      (s) => s.createNotification(notification),
      'createNotification'
    );
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    return this.executeStorageOperation(
      (s) => s.markNotificationAsRead(notificationId, userId),
      'markNotificationAsRead'
    );
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    return this.executeStorageOperation(
      (s) => s.markAllNotificationsAsRead(userId),
      'markAllNotificationsAsRead'
    );
  }

  async dismissNotification(notificationId: string, userId: string): Promise<void> {
    return this.executeStorageOperation(
      (s) => s.dismissNotification(notificationId, userId),
      'dismissNotification'
    );
  }

  async deleteExpiredNotifications(userId: string): Promise<void> {
    return this.executeStorageOperation(
      (s) => s.deleteExpiredNotifications(userId),
      'deleteExpiredNotifications'
    );
  }

  async getNotificationPreferences(
    userId: string
  ): Promise<import('@shared/schema').NotificationPreferences | null> {
    return this.executeStorageOperation(
      (s) => s.getNotificationPreferences(userId),
      'getNotificationPreferences'
    );
  }

  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<import('@shared/schema').NotificationPreferences>
  ): Promise<import('@shared/schema').NotificationPreferences> {
    return this.executeStorageOperation(
      (s) => s.updateNotificationPreferences(userId, preferences),
      'updateNotificationPreferences'
    );
  }

  // ==========================================
  // Enrollment Management (Delegated to storage implementation)
  // ==========================================

  async enrollUser(
    userId: string,
    resourceType: 'quiz' | 'lecture' | 'template',
    resourceId: number,
    tenantId: number,
    requiresApproval?: boolean
  ): Promise<import('@shared/schema').Enrollment> {
    return this.executeStorageOperation(
      (s) => s.enrollUser(userId, resourceType, resourceId, tenantId, requiresApproval),
      'enrollUser'
    );
  }

  async unenrollUser(enrollmentId: string): Promise<void> {
    return this.executeStorageOperation((s) => s.unenrollUser(enrollmentId), 'unenrollUser');
  }

  async getUserEnrollments(
    userId: string,
    tenantId: number,
    resourceType?: 'quiz' | 'lecture' | 'template'
  ): Promise<import('@shared/schema').Enrollment[]> {
    return this.executeStorageOperation(
      (s) => s.getUserEnrollments(userId, tenantId, resourceType),
      'getUserEnrollments'
    );
  }

  async getResourceEnrollments(
    resourceType: 'quiz' | 'lecture' | 'template',
    resourceId: number
  ): Promise<import('@shared/schema').Enrollment[]> {
    return this.executeStorageOperation(
      (s) => s.getResourceEnrollments(resourceType, resourceId),
      'getResourceEnrollments'
    );
  }

  async approveEnrollment(
    enrollmentId: string,
    approvedBy: string
  ): Promise<import('@shared/schema').Enrollment> {
    return this.executeStorageOperation(
      (s) => s.approveEnrollment(enrollmentId, approvedBy),
      'approveEnrollment'
    );
  }

  async rejectEnrollment(enrollmentId: string): Promise<void> {
    return this.executeStorageOperation(
      (s) => s.rejectEnrollment(enrollmentId),
      'rejectEnrollment'
    );
  }

  async updateEnrollmentProgress(
    enrollmentId: string,
    progress: number,
    completed?: boolean
  ): Promise<import('@shared/schema').Enrollment> {
    return this.executeStorageOperation(
      (s) => s.updateEnrollmentProgress(enrollmentId, progress, completed),
      'updateEnrollmentProgress'
    );
  }

  async isUserEnrolled(
    userId: string,
    resourceType: 'quiz' | 'lecture' | 'template',
    resourceId: number
  ): Promise<boolean> {
    return this.executeStorageOperation(
      (s) => s.isUserEnrolled(userId, resourceType, resourceId),
      'isUserEnrolled'
    );
  }

  async assignToUser(
    userId: string,
    resourceType: 'quiz' | 'lecture' | 'template',
    resourceId: number,
    assignedBy: string,
    tenantId: number,
    dueDate?: Date,
    notes?: string
  ): Promise<import('@shared/schema').Assignment> {
    return this.executeStorageOperation(
      (s) => s.assignToUser(userId, resourceType, resourceId, assignedBy, tenantId, dueDate, notes),
      'assignToUser'
    );
  }

  async assignToUsers(
    userIds: string[],
    resourceType: 'quiz' | 'lecture' | 'template',
    resourceId: number,
    assignedBy: string,
    tenantId: number,
    dueDate?: Date,
    notes?: string
  ): Promise<import('@shared/schema').Assignment[]> {
    return this.executeStorageOperation(
      (s) =>
        s.assignToUsers(userIds, resourceType, resourceId, assignedBy, tenantId, dueDate, notes),
      'assignToUsers'
    );
  }

  async unassignUser(assignmentId: string): Promise<void> {
    return this.executeStorageOperation((s) => s.unassignUser(assignmentId), 'unassignUser');
  }

  async getUserAssignments(
    userId: string,
    tenantId: number,
    resourceType?: 'quiz' | 'lecture' | 'template',
    status?: import('@shared/schema').AssignmentStatus
  ): Promise<import('@shared/schema').Assignment[]> {
    return this.executeStorageOperation(
      (s) => s.getUserAssignments(userId, tenantId, resourceType, status),
      'getUserAssignments'
    );
  }

  async getResourceAssignments(
    resourceType: 'quiz' | 'lecture' | 'template',
    resourceId: number
  ): Promise<import('@shared/schema').Assignment[]> {
    return this.executeStorageOperation(
      (s) => s.getResourceAssignments(resourceType, resourceId),
      'getResourceAssignments'
    );
  }

  async updateAssignmentStatus(
    assignmentId: string,
    status: import('@shared/schema').AssignmentStatus,
    score?: number,
    progress?: number
  ): Promise<import('@shared/schema').Assignment> {
    return this.executeStorageOperation(
      (s) => s.updateAssignmentStatus(assignmentId, status, score, progress),
      'updateAssignmentStatus'
    );
  }

  async updateAssignmentProgress(
    assignmentId: string,
    progress: number,
    started?: boolean
  ): Promise<import('@shared/schema').Assignment> {
    return this.executeStorageOperation(
      (s) => s.updateAssignmentProgress(assignmentId, progress, started),
      'updateAssignmentProgress'
    );
  }

  async completeAssignment(
    assignmentId: string,
    score?: number
  ): Promise<import('@shared/schema').Assignment> {
    return this.executeStorageOperation(
      (s) => s.completeAssignment(assignmentId, score),
      'completeAssignment'
    );
  }

  async hasAssignment(
    userId: string,
    resourceType: 'quiz' | 'lecture' | 'template',
    resourceId: number
  ): Promise<boolean> {
    return this.executeStorageOperation(
      (s) => s.hasAssignment(userId, resourceType, resourceId),
      'hasAssignment'
    );
  }

  async sendAssignmentNotification(assignmentId: string): Promise<void> {
    return this.executeStorageOperation(
      (s) => s.sendAssignmentNotification(assignmentId),
      'sendAssignmentNotification'
    );
  }

  async sendAssignmentReminder(assignmentId: string): Promise<void> {
    return this.executeStorageOperation(
      (s) => s.sendAssignmentReminder(assignmentId),
      'sendAssignmentReminder'
    );
  }

  // ==========================================
  // Prerequisite Checking
  // ==========================================

  async checkPrerequisites(
    userId: string,
    prerequisites: {
      quizIds?: number[];
      lectureIds?: number[];
      minimumScores?: Record<number, number>;
    }
  ): Promise<import('@shared/schema').PrerequisiteCheckResult> {
    return this.executeStorageOperation(
      (s) => s.checkPrerequisites(userId, prerequisites),
      'checkPrerequisites'
    );
  }

  async checkAvailability(
    availableFrom?: Date,
    availableUntil?: Date,
    enrollmentDeadline?: Date
  ): Promise<{
    available: boolean;
    canEnroll: boolean;
    reason?: 'not_started' | 'expired' | 'enrollment_closed';
    availableFrom?: Date;
    availableUntil?: Date;
  }> {
    return this.executeStorageOperation(
      (s) => s.checkAvailability(availableFrom, availableUntil, enrollmentDeadline),
      'checkAvailability'
    );
  }

  // Leaderboard methods
  async updateLeaderboardEntry(
    userId: string,
    data: Partial<import('@shared/schema').LeaderboardEntry>,
    tenantId: number = 1
  ): Promise<void> {
    return this.executeStorageOperation(
      (s) => s.updateLeaderboardEntry(userId, data, tenantId),
      'updateLeaderboardEntry'
    );
  }

  async getGlobalLeaderboard(
    limit: number = 100,
    tenantId: number = 1
  ): Promise<import('@shared/schema').LeaderboardEntry[]> {
    return this.executeStorageOperation(
      (s) => s.getGlobalLeaderboard(limit, tenantId),
      'getGlobalLeaderboard'
    );
  }

  async getCategoryLeaderboard(
    categoryId: number,
    limit: number = 100,
    tenantId: number = 1
  ): Promise<import('@shared/schema').LeaderboardEntry[]> {
    return this.executeStorageOperation(
      (s) => s.getCategoryLeaderboard(categoryId, limit, tenantId),
      'getCategoryLeaderboard'
    );
  }

  async getWeeklyLeaderboard(
    limit: number = 100,
    tenantId: number = 1
  ): Promise<import('@shared/schema').LeaderboardEntry[]> {
    return this.executeStorageOperation(
      (s) => s.getWeeklyLeaderboard(limit, tenantId),
      'getWeeklyLeaderboard'
    );
  }

  async getMonthlyLeaderboard(
    limit: number = 100,
    tenantId: number = 1
  ): Promise<import('@shared/schema').LeaderboardEntry[]> {
    return this.executeStorageOperation(
      (s) => s.getMonthlyLeaderboard(limit, tenantId),
      'getMonthlyLeaderboard'
    );
  }

  async getUserRank(userId: string, tenantId: number = 1): Promise<number> {
    return this.executeStorageOperation((s) => s.getUserRank(userId, tenantId), 'getUserRank');
  }
}

// Export the storage router as the default storage interface
export const storage = new StorageRouter();

// For backward compatibility, also export as default
export default storage;
