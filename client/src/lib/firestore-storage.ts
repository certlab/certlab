/**
 * Firestore Storage Adapter
 *
 * Implements the IClientStorage interface using Cloud Firestore as the backend.
 * This adapter enables cloud sync and multi-device data access for CertLab.
 *
 * ## Architecture
 *
 * - **Per-user collections**: Data stored under `/users/{userId}/{collection}`
 * - **Shared content**: Categories, questions, badges stored in top-level collections
 * - **Offline support**: Firestore SDK provides automatic offline persistence
 * - **Security**: Firestore rules enforce per-user data isolation
 *
 * ## Usage
 *
 * ```typescript
 * import { firestoreStorage } from './firestore-storage';
 *
 * // Initialize (done by storage factory)
 * await firestoreStorage.initialize();
 *
 * // Use like any storage adapter
 * const quizzes = await firestoreStorage.getUserQuizzes(userId);
 * ```
 *
 * @module firestore-storage
 */

import {
  getFirestoreInstance,
  getUserDocument,
  getUserDocuments,
  setUserDocument,
  updateUserDocument,
  deleteUserDocument,
  getUserSubcollectionDocument,
  getUserSubcollectionDocuments,
  setUserSubcollectionDocument,
  getSharedDocument,
  getSharedDocuments,
  setSharedDocument,
  getUserProfile,
  setUserProfile,
  updateUserProfile,
  Timestamp,
  timestampToDate,
  where,
  orderBy,
} from './firestore-service';
import {
  getFirestore,
  collection,
  doc as firestoreDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  limit,
} from 'firebase/firestore';
import { logError, logInfo } from './errors';
import { deleteDoc } from 'firebase/firestore';
import { sanitizeInput, sanitizeArray } from './sanitize';
import { insertQuestionSchema, insertCategorySchema } from '@shared/schema';
import type {
  Tenant,
  User,
  Category,
  Subcategory,
  Question,
  Quiz,
  QuizVersion,
  QuizTemplate,
  UserProgress,
  MasteryScore,
  Badge,
  UserBadge,
  UserGameStats,
  Challenge,
  ChallengeAttempt,
  StudyGroup,
  StudyGroupMember,
  PracticeTest,
  PracticeTestAttempt,
  InsertCategory,
  InsertSubcategory,
  InsertQuestion,
  InsertUserProgress,
  Lecture,
  Quest,
  UserQuestProgress,
  UserTitle,
  UserDailyReward,
  DailyReward,
  StudyTimerSession,
  StudyTimerSettings,
  StudyTimerStats,
  Product,
  InsertProduct,
  Purchase,
  InsertPurchase,
  Group,
  GroupMember,
  Certificate,
  CertificateTemplate,
} from '@shared/schema';
import type {
  IClientStorage,
  UserStatsResult,
  UserGoals,
  CertificationMasteryScore,
} from '@shared/storage-interface';

/**
 * Generates a unique identifier
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Generates a 32-bit safe numeric ID for all entities with numeric IDs.
 * Schema validation enforces 32-bit integer limit (max value 2^31-1 = 2147483647).
 * Uses a sequential counter that stays within the 32-bit range.
 *
 * Note: This is client-side code that runs in a single-threaded environment.
 * Firestore document IDs (stored as strings) provide the primary uniqueness guarantees.
 *
 * The counter is seeded using a combination of the current timestamp and randomness
 * to reduce the probability of collisions across different application instances.
 * The counter then increments and wraps within the 1-2147483647 range, skipping 0.
 *
 * HMR behavior:
 * - The counter is initialized at module load time.
 * - During development with Vite Hot Module Replacement (HMR), this module may be
 *   reloaded multiple times without a full page refresh, resetting the counter to a
 *   new starting point each time.
 * - As a result, numeric IDs generated across different HMR reloads within the same
 *   browser session may collide.
 *
 * This helper is suitable for development and moderate client-side usage where
 * Firestore document IDs are the source of truth for uniqueness. For production
 * systems that require globally unique, high-volume numeric IDs, use a more robust
 * approach (for example, database sequences or distributed ID generation).
 *
 * Callers must not assume that `generateSafeNumericId()` yields globally unique
 * values across all application instances and over unbounded lifetimes.
 */
const MAX_32BIT_INT = 2147483647;

// Seed the counter using timestamp + randomness, masked into the 32-bit range.
const INITIAL_ID_SEED = (Date.now() & MAX_32BIT_INT) ^ Math.floor(Math.random() * MAX_32BIT_INT);

let idCounter = INITIAL_ID_SEED === 0 ? 1 : INITIAL_ID_SEED;

export function generateSafeNumericId(): number {
  // Simple incrementing counter that stays within 32-bit range.
  // Wraps around directly from MAX_32BIT_INT to 1, returning values in the range 1-2147483647
  idCounter = idCounter >= MAX_32BIT_INT ? 1 : idCounter + 1;

  return idCounter;
}

/**
 * Convert resource type to plural collection name
 */
function getCollectionName(resourceType: 'lecture' | 'quiz' | 'material'): string {
  switch (resourceType) {
    case 'lecture':
      return 'lectures';
    case 'quiz':
      return 'quizzes';
    case 'material':
      return 'materials';
  }
}

/**
 * Convert Firestore timestamps in an object to Dates
 */
function convertTimestamps<T>(obj: any): T {
  if (!obj) return obj;

  const result = { ...obj };
  for (const key in result) {
    if (result[key] instanceof Timestamp) {
      result[key] = timestampToDate(result[key]);
    }
  }
  return result as T;
}

/**
 * Firestore Storage implementation
 */
class FirestoreStorage implements IClientStorage {
  private currentUserId: string | null = null;

  // ==========================================
  // Session Management
  // ==========================================

  async getCurrentUserId(): Promise<string | null> {
    return this.currentUserId;
  }

  async setCurrentUserId(userId: string): Promise<void> {
    this.currentUserId = userId;
  }

  async clearCurrentUser(): Promise<void> {
    this.currentUserId = null;
  }

  async getAllUsers(): Promise<User[]> {
    try {
      // Get all user profile documents
      const users = await getSharedDocuments<User>('users');
      return users.map((user) => convertTimestamps<User>(user));
    } catch (error) {
      logError('getAllUsers', error);
      return [];
    }
  }

  /**
   * Get all quizzes across all users (admin only)
   * This is used for reporting and analytics
   */
  async getAllQuizzes(): Promise<Quiz[]> {
    try {
      // For admin reporting, we would need to query across all users
      // Since Firestore stores quizzes per user, we need to get all users first
      // then fetch their quizzes
      const users = await this.getAllUsers();
      const allQuizzes: Quiz[] = [];

      for (const user of users) {
        const userQuizzes = await this.getUserQuizzes(user.id, user.tenantId || 1);
        allQuizzes.push(...userQuizzes);
      }

      return allQuizzes;
    } catch (error) {
      logError('getAllQuizzes', error);
      return [];
    }
  }

  /**
   * Get all mastery scores across all users (admin only)
   * This is used for reporting and analytics
   */
  async getAllMasteryScores(): Promise<MasteryScore[]> {
    try {
      // For admin reporting, we need to query across all users
      const users = await this.getAllUsers();
      const allScores: MasteryScore[] = [];

      for (const user of users) {
        const userScores = await this.getUserMasteryScores(user.id, user.tenantId || 1);
        allScores.push(...userScores);
      }

      return allScores;
    } catch (error) {
      logError('getAllMasteryScores', error);
      return [];
    }
  }

  // ==========================================
  // Tenant Management
  // ==========================================

  async getTenants(): Promise<Tenant[]> {
    try {
      const tenants = await getSharedDocuments<Tenant>('tenants');
      return tenants.map((tenant) => convertTimestamps<Tenant>(tenant));
    } catch (error) {
      logError('getTenants', error);
      return [];
    }
  }

  async getTenant(id: number): Promise<Tenant | undefined> {
    try {
      const tenant = await getSharedDocument<Tenant>('tenants', id.toString());
      return tenant ? convertTimestamps(tenant) : undefined;
    } catch (error) {
      logError('getTenant', error, { id });
      return undefined;
    }
  }

  async createTenant(tenant: Partial<Tenant>): Promise<Tenant> {
    try {
      // Use safe numeric ID generator to avoid exceeding 32-bit integer limit
      const id = generateSafeNumericId();
      const newTenant: Tenant = {
        id,
        name: tenant.name || 'New Tenant',
        isActive: tenant.isActive ?? true,
        createdAt: new Date(),
        ...tenant,
      } as Tenant;

      await setSharedDocument('tenants', id.toString(), newTenant);
      return convertTimestamps(newTenant);
    } catch (error) {
      logError('createTenant', error, { tenant });
      throw error;
    }
  }

  async updateTenant(id: number, updates: Partial<Tenant>): Promise<Tenant | null> {
    try {
      const tenant = await this.getTenant(id);
      if (!tenant) return null;

      const updated = { ...tenant, ...updates };
      await setSharedDocument('tenants', id.toString(), updated);
      return convertTimestamps(updated);
    } catch (error) {
      logError('updateTenant', error, { id, updates });
      throw error;
    }
  }

  async getUsersByTenant(tenantId: number): Promise<User[]> {
    try {
      const allUsers = await this.getAllUsers();
      return allUsers.filter((u) => u.tenantId === tenantId);
    } catch (error) {
      logError('getUsersByTenant', error, { tenantId });
      return [];
    }
  }

  // ==========================================
  // User Management
  // ==========================================

