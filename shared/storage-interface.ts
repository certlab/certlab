/**
 * Shared Storage Interface
 * 
 * This file defines the common interface for storage operations used by both
 * the server (PostgreSQL/Drizzle) and client (IndexedDB) implementations.
 * 
 * Using the adapter pattern, different storage backends can implement this
 * interface while maintaining consistent API contracts across the application.
 */

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
  InsertQuiz,
  InsertUserProgress,
  InsertChallenge,
  InsertStudyGroup,
  InsertPracticeTest,
} from './schema';

/**
 * User statistics returned by getUserStats
 */
export interface UserStatsResult {
  totalQuizzes: number;
  averageScore: number;
  studyStreak: number;
  certifications: number;
  passingRate: number;
  masteryScore: number;
}

/**
 * User goals for certification study
 */
export interface UserGoals {
  certificationGoals: string[];
  studyPreferences: any;
  skillsAssessment: any;
}

/**
 * Study group with members
 */
export interface StudyGroupWithMembers {
  group: StudyGroup;
  members: StudyGroupMember[];
}

/**
 * Certification mastery score by category
 */
export interface CertificationMasteryScore {
  categoryId: number;
  masteryScore: number;
}

/**
 * Core storage interface for data operations.
 * 
 * This interface defines the common operations that both server and client
 * storage implementations must provide. It uses the adapter pattern to allow
 * different storage backends (PostgreSQL, IndexedDB, etc.) to implement
 * the same interface.
 * 
 * Note: Some methods have optional tenantId parameters for multi-tenancy support.
 * The client implementation may use default values while server implementations
 * may require explicit tenant context.
 */
export interface IStorageAdapter {
  // ==========================================
  // Tenant Management
  // ==========================================
  
  /** Get all tenants */
  getTenants(): Promise<Tenant[]>;
  
  /** Get a specific tenant by ID */
  getTenant(id: number): Promise<Tenant | undefined>;
  
  /** Create a new tenant */
  createTenant(tenant: Partial<Tenant>): Promise<Tenant>;
  
  /** Update an existing tenant */
  updateTenant(id: number, updates: Partial<Tenant>): Promise<Tenant | null>;
  
  /** Get all users belonging to a tenant */
  getUsersByTenant(tenantId: number): Promise<User[]>;

  // ==========================================
  // User Management
  // ==========================================
  
  /** Get a user by ID */
  getUser(id: string): Promise<User | undefined>;
  
  /** Get a user by ID (alias for getUser) */
  getUserById(id: string): Promise<User | undefined>;
  
  /** Get a user by email address */
  getUserByEmail(email: string): Promise<User | undefined>;
  
  /** Create a new user */
  createUser(user: Partial<User>): Promise<User>;
  
  /** Update an existing user */
  updateUser(id: string, updates: Partial<User>): Promise<User | null>;
  
  /** Update user's certification goals and study preferences */
  updateUserGoals(id: string, goals: UserGoals): Promise<User | null>;

  // ==========================================
  // Categories
  // ==========================================
  
  /** Get all categories, optionally filtered by tenant */
  getCategories(tenantId?: number): Promise<Category[]>;
  
  /** Create a new category */
  createCategory(category: Partial<Category>): Promise<Category>;
  
  /** Update an existing category */
  updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category>;
  
  /** Delete a category */
  deleteCategory(id: number): Promise<void>;

  // ==========================================
  // Subcategories
  // ==========================================
  
  /** Get subcategories, optionally filtered by category and/or tenant */
  getSubcategories(categoryId?: number, tenantId?: number): Promise<Subcategory[]>;
  
  /** Create a new subcategory */
  createSubcategory(subcategory: Partial<Subcategory>): Promise<Subcategory>;
  
  /** Update an existing subcategory */
  updateSubcategory(id: number, updates: Partial<InsertSubcategory>): Promise<Subcategory>;
  
  /** Delete a subcategory */
  deleteSubcategory(id: number): Promise<void>;

  // ==========================================
  // Questions
  // ==========================================
  
  /** Get questions by category IDs with optional filters */
  getQuestionsByCategories(
    categoryIds: number[],
    subcategoryIds?: number[],
    difficultyLevels?: number[],
    tenantId?: number
  ): Promise<Question[]>;
  
  /** Get a specific question by ID */
  getQuestion(id: number): Promise<Question | undefined>;
  
  /** Create a new question */
  createQuestion(question: Partial<Question>): Promise<Question>;
  
  /** Update an existing question */
  updateQuestion(id: number, updates: Partial<InsertQuestion>): Promise<Question>;
  
  /** Delete a question */
  deleteQuestion(id: number): Promise<void>;
  
  /** Get all questions for a specific tenant */
  getQuestionsByTenant(tenantId: number): Promise<Question[]>;

