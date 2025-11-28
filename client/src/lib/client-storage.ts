/**
 * Client-side storage service
 * 
 * Implements the IClientStorage interface using IndexedDB as the storage backend.
 * This follows the adapter pattern defined in the shared storage-interface.ts,
 * allowing the client to use the same data access patterns as the server
 * while using browser-native storage instead of PostgreSQL.
 * 
 * ## Architecture
 * 
 * This service acts as the primary data access layer for the client-side
 * application, providing:
 * 
 * - CRUD operations for all data entities (users, quizzes, categories, etc.)
 * - Multi-tenant data isolation
 * - User authentication state management
 * - Achievement and gamification tracking
 * - Token-based access control
 * 
 * ## Usage
 * 
 * ```typescript
 * import { clientStorage } from './client-storage';
 * 
 * // Get current user's quizzes
 * const quizzes = await clientStorage.getUserQuizzes(userId, tenantId);
 * 
 * // Create a new quiz
 * const quiz = await clientStorage.createQuiz({
 *   userId,
 *   title: 'CISSP Practice',
 *   categoryIds: [1],
 *   questionCount: 10,
 * });
 * 
 * // Submit quiz answers
 * const result = await clientStorage.submitQuiz(quiz.id, answers);
 * ```
 * 
 * @module client-storage
 */

import { indexedDBService, STORES } from './indexeddb';
import type {
  Tenant, User, Category, Subcategory, Question, Quiz, UserProgress,
  MasteryScore, Badge, UserBadge, UserGameStats, Challenge, ChallengeAttempt,
  StudyGroup, StudyGroupMember, PracticeTest, PracticeTestAttempt,
  InsertCategory, InsertSubcategory, InsertQuestion, InsertUserProgress,
  Lecture, InsertLecture
} from '@shared/schema';
import type {
  IClientStorage,
  UserStatsResult,
  UserGoals,
  CertificationMasteryScore
} from '@shared/storage-interface';

/**
 * Generates a unique identifier using the Web Crypto API.
 * Provides better uniqueness guarantees than Math.random()-based approaches.
 * 
 * @returns A UUID v4 string
 */
function generateId(): string {
  return crypto.randomUUID();
}

class ClientStorage implements IClientStorage {
  // Settings
  async getCurrentUserId(): Promise<string | null> {
    const setting = await indexedDBService.get<{ key: string; value: string }>(STORES.settings, 'currentUserId');
    return setting?.value || null;
  }

  async setCurrentUserId(userId: string): Promise<void> {
    await indexedDBService.put(STORES.settings, { key: 'currentUserId', value: userId });
  }

  async clearCurrentUser(): Promise<void> {
    await indexedDBService.delete(STORES.settings, 'currentUserId');
  }

  // Tenant management
  async getTenants(): Promise<Tenant[]> {
    return await indexedDBService.getAll<Tenant>(STORES.tenants);
  }

  async getTenant(id: number): Promise<Tenant | undefined> {
    return await indexedDBService.get<Tenant>(STORES.tenants, id);
  }

  async createTenant(tenant: Partial<Tenant>): Promise<Tenant> {
    const newTenant: Omit<Tenant, 'id'> = {
      name: tenant.name!,
      domain: tenant.domain || null,
      settings: tenant.settings || {},
      isActive: tenant.isActive !== undefined ? tenant.isActive : true,
      createdAt: tenant.createdAt || new Date(),
    };
    const id = await indexedDBService.add(STORES.tenants, newTenant);
    return { ...newTenant, id: Number(id) };
  }

  async updateTenant(id: number, updates: Partial<Tenant>): Promise<Tenant | null> {
    const tenant = await this.getTenant(id);
    if (!tenant) return null;
    
    const updatedTenant = { ...tenant, ...updates };
    await indexedDBService.put(STORES.tenants, updatedTenant);
    return updatedTenant;
  }

  async getUsersByTenant(tenantId: number): Promise<User[]> {
    return await indexedDBService.getByIndex<User>(STORES.users, 'tenantId', tenantId);
  }

  // User management
  async getUser(id: string): Promise<User | undefined> {
    return await indexedDBService.get<User>(STORES.users, id);
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return await indexedDBService.getOneByIndex<User>(STORES.users, 'email', email);
  }