  async getUser(id: string): Promise<User | undefined> {
    try {
      const user = await getUserProfile(id);
      return user ? convertTimestamps(user as User) : undefined;
    } catch (error) {
      // Don't log permission denied errors - this is expected when user doesn't exist yet
      // (first-time sign-up scenario)
      const { isFirestorePermissionError } = await import('./firebase-utils');
      if (!isFirestorePermissionError(error)) {
        logError('getUser', error, { id });
      }
      return undefined;
    }
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const users = await this.getAllUsers();
      return users.find((u) => u.email === email);
    } catch (error) {
      logError('getUserByEmail', error, { email });
      return undefined;
    }
  }

  async createUser(user: Partial<User>): Promise<User> {
    try {
      const id = user.id || generateId();
      const newUser: User = {
        id,
        email: user.email || '',
        passwordHash: user.passwordHash || '',
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        profileImageUrl: user.profileImageUrl || null,
        role: user.role || 'user',
        tenantId: user.tenantId || 1,
        certificationGoals: user.certificationGoals || [],
        studyPreferences: user.studyPreferences || null,
        skillsAssessment: user.skillsAssessment || null,
        createdAt: new Date(),
        ...user,
      } as User;

      await setUserProfile(id, newUser);
      return convertTimestamps(newUser);
    } catch (error) {
      logError('createUser', error, { user });
      throw error;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    try {
      await updateUserProfile(id, updates);
      return (await this.getUser(id)) || null;
    } catch (error) {
      logError('updateUser', error, { id, updates });
      throw error;
    }
  }

  async updateUserGoals(id: string, goals: UserGoals): Promise<User | null> {
    try {
      await updateUserProfile(id, {
        certificationGoals: goals.certificationGoals,
        studyPreferences: goals.studyPreferences,
        skillsAssessment: goals.skillsAssessment,
      });
      return (await this.getUser(id)) || null;
    } catch (error) {
      logError('updateUserGoals', error, { id, goals });
      throw error;
    }
  }

  // ==========================================
  // Categories
  // ==========================================

  async getCategories(tenantId?: number): Promise<Category[]> {
    try {
      const categories = await getSharedDocuments<Category>('categories');
      const filtered = tenantId ? categories.filter((c) => c.tenantId === tenantId) : categories;
      return filtered.map((cat) => convertTimestamps<Category>(cat));
    } catch (error) {
      logError('getCategories', error, { tenantId });
      return [];
    }
  }

  async createCategory(category: Partial<Category>): Promise<Category> {
    try {
      // Sanitize inputs
      const sanitizedName = sanitizeInput(category.name || '', 200);
      const sanitizedDescription = category.description
        ? sanitizeInput(category.description, 2000)
        : null;
      const sanitizedIcon = category.icon ? sanitizeInput(category.icon, 100) : null;

      // Validate with Zod schema
      const validationData = {
        tenantId: category.tenantId || 1,
        name: sanitizedName,
        description: sanitizedDescription,
        icon: sanitizedIcon,
      };

      const validationResult = insertCategorySchema.safeParse(validationData);
      if (!validationResult.success) {
        const errors = validationResult.error.issues
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join('; ');
        throw new Error(`Category validation failed: ${errors}`);
      }

      // Use safe numeric ID generator to avoid exceeding 32-bit integer limit
      const id = generateSafeNumericId();
      const newCategory: Category = {
        ...category,
        id,
        name: sanitizedName,
        description: sanitizedDescription,
        tenantId: category.tenantId || 1,
        icon: sanitizedIcon,
        createdAt: new Date(),
      } as Category;

      await setSharedDocument('categories', id.toString(), newCategory);
      return convertTimestamps(newCategory);
    } catch (error) {
      logError('createCategory', error, { category });
      throw error;
    }
  }

  async updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category> {
    try {
      const category = await getSharedDocument<Category>('categories', id.toString());
      if (!category) throw new Error('Category not found');

      const updated = { ...category, ...updates };
      await setSharedDocument('categories', id.toString(), updated);
      return convertTimestamps(updated);
    } catch (error) {
      logError('updateCategory', error, { id, updates });
      throw error;
    }
  }

  async deleteCategory(id: number): Promise<void> {
    try {
      const db = getFirestoreInstance();
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'categories', id.toString()));
    } catch (error) {
      logError('deleteCategory', error, { id });
      throw error;
    }
  }

  // ==========================================
  // Subcategories
  // ==========================================

  async getSubcategories(categoryId?: number, tenantId?: number): Promise<Subcategory[]> {
    try {
      const subcategories = await getSharedDocuments<Subcategory>('subcategories');
      let filtered = subcategories;

      if (categoryId !== undefined) {
        filtered = filtered.filter((s) => s.categoryId === categoryId);
      }
      if (tenantId !== undefined) {
        filtered = filtered.filter((s) => s.tenantId === tenantId);
      }

      return filtered.map((sub) => convertTimestamps<Subcategory>(sub));
    } catch (error) {
      logError('getSubcategories', error, { categoryId, tenantId });
      return [];
    }
  }

  async createSubcategory(subcategory: Partial<Subcategory>): Promise<Subcategory> {
    try {
      // Use safe numeric ID generator to avoid exceeding 32-bit integer limit
      const id = generateSafeNumericId();
      const newSubcategory: Subcategory = {
        id,
        name: subcategory.name || '',
        categoryId: subcategory.categoryId || 0,
        tenantId: subcategory.tenantId || 1,
        createdAt: new Date(),
        ...subcategory,
      } as Subcategory;

      await setSharedDocument('subcategories', id.toString(), newSubcategory);
      return convertTimestamps(newSubcategory);
    } catch (error) {
      logError('createSubcategory', error, { subcategory });
      throw error;
    }
  }

  async updateSubcategory(id: number, updates: Partial<InsertSubcategory>): Promise<Subcategory> {
    try {
      const subcategory = await getSharedDocument<Subcategory>('subcategories', id.toString());
      if (!subcategory) throw new Error('Subcategory not found');

      const updated = { ...subcategory, ...updates };
      await setSharedDocument('subcategories', id.toString(), updated);
      return convertTimestamps(updated);
    } catch (error) {
      logError('updateSubcategory', error, { id, updates });
      throw error;
    }
  }

  async deleteSubcategory(id: number): Promise<void> {
    try {
      const db = getFirestoreInstance();
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'subcategories', id.toString()));
    } catch (error) {
      logError('deleteSubcategory', error, { id });
      throw error;
    }
  }

  // ==========================================
  // Questions
  // ==========================================

  async getQuestionsByCategories(
    categoryIds: number[],
    subcategoryIds?: number[],
    difficultyLevels?: number[],
    tenantId?: number
  ): Promise<Question[]> {
    try {
      const allQuestions = await getSharedDocuments<Question>('questions');
      let filtered = allQuestions.filter((q) => categoryIds.includes(q.categoryId));

      if (subcategoryIds && subcategoryIds.length > 0) {
        filtered = filtered.filter(
          (q) => q.subcategoryId && subcategoryIds.includes(q.subcategoryId)
        );
      }
      if (difficultyLevels && difficultyLevels.length > 0) {
        filtered = filtered.filter(
          (q) => q.difficultyLevel !== null && difficultyLevels.includes(q.difficultyLevel)
        );
      }
      if (tenantId !== undefined) {
        filtered = filtered.filter((q) => q.tenantId === tenantId);
      }

      return filtered.map((q) => convertTimestamps<Question>(q));
    } catch (error) {
      logError('getQuestionsByCategories', error, { categoryIds });
      return [];
    }
  }

  async getQuestion(id: number): Promise<Question | undefined> {
    try {
      const question = await getSharedDocument<Question>('questions', id.toString());
      return question ? convertTimestamps(question) : undefined;
    } catch (error) {
      logError('getQuestion', error, { id });
      return undefined;
    }
  }

  async createQuestion(question: Partial<Question>): Promise<Question> {
    try {
      // Sanitize inputs
      const sanitizedText = sanitizeInput(question.text || '', 2000);
      const sanitizedExplanation = question.explanation
        ? sanitizeInput(question.explanation, 5000)
        : null;
      const sanitizedOptions =
        question.options?.map((opt) => ({
          ...opt,
          text: sanitizeInput(opt.text, 1000),
        })) || [];
      const sanitizedTags = question.tags ? sanitizeArray(question.tags as string[], 50) : [];

      // Validate with Zod schema
      const validationData = {
        tenantId: question.tenantId || 1,
        categoryId: question.categoryId,
        subcategoryId: question.subcategoryId,
        text: sanitizedText,
        options: sanitizedOptions,
        correctAnswer: question.correctAnswer,
        explanation: sanitizedExplanation,
        difficultyLevel: question.difficultyLevel,
        tags: sanitizedTags.length > 0 ? sanitizedTags : null,
      };

      const validationResult = insertQuestionSchema.safeParse(validationData);
      if (!validationResult.success) {
        const errors = validationResult.error.issues
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join('; ');
        throw new Error(`Question validation failed: ${errors}`);
      }

      // Use safe numeric ID generator to avoid exceeding 32-bit integer limit
      const id = generateSafeNumericId();
      const newQuestion: Question = {
        ...question,
        id,
        text: sanitizedText,
        options: sanitizedOptions,
        correctAnswer: question.correctAnswer || 0,
        explanation: sanitizedExplanation,
        categoryId: question.categoryId || 0,
        subcategoryId: question.subcategoryId || null,
        difficultyLevel: question.difficultyLevel || 1,
        tenantId: question.tenantId || 1,
        tags: sanitizedTags.length > 0 ? sanitizedTags : [],
      } as Question;

      await setSharedDocument('questions', id.toString(), newQuestion);
      return convertTimestamps(newQuestion);
    } catch (error) {
      logError('createQuestion', error, { question });
      throw error;
    }
  }

  async updateQuestion(id: number, updates: Partial<InsertQuestion>): Promise<Question> {
    try {
      const question = await getSharedDocument<Question>('questions', id.toString());
      if (!question) throw new Error('Question not found');

      const updated = { ...question, ...updates };
      await setSharedDocument('questions', id.toString(), updated);
      return convertTimestamps(updated);
    } catch (error) {
      logError('updateQuestion', error, { id, updates });
      throw error;
    }
  }

  async deleteQuestion(id: number): Promise<void> {
    try {
      const db = getFirestoreInstance();
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'questions', id.toString()));
    } catch (error) {
      logError('deleteQuestion', error, { id });
      throw error;
    }
  }

  async getQuestionsByTenant(tenantId: number): Promise<Question[]> {
    try {
      const questions = await getSharedDocuments<Question>('questions');
      return questions
        .filter((q) => q.tenantId === tenantId)
        .map((q) => convertTimestamps<Question>(q));
    } catch (error) {
      logError('getQuestionsByTenant', error, { tenantId });
      return [];
    }
  }

  // ==========================================
  // Personal Questions (User-specific)
  // ==========================================

  /**
   * Get user's personal questions
   */
  async getPersonalQuestions(userId: string): Promise<Question[]> {
    try {
      const questions = await getUserDocuments<Question>(userId, 'personalQuestions');
      return questions.map((q) => convertTimestamps<Question>(q));
    } catch (error) {
      logError('getPersonalQuestions', error, { userId });
      return [];
    }
  }

  /**
   * Get user's personal categories
   */
  async getPersonalCategories(userId: string): Promise<Category[]> {
    try {
      const categories = await getUserDocuments<Category>(userId, 'personalCategories');
      return categories.map((c) => convertTimestamps<Category>(c));
    } catch (error) {
      logError('getPersonalCategories', error, { userId });
      return [];
    }
  }

  /**
   * Create a personal category for the user
   */
  async createPersonalCategory(userId: string, category: Partial<Category>): Promise<Category> {
    try {
      const id = generateSafeNumericId();
      const newCategory: Category = {
        id,
        name: category.name || '',
        description: category.description || null,
        tenantId: category.tenantId || 1,
        icon: category.icon || null,
        createdAt: new Date(),
      } as Category;

      await setUserDocument(userId, 'personalCategories', id.toString(), newCategory);
      return convertTimestamps(newCategory);
    } catch (error) {
      logError('createPersonalCategory', error, { userId, category });
      throw error;
    }
  }

  /**
   * Get user's personal subcategories for a category
   */
  async getPersonalSubcategories(userId: string, categoryId: number): Promise<Subcategory[]> {
    try {
      // Use Firestore where() clause instead of client-side filtering
      const subcategories = await getUserDocuments<Subcategory>(userId, 'personalSubcategories', [
        where('categoryId', '==', categoryId),
      ]);
      return subcategories.map((s) => convertTimestamps<Subcategory>(s));
    } catch (error) {
      logError('getPersonalSubcategories', error, { userId, categoryId });
      return [];
    }
  }

  /**
   * Create a personal subcategory for the user
   */
  async createPersonalSubcategory(
    userId: string,
    subcategory: Partial<Subcategory>
  ): Promise<Subcategory> {
    try {
      const id = generateSafeNumericId();
      const newSubcategory: Subcategory = {
        ...subcategory,
        id,
        name: subcategory.name || '',
        categoryId: subcategory.categoryId || 0,
        tenantId: subcategory.tenantId || 1,
        createdAt: new Date(),
      } as Subcategory;

      await setUserDocument(userId, 'personalSubcategories', id.toString(), newSubcategory);
      return convertTimestamps(newSubcategory);
    } catch (error) {
      logError('createPersonalSubcategory', error, { userId, subcategory });
      throw error;
    }
  }

  /**
   * Create a personal question for the user
   */
  async createPersonalQuestion(userId: string, question: Partial<Question>): Promise<Question> {
    try {
      // Sanitize inputs
      const sanitizedText = sanitizeInput(question.text || '', 2000);
      const sanitizedExplanation = question.explanation
        ? sanitizeInput(question.explanation, 5000)
        : null;
      const sanitizedOptions =
        question.options?.map((opt) => ({
          ...opt,
          text: sanitizeInput(opt.text, 1000),
        })) || [];
      const sanitizedTags = question.tags ? sanitizeArray(question.tags as string[], 50) : [];

      // Validate with Zod schema
      const validationData = {
        tenantId: question.tenantId || 1,
        categoryId: question.categoryId,
        subcategoryId: question.subcategoryId,
        text: sanitizedText,
        options: sanitizedOptions,
        correctAnswer: question.correctAnswer,
        explanation: sanitizedExplanation,
        difficultyLevel: question.difficultyLevel,
        tags: sanitizedTags.length > 0 ? sanitizedTags : null,
      };

      const validationResult = insertQuestionSchema.safeParse(validationData);
      if (!validationResult.success) {
        const errors = validationResult.error.issues
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join('; ');
        throw new Error(`Question validation failed: ${errors}`);
      }

      const id = generateSafeNumericId();
      const newQuestion: Question = {
        ...question,
        id,
        text: sanitizedText,
        options: sanitizedOptions,
        correctAnswer: question.correctAnswer || 0,
        explanation: sanitizedExplanation,
        categoryId: question.categoryId || 0,
        subcategoryId: question.subcategoryId || null,
        difficultyLevel: question.difficultyLevel || 1,
        tenantId: question.tenantId || 1,
        tags: sanitizedTags.length > 0 ? sanitizedTags : [],
      } as Question;

      await setUserDocument(userId, 'personalQuestions', id.toString(), newQuestion);
      return convertTimestamps(newQuestion);
    } catch (error) {
      logError('createPersonalQuestion', error, { userId, question });
      throw error;
    }
  }

  /**
   * Delete a personal question
   */
  async deletePersonalQuestion(userId: string, id: number): Promise<void> {
    try {
      await deleteUserDocument(userId, 'personalQuestions', id.toString());
    } catch (error) {
      logError('deletePersonalQuestion', error, { userId, id });
      throw error;
    }
  }

  // ==========================================
  // Quizzes
  // ==========================================

  async createQuiz(quiz: Partial<Quiz>): Promise<Quiz> {
    try {
      const userId = quiz.userId || this.currentUserId;
      if (!userId) throw new Error('User ID required');

      // Use safe numeric ID generator to avoid exceeding 32-bit integer limit
      const id = generateSafeNumericId();
      const newQuiz: Quiz = {
        id,
        userId,
        title: quiz.title || 'Untitled Quiz',
        description: quiz.description || null,
        tags: quiz.tags || null,
        categoryIds: quiz.categoryIds || [],
        subcategoryIds: quiz.subcategoryIds || [],
        questionIds: quiz.questionIds || [],
        questionCount: quiz.questionCount || 0,
        answers: quiz.answers || [],
        score: quiz.score || null,
        totalQuestions: quiz.totalQuestions || 0,
        correctAnswers: quiz.correctAnswers || 0,
        completedAt: quiz.completedAt || null,
        startedAt: new Date(),
        tenantId: quiz.tenantId || 1,
        mode: quiz.mode || 'study',
        difficultyLevel: quiz.difficultyLevel || 1,
        author: quiz.author || userId,
        authorName: quiz.authorName || null,
        prerequisites: quiz.prerequisites || null,
        requireApproval: quiz.requireApproval || false,
        createdAt: new Date(),
        updatedAt: null,
        ...quiz,
      } as Quiz;

      await setUserDocument(userId, 'quizzes', id.toString(), newQuiz);
      return convertTimestamps(newQuiz);
    } catch (error) {
      logError('createQuiz', error, { quiz });
      throw error;
    }
  }

  async getQuiz(id: number): Promise<Quiz | undefined> {
    try {
      const userId = this.currentUserId;
      if (!userId) return undefined;

      const quiz = await getUserDocument<Quiz>(userId, 'quizzes', id.toString());
      return quiz ? convertTimestamps(quiz) : undefined;
    } catch (error) {
      logError('getQuiz', error, { id });
      return undefined;
    }
  }

  async getUserQuizzes(userId: string, tenantId?: number): Promise<Quiz[]> {
    try {
      // Add orderBy for better performance
      const constraints = [orderBy('createdAt', 'desc')];

      // If tenantId provided (including 0), filter on server
      if (tenantId !== undefined && tenantId !== null) {
        constraints.unshift(where('tenantId', '==', tenantId));
      }

      const quizzes = await getUserDocuments<Quiz>(userId, 'quizzes', constraints);
      return quizzes.map((q) => convertTimestamps<Quiz>(q));
    } catch (error) {
      logError('getUserQuizzes', error, { userId, tenantId });
      return [];
    }
  }

  async updateQuiz(id: number, updates: Partial<Quiz>): Promise<Quiz> {
    try {
      const userId = this.currentUserId;
      if (!userId) throw new Error('User ID required');

      // Add updatedAt timestamp
      const updatesWithTimestamp = {
        ...updates,
        updatedAt: new Date(),
      };

      await updateUserDocument(userId, 'quizzes', id.toString(), updatesWithTimestamp);
      const quiz = await this.getQuiz(id);
      if (!quiz) throw new Error('Quiz not found after update');
      return quiz;
    } catch (error) {
      logError('updateQuiz', error, { id, updates });
      throw error;
    }
  }

  async getQuizQuestions(quizId: number): Promise<Question[]> {
    try {
      const quiz = await this.getQuiz(quizId);
      if (!quiz || !quiz.questionIds || (quiz.questionIds as any[]).length === 0) return [];

      const questions = await Promise.all(
        (quiz.questionIds as any[]).map((qId: number) => this.getQuestion(qId))
      );
      return questions.filter((q): q is Question => q !== undefined);
    } catch (error) {
      logError('getQuizQuestions', error, { quizId });
      return [];
    }
  }

  async submitQuiz(
    quizId: number,
    answers: { questionId: number; answer: number | number[] | string | Record<number, number> }[]
  ): Promise<Quiz> {
    try {
      const quiz = await this.getQuiz(quizId);
      if (!quiz) throw new Error('Quiz not found');

      const questions = await this.getQuizQuestions(quizId);
      let correctCount = 0;

      // Import grading function dynamically to avoid circular dependency
      const { gradeQuestion } = await import('./quiz-grading');

      // Calculate weighted score if question weights are configured
      const hasWeights = quiz.questionWeights && Object.keys(quiz.questionWeights).length > 0;
      let totalWeight = 0;
      let earnedWeight = 0;

      for (let i = 0; i < answers.length; i++) {
        const answer = answers[i];
        const question = questions.find((q) => q.id === answer.questionId);
        if (question) {
          const { isCorrect } = gradeQuestion(question, answer.answer);
          if (isCorrect) {
            correctCount++;

            // Add weighted score if weights are configured
            // Weights are stored by question index/order, not by questionId
            if (hasWeights && quiz.questionWeights) {
              const weight = quiz.questionWeights[i] || 1;
              earnedWeight += weight;
            }
          }

          // Track total weight for this question
          if (hasWeights && quiz.questionWeights) {
            const weight = quiz.questionWeights[i] || 1;
            totalWeight += weight;
          }
        }
      }

      // Calculate final score - use weighted if configured, otherwise simple percentage
      const score =
        hasWeights && totalWeight > 0
          ? (earnedWeight / totalWeight) * 100
          : (correctCount / questions.length) * 100;

      // Determine if passing based on passingScore threshold
      const passingThreshold = quiz.passingScore || 70;
      const isPassing = score >= passingThreshold;

      const updates: Partial<Quiz> = {
        answers: answers.map((a) => ({ questionId: a.questionId, selectedAnswer: a.answer })),
        score,
        correctAnswers: correctCount,
        totalQuestions: questions.length,
        completedAt: new Date(),
        isPassing,
      };

      return await this.updateQuiz(quizId, updates);
    } catch (error) {
      logError('submitQuiz', error, { quizId });
      throw error;
    }
  }

  // ==========================================
  // Quiz Version History
  // ==========================================

  /**
   * Create a new version snapshot of a quiz or quiz template
   * Stores the complete quiz state at this point in time
   * @param quizId - The quiz or template ID
   * @param quizData - The quiz data to snapshot
   * @param changeDescription - Optional description of changes (max 500 chars)
   * @param collectionName - Collection name ('quizzes' or 'quizTemplates')
   */
  async createQuizVersion(
    quizId: number,
    quizData: any,
    changeDescription?: string,
    collectionName: 'quizzes' | 'quizTemplates' = 'quizTemplates'
  ): Promise<QuizVersion> {
    try {
      const userId = this.currentUserId;
      if (!userId) throw new Error('User ID required');

      // Validate and truncate changeDescription to 500 characters
      const validatedChangeDescription = changeDescription
        ? changeDescription.substring(0, 500)
        : undefined;

      // Get existing versions to determine version number
      const existingVersions = await this.getQuizVersions(quizId, collectionName);
      const versionNumber = existingVersions.length + 1;

      // Generate version ID (timestamp-based for natural ordering)
      const versionId = `${Date.now()}_v${versionNumber}`;

      const version: QuizVersion = {
        id: versionId,
        quizId,
        versionNumber,
        createdAt: new Date(),
        createdBy: userId,
        changeDescription: validatedChangeDescription,

        // Snapshot all quiz data using nullish coalescing to preserve falsy values
        title: quizData.title ?? '',
        description: quizData.description ?? null,
        tags: quizData.tags ?? null,
        categoryIds: quizData.categoryIds ?? [],
        subcategoryIds: quizData.subcategoryIds ?? [],
        questionIds: quizData.questionIds ?? null,
        questionCount: quizData.questionCount ?? 0,
        timeLimit: quizData.timeLimit ?? null,
        customQuestions: quizData.customQuestions ?? undefined,
        difficultyLevel: quizData.difficultyLevel ?? null,
        passingScore: quizData.passingScore ?? null,
        maxAttempts: quizData.maxAttempts ?? null,
        randomizeQuestions: quizData.randomizeQuestions ?? null,
        randomizeAnswers: quizData.randomizeAnswers ?? null,
        timeLimitPerQuestion: quizData.timeLimitPerQuestion ?? null,
        questionWeights: quizData.questionWeights ?? null,
        feedbackMode: quizData.feedbackMode ?? null,
        instructions: quizData.instructions ?? undefined,
        isPublished: quizData.isPublished ?? undefined,
        isDraft: quizData.isDraft ?? undefined,
        isAdvancedConfig: quizData.isAdvancedConfig ?? null,
        author: quizData.author ?? null,
        authorName: quizData.authorName ?? null,
        prerequisites: quizData.prerequisites ?? null,
      };

      // Store in subcollection: /users/{userId}/{collectionName}/{quizId}/versions/{versionId}
      await setUserSubcollectionDocument(
        userId,
        collectionName,
        quizId.toString(),
        'versions',
        versionId,
        version
      );

      return convertTimestamps(version);
    } catch (error) {
      logError('createQuizVersion', error, { quizId, changeDescription, collectionName });
      throw error;
    }
  }

  /**
   * Get all versions for a quiz, ordered by creation date (newest first)
   * @param quizId - The quiz or template ID
   * @param collectionName - Collection name ('quizzes' or 'quizTemplates')
   */
  async getQuizVersions(
    quizId: number,
    collectionName: 'quizzes' | 'quizTemplates' = 'quizTemplates'
  ): Promise<QuizVersion[]> {
    try {
      const userId = this.currentUserId;
      if (!userId) return [];

      const versions = await getUserSubcollectionDocuments<QuizVersion>(
        userId,
        collectionName,
        quizId.toString(),
        'versions',
        [orderBy('createdAt', 'desc')]
      );

      return versions.map((v) => convertTimestamps<QuizVersion>(v));
    } catch (error) {
      logError('getQuizVersions', error, { quizId, collectionName });
      return [];
    }
  }

  /**
   * Get a specific version of a quiz
   * @param quizId - The quiz or template ID
   * @param versionId - The version ID to retrieve
   * @param collectionName - Collection name ('quizzes' or 'quizTemplates')
   */
  async getQuizVersion(
    quizId: number,
    versionId: string,
    collectionName: 'quizzes' | 'quizTemplates' = 'quizTemplates'
  ): Promise<QuizVersion | null> {
    try {
      const userId = this.currentUserId;
      if (!userId) return null;

      const version = await getUserSubcollectionDocument<QuizVersion>(
        userId,
        collectionName,
        quizId.toString(),
        'versions',
        versionId
      );

      return version ? convertTimestamps<QuizVersion>(version) : null;
    } catch (error) {
      logError('getQuizVersion', error, { quizId, versionId, collectionName });
      return null;
    }
  }

  /**
   * Restore a quiz to a previous version
   * Creates a new version with the restored data (does not delete history)
   * @param quizId - The quiz or template ID
   * @param versionId - The version ID to restore
   * @param collectionName - Collection name ('quizzes' or 'quizTemplates')
   */
  async restoreQuizVersion(
    quizId: number,
    versionId: string,
    collectionName: 'quizzes' | 'quizTemplates' = 'quizTemplates'
  ): Promise<Quiz> {
    try {
      const userId = this.currentUserId;
      if (!userId) throw new Error('User ID required');

      // Get the version to restore
      const version = await this.getQuizVersion(quizId, versionId, collectionName);
      if (!version) throw new Error('Version not found');

      // Get current quiz/template to preserve certain fields
      const currentDoc = await getUserDocument<any>(userId, collectionName, quizId.toString());
      if (!currentDoc)
        throw new Error(`${collectionName === 'quizTemplates' ? 'Template' : 'Quiz'} not found`);

      // Create restoration data including all template-specific fields
      const restorationData = {
        title: version.title,
        description: version.description,
        tags: version.tags,
        categoryIds: version.categoryIds,
        subcategoryIds: version.subcategoryIds,
        questionIds: version.questionIds,
        questionCount: version.questionCount,
        timeLimit: version.timeLimit,
        difficultyLevel: version.difficultyLevel,
        passingScore: version.passingScore,
        maxAttempts: version.maxAttempts,
        randomizeQuestions: version.randomizeQuestions,
        randomizeAnswers: version.randomizeAnswers,
        timeLimitPerQuestion: version.timeLimitPerQuestion,
        questionWeights: version.questionWeights,
        feedbackMode: version.feedbackMode,
        isAdvancedConfig: version.isAdvancedConfig,
        author: version.author,
        authorName: version.authorName,
        prerequisites: version.prerequisites,
        // Include template-specific fields
        customQuestions: version.customQuestions,
        instructions: version.instructions,
        isPublished: version.isPublished,
        isDraft: version.isDraft,
      };

      // Update the document with restored data
      await updateUserDocument(userId, collectionName, quizId.toString(), {
        ...restorationData,
        updatedAt: new Date(),
      });

      // Get the updated document
      const updatedDoc = await getUserDocument<Quiz>(userId, collectionName, quizId.toString());
      if (!updatedDoc) throw new Error('Failed to retrieve updated document');

      // Create a new version documenting the restoration
      await this.createQuizVersion(
        quizId,
        updatedDoc,
        `Restored from version ${version.versionNumber} (${versionId})`,
        collectionName
      );

      return convertTimestamps(updatedDoc);
    } catch (error) {
      logError('restoreQuizVersion', error, { quizId, versionId, collectionName });
      throw error;
    }
  }

  // ==========================================
  // Quiz Templates
  // ==========================================

  /**
   * Get all quiz templates for a user
   * @param userId - User ID
   * @param tenantId - Optional tenant ID filter
   */
  async getUserQuizTemplates(userId: string, tenantId?: number): Promise<QuizTemplate[]> {
    try {
      // Add orderBy for better performance
      const constraints = [orderBy('createdAt', 'desc')];

      // If tenantId provided (including 0), filter on server
      if (tenantId !== undefined && tenantId !== null) {
        constraints.unshift(where('tenantId', '==', tenantId));
      }

      const templates = await getUserDocuments<QuizTemplate>(userId, 'quizTemplates', constraints);
      return templates.map((t) => convertTimestamps(t));
    } catch (error) {
      logError('getUserQuizTemplates', error, { userId, tenantId });
      return [];
    }
  }

  /**
   * Get a single quiz template by ID
   * @param userId - User ID (owner of the template)
   * @param templateId - Template ID
   */
  async getQuizTemplate(userId: string, templateId: number): Promise<QuizTemplate | undefined> {
    try {
      const template = await getUserDocument<QuizTemplate>(
        userId,
        'quizTemplates',
        templateId.toString()
      );
      return template ? convertTimestamps(template) : undefined;
    } catch (error) {
      logError('getQuizTemplate', error, { userId, templateId });
      return undefined;
    }
  }

  /**
   * Duplicate a quiz template
   * Creates a copy of an existing quiz template with all configuration, questions, and metadata
   * The duplicate is created as a draft with a "Copy of" prefix
   *
   * @param templateId - ID of the template to duplicate
   * @param userId - ID of the user requesting duplication (must be the owner)
   * @returns The newly created template
   * @throws Error if template not found or user is not the owner
   */
  async duplicateQuizTemplate(templateId: number, userId: string): Promise<QuizTemplate> {
    try {
      if (!userId) throw new Error('User ID required');

      // 1. Fetch original template
      const original = await this.getQuizTemplate(userId, templateId);
      if (!original) {
        throw new Error('Quiz template not found');
      }

      // 2. Verify ownership
      if (original.userId !== userId) {
        throw new Error('Only the quiz owner can duplicate this template');
      }

      // 3. Generate new ID
      const newId = generateSafeNumericId();

      // 4. Create duplicate with modified fields
      const duplicate: QuizTemplate = {
        ...original,
        id: newId,
        title: `Copy of ${original.title}`,
        isDraft: true,
        isPublished: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 5. Save as new template
      await setUserDocument(userId, 'quizTemplates', newId.toString(), duplicate);

      // 6. Create version history entry for the duplicate
      await this.createQuizVersion(
        newId,
        duplicate,
        'Created as duplicate of template ' + templateId,
        'quizTemplates'
      );

      return convertTimestamps(duplicate);
    } catch (error) {
      logError('duplicateQuizTemplate', error, { templateId, userId });
      throw error;
    }
  }

  /**
   * Delete a quiz template
   * Only the owner can delete their own templates
   *
   * Note: Templates are stored per-user in Firestore, so users can only
   * access and delete their own templates. This provides implicit ownership validation.
   *
   * @param templateId - ID of the template to delete
   * @param userId - ID of the user requesting deletion (must be the owner)
   * @throws Error if template not found (which means user doesn't own it)
   */
  async deleteQuizTemplate(templateId: number, userId: string): Promise<void> {
    try {
      if (!userId) throw new Error('User ID required');

      // 1. Fetch template to verify it exists in user's collection
      // Note: getQuizTemplate only returns templates owned by userId
      const template = await this.getQuizTemplate(userId, templateId);
      if (!template) {
        throw new Error('Quiz template not found or you do not have permission to delete it');
      }

      // 2. Delete the template (implicit ownership check via Firestore collection path)
      await deleteUserDocument(userId, 'quizTemplates', templateId.toString());

      logInfo('deleteQuizTemplate', { templateId, userId, timestamp: new Date().toISOString() });
    } catch (error) {
      logError('deleteQuizTemplate', error, { templateId, userId });
      throw error;
    }
  }

  // ==========================================
  // User Progress
  // ==========================================

  async getUserProgress(userId: string, tenantId?: number): Promise<UserProgress[]> {
    try {
      const progress = await getUserDocuments<UserProgress>(userId, 'progress');
      const filtered = tenantId ? progress.filter((p) => p.tenantId === tenantId) : progress;
      return filtered.map((p) => convertTimestamps<UserProgress>(p));
    } catch (error) {
      logError('getUserProgress', error, { userId, tenantId });
      return [];
    }
  }

  async updateUserProgress(
    userId: string,
    categoryId: number,
    progress: Partial<InsertUserProgress>,
    tenantId?: number
  ): Promise<UserProgress> {
    try {
      const key = `${userId}_${categoryId}_${tenantId || 1}`;
      const existing = await getUserDocument<UserProgress>(userId, 'progress', key);

      const updated: UserProgress = {
        id: existing?.id || generateSafeNumericId(),
        userId,
        categoryId,
        tenantId: tenantId || 1,
        questionsCompleted: progress.questionsCompleted || existing?.questionsCompleted || 0,
        totalQuestions: progress.totalQuestions || existing?.totalQuestions || 0,
        averageScore: progress.averageScore || existing?.averageScore || 0,
        lastQuizDate: progress.lastQuizDate || existing?.lastQuizDate || null,
        ...progress,
      } as UserProgress;

      await setUserDocument(userId, 'progress', key, updated);
      return convertTimestamps(updated);
    } catch (error) {
      logError('updateUserProgress', error, { userId, categoryId });
      throw error;
    }
  }

  async getUserStats(userId: string, tenantId?: number): Promise<UserStatsResult> {
    try {
      const quizzes = await this.getUserQuizzes(userId, tenantId);
      const completedQuizzes = quizzes.filter((q) => q.completedAt !== null);

      const totalQuizzes = completedQuizzes.length;
      const averageScore =
        totalQuizzes > 0
          ? completedQuizzes.reduce((sum, q) => sum + (q.score || 0), 0) / totalQuizzes
          : 0;

      const passingQuizzes = completedQuizzes.filter((q) => (q.score || 0) >= 70);
      const passingRate = totalQuizzes > 0 ? (passingQuizzes.length / totalQuizzes) * 100 : 0;

      const progress = await this.getUserProgress(userId, tenantId);
      const certifications = new Set(progress.map((p) => p.categoryId)).size;

      const masteryScores = await this.getUserMasteryScores(userId, tenantId);
      const masteryScore = await this.calculateOverallMasteryScore(userId, tenantId);

      // Get current streak from game stats
      const gameStats = await this.getUserGameStats(userId);
      const currentStreak = gameStats?.currentStreak || 0;

      return {
        totalQuizzes,
        averageScore,
        // Both studyStreak and currentStreak are set to the same value
        // for backward compatibility - different components use different field names
        studyStreak: currentStreak,
        currentStreak,
        certifications,
        passingRate,
        masteryScore,
      };
    } catch (_error) {
      logError('getUserStats', _error, { userId, tenantId });
      return {
        totalQuizzes: 0,
        averageScore: 0,
        studyStreak: 0,
        currentStreak: 0,
        certifications: 0,
        passingRate: 0,
        masteryScore: 0,
      };
    }
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
  ): Promise<Lecture> {
    try {
      const id = generateSafeNumericId();
      const lecture: Lecture = {
        id,
        userId,
        tenantId: tenantId || 1,
        quizId,
        title,
        description: null,
        content,
        topics,
        tags: null, // Tags should be set separately via updateLecture if needed
        categoryId,
        subcategoryId: null,
        difficultyLevel: 1,
        author: userId,
        authorName: 'AI Tutor', // Default for AI-generated lectures
        prerequisites: null,
        isRead: false,
        createdAt: new Date(),
        updatedAt: null,
        // Multiple content type fields
        contentType: 'text',
        videoUrl: null,
        videoProvider: null,
        videoDuration: null,
        pdfUrl: null,
        pdfPages: null,
        interactiveUrl: null,
        interactiveType: null,
        codeLanguage: null,
        codeContent: null,
        hasCodeHighlighting: false,
        thumbnailUrl: null,
        fileSize: null,
        accessibilityFeatures: null,
        // Access control fields - default to private
        visibility: 'private',
        sharedWithUsers: null,
        sharedWithGroups: null,
        requiresPurchase: false,
        purchaseProductId: null,
        // Distribution settings - default to open
        distributionMethod: 'open',
        availableFrom: null,
        availableUntil: null,
        enrollmentDeadline: null,
        maxEnrollments: null,
        requireApproval: false,
        assignmentDueDate: null,
        sendNotifications: true,
        reminderDays: null,
      };

      await setUserDocument(userId, 'lectures', id.toString(), lecture);
      return convertTimestamps(lecture);
    } catch (error) {
      logError('createLecture', error, { userId, quizId });
      throw error;
    }
  }

  async getUserLectures(userId: string, tenantId?: number): Promise<Lecture[]> {
    try {
      const lectures = await getUserDocuments<Lecture>(userId, 'lectures');
      const filtered = tenantId ? lectures.filter((l) => l.tenantId === tenantId) : lectures;
      return filtered.map((l) => convertTimestamps<Lecture>(l));
    } catch (error) {
      logError('getUserLectures', error, { userId, tenantId });
      return [];
    }
  }

  async getLecture(id: number): Promise<Lecture | undefined> {
    try {
      const userId = this.currentUserId;
      if (!userId) return undefined;

      const lecture = await getUserDocument<Lecture>(userId, 'lectures', id.toString());
      return lecture ? convertTimestamps(lecture) : undefined;
    } catch (error) {
      logError('getLecture', error, { id });
      return undefined;
    }
  }

  async updateLecture(id: number, updates: Partial<Lecture>): Promise<Lecture> {
    try {
      const userId = this.currentUserId;
      if (!userId) throw new Error('User ID required');

      // Add updatedAt timestamp
      const updatesWithTimestamp = {
        ...updates,
        updatedAt: new Date(),
      };

      await updateUserDocument(userId, 'lectures', id.toString(), updatesWithTimestamp);
      const lecture = await this.getLecture(id);
      if (!lecture) throw new Error('Lecture not found after update');
      return lecture;
    } catch (error) {
      logError('updateLecture', error, { id, updates });
      throw error;
    }
  }

  /**
   * Delete a lecture
   * Only the owner can delete their own lectures
   *
   * Note: Lectures are stored per-user in Firestore, so users can only
   * access and delete their own lectures. This provides implicit ownership validation.
   *
   * @param id - ID of the lecture to delete
   * @param userId - ID of the user requesting deletion (must be the owner)
   * @throws Error if lecture not found (which means user doesn't own it)
   */
  async deleteLecture(id: number, userId: string): Promise<void> {
    try {
      if (!userId) throw new Error('User ID required');

      // 1. Fetch lecture to verify it exists in user's collection
      // Note: getUserDocument only returns lectures owned by userId
      const lecture = await getUserDocument<Lecture>(userId, 'lectures', id.toString());
      if (!lecture) {
        throw new Error('Lecture not found or you do not have permission to delete it');
      }

      // 2. Delete the lecture (implicit ownership check via Firestore collection path)
      await deleteUserDocument(userId, 'lectures', id.toString());

      logInfo('deleteLecture', { lectureId: id, userId, timestamp: new Date().toISOString() });
    } catch (error) {
      logError('deleteLecture', error, { id, userId });
      throw error;
    }
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
    try {
      const key = `${userId}_${categoryId}_${subcategoryId}`;
      const existing = await getUserDocument<MasteryScore>(userId, 'masteryScores', key);

      const updated: MasteryScore = {
        id: existing?.id || generateSafeNumericId(),
        userId,
        tenantId: 1,
        categoryId,
        subcategoryId,
        totalAnswers: (existing?.totalAnswers || 0) + 1,
        correctAnswers: (existing?.correctAnswers || 0) + (isCorrect ? 1 : 0),
        rollingAverage: 0,
        lastUpdated: new Date(),
      };

      // Calculate rolling average (0-100)
      updated.rollingAverage =
        updated.totalAnswers > 0 ? (updated.correctAnswers / updated.totalAnswers) * 100 : 0;

      await setUserDocument(userId, 'masteryScores', key, updated);
    } catch (error) {
      logError('updateMasteryScore', error, { userId, categoryId, subcategoryId });
    }
  }

  async getUserMasteryScores(userId: string, tenantId?: number): Promise<MasteryScore[]> {
    try {
      const scores = await getUserDocuments<MasteryScore>(userId, 'masteryScores');
      const filtered = tenantId ? scores.filter((s) => s.tenantId === tenantId) : scores;
      return filtered.map((s) => convertTimestamps<MasteryScore>(s));
    } catch (error) {
      logError('getUserMasteryScores', error, { userId });
      return [];
    }
  }

  async calculateOverallMasteryScore(userId: string, tenantId?: number): Promise<number> {
    try {
      const scores = await this.getUserMasteryScores(userId, tenantId);
      if (scores.length === 0) return 0;

      const total = scores.reduce((sum, s) => sum + s.rollingAverage, 0);
      return total / scores.length;
    } catch (error) {
      logError('calculateOverallMasteryScore', error, { userId });
      return 0;
    }
  }

  async getCertificationMasteryScores(
    userId: string,
    tenantId?: number
  ): Promise<CertificationMasteryScore[]> {
    try {
      const scores = await this.getUserMasteryScores(userId, tenantId);
      const categoryMap = new Map<number, { total: number; count: number }>();

      for (const score of scores) {
        const existing = categoryMap.get(score.categoryId) || { total: 0, count: 0 };
        categoryMap.set(score.categoryId, {
          total: existing.total + score.rollingAverage,
          count: existing.count + 1,
        });
      }

      return Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
        categoryId,
        masteryScore: data.count > 0 ? data.total / data.count : 0,
      }));
    } catch (error) {
      logError('getCertificationMasteryScores', error, { userId });
      return [];
    }
  }

  // ==========================================
  // Badges
  // ==========================================

  async getBadges(): Promise<Badge[]> {
    try {
      const badges = await getSharedDocuments<Badge>('badges');
      return badges.map((b) => convertTimestamps<Badge>(b));
    } catch (error) {
      logError('getBadges', error);
      return [];
    }
  }

  async getUserBadges(userId: string, tenantId?: number): Promise<UserBadge[]> {
    try {
      const badges = await getUserDocuments<UserBadge>(userId, 'userBadges');
      const filtered = tenantId ? badges.filter((b) => b.tenantId === tenantId) : badges;
      return filtered.map((b) => convertTimestamps<UserBadge>(b));
    } catch (error) {
      logError('getUserBadges', error, { userId, tenantId });
      return [];
    }
  }

  async createUserBadge(userBadge: Partial<UserBadge>): Promise<UserBadge> {
    try {
      const userId = userBadge.userId || this.currentUserId;
      if (!userId) throw new Error('User ID required');

      const id = generateSafeNumericId();
      const newBadge: UserBadge = {
        id,
        userId,
        badgeId: userBadge.badgeId || 0,
        earnedAt: new Date(),
        progress: userBadge.progress || 0,
        isNotified: userBadge.isNotified || false,
        tenantId: userBadge.tenantId || 1,
        ...userBadge,
      } as UserBadge;

      await setUserDocument(userId, 'userBadges', id.toString(), newBadge);
      return convertTimestamps(newBadge);
    } catch (error) {
      logError('createUserBadge', error, { userBadge });
      throw error;
    }
  }

  async updateUserBadge(id: number, updates: Partial<UserBadge>): Promise<UserBadge> {
    try {
      const userId = this.currentUserId;
      if (!userId) throw new Error('User ID required');

      await updateUserDocument(userId, 'userBadges', id.toString(), updates);
      const badge = await getUserDocument<UserBadge>(userId, 'userBadges', id.toString());
      if (!badge) throw new Error('Badge not found after update');
      return convertTimestamps(badge);
    } catch (error) {
      logError('updateUserBadge', error, { id, updates });
      throw error;
    }
  }

  // ==========================================
  // Game Stats
  // ==========================================

  async getUserGameStats(userId: string): Promise<UserGameStats | undefined> {
    try {
      const stats = await getUserDocument<UserGameStats>(userId, 'gameStats', 'stats');
      return stats ? convertTimestamps(stats) : undefined;
    } catch (error) {
      logError('getUserGameStats', error, { userId });
      return undefined;
    }
  }

  async updateUserGameStats(
    userId: string,
    updates: Partial<UserGameStats>
  ): Promise<UserGameStats> {
    try {
      const existing = await this.getUserGameStats(userId);
      const updated: UserGameStats = {
        id: existing?.id || generateSafeNumericId(),
        userId,
        tenantId: updates.tenantId ?? existing?.tenantId ?? 1,
        totalPoints: updates.totalPoints ?? existing?.totalPoints ?? 0,
        level: updates.level ?? existing?.level ?? 1,
        currentStreak: updates.currentStreak ?? existing?.currentStreak ?? 0,
        longestStreak: updates.longestStreak ?? existing?.longestStreak ?? 0,
        lastActivityDate: updates.lastActivityDate || existing?.lastActivityDate || null,
        totalBadgesEarned: updates.totalBadgesEarned ?? existing?.totalBadgesEarned ?? 0,
        nextLevelPoints: updates.nextLevelPoints ?? existing?.nextLevelPoints ?? 100,
        createdAt: existing?.createdAt || new Date(),
        updatedAt: new Date(),
        ...updates,
      } as UserGameStats;

      await setUserDocument(userId, 'gameStats', 'stats', updated);
      return convertTimestamps(updated);
    } catch (error) {
      logError('updateUserGameStats', error, { userId, updates });
      throw error;
    }
  }

  // ==========================================
  // Challenges
  // ==========================================

  async getChallenges(userId?: string): Promise<Challenge[]> {
    try {
      const challenges = await getSharedDocuments<Challenge>('challenges');
      const filtered = userId
        ? challenges.filter((c) => !c.userId || c.userId === userId)
        : challenges;
      return filtered.map((c) => convertTimestamps<Challenge>(c));
    } catch (error) {
      logError('getChallenges', error, { userId });
      return [];
    }
  }

  async getChallenge(id: number): Promise<Challenge | undefined> {
    try {
      const challenge = await getSharedDocument<Challenge>('challenges', id.toString());
      return challenge ? convertTimestamps(challenge) : undefined;
    } catch (error) {
      logError('getChallenge', error, { id });
      return undefined;
    }
  }

  async createChallenge(challenge: Partial<Challenge>): Promise<Challenge> {
    try {
      const id = generateSafeNumericId();
      const newChallenge: Challenge = {
        id,
        userId: challenge.userId || '',
        title: challenge.title || 'New Challenge',
        description: challenge.description || null,
        categoryId: challenge.categoryId || null,
        subcategoryId: challenge.subcategoryId || null,
        questionsCount: challenge.questionsCount || 5,
        difficulty: challenge.difficulty || 1,
        timeLimit: challenge.timeLimit || 5,
        type: challenge.type || 'daily',
        targetScore: challenge.targetScore || 80,
        streakMultiplier: challenge.streakMultiplier || 1,
        pointsReward: challenge.pointsReward || 50,
        isActive: challenge.isActive ?? true,
        availableAt: challenge.availableAt || new Date(),
        expiresAt: challenge.expiresAt || null,
        createdAt: new Date(),
        ...challenge,
      } as Challenge;

      await setSharedDocument('challenges', id.toString(), newChallenge);
      return convertTimestamps(newChallenge);
    } catch (error) {
      logError('createChallenge', error, { challenge });
      throw error;
    }
  }

  async getChallengeAttempts(userId: string): Promise<ChallengeAttempt[]> {
    try {
      const attempts = await getUserDocuments<ChallengeAttempt>(userId, 'challengeAttempts');
      return attempts.map((a) => convertTimestamps<ChallengeAttempt>(a));
    } catch (error) {
      logError('getChallengeAttempts', error, { userId });
      return [];
    }
  }

  async createChallengeAttempt(attempt: Partial<ChallengeAttempt>): Promise<ChallengeAttempt> {
    try {
      const userId = attempt.userId || this.currentUserId;
      if (!userId) throw new Error('User ID required');

      const id = generateSafeNumericId();
      const newAttempt: ChallengeAttempt = {
        id,
        userId,
        challengeId: attempt.challengeId || 0,
        quizId: attempt.quizId || null,
        score: attempt.score || null,
        completedAt: attempt.completedAt || null,
        startedAt: new Date(),
        ...attempt,
      } as ChallengeAttempt;

      await setUserDocument(userId, 'challengeAttempts', id.toString(), newAttempt);
      return convertTimestamps(newAttempt);
    } catch (error) {
      logError('createChallengeAttempt', error, { attempt });
      throw error;
    }
  }

  // ==========================================
  // Study Groups
  // ==========================================

  async getStudyGroups(): Promise<StudyGroup[]> {
    try {
      const groups = await getSharedDocuments<StudyGroup>('studyGroups');
      return groups.map((g) => convertTimestamps<StudyGroup>(g));
    } catch (error) {
      logError('getStudyGroups', error);
      return [];
    }
  }

  async getStudyGroup(id: number): Promise<StudyGroup | undefined> {
    try {
      const group = await getSharedDocument<StudyGroup>('studyGroups', id.toString());
      return group ? convertTimestamps(group) : undefined;
    } catch (error) {
      logError('getStudyGroup', error, { id });
      return undefined;
    }
  }

  async createStudyGroup(group: Partial<StudyGroup>): Promise<StudyGroup> {
    try {
      const id = generateSafeNumericId();
      const newGroup: StudyGroup = {
        id,
        tenantId: group.tenantId || 1,
        name: group.name || 'New Study Group',
        description: group.description || null,
        categoryIds: group.categoryIds || [],
        createdBy: group.createdBy || this.currentUserId || '',
        isPublic: group.isPublic ?? true,
        maxMembers: group.maxMembers || 20,
        level: group.level || 'Intermediate',
        isActive: group.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
        meetingSchedule: group.meetingSchedule || null,
        ...group,
      } as StudyGroup;

      await setSharedDocument('studyGroups', id.toString(), newGroup);
      return convertTimestamps(newGroup);
    } catch (error) {
      logError('createStudyGroup', error, { group });
      throw error;
    }
  }

  async getUserStudyGroups(userId: string): Promise<StudyGroup[]> {
    try {
      // Get all group memberships for user
      const allGroups = await this.getStudyGroups();
      const userGroups: StudyGroup[] = [];

      for (const group of allGroups) {
        const members = await getSharedDocuments<StudyGroupMember>('studyGroupMembers');
        const isMember = members.some((m) => m.groupId === group.id && m.userId === userId);
        if (isMember) {
          userGroups.push(group);
        }
      }

      return userGroups;
    } catch (error) {
      logError('getUserStudyGroups', error, { userId });
      return [];
    }
  }

  async joinStudyGroup(userId: string, groupId: number): Promise<StudyGroupMember> {
    try {
      const id = `${userId}_${groupId}`;
      const member: StudyGroupMember = {
        id: generateSafeNumericId(),
        groupId,
        userId,
        role: 'member',
        joinedAt: new Date(),
        lastActiveAt: null,
        contributionScore: 0,
      };

      await setSharedDocument('studyGroupMembers', id, member);
      return convertTimestamps(member);
    } catch (error) {
      logError('joinStudyGroup', error, { userId, groupId });
      throw error;
    }
  }

  async leaveStudyGroup(userId: string, groupId: number): Promise<void> {
    try {
      const db = getFirestoreInstance();
      const { deleteDoc, doc } = await import('firebase/firestore');
      const id = `${userId}_${groupId}`;
      await deleteDoc(doc(db, 'studyGroupMembers', id));
    } catch (error) {
      logError('leaveStudyGroup', error, { userId, groupId });
      throw error;
    }
  }

  // ==========================================
  // Practice Tests
  // ==========================================

  async getPracticeTests(): Promise<PracticeTest[]> {
    try {
      const tests = await getSharedDocuments<PracticeTest>('practiceTests');
      return tests.map((t) => convertTimestamps<PracticeTest>(t));
    } catch (error) {
      logError('getPracticeTests', error);
      return [];
    }
  }

  async getPracticeTest(id: number): Promise<PracticeTest | undefined> {
    try {
      const test = await getSharedDocument<PracticeTest>('practiceTests', id.toString());
      return test ? convertTimestamps(test) : undefined;
    } catch (error) {
      logError('getPracticeTest', error, { id });
      return undefined;
    }
  }

  async createPracticeTest(test: Partial<PracticeTest>): Promise<PracticeTest> {
    try {
      const id = generateSafeNumericId();
      const newTest: PracticeTest = {
        id,
        tenantId: test.tenantId || 1,
        name: test.name || 'New Practice Test',
        description: test.description || null,
        categoryIds: test.categoryIds || [],
        questionCount: test.questionCount || 50,
        timeLimit: test.timeLimit || 60,
        passingScore: test.passingScore || 70,
        difficulty: test.difficulty || 'Medium',
        isOfficial: test.isOfficial || false,
        questionPool: test.questionPool || null,
        createdBy: test.createdBy || null,
        isActive: test.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...test,
      } as PracticeTest;

      await setSharedDocument('practiceTests', id.toString(), newTest);
      return convertTimestamps(newTest);
    } catch (error) {
      logError('createPracticeTest', error, { test });
      throw error;
    }
  }

  async getPracticeTestAttempts(userId: string, testId?: number): Promise<PracticeTestAttempt[]> {
    try {
      const attempts = await getUserDocuments<PracticeTestAttempt>(userId, 'practiceTestAttempts');
      const filtered = testId ? attempts.filter((a) => a.testId === testId) : attempts;
      return filtered.map((a) => convertTimestamps<PracticeTestAttempt>(a));
    } catch (error) {
      logError('getPracticeTestAttempts', error, { userId, testId });
      return [];
    }
  }

  async createPracticeTestAttempt(
    attempt: Partial<PracticeTestAttempt>
  ): Promise<PracticeTestAttempt> {
    try {
      const userId = attempt.userId || this.currentUserId;
      if (!userId) throw new Error('User ID required');

      const id = generateSafeNumericId();
      const newAttempt: PracticeTestAttempt = {
        id,
        tenantId: attempt.tenantId || 1,
        userId,
        testId: attempt.testId || 0,
        quizId: attempt.quizId || null,
        score: attempt.score || null,
        timeSpent: attempt.timeSpent || null,
        isPassed: attempt.isPassed || false,
        completedAt: attempt.completedAt || null,
        startedAt: new Date(),
        ...attempt,
      } as PracticeTestAttempt;

      await setUserDocument(userId, 'practiceTestAttempts', id.toString(), newAttempt);
      return convertTimestamps(newAttempt);
    } catch (error) {
      logError('createPracticeTestAttempt', error, { attempt });
      throw error;
    }
  }

  async updatePracticeTestAttempt(
    id: number,
    updates: Partial<PracticeTestAttempt>
  ): Promise<PracticeTestAttempt> {
    try {
      const userId = this.currentUserId;
      if (!userId) throw new Error('User ID required');

      await updateUserDocument(userId, 'practiceTestAttempts', id.toString(), updates);
      const attempt = await getUserDocument<PracticeTestAttempt>(
        userId,
        'practiceTestAttempts',
        id.toString()
      );
      if (!attempt) throw new Error('Attempt not found after update');
      return convertTimestamps(attempt);
    } catch (error) {
      logError('updatePracticeTestAttempt', error, { id, updates });
      throw error;
    }
  }

  // ==========================================
  // Token Management
  // ==========================================

  async getUserTokenBalance(userId: string): Promise<number> {
    try {
      const user = await this.getUser(userId);
      return user?.tokenBalance ?? 0;
    } catch (error) {
      logError('getUserTokenBalance', error, { userId });
      return 0;
    }
  }

  async addTokens(userId: string, amount: number): Promise<number> {
    try {
      const user = await this.getUser(userId);
      if (!user) throw new Error('User not found');

      const currentBalance = user.tokenBalance ?? 0;
      const newBalance = currentBalance + amount;

      await this.updateUser(userId, { tokenBalance: newBalance });
      return newBalance;
    } catch (error) {
      logError('addTokens', error, { userId, amount });
      throw error;
    }
  }

  async consumeTokens(
    userId: string,
    amount: number
  ): Promise<{ success: boolean; newBalance: number; message?: string }> {
    try {
      const user = await this.getUser(userId);
      if (!user) throw new Error('User not found');

      const currentBalance = user.tokenBalance ?? 0;
      if (currentBalance < amount) {
        return {
          success: false,
          newBalance: currentBalance,
          message: 'Insufficient tokens',
        };
      }

      const newBalance = currentBalance - amount;
      await this.updateUser(userId, { tokenBalance: newBalance });
      return { success: true, newBalance };
    } catch (error) {
      logError('consumeTokens', error, { userId, amount });
      throw error;
    }
  }

  calculateQuizTokenCost(questionCount: number): number {
    // Simple cost model: 1 token per question
    return questionCount;
  }

  // ==========================================
  // Data Management
  // ==========================================

  async exportData(): Promise<string> {
    try {
      const userId = this.currentUserId;
      if (!userId) throw new Error('No user logged in');

      const data = {
        user: await this.getUser(userId),
        quizzes: await this.getUserQuizzes(userId),
        progress: await this.getUserProgress(userId),
        lectures: await this.getUserLectures(userId),
        masteryScores: await this.getUserMasteryScores(userId),
        badges: await this.getUserBadges(userId),
        gameStats: await this.getUserGameStats(userId),
        challenges: await this.getChallengeAttempts(userId),
        practiceTests: await this.getPracticeTestAttempts(userId),
        exportedAt: new Date().toISOString(),
      };

      return JSON.stringify(data, null, 2);
    } catch (error) {
      logError('exportData', error);
      throw error;
    }
  }

  async importData(jsonData: string): Promise<void> {
    try {
      // TODO: Implement data import for Firestore
      // This requires careful handling of:
      // 1. Data validation and sanitization
      // 2. Conflict resolution with existing data
      // 3. Firestore batch operations for efficiency
      // 4. Transaction handling for data integrity
      // Tracked in: Future enhancement for data import/export
      throw new Error(
        'Import not yet implemented for Firestore storage. Please use local-only mode for data import.'
      );
    } catch (error) {
      logError('importData', error);
      throw error;
    }
  }

  async clearAllData(): Promise<void> {
    try {
      const userId = this.currentUserId;
      if (!userId) throw new Error('No user logged in');

      // TODO: Implement data clearing for Firestore
      // This is a destructive operation that requires:
      // 1. Confirmation dialogs in UI
      // 2. Batch deletion of all user subcollections
      // 3. Preservation of user profile document
      // 4. Proper error handling and rollback
      // Note: For now, users can sign out to start fresh
      // Tracked in: Future enhancement for data management
      throw new Error(
        'Clear all data not yet implemented for Firestore storage. Sign out to start with a clean slate.'
      );
    } catch (error) {
      logError('clearAllData', error);
      throw error;
    }
  }

  // ==========================================
  // Performance Analytics
  // ==========================================
  // Note: These delegate to clientStorage for now since they're read-only analytics
  // that work with existing quiz/mastery data structures

  async getPerformanceOverTime(
    userId: string,
    tenantId: number = 1,
    days: number = 30
  ): Promise<Array<{ date: string; score: number; quizCount: number }>> {
    const quizzes = await this.getUserQuizzes(userId, tenantId);
    const completedQuizzes = quizzes
      .filter((q) => q.completedAt && q.score !== null)
      .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime());

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentQuizzes = completedQuizzes.filter(
      (q) => q.completedAt && new Date(q.completedAt).getTime() >= cutoffDate.getTime()
    );

    // Group by date
    const grouped = new Map<string, { scores: number[]; count: number }>();
    for (const quiz of recentQuizzes) {
      const date = new Date(quiz.completedAt!).toISOString().split('T')[0];
      if (!grouped.has(date)) {
        grouped.set(date, { scores: [], count: 0 });
      }
      const entry = grouped.get(date)!;
      entry.scores.push(quiz.score!);
      entry.count++;
    }

    // Calculate averages
    const result = Array.from(grouped.entries()).map(([date, data]) => ({
      date,
      score: Math.round(data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length),
      quizCount: data.count,
    }));

    return result.sort((a, b) => a.date.localeCompare(b.date));
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
    const masteryScores = await this.getUserMasteryScores(userId, tenantId);
    const categories = await this.getCategories(tenantId);
    const subcategories = await this.getSubcategories(undefined, tenantId);

    // Group by category
    const categoryMap = new Map<
      number,
      {
        categoryId: number;
        categoryName: string;
        totalCorrect: number;
        totalAnswers: number;
        subcategories: Map<
          number,
          {
            subcategoryId: number;
            subcategoryName: string;
            correctAnswers: number;
            totalAnswers: number;
          }
        >;
      }
    >();

    for (const score of masteryScores) {
      if (!categoryMap.has(score.categoryId)) {
        const category = categories.find((c) => c.id === score.categoryId);
        categoryMap.set(score.categoryId, {
          categoryId: score.categoryId,
          categoryName: category?.name || 'Unknown',
          totalCorrect: 0,
          totalAnswers: 0,
          subcategories: new Map(),
        });
      }

      const catEntry = categoryMap.get(score.categoryId)!;
      catEntry.totalCorrect += score.correctAnswers;
      catEntry.totalAnswers += score.totalAnswers;

      if (!catEntry.subcategories.has(score.subcategoryId)) {
        const subcategory = subcategories.find((s) => s.id === score.subcategoryId);
        catEntry.subcategories.set(score.subcategoryId, {
          subcategoryId: score.subcategoryId,
          subcategoryName: subcategory?.name || 'Unknown',
          correctAnswers: 0,
          totalAnswers: 0,
        });
      }

      const subEntry = catEntry.subcategories.get(score.subcategoryId)!;
      subEntry.correctAnswers += score.correctAnswers;
      subEntry.totalAnswers += score.totalAnswers;
    }

    // Convert to array and calculate percentages
    return Array.from(categoryMap.values()).map((cat) => ({
      categoryId: cat.categoryId,
      categoryName: cat.categoryName,
      score: cat.totalAnswers > 0 ? Math.round((cat.totalCorrect / cat.totalAnswers) * 100) : 0,
      questionsAnswered: cat.totalAnswers,
      correctAnswers: cat.totalCorrect,
      subcategories: Array.from(cat.subcategories.values()).map((sub) => ({
        subcategoryId: sub.subcategoryId,
        subcategoryName: sub.subcategoryName,
        score: sub.totalAnswers > 0 ? Math.round((sub.correctAnswers / sub.totalAnswers) * 100) : 0,
        questionsAnswered: sub.totalAnswers,
        correctAnswers: sub.correctAnswers,
      })),
    }));
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
    const quizzes = await this.getUserQuizzes(userId, tenantId);
    const completedQuizzes = quizzes.filter((q) => q.completedAt);

    let totalSeconds = 0;
    const dayOfWeekMap = new Map<string, { minutes: number; sessions: number }>();
    const hourMap = new Map<number, { minutes: number; sessions: number }>();

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (const quiz of completedQuizzes) {
      if (!quiz.startedAt) continue; // Skip if no start time
      const start = new Date(quiz.startedAt);
      const end = new Date(quiz.completedAt!);
      const duration = (end.getTime() - start.getTime()) / 1000; // seconds
      totalSeconds += duration;

      // By day of week
      const dayName = dayNames[start.getDay()];
      if (!dayOfWeekMap.has(dayName)) {
        dayOfWeekMap.set(dayName, { minutes: 0, sessions: 0 });
      }
      const dayEntry = dayOfWeekMap.get(dayName)!;
      dayEntry.minutes += duration / 60;
      dayEntry.sessions++;

      // By hour of day
      const hour = start.getHours();
      if (!hourMap.has(hour)) {
        hourMap.set(hour, { minutes: 0, sessions: 0 });
      }
      const hourEntry = hourMap.get(hour)!;
      hourEntry.minutes += duration / 60;
      hourEntry.sessions++;
    }

    const totalMinutes = totalSeconds / 60;
    const averageSessionMinutes =
      completedQuizzes.length > 0 ? totalMinutes / completedQuizzes.length : 0;

    return {
      totalMinutes: Math.round(totalMinutes),
      averageSessionMinutes: Math.round(averageSessionMinutes),
      byDayOfWeek: dayNames.map((day) => {
        const entry = dayOfWeekMap.get(day) || { minutes: 0, sessions: 0 };
        return {
          day,
          minutes: Math.round(entry.minutes),
          sessions: entry.sessions,
        };
      }),
      byTimeOfDay: Array.from({ length: 24 }, (_, hour) => {
        const entry = hourMap.get(hour) || { minutes: 0, sessions: 0 };
        return {
          hour,
          minutes: Math.round(entry.minutes),
          sessions: entry.sessions,
        };
      }),
    };
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
    const masteryScores = await this.getUserMasteryScores(userId, tenantId);
    const categories = await this.getCategories(tenantId);
    const subcategories = await this.getSubcategories(undefined, tenantId);

    const getMasteryLevel = (
      score: number,
      questionsAnswered: number
    ): 'weak' | 'developing' | 'strong' | 'mastered' => {
      if (questionsAnswered < 5) return 'developing'; // Not enough data
      if (score >= 85) return 'mastered';
      if (score >= 70) return 'strong';
      if (score >= 50) return 'developing';
      return 'weak';
    };

    return masteryScores
      .filter((m) => m.totalAnswers > 0)
      .map((m) => {
        const category = categories.find((c) => c.id === m.categoryId);
        const subcategory = subcategories.find((s) => s.id === m.subcategoryId);
        const score = Math.round((m.correctAnswers / m.totalAnswers) * 100);

        return {
          categoryId: m.categoryId,
          categoryName: category?.name || 'Unknown',
          subcategoryId: m.subcategoryId,
          subcategoryName: subcategory?.name || 'Unknown',
          masteryLevel: getMasteryLevel(score, m.totalAnswers),
          score,
          questionsAnswered: m.totalAnswers,
        };
      })
      .sort((a, b) => a.score - b.score); // Weakest first
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
    const quizzes = await this.getUserQuizzes(userId, tenantId);
    const completedQuizzes = quizzes
      .filter((q) => q.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Group by date
    const dateMap = new Map<string, { quizCount: number; totalScore: number }>();
    for (const quiz of completedQuizzes) {
      const quizDate = new Date(quiz.completedAt!);
      if (quizDate.getTime() < cutoffDate.getTime()) continue;

      const dateStr = quizDate.toISOString().split('T')[0];
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, { quizCount: 0, totalScore: 0 });
      }
      const entry = dateMap.get(dateStr)!;
      entry.quizCount++;
      entry.totalScore += quiz.score || 0;
    }

    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Current streak: consecutive active days ending today (or most recent day)
    for (let i = 0; i < days; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];

      if (dateMap.has(dateStr)) {
        currentStreak++;
      } else {
        // If first day (today) has no activity, current streak is 0
        // If any day breaks the streak, stop counting
        break;
      }
    }

    // Longest streak: find maximum consecutive active days within the window
    for (let i = 0; i < days; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];

      if (dateMap.has(dateStr)) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    const calendar = Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        quizCount: data.quizCount,
        totalScore: data.quizCount > 0 ? Math.round(data.totalScore / data.quizCount) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      currentStreak,
      longestStreak,
      activeDays: dateMap.size,
      totalDays: days,
      calendar,
    };
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
    const stats = await this.getUserStats(userId, tenantId);
    const quizzes = await this.getUserQuizzes(userId, tenantId);
    const completedQuizzes = quizzes.filter((q) => q.completedAt);
    const categoryBreakdown = await this.getCategoryBreakdown(userId, tenantId);
    const timeDistribution = await this.getStudyTimeDistribution(userId, tenantId);

    // Calculate total questions
    const totalQuestions = completedQuizzes.reduce((sum, q) => sum + (q.totalQuestions || 0), 0);

    // Determine recent trend (last 10 quizzes vs previous 10)
    // Note: completedQuizzes is sorted descending by completedAt, so slice(0,10) gets most recent
    let recentTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (completedQuizzes.length >= 10) {
      const mostRecent10 = completedQuizzes.slice(0, 10);
      const next10 = completedQuizzes.slice(10, 20);
      const recentAvg =
        mostRecent10.reduce((sum, q) => sum + (q.score || 0), 0) / mostRecent10.length;
      const previousAvg =
        next10.length > 0
          ? next10.reduce((sum, q) => sum + (q.score || 0), 0) / next10.length
          : recentAvg;

      if (recentAvg > previousAvg + 5) recentTrend = 'improving';
      else if (recentAvg < previousAvg - 5) recentTrend = 'declining';
    }

    // Get top and weak categories
    const sortedCategories = [...categoryBreakdown].sort((a, b) => b.score - a.score);
    const topCount = Math.min(3, sortedCategories.length);
    const topCategories = sortedCategories.slice(0, topCount).map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      score: c.score,
    }));
    const topCategoryIds = new Set(topCategories.map((c) => c.categoryId));
    const weakCategories =
      sortedCategories.length <= topCount
        ? []
        : sortedCategories
            .slice()
            .reverse()
            .filter((c) => !topCategoryIds.has(c.categoryId))
            .slice(0, 3)
            .map((c) => ({
              categoryId: c.categoryId,
              categoryName: c.categoryName,
              score: c.score,
            }));

    return {
      overview: {
        totalQuizzes: stats.totalQuizzes,
        totalQuestions,
        averageScore: stats.averageScore,
        passingRate: stats.passingRate,
        studyStreak: stats.studyStreak,
        totalStudyTime: timeDistribution.totalMinutes,
      },
      recentTrend,
      topCategories,
      weakCategories,
    };
  }

  // ==========================================
  // Quest Management
  // ==========================================

  /**
   * Get all quests from Firestore
   * Quests are stored in a shared 'quests' collection
   */
  async getQuests(): Promise<Quest[]> {
    try {
      const quests = await getSharedDocuments<Quest>('quests');
      return quests.map((quest) => convertTimestamps(quest));
    } catch (error) {
      logError('getQuests', error);
      return [];
    }
  }

  /**
   * Get active quests (not expired)
   * Filters quests that are currently valid
   */
  async getActiveQuests(): Promise<Quest[]> {
    try {
      // Use Firestore where() clause to filter active quests on the server
      const activeQuestsRaw = await getSharedDocuments<Quest>('quests', [
        where('isActive', '==', true),
        // Note: For validUntil filtering, we need to handle null/undefined values
        // So we still do client-side filtering for expired quests
      ]);

      // Convert timestamps first, then filter
      const activeQuests = activeQuestsRaw.map((quest) => convertTimestamps<Quest>(quest));

      const now = new Date();
      // Filter out expired quests (must be done client-side due to null handling)
      return activeQuests.filter((quest) => {
        if (quest.validUntil) {
          const expiryDate =
            quest.validUntil instanceof Date ? quest.validUntil : new Date(quest.validUntil);
          return expiryDate >= now;
        }
        return true;
      });
    } catch (error) {
      logError('getActiveQuests', error);
      return [];
    }
  }

  /**
   * Get quests filtered by type (daily, weekly, monthly, special)
   */
  async getQuestsByType(type: string): Promise<Quest[]> {
    try {
      // Combine both where() clauses for maximum efficiency
      const questsRaw = await getSharedDocuments<Quest>('quests', [
        where('isActive', '==', true),
        where('type', '==', type),
      ]);

      // Convert timestamps first, then filter
      const quests = questsRaw.map((quest) => convertTimestamps<Quest>(quest));

      const now = new Date();
      // Filter out expired quests (must be done client-side due to null handling)
      return quests.filter((quest) => {
        if (quest.validUntil) {
          const expiryDate =
            quest.validUntil instanceof Date ? quest.validUntil : new Date(quest.validUntil);
          return expiryDate >= now;
        }
        return true;
      });
    } catch (error) {
      logError('getQuestsByType', error);
      return [];
    }
  }

  /**
   * Get user's progress for a specific quest
   * Stored in /users/{userId}/questProgress/{questId}
   */
  async getUserQuestProgressByQuest(
    userId: string,
    questId: number,
    tenantId: number
  ): Promise<UserQuestProgress | null> {
    try {
      const progress = await getUserDocument<UserQuestProgress>(
        userId,
        'questProgress',
        questId.toString()
      );

      if (!progress) return null;

      // Validate that the progress belongs to the specified tenant
      if (progress.tenantId !== tenantId) {
        logError('getUserQuestProgressByQuest', new Error('Cross-tenant access attempt'), {
          userId,
          questId,
          expectedTenantId: tenantId,
          actualTenantId: progress.tenantId,
        });
        return null;
      }

      return convertTimestamps(progress);
    } catch (error) {
      logError('getUserQuestProgressByQuest', error);
      return null;
    }
  }

  /**
   * Get all quest progress for a user
   * Returns progress for all quests the user has interacted with
   */
  async getUserQuestProgress(userId: string, tenantId: number): Promise<UserQuestProgress[]> {
    try {
      // Add tenant filter and deterministic ordering before limit to prevent cross-tenant leakage
      // and ensure predictable results when limiting to 100 documents.
      const progressList = await getUserDocuments<UserQuestProgress>(userId, 'questProgress', [
        where('tenantId', '==', tenantId),
        orderBy('updatedAt', 'desc'),
        limit(100), // Safety limit - unlikely to have more than 100 active quest progresses
      ]);
      return progressList.map((progress) => convertTimestamps(progress));
    } catch (error) {
      logError('getUserQuestProgress', error);
      return [];
    }
  }

  /**
   * Update user's progress on a quest
   * Creates or updates progress document
   */
  async updateUserQuestProgress(
    userId: string,
    questId: number,
    progress: number,
    tenantId: number
  ): Promise<void> {
    try {
      const questIdStr = questId.toString();
      const existing = await this.getUserQuestProgressByQuest(userId, questId, tenantId);

      if (existing) {
        // Update existing progress
        await updateUserDocument(userId, 'questProgress', questIdStr, {
          progress,
          updatedAt: new Date(),
        });
      } else {
        // Create new progress document
        const progressId = questId.toString();
        await setUserDocument(userId, 'questProgress', progressId, {
          id: questId, // Use questId as the numeric ID for consistency
          userId,
          tenantId,
          questId,
          progress,
          isCompleted: false,
          completedAt: null,
          rewardClaimed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      logError('updateUserQuestProgress', error);
      throw error;
    }
  }

  /**
   * Mark a quest as completed
   * Sets isCompleted to true and records completion timestamp
   */
  async completeQuest(userId: string, questId: number, tenantId: number): Promise<void> {
    try {
      const questIdStr = questId.toString();
      await updateUserDocument(userId, 'questProgress', questIdStr, {
        isCompleted: true,
        completedAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      logError('completeQuest', error);
      throw error;
    }
  }

  /**
   * Mark quest reward as claimed
   * Sets rewardClaimed to true
   */
  async claimQuestReward(userId: string, questId: number, tenantId: number): Promise<void> {
    try {
      const questIdStr = questId.toString();
      await updateUserDocument(userId, 'questProgress', questIdStr, {
        rewardClaimed: true,
        updatedAt: new Date(),
      });
    } catch (error) {
      logError('claimQuestReward', error);
      throw error;
    }
  }

  // ==========================================
  // Title Management
  // ==========================================

  /**
   * Unlock a title for a user
   * Stored in /users/{userId}/titles/{titleId}
   */
  async unlockTitle(
    userId: string,
    title: string,
    description: string,
    source: string,
    tenantId: number
  ): Promise<void> {
    try {
      // Check if title already exists
      const existing = await getUserDocuments<UserTitle>(userId, 'titles', [
        where('title', '==', title),
      ]);

      if (existing.length > 0) {
        // Title already unlocked
        return;
      }

      // Create new title document with generated ID and timestamp-based numeric id
      const titleId = generateId();
      const numericId = generateSafeNumericId();
      await setUserDocument(userId, 'titles', titleId, {
        id: numericId,
        userId,
        tenantId,
        title,
        description: description || '',
        source,
        unlockedAt: new Date(),
      });
    } catch (error) {
      logError('unlockTitle', error);
      throw error;
    }
  }

  /**
   * Get all titles unlocked by a user
   */
  async getUserTitles(userId: string, tenantId: number): Promise<UserTitle[]> {
    try {
      const titles = await getUserDocuments<UserTitle>(userId, 'titles');
      return titles.map((title) => convertTimestamps(title));
    } catch (error) {
      logError('getUserTitles', error);
      return [];
    }
  }

  /**
   * Set the user's currently selected/displayed title
   * Stored in userGameStats
   */
  async setSelectedTitle(userId: string, title: string | null): Promise<void> {
    try {
      await this.updateUserGameStats(userId, {
        selectedTitle: title,
      });
    } catch (error) {
      logError('setSelectedTitle', error);
      throw error;
    }
  }

  // ==========================================
  // Daily Rewards
  // ==========================================

  /**
   * Get all daily rewards configuration
   * Stored in shared 'dailyRewards' collection
   * Returns default rewards if none are configured in Firestore
   */
  async getDailyRewards(): Promise<DailyReward[]> {
    try {
      const rewards = await getSharedDocuments<DailyReward>('dailyRewards', [
        orderBy('day', 'asc'),
      ]);

      // If no rewards are configured in Firestore, return default 7-day cycle
      if (rewards.length === 0) {
        return this.getDefaultDailyRewards();
      }

      return rewards;
    } catch (error) {
      logError('getDailyRewards', error);
      // Return default rewards on error to ensure feature works
      return this.getDefaultDailyRewards();
    }
  }

  /**
   * Get default daily rewards configuration
   * Used as fallback when no rewards are seeded in Firestore
   */
  private getDefaultDailyRewards(): DailyReward[] {
    return [
      {
        id: 1,
        day: 1,
        reward: { points: 10 },
        description: 'Day 1 login reward',
      },
      {
        id: 2,
        day: 2,
        reward: { points: 15 },
        description: 'Day 2 login reward',
      },
      {
        id: 3,
        day: 3,
        reward: { points: 20 },
        description: 'Day 3 login reward',
      },
      {
        id: 4,
        day: 4,
        reward: { points: 25 },
        description: 'Day 4 login reward',
      },
      {
        id: 5,
        day: 5,
        reward: { points: 30 },
        description: 'Day 5 login reward',
      },
      {
        id: 6,
        day: 6,
        reward: { points: 40 },
        description: 'Day 6 login reward',
      },
      {
        id: 7,
        day: 7,
        reward: { points: 50, streakFreeze: true },
        description: 'Day 7 login reward - includes streak freeze!',
      },
    ];
  }

  /**
   * Get user's claimed daily rewards
   * Stored in /users/{userId}/dailyRewardClaims
   */
  async getUserDailyRewards(userId: string, tenantId: number): Promise<UserDailyReward[]> {
    try {
      const claims = await getUserDocuments<UserDailyReward>(userId, 'dailyRewardClaims');
      return claims.map((claim) => convertTimestamps(claim));
    } catch (error) {
      logError('getUserDailyRewards', error);
      return [];
    }
  }

  /**
   * Check if user has claimed daily reward for a specific day
   */
  async hasClaimedDailyReward(userId: string, day: number): Promise<boolean> {
    try {
      const claims = await getUserDocuments<UserDailyReward>(userId, 'dailyRewardClaims', [
        where('day', '==', day),
      ]);
      return claims.length > 0;
    } catch (error) {
      logError('hasClaimedDailyReward', error);
      return false;
    }
  }

  /**
   * Claim daily reward for a specific day
   * Creates a claim record and returns it
   */
  async claimDailyReward(userId: string, day: number, tenantId: number): Promise<UserDailyReward> {
    try {
      // Check if already claimed
      const alreadyClaimed = await this.hasClaimedDailyReward(userId, day);
      if (alreadyClaimed) {
        throw new Error(`Daily reward for day ${day} has already been claimed`);
      }

      // Get the reward configuration
      const allRewards = await this.getDailyRewards();
      const rewardConfig = allRewards.find((r) => r.day === day);

      if (!rewardConfig) {
        throw new Error(`No daily reward configured for day ${day}`);
      }

      // Create claim record
      const claimId = generateId();
      const claim: UserDailyReward = {
        id: generateSafeNumericId(),
        userId,
        tenantId,
        day,
        claimedAt: new Date(),
        rewardData: rewardConfig.reward,
      };

      await setUserDocument(userId, 'dailyRewardClaims', claimId, claim);

      return claim;
    } catch (error) {
      logError('claimDailyReward', error);
      throw error;
    }
  }

  // ==========================================
  // Study Timer Operations
  // ==========================================

  /**
   * Get study timer settings for a user.
   * Settings are stored in /users/{userId}/timerSettings/default
   * @param userId - The user's unique identifier
   * @returns Study timer settings or null if not found
   */
  async getStudyTimerSettings(userId: string): Promise<StudyTimerSettings | null> {
    try {
      const settings = await getUserDocument<StudyTimerSettings>(
        userId,
        'timerSettings',
        'default'
      );
      return settings ? convertTimestamps(settings) : null;
    } catch (error) {
      logError('getStudyTimerSettings', error);
      return null;
    }
  }

  /**
   * Update study timer settings for a user.
   * Creates settings document if it doesn't exist.
   * @param userId - The user's unique identifier
   * @param settings - Partial settings to update
   * @returns Updated study timer settings
   */
  async updateStudyTimerSettings(
    userId: string,
    settings: Partial<StudyTimerSettings>
  ): Promise<StudyTimerSettings> {
    try {
      const existing = await this.getStudyTimerSettings(userId);

      const updated: StudyTimerSettings = {
        id: existing?.id || 1,
        userId,
        tenantId: 1,
        workDuration: settings.workDuration ?? existing?.workDuration ?? 25,
        breakDuration: settings.breakDuration ?? existing?.breakDuration ?? 5,
        longBreakDuration: settings.longBreakDuration ?? existing?.longBreakDuration ?? 15,
        sessionsUntilLongBreak:
          settings.sessionsUntilLongBreak ?? existing?.sessionsUntilLongBreak ?? 4,
        autoStartBreaks: settings.autoStartBreaks ?? existing?.autoStartBreaks ?? false,
        autoStartWork: settings.autoStartWork ?? existing?.autoStartWork ?? false,
        enableNotifications: settings.enableNotifications ?? existing?.enableNotifications ?? true,
        enableSound: settings.enableSound ?? existing?.enableSound ?? true,
        dailyGoalMinutes: settings.dailyGoalMinutes ?? existing?.dailyGoalMinutes ?? 120,
        customActivities: settings.customActivities ?? existing?.customActivities ?? null,
        updatedAt: new Date(),
      };

      await setUserDocument(userId, 'timerSettings', 'default', updated);
      return convertTimestamps(updated);
    } catch (error) {
      logError('updateStudyTimerSettings', error);
      throw error;
    }
  }

  /**
   * Create a new study timer session.
   * Sessions are stored in /users/{userId}/timerSessions/{sessionId}
   * @param session - Partial session data to create
   * @returns Created study timer session
   */
  async createStudyTimerSession(session: Partial<StudyTimerSession>): Promise<StudyTimerSession> {
    try {
      if (!session.userId) {
        throw new Error('userId is required to create a study timer session');
      }

      const numericId = generateSafeNumericId();
      const sessionId = numericId.toString(); // Use numeric ID as string for Firestore document ID
      const newSession: StudyTimerSession = {
        id: numericId,
        userId: session.userId,
        tenantId: session.tenantId || 1,
        sessionType: session.sessionType || 'work',
        activityLabel: session.activityLabel || null,
        duration: session.duration || 25,
        startedAt: session.startedAt || new Date(),
        completedAt: session.completedAt || null,
        isCompleted: session.isCompleted || false,
        isPaused: session.isPaused || false,
        pausedAt: session.pausedAt || null,
        totalPausedTime: session.totalPausedTime || 0,
        categoryId: session.categoryId || null,
        notes: session.notes || null,
      };

      await setUserDocument(session.userId, 'timerSessions', sessionId, newSession);
      return convertTimestamps(newSession);
    } catch (error) {
      logError('createStudyTimerSession', error);
      throw error;
    }
  }

  /**
   * Update an existing study timer session.
   * @param sessionId - The session's ID (can be string or number)
   * @param updates - Partial session data to update
   * @returns Updated study timer session
   */
  async updateStudyTimerSession(
    sessionId: string | number,
    updates: Partial<StudyTimerSession>
  ): Promise<StudyTimerSession> {
    try {
      if (!updates.userId) {
        throw new Error('userId is required to update a study timer session');
      }

      // Convert numeric sessionId to string for Firestore document lookup
      const sessionIdStr = typeof sessionId === 'number' ? sessionId.toString() : sessionId;

      const existing = await getUserDocument<StudyTimerSession>(
        updates.userId,
        'timerSessions',
        sessionIdStr
      );

      if (!existing) {
        throw new Error(`Study timer session ${sessionId} not found`);
      }

      const updated: StudyTimerSession = {
        ...existing,
        ...updates,
      };

      await setUserDocument(updates.userId, 'timerSessions', sessionIdStr, updated);
      return convertTimestamps(updated);
    } catch (error) {
      logError('updateStudyTimerSession', error);
      throw error;
    }
  }

  /**
   * Get study timer sessions within a date range.
   * Filters sessions by startedAt timestamp.
   * @param userId - The user's unique identifier
   * @param startDate - Start of date range (inclusive)
   * @param endDate - End of date range (inclusive)
   * @returns Array of study timer sessions within the date range
   */
  async getStudyTimerSessionsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<StudyTimerSession[]> {
    try {
      // Use Firestore where() clauses instead of client-side filtering
      // This significantly reduces read costs by filtering on the server
      const sessions = await getUserDocuments<StudyTimerSession>(userId, 'timerSessions', [
        where('startedAt', '>=', Timestamp.fromDate(startDate)),
        where('startedAt', '<=', Timestamp.fromDate(endDate)),
        orderBy('startedAt', 'desc'),
        limit(1000), // Safety limit to prevent excessive reads
      ]);

      return sessions.map((session) => convertTimestamps(session));
    } catch (error) {
      logError('getStudyTimerSessionsByDateRange', error);
      return [];
    }
  }

  /**
   * Get study timer statistics for a user.
   * Calculates today, week, month, and 90-day statistics.
   * Note: All-time stats limited to last 90 days for performance optimization.
   * Stats are based on up to the 1000 most recent sessions within the 90-day window.
   * @param userId - The user's unique identifier
   * @returns Study timer statistics (based on last 90 days, up to 1000 sessions)
   */
  async getStudyTimerStats(userId: string): Promise<StudyTimerStats> {
    try {
      // Query sessions from the last 90 days instead of all sessions
      // This reduces read costs while still providing accurate stats for most users
      // The 1000 session limit prevents excessive reads for high-volume users
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const sessionsRaw = await getUserDocuments<StudyTimerSession>(userId, 'timerSessions', [
        where('startedAt', '>=', Timestamp.fromDate(ninetyDaysAgo)),
        orderBy('startedAt', 'desc'),
        limit(1000), // Safety limit - caps at 1000 most recent sessions
      ]);

      // Convert Firestore timestamps to Dates before any date math
      const allSessions = sessionsRaw.map((session) =>
        convertTimestamps<StudyTimerSession>(session)
      );

      const MS_PER_DAY = 24 * 60 * 60 * 1000;
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * MS_PER_DAY);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Calculate statistics
      let todayMinutes = 0;
      let weekMinutes = 0;
      let monthMinutes = 0;
      const totalSessions = allSessions.length;
      let completedSessions = 0;
      let totalDuration = 0;

      for (const session of allSessions) {
        if (!session.startedAt) continue;
        const sessionDate = new Date(session.startedAt);
        const minutes = session.duration || 0;

        if (session.isCompleted) {
          completedSessions++;
          totalDuration += minutes;

          if (sessionDate >= todayStart) {
            todayMinutes += minutes;
          }
          if (sessionDate >= weekStart) {
            weekMinutes += minutes;
          }
          if (sessionDate >= monthStart) {
            monthMinutes += minutes;
          }
        }
      }

      const averageSessionLength = completedSessions > 0 ? totalDuration / completedSessions : 0;

      // Calculate streaks (consecutive days with at least one completed session)
      const completedSessionsByDay = new Map<string, number>();
      for (const session of allSessions) {
        if (session.isCompleted && session.startedAt) {
          const dateKey = new Date(session.startedAt).toISOString().split('T')[0];
          completedSessionsByDay.set(dateKey, (completedSessionsByDay.get(dateKey) || 0) + 1);
        }
      }

      const sortedDays = Array.from(completedSessionsByDay.keys()).sort().reverse();
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;

      // Calculate current streak (must include today or yesterday)
      const todayKey = todayStart.toISOString().split('T')[0];
      const yesterdayKey = new Date(now.getTime() - MS_PER_DAY).toISOString().split('T')[0];

      if (sortedDays.length > 0 && (sortedDays[0] === todayKey || sortedDays[0] === yesterdayKey)) {
        let checkDate = new Date(sortedDays[0]);
        for (let i = 0; i < sortedDays.length; i++) {
          const expectedKey = checkDate.toISOString().split('T')[0];
          if (sortedDays[i] === expectedKey) {
            currentStreak++;
            checkDate = new Date(checkDate.getTime() - MS_PER_DAY);
          } else {
            break;
          }
        }
      }

      // Calculate longest streak
      if (sortedDays.length > 0) {
        tempStreak = 1;
        longestStreak = 1;
        let prevDate = new Date(sortedDays[0]);

        for (let i = 1; i < sortedDays.length; i++) {
          const currDate = new Date(sortedDays[i]);
          const dayDiff = Math.floor((prevDate.getTime() - currDate.getTime()) / MS_PER_DAY);

          if (dayDiff === 1) {
            tempStreak++;
            longestStreak = Math.max(longestStreak, tempStreak);
          } else {
            tempStreak = 1;
          }
          prevDate = currDate;
        }
      }

      return {
        todayMinutes,
        weekMinutes,
        monthMinutes,
        totalSessions,
        completedSessions,
        averageSessionLength: Math.round(averageSessionLength),
        longestStreak,
        currentStreak,
      };
    } catch (error) {
      logError('getStudyTimerStats', error);
      return {
        todayMinutes: 0,
        weekMinutes: 0,
        monthMinutes: 0,
        totalSessions: 0,
        completedSessions: 0,
        averageSessionLength: 0,
        longestStreak: 0,
        currentStreak: 0,
      };
    }
  }

  // ==========================================
  // Smart Study Recommendations & Analytics
  // ==========================================
  // TODO: These methods are stub implementations that need to be completed.
  // They return empty/default values to satisfy the IClientStorage interface.
  // Implementation timeline: Q1 2025 (after Firestore migration is complete)
  // See: SMART_RECOMMENDATIONS_DOCS.md for design details

  /**
   * Get personalized study recommendations for a user.
   * @param userId - The user's unique identifier
   * @returns Array of study recommendations
   * @todo Implement Firestore-based recommendation engine using cloud functions
   */
  async getStudyRecommendations(userId: string): Promise<
    Array<{
      id: string;
      type:
        | 'focus_area'
        | 'difficulty_adjustment'
        | 'time_optimization'
        | 'streak_building'
        | 'readiness';
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      categoryId?: number;
      subcategoryId?: number;
      suggestedQuestionCount?: number;
      suggestedDifficulty?: number;
      estimatedTimeMinutes?: number;
      reasoning: string;
      actionUrl?: string;
      confidence: number;
    }>
  > {
    console.warn('[FirestoreStorage] getStudyRecommendations not yet implemented');
    return [];
  }

  /**
   * Calculate certification readiness score for a user.
   * @param userId - The user's unique identifier
   * @returns Readiness score with category breakdown and weak areas
   * @todo Implement using Firestore aggregation queries
   */
  async getReadinessScore(userId: string): Promise<{
    overall: number;
    categoryScores: Array<{
      categoryId: number;
      categoryName: string;
      score: number;
      questionsAnswered: number;
      averageScore: number;
      recommendedStudyTime: number;
    }>;
    estimatedDaysToReady: number;
    confidenceLevel: 'high' | 'medium' | 'low';
    weakAreas: Array<{
      categoryId: number;
      categoryName: string;
      subcategoryId?: number;
      subcategoryName?: string;
      currentScore: number;
      targetScore: number;
      questionsNeeded: number;
      priorityLevel: 'critical' | 'high' | 'medium' | 'low';
      improvementTrend: 'improving' | 'stable' | 'declining';
    }>;
    strengths: string[];
    nextSteps: string[];
  }> {
    console.warn('[FirestoreStorage] getReadinessScore not yet implemented');
    return {
      overall: 0,
      categoryScores: [],
      estimatedDaysToReady: 0,
      confidenceLevel: 'low',
      weakAreas: [],
      strengths: [],
      nextSteps: [],
    };
  }

  /**
   * Analyze time-of-day performance patterns.
   * @param userId - The user's unique identifier
   * @returns Array of hourly performance statistics
   * @todo Implement using Firestore timestamp queries
   */
  async getTimeOfDayPerformance(userId: string): Promise<
    Array<{
      hour: number;
      averageScore: number;
      quizCount: number;
      optimalForStudy: boolean;
    }>
  > {
    console.warn('[FirestoreStorage] getTimeOfDayPerformance not yet implemented');
    return [];
  }

  /**
   * Calculate learning velocity metrics.
   * @param userId - The user's unique identifier
   * @returns Velocity metrics including questions per day and mastery growth rate
   * @todo Implement using Firestore aggregation and time-series analysis
   */
  async getLearningVelocity(userId: string): Promise<{
    questionsPerDay: number;
    averageScoreImprovement: number;
    streakConsistency: number;
    masteryGrowthRate: number;
    predictedCertificationDate: Date | null;
  }> {
    console.warn('[FirestoreStorage] getLearningVelocity not yet implemented');
    return {
      questionsPerDay: 0,
      averageScoreImprovement: 0,
      streakConsistency: 0,
      masteryGrowthRate: 0,
      predictedCertificationDate: null,
    };
  }

  /**
   * Analyze performance for a category or subcategory.
   * @param userId - The user's unique identifier
   * @param categoryId - Optional category filter
   * @param subcategoryId - Optional subcategory filter
   * @returns Performance analysis with accuracy, difficulty distribution, and trends
   * @todo Implement using Firestore composite queries and aggregations
   */
  async analyzePerformance(
    userId: string,
    categoryId?: number,
    subcategoryId?: number
  ): Promise<{
    totalAttempts: number;
    correctAnswers: number;
    accuracy: number;
    averageTime: number;
    difficultyDistribution: Array<{
      level: number;
      count: number;
      accuracy: number;
    }>;
    recentTrend: 'improving' | 'stable' | 'declining';
    lastAttemptDate: Date | null;
  }> {
    console.warn('[FirestoreStorage] analyzePerformance not yet implemented');
    return {
      totalAttempts: 0,
      correctAnswers: 0,
      accuracy: 0,
      averageTime: 0,
      difficultyDistribution: [],
      recentTrend: 'stable',
      lastAttemptDate: null,
    };
  }

  // ==========================================
  // Product Management
  // ==========================================

  async getProducts(tenantId?: number): Promise<Product[]> {
    try {
      const products = await getSharedDocuments<Product>('products');
      const filtered = tenantId ? products.filter((p) => p.tenantId === tenantId) : products;
      return filtered.map((p) => convertTimestamps<Product>(p));
    } catch (error) {
      logError('getProducts', error, { tenantId });
      return [];
    }
  }

  async getProduct(id: number): Promise<Product | null> {
    try {
      const product = await getSharedDocument<Product>('products', id.toString());
      return product ? convertTimestamps<Product>(product) : null;
    } catch (error) {
      logError('getProduct', error, { id });
      return null;
    }
  }

  /**
   * Generate a high-entropy numeric ID to minimize collision risk
   */
  private generateNumericId(): number {
    // Prefer cryptographically strong randomness when available
    if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
      const array = new Uint32Array(2);
      crypto.getRandomValues(array);
      // Construct a 53-bit safe integer (Number.MAX_SAFE_INTEGER is 2^53 - 1)
      const high = array[0] & 0x1fffff; // 21 bits
      const low = array[1]; // 32 bits
      return high * 0x100000000 + low;
    }
    // Fallback: use Math.random within the safe integer range
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    try {
      // Validate inputs
      if (!product.title || product.title.trim().length === 0) {
        throw new Error('Product title is required');
      }
      if (!product.description || product.description.trim().length === 0) {
        throw new Error('Product description is required');
      }
      if (product.price < 0) {
        throw new Error('Product price must be non-negative');
      }
      if (!Array.isArray(product.resourceIds)) {
        throw new Error('Product resourceIds must be an array');
      }
      const validTypes = ['quiz', 'material', 'course', 'bundle'];
      if (!validTypes.includes(product.type)) {
        throw new Error(`Product type must be one of: ${validTypes.join(', ')}`);
      }

      const sanitized = {
        ...product,
        title: sanitizeInput(product.title),
        description: sanitizeInput(product.description),
      };

      if (!sanitized.title || !sanitized.description) {
        throw new Error('Product title and description are required');
      }

      const newProduct: Product = {
        id: this.generateNumericId(),
        tenantId: sanitized.tenantId || 1,
        title: sanitized.title,
        description: sanitized.description,
        type: sanitized.type,
        resourceIds: sanitized.resourceIds,
        price: sanitized.price,
        currency: sanitized.currency || 'USD',
        isPremium: sanitized.isPremium ?? false,
        subscriptionDuration: sanitized.subscriptionDuration || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setSharedDocument('products', newProduct.id.toString(), newProduct);
      return newProduct;
    } catch (error) {
      logError('createProduct', error, { product });
      throw error;
    }
  }

  async updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product | null> {
    try {
      const existing = await this.getProduct(id);
      if (!existing) return null;

      const sanitized: Partial<Product> = {
        ...updates,
        title: updates.title ? sanitizeInput(updates.title) : existing.title,
        description: updates.description
          ? sanitizeInput(updates.description)
          : existing.description,
      };

      const updated: Product = {
        ...existing,
        ...sanitized,
        updatedAt: new Date(),
      };

      await setSharedDocument('products', id.toString(), updated);
      return updated;
    } catch (error) {
      logError('updateProduct', error, { id, updates });
      return null;
    }
  }

  async deleteProduct(id: number): Promise<void> {
    try {
      // Actually delete the product document from Firestore
      const db = getFirestoreInstance();
      const docRef = firestoreDoc(db, 'products', id.toString());
      await deleteDoc(docRef);
    } catch (error) {
      logError('deleteProduct', error, { id });
      throw error;
    }
  }

  // ==========================================
  // Access Control & Permissions
  // ==========================================

  /**
   * Check if a user has access to a resource
   */
  async checkAccess(
    userId: string,
    resourceType: 'quiz' | 'lecture' | 'template',
    resourceId: number
  ): Promise<{
    allowed: boolean;
    reason?: 'purchase_required' | 'private_content' | 'not_shared_with_you' | 'access_denied';
    productId?: string;
  }> {
    try {
      // Get the resource to check visibility settings
      let resource: any;

      if (resourceType === 'quiz') {
        resource = await this.getQuiz(resourceId);
      } else if (resourceType === 'lecture') {
        resource = await this.getLecture(resourceId);
      } else {
        // Template access would need additional implementation
        return { allowed: false, reason: 'access_denied' };
      }

      if (!resource) {
        return { allowed: false, reason: 'access_denied' };
      }

      // Check if user is the creator
      if (resource.userId === userId || resource.author === userId) {
        return { allowed: true };
      }

      // Get visibility setting (default to 'private' if not set)
      const visibility = resource.visibility || 'private';

      // Check visibility level
      if (visibility === 'public') {
        // For public content, check if purchase is required
        if (resource.requiresPurchase && resource.purchaseProductId) {
          const hasPurchase = await this.checkPurchase(userId, resource.purchaseProductId);
          return {
            allowed: hasPurchase,
            reason: hasPurchase ? undefined : 'purchase_required',
            productId: resource.purchaseProductId,
          };
        }
        return { allowed: true };
      }

      if (visibility === 'private') {
        return { allowed: false, reason: 'private_content' };
      }

      if (visibility === 'shared') {
        // Check if user is in the shared user list
        if (resource.sharedWithUsers && resource.sharedWithUsers.includes(userId)) {
          return { allowed: true };
        }

        // Check if user is in any of the shared groups
        if (resource.sharedWithGroups && resource.sharedWithGroups.length > 0) {
          const isInGroup = await this.isUserInGroups(userId, resource.sharedWithGroups);
          return {
            allowed: isInGroup,
            reason: isInGroup ? undefined : 'not_shared_with_you',
          };
        }

        return { allowed: false, reason: 'not_shared_with_you' };
      }

      return { allowed: false, reason: 'access_denied' };
    } catch (error) {
      logError('checkAccess', error, { userId, resourceType, resourceId });
      return { allowed: false, reason: 'access_denied' };
    }
  }

  /**
   * Check if a user has purchased a product
   */
  async checkPurchase(userId: string, productId: string): Promise<boolean> {
    try {
      // Query purchases collection for this user and product
      const purchases = await getUserDocuments<any>(userId, 'purchases', [
        where('productId', '==', productId),
      ]);
      return purchases.length > 0;
    } catch (error) {
      logError('checkPurchase', error, { userId, productId });
      return false;
    }
  }

  /**
   * Check if a user is in any of the specified groups
   * Optimized to reduce N+1 queries by using a single collection group query
   */
  async isUserInGroups(userId: string, groupIds: number[]): Promise<boolean> {
    if (!groupIds || groupIds.length === 0) {
      return false;
    }

    try {
      // Use collection group query to check membership across all groups in a single query
      // This is more efficient than querying each group individually (N+1 problem)
      const db = getFirestoreInstance();
      const {
        collectionGroup,
        query,
        where: whereClause,
        getDocs,
      } = await import('firebase/firestore');

      // Query the members collection group for this user in any of the specified groups
      const membersQuery = query(
        collectionGroup(db, 'members'),
        whereClause('userId', '==', userId),
        whereClause('groupId', 'in', groupIds.slice(0, 10)) // Firestore 'in' limited to 10 items
      );

      const snapshot = await getDocs(membersQuery);
      if (!snapshot.empty) {
        return true;
      }

      // If there are more than 10 groups, we need to check the remaining groups
      // This is still better than N queries but handles the Firestore 'in' limitation
      if (groupIds.length > 10) {
        for (let i = 10; i < groupIds.length; i += 10) {
          const batch = groupIds.slice(i, i + 10);
          const batchQuery = query(
            collectionGroup(db, 'members'),
            whereClause('userId', '==', userId),
            whereClause('groupId', 'in', batch)
          );
          const batchSnapshot = await getDocs(batchQuery);
          if (!batchSnapshot.empty) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      logError('isUserInGroups', error, { userId, groupIds });
      return false;
    }
  }

  /**
   * Get all groups a user is a member of
   * TODO: This requires a collection group query or denormalized data structure
   * For now, returns empty array. To implement properly, consider:
   * 1. Using Firestore collection group queries with proper indexing
   * 2. Denormalizing group membership into user documents
   * 3. Maintaining a separate user-groups mapping collection
   * See issue: https://github.com/archubbuck/certlab/issues/[TBD]
   */
  async getUserGroups(userId: string): Promise<Group[]> {
    try {
      // Implementation pending: requires collection group query or denormalization
      console.warn(
        '[FirestoreStorage] getUserGroups requires collection group query implementation'
      );
      return [];
    } catch (error) {
      logError('getUserGroups', error, { userId });
      return [];
    }
  }

  /**
   * Create a new group
   */
  async createGroup(group: Partial<Group>): Promise<Group> {
    try {
      // Using 32-bit safe ID generation
      // Note: This may cause collisions in high-concurrency scenarios
      const groupId = generateSafeNumericId();
      const newGroup: Group = {
        ...group,
        id: groupId,
        name: group.name || '',
        description: group.description || '',
        ownerId: group.ownerId || '',
        tenantId: group.tenantId || 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setSharedDocument('groups', groupId.toString(), newGroup);
      return newGroup;
    } catch (error) {
      logError('createGroup', error, { group });
      throw error;
    }
  }

  /**
   * Update a group
   */
  async updateGroup(groupId: number, updates: Partial<Group>): Promise<Group> {
    try {
      const existing = await getSharedDocument<Group>('groups', groupId.toString());
      if (!existing) {
        throw new Error('Group not found');
      }

      const updated: Group = {
        ...existing,
        ...updates,
        updatedAt: new Date(),
      };

      await setSharedDocument('groups', groupId.toString(), updated);
      return updated;
    } catch (error) {
      logError('updateGroup', error, { groupId, updates });
      throw error;
    }
  }

  /**
   * Delete a group
   */
  async deleteGroup(groupId: number): Promise<void> {
    try {
      // Note: This should also delete all members, but for now just delete the group
      // In production, this would need a transaction or cloud function
      const db = getFirestoreInstance();
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'groups', groupId.toString()));
    } catch (error) {
      logError('deleteGroup', error, { groupId });
      throw error;
    }
  }

  // ==========================================
  // Purchase Management
  // ==========================================

  async getUserPurchases(userId: string): Promise<Purchase[]> {
    try {
      const purchases = await getUserDocuments<Purchase>(userId, 'purchases');
      return purchases.map((p) => convertTimestamps<Purchase>(p));
    } catch (error) {
      logError('getUserPurchases', error, { userId });
      return [];
    }
  }

  async getPurchase(id: number): Promise<Purchase | null> {
    try {
      // Since purchases are stored per-user, we need to search through users
      // For now, this is a simplified implementation
      // In production, you might want to have a global purchases collection
      console.warn('[FirestoreStorage] getPurchase by ID without userId is not optimal');
      return null;
    } catch (error) {
      logError('getPurchase', error, { id });
      return null;
    }
  }

  async getUserPurchase(userId: string, productId: number): Promise<Purchase | null> {
    try {
      const purchases = await this.getUserPurchases(userId);
      return purchases.find((p) => p.productId === productId) || null;
    } catch (error) {
      logError('getUserPurchase', error, { userId, productId });
      return null;
    }
  }

  async createPurchase(purchase: InsertPurchase): Promise<Purchase> {
    try {
      // Validate inputs
      if (!purchase.userId || purchase.userId.trim().length === 0) {
        throw new Error('Purchase userId is required');
      }
      if (!purchase.productId || typeof purchase.productId !== 'number') {
        throw new Error('Purchase productId must be a valid number');
      }
      if (purchase.amount < 0) {
        throw new Error('Purchase amount must be non-negative');
      }
      const validStatuses = ['active', 'expired', 'refunded'];
      if (purchase.status && !validStatuses.includes(purchase.status)) {
        throw new Error(`Purchase status must be one of: ${validStatuses.join(', ')}`);
      }
      const validTypes = ['quiz', 'material', 'course', 'bundle'];
      if (!validTypes.includes(purchase.productType)) {
        throw new Error(`Purchase productType must be one of: ${validTypes.join(', ')}`);
      }

      const newPurchase: Purchase = {
        id: this.generateNumericId(),
        userId: purchase.userId,
        tenantId: purchase.tenantId || 1,
        productId: purchase.productId,
        productType: purchase.productType,
        purchaseDate: new Date(),
        expiryDate: purchase.expiryDate || null,
        status: purchase.status || 'active',
        amount: purchase.amount,
        currency: purchase.currency || 'USD',
        paymentMethod: purchase.paymentMethod,
        transactionId: purchase.transactionId || null,
      };

      await setUserDocument(purchase.userId, 'purchases', newPurchase.id.toString(), newPurchase);
      return newPurchase;
    } catch (error) {
      logError('createPurchase', error, { purchase });
      throw error;
    }
  }

  async updatePurchase(id: number, updates: Partial<InsertPurchase>): Promise<Purchase | null> {
    const message =
      '[FirestoreStorage] updatePurchase is not implemented for per-user Firestore storage. ' +
      'Use user-scoped purchase methods that include userId instead.';
    console.warn(message, { id, updates });
    throw new Error(message);
  }

  async getAllPurchases(tenantId?: number): Promise<Purchase[]> {
    const message =
      '[FirestoreStorage] getAllPurchases is not implemented because it would require ' +
      'scanning all users in the per-user Firestore model.';
    console.warn(message, { tenantId });
    throw new Error(message);
  }

  async refundPurchase(id: number): Promise<Purchase | null> {
    const message =
      '[FirestoreStorage] refundPurchase is not implemented for per-user Firestore storage. ' +
      'Use user-scoped purchase refund logic that includes userId instead.';
    console.warn(message, { id });
    throw new Error(message);
  }

  async checkProductAccess(userId: string, productId: number): Promise<boolean> {
    try {
      const purchase = await this.getUserPurchase(userId, productId);

      if (!purchase) {
        return false;
      }

      // Check if purchase is active
      if (purchase.status !== 'active') {
        return false;
      }

      // Check if subscription has expired
      if (purchase.expiryDate && new Date() > new Date(purchase.expiryDate)) {
        return false;
      }

      return true;
    } catch (error) {
      logError('checkProductAccess', error, { userId, productId });
      return false;
    }
  }

  // ==========================================
  // Group Management
  // ==========================================

  /**
   * Add a user to a group
   */
  async addGroupMember(groupId: number, userId: string, addedBy: string): Promise<void> {
    try {
      const memberId = `${groupId}-${userId}`;
      const member: GroupMember = {
        id: memberId,
        groupId,
        userId,
        addedBy,
        joinedAt: new Date(),
      };

      await setSharedDocument(`groups/${groupId}/members`, memberId, member);
    } catch (error) {
      logError('addGroupMember', error, { groupId, userId, addedBy });
      throw error;
    }
  }

  /**
   * Remove a user from a group
   */
  async removeGroupMember(groupId: number, userId: string): Promise<void> {
    try {
      const memberId = `${groupId}-${userId}`;
      const db = getFirestoreInstance();
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'groups', groupId.toString(), 'members', memberId));
    } catch (error) {
      logError('removeGroupMember', error, { groupId, userId });
      throw error;
    }
  }

  /**
   * Get all members of a group
   */
  async getGroupMembers(groupId: number): Promise<GroupMember[]> {
    try {
      const members = await getSharedDocuments<GroupMember>(`groups/${groupId}/members`);
      return members.map((m) => convertTimestamps<GroupMember>(m));
    } catch (error) {
      logError('getGroupMembers', error, { groupId });
      return [];
    }
  }

  /**
   * Get all groups (for admins or searching)
   */
  async getAllGroups(tenantId?: number): Promise<Group[]> {
    try {
      let groups = await getSharedDocuments<Group>('groups');

      if (tenantId) {
        groups = groups.filter((g) => g.tenantId === tenantId);
      }

      return groups.map((g) => convertTimestamps<Group>(g));
    } catch (error) {
      logError('getAllGroups', error, { tenantId });
      return [];
    }
  }

  // ==========================================
  // Group Management
  // ==========================================

  // ==========================================
  // Template Library
  // ==========================================

  /**
   * Create a new quiz template in the library
   * Stored in /templateLibrary/quiz_{id}
   */
  async createQuizTemplateLibrary(
    template: Omit<
      import('@shared/schema').QuizTemplateLibrary,
      'id' | 'createdAt' | 'updatedAt' | 'usageCount'
    >
  ): Promise<import('@shared/schema').QuizTemplateLibrary> {
    try {
      const id = generateSafeNumericId();
      const now = new Date();

      // Build search text for indexing
      const searchText = [
        template.title,
        template.description,
        ...(template.tags || []),
        ...(template.categoryIds?.map((id) => `cat${id}`) || []),
      ]
        .join(' ')
        .toLowerCase();

      const newTemplate: import('@shared/schema').QuizTemplateLibrary = {
        ...template,
        id,
        createdAt: now,
        updatedAt: now,
        usageCount: 0,
        searchText,
        templateType: 'quiz',
      };

      await setSharedDocument('templateLibrary', `quiz_${id}`, newTemplate);
      return convertTimestamps(newTemplate);
    } catch (error) {
      logError('createQuizTemplateLibrary', error, { template });
      throw error;
    }
  }

  /**
   * Create a new material template in the library
   * Stored in /templateLibrary/material_{id}
   */
  async createMaterialTemplateLibrary(
    template: Omit<
      import('@shared/schema').MaterialTemplateLibrary,
      'id' | 'createdAt' | 'updatedAt' | 'usageCount'
    >
  ): Promise<import('@shared/schema').MaterialTemplateLibrary> {
    try {
      const id = generateSafeNumericId();
      const now = new Date();

      // Build search text for indexing
      const searchText = [
        template.title,
        template.description,
        ...(template.tags || []),
        ...(template.topics || []),
        template.categoryId ? `cat${template.categoryId}` : '',
      ]
        .join(' ')
        .toLowerCase();

      const newTemplate: import('@shared/schema').MaterialTemplateLibrary = {
        ...template,
        id,
        createdAt: now,
        updatedAt: now,
        usageCount: 0,
        searchText,
        templateType: 'material',
      };

      await setSharedDocument('templateLibrary', `material_${id}`, newTemplate);
      return convertTimestamps(newTemplate);
    } catch (error) {
      logError('createMaterialTemplateLibrary', error, { template });
      throw error;
    }
  }

  /**
   * Get a quiz template from the library by ID
   */
  async getQuizTemplateLibrary(
    templateId: number,
    userId: string
  ): Promise<import('@shared/schema').QuizTemplateLibrary | null> {
    try {
      const template = await getSharedDocument<import('@shared/schema').QuizTemplateLibrary>(
        'templateLibrary',
        `quiz_${templateId}`
      );

      if (!template) return null;

      // Check access permissions
      if (template.visibility === 'private' && template.userId !== userId) {
        return null;
      }

      if (template.visibility === 'org') {
        // Check if user is in shared users or groups
        const hasAccess =
          template.userId === userId ||
          template.sharedWithUsers?.includes(userId) ||
          (template.sharedWithGroups &&
            (await this.isUserInGroups(userId, template.sharedWithGroups)));

        if (!hasAccess) return null;
      }

      return convertTimestamps(template);
    } catch (error) {
      logError('getQuizTemplateLibrary', error, { templateId, userId });
      return null;
    }
  }

  /**
   * Get a material template from the library by ID
   */
  async getMaterialTemplateLibrary(
    templateId: number,
    userId: string
  ): Promise<import('@shared/schema').MaterialTemplateLibrary | null> {
    try {
      const template = await getSharedDocument<import('@shared/schema').MaterialTemplateLibrary>(
        'templateLibrary',
        `material_${templateId}`
      );

      if (!template) return null;

      // Check access permissions
      if (template.visibility === 'private' && template.userId !== userId) {
        return null;
      }

      if (template.visibility === 'org') {
        // Check if user is in shared users or groups
        const hasAccess =
          template.userId === userId ||
          template.sharedWithUsers?.includes(userId) ||
          (template.sharedWithGroups &&
            (await this.isUserInGroups(userId, template.sharedWithGroups)));

        if (!hasAccess) return null;
      }

      return convertTimestamps(template);
    } catch (error) {
      logError('getMaterialTemplateLibrary', error, { templateId, userId });
      return null;
    }
  }

  /**
   * Search and filter templates in the library
   */
  async searchTemplateLibrary(
    filters: import('@shared/schema').TemplateSearchFilters,
    userId: string,
    tenantId: number
  ): Promise<import('@shared/schema').TemplateLibraryItem[]> {
    try {
      // Get all templates
      const allTemplates =
        await getSharedDocuments<import('@shared/schema').TemplateLibraryItem>('templateLibrary');

      // Filter by type if specified
      let templates = filters.templateType
        ? allTemplates.filter((t) => t.templateType === filters.templateType)
        : allTemplates;

      // Filter by tenant
      templates = templates.filter((t) => t.tenantId === tenantId);

      // Filter by visibility and access permissions
      const accessibleTemplates = await Promise.all(
        templates.map(async (template) => {
          if (template.visibility === 'public') return template;
          if (template.visibility === 'private' && template.userId === userId) return template;
          if (template.visibility === 'org') {
            const hasAccess =
              template.userId === userId ||
              template.sharedWithUsers?.includes(userId) ||
              (template.sharedWithGroups &&
                (await this.isUserInGroups(userId, template.sharedWithGroups)));
            return hasAccess ? template : null;
          }
          return null;
        })
      );

      templates = accessibleTemplates.filter(
        (t): t is import('@shared/schema').TemplateLibraryItem => t !== null
      );

      // Apply additional filters
      if (filters.visibility) {
        templates = templates.filter((t) => t.visibility === filters.visibility);
      }

      if (filters.categoryIds && filters.categoryIds.length > 0) {
        templates = templates.filter((t) => {
          if (t.templateType === 'quiz') {
            return t.categoryIds.some((cid) => filters.categoryIds!.includes(cid));
          } else {
            return filters.categoryIds!.includes(t.categoryId);
          }
        });
      }

      if (filters.tags && filters.tags.length > 0) {
        templates = templates.filter((t) => filters.tags!.some((tag) => t.tags.includes(tag)));
      }

      if (filters.difficultyLevel) {
        templates = templates.filter((t) => t.difficultyLevel === filters.difficultyLevel);
      }

      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        templates = templates.filter(
          (t) =>
            t.searchText?.includes(query) ||
            t.title.toLowerCase().includes(query) ||
            t.description.toLowerCase().includes(query)
        );
      }

      if (filters.userId) {
        templates = templates.filter((t) => t.userId === filters.userId);
      }

      // Sort results
      const sortBy = filters.sortBy || 'recent';
      if (sortBy === 'recent') {
        templates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      } else if (sortBy === 'popular') {
        templates.sort((a, b) => b.usageCount - a.usageCount);
      } else if (sortBy === 'title') {
        templates.sort((a, b) => a.title.localeCompare(b.title));
      }

      // Apply limit
      if (filters.limit && filters.limit > 0) {
        templates = templates.slice(0, filters.limit);
      }

      return templates.map((t) => convertTimestamps(t));
    } catch (error) {
      logError('searchTemplateLibrary', error, { filters, userId, tenantId });
      return [];
    }
  }

  /**
   * Update a quiz template in the library
   */
  async updateQuizTemplateLibrary(
    templateId: number,
    updates: Partial<import('@shared/schema').QuizTemplateLibrary>,
    userId: string
  ): Promise<import('@shared/schema').QuizTemplateLibrary> {
    try {
      // Get existing template to check ownership
      const existing = await this.getQuizTemplateLibrary(templateId, userId);
      if (!existing) throw new Error('Template not found');
      if (existing.userId !== userId) throw new Error('Not authorized to update this template');

      // Update search text if relevant fields changed
      let searchText = existing.searchText;
      if (updates.title || updates.description || updates.tags || updates.categoryIds) {
        searchText = [
          updates.title || existing.title,
          updates.description || existing.description,
          ...(updates.tags || existing.tags || []),
          ...((updates.categoryIds || existing.categoryIds)?.map((id) => `cat${id}`) || []),
        ]
          .join(' ')
          .toLowerCase();
      }

      const updatesWithMeta = {
        ...updates,
        updatedAt: new Date(),
        searchText,
      };

      // Merge existing template with updates and write to shared templateLibrary
      const mergedTemplate = {
        ...existing,
        ...updatesWithMeta,
      };

      await setSharedDocument('templateLibrary', `quiz_${templateId}`, mergedTemplate);

      // Fetch updated template
      const updated = await this.getQuizTemplateLibrary(templateId, userId);
      if (!updated) throw new Error('Template not found after update');
      return updated;
    } catch (error) {
      logError('updateQuizTemplateLibrary', error, { templateId, updates, userId });
      throw error;
    }
  }

  /**
   * Update a material template in the library
   */
  async updateMaterialTemplateLibrary(
    templateId: number,
    updates: Partial<import('@shared/schema').MaterialTemplateLibrary>,
    userId: string
  ): Promise<import('@shared/schema').MaterialTemplateLibrary> {
    try {
      // Get existing template to check ownership
      const existing = await this.getMaterialTemplateLibrary(templateId, userId);
      if (!existing) throw new Error('Template not found');
      if (existing.userId !== userId) throw new Error('Not authorized to update this template');

      // Update search text if relevant fields changed
      let searchText = existing.searchText;
      if (
        updates.title ||
        updates.description ||
        updates.tags ||
        updates.topics ||
        updates.categoryId
      ) {
        searchText = [
          updates.title || existing.title,
          updates.description || existing.description,
          ...(updates.tags || existing.tags || []),
          ...(updates.topics || existing.topics || []),
          updates.categoryId ? `cat${updates.categoryId}` : `cat${existing.categoryId}`,
        ]
          .join(' ')
          .toLowerCase();
      }

      const updatesWithMeta = {
        ...updates,
        updatedAt: new Date(),
        searchText,
      };

      // Merge existing template with updates and write to shared templateLibrary
      const mergedTemplate = {
        ...existing,
        ...updatesWithMeta,
      };

      await setSharedDocument('templateLibrary', `material_${templateId}`, mergedTemplate);

      // Fetch updated template
      const updated = await this.getMaterialTemplateLibrary(templateId, userId);
      if (!updated) throw new Error('Template not found after update');
      return updated;
    } catch (error) {
      logError('updateMaterialTemplateLibrary', error, { templateId, updates, userId });
      throw error;
    }
  }

  /**
   * Delete a template from the library (only owner or admin)
   */
  async deleteTemplateLibrary(
    templateId: number,
    templateType: 'quiz' | 'material',
    userId: string
  ): Promise<void> {
    try {
      const docId = `${templateType}_${templateId}`;

      // Check ownership
      const template = await getSharedDocument<import('@shared/schema').TemplateLibraryItem>(
        'templateLibrary',
        docId
      );

      if (!template) throw new Error('Template not found');
      if (template.userId !== userId) throw new Error('Not authorized to delete this template');

      const db = getFirestoreInstance();
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'templateLibrary', docId));
    } catch (error) {
      logError('deleteTemplateLibrary', error, { templateId, templateType, userId });
      throw error;
    }
  }

  /**
   * Increment usage count when template is used
   */
  async incrementTemplateUsage(
    templateId: number,
    templateType: 'quiz' | 'material'
  ): Promise<void> {
    try {
      const docId = `${templateType}_${templateId}`;
      const template = await getSharedDocument<import('@shared/schema').TemplateLibraryItem>(
        'templateLibrary',
        docId
      );

      if (!template) return;

      const db = getFirestoreInstance();
      const { doc, updateDoc, increment } = await import('firebase/firestore');
      await updateDoc(doc(db, 'templateLibrary', docId), {
        usageCount: increment(1),
      });
    } catch (error) {
      logError('incrementTemplateUsage', error, { templateId, templateType });
      // Don't throw, this is non-critical
    }
  }

  /**
   * Check for duplicate templates (by title and content similarity)
   */
  async checkTemplateDuplicate(
    title: string,
    templateType: 'quiz' | 'material',
    userId: string,
    tenantId: number
  ): Promise<{ isDuplicate: boolean; existingTemplateId?: number }> {
    try {
      // Get user's templates of the same type
      const templates = await this.searchTemplateLibrary(
        { templateType, userId, sortBy: 'recent' },
        userId,
        tenantId
      );

      // Check for exact title match
      const duplicate = templates.find(
        (t) => t.title.toLowerCase().trim() === title.toLowerCase().trim()
      );

      if (duplicate) {
        return { isDuplicate: true, existingTemplateId: duplicate.id };
      }

      return { isDuplicate: false };
    } catch (error) {
      logError('checkTemplateDuplicate', error, { title, templateType, userId, tenantId });
      return { isDuplicate: false };
    }
  }

  /**
   * Get templates created by a specific user
   */
  async getUserTemplates(
    userId: string,
    templateType?: 'quiz' | 'material',
    tenantId?: number
  ): Promise<import('@shared/schema').TemplateLibraryItem[]> {
    try {
      return await this.searchTemplateLibrary(
        {
          templateType,
          userId,
          sortBy: 'recent',
        },
        userId,
        tenantId || 1
      );
    } catch (error) {
      logError('getUserTemplates', error, { userId, templateType, tenantId });
      return [];
    }
  }

  /**
   * Get popular templates (by usage count)
   */
  async getPopularTemplates(
    templateType?: 'quiz' | 'material',
    limit?: number,
    tenantId?: number
  ): Promise<import('@shared/schema').TemplateLibraryItem[]> {
    try {
      const userId = this.currentUserId;
      if (!userId) return [];

      return await this.searchTemplateLibrary(
        {
          templateType,
          sortBy: 'popular',
          limit: limit || 10,
        },
        userId,
        tenantId || 1
      );
    } catch (error) {
      logError('getPopularTemplates', error, { templateType, limit, tenantId });
      return [];
    }
  }

  /**
   * Get recent templates
   */
  async getRecentTemplates(
    templateType?: 'quiz' | 'material',
    limit?: number,
    tenantId?: number
  ): Promise<import('@shared/schema').TemplateLibraryItem[]> {
    try {
      const userId = this.currentUserId;
      if (!userId) return [];

      return await this.searchTemplateLibrary(
        {
          templateType,
          sortBy: 'recent',
          limit: limit || 10,
        },
        userId,
        tenantId || 1
      );
    } catch (error) {
      logError('getRecentTemplates', error, { templateType, limit, tenantId });
      return [];
    }
  }

  // ==========================================
  // Certificates
  // ==========================================

  /**
   * Create a new certificate
   */
  async createCertificate(
    certificate: Omit<Certificate, 'id' | 'createdAt'>
  ): Promise<Certificate> {
    try {
      const userId = certificate.userId;

      // Use Firestore auto-generated ID to prevent collisions
      const db = getFirestoreInstance();
      const { collection, doc: docFn, setDoc } = await import('firebase/firestore');
      const certificatesRef = collection(db, 'users', userId, 'certificates');
      const newDocRef = docFn(certificatesRef);
      const id = parseInt(newDocRef.id.substring(0, 8), 36); // Convert part of ID to number

      const newCertificate: Certificate = {
        ...certificate,
        id,
        createdAt: new Date(),
      };

      await setDoc(newDocRef, {
        ...newCertificate,
        completedAt: Timestamp.fromDate(
          newCertificate.completedAt instanceof Date
            ? newCertificate.completedAt
            : new Date(newCertificate.completedAt)
        ),
        createdAt: Timestamp.fromDate(newCertificate.createdAt || new Date()),
      });

      logInfo('Certificate created', { certificateId: id, userId });
      return newCertificate;
    } catch (error) {
      logError('createCertificate', error, { userId: certificate.userId });
      throw error;
    }
  }

  /**
   * Get a certificate by ID
   */
  async getCertificate(certificateId: number, userId: string): Promise<Certificate | null> {
    try {
      const doc = await getUserDocument(userId, 'certificates', certificateId.toString());
      if (!doc) return null;

      const docData = doc as any;
      return {
        ...docData,
        completedAt: timestampToDate(docData.completedAt),
        createdAt: timestampToDate(docData.createdAt),
      } as Certificate;
    } catch (error) {
      logError('getCertificate', error, { certificateId, userId });
      return null;
    }
  }

  /**
   * Get all certificates for a user
   */
  async getUserCertificates(userId: string, tenantId: number): Promise<Certificate[]> {
    try {
      const docs = await getUserDocuments(userId, 'certificates', [
        where('tenantId', '==', tenantId),
        orderBy('createdAt', 'desc'),
      ]);

      return docs.map((doc: any) => ({
        ...doc,
        completedAt: timestampToDate(doc.completedAt),
        createdAt: timestampToDate(doc.createdAt),
      })) as Certificate[];
    } catch (error) {
      logError('getUserCertificates', error, { userId, tenantId });
      return [];
    }
  }

  /**
   * Get a certificate by verification ID
   *
   * PERFORMANCE WARNING: This implementation performs a full scan across all user collections,
   * which results in O(n*m) time complexity where n = number of users and m = avg certificates per user.
   *
   * For production deployment with >100 users, you MUST implement a dedicated indexed collection:
   * - Create `/certificates/{verificationId}` collection with userId reference
   * - Update createCertificate to write to both locations (user collection + indexed collection)
   * - Update this method to query the indexed collection for O(1) lookup
   *
   * Current implementation will cause:
   * - Significant latency with moderate user base (>1000 users)
   * - High Firestore read costs (1 read per user + 1 read per matching certificate)
   * - Potential timeout issues on slower connections
   *
   * @see https://firebase.google.com/docs/firestore/query-data/queries for indexing strategies
   */
  async getCertificateByVerificationId(verificationId: string): Promise<Certificate | null> {
    try {
      // TODO: CRITICAL - Replace with indexed collection before production deployment
      // Current implementation scans all users (acceptable for small user base only)
      const db = getFirestoreInstance();
      const {
        collection,
        getDocs,
        query,
        where: whereFn,
        limit,
      } = await import('firebase/firestore');

      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);

      // WARNING: This loop iterates through ALL users - O(n) operation
      for (const userDoc of usersSnapshot.docs) {
        const certificatesRef = collection(db, 'users', userDoc.id, 'certificates');
        const certQuery = query(
          certificatesRef,
          whereFn('verificationId', '==', verificationId),
          limit(1)
        );
        const certSnapshot = await getDocs(certQuery);

        if (!certSnapshot.empty) {
          const docData = certSnapshot.docs[0].data();
          return {
            ...docData,
            completedAt: timestampToDate(docData.completedAt),
            createdAt: timestampToDate(docData.createdAt),
          } as Certificate;
        }
      }

      return null;
    } catch (error) {
      logError('getCertificateByVerificationId', error, { verificationId });
      return null;
    }
  }

  /**
   * Delete a certificate
   *
   * NOTE: This performs a hard delete, removing the certificate from the database.
   * Once deleted, the verificationId becomes unverifiable.
   *
   * For production use, consider implementing soft delete/revocation:
   * - Add 'isRevoked' and 'revokedAt' fields to Certificate schema
   * - Modify this method to update those fields instead of deleting
   * - Update verification endpoint to indicate "revoked" vs "not found"
   * - This provides better transparency and audit trail
   */
  async deleteCertificate(certificateId: number, userId: string): Promise<void> {
    try {
      await deleteUserDocument(userId, 'certificates', certificateId.toString());
      logInfo('Certificate deleted', { certificateId, userId });
    } catch (error) {
      logError('deleteCertificate', error, { certificateId, userId });
      throw error;
    }
  }

  /**
   * Get certificate templates
   */
  async getCertificateTemplates(tenantId: number): Promise<CertificateTemplate[]> {
    try {
      const docs = await getSharedDocuments('certificateTemplates', [
        where('tenantId', '==', tenantId),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc'),
      ]);

      return docs.map((doc: any) => ({
        ...doc,
        createdAt: timestampToDate(doc.createdAt),
        updatedAt: timestampToDate(doc.updatedAt),
      })) as CertificateTemplate[];
    } catch (error) {
      logError('getCertificateTemplates', error, { tenantId });
      return [];
    }
  }

  /**
   * Get a certificate template by ID
   */
  async getCertificateTemplate(templateId: number): Promise<CertificateTemplate | null> {
    try {
      const doc = await getSharedDocument('certificateTemplates', templateId.toString());
      if (!doc) return null;

      const docData = doc as any;
      return {
        ...docData,
        createdAt: timestampToDate(docData.createdAt),
        updatedAt: timestampToDate(docData.updatedAt),
      } as CertificateTemplate;
    } catch (error) {
      logError('getCertificateTemplate', error, { templateId });
      return null;
    }
  }

  /**
   * Create a new certificate template
   */
  async createCertificateTemplate(
    template: Omit<CertificateTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<CertificateTemplate> {
    try {
      const id = generateSafeNumericId();

      const newTemplate: CertificateTemplate = {
        ...template,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setSharedDocument('certificateTemplates', id.toString(), {
        ...newTemplate,
        createdAt: Timestamp.fromDate(newTemplate.createdAt || new Date()),
        updatedAt: Timestamp.fromDate(newTemplate.updatedAt || new Date()),
      });

      logInfo('Certificate template created', { templateId: id });
      return newTemplate;
    } catch (error) {
      logError('createCertificateTemplate', error);
      throw error;
    }
  }

  /**
   * Update a certificate template
   */
  async updateCertificateTemplate(
    templateId: number,
    updates: Partial<CertificateTemplate>
  ): Promise<CertificateTemplate> {
    try {
      const existing = await this.getCertificateTemplate(templateId);
      if (!existing) {
        throw new Error('Certificate template not found');
      }

      const updatedTemplate: CertificateTemplate = {
        ...existing,
        ...updates,
        id: templateId,
        updatedAt: new Date(),
      };

      // Ensure createdAt is a valid Date
      const createdAtDate =
        existing.createdAt instanceof Date
          ? existing.createdAt
          : existing.createdAt
            ? new Date(existing.createdAt)
            : new Date();

      await setSharedDocument('certificateTemplates', templateId.toString(), {
        ...updatedTemplate,
        createdAt: Timestamp.fromDate(createdAtDate),
        updatedAt: Timestamp.fromDate(updatedTemplate.updatedAt || new Date()),
      });

      logInfo('Certificate template updated', { templateId });
      return updatedTemplate;
    } catch (error) {
      logError('updateCertificateTemplate', error, { templateId });
      throw error;
    }
  }

  /**
   * Delete a certificate template
   */
  async deleteCertificateTemplate(templateId: number): Promise<void> {
    try {
      const db = getFirestoreInstance();
      const { deleteDoc: deleteDocFn, doc: docFn } = await import('firebase/firestore');
      await deleteDocFn(docFn(db, 'certificateTemplates', templateId.toString()));
      logInfo('Certificate template deleted', { templateId });
    } catch (error) {
      logError('deleteCertificateTemplate', error, { templateId });
      throw error;
    }
  }

  // ==========================================
  // Notification Management (Stub Implementations)
  // ==========================================

  /**
   * Get user notifications
   * @throws {Error} Not implemented - notification system pending full implementation
   */
  async getUserNotifications(
    userId: string,
    options?: {
      includeRead?: boolean;
      includeDismissed?: boolean;
      types?: import('@shared/schema').NotificationType[];
      limit?: number;
    }
  ): Promise<import('@shared/schema').Notification[]> {
    throw new Error(
      'getUserNotifications: Notification system not yet fully implemented in Firestore storage'
    );
  }

  /**
   * Get unread notification count
   * @throws {Error} Not implemented - notification system pending full implementation
   */
  async getUnreadNotificationCount(userId: string): Promise<number> {
    throw new Error(
      'getUnreadNotificationCount: Notification system not yet fully implemented in Firestore storage'
    );
  }

  /**
   * Create a new notification
   * @throws {Error} Not implemented - notification system pending full implementation
   */
  async createNotification(
    notification: import('@shared/schema').InsertNotification
  ): Promise<import('@shared/schema').Notification> {
    throw new Error(
      'createNotification: Notification system not yet fully implemented in Firestore storage'
    );
  }

  /**
   * Mark notification as read
   * @throws {Error} Not implemented - notification system pending full implementation
   */
  async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    throw new Error(
      'markNotificationAsRead: Notification system not yet fully implemented in Firestore storage'
    );
  }

  /**
   * Mark all notifications as read
   * @throws {Error} Not implemented - notification system pending full implementation
   */
  async markAllNotificationsAsRead(userId: string): Promise<void> {
    throw new Error(
      'markAllNotificationsAsRead: Notification system not yet fully implemented in Firestore storage'
    );
  }

  /**
   * Dismiss a notification
   * @throws {Error} Not implemented - notification system pending full implementation
   */
  async dismissNotification(notificationId: string, userId: string): Promise<void> {
    throw new Error(
      'dismissNotification: Notification system not yet fully implemented in Firestore storage'
    );
  }

  /**
   * Delete expired notifications
   * @throws {Error} Not implemented - notification system pending full implementation
   */
  async deleteExpiredNotifications(userId: string): Promise<void> {
    throw new Error(
      'deleteExpiredNotifications: Notification system not yet fully implemented in Firestore storage'
    );
  }

  /**
   * Get user notification preferences
   * @throws {Error} Not implemented - notification system pending full implementation
   */
  async getNotificationPreferences(
    userId: string
  ): Promise<import('@shared/schema').NotificationPreferences | null> {
    throw new Error(
      'getNotificationPreferences: Notification system not yet fully implemented in Firestore storage'
    );
  }

  /**
   * Update user notification preferences
   * @throws {Error} Not implemented - notification system pending full implementation
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<import('@shared/schema').NotificationPreferences>
  ): Promise<import('@shared/schema').NotificationPreferences> {
    throw new Error(
      'updateNotificationPreferences: Notification system not yet fully implemented in Firestore storage'
    );
  }

  // ==========================================
  // Enrollment Management (Stub Implementations)
  // ==========================================

  /**
   * Enroll a user in a quiz or lecture (self-enrollment)
   * @throws {Error} Not implemented - enrollment system pending full implementation
   */
  async enrollUser(
    userId: string,
    resourceType: 'quiz' | 'lecture' | 'template',
    resourceId: number,
    tenantId: number,
    requiresApproval?: boolean
  ): Promise<import('@shared/schema').Enrollment> {
    throw new Error('enrollUser: Enrollment system not yet fully implemented in Firestore storage');
  }

  /**
   * Unenroll/withdraw a user from a quiz or lecture
   * @throws {Error} Not implemented - enrollment system pending full implementation
   */
  async unenrollUser(enrollmentId: string): Promise<void> {
    throw new Error(
      'unenrollUser: Enrollment system not yet fully implemented in Firestore storage'
    );
  }

  /**
   * Get all enrollments for a user
   * @throws {Error} Not implemented - enrollment system pending full implementation
   */
  async getUserEnrollments(
    userId: string,
    tenantId: number,
    resourceType?: 'quiz' | 'lecture' | 'template'
  ): Promise<import('@shared/schema').Enrollment[]> {
    throw new Error(
      'getUserEnrollments: Enrollment system not yet fully implemented in Firestore storage'
    );
  }

  /**
   * Get all enrollments for a specific resource
   * @throws {Error} Not implemented - enrollment system pending full implementation
   */
  async getResourceEnrollments(
    resourceType: 'quiz' | 'lecture' | 'template',
    resourceId: number
  ): Promise<import('@shared/schema').Enrollment[]> {
    throw new Error(
      'getResourceEnrollments: Enrollment system not yet fully implemented in Firestore storage'
    );
  }

  /**
   * Approve an enrollment (instructor/admin)
   * @throws {Error} Not implemented - enrollment system pending full implementation
   */
  async approveEnrollment(
    enrollmentId: string,
    approvedBy: string
  ): Promise<import('@shared/schema').Enrollment> {
    throw new Error(
      'approveEnrollment: Enrollment system not yet fully implemented in Firestore storage'
    );
  }

  /**
   * Reject/deny an enrollment
   * @throws {Error} Not implemented - enrollment system pending full implementation
   */
  async rejectEnrollment(enrollmentId: string): Promise<void> {
    throw new Error(
      'rejectEnrollment: Enrollment system not yet fully implemented in Firestore storage'
    );
  }

  /**
   * Update enrollment progress
   * @throws {Error} Not implemented - enrollment system pending full implementation
   */
  async updateEnrollmentProgress(
    enrollmentId: string,
    progress: number,
    completed?: boolean
  ): Promise<import('@shared/schema').Enrollment> {
    throw new Error(
      'updateEnrollmentProgress: Enrollment system not yet fully implemented in Firestore storage'
    );
  }

  /**
   * Check if a user is enrolled in a resource
   * @throws {Error} Not implemented - enrollment system pending full implementation
   */
  async isUserEnrolled(
    userId: string,
    resourceType: 'quiz' | 'lecture' | 'template',
    resourceId: number
  ): Promise<boolean> {
    throw new Error(
      'isUserEnrolled: Enrollment system not yet fully implemented in Firestore storage'
    );
  }

  /**
   * Assign a quiz or lecture to a user (instructor/admin)
   * @throws {Error} Not implemented - assignment system pending full implementation
   */
  async assignToUser(
    userId: string,
    resourceType: 'quiz' | 'lecture' | 'template',
    resourceId: number,
    assignedBy: string,
    tenantId: number,
    dueDate?: Date,
    notes?: string
  ): Promise<import('@shared/schema').Assignment> {
    throw new Error(
      'assignToUser: Assignment system not yet fully implemented in Firestore storage'
    );
  }

  /**
   * Assign to multiple users at once
   * @throws {Error} Not implemented - assignment system pending full implementation
   */
  async assignToUsers(
    userIds: string[],
    resourceType: 'quiz' | 'lecture' | 'template',
    resourceId: number,
    assignedBy: string,
    tenantId: number,
    dueDate?: Date,
    notes?: string
  ): Promise<import('@shared/schema').Assignment[]> {
    throw new Error(
      'assignToUsers: Assignment system not yet fully implemented in Firestore storage'
    );
  }

  /**
   * Unassign a user from a quiz or lecture
   * @throws {Error} Not implemented - assignment system pending full implementation
   */
  async unassignUser(assignmentId: string): Promise<void> {
    throw new Error(
      'unassignUser: Assignment system not yet fully implemented in Firestore storage'
    );
  }

  /**
   * Get assignments for a user
   * @throws {Error} Not implemented - assignment system pending full implementation
   */
  async getUserAssignments(
    userId: string,
    tenantId: number,
    resourceType?: 'quiz' | 'lecture' | 'template',
    status?: import('@shared/schema').AssignmentStatus
  ): Promise<import('@shared/schema').Assignment[]> {
    throw new Error(
      'getUserAssignments: Assignment system not yet fully implemented in Firestore storage'
    );
  }

  /**
   * Get assignments for a resource (instructor view)
   * @throws {Error} Not implemented - assignment system pending full implementation
   */
  async getResourceAssignments(
    resourceType: 'quiz' | 'lecture' | 'template',
    resourceId: number
  ): Promise<import('@shared/schema').Assignment[]> {
    throw new Error(
      'getResourceAssignments: Assignment system not yet fully implemented in Firestore storage'
    );
  }

  /**
   * Update assignment status
   * @throws {Error} Not implemented - assignment system pending full implementation
   */
  async updateAssignmentStatus(
    assignmentId: string,
    status: import('@shared/schema').AssignmentStatus,
    score?: number,
    progress?: number
  ): Promise<import('@shared/schema').Assignment> {
    throw new Error(
      'updateAssignmentStatus: Assignment system not yet fully implemented in Firestore storage'
    );
  }

  /**
   * Update assignment progress
   * @throws {Error} Not implemented - assignment system pending full implementation
   */
  async updateAssignmentProgress(
    assignmentId: string,
    progress: number,
    started?: boolean
  ): Promise<import('@shared/schema').Assignment> {
    throw new Error(
      'updateAssignmentProgress: Assignment system not yet fully implemented in Firestore storage'
    );
  }

  /**
   * Complete an assignment
   * @throws {Error} Not implemented - assignment system pending full implementation
   */
  async completeAssignment(
    assignmentId: string,
    score?: number
  ): Promise<import('@shared/schema').Assignment> {
    throw new Error(
      'completeAssignment: Assignment system not yet fully implemented in Firestore storage'
    );
  }

  /**
   * Check if a user has an assignment for a resource
   * @throws {Error} Not implemented - assignment system pending full implementation
   */
  async hasAssignment(
    userId: string,
    resourceType: 'quiz' | 'lecture' | 'template',
    resourceId: number
  ): Promise<boolean> {
    throw new Error(
      'hasAssignment: Assignment system not yet fully implemented in Firestore storage'
    );
  }

  /**
   * Send assignment notification
   * @throws {Error} Not implemented - assignment system pending full implementation
   */
  async sendAssignmentNotification(assignmentId: string): Promise<void> {
    throw new Error(
      'sendAssignmentNotification: Assignment system not yet fully implemented in Firestore storage'
    );
  }

  /**
   * Send assignment reminder
   * @throws {Error} Not implemented - assignment system pending full implementation
   */
  async sendAssignmentReminder(assignmentId: string): Promise<void> {
    throw new Error(
      'sendAssignmentReminder: Assignment system not yet fully implemented in Firestore storage'
    );
  }

  // ==========================================
  // Prerequisite Checking
  // ==========================================

  /**
   * Check if user meets prerequisites for a resource
   * @throws {Error} Not implemented - prerequisite checking pending full implementation
   */
  async checkPrerequisites(
    userId: string,
    prerequisites: {
      quizIds?: number[];
      lectureIds?: number[];
      minimumScores?: Record<number, number>;
    }
  ): Promise<import('@shared/schema').PrerequisiteCheckResult> {
    throw new Error(
      'checkPrerequisites: Prerequisite checking not yet fully implemented in Firestore storage'
    );
  }

  /**
   * Check availability window for a resource
   * @throws {Error} Not implemented - availability checking pending full implementation
   */
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
    throw new Error(
      'checkAvailability: Availability checking not yet fully implemented in Firestore storage'
    );
  }

  // ============================================================================
  // Leaderboard Methods
  // ============================================================================

  /**
   * Update leaderboard entry for a user
   * Creates or updates the user's entry in the global and category-specific leaderboards
   */
  async updateLeaderboardEntry(
    userId: string,
    data: Partial<import('@shared/schema').LeaderboardEntry>,
    tenantId: number = 1
  ): Promise<void> {
    const db = getFirestore();

    // Get user info
    const userDoc = await getDoc(firestoreDoc(db, 'users', userId));
    const userData = userDoc.data();

    // Get user game stats for complete data
    const gameStats = await this.getUserGameStats(userId);

    // Get user's quiz history for averageScore calculation
    const quizzes = await this.getUserQuizzes(userId, tenantId);
    const completedQuizzes = quizzes.filter((q) => q.completedAt && q.score !== null);
    const averageScore =
      completedQuizzes.length > 0
        ? Math.round(
            completedQuizzes.reduce((sum, q) => sum + (q.score || 0), 0) / completedQuizzes.length
          )
        : 0;

    const leaderboardData: import('@shared/schema').LeaderboardEntry = {
      userId,
      userName: userData
        ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Anonymous'
        : 'Anonymous',
      userAvatar: userData?.profileImageUrl,
      score: data.score ?? gameStats?.totalPoints ?? 0,
      rank: 0, // Will be calculated after all entries are updated
      quizzesCompleted: data.quizzesCompleted ?? completedQuizzes.length,
      perfectScores: data.perfectScores ?? completedQuizzes.filter((q) => q.score === 100).length,
      averageScore: data.averageScore ?? averageScore,
      currentStreak: data.currentStreak ?? gameStats?.currentStreak ?? 0,
      totalBadges: data.totalBadges ?? gameStats?.totalBadgesEarned ?? 0,
      level: data.level ?? gameStats?.level ?? 1,
      lastUpdated: new Date(),
      tenantId,
    };

    // Update global leaderboard
    await setDoc(firestoreDoc(db, 'leaderboards', 'global', 'entries', userId), leaderboardData);

    // Update category-specific leaderboards if categoryId provided
    if (data.categoryId) {
      const categoryData = { ...leaderboardData, categoryId: data.categoryId };
      await setDoc(
        firestoreDoc(db, 'leaderboards', `category-${data.categoryId}`, 'entries', userId),
        categoryData
      );
    }

    // Update time-based leaderboards
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of current week
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1); // Start of current month

    // Weekly leaderboard
    const weeklyData = { ...leaderboardData, period: 'weekly' as const };
    await setDoc(
      firestoreDoc(db, 'leaderboards', `weekly-${weekStart.getTime()}`, 'entries', userId),
      weeklyData
    );

    // Monthly leaderboard
    const monthlyData = { ...leaderboardData, period: 'monthly' as const };
    await setDoc(
      firestoreDoc(db, 'leaderboards', `monthly-${monthStart.getTime()}`, 'entries', userId),
      monthlyData
    );
  }

  /**
   * Get global leaderboard
   * Returns top users sorted by score
   */
  async getGlobalLeaderboard(
    limitCount: number = 100,
    tenantId: number = 1
  ): Promise<import('@shared/schema').LeaderboardEntry[]> {
    const db = getFirestore();
    const leaderboardRef = collection(db, 'leaderboards', 'global', 'entries');
    const q = query(
      leaderboardRef,
      where('tenantId', '==', tenantId),
      orderBy('score', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map((doc) => ({
      ...doc.data(),
      lastUpdated: doc.data().lastUpdated?.toDate?.() || new Date(),
    })) as import('@shared/schema').LeaderboardEntry[];

    // Assign ranks
    return entries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  }

  /**
   * Get category-specific leaderboard
   */
  async getCategoryLeaderboard(
    categoryId: number,
    limitCount: number = 100,
    tenantId: number = 1
  ): Promise<import('@shared/schema').LeaderboardEntry[]> {
    const db = getFirestore();
    const leaderboardRef = collection(db, 'leaderboards', `category-${categoryId}`, 'entries');
    const q = query(
      leaderboardRef,
      where('tenantId', '==', tenantId),
      orderBy('score', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map((doc) => ({
      ...doc.data(),
      lastUpdated: doc.data().lastUpdated?.toDate?.() || new Date(),
    })) as import('@shared/schema').LeaderboardEntry[];

    // Assign ranks
    return entries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  }

  /**
   * Get weekly leaderboard
   */
  async getWeeklyLeaderboard(
    limitCount: number = 100,
    tenantId: number = 1
  ): Promise<import('@shared/schema').LeaderboardEntry[]> {
    const db = getFirestore();
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of current week
    weekStart.setHours(0, 0, 0, 0);

    const leaderboardRef = collection(
      db,
      'leaderboards',
      `weekly-${weekStart.getTime()}`,
      'entries'
    );
    const q = query(
      leaderboardRef,
      where('tenantId', '==', tenantId),
      orderBy('score', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map((doc) => ({
      ...doc.data(),
      lastUpdated: doc.data().lastUpdated?.toDate?.() || new Date(),
    })) as import('@shared/schema').LeaderboardEntry[];

    // Assign ranks
    return entries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  }

  /**
   * Get monthly leaderboard
   */
  async getMonthlyLeaderboard(
    limitCount: number = 100,
    tenantId: number = 1
  ): Promise<import('@shared/schema').LeaderboardEntry[]> {
    const db = getFirestore();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1); // Start of current month

    const leaderboardRef = collection(
      db,
      'leaderboards',
      `monthly-${monthStart.getTime()}`,
      'entries'
    );
    const q = query(
      leaderboardRef,
      where('tenantId', '==', tenantId),
      orderBy('score', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map((doc) => ({
      ...doc.data(),
      lastUpdated: doc.data().lastUpdated?.toDate?.() || new Date(),
    })) as import('@shared/schema').LeaderboardEntry[];

    // Assign ranks
    return entries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  }

  /**
   * Get user's rank in global leaderboard
   */
  async getUserRank(userId: string, tenantId: number = 1): Promise<number> {
    const db = getFirestore();
    const userDoc = await getDoc(firestoreDoc(db, 'leaderboards', 'global', 'entries', userId));

    if (!userDoc.exists()) {
      return 0;
    }

    const userData = userDoc.data();
    const userScore = userData.score || 0;

    // Count how many users have a higher score
    const leaderboardRef = collection(db, 'leaderboards', 'global', 'entries');
    const q = query(
      leaderboardRef,
      where('tenantId', '==', tenantId),
      where('score', '>', userScore)
    );

    const snapshot = await getDocs(q);
    return snapshot.size + 1; // User's rank is one more than the count of higher scores
  }

  // ==========================================
  // Organization Branding & Theme Preferences
  // ==========================================

  /**
   * Get organization branding configuration for a tenant
   * Stored in /tenants/{tenantId}/branding (single document)
   */
  async getOrganizationBranding(
    tenantId: number
  ): Promise<import('@shared/schema').OrganizationBranding | null> {
    try {
      const db = getFirestoreInstance();
      const brandingDoc = await getDoc(firestoreDoc(db, `tenants/${tenantId}/branding`, 'config'));

      if (!brandingDoc.exists()) {
        return null;
      }

      return convertTimestamps(brandingDoc.data());
    } catch (error) {
      logError('getOrganizationBranding', error, { tenantId });
      return null;
    }
  }

  /**
   * Set organization branding configuration
   * Only accessible by admins
   */
  async setOrganizationBranding(
    branding: import('@shared/schema').InsertOrganizationBranding
  ): Promise<void> {
    try {
      const db = getFirestoreInstance();
      const brandingData = {
        ...branding,
        updatedAt: new Date(),
      };

      await setDoc(
        firestoreDoc(db, `tenants/${branding.tenantId}/branding`, 'config'),
        brandingData
      );

      logInfo('Organization branding updated', { tenantId: branding.tenantId });
    } catch (error) {
      logError('setOrganizationBranding', error, { tenantId: branding.tenantId });
      throw error;
    }
  }

  /**
   * Get user theme preferences
   * Stored in /users/{userId}/preferences/theme
   */
  async getUserThemePreferences(
    userId: string
  ): Promise<import('@shared/schema').UserThemePreferences | null> {
    try {
      const prefs = await getUserDocument<import('@shared/schema').UserThemePreferences>(
        userId,
        'preferences',
        'theme'
      );
      return prefs ? convertTimestamps(prefs) : null;
    } catch (error) {
      logError('getUserThemePreferences', error, { userId });
      return null;
    }
  }

  /**
   * Set user theme preferences
   */
  async setUserThemePreferences(
    preferences: import('@shared/schema').InsertUserThemePreferences
  ): Promise<void> {
    try {
      const prefsData = {
        ...preferences,
        updatedAt: new Date(),
      };

      await setUserDocument(preferences.userId, 'preferences', 'theme', prefsData);
      logInfo('User theme preferences updated', { userId: preferences.userId });
    } catch (error) {
      logError('setUserThemePreferences', error, { userId: preferences.userId });
      throw error;
    }
  }

  /**
   * Update user theme preferences (partial update)
   */
  async updateUserThemePreferences(
    userId: string,
    updates: Partial<import('@shared/schema').UserThemePreferences>
  ): Promise<void> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };

      await updateUserDocument(userId, 'preferences', 'theme', updateData);
      logInfo('User theme preferences updated', { userId });
    } catch (error) {
      logError('updateUserThemePreferences', error, { userId });
      throw error;
    }
  }

  // ==========================================
  // Material Attachments
  // ==========================================

  /**
   * Get attachments for a resource (lecture, quiz, material)
   */
  async getResourceAttachments(
    userId: string,
    resourceType: 'lecture' | 'quiz' | 'material',
    resourceId: number
  ): Promise<import('@shared/schema').Attachment[]> {
    try {
      const attachments = await getUserSubcollectionDocuments<import('@shared/schema').Attachment>(
        userId,
        getCollectionName(resourceType),
        resourceId.toString(),
        'attachments'
      );
      return attachments.map((a) => convertTimestamps<import('@shared/schema').Attachment>(a));
    } catch (error) {
      logError('getResourceAttachments', error);
      return [];
    }
  }

  /**
   * Add an attachment to a resource
   */
  async addAttachment(
    userId: string,
    attachment: import('@shared/schema').InsertAttachment
  ): Promise<import('@shared/schema').Attachment> {
    try {
      const attachmentId = generateId();
      const newAttachment: import('@shared/schema').Attachment = {
        ...attachment,
        id: attachmentId,
        uploadedAt: new Date(),
      };

      await setUserSubcollectionDocument(
        userId,
        getCollectionName(attachment.resourceType),
        attachment.resourceId.toString(),
        'attachments',
        attachmentId,
        newAttachment
      );

      logInfo('addAttachment', { resourceType: attachment.resourceType, attachmentId });
      return newAttachment;
    } catch (error) {
      logError('addAttachment', error);
      throw error;
    }
  }

  /**
   * Update an attachment
   */
  async updateAttachment(
    userId: string,
    resourceType: 'lecture' | 'quiz' | 'material',
    resourceId: number,
    attachmentId: string,
    updates: Partial<import('@shared/schema').Attachment>
  ): Promise<void> {
    try {
      const db = getFirestoreInstance();
      const docRef = firestoreDoc(
        db,
        'users',
        userId,
        getCollectionName(resourceType),
        resourceId.toString(),
        'attachments',
        attachmentId
      );
      await setDoc(docRef, updates, { merge: true });
      logInfo('updateAttachment', { attachmentId });
    } catch (error) {
      logError('updateAttachment', error);
      throw error;
    }
  }

  /**
   * Delete an attachment
   */
  async deleteAttachment(
    userId: string,
    resourceType: 'lecture' | 'quiz' | 'material',
    resourceId: number,
    attachmentId: string
  ): Promise<void> {
    try {
      const db = getFirestoreInstance();
      const docRef = firestoreDoc(
        db,
        'users',
        userId,
        getCollectionName(resourceType),
        resourceId.toString(),
        'attachments',
        attachmentId
      );
      await deleteDoc(docRef);
      logInfo('deleteAttachment', { attachmentId });
    } catch (error) {
      logError('deleteAttachment', error);
      throw error;
    }
  }

  /**
   * Delete all attachments for a resource
   */
  async deleteResourceAttachments(
    userId: string,
    resourceType: 'lecture' | 'quiz' | 'material',
    resourceId: number
  ): Promise<void> {
    try {
      const attachments = await this.getResourceAttachments(userId, resourceType, resourceId);
      const deletePromises = attachments.map((attachment) =>
        this.deleteAttachment(userId, resourceType, resourceId, attachment.id)
      );
      await Promise.all(deletePromises);
      logInfo('deleteResourceAttachments', { count: attachments.length });
    } catch (error) {
      logError('deleteResourceAttachments', error);
      throw error;
    }
  }
}

// Export singleton instance
export const firestoreStorage = new FirestoreStorage();