  // ==========================================
  // Quizzes
  // ==========================================
  
  /** Create a new quiz */
  createQuiz(quiz: Partial<Quiz>): Promise<Quiz>;
  
  /** Get a specific quiz by ID */
  getQuiz(id: number): Promise<Quiz | undefined>;
  
  /** Get all quizzes for a user */
  getUserQuizzes(userId: string, tenantId?: number): Promise<Quiz[]>;
  
  /** Update an existing quiz */
  updateQuiz(id: number, updates: Partial<Quiz>): Promise<Quiz>;

  // ==========================================
  // User Progress
  // ==========================================
  
  /** Get progress records for a user */
  getUserProgress(userId: string, tenantId?: number): Promise<UserProgress[]>;
  
  /** Update user progress for a specific category */
  updateUserProgress(
    userId: string,
    categoryId: number,
    progress: Partial<InsertUserProgress>,
    tenantId?: number
  ): Promise<UserProgress>;
  
  /** Get aggregated user statistics */
  getUserStats(userId: string, tenantId?: number): Promise<UserStatsResult>;

  // ==========================================
  // Lectures
  // ==========================================
  
  /** Create a new lecture */
  createLecture(
    userId: string,
    quizId: number,
    title: string,
    content: string,
    topics: string[],
    categoryId: number,
    tenantId?: number
  ): Promise<any>;
  
  /** Get all lectures for a user */
  getUserLectures(userId: string, tenantId?: number): Promise<any[]>;
  
  /** Get a specific lecture by ID */
  getLecture(id: number): Promise<any>;

  // ==========================================
  // Mastery Scores
  // ==========================================
  
  /** Update mastery score for a specific question answer */
  updateMasteryScore(
    userId: string,
    categoryId: number,
    subcategoryId: number,
    isCorrect: boolean
  ): Promise<void>;
  
  /** Get all mastery scores for a user */
  getUserMasteryScores(userId: string, tenantId?: number): Promise<MasteryScore[]>;
  
  /** Calculate overall mastery score for a user */
  calculateOverallMasteryScore(userId: string, tenantId?: number): Promise<number>;
  
  /** Get mastery scores grouped by certification category */
  getCertificationMasteryScores(userId: string, tenantId?: number): Promise<CertificationMasteryScore[]>;

  // ==========================================
  // Badges
  // ==========================================
  
  /** Get all available badges */
  getBadges(): Promise<Badge[]>;
  
  /** Get all badges earned by a user */
  getUserBadges(userId: string, tenantId?: number): Promise<UserBadge[]>;

  // ==========================================
  // Game Stats
  // ==========================================
  
  /** Get game stats for a user */
  getUserGameStats(userId: string): Promise<UserGameStats | undefined>;
  
  /** Update game stats for a user */
  updateUserGameStats(userId: string, updates: Partial<UserGameStats>): Promise<UserGameStats>;

  // ==========================================
  // Challenges
  // ==========================================
  
  /** Get challenges, optionally filtered by user */
  getChallenges(userId?: string): Promise<Challenge[]>;
  
  /** Get a specific challenge by ID */
  getChallenge(id: number): Promise<Challenge | undefined>;
  
  /** Create a new challenge */
  createChallenge(challenge: Partial<Challenge>): Promise<Challenge>;
  
  /** Get challenge attempts for a user */
  getChallengeAttempts(userId: string): Promise<ChallengeAttempt[]>;

  // ==========================================
  // Study Groups
  // ==========================================
  
  /** Get all study groups */
  getStudyGroups(): Promise<StudyGroup[]>;
  
  /** Get a specific study group by ID */
  getStudyGroup(id: number): Promise<StudyGroup | undefined>;
  
  /** Create a new study group */
  createStudyGroup(group: Partial<StudyGroup>): Promise<StudyGroup>;
  
  /** Get study groups that a user is a member of */
  getUserStudyGroups(userId: string): Promise<StudyGroup[]>;

  // ==========================================
  // Practice Tests
  // ==========================================
  
  /** Get all practice tests */
  getPracticeTests(): Promise<PracticeTest[]>;
  
  /** Get a specific practice test by ID */
  getPracticeTest(id: number): Promise<PracticeTest | undefined>;
  
  /** Create a new practice test */
  createPracticeTest(test: Partial<PracticeTest>): Promise<PracticeTest>;
}

/**
 * Extended storage interface for server-specific operations.
 * 
 * This interface extends IStorageAdapter with additional methods that are
 * only needed on the server side, such as webhook processing, tenant
 * category management, and complex badge/achievement operations.
 */
export interface IServerStorage extends IStorageAdapter {
  // ==========================================
  // User Management (Extended)
  // ==========================================
  
  /** Upsert a user (create or update) */
  upsertUser(user: { id: string; email: string; firstName: string | null; lastName: string | null; profileImageUrl: string | null; role?: 'user' | 'admin' }): Promise<User>;
  