  async createUser(user: Partial<User>): Promise<User> {
    const newUser: User = {
      id: user.id || generateId(),
      email: user.email!,
      passwordHash: user.passwordHash || null,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      profileImageUrl: user.profileImageUrl || null,
      role: user.role || 'user',
      tenantId: user.tenantId || 1,
      certificationGoals: user.certificationGoals || null,
      studyPreferences: user.studyPreferences || null,
      skillsAssessment: user.skillsAssessment || null,
      polarCustomerId: user.polarCustomerId || null,
      tokenBalance: user.tokenBalance ?? 100, // Start with 100 free tokens
      createdAt: user.createdAt || new Date(),
      updatedAt: user.updatedAt || new Date(),
    };
    await indexedDBService.put(STORES.users, newUser);
    return newUser;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const user = await this.getUser(id);
    if (!user) return null;
    
    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    await indexedDBService.put(STORES.users, updatedUser);
    return updatedUser;
  }

  async updateUserGoals(id: string, goals: UserGoals): Promise<User | null> {
    return this.updateUser(id, goals);
  }

  // Categories
  async getCategories(tenantId: number = 1): Promise<Category[]> {
    const all = await indexedDBService.getByIndex<Category>(STORES.categories, 'tenantId', tenantId);
    return all;
  }

  async createCategory(category: Partial<Category>): Promise<Category> {
    const newCategory: Omit<Category, 'id'> = {
      tenantId: category.tenantId || 1,
      name: category.name!,
      description: category.description || null,
      icon: category.icon || null,
    };
    const id = await indexedDBService.add(STORES.categories, newCategory);
    return { ...newCategory, id: Number(id) };
  }

  async updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category> {
    const category = await indexedDBService.get<Category>(STORES.categories, id);
    if (!category) throw new Error('Category not found');
    
    const updated = { ...category, ...updates };
    await indexedDBService.put(STORES.categories, updated);
    return updated;
  }

  async deleteCategory(id: number): Promise<void> {
    await indexedDBService.delete(STORES.categories, id);
  }

  // Subcategories
  async getSubcategories(categoryId?: number, tenantId: number = 1): Promise<Subcategory[]> {
    if (categoryId) {
      // Filter by both categoryId and tenantId to maintain data isolation
      // Using in-memory filter since IndexedDB doesn't support compound index queries directly
      const allForCategory = await indexedDBService.getByIndex<Subcategory>(STORES.subcategories, 'categoryId', categoryId);
      return allForCategory.filter(sub => sub.tenantId === tenantId);
    }
    return await indexedDBService.getByIndex<Subcategory>(STORES.subcategories, 'tenantId', tenantId);
  }

  async createSubcategory(subcategory: Partial<Subcategory>): Promise<Subcategory> {
    const newSubcategory: Omit<Subcategory, 'id'> = {
      tenantId: subcategory.tenantId || 1,
      categoryId: subcategory.categoryId!,
      name: subcategory.name!,
      description: subcategory.description || null,
    };
    const id = await indexedDBService.add(STORES.subcategories, newSubcategory);
    return { ...newSubcategory, id: Number(id) };
  }

  async updateSubcategory(id: number, updates: Partial<InsertSubcategory>): Promise<Subcategory> {
    const subcategory = await indexedDBService.get<Subcategory>(STORES.subcategories, id);
    if (!subcategory) throw new Error('Subcategory not found');
    
    const updated = { ...subcategory, ...updates };
    await indexedDBService.put(STORES.subcategories, updated);
    return updated;
  }

  async deleteSubcategory(id: number): Promise<void> {
    await indexedDBService.delete(STORES.subcategories, id);
  }

  // Questions
  async getQuestionsByCategories(
    categoryIds: number[],
    subcategoryIds?: number[],
    difficultyLevels?: number[],
    tenantId: number = 1
  ): Promise<Question[]> {
    const allQuestions = await indexedDBService.getByIndex<Question>(STORES.questions, 'tenantId', tenantId);
    
    return allQuestions.filter(q => {
      const categoryMatch = categoryIds.includes(q.categoryId);
      const subcategoryMatch = !subcategoryIds || subcategoryIds.length === 0 || subcategoryIds.includes(q.subcategoryId);
      const difficultyMatch = !difficultyLevels || difficultyLevels.length === 0 || (q.difficultyLevel && difficultyLevels.includes(q.difficultyLevel));
      return categoryMatch && subcategoryMatch && difficultyMatch;
    });
  }

