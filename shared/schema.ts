import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Tenants table for multi-tenancy support
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  domain: text("domain").unique(), // Optional custom domain
  settings: jsonb("settings").default({}), // Tenant-specific configuration
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash"), // bcrypt hashed password
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: text("role").notNull().default("user"), // "admin", "user"
  tenantId: integer("tenant_id").notNull().default(1),
  certificationGoals: jsonb("certification_goals").$type<string[]>(),
  studyPreferences: jsonb("study_preferences").$type<{
    dailyTimeMinutes?: number;
    preferredDifficulty?: 'beginner' | 'intermediate' | 'advanced';
    focusAreas?: string[];
    studyDays?: string[];
    reminderTime?: string;
  }>(),
  skillsAssessment: jsonb("skills_assessment").$type<{
    experienceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    relevantExperience?: string[];
    learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
    completedCertifications?: string[];
    motivations?: string[];
  }>(),
  polarCustomerId: varchar("polar_customer_id"), // Used for credits management
  tokenBalance: integer("token_balance").default(100), // Free tokens for quiz generation
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
});

export const subcategories = pgTable("subcategories", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  categoryId: integer("category_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
});

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  categoryId: integer("category_id").notNull(),
  subcategoryId: integer("subcategory_id").notNull(),
  text: text("text").notNull(),
  options: jsonb("options").notNull(), // Array of option objects
  correctAnswer: integer("correct_answer").notNull(),
  explanation: text("explanation"),
  difficultyLevel: integer("difficulty_level").default(1), // 1-5 scale (1=Easy, 5=Expert)
  tags: jsonb("tags"), // Array of topic tags for lecture generation
});

// User quizzes - isolated per tenant (user data does not transfer between tenants)
export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  tenantId: integer("tenant_id").notNull().default(1), // Isolates quiz history per tenant
  title: text("title").notNull(),
  categoryIds: jsonb("category_ids").notNull(), // Array of category IDs
  subcategoryIds: jsonb("subcategory_ids").notNull(), // Array of subcategory IDs
  questionIds: jsonb("question_ids"), // Array of specific question IDs for this quiz (for consistent scoring)
  questionCount: integer("question_count").notNull(),
  timeLimit: integer("time_limit"), // in minutes, null for no limit
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  score: integer("score"), // percentage
  correctAnswers: integer("correct_answers"),
  totalQuestions: integer("total_questions"),
  answers: jsonb("answers"), // Array of user answers
  isAdaptive: boolean("is_adaptive").default(false),
  adaptiveMetrics: jsonb("adaptive_metrics"), // Tracks wrong answer patterns
  difficultyLevel: integer("difficulty_level").default(1), // 1-5 scale
  difficultyFilter: jsonb("difficulty_filter"), // Array of difficulty levels to include
  isPassing: boolean("is_passing").default(false), // 85%+ threshold
  missedTopics: jsonb("missed_topics"), // Topics that need lecture generation
  mode: text("mode").notNull().default("study"), // "study", "quiz", or "challenge" mode
});

// Micro-learning challenges table
export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(), // "daily", "quick", "streak", "focus"
  title: text("title").notNull(),
  description: text("description"),
  categoryId: integer("category_id"),
  subcategoryId: integer("subcategory_id"),
  targetScore: integer("target_score").default(80), // Target percentage
  questionsCount: integer("questions_count").default(5), // 3-7 questions typically
  timeLimit: integer("time_limit").default(5), // 5-15 minutes
  difficulty: integer("difficulty").default(1), // 1-3 for challenges (easier than full quizzes)
  streakMultiplier: integer("streak_multiplier").default(1), // Bonus points for streaks
  pointsReward: integer("points_reward").default(50), // Base points for completion
  isActive: boolean("is_active").default(true),
  availableAt: timestamp("available_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Some challenges expire (like daily challenges)
  createdAt: timestamp("created_at").defaultNow(),
});

// User challenge attempts and progress
export const challengeAttempts = pgTable("challenge_attempts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  tenantId: integer("tenant_id").notNull().default(1),
  challengeId: integer("challenge_id").notNull(),
  quizId: integer("quiz_id"), // Links to the actual quiz attempt
  score: integer("score"), // Percentage score
  pointsEarned: integer("points_earned").default(0),
  timeSpent: integer("time_spent"), // in seconds
  isCompleted: boolean("is_completed").default(false),
  isPassed: boolean("is_passed").default(false), // Met the target score
  answers: jsonb("answers"), // User answers for quick reference
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  tenantId: integer("tenant_id").notNull().default(1),
  categoryId: integer("category_id").notNull(),
  questionsCompleted: integer("questions_completed").notNull().default(0),
  totalQuestions: integer("total_questions").notNull().default(0),
  averageScore: integer("average_score").notNull().default(0),
  lastQuizDate: timestamp("last_quiz_date"),
  adaptiveDifficulty: integer("adaptive_difficulty").default(1), // 1-5 scale
  consecutiveCorrect: integer("consecutive_correct").default(0),
  consecutiveWrong: integer("consecutive_wrong").default(0),
  weakSubcategories: jsonb("weak_subcategories"), // Array of struggling subcategory IDs
});

