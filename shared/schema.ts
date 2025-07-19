import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
});

export const subcategories = pgTable("subcategories", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
});

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  subcategoryId: integer("subcategory_id").notNull(),
  text: text("text").notNull(),
  options: jsonb("options").notNull(), // Array of option objects
  correctAnswer: integer("correct_answer").notNull(),
  explanation: text("explanation"),
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

// Insert schemas
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
});

// Answer submission schema
export const submitAnswerSchema = z.object({
  quizId: z.number(),
  questionId: z.number(),
  answer: z.number(),
});

// Types
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