  async getQuestion(id: number): Promise<Question | undefined> {
    return await indexedDBService.get<Question>(STORES.questions, id);
  }

  async createQuestion(question: Partial<Question>): Promise<Question> {
    const newQuestion: Omit<Question, 'id'> = {
      tenantId: question.tenantId || 1,
      categoryId: question.categoryId!,
      subcategoryId: question.subcategoryId!,
      text: question.text!,
      options: question.options!,
      correctAnswer: question.correctAnswer!,
      explanation: question.explanation || null,
      difficultyLevel: question.difficultyLevel || 1,
      tags: question.tags || null,
    };
    const id = await indexedDBService.add(STORES.questions, newQuestion);
    return { ...newQuestion, id: Number(id) };
  }

  async updateQuestion(id: number, updates: Partial<InsertQuestion>): Promise<Question> {
    const question = await indexedDBService.get<Question>(STORES.questions, id);
    if (!question) throw new Error('Question not found');
    
    const updated = { ...question, ...updates };
    await indexedDBService.put(STORES.questions, updated);
    return updated;
  }

  async deleteQuestion(id: number): Promise<void> {
    await indexedDBService.delete(STORES.questions, id);
  }

  async getQuestionsByTenant(tenantId: number): Promise<Question[]> {
    return await indexedDBService.getByIndex<Question>(STORES.questions, 'tenantId', tenantId);
  }

  // Quizzes
  async createQuiz(quiz: Partial<Quiz>): Promise<Quiz> {
    const newQuiz: Omit<Quiz, 'id'> = {
      userId: quiz.userId!,
      tenantId: quiz.tenantId || 1,
      title: quiz.title!,
      categoryIds: quiz.categoryIds!,
      subcategoryIds: quiz.subcategoryIds || [],
      questionIds: quiz.questionIds || null,
      questionCount: quiz.questionCount!,
      timeLimit: quiz.timeLimit || null,
      startedAt: quiz.startedAt || new Date(),
      completedAt: quiz.completedAt || null,
      score: quiz.score || null,
      correctAnswers: quiz.correctAnswers || null,
      totalQuestions: quiz.totalQuestions || null,
      answers: quiz.answers || null,
      isAdaptive: quiz.isAdaptive || false,
      adaptiveMetrics: quiz.adaptiveMetrics || null,
      difficultyLevel: quiz.difficultyLevel || 1,
      difficultyFilter: quiz.difficultyFilter || null,
      isPassing: quiz.isPassing || false,
      missedTopics: quiz.missedTopics || null,
      mode: quiz.mode || 'study',
    };
    const id = await indexedDBService.add(STORES.quizzes, newQuiz);
    return { ...newQuiz, id: Number(id) };
  }

  async getQuiz(id: number): Promise<Quiz | undefined> {
    return await indexedDBService.get<Quiz>(STORES.quizzes, id);
  }

  async getQuizQuestions(quizId: number): Promise<Question[]> {
    const quiz = await this.getQuiz(quizId);
    if (!quiz) {
      throw new Error(`Quiz with id ${quizId} not found`);
    }

    // If quiz already has questionIds stored, retrieve those specific questions
    if (quiz.questionIds && Array.isArray(quiz.questionIds) && quiz.questionIds.length > 0) {
      const questions = await Promise.all(
        quiz.questionIds.map(id => this.getQuestion(id))
      );
      // Filter out any null/undefined questions
      return questions.filter((q): q is Question => q !== undefined);
    }

    // Ensure categoryIds is an array
    const categoryIds = Array.isArray(quiz.categoryIds) ? quiz.categoryIds : [];
    if (categoryIds.length === 0) {
      throw new Error(`Quiz ${quizId} has no category IDs configured`);
    }
    
    const subcategoryIds = Array.isArray(quiz.subcategoryIds) && quiz.subcategoryIds.length > 0 
      ? quiz.subcategoryIds 
      : undefined;

    // Get questions based on quiz categories and subcategories
    const questions = await this.getQuestionsByCategories(
      categoryIds,
      subcategoryIds,
      quiz.difficultyFilter && Array.isArray(quiz.difficultyFilter) && quiz.difficultyFilter.length > 0
        ? quiz.difficultyFilter
        : undefined,
      quiz.tenantId
    );

    // Use proper Fisher-Yates shuffle
    const { shuffleArray } = await import('@/lib/questions');
    const shuffled = shuffleArray(questions);
    
    // Warn if not enough questions are available
    if (questions.length < quiz.questionCount) {
      console.warn(`Only ${questions.length} questions available, but ${quiz.questionCount} were requested for quiz ${quizId}`);
    }
    
    // Return requested number of questions (or as many as available)
    const selectedQuestions = shuffled.slice(0, Math.min(questions.length, quiz.questionCount));
    
    // Store the question IDs in the quiz for consistent scoring
    await this.updateQuiz(quizId, { 
      questionIds: selectedQuestions.map(q => q.id) 
    });
    
    return selectedQuestions;
  }

