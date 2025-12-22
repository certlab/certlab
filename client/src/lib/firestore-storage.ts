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
  getSharedDocument,
  getSharedDocuments,
  setSharedDocument,
  getUserProfile,
  setUserProfile,
  updateUserProfile,
  Timestamp,
  timestampToDate,
} from './firestore-service';
import { logError } from './errors';
import type {
  Tenant,
  User,
  Category,
  Subcategory,
  Question,
  Quiz,
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
function generateId(): string {
  return crypto.randomUUID();
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
      const id = Date.now();
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
      const id = Date.now();
      const newCategory: Category = {
        id,
        name: category.name || '',
        description: category.description || null,
        tenantId: category.tenantId || 1,
        createdAt: new Date(),
        ...category,
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
      const id = Date.now();
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
      const id = Date.now();
      const newQuestion: Question = {
        id,
        text: question.text || '',
        options: question.options || [],
        correctAnswer: question.correctAnswer || 0,
        explanation: question.explanation || null,
        categoryId: question.categoryId || 0,
        subcategoryId: question.subcategoryId || null,
        difficultyLevel: question.difficultyLevel || 1,
        tenantId: question.tenantId || 1,
        tags: question.tags || [],
        ...question,
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
  // Quizzes
  // ==========================================

  async createQuiz(quiz: Partial<Quiz>): Promise<Quiz> {
    try {
      const userId = quiz.userId || this.currentUserId;
      if (!userId) throw new Error('User ID required');

      const id = Date.now();
      const newQuiz: Quiz = {
        id,
        userId,
        title: quiz.title || 'Untitled Quiz',
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
      const quizzes = await getUserDocuments<Quiz>(userId, 'quizzes');
      const filtered = tenantId ? quizzes.filter((q) => q.tenantId === tenantId) : quizzes;
      return filtered.map((q) => convertTimestamps<Quiz>(q));
    } catch (error) {
      logError('getUserQuizzes', error, { userId, tenantId });
      return [];
    }
  }

  async updateQuiz(id: number, updates: Partial<Quiz>): Promise<Quiz> {
    try {
      const userId = this.currentUserId;
      if (!userId) throw new Error('User ID required');

      await updateUserDocument(userId, 'quizzes', id.toString(), updates);
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
    answers: { questionId: number; answer: number }[]
  ): Promise<Quiz> {
    try {
      const quiz = await this.getQuiz(quizId);
      if (!quiz) throw new Error('Quiz not found');

      const questions = await this.getQuizQuestions(quizId);
      let correctCount = 0;

      for (const answer of answers) {
        const question = questions.find((q) => q.id === answer.questionId);
        if (question && question.correctAnswer === answer.answer) {
          correctCount++;
        }
      }

      const score = (correctCount / questions.length) * 100;
      const updates: Partial<Quiz> = {
        answers: answers.map((a) => ({ questionId: a.questionId, selectedAnswer: a.answer })),
        score,
        correctAnswers: correctCount,
        totalQuestions: questions.length,
        completedAt: new Date(),
      };

      return await this.updateQuiz(quizId, updates);
    } catch (error) {
      logError('submitQuiz', error, { quizId });
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
        id: existing?.id || Date.now(),
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

      return {
        totalQuizzes,
        averageScore,
        studyStreak: 0, // TODO: Calculate from game stats
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
      const id = Date.now();
      const lecture: Lecture = {
        id,
        userId,
        tenantId: tenantId || 1,
        quizId,
        title,
        content,
        topics,
        categoryId,
        subcategoryId: null,
        isRead: false,
        createdAt: new Date(),
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
        id: existing?.id || Date.now(),
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

      const id = Date.now();
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
        id: existing?.id || Date.now(),
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
      const id = Date.now();
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

      const id = Date.now();
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
      const id = Date.now();
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
        id: Date.now(),
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
      const id = Date.now();
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

      const id = Date.now();
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

  async getQuests(): Promise<Quest[]> {
    // TODO: Implement Firestore collection for quests
    console.warn('[FirestoreStorage] getQuests not yet implemented');
    return [];
  }

  async getActiveQuests(): Promise<Quest[]> {
    // TODO: Implement Firestore collection for quests
    console.warn('[FirestoreStorage] getActiveQuests not yet implemented');
    return [];
  }

  async getUserQuestProgressByQuest(
    userId: string,
    questId: number,
    tenantId: number
  ): Promise<UserQuestProgress | null> {
    // TODO: Implement Firestore collection for quest progress
    console.warn('[FirestoreStorage] getUserQuestProgressByQuest not yet implemented');
    return null;
  }

  async updateUserQuestProgress(
    userId: string,
    questId: number,
    progress: number,
    tenantId: number
  ): Promise<void> {
    // TODO: Implement Firestore collection for quest progress
    console.warn('[FirestoreStorage] updateUserQuestProgress not yet implemented');
  }

  async completeQuest(userId: string, questId: number, tenantId: number): Promise<void> {
    // TODO: Implement Firestore collection for quest progress
    console.warn('[FirestoreStorage] completeQuest not yet implemented');
  }

  async claimQuestReward(userId: string, questId: number, tenantId: number): Promise<void> {
    // TODO: Implement Firestore collection for quest rewards
    console.warn('[FirestoreStorage] claimQuestReward not yet implemented');
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
    // TODO: Implement Firestore collection for titles
    console.warn('[FirestoreStorage] unlockTitle not yet implemented');
  }

  async getUserTitles(userId: string, tenantId: number): Promise<UserTitle[]> {
    // TODO: Implement Firestore collection for titles
    console.warn('[FirestoreStorage] getUserTitles not yet implemented');
    return [];
  }

  async setSelectedTitle(userId: string, title: string | null): Promise<void> {
    // TODO: Implement Firestore collection for selected title
    console.warn('[FirestoreStorage] setSelectedTitle not yet implemented');
  }

  // ==========================================
  // Daily Rewards
  // ==========================================

  async hasClaimedDailyReward(userId: string, day: number): Promise<boolean> {
    // TODO: Implement Firestore collection for daily rewards
    console.warn('[FirestoreStorage] hasClaimedDailyReward not yet implemented');
    return false;
  }

  async claimDailyReward(userId: string, day: number, tenantId: number): Promise<UserDailyReward> {
    // TODO: Implement Firestore collection for daily rewards
    console.warn('[FirestoreStorage] claimDailyReward not yet implemented');
    throw new Error('Daily rewards not yet implemented for Firestore');
  }
}

// Export singleton instance
export const firestoreStorage = new FirestoreStorage();