  /** Get users by Polar customer ID */
  getUserByPolarCustomerId(polarCustomerId: string): Promise<User[]>;

  // ==========================================
  // Tenant Management (Extended)
  // ==========================================
  
  /** Delete a tenant */
  deleteTenant(id: number): Promise<void>;
  
  /** Get categories for a specific tenant */
  getTenantCategories(tenantId: number): Promise<Category[]>;
  
  /** Get subcategories for a specific tenant */
  getTenantSubcategories(tenantId: number): Promise<Subcategory[]>;
  
  /** Create a category for a specific tenant */
  createTenantCategory(tenantId: number, category: Omit<InsertCategory, 'tenantId'>): Promise<Category>;
  
  /** Update a category for a specific tenant */
  updateTenantCategory(tenantId: number, categoryId: number, updates: Partial<Omit<InsertCategory, 'tenantId'>>): Promise<Category>;
  
  /** Delete a category for a specific tenant */
  deleteTenantCategory(tenantId: number, categoryId: number): Promise<void>;
  
  /** Create a subcategory for a specific tenant */
  createTenantSubcategory(tenantId: number, subcategory: Omit<InsertSubcategory, 'tenantId'>): Promise<Subcategory>;
  
  /** Update a subcategory for a specific tenant */
  updateTenantSubcategory(tenantId: number, subcategoryId: number, updates: Partial<Omit<InsertSubcategory, 'tenantId'>>): Promise<Subcategory>;
  
  /** Delete a subcategory for a specific tenant */
  deleteTenantSubcategory(tenantId: number, subcategoryId: number): Promise<void>;

  // ==========================================
  // Lectures (Extended)
  // ==========================================
  
  /** Create a lecture from quiz results with missed topics */
  createLectureFromQuiz(userId: string, quizId: number, title: string, content: string, topics: string[], categoryId: number): Promise<any>;

  // ==========================================
  // Badges (Extended)
  // ==========================================
  
  /** Get a specific badge by ID */
  getBadge(badgeId: number): Promise<Badge | undefined>;
  
  /** Get all badges (alias for getBadges) */
  getAllBadges(): Promise<Badge[]>;
  
  /** Award a badge to a user */
  awardBadge(userId: string, badgeId: number, progress?: number): Promise<UserBadge>;
  
  /** Check and award achievements based on user activity */
  checkAndAwardAchievements(userId: string): Promise<UserBadge[]>;
  
  /** Update badge notification status */
  updateUserBadgeNotification(userId: string, badgeId: number, isNotified: boolean): Promise<void>;

  // ==========================================
  // Game Stats (Extended)
  // ==========================================
  
  /** Initialize game stats for a new user */
  initializeUserGameStats(userId: string): Promise<UserGameStats>;
  
  /** Update user activity for streak tracking */
  updateUserActivity(userId: string): Promise<void>;

  // ==========================================
  // Challenges (Extended)
  // ==========================================
  
  /** Get available challenges for a user */
  getAvailableChallenges(userId: string): Promise<Challenge[]>;
  
  /** Get all challenges for a user */
  getUserChallenges(userId: string): Promise<Challenge[]>;
  
  /** Generate daily challenges for a user */
  generateDailyChallenges(userId: string): Promise<Challenge[]>;
  
  /** Start a challenge attempt */
  startChallengeAttempt(userId: string, challengeId: number): Promise<ChallengeAttempt>;
  
  /** Complete a challenge attempt */
  completeChallengeAttempt(attemptId: number, score: number, answers: any[], timeSpent: number): Promise<ChallengeAttempt>;
  
  /** Get challenge attempts for a user */
  getUserChallengeAttempts(userId: string): Promise<ChallengeAttempt[]>;
  
  /** Get a specific challenge attempt by ID */
  getChallengeAttempt(id: number): Promise<ChallengeAttempt | undefined>;

  // ==========================================
  // Study Groups (Extended)
  // ==========================================
  
  /** Get study groups with optional tenant filter */
  getStudyGroups(tenantId?: number): Promise<StudyGroup[]>;
  
  /** Update a study group */
  updateStudyGroup(id: number, updates: Partial<InsertStudyGroup>): Promise<StudyGroup | null>;
  
  /** Delete a study group */
  deleteStudyGroup(id: number): Promise<void>;
  
  /** Join a study group (swapped parameter order for server) */
  joinStudyGroup(groupId: number, userId: string): Promise<StudyGroupMember>;
  
  /** Leave a study group (swapped parameter order for server) */
  leaveStudyGroup(groupId: number, userId: string): Promise<void>;
  
  /** Get members of a study group */
  getStudyGroupMembers(groupId: number): Promise<StudyGroupMember[]>;
  