  async getUserQuizzes(userId: string, tenantId?: number): Promise<Quiz[]> {
    const quizzes = await indexedDBService.getByIndex<Quiz>(STORES.quizzes, 'userId', userId);
    // Filter by tenantId if provided (for tenant isolation)
    const filtered = tenantId !== undefined 
      ? quizzes.filter(q => q.tenantId === tenantId)
      : quizzes;
    return filtered.sort((a, b) => {
      const aDate = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const bDate = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      return bDate - aDate;
    });
  }

  async updateQuiz(id: number, updates: Partial<Quiz>): Promise<Quiz> {
    const quiz = await indexedDBService.get<Quiz>(STORES.quizzes, id);
    if (!quiz) throw new Error('Quiz not found');
    
    const updated = { ...quiz, ...updates };
    await indexedDBService.put(STORES.quizzes, updated);
    return updated;
  }

  async submitQuiz(quizId: number, answers: { questionId: number; answer: number }[]): Promise<Quiz> {
    const quiz = await this.getQuiz(quizId);
    if (!quiz) throw new Error('Quiz not found');

    // Get all questions for the quiz - this will use stored questionIds if available
    // ensuring we score against the same questions that were presented
    const questions = await this.getQuizQuestions(quizId);
    
    // Calculate score
    let correctAnswers = 0;
    answers.forEach(answer => {
      const question = questions.find(q => q.id === answer.questionId);
      if (question && question.correctAnswer === answer.answer) {
        correctAnswers++;
      }
    });

    const totalQuestions = questions.length;
    const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const isPassing = score >= 85;

    // Update quiz with completion data
    const updatedQuiz = await this.updateQuiz(quizId, {
      completedAt: new Date(),
      answers: answers,
      score: score,
      correctAnswers: correctAnswers,
      totalQuestions: totalQuestions,
      isPassing: isPassing
    });

    return updatedQuiz;
  }

  // User Progress
  async getUserProgress(userId: string, tenantId?: number): Promise<UserProgress[]> {
    const allProgress = await indexedDBService.getByIndex<UserProgress>(STORES.userProgress, 'userId', userId);
    // Filter by tenantId if provided (for tenant isolation)
    return tenantId !== undefined 
      ? allProgress.filter(p => p.tenantId === tenantId)
      : allProgress;
  }

  async updateUserProgress(userId: string, categoryId: number, progress: Partial<UserProgress>, tenantId: number = 1): Promise<UserProgress> {
    // Try to find existing progress for this user, tenant, and category
    const allProgress = await this.getUserProgress(userId, tenantId);
    const existing = allProgress.find(p => p.categoryId === categoryId && p.tenantId === tenantId);
    
    if (existing) {
      const updated = { ...existing, ...progress };
      await indexedDBService.put(STORES.userProgress, updated);
      return updated;
    } else {
      const newProgress: Omit<UserProgress, 'id'> = {
        userId,
        tenantId,
        categoryId,
        questionsCompleted: progress.questionsCompleted || 0,
        totalQuestions: progress.totalQuestions || 0,
        averageScore: progress.averageScore || 0,
        lastQuizDate: progress.lastQuizDate || null,
        adaptiveDifficulty: progress.adaptiveDifficulty || 1,
        consecutiveCorrect: progress.consecutiveCorrect || 0,
        consecutiveWrong: progress.consecutiveWrong || 0,
        weakSubcategories: progress.weakSubcategories || null,
      };
      const id = await indexedDBService.add(STORES.userProgress, newProgress);
      return { ...newProgress, id: Number(id) };
    }
  }