// Mastery tracking for rolling average across all certification areas
export const masteryScores = pgTable("mastery_scores", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  tenantId: integer("tenant_id").notNull().default(1),
  categoryId: integer("category_id").notNull(),
  subcategoryId: integer("subcategory_id").notNull(),
  correctAnswers: integer("correct_answers").notNull().default(0),
  totalAnswers: integer("total_answers").notNull().default(0),
  rollingAverage: integer("rolling_average").notNull().default(0), // 0-100 percentage
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Lectures table for AI-generated content based on missed topics
export const lectures = pgTable("lectures", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  tenantId: integer("tenant_id").notNull().default(1),
  quizId: integer("quiz_id"),
  title: text("title").notNull(),
  content: text("content").notNull(), // Generated lecture content
  topics: jsonb("topics").notNull(), // Array of missed topic tags
  categoryId: integer("category_id").notNull(),
  subcategoryId: integer("subcategory_id"),
  createdAt: timestamp("created_at").defaultNow(),
  isRead: boolean("is_read").default(false),
});

// Insert schemas
export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export const insertSubcategorySchema = createInsertSchema(subcategories).omit({
  id: true,
});

export const insertLectureSchema = createInsertSchema(lectures).omit({
  id: true,
  createdAt: true,
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
});

export const insertQuizSchema = createInsertSchema(quizzes).omit({
  id: true,
  startedAt: true,
});

export const insertUserProgressSchema = createInsertSchema(userProgress).omit({
  id: true,
});

export const insertMasteryScoreSchema = createInsertSchema(masteryScores).omit({
  id: true,
  lastUpdated: true,
});

// Achievement badges for gamified learning milestones
export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g., "First Steps", "Quiz Master", "Streak Champion"
  description: text("description").notNull(),
  icon: text("icon").notNull(), // Icon class or emoji
  category: text("category").notNull(), // "progress", "performance", "streak", "mastery"
  requirement: jsonb("requirement").notNull(), // Flexible requirement definition
  color: text("color").notNull(), // Badge color theme
  rarity: text("rarity").notNull(), // "common", "uncommon", "rare", "legendary"
  points: integer("points").default(0), // Gamification points awarded
  createdAt: timestamp("created_at").defaultNow(),
});

// User badges - tracks which badges users have earned
export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  tenantId: integer("tenant_id").notNull().default(1),
  badgeId: integer("badge_id").notNull(),
  earnedAt: timestamp("earned_at").defaultNow(),
  progress: integer("progress").default(0), // For progressive badges
  isNotified: boolean("is_notified").default(false), // Whether user has seen the achievement
});

// User statistics for gamification
export const userGameStats = pgTable("user_game_stats", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  tenantId: integer("tenant_id").notNull().default(1),
  totalPoints: integer("total_points").default(0),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastActivityDate: timestamp("last_activity_date"),
  totalBadgesEarned: integer("total_badges_earned").default(0),
  level: integer("level").default(1), // User level based on points
  nextLevelPoints: integer("next_level_points").default(100),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas for achievement system
export const insertBadgeSchema = createInsertSchema(badges).omit({
  id: true,
  createdAt: true,
});

export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({
  id: true,
  earnedAt: true,
});

export const insertUserGameStatsSchema = createInsertSchema(userGameStats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Upsert user schema
export const upsertUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  profileImageUrl: z.string().nullable(),
  role: z.enum(["user", "admin"]).optional(),
});

// Quiz creation schema
export const createQuizSchema = z.object({
  title: z.string().min(1),
  categoryIds: z.array(z.number()).min(1),
  subcategoryIds: z.array(z.number()).optional(),
  questionCount: z.number().min(1).max(100),
  timeLimit: z.number().optional(),
  mode: z.enum(["study", "quiz"]).default("study"),
});

// Answer submission schema
export const submitAnswerSchema = z.object({
  quizId: z.number(),
  questionId: z.number(),
  answer: z.number(),
});

/**
 * Represents a single quiz answer with question ID and the selected answer
 */
export interface QuizAnswer {
  questionId: number;
  answer: number;
}

/**
 * Webhook details stored when marking webhooks as processed
 */
export interface WebhookDetails {
  eventType?: string;
  timestamp?: string;
  [key: string]: unknown;
}

/**
 * Performance analysis result for a user's weakest areas
 */
export interface WeakAreaPerformance {
  categoryId: number;
  percentage: number;
  questionsAnswered: number;
  correctAnswers: number;
  categoryName?: string;
}

/**
 * Overall statistics from performance analysis
 */
export interface OverallPerformanceStats {
  totalQuizzes: number;
  totalQuestions: number;
  correctAnswers: number;
  overallPercentage: number;
  averageQuizScore: number;
}

/**
 * Full performance analysis result
 */
export interface PerformanceAnalysis {
  weakestAreas: WeakAreaPerformance[];
  overallStats: OverallPerformanceStats;
  focusTopics: string[];
  recommendations: string[];
}