  /** Get a study group with its members */
  getStudyGroupWithMembers(groupId: number): Promise<StudyGroupWithMembers | undefined>;

  // ==========================================
  // Practice Tests (Extended)
  // ==========================================
  
  /** Get practice tests with optional tenant filter */
  getPracticeTests(tenantId?: number): Promise<PracticeTest[]>;
  
  /** Update a practice test */
  updatePracticeTest(id: number, updates: Partial<InsertPracticeTest>): Promise<PracticeTest | null>;
  
  /** Delete a practice test */
  deletePracticeTest(id: number): Promise<void>;
  
  /** Start a practice test */
  startPracticeTest(testId: number, userId: string): Promise<PracticeTestAttempt>;
  
  /** Complete a practice test */
  completePracticeTest(attemptId: number, quizId: number, score: number, timeSpent: number): Promise<PracticeTestAttempt>;
  
  /** Get practice test attempts for a user (server version) */
  getUserPracticeTestAttempts(userId: string): Promise<PracticeTestAttempt[]>;
  
  /** Get all attempts for a specific practice test */
  getPracticeTestAttempts(testId: number): Promise<PracticeTestAttempt[]>;

  // ==========================================
  // Webhooks
  // ==========================================
  
  /** Check if a webhook event has already been processed */
  checkWebhookProcessed(eventId: string): Promise<boolean>;
  
  /** Mark a webhook event as processed */
  markWebhookProcessed(eventId: string, details: any): Promise<void>;
}

/**
 * Extended storage interface for client-specific operations.
 * 
 * This interface extends IStorageAdapter with additional methods that are
 * only needed on the client side, such as session management, data
 * export/import, and token management.
 */
export interface IClientStorage extends IStorageAdapter {
  // ==========================================
  // Session Management
  // ==========================================
  
  /** Get the current user ID from storage */
  getCurrentUserId(): Promise<string | null>;
  
  /** Set the current user ID in storage */
  setCurrentUserId(userId: string): Promise<void>;
  
  /** Clear the current user session */
  clearCurrentUser(): Promise<void>;
  
  /** Get all users (for account selection) */
  getAllUsers(): Promise<User[]>;

  // ==========================================
  // Quiz Operations (Extended)
  // ==========================================
  
  /** Get questions for a specific quiz */
  getQuizQuestions(quizId: number): Promise<Question[]>;
  
  /** Submit a completed quiz */
  submitQuiz(quizId: number, answers: { questionId: number; answer: number }[]): Promise<Quiz>;

  // ==========================================
  // Badge Operations (Extended)
  // ==========================================
  
  /** Create a user badge */
  createUserBadge(userBadge: Partial<UserBadge>): Promise<UserBadge>;
  
  /** Update a user badge */
  updateUserBadge(id: number, updates: Partial<UserBadge>): Promise<UserBadge>;

  // ==========================================
  // Challenge Operations (Extended)
  // ==========================================
  
  /** Create a challenge attempt */
  createChallengeAttempt(attempt: Partial<ChallengeAttempt>): Promise<ChallengeAttempt>;

  // ==========================================
  // Study Group Operations (Extended)
  // ==========================================
  
  /** Join a study group (client uses userId, groupId order) */
  joinStudyGroup(userId: string, groupId: number): Promise<StudyGroupMember>;
  
  /** Leave a study group (client uses userId, groupId order) */
  leaveStudyGroup(userId: string, groupId: number): Promise<void>;

  // ==========================================
  // Practice Test Operations (Extended)
  // ==========================================
  
  /** Get practice test attempts for a user (client uses userId, optional testId) */
  getPracticeTestAttempts(userId: string, testId?: number): Promise<PracticeTestAttempt[]>;
  
  /** Create a practice test attempt */
  createPracticeTestAttempt(attempt: Partial<PracticeTestAttempt>): Promise<PracticeTestAttempt>;
  
  /** Update a practice test attempt */
  updatePracticeTestAttempt(id: number, updates: Partial<PracticeTestAttempt>): Promise<PracticeTestAttempt>;

  // ==========================================
  // Token Management
  // ==========================================
  
  /** Get user's token balance */
  getUserTokenBalance(userId: string): Promise<number>;
  
  /** Add tokens to user's balance */
  addTokens(userId: string, amount: number): Promise<number>;
  
  /** Consume tokens from user's balance */
  consumeTokens(userId: string, amount: number): Promise<{ success: boolean; newBalance: number; message?: string }>;
  
  /** Calculate token cost for a quiz */
  calculateQuizTokenCost(questionCount: number): number;

  // ==========================================
  // Data Management
  // ==========================================
  
  /** Export all data as JSON string */
  exportData(): Promise<string>;
  
  /** Import data from JSON string */
  importData(jsonData: string): Promise<void>;
  
  /** Clear all stored data */
  clearAllData(): Promise<void>;
}