  async getUserStats(userId: string, tenantId: number = 1): Promise<UserStatsResult> {
    const quizzes = await this.getUserQuizzes(userId, tenantId);
    const completedQuizzes = quizzes.filter(q => q.completedAt);
    
    const totalQuizzes = completedQuizzes.length;
    const averageScore = totalQuizzes > 0
      ? Math.round(completedQuizzes.reduce((sum, q) => sum + (q.score || 0), 0) / totalQuizzes)
      : 0;
    
    const passingQuizzes = completedQuizzes.filter(q => (q.score || 0) >= 85);
    const passingRate = totalQuizzes > 0
      ? Math.round((passingQuizzes.length / totalQuizzes) * 100)
      : 0;
    
    // Calculate study streak
    const sortedQuizzes = completedQuizzes
      .filter(q => q.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
    
    let studyStreak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (const quiz of sortedQuizzes) {
      const quizDate = new Date(quiz.completedAt!);
      quizDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((currentDate.getTime() - quizDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === studyStreak) {
        studyStreak++;
      } else if (daysDiff > studyStreak) {
        break;
      }
    }
    
    const masteryScore = await this.calculateOverallMasteryScore(userId, tenantId);
    
    return {
      totalQuizzes,
      averageScore,
      studyStreak,
      certifications: 0, // Not implemented in client-side version
      passingRate,
      masteryScore,
    };
  }

  // Lectures
  async createLecture(userId: string, quizId: number, title: string, content: string, topics: string[], categoryId: number, tenantId: number = 1): Promise<Lecture> {
    const lecture: Omit<Lecture, 'id'> = {
      userId,
      tenantId,
      quizId,
      title,
      content,
      topics,
      categoryId,
      subcategoryId: null,
      createdAt: new Date(),
      isRead: false,
    };
    const id = await indexedDBService.add(STORES.lectures, lecture);
    return { ...lecture, id: Number(id) };
  }

  async getUserLectures(userId: string, tenantId?: number): Promise<Lecture[]> {
    const lectures = await indexedDBService.getByIndex<Lecture>(STORES.lectures, 'userId', userId);
    // Filter by tenantId if provided (for tenant isolation)
    const filtered = tenantId !== undefined 
      ? lectures.filter((l) => l.tenantId === tenantId)
      : lectures;
    return filtered.sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });
  }

  async getLecture(id: number): Promise<Lecture | undefined> {
    return await indexedDBService.get<Lecture>(STORES.lectures, id);
  }

  // Mastery Scores
  async updateMasteryScore(userId: string, categoryId: number, subcategoryId: number, isCorrect: boolean): Promise<void> {
    const allScores = await indexedDBService.getByIndex<MasteryScore>(STORES.masteryScores, 'userId', userId);
    const existing = allScores.find(s => s.categoryId === categoryId && s.subcategoryId === subcategoryId);
    
    if (existing) {
      const newCorrect = isCorrect ? existing.correctAnswers + 1 : existing.correctAnswers;
      const newTotal = existing.totalAnswers + 1;
      const rollingAverage = Math.round((newCorrect / newTotal) * 100);
      
      const updated = {
        ...existing,
        correctAnswers: newCorrect,
        totalAnswers: newTotal,
        rollingAverage,
        lastUpdated: new Date(),
      };
      await indexedDBService.put(STORES.masteryScores, updated);
    } else {
      const newScore: Omit<MasteryScore, 'id'> = {
        userId,
        tenantId: 1,
        categoryId,
        subcategoryId,
        correctAnswers: isCorrect ? 1 : 0,
        totalAnswers: 1,
        rollingAverage: isCorrect ? 100 : 0,
        lastUpdated: new Date(),
      };
      await indexedDBService.add(STORES.masteryScores, newScore);
    }
  }

  async getUserMasteryScores(userId: string, tenantId?: number): Promise<MasteryScore[]> {
    const allScores = await indexedDBService.getByIndex<MasteryScore>(STORES.masteryScores, 'userId', userId);
    // Filter by tenantId if provided (for tenant isolation)
    return tenantId !== undefined 
      ? allScores.filter(s => s.tenantId === tenantId)
      : allScores;
  }

