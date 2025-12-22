/**
 * Client-side storage service
 *
 * Implements the IClientStorage interface using IndexedDB as the primary storage backend.
 * This follows the adapter pattern defined in the shared storage-interface.ts.
 *
 * All data is stored locally in the browser's IndexedDB. There is no server-side
 * storage or PostgreSQL database. Firebase/Firestore integration is planned but
 * not yet fully implemented (see FIREBASE_IMPLEMENTATION_STATUS.md).
 *
 * ## Architecture
 *
 * This service acts as the primary data access layer for the application, providing:
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
  InsertLecture,
  StudyNote,
  MarketplacePurchase,
  StudyTimerSession,
  StudyTimerSettings,
  StudyTimerStats,
} from '@shared/schema';
import type {
  IClientStorage,
  UserStatsResult,
  UserGoals,
  CertificationMasteryScore,
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
    const setting = await indexedDBService.get<{ key: string; value: string }>(
      STORES.settings,
      'currentUserId'
    );
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
    const all = await indexedDBService.getByIndex<Category>(
      STORES.categories,
      'tenantId',
      tenantId
    );
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
      const allForCategory = await indexedDBService.getByIndex<Subcategory>(
        STORES.subcategories,
        'categoryId',
        categoryId
      );
      return allForCategory.filter((sub) => sub.tenantId === tenantId);
    }
    return await indexedDBService.getByIndex<Subcategory>(
      STORES.subcategories,
      'tenantId',
      tenantId
    );
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
    const allQuestions = await indexedDBService.getByIndex<Question>(
      STORES.questions,
      'tenantId',
      tenantId
    );

    return allQuestions.filter((q) => {
      const categoryMatch = categoryIds.includes(q.categoryId);
      const subcategoryMatch =
        !subcategoryIds || subcategoryIds.length === 0 || subcategoryIds.includes(q.subcategoryId);
      const difficultyMatch =
        !difficultyLevels ||
        difficultyLevels.length === 0 ||
        (q.difficultyLevel && difficultyLevels.includes(q.difficultyLevel));
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
      // V2 Explanation fields
      explanationSteps: question.explanationSteps || null,
      referenceLinks: question.referenceLinks || null,
      videoUrl: question.videoUrl || null,
      communityExplanations: question.communityExplanations || null,
      explanationVotes: question.explanationVotes || 0,
      hasAlternativeViews: question.hasAlternativeViews || false,
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
      const questions = await Promise.all(quiz.questionIds.map((id) => this.getQuestion(id)));
      // Filter out any null/undefined questions
      return questions.filter((q): q is Question => q !== undefined);
    }

    // Ensure categoryIds is an array
    const categoryIds = Array.isArray(quiz.categoryIds) ? quiz.categoryIds : [];
    if (categoryIds.length === 0) {
      throw new Error(`Quiz ${quizId} has no category IDs configured`);
    }

    const subcategoryIds =
      Array.isArray(quiz.subcategoryIds) && quiz.subcategoryIds.length > 0
        ? quiz.subcategoryIds
        : undefined;

    // Get questions based on quiz categories and subcategories
    const questions = await this.getQuestionsByCategories(
      categoryIds,
      subcategoryIds,
      quiz.difficultyFilter &&
        Array.isArray(quiz.difficultyFilter) &&
        quiz.difficultyFilter.length > 0
        ? quiz.difficultyFilter
        : undefined,
      quiz.tenantId
    );

    // Use proper Fisher-Yates shuffle
    const { shuffleArray } = await import('@/lib/questions');
    const shuffled = shuffleArray(questions);

    // Warn if not enough questions are available
    if (questions.length < quiz.questionCount) {
      console.warn(
        `Only ${questions.length} questions available, but ${quiz.questionCount} were requested for quiz ${quizId}`
      );
    }

    // Return requested number of questions (or as many as available)
    const selectedQuestions = shuffled.slice(0, Math.min(questions.length, quiz.questionCount));

    // Store the question IDs in the quiz for consistent scoring
    await this.updateQuiz(quizId, {
      questionIds: selectedQuestions.map((q) => q.id),
    });

    return selectedQuestions;
  }

  async getUserQuizzes(userId: string, tenantId?: number): Promise<Quiz[]> {
    const quizzes = await indexedDBService.getByIndex<Quiz>(STORES.quizzes, 'userId', userId);
    // Filter by tenantId if provided (for tenant isolation)
    const filtered =
      tenantId !== undefined ? quizzes.filter((q) => q.tenantId === tenantId) : quizzes;
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

  async submitQuiz(
    quizId: number,
    answers: { questionId: number; answer: number }[]
  ): Promise<Quiz> {
    const quiz = await this.getQuiz(quizId);
    if (!quiz) throw new Error('Quiz not found');

    // Get all questions for the quiz - this will use stored questionIds if available
    // ensuring we score against the same questions that were presented
    const questions = await this.getQuizQuestions(quizId);

    // Calculate score
    let correctAnswers = 0;
    answers.forEach((answer) => {
      const question = questions.find((q) => q.id === answer.questionId);
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
      isPassing: isPassing,
    });

    return updatedQuiz;
  }

  // User Progress
  async getUserProgress(userId: string, tenantId?: number): Promise<UserProgress[]> {
    const allProgress = await indexedDBService.getByIndex<UserProgress>(
      STORES.userProgress,
      'userId',
      userId
    );
    // Filter by tenantId if provided (for tenant isolation)
    return tenantId !== undefined
      ? allProgress.filter((p) => p.tenantId === tenantId)
      : allProgress;
  }

  async updateUserProgress(
    userId: string,
    categoryId: number,
    progress: Partial<UserProgress>,
    tenantId: number = 1
  ): Promise<UserProgress> {
    // Try to find existing progress for this user, tenant, and category
    const allProgress = await this.getUserProgress(userId, tenantId);
    const existing = allProgress.find(
      (p) => p.categoryId === categoryId && p.tenantId === tenantId
    );

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
    const completedQuizzes = quizzes.filter((q) => q.completedAt);

    const totalQuizzes = completedQuizzes.length;
    const averageScore =
      totalQuizzes > 0
        ? Math.round(completedQuizzes.reduce((sum, q) => sum + (q.score || 0), 0) / totalQuizzes)
        : 0;

    const passingQuizzes = completedQuizzes.filter((q) => (q.score || 0) >= 85);
    const passingRate =
      totalQuizzes > 0 ? Math.round((passingQuizzes.length / totalQuizzes) * 100) : 0;

    // Calculate study streak
    const sortedQuizzes = completedQuizzes
      .filter((q) => q.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

    let studyStreak = 0;
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const quiz of sortedQuizzes) {
      const quizDate = new Date(quiz.completedAt!);
      quizDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor(
        (currentDate.getTime() - quizDate.getTime()) / (1000 * 60 * 60 * 24)
      );

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
  async createLecture(
    userId: string,
    quizId: number,
    title: string,
    content: string,
    topics: string[],
    categoryId: number,
    tenantId: number = 1
  ): Promise<Lecture> {
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
    const filtered =
      tenantId !== undefined ? lectures.filter((l) => l.tenantId === tenantId) : lectures;
    return filtered.sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });
  }

  async getLecture(id: number): Promise<Lecture | undefined> {
    return await indexedDBService.get<Lecture>(STORES.lectures, id);
  }

  // Study Notes

  /**
   * Creates a new study note in the database.
   * @param studyNote - Partial study note object containing required fields (userId, title, content)
   * @returns The created study note with generated id and timestamps
   */
  async createStudyNote(studyNote: Partial<StudyNote>): Promise<StudyNote> {
    const note: Omit<StudyNote, 'id'> = {
      userId: studyNote.userId!,
      tenantId: studyNote.tenantId || 1,
      quizId: studyNote.quizId || null,
      title: studyNote.title!,
      content: studyNote.content!,
      categoryIds: studyNote.categoryIds || null,
      score: studyNote.score || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const id = await indexedDBService.add(STORES.studyNotes, note);
    return { ...note, id: Number(id) };
  }

  /**
   * Retrieves all study notes for a specific user.
   * Results are sorted by creation date (newest first) and filtered by tenant for isolation.
   * @param userId - The user's unique identifier
   * @param tenantId - Optional tenant ID for multi-tenant isolation
   * @returns Array of study notes belonging to the user
   */
  async getUserStudyNotes(userId: string, tenantId?: number): Promise<StudyNote[]> {
    const notes = await indexedDBService.getByIndex<StudyNote>(STORES.studyNotes, 'userId', userId);
    // Filter by tenantId if provided (for tenant isolation)
    const filtered = tenantId !== undefined ? notes.filter((n) => n.tenantId === tenantId) : notes;
    return filtered.sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });
  }

  /**
   * Retrieves a single study note by its ID.
   * @param id - The study note's unique identifier
   * @returns The study note if found, undefined otherwise
   */
  async getStudyNote(id: number): Promise<StudyNote | undefined> {
    return await indexedDBService.get<StudyNote>(STORES.studyNotes, id);
  }

  /**
   * Updates an existing study note with new values.
   * Automatically updates the updatedAt timestamp.
   * @param id - The study note's unique identifier
   * @param updates - Partial study note object with fields to update
   * @returns The updated study note, or null if not found
   */
  async updateStudyNote(id: number, updates: Partial<StudyNote>): Promise<StudyNote | null> {
    const note = await this.getStudyNote(id);
    if (!note) return null;

    const updatedNote = { ...note, ...updates, updatedAt: new Date() };
    await indexedDBService.put(STORES.studyNotes, updatedNote);
    return updatedNote;
  }

  /**
   * Permanently deletes a study note from the database.
   * @param id - The study note's unique identifier
   */
  async deleteStudyNote(id: number): Promise<void> {
    await indexedDBService.delete(STORES.studyNotes, id);
  }

  // Mastery Scores
  async updateMasteryScore(
    userId: string,
    categoryId: number,
    subcategoryId: number,
    isCorrect: boolean
  ): Promise<void> {
    const allScores = await indexedDBService.getByIndex<MasteryScore>(
      STORES.masteryScores,
      'userId',
      userId
    );
    const existing = allScores.find(
      (s) => s.categoryId === categoryId && s.subcategoryId === subcategoryId
    );

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
    const allScores = await indexedDBService.getByIndex<MasteryScore>(
      STORES.masteryScores,
      'userId',
      userId
    );
    // Filter by tenantId if provided (for tenant isolation)
    return tenantId !== undefined ? allScores.filter((s) => s.tenantId === tenantId) : allScores;
  }

  async calculateOverallMasteryScore(userId: string, tenantId?: number): Promise<number> {
    const scores = await this.getUserMasteryScores(userId, tenantId);
    if (scores.length === 0) return 0;

    const totalAverage = scores.reduce((sum, s) => sum + s.rollingAverage, 0);
    return Math.round(totalAverage / scores.length);
  }

  async getCertificationMasteryScores(
    userId: string,
    tenantId?: number
  ): Promise<CertificationMasteryScore[]> {
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
    const allBadges = await indexedDBService.getByIndex<UserBadge>(
      STORES.userBadges,
      'userId',
      userId
    );
    // Filter by tenantId if provided (for tenant isolation)
    return tenantId !== undefined ? allBadges.filter((b) => b.tenantId === tenantId) : allBadges;
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
    return await indexedDBService.getOneByIndex<UserGameStats>(
      STORES.userGameStats,
      'userId',
      userId
    );
  }

  async updateUserGameStats(
    userId: string,
    updates: Partial<UserGameStats>
  ): Promise<UserGameStats> {
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
    return await indexedDBService.getByIndex<ChallengeAttempt>(
      STORES.challengeAttempts,
      'userId',
      userId
    );
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
    const memberships = await indexedDBService.getByIndex<StudyGroupMember>(
      STORES.studyGroupMembers,
      'userId',
      userId
    );
    const groupIds = memberships.map((m) => m.groupId);
    const groups = await this.getStudyGroups();
    return groups.filter((g) => groupIds.includes(g.id));
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
    const memberships = await indexedDBService.getByIndex<StudyGroupMember>(
      STORES.studyGroupMembers,
      'userId',
      userId
    );
    const membership = memberships.find((m) => m.groupId === groupId);
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
    const attempts = await indexedDBService.getByIndex<PracticeTestAttempt>(
      STORES.practiceTestAttempts,
      'userId',
      userId
    );
    if (testId) {
      return attempts.filter((a) => a.testId === testId);
    }
    return attempts;
  }

  async createPracticeTestAttempt(
    attempt: Partial<PracticeTestAttempt>
  ): Promise<PracticeTestAttempt> {
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

  async updatePracticeTestAttempt(
    id: number,
    updates: Partial<PracticeTestAttempt>
  ): Promise<PracticeTestAttempt> {
    const attempt = await indexedDBService.get<PracticeTestAttempt>(
      STORES.practiceTestAttempts,
      id
    );
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

  async consumeTokens(
    userId: string,
    amount: number
  ): Promise<{ success: boolean; newBalance: number; message?: string }> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');

    const currentBalance = user.tokenBalance ?? 0;

    if (currentBalance < amount) {
      return {
        success: false,
        newBalance: currentBalance,
        message: `Insufficient tokens. You need ${amount} tokens but only have ${currentBalance}.`,
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

  // ==========================================
  // Marketplace Operations
  // ==========================================

  /**
   * Purchases a study material from the marketplace.
   * This is a transactional operation that:
   * 1. Validates the user has sufficient tokens
   * 2. Checks if the material is already purchased
   * 3. Deducts tokens from user balance
   * 4. Records the purchase
   *
   * @param userId - The user making the purchase
   * @param materialId - Unique identifier for the study material
   * @param materialName - Name of the study material
   * @param materialType - Type/category of the material
   * @param tokensCost - Cost in tokens
   * @returns Purchase result with success status and updated balance
   */
  async purchaseMaterial(
    userId: string,
    materialId: string,
    materialName: string,
    materialType: string,
    tokensCost: number
  ): Promise<{
    success: boolean;
    purchase?: MarketplacePurchase;
    newBalance: number;
    message?: string;
    requiresIntervention?: boolean;
  }> {
    // Get user to validate and get current balance
    const user = await this.getUser(userId);
    if (!user) {
      return {
        success: false,
        newBalance: 0,
        message: 'User not found',
      };
    }

    const currentBalance = user.tokenBalance ?? 0;

    // Check if already purchased
    const existingPurchase = await this.getUserPurchase(userId, materialId);
    if (existingPurchase) {
      return {
        success: false,
        newBalance: currentBalance,
        message: 'You have already purchased this material.',
      };
    }

    // Check if user has sufficient tokens
    if (currentBalance < tokensCost) {
      return {
        success: false,
        newBalance: currentBalance,
        message: `Insufficient tokens. You need ${tokensCost} tokens but only have ${currentBalance}.`,
      };
    }

    // Calculate new balance
    const newBalance = currentBalance - tokensCost;

    // Record the purchase first (before deducting tokens)
    // This way if the purchase recording fails, no tokens are lost
    const purchase: Omit<MarketplacePurchase, 'id'> = {
      userId,
      materialId,
      materialName,
      materialType,
      tokensCost,
      purchasedAt: new Date(),
    };

    let purchaseId: number;
    try {
      const id = await indexedDBService.add(STORES.marketplacePurchases, purchase);
      purchaseId = Number(id);
    } catch (error) {
      // Purchase recording failed, no tokens deducted
      return {
        success: false,
        newBalance: currentBalance,
        message: 'Failed to record purchase. Please try again.',
      };
    }

    // Now deduct tokens - if this fails, we need to rollback the purchase
    try {
      await this.updateUser(userId, { tokenBalance: newBalance });
    } catch (error) {
      // Token deduction failed, rollback the purchase
      let rollbackSucceeded = true;
      try {
        await indexedDBService.delete(STORES.marketplacePurchases, purchaseId);
      } catch {
        // Rollback failed - log for manual intervention
        rollbackSucceeded = false;
        console.error(
          `Critical: Failed to rollback purchase ${purchaseId} after token deduction failure. ` +
            `Manual intervention required: purchase record exists but token balance was not updated.`
        );
      }

      return {
        success: false,
        newBalance: currentBalance,
        message: rollbackSucceeded
          ? 'Purchase failed due to a system error. Please try again.'
          : 'A transaction error occurred. Please contact support if the issue persists.',
        requiresIntervention: !rollbackSucceeded,
      };
    }

    return {
      success: true,
      purchase: { ...purchase, id: purchaseId },
      newBalance,
    };
  }

  /**
   * Gets a specific purchase for a user and material using compound index
   * @param userId - The user ID
   * @param materialId - The material ID
   * @returns The purchase if found, undefined otherwise
   */
  async getUserPurchase(
    userId: string,
    materialId: string
  ): Promise<MarketplacePurchase | undefined> {
    // Use compound index for direct lookup instead of filtering all purchases
    return await indexedDBService.getOneByIndex<MarketplacePurchase>(
      STORES.marketplacePurchases,
      'userMaterial',
      [userId, materialId]
    );
  }

  /**
   * Gets all purchases for a user
   * @param userId - The user ID
   * @returns Array of purchases sorted by date (newest first)
   */
  async getUserPurchases(userId: string): Promise<MarketplacePurchase[]> {
    const purchases = await indexedDBService.getByIndex<MarketplacePurchase>(
      STORES.marketplacePurchases,
      'userId',
      userId
    );
    return purchases.sort((a, b) => {
      const aDate = a.purchasedAt ? new Date(a.purchasedAt).getTime() : 0;
      const bDate = b.purchasedAt ? new Date(b.purchasedAt).getTime() : 0;
      return bDate - aDate;
    });
  }

  /**
   * Checks if a user has purchased a specific material
   * @param userId - The user ID
   * @param materialId - The material ID
   * @returns true if the material has been purchased
   */
  async hasPurchasedMaterial(userId: string, materialId: string): Promise<boolean> {
    const purchase = await this.getUserPurchase(userId, materialId);
    return purchase !== undefined;
  }

  // ==========================================
  // Study Timer Methods
  // ==========================================

  /**
   * Get user's study timer settings
   * @param userId - The user ID
   * @returns The user's timer settings or null if not found
   */
  async getStudyTimerSettings(userId: string): Promise<StudyTimerSettings | null> {
    const settings = await indexedDBService.getByIndex<StudyTimerSettings>(
      STORES.studyTimerSettings,
      'userId',
      userId
    );
    return settings[0] || null;
  }

  /**
   * Create or update study timer settings
   * @param settings - The timer settings to save
   * @returns The saved settings
   */
  async saveStudyTimerSettings(settings: Partial<StudyTimerSettings>): Promise<StudyTimerSettings> {
    if (!settings.userId) {
      throw new Error('userId is required for study timer settings');
    }

    const existingSettings = await this.getStudyTimerSettings(settings.userId);

    if (existingSettings) {
      const updated = {
        ...existingSettings,
        ...settings,
        updatedAt: new Date(),
      };
      await indexedDBService.put(STORES.studyTimerSettings, updated);
      return updated;
    } else {
      const newSettings = {
        userId: settings.userId,
        tenantId: settings.tenantId || 1,
        workDuration: settings.workDuration || 25,
        breakDuration: settings.breakDuration || 5,
        longBreakDuration: settings.longBreakDuration || 15,
        sessionsUntilLongBreak: settings.sessionsUntilLongBreak || 4,
        autoStartBreaks: settings.autoStartBreaks !== undefined ? settings.autoStartBreaks : false,
        autoStartWork: settings.autoStartWork !== undefined ? settings.autoStartWork : false,
        enableNotifications:
          settings.enableNotifications !== undefined ? settings.enableNotifications : true,
        enableSound: settings.enableSound !== undefined ? settings.enableSound : true,
        dailyGoalMinutes: settings.dailyGoalMinutes || 120,
        updatedAt: new Date(),
      };
      const id = await indexedDBService.add(STORES.studyTimerSettings, newSettings);
      return { ...newSettings, id: Number(id) } as StudyTimerSettings;
    }
  }

  /**
   * Create a new study timer session
   * @param session - The session data
   * @returns The created session with ID
   */
  async createStudyTimerSession(session: Partial<StudyTimerSession>): Promise<StudyTimerSession> {
    const newSession = {
      userId: session.userId!,
      tenantId: session.tenantId || 1,
      sessionType: session.sessionType!,
      duration: session.duration!,
      startedAt: session.startedAt || new Date(),
      completedAt: session.completedAt,
      isCompleted: session.isCompleted || false,
      isPaused: session.isPaused || false,
      pausedAt: session.pausedAt,
      totalPausedTime: session.totalPausedTime || 0,
      categoryId: session.categoryId,
      notes: session.notes,
    };

    const id = await indexedDBService.add(STORES.studyTimerSessions, newSession);
    return { ...newSession, id: Number(id) } as StudyTimerSession;
  }

  /**
   * Update a study timer session
   * @param sessionId - The session ID
   * @param updates - The fields to update
   * @returns The updated session
   */
  async updateStudyTimerSession(
    sessionId: number,
    updates: Partial<StudyTimerSession>
  ): Promise<StudyTimerSession> {
    const session = await indexedDBService.get<StudyTimerSession>(
      STORES.studyTimerSessions,
      sessionId
    );
    if (!session) {
      throw new Error('Study timer session not found');
    }

    const updated = {
      ...session,
      ...updates,
    };

    await indexedDBService.put(STORES.studyTimerSessions, updated);
    return updated;
  }

  /**
   * Get study timer sessions for a user within a date range
   * @param userId - The user ID
   * @param startDate - Start date (inclusive)
   * @param endDate - End date (inclusive)
   * @returns Array of sessions within the date range
   */
  async getStudyTimerSessionsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<StudyTimerSession[]> {
    const allSessions = await indexedDBService.getByIndex<StudyTimerSession>(
      STORES.studyTimerSessions,
  // Performance Analytics
  // ==========================================

  /**
   * Get performance trends over time
   * Returns historical quiz scores grouped by date
   */
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
      (q) => new Date(q.completedAt!).getTime() >= cutoffDate.getTime()
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

  /**
   * Get performance breakdown by category and subcategory
   */
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

  /**
   * Get study time distribution and patterns
   */
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

  /**
   * Get strength and weakness analysis for heatmap visualization
   */
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

  /**
   * Get study consistency data for calendar visualization
   */
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

  /**
   * Get comprehensive performance summary
   */
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
    const completedQuizzes = quizzes
      .filter((q) => q.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
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

  // ============================================================================
  // Gamification V2: Quest System
  // ============================================================================

  /**
   * Get all quests
   */
  async getQuests(): Promise<any[]> {
    return await indexedDBService.getAll('quests');
  }

  /**
   * Get active quests
   */
  async getActiveQuests(): Promise<any[]> {
    const allQuests = await this.getQuests();
    return allQuests.filter((q) => q.isActive);
  }

  /**
   * Get quests by type
   */
  async getQuestsByType(type: string): Promise<any[]> {
    return await indexedDBService.getByIndex('quests', 'type', type);
  }

  /**
   * Create a new quest
   */
  async createQuest(quest: any): Promise<any> {
    const id = await indexedDBService.add('quests', quest);
    return { ...quest, id };
  }

  /**
   * Get user's quest progress
   */
  async getUserQuestProgress(userId: string, tenantId: number = 1): Promise<any[]> {
    // Fetch all progress for the user and filter by tenant
    const allUserProgress = await indexedDBService.getByIndex(
      'userQuestProgress',
      'userId',
      userId
    );
    return allUserProgress.filter((progress: any) => progress.tenantId === tenantId);
  }

  /**
   * Get user's progress for a specific quest
   */
  async getUserQuestProgressByQuest(
    userId: string,
    questId: number,
    tenantId: number = 1
  ): Promise<any | undefined> {
    const allProgress = await indexedDBService.getByIndex('userQuestProgress', 'userTenantQuest', [
      userId,
      tenantId,
      questId,
    ]);
    return allProgress[0];
  }

  /**
   * Update user quest progress
   */
  async updateUserQuestProgress(
    userId: string,
    questId: number,
    progress: number,
    tenantId: number = 1
  ): Promise<any> {
    const existing = await this.getUserQuestProgressByQuest(userId, questId, tenantId);

    if (existing) {
      const updated = { ...existing, progress, updatedAt: new Date() };
      await indexedDBService.put('userQuestProgress', updated);
      return updated;
    } else {
      const newProgress = {
        userId,
        tenantId,
        questId,
        progress,
        isCompleted: false,
        rewardClaimed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const id = await indexedDBService.add('userQuestProgress', newProgress);
      return { ...newProgress, id };
    }
  }

  /**
   * Complete a quest and mark it for reward claiming
   */
  async completeQuest(userId: string, questId: number, tenantId: number = 1): Promise<any> {
    const existing = await this.getUserQuestProgressByQuest(userId, questId, tenantId);

    if (existing) {
      const updated = {
        ...existing,
        isCompleted: true,
        completedAt: new Date(),
        updatedAt: new Date(),
      };
      await indexedDBService.put('userQuestProgress', updated);
      return updated;
    } else {
      throw new Error('Quest progress not found');
    }
  }

  /**
   * Claim quest reward
   */
  async claimQuestReward(userId: string, questId: number, tenantId: number = 1): Promise<any> {
    const existing = await this.getUserQuestProgressByQuest(userId, questId, tenantId);

    if (existing && existing.isCompleted && !existing.rewardClaimed) {
      const updated = { ...existing, rewardClaimed: true, updatedAt: new Date() };
      await indexedDBService.put('userQuestProgress', updated);
      return updated;
    } else {
      throw new Error('Quest not completed or reward already claimed');
    }
  }

  // ============================================================================
  // Gamification V2: Daily Rewards
  // ============================================================================

  /**
   * Get all daily rewards
   */
  async getDailyRewards(): Promise<any[]> {
    return await indexedDBService.getAll('dailyRewards');
  }

  /**
   * Get daily reward by day number
   */
  async getDailyRewardByDay(day: number): Promise<any | undefined> {
    const rewards = await indexedDBService.getByIndex('dailyRewards', 'day', day);
    return rewards[0];
  }

  /**
   * Get user's daily reward claims
   */
  async getUserDailyRewards(userId: string, tenantId: number = 1): Promise<any[]> {
    return await indexedDBService.getByIndex('userDailyRewards', 'userId', userId);
  }

  /**
   * Check if user has claimed a specific day's reward
   */
  async hasClaimedDailyReward(userId: string, day: number): Promise<boolean> {
    const claims = await indexedDBService.getByIndex('userDailyRewards', 'userDay', [userId, day]);
    return claims.length > 0;
  }

  /**
   * Claim a daily reward
   */
  async claimDailyReward(userId: string, day: number, tenantId: number = 1): Promise<any> {
    const reward = await this.getDailyRewardByDay(day);
    if (!reward) {
      throw new Error('Reward not found for this day');
    }

    const alreadyClaimed = await this.hasClaimedDailyReward(userId, day);
    if (alreadyClaimed) {
      throw new Error('Reward already claimed for this day');
    }

    const claim = {
      userId,
      tenantId,
      day,
      claimedAt: new Date(),
      rewardData: reward.reward,
    };

    const id = await indexedDBService.add('userDailyRewards', claim);
    return { ...claim, id };
  }

  // ============================================================================
  // Gamification V2: User Titles
  // ============================================================================

  /**
   * Get user's unlocked titles
   */
  async getUserTitles(userId: string, tenantId: number = 1): Promise<any[]> {
    return await indexedDBService.getByIndex('userTitles', 'userId', userId);
  }

  /**
   * Unlock a new title for a user
   */
  async unlockTitle(
    userId: string,
    title: string,
    description: string,
    source: string,
    tenantId: number = 1
  ): Promise<any> {
    // Check if title already unlocked
    const existing = await indexedDBService.getByIndex('userTitles', 'userTitle', [userId, title]);
    if (existing.length > 0) {
      return existing[0];
    }

    const newTitle = {
      userId,
      tenantId,
      title,
      description,
      source,
      unlockedAt: new Date(),
    };

    const id = await indexedDBService.add('userTitles', newTitle);
    return { ...newTitle, id };
  }

  /**
   * Set user's selected title
   */
  async setSelectedTitle(userId: string, title: string | null): Promise<any> {
    return await this.updateUserGameStats(userId, { selectedTitle: title });
  }

  // Smart Study Recommendations
  // ============================================================================

  /**
   * Generate personalized study recommendations for a user
   * @param userId - The user ID
   * @returns Array of study recommendations sorted by priority
   */
  async getStudyRecommendations(
    userId: string
  ): Promise<import('./smart-recommendations').StudyRecommendation[]> {
    const { generateStudyRecommendations } = await import('./smart-recommendations');

    const quizzes = await this.getUserQuizzes(userId);
    const masteryScores = await this.getMasteryScores(userId);
    const categories = await this.getCategories();
    const subcategories = await this.getSubcategories();
    const userProgress = await indexedDBService.getByIndex<UserProgress>(
      STORES.userProgress,
      'userId',
      userId
    );

    return allSessions.filter((session) => {
      // Filter out sessions without startedAt timestamp
      if (!session.startedAt) {
        return false;
      }
      const sessionDate = new Date(session.startedAt);
      return sessionDate >= startDate && sessionDate <= endDate;
    });
  }

  /**
   * Get all study timer sessions for a user
   * @param userId - The user ID
   * @returns Array of all sessions
   */
  async getStudyTimerSessions(userId: string): Promise<StudyTimerSession[]> {
    return await indexedDBService.getByIndex<StudyTimerSession>(
      STORES.studyTimerSessions,
      'userId',
      userId
    );
  }

  /**
   * Calculate study timer statistics for a user
   * @param userId - The user ID
   * @returns Statistics about study sessions
   */
  async getStudyTimerStats(userId: string): Promise<StudyTimerStats> {
    const now = new Date();

    // Get today's sessions
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todaySessions = await this.getStudyTimerSessionsByDateRange(userId, todayStart, now);

    // Get this week's sessions
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
    weekStart.setHours(0, 0, 0, 0);
    const weekSessions = await this.getStudyTimerSessionsByDateRange(userId, weekStart, now);

    // Get this month's sessions
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthSessions = await this.getStudyTimerSessionsByDateRange(userId, monthStart, now);

    // Get all sessions for totals
    const allSessions = await this.getStudyTimerSessions(userId);
    const completedSessions = allSessions.filter((s) => s.isCompleted);

    // Calculate minutes
    const todayMinutes = todaySessions
      .filter((s) => s.isCompleted && s.sessionType === 'work')
      .reduce((sum, s) => sum + s.duration, 0);

    const weekMinutes = weekSessions
      .filter((s) => s.isCompleted && s.sessionType === 'work')
      .reduce((sum, s) => sum + s.duration, 0);

    const monthMinutes = monthSessions
      .filter((s) => s.isCompleted && s.sessionType === 'work')
      .reduce((sum, s) => sum + s.duration, 0);

    // Calculate average session length
    const avgSessionLength =
      completedSessions.length > 0
        ? completedSessions.reduce((sum, s) => sum + s.duration, 0) / completedSessions.length
        : 0;

    // Calculate streaks (days with at least one completed work session)
    const sessionsByDate = new Map<string, boolean>();
    completedSessions
      .filter((s) => s.sessionType === 'work' && s.startedAt) // Filter out sessions without startedAt
      .forEach((s) => {
        const dateKey = new Date(s.startedAt!).toDateString();
        sessionsByDate.set(dateKey, true);
      });

    // Calculate current streak
    let currentStreak = 0;
    const checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    while (sessionsByDate.has(checkDate.toDateString())) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    const sortedDates = Array.from(sessionsByDate.keys()).sort();

    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const dayDiff = Math.floor(
          (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (dayDiff === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return {
      todayMinutes,
      weekMinutes,
      monthMinutes,
      totalSessions: allSessions.length,
      completedSessions: completedSessions.length,
      averageSessionLength: Math.round(avgSessionLength),
      longestStreak,
      currentStreak,
    };
    return generateStudyRecommendations(
      quizzes,
      masteryScores,
      categories,
      subcategories,
      userProgress
    );
  }

  /**
   * Calculate readiness score for certification
   * @param userId - The user ID
   * @returns Readiness assessment with scores, weak areas, and recommendations
   */
  async getReadinessScore(
    userId: string
  ): Promise<import('./smart-recommendations').ReadinessScore> {
    const { calculateReadinessScore } = await import('./smart-recommendations');

    const quizzes = await this.getUserQuizzes(userId);
    const masteryScores = await this.getMasteryScores(userId);
    const categories = await this.getCategories();
    const subcategories = await this.getSubcategories();
    const userProgress = await indexedDBService.getByIndex<UserProgress>(
      STORES.userProgress,
      'userId',
      userId
    );

    return calculateReadinessScore(quizzes, masteryScores, categories, subcategories, userProgress);
  }

  /**
   * Analyze time-of-day performance patterns
   * @param userId - The user ID
   * @returns Performance analysis by hour of day
   */
  async getTimeOfDayPerformance(
    userId: string
  ): Promise<import('./smart-recommendations').TimeOfDayPerformance[]> {
    const { analyzeTimeOfDayPerformance } = await import('./smart-recommendations');

    const quizzes = await this.getUserQuizzes(userId);
    return analyzeTimeOfDayPerformance(quizzes);
  }

  /**
   * Calculate learning velocity metrics
   * @param userId - The user ID
   * @returns Learning velocity metrics including questions per day and improvement rate
   */
  async getLearningVelocity(
    userId: string
  ): Promise<import('./smart-recommendations').LearningVelocity> {
    const { calculateLearningVelocity } = await import('./smart-recommendations');

    const quizzes = await this.getUserQuizzes(userId);
    return calculateLearningVelocity(quizzes);
  }

  /**
   * Analyze performance for a specific category or subcategory
   * @param userId - The user ID
   * @param categoryId - Optional category ID to filter by
   * @param subcategoryId - Optional subcategory ID to filter by
   * @returns Performance metrics
   */
  async analyzePerformance(
    userId: string,
    categoryId?: number,
    subcategoryId?: number
  ): Promise<import('./smart-recommendations').PerformanceMetrics> {
    const { analyzePerformance } = await import('./smart-recommendations');

    const quizzes = await this.getUserQuizzes(userId);
    const questions = await this.getQuestions();

    return analyzePerformance(quizzes, questions, categoryId, subcategoryId);
  }
}

export const clientStorage = new ClientStorage();
