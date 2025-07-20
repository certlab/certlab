import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tenants table for multi-tenancy support
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  domain: text("domain").unique(), // Optional custom domain
  settings: jsonb("settings").default({}), // Tenant-specific configuration
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  username: text("username").notNull(),
  email: text("email").notNull(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"), // "admin", "user"
  createdAt: timestamp("created_at").defaultNow(),
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

export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  categoryIds: jsonb("category_ids").notNull(), // Array of category IDs
  subcategoryIds: jsonb("subcategory_ids").notNull(), // Array of subcategory IDs
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
  mode: text("mode").notNull().default("study"), // "study" or "quiz" mode
});

export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
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
  userId: integer("user_id").notNull(),
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
  userId: integer("user_id").notNull(),
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
  id: true,
  createdAt: true,
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
  userId: integer("user_id").notNull(),
  badgeId: integer("badge_id").notNull(),
  earnedAt: timestamp("earned_at").defaultNow(),
  progress: integer("progress").default(0), // For progressive badges
  isNotified: boolean("is_notified").default(false), // Whether user has seen the achievement
});

// User statistics for gamification
export const userGameStats = pgTable("user_game_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
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

// Login schema
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
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
export type LoginData = z.infer<typeof loginSchema>;
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