  async calculateOverallMasteryScore(userId: string, tenantId?: number): Promise<number> {
    const scores = await this.getUserMasteryScores(userId, tenantId);
    if (scores.length === 0) return 0;
    
    const totalAverage = scores.reduce((sum, s) => sum + s.rollingAverage, 0);
    return Math.round(totalAverage / scores.length);
  }

  async getCertificationMasteryScores(userId: string, tenantId?: number): Promise<CertificationMasteryScore[]> {
    const scores = await this.getUserMasteryScores(userId, tenantId);
    const categoryScores = new Map<number, { total: number; count: number }>();
    
    for (const score of scores) {
      const existing = categoryScores.get(score.categoryId) || { total: 0, count: 0 };
      categoryScores.set(score.categoryId, {
        total: existing.total + score.rollingAverage,
        count: existing.count + 1,
      });
    }
    
    return Array.from(categoryScores.entries()).map(([categoryId, data]) => ({
      categoryId,
      masteryScore: Math.round(data.total / data.count),
    }));
  }

  // Badges
  async getBadges(): Promise<Badge[]> {
    return await indexedDBService.getAll<Badge>(STORES.badges);
  }

  async getUserBadges(userId: string, tenantId?: number): Promise<UserBadge[]> {
    const allBadges = await indexedDBService.getByIndex<UserBadge>(STORES.userBadges, 'userId', userId);
    // Filter by tenantId if provided (for tenant isolation)
    return tenantId !== undefined 
      ? allBadges.filter(b => b.tenantId === tenantId)
      : allBadges;
  }

  async createUserBadge(userBadge: Partial<UserBadge>): Promise<UserBadge> {
    const newBadge: Omit<UserBadge, 'id'> = {
      userId: userBadge.userId!,
      tenantId: userBadge.tenantId || 1,
      badgeId: userBadge.badgeId!,
      earnedAt: userBadge.earnedAt || new Date(),
      progress: userBadge.progress || 0,
      isNotified: userBadge.isNotified || false,
    };
    const id = await indexedDBService.add(STORES.userBadges, newBadge);
    return { ...newBadge, id: Number(id) };
  }

  async updateUserBadge(id: number, updates: Partial<UserBadge>): Promise<UserBadge> {
    const badge = await indexedDBService.get<UserBadge>(STORES.userBadges, id);
    if (!badge) throw new Error('User badge not found');
    
    const updated = { ...badge, ...updates };
    await indexedDBService.put(STORES.userBadges, updated);
    return updated;
  }

  // Game Stats
  async getUserGameStats(userId: string): Promise<UserGameStats | undefined> {
    return await indexedDBService.getOneByIndex<UserGameStats>(STORES.userGameStats, 'userId', userId);
  }

