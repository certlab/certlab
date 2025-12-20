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

/**
 * Storage mode type - now always 'cloud' (Firestore)
 */
export type StorageMode = 'cloud';

/**
 * Current storage mode - always cloud (Firestore)
 */
const currentMode: StorageMode = 'cloud';

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
  return currentMode;
}

/**
 * Set the storage mode
 * @param mode The storage mode to use (only 'cloud' is supported)
 */
export async function setStorageMode(mode: StorageMode): Promise<void> {
  try {
    if (!firestoreAvailable) {
      throw new Error('Firestore is not available - this is required for the application');
    }

    const firebaseUser = getCurrentFirebaseUser();
    if (!firebaseUser) {
      console.warn('[Storage Factory] No Firebase user - user must sign in with Google');
      return;
    }

    await firestoreStorage.setCurrentUserId(firebaseUser.uid);
    console.log('[Storage Factory] Storage mode set to: cloud (Firestore)');
  } catch (error) {
    logError('setStorageMode', error, { mode });
    throw error; // Re-throw since Firestore is mandatory
  }
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
   * Execute an operation with Firestore
   */
  private async executeOperation<T>(
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
    return this.executeOperation((s) => s.getCurrentUserId(), 'getCurrentUserId');
  }

  async setCurrentUserId(userId: string): Promise<void> {
    // Only set in Firestore (now the single source of truth)
    return this.executeOperation((s) => s.setCurrentUserId(userId), 'setCurrentUserId');
  }

  async clearCurrentUser(): Promise<void> {
    // Only clear from Firestore
    if (firestoreAvailable) {
      await firestoreStorage.clearCurrentUser();
    }
  }

  async getAllUsers(): Promise<any[]> {
    return this.executeOperation((s) => s.getAllUsers(), 'getAllUsers');
  }

  // ==========================================
  // Tenant Management
  // ==========================================

  async getTenants(): Promise<any[]> {
    return this.executeOperation((s) => s.getTenants(), 'getTenants');
  }

  async getTenant(id: number): Promise<any> {
    return this.executeOperation((s) => s.getTenant(id), 'getTenant');
  }

  async createTenant(tenant: any): Promise<any> {
    return this.executeOperation((s) => s.createTenant(tenant), 'createTenant');
  }

  async updateTenant(id: number, updates: any): Promise<any> {
    return this.executeOperation((s) => s.updateTenant(id, updates), 'updateTenant');
  }

  async getUsersByTenant(tenantId: number): Promise<any[]> {
    return this.executeOperation((s) => s.getUsersByTenant(tenantId), 'getUsersByTenant');
  }

  // ==========================================
  // User Management
  // ==========================================

  async getUser(id: string): Promise<any> {
    return this.executeOperation((s) => s.getUser(id), 'getUser');
  }

  async getUserById(id: string): Promise<any> {
    return this.executeOperation((s) => s.getUserById(id), 'getUserById');
  }

  async getUserByEmail(email: string): Promise<any> {
    return this.executeOperation((s) => s.getUserByEmail(email), 'getUserByEmail');
  }

  async createUser(user: any): Promise<any> {
    return this.executeOperation((s) => s.createUser(user), 'createUser');
  }

  async updateUser(id: string, updates: any): Promise<any> {
    return this.executeOperation((s) => s.updateUser(id, updates), 'updateUser');
  }

  async updateUserGoals(id: string, goals: any): Promise<any> {
    return this.executeOperation((s) => s.updateUserGoals(id, goals), 'updateUserGoals');
  }

  // ==========================================
  // Categories
  // ==========================================

  async getCategories(tenantId?: number): Promise<any[]> {
    return this.executeOperation((s) => s.getCategories(tenantId), 'getCategories');
  }

  async createCategory(category: any): Promise<any> {
    return this.executeOperation((s) => s.createCategory(category), 'createCategory');
  }

  async updateCategory(id: number, updates: any): Promise<any> {
    return this.executeOperation((s) => s.updateCategory(id, updates), 'updateCategory');
  }

  async deleteCategory(id: number): Promise<void> {
    return this.executeOperation((s) => s.deleteCategory(id), 'deleteCategory');
  }

  // ==========================================
  // Subcategories
  // ==========================================

  async getSubcategories(categoryId?: number, tenantId?: number): Promise<any[]> {
    return this.executeOperation(
      (s) => s.getSubcategories(categoryId, tenantId),
      'getSubcategories'
    );
  }

  async createSubcategory(subcategory: any): Promise<any> {
    return this.executeOperation((s) => s.createSubcategory(subcategory), 'createSubcategory');
  }

  async updateSubcategory(id: number, updates: any): Promise<any> {
    return this.executeOperation((s) => s.updateSubcategory(id, updates), 'updateSubcategory');
  }

  async deleteSubcategory(id: number): Promise<void> {
    return this.executeOperation((s) => s.deleteSubcategory(id), 'deleteSubcategory');
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
    return this.executeOperation(
      (s) => s.getQuestionsByCategories(categoryIds, subcategoryIds, difficultyLevels, tenantId),
      'getQuestionsByCategories'
    );
  }

  async getQuestion(id: number): Promise<any> {
    return this.executeOperation((s) => s.getQuestion(id), 'getQuestion');
  }

  async createQuestion(question: any): Promise<any> {
    return this.executeOperation((s) => s.createQuestion(question), 'createQuestion');
  }

  async updateQuestion(id: number, updates: any): Promise<any> {
    return this.executeOperation((s) => s.updateQuestion(id, updates), 'updateQuestion');
  }

  async deleteQuestion(id: number): Promise<void> {
    return this.executeOperation((s) => s.deleteQuestion(id), 'deleteQuestion');
  }

  async getQuestionsByTenant(tenantId: number): Promise<any[]> {
    return this.executeOperation((s) => s.getQuestionsByTenant(tenantId), 'getQuestionsByTenant');
  }

  // ==========================================
  // Quizzes
  // ==========================================

  async createQuiz(quiz: any): Promise<any> {
    return this.executeOperation((s) => s.createQuiz(quiz), 'createQuiz');
  }

  async getQuiz(id: number): Promise<any> {
    return this.executeOperation((s) => s.getQuiz(id), 'getQuiz');
  }

  async getUserQuizzes(userId: string, tenantId?: number): Promise<any[]> {
    return this.executeOperation((s) => s.getUserQuizzes(userId, tenantId), 'getUserQuizzes');
  }

  async updateQuiz(id: number, updates: any): Promise<any> {
    return this.executeOperation((s) => s.updateQuiz(id, updates), 'updateQuiz');
  }

  async getQuizQuestions(quizId: number): Promise<any[]> {
    return this.executeOperation((s) => s.getQuizQuestions(quizId), 'getQuizQuestions');
  }

  async submitQuiz(quizId: number, answers: any[]): Promise<any> {
    return this.executeOperation((s) => s.submitQuiz(quizId, answers), 'submitQuiz');
  }

  // ==========================================
  // User Progress
  // ==========================================

  async getUserProgress(userId: string, tenantId?: number): Promise<any[]> {
    return this.executeOperation((s) => s.getUserProgress(userId, tenantId), 'getUserProgress');
  }

  async updateUserProgress(
    userId: string,
    categoryId: number,
    progress: any,
    tenantId?: number
  ): Promise<any> {
    return this.executeOperation(
      (s) => s.updateUserProgress(userId, categoryId, progress, tenantId),
      'updateUserProgress'
    );
  }

  async getUserStats(userId: string, tenantId?: number): Promise<any> {
    return this.executeOperation((s) => s.getUserStats(userId, tenantId), 'getUserStats');
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
    return this.executeOperation(
      (s) => s.createLecture(userId, quizId, title, content, topics, categoryId, tenantId),
      'createLecture'
    );
  }

  async getUserLectures(userId: string, tenantId?: number): Promise<any[]> {
    return this.executeOperation((s) => s.getUserLectures(userId, tenantId), 'getUserLectures');
  }

  async getLecture(id: number): Promise<any> {
    return this.executeOperation((s) => s.getLecture(id), 'getLecture');
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
    return this.executeOperation(
      (s) => s.updateMasteryScore(userId, categoryId, subcategoryId, isCorrect),
      'updateMasteryScore'
    );
  }

  async getUserMasteryScores(userId: string, tenantId?: number): Promise<any[]> {
    return this.executeOperation(
      (s) => s.getUserMasteryScores(userId, tenantId),
      'getUserMasteryScores'
    );
  }

  async calculateOverallMasteryScore(userId: string, tenantId?: number): Promise<number> {
    return this.executeOperation(
      (s) => s.calculateOverallMasteryScore(userId, tenantId),
      'calculateOverallMasteryScore'
    );
  }

  async getCertificationMasteryScores(userId: string, tenantId?: number): Promise<any[]> {
    return this.executeOperation(
      (s) => s.getCertificationMasteryScores(userId, tenantId),
      'getCertificationMasteryScores'
    );
  }

  // ==========================================
  // Badges
  // ==========================================

  async getBadges(): Promise<any[]> {
    return this.executeOperation((s) => s.getBadges(), 'getBadges');
  }

  async getUserBadges(userId: string, tenantId?: number): Promise<any[]> {
    return this.executeOperation((s) => s.getUserBadges(userId, tenantId), 'getUserBadges');
  }

  async createUserBadge(userBadge: any): Promise<any> {
    return this.executeOperation((s) => s.createUserBadge(userBadge), 'createUserBadge');
  }

  async updateUserBadge(id: number, updates: any): Promise<any> {
    return this.executeOperation((s) => s.updateUserBadge(id, updates), 'updateUserBadge');
  }

  // ==========================================
  // Game Stats
  // ==========================================

  async getUserGameStats(userId: string): Promise<any> {
    return this.executeOperation((s) => s.getUserGameStats(userId), 'getUserGameStats');
  }

  async updateUserGameStats(userId: string, updates: any): Promise<any> {
    return this.executeOperation(
      (s) => s.updateUserGameStats(userId, updates),
      'updateUserGameStats'
    );
  }

  // ==========================================
  // Challenges
  // ==========================================

  async getChallenges(userId?: string): Promise<any[]> {
    return this.executeOperation((s) => s.getChallenges(userId), 'getChallenges');
  }

  async getChallenge(id: number): Promise<any> {
    return this.executeOperation((s) => s.getChallenge(id), 'getChallenge');
  }

  async createChallenge(challenge: any): Promise<any> {
    return this.executeOperation((s) => s.createChallenge(challenge), 'createChallenge');
  }

  async getChallengeAttempts(userId: string): Promise<any[]> {
    return this.executeOperation((s) => s.getChallengeAttempts(userId), 'getChallengeAttempts');
  }

  async createChallengeAttempt(attempt: any): Promise<any> {
    return this.executeOperation(
      (s) => s.createChallengeAttempt(attempt),
      'createChallengeAttempt'
    );
  }

  // ==========================================
  // Study Groups
  // ==========================================

  async getStudyGroups(): Promise<any[]> {
    return this.executeOperation((s) => s.getStudyGroups(), 'getStudyGroups');
  }

  async getStudyGroup(id: number): Promise<any> {
    return this.executeOperation((s) => s.getStudyGroup(id), 'getStudyGroup');
  }

  async createStudyGroup(group: any): Promise<any> {
    return this.executeOperation((s) => s.createStudyGroup(group), 'createStudyGroup');
  }

  async getUserStudyGroups(userId: string): Promise<any[]> {
    return this.executeOperation((s) => s.getUserStudyGroups(userId), 'getUserStudyGroups');
  }

  async joinStudyGroup(userId: string, groupId: number): Promise<any> {
    return this.executeOperation((s) => s.joinStudyGroup(userId, groupId), 'joinStudyGroup');
  }

  async leaveStudyGroup(userId: string, groupId: number): Promise<void> {
    return this.executeOperation((s) => s.leaveStudyGroup(userId, groupId), 'leaveStudyGroup');
  }

  // ==========================================
  // Practice Tests
  // ==========================================

  async getPracticeTests(): Promise<any[]> {
    return this.executeOperation((s) => s.getPracticeTests(), 'getPracticeTests');
  }

  async getPracticeTest(id: number): Promise<any> {
    return this.executeOperation((s) => s.getPracticeTest(id), 'getPracticeTest');
  }

  async createPracticeTest(test: any): Promise<any> {
    return this.executeOperation((s) => s.createPracticeTest(test), 'createPracticeTest');
  }

  async getPracticeTestAttempts(userId: string, testId?: number): Promise<any[]> {
    return this.executeOperation(
      (s) => s.getPracticeTestAttempts(userId, testId),
      'getPracticeTestAttempts'
    );
  }

  async createPracticeTestAttempt(attempt: any): Promise<any> {
    return this.executeOperation(
      (s) => s.createPracticeTestAttempt(attempt),
      'createPracticeTestAttempt'
    );
  }

  async updatePracticeTestAttempt(id: number, updates: any): Promise<any> {
    return this.executeOperation(
      (s) => s.updatePracticeTestAttempt(id, updates),
      'updatePracticeTestAttempt'
    );
  }

  // ==========================================
  // Token Management
  // ==========================================

  async getUserTokenBalance(userId: string): Promise<number> {
    return this.executeOperation((s) => s.getUserTokenBalance(userId), 'getUserTokenBalance');
  }

  async addTokens(userId: string, amount: number): Promise<number> {
    return this.executeOperation((s) => s.addTokens(userId, amount), 'addTokens');
  }

  async consumeTokens(userId: string, amount: number): Promise<any> {
    return this.executeOperation((s) => s.consumeTokens(userId, amount), 'consumeTokens');
  }

  calculateQuizTokenCost(questionCount: number): number {
    return this.getActiveStorage().calculateQuizTokenCost(questionCount);
  }

  // ==========================================
  // Data Management
  // ==========================================

  async exportData(): Promise<string> {
    return this.executeOperation((s) => s.exportData(), 'exportData');
  }

  async importData(jsonData: string): Promise<void> {
    return this.executeOperation((s) => s.importData(jsonData), 'importData');
  }

  async clearAllData(): Promise<void> {
    return this.executeOperation((s) => s.clearAllData(), 'clearAllData');
  }
}

// Export the storage router as the default storage interface
export const storage = new StorageRouter();

// For backward compatibility, also export as default
export default storage;