/**
 * Quiz result used for adaptive progress updates
 */
export interface QuizResult {
  questionId: number;
  isCorrect: boolean;
  subcategoryId?: number;
}

// Types
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;
export type InsertSubcategory = z.infer<typeof insertSubcategorySchema>;
export type Subcategory = typeof subcategories.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type Quiz = typeof quizzes.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type UserProgress = typeof userProgress.$inferSelect;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type CreateQuizData = z.infer<typeof createQuizSchema>;
export type SubmitAnswerData = z.infer<typeof submitAnswerSchema>;
export type InsertMasteryScore = z.infer<typeof insertMasteryScoreSchema>;
export type MasteryScore = typeof masteryScores.$inferSelect;
export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type Badge = typeof badges.$inferSelect;
export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;
export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserGameStats = z.infer<typeof insertUserGameStatsSchema>;
export type UserGameStats = typeof userGameStats.$inferSelect;
export type InsertLecture = z.infer<typeof insertLectureSchema>;
export type Lecture = typeof lectures.$inferSelect;

// Challenge schemas and types
export const insertChallengeSchema = createInsertSchema(challenges).omit({
  id: true,
  createdAt: true,
});

export const insertChallengeAttemptSchema = createInsertSchema(challengeAttempts).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type Challenge = typeof challenges.$inferSelect;
export type InsertChallengeAttempt = z.infer<typeof insertChallengeAttemptSchema>;
export type ChallengeAttempt = typeof challengeAttempts.$inferSelect;

// Study Groups table for collaborative learning
export const studyGroups = pgTable("study_groups", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(1),
  name: text("name").notNull(),
  description: text("description"),
  categoryIds: jsonb("category_ids").notNull().$type<number[]>(), // Categories this group focuses on
  createdBy: varchar("created_by").notNull(), // User ID who created the group
  maxMembers: integer("max_members").default(20),
  isPublic: boolean("is_public").default(true),
  level: text("level").default("Intermediate"), // "Beginner" | "Intermediate" | "Advanced"
  meetingSchedule: jsonb("meeting_schedule").$type<{
    frequency?: string;
    dayOfWeek?: string;
    time?: string;
  }>(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Study Group Members table
export const studyGroupMembers = pgTable("study_group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: text("role").default("member"), // "owner", "moderator", "member"
  joinedAt: timestamp("joined_at").defaultNow(),
  lastActiveAt: timestamp("last_active_at"),
  contributionScore: integer("contribution_score").default(0), // Points for activity in group
});

// Practice Tests table for certification practice exams
export const practiceTests = pgTable("practice_tests", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(1),
  name: text("name").notNull(),
  description: text("description"),
  categoryIds: jsonb("category_ids").notNull().$type<number[]>(),
  questionCount: integer("question_count").notNull(),
  timeLimit: integer("time_limit").notNull(), // in minutes
  difficulty: text("difficulty").notNull(), // "Easy", "Medium", "Hard", "Mixed"
  passingScore: integer("passing_score").default(70), // percentage
  isOfficial: boolean("is_official").default(false), // Whether this is an official practice test
  questionPool: jsonb("question_pool").$type<number[]>(), // Optional: specific question IDs to use
  createdBy: varchar("created_by"), // User ID if user-created
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Practice Test Attempts table
export const practiceTestAttempts = pgTable("practice_test_attempts", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  testId: integer("test_id").notNull(),
  userId: varchar("user_id").notNull(),
  quizId: integer("quiz_id"), // Links to the actual quiz attempt
  score: integer("score"), // percentage
  isPassed: boolean("is_passed").default(false),
  timeSpent: integer("time_spent"), // in seconds
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Insert schemas for study groups and practice tests
export const insertStudyGroupSchema = createInsertSchema(studyGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStudyGroupMemberSchema = createInsertSchema(studyGroupMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertPracticeTestSchema = createInsertSchema(practiceTests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPracticeTestAttemptSchema = createInsertSchema(practiceTestAttempts).omit({
  id: true,
  startedAt: true,
});

// Types for study groups and practice tests
export type InsertStudyGroup = z.infer<typeof insertStudyGroupSchema>;
export type StudyGroup = typeof studyGroups.$inferSelect;
export type InsertStudyGroupMember = z.infer<typeof insertStudyGroupMemberSchema>;
export type StudyGroupMember = typeof studyGroupMembers.$inferSelect;
export type InsertPracticeTest = z.infer<typeof insertPracticeTestSchema>;
export type PracticeTest = typeof practiceTests.$inferSelect;
export type InsertPracticeTestAttempt = z.infer<typeof insertPracticeTestAttemptSchema>;
export type PracticeTestAttempt = typeof practiceTestAttempts.$inferSelect;

// User statistics type for dashboard
export type UserStats = {
  totalQuizzes: number;
  averageScore: number;
  studyStreak: number;
  currentStreak: number;
  certifications: number;
  passingRate: number;
  masteryScore: number;
};