  async updateUserGameStats(userId: string, updates: Partial<UserGameStats>): Promise<UserGameStats> {
    const existing = await this.getUserGameStats(userId);
    
    if (existing) {
      const updated = { ...existing, ...updates, updatedAt: new Date() };
      await indexedDBService.put(STORES.userGameStats, updated);
      return updated;
    } else {
      const newStats: Omit<UserGameStats, 'id'> = {
        userId,
        tenantId: 1,
        totalPoints: updates.totalPoints || 0,
        currentStreak: updates.currentStreak || 0,
        longestStreak: updates.longestStreak || 0,
        lastActivityDate: updates.lastActivityDate || null,
        totalBadgesEarned: updates.totalBadgesEarned || 0,
        level: updates.level || 1,
        nextLevelPoints: updates.nextLevelPoints || 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const id = await indexedDBService.add(STORES.userGameStats, newStats);
      return { ...newStats, id: Number(id) };
    }
  }

  // Challenges
  async getChallenges(userId?: string): Promise<Challenge[]> {
    if (userId) {
      return await indexedDBService.getByIndex<Challenge>(STORES.challenges, 'userId', userId);
    }
    return await indexedDBService.getAll<Challenge>(STORES.challenges);
  }

  async getChallenge(id: number): Promise<Challenge | undefined> {
    return await indexedDBService.get<Challenge>(STORES.challenges, id);
  }

  async createChallenge(challenge: Partial<Challenge>): Promise<Challenge> {
    const newChallenge: Omit<Challenge, 'id'> = {
      userId: challenge.userId!,
      type: challenge.type!,
      title: challenge.title!,
      description: challenge.description || null,
      categoryId: challenge.categoryId || null,
      subcategoryId: challenge.subcategoryId || null,
      targetScore: challenge.targetScore || 80,
      questionsCount: challenge.questionsCount || 5,
      timeLimit: challenge.timeLimit || 5,
      difficulty: challenge.difficulty || 1,
      streakMultiplier: challenge.streakMultiplier || 1,
      pointsReward: challenge.pointsReward || 50,
      isActive: challenge.isActive ?? true,
      availableAt: challenge.availableAt || new Date(),
      expiresAt: challenge.expiresAt || null,
      createdAt: challenge.createdAt || new Date(),
    };
    const id = await indexedDBService.add(STORES.challenges, newChallenge);
    return { ...newChallenge, id: Number(id) };
  }

  async getChallengeAttempts(userId: string): Promise<ChallengeAttempt[]> {
    return await indexedDBService.getByIndex<ChallengeAttempt>(STORES.challengeAttempts, 'userId', userId);
  }

  async createChallengeAttempt(attempt: Partial<ChallengeAttempt>): Promise<ChallengeAttempt> {
    const newAttempt: Omit<ChallengeAttempt, 'id'> = {
      userId: attempt.userId!,
      tenantId: attempt.tenantId || 1,
      challengeId: attempt.challengeId!,
      quizId: attempt.quizId || null,
      score: attempt.score || null,
      pointsEarned: attempt.pointsEarned || 0,
      timeSpent: attempt.timeSpent || null,
      isCompleted: attempt.isCompleted || false,
      isPassed: attempt.isPassed || false,
      answers: attempt.answers || null,
      startedAt: attempt.startedAt || new Date(),
      completedAt: attempt.completedAt || null,
    };
    const id = await indexedDBService.add(STORES.challengeAttempts, newAttempt);
    return { ...newAttempt, id: Number(id) };
  }

  // Study Groups
  async getStudyGroups(): Promise<StudyGroup[]> {
    return await indexedDBService.getAll<StudyGroup>(STORES.studyGroups);
  }

  async getStudyGroup(id: number): Promise<StudyGroup | undefined> {
    return await indexedDBService.get<StudyGroup>(STORES.studyGroups, id);
  }

  async createStudyGroup(group: Partial<StudyGroup>): Promise<StudyGroup> {
    const newGroup: Omit<StudyGroup, 'id'> = {
      tenantId: 1,
      name: group.name!,
      description: group.description || null,
      categoryIds: group.categoryIds || [],
      createdBy: group.createdBy!,
      maxMembers: group.maxMembers || 20,
      isPublic: group.isPublic ?? true,
      level: group.level || 'Intermediate',
      meetingSchedule: group.meetingSchedule || null,
      isActive: group.isActive ?? true,
      createdAt: group.createdAt || new Date(),
      updatedAt: group.updatedAt || new Date(),
    };
    const id = await indexedDBService.add(STORES.studyGroups, newGroup);
    return { ...newGroup, id: Number(id) };
  }

  async getUserStudyGroups(userId: string): Promise<StudyGroup[]> {
    const memberships = await indexedDBService.getByIndex<StudyGroupMember>(STORES.studyGroupMembers, 'userId', userId);
    const groupIds = memberships.map(m => m.groupId);
    const groups = await this.getStudyGroups();
    return groups.filter(g => groupIds.includes(g.id));
  }

  async joinStudyGroup(userId: string, groupId: number): Promise<StudyGroupMember> {
    const member: Omit<StudyGroupMember, 'id'> = {
      userId,
      groupId,
      joinedAt: new Date(),
      role: 'member',
      lastActiveAt: null,
      contributionScore: 0,
    };
    const id = await indexedDBService.add(STORES.studyGroupMembers, member);
    return { ...member, id: Number(id) };
  }

  async leaveStudyGroup(userId: string, groupId: number): Promise<void> {
    const memberships = await indexedDBService.getByIndex<StudyGroupMember>(STORES.studyGroupMembers, 'userId', userId);
    const membership = memberships.find(m => m.groupId === groupId);
    if (membership) {
      await indexedDBService.delete(STORES.studyGroupMembers, membership.id);
    }
  }

  // Practice Tests
  async getPracticeTests(): Promise<PracticeTest[]> {
    return await indexedDBService.getAll<PracticeTest>(STORES.practiceTests);
  }

  async getPracticeTest(id: number): Promise<PracticeTest | undefined> {
    return await indexedDBService.get<PracticeTest>(STORES.practiceTests, id);
  }

  async createPracticeTest(test: Partial<PracticeTest>): Promise<PracticeTest> {
    const newTest: Omit<PracticeTest, 'id'> = {
      tenantId: 1,
      name: test.name!,
      description: test.description || null,
      categoryIds: test.categoryIds || [],
      questionCount: test.questionCount || 50,
      timeLimit: test.timeLimit || 60,
      difficulty: test.difficulty || 'Medium',
      passingScore: test.passingScore || 70,
      isOfficial: test.isOfficial || false,
      questionPool: test.questionPool || null,
      createdBy: test.createdBy || null,
      isActive: test.isActive ?? true,
      createdAt: test.createdAt || new Date(),
      updatedAt: test.updatedAt || new Date(),
    };
    const id = await indexedDBService.add(STORES.practiceTests, newTest);
    return { ...newTest, id: Number(id) };
  }

  async getPracticeTestAttempts(userId: string, testId?: number): Promise<PracticeTestAttempt[]> {
    const attempts = await indexedDBService.getByIndex<PracticeTestAttempt>(STORES.practiceTestAttempts, 'userId', userId);
    if (testId) {
      return attempts.filter(a => a.testId === testId);
    }
    return attempts;
  }

  async createPracticeTestAttempt(attempt: Partial<PracticeTestAttempt>): Promise<PracticeTestAttempt> {
    const newAttempt: Omit<PracticeTestAttempt, 'id'> = {
      userId: attempt.userId!,
      testId: attempt.testId!,
      quizId: attempt.quizId || null,
      tenantId: attempt.tenantId || 1,
      score: attempt.score || null,
      isPassed: attempt.isPassed || false,
      timeSpent: attempt.timeSpent || null,
      startedAt: attempt.startedAt || new Date(),
      completedAt: attempt.completedAt || null,
    };
    const id = await indexedDBService.add(STORES.practiceTestAttempts, newAttempt);
    return { ...newAttempt, id: Number(id) };
  }

  async updatePracticeTestAttempt(id: number, updates: Partial<PracticeTestAttempt>): Promise<PracticeTestAttempt> {
    const attempt = await indexedDBService.get<PracticeTestAttempt>(STORES.practiceTestAttempts, id);
    if (!attempt) throw new Error('Practice test attempt not found');
    
    const updated = { ...attempt, ...updates };
    await indexedDBService.put(STORES.practiceTestAttempts, updated);
    return updated;
  }

  // Data export/import
  async exportData(): Promise<string> {
    const data = await indexedDBService.exportData();
    return JSON.stringify(data, null, 2);
  }

  async importData(jsonData: string): Promise<void> {
    const data = JSON.parse(jsonData);
    await indexedDBService.importData(data);
  }

  async clearAllData(): Promise<void> {
    await indexedDBService.clearAllData();
    await this.clearCurrentUser();
  }

  // Token Management
  async getUserTokenBalance(userId: string): Promise<number> {
    const user = await this.getUser(userId);
    return user?.tokenBalance ?? 0;
  }

  async addTokens(userId: string, amount: number): Promise<number> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');
    
    const currentBalance = user.tokenBalance ?? 0;
    const newBalance = currentBalance + amount;
    
    await this.updateUser(userId, { tokenBalance: newBalance });
    return newBalance;
  }

  async consumeTokens(userId: string, amount: number): Promise<{ success: boolean; newBalance: number; message?: string }> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');
    
    const currentBalance = user.tokenBalance ?? 0;
    
    if (currentBalance < amount) {
      return {
        success: false,
        newBalance: currentBalance,
        message: `Insufficient tokens. You need ${amount} tokens but only have ${currentBalance}.`
      };
    }
    
    const newBalance = currentBalance - amount;
    await this.updateUser(userId, { tokenBalance: newBalance });
    
    return {
      success: true,
      newBalance,
    };
  }

  // Calculate token cost based on question count
  calculateQuizTokenCost(questionCount: number): number {
    // 1 token per question
    return questionCount;
  }

  // Get all users (for account selection on login)
  async getAllUsers(): Promise<User[]> {
    return await indexedDBService.getAll<User>(STORES.users);
  }
}

export const clientStorage = new ClientStorage();
