import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  jsonb,
  varchar,
  index,
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// ============================================================================
// Question Option Schema Validation
// ============================================================================

/**
 * Zod schema for a single question option.
 * Options use 0-indexed IDs (0, 1, 2, 3) for consistency.
 */
export const questionOptionSchema = z.object({
  id: z.number().int().min(0).max(9), // 0-indexed, supports up to 10 options
  text: z.string().min(1), // Option text must be non-empty
});

/**
 * Zod schema for an array of question options.
 * Questions must have between 2 and 10 options.
 */
export const questionOptionsSchema = z.array(questionOptionSchema).min(2).max(10);

/**
 * TypeScript type for a question option, derived from the Zod schema.
 */
export type QuestionOption = z.infer<typeof questionOptionSchema>;

/**
 * Zod schema for a reference link in question explanations.
 * Reference links help users find additional study materials.
 */
export const referenceLinkSchema = z.object({
  title: z.string().min(1), // Title of the reference material
  url: z.string().url(), // URL to the reference material
  type: z.enum(['documentation', 'article', 'book', 'course', 'other']).optional(), // Type of reference
});

/**
 * Zod schema for a community-contributed explanation.
 * Allows users to contribute alternative explanations.
 */
export const communityExplanationSchema = z.object({
  id: z.string(), // Unique identifier for the explanation
  userId: z.string(), // User who contributed the explanation
  userName: z.string().optional(), // Display name of the contributor
  content: z.string().min(1), // The explanation text
  votes: z.number().default(0), // Vote count (can be positive or negative)
  createdAt: z.date(), // When the explanation was created
  isVerified: z.boolean().default(false), // Whether the explanation has been verified by a moderator
});

/**
 * TypeScript type for a reference link, derived from the Zod schema.
 */
export type ReferenceLink = z.infer<typeof referenceLinkSchema>;

/**
 * TypeScript type for a community explanation, derived from the Zod schema.
 */
export type CommunityExplanation = z.infer<typeof communityExplanationSchema>;

/**
 * Question type enumeration for different quiz formats.
 * Supports: MCQ single/multi-select, True/False, Fill-in-Blank, Short Answer, Matching, Ordering
 */
export const questionTypeSchema = z.enum([
  'multiple_choice_single', // Traditional MCQ with one correct answer
  'multiple_choice_multiple', // MCQ with multiple correct answers
  'true_false', // True/False question
  'fill_in_blank', // Fill in the blank question
  'short_answer', // Short answer requiring manual grading
  'matching', // Match pairs of items
  'ordering', // Order items in correct sequence
]);

export type QuestionType = z.infer<typeof questionTypeSchema>;

/**
 * Zod schema for a matching pair in matching questions.
 */
export const matchingPairSchema = z.object({
  id: z.number().int().min(0),
  left: z.string().min(1), // Left side item
  right: z.string().min(1), // Right side item (correct match)
});

export type MatchingPair = z.infer<typeof matchingPairSchema>;

/**
 * Zod schema for ordering items.
 */
export const orderingItemSchema = z.object({
  id: z.number().int().min(0),
  text: z.string().min(1),
  correctPosition: z.number().int().min(0), // The correct position in the sequence
});

export type OrderingItem = z.infer<typeof orderingItemSchema>;

/**
 * Validates that a question's correctAnswer matches one of the option IDs.
 * @param options Array of question options
 * @param correctAnswer The ID of the correct answer
 * @returns true if correctAnswer matches an option ID, false otherwise
 */
export function validateCorrectAnswer(options: QuestionOption[], correctAnswer: number): boolean {
  return options.some((option) => option.id === correctAnswer);
}

/**
 * Normalizes question options to use 0-indexed IDs.
 * If options don't have IDs or have non-sequential IDs, this will reassign them.
 *
 * Note: This utility function is provided for migration scripts and future use
 * when fixing existing data with inconsistent option IDs.
 *
 * @param options Array of options (potentially without IDs or with inconsistent IDs)
 * @returns Normalized options with 0-indexed IDs
 */
export function normalizeQuestionOptions(
  options: Array<{ id?: number; text: string }>
): QuestionOption[] {
  return options.map((option, index) => ({
    id: index,
    text: option.text,
  }));
}

/**
 * Validates a complete question's options and correctAnswer.
 * Returns validation result with specific error messages.
 *
 * Note: This utility function provides a convenient way to validate question data
 * in migration scripts or when validating data from external sources. The import
 * flow uses `validateQuestionOptions` in import-questions.ts for per-question validation.
 */
export function validateQuestionData(data: { options: unknown; correctAnswer: number }): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate options structure
  const optionsResult = questionOptionsSchema.safeParse(data.options);
  if (!optionsResult.success) {
    errors.push(`Invalid options: ${optionsResult.error.message}`);
    return { valid: false, errors };
  }

  // Validate correctAnswer matches an option ID
  if (!validateCorrectAnswer(optionsResult.data, data.correctAnswer)) {
    const optionIds = optionsResult.data.map((o) => o.id).join(', ');
    errors.push(
      `correctAnswer ${data.correctAnswer} does not match any option ID. Valid IDs: ${optionIds}`
    );
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

// ============================================================================
// Data Model Definitions
// ============================================================================
//
// NOTE: These use drizzle-orm's pgTable for TypeScript type inference only.
// CertLab uses Cloud Firestore as its storage, not PostgreSQL.
// The pgTable definitions provide consistent TypeScript types used by:
// 1. Firestore implementation (client/src/lib/firestore-storage.ts)
// 2. Shared type definitions across the application
// 3. Future storage implementations
//
// At runtime, only Firestore is used for storage. No PostgreSQL connection exists.
// ============================================================================

// Session storage table (legacy - not used in current Firestore implementation)
export const sessions = pgTable(
  'sessions',
  {
    sid: varchar('sid').primaryKey(),
    sess: jsonb('sess').notNull(),
    expire: timestamp('expire').notNull(),
  },
  (table) => [index('IDX_session_expire').on(table.expire)]
);

// Tenants table for multi-tenancy support
export const tenants = pgTable('tenants', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  domain: text('domain').unique(), // Optional custom domain
  settings: jsonb('settings').default({}), // Tenant-specific configuration
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// User storage table
export const users = pgTable('users', {
  id: varchar('id').primaryKey().notNull(),
  email: varchar('email').unique().notNull(),
  passwordHash: varchar('password_hash'), // bcrypt hashed password
  firstName: varchar('first_name'),
  lastName: varchar('last_name'),
  profileImageUrl: varchar('profile_image_url'),
  role: text('role').notNull().default('user'), // "admin", "user"
  tenantId: integer('tenant_id').notNull().default(1),
  certificationGoals: jsonb('certification_goals').$type<string[]>(),
  studyPreferences: jsonb('study_preferences').$type<{
    dailyTimeMinutes?: number;
    preferredDifficulty?: 'beginner' | 'intermediate' | 'advanced';
    focusAreas?: string[];
    studyDays?: string[];
    reminderTime?: string;
  }>(),
  skillsAssessment: jsonb('skills_assessment').$type<{
    experienceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    relevantExperience?: string[];
    learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
    completedCertifications?: string[];
    motivations?: string[];
  }>(),
  polarCustomerId: varchar('polar_customer_id'), // Used for credits management
  tokenBalance: integer('token_balance').default(100), // Free tokens for quiz generation
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
});

export const subcategories = pgTable('subcategories', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  categoryId: integer('category_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
});

export const questions = pgTable('questions', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  categoryId: integer('category_id').notNull(),
  subcategoryId: integer('subcategory_id').notNull(),
  questionType: text('question_type').notNull().default('multiple_choice_single'), // Type of question
  text: text('text').notNull(),
  options: jsonb('options').$type<QuestionOption[]>(), // Array of option objects (for MCQ/True-False)
  correctAnswer: integer('correct_answer'), // Correct answer index (for MCQ/True-False, nullable for other types)
  correctAnswers: jsonb('correct_answers').$type<number[]>(), // Multiple correct answers (for multiple choice multiple)
  acceptedAnswers: jsonb('accepted_answers').$type<string[]>(), // Accepted text answers (for fill-in-blank)
  matchingPairs: jsonb('matching_pairs').$type<MatchingPair[]>(), // Pairs for matching questions
  orderingItems: jsonb('ordering_items').$type<OrderingItem[]>(), // Items for ordering questions
  requiresManualGrading: boolean('requires_manual_grading').default(false), // Flag for short answer questions
  explanation: text('explanation'), // Legacy: Simple text explanation (V1)
  difficultyLevel: integer('difficulty_level').default(1), // 1-5 scale (1=Easy, 5=Expert)
  tags: jsonb('tags'), // Array of topic tags for lecture generation
  // V2 Explanation fields
  explanationSteps: jsonb('explanation_steps').$type<string[]>(), // Step-by-step breakdown of the explanation
  referenceLinks: jsonb('reference_links').$type<ReferenceLink[]>(), // Links to study materials
  videoUrl: text('video_url'), // Optional video explanation URL (YouTube, Vimeo, etc.)
  communityExplanations: jsonb('community_explanations').$type<CommunityExplanation[]>(), // Community-contributed explanations
  explanationVotes: integer('explanation_votes').default(0), // Total votes for the primary explanation
  hasAlternativeViews: boolean('has_alternative_views').default(false), // Flag indicating alternative explanations exist
});

// User quizzes - isolated per tenant (user data does not transfer between tenants)
export const quizzes = pgTable('quizzes', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull(),
  tenantId: integer('tenant_id').notNull().default(1), // Isolates quiz history per tenant
  title: text('title').notNull(),
  description: text('description'), // Quiz description for search and display
  tags: jsonb('tags').$type<string[]>(), // Multi-tag support for categorization and search
  categoryIds: jsonb('category_ids').notNull(), // Array of category IDs
  subcategoryIds: jsonb('subcategory_ids').notNull(), // Array of subcategory IDs
  questionIds: jsonb('question_ids'), // Array of specific question IDs for this quiz (for consistent scoring)
  questionCount: integer('question_count').notNull(),
  timeLimit: integer('time_limit'), // in minutes, null for no limit
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  score: integer('score'), // percentage
  correctAnswers: integer('correct_answers'),
  totalQuestions: integer('total_questions'),
  answers: jsonb('answers'), // Array of user answers
  isAdaptive: boolean('is_adaptive').default(false),
  adaptiveMetrics: jsonb('adaptive_metrics'), // Tracks wrong answer patterns
  difficultyLevel: integer('difficulty_level').default(1), // 1-5 scale (1=Easy, 5=Expert)
  difficultyFilter: jsonb('difficulty_filter'), // Array of difficulty levels to include
  isPassing: boolean('is_passing').default(false), // 85%+ threshold
  missedTopics: jsonb('missed_topics'), // Topics that need lecture generation
  mode: text('mode').notNull().default('study'), // "study", "quiz", or "challenge" mode
  author: varchar('author'), // Author user ID (for user-created quizzes)
  authorName: text('author_name'), // Author display name (cached for performance)
  prerequisites: jsonb('prerequisites').$type<{ quizIds?: number[]; lectureIds?: number[] }>(), // Required materials/quizzes before taking this quiz
  createdAt: timestamp('created_at').defaultNow(), // Creation timestamp
  updatedAt: timestamp('updated_at').defaultNow(), // Last modification timestamp
  // Advanced Configuration Options
  randomizeQuestions: boolean('randomize_questions').default(false), // Shuffle question order
  randomizeAnswers: boolean('randomize_answers').default(false), // Shuffle answer options
  timeLimitPerQuestion: integer('time_limit_per_question'), // Time limit per question in seconds, null for no limit
  questionWeights: jsonb('question_weights').$type<Record<number, number>>(), // Per-question scoring weights keyed by question index/order (index -> weight)
  feedbackMode: text('feedback_mode').default('instant'), // 'instant', 'delayed', 'final' - when to show explanations
  passingScore: integer('passing_score').default(70), // Passing percentage threshold
  maxAttempts: integer('max_attempts'), // Maximum attempts allowed, null for unlimited
  isAdvancedConfig: boolean('is_advanced_config').default(false), // Flag indicating if admin promoted this config
  // Access Control
  visibility: text('visibility').default('private'), // 'private', 'shared', 'public' - who can access this quiz
  sharedWithUsers: jsonb('shared_with_users').$type<string[]>(), // User IDs who have access (for 'shared' visibility)
  sharedWithGroups: jsonb('shared_with_groups').$type<number[]>(), // Group IDs who have access (for 'shared' visibility)
  requiresPurchase: boolean('requires_purchase').default(false), // Whether purchase is required for access
  purchaseProductId: text('purchase_product_id'), // Product ID for marketplace integration
  // Distribution Settings
  distributionMethod: text('distribution_method').default('open'), // 'open', 'self_enroll', 'instructor_assign'
  availableFrom: timestamp('available_from'), // When quiz becomes available
  availableUntil: timestamp('available_until'), // When quiz expires
  enrollmentDeadline: timestamp('enrollment_deadline'), // Last date for enrollment
  maxEnrollments: integer('max_enrollments'), // Max enrollments allowed, null = unlimited
  requireApproval: boolean('require_approval').default(false), // Whether enrollment needs approval
  assignmentDueDate: timestamp('assignment_due_date'), // Due date for assignments
  sendNotifications: boolean('send_notifications').default(true), // Send assignment notifications
  reminderDays: jsonb('reminder_days').$type<number[]>(), // Days before due to send reminders
});

// Micro-learning challenges table
export const challenges = pgTable('challenges', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull(),
  type: text('type').notNull(), // "daily", "quick", "streak", "focus"
  title: text('title').notNull(),
  description: text('description'),
  categoryId: integer('category_id'),
  subcategoryId: integer('subcategory_id'),
  targetScore: integer('target_score').default(80), // Target percentage
  questionsCount: integer('questions_count').default(5), // 3-7 questions typically
  timeLimit: integer('time_limit').default(5), // 5-15 minutes
  difficulty: integer('difficulty').default(1), // 1-3 for challenges (easier than full quizzes)
  streakMultiplier: integer('streak_multiplier').default(1), // Bonus points for streaks
  pointsReward: integer('points_reward').default(50), // Base points for completion
  isActive: boolean('is_active').default(true),
  availableAt: timestamp('available_at').defaultNow(),
  expiresAt: timestamp('expires_at'), // Some challenges expire (like daily challenges)
  createdAt: timestamp('created_at').defaultNow(),
});

// User challenge attempts and progress
export const challengeAttempts = pgTable('challenge_attempts', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull(),
  tenantId: integer('tenant_id').notNull().default(1),
  challengeId: integer('challenge_id').notNull(),
  quizId: integer('quiz_id'), // Links to the actual quiz attempt
  score: integer('score'), // Percentage score
  pointsEarned: integer('points_earned').default(0),
  timeSpent: integer('time_spent'), // in seconds
  isCompleted: boolean('is_completed').default(false),
  isPassed: boolean('is_passed').default(false), // Met the target score
  answers: jsonb('answers'), // User answers for quick reference
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

export const userProgress = pgTable('user_progress', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull(),
  tenantId: integer('tenant_id').notNull().default(1),
  categoryId: integer('category_id').notNull(),
  questionsCompleted: integer('questions_completed').notNull().default(0),
  totalQuestions: integer('total_questions').notNull().default(0),
  averageScore: integer('average_score').notNull().default(0),
  lastQuizDate: timestamp('last_quiz_date'),
  adaptiveDifficulty: integer('adaptive_difficulty').default(1), // 1-5 scale
  consecutiveCorrect: integer('consecutive_correct').default(0),
  consecutiveWrong: integer('consecutive_wrong').default(0),
  weakSubcategories: jsonb('weak_subcategories'), // Array of struggling subcategory IDs
});

// Mastery tracking for rolling average across all certification areas
export const masteryScores = pgTable('mastery_scores', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull(),
  tenantId: integer('tenant_id').notNull().default(1),
  categoryId: integer('category_id').notNull(),
  subcategoryId: integer('subcategory_id').notNull(),
  correctAnswers: integer('correct_answers').notNull().default(0),
  totalAnswers: integer('total_answers').notNull().default(0),
  rollingAverage: integer('rolling_average').notNull().default(0), // 0-100 percentage
  lastUpdated: timestamp('last_updated').defaultNow(),
});

// Lectures table for AI-generated content based on missed topics
export const lectures = pgTable('lectures', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull(),
  tenantId: integer('tenant_id').notNull().default(1),
  quizId: integer('quiz_id'),
  title: text('title').notNull(),
  description: text('description'), // Lecture description for search and display
  content: text('content').notNull(), // Generated lecture content
  topics: jsonb('topics').notNull(), // Legacy field: Array of topic tags (kept for backward compatibility)
  tags: jsonb('tags').$type<string[]>(), // Canonical field: Multi-tag support for categorization and search
  categoryId: integer('category_id').notNull(),
  subcategoryId: integer('subcategory_id'),
  difficultyLevel: integer('difficulty_level').default(1), // 1-5 scale (1=Easy, 5=Expert)
  author: varchar('author'), // Author user ID (for user-created or AI-generated)
  authorName: text('author_name'), // Author display name (cached for performance, e.g., "AI Tutor" or user name)
  prerequisites: jsonb('prerequisites').$type<{ quizIds?: number[]; lectureIds?: number[] }>(), // Recommended prerequisites before reading
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'), // Last modification timestamp
  isRead: boolean('is_read').default(false),
  // Multiple content type support
  contentType: text('content_type').default('text'), // 'text', 'video', 'pdf', 'interactive', 'code'
  videoUrl: text('video_url'), // URL for video content (YouTube, Vimeo, uploaded)
  videoProvider: text('video_provider'), // 'youtube', 'vimeo', 'upload'
  videoDuration: integer('video_duration'), // Duration in seconds
  pdfUrl: text('pdf_url'), // URL to PDF file
  pdfPages: integer('pdf_pages'), // Number of pages in PDF
  interactiveUrl: text('interactive_url'), // URL to interactive content
  interactiveType: text('interactive_type'), // Type of interactive content: 'code', 'widget', 'quiz'
  codeLanguage: text('code_language'), // Programming language for code examples
  codeContent: text('code_content'), // Code snippet content
  hasCodeHighlighting: boolean('has_code_highlighting').default(false), // Whether content includes syntax highlighting
  thumbnailUrl: text('thumbnail_url'), // Thumbnail/preview image URL
  fileSize: integer('file_size'), // File size in bytes (for PDFs, videos)
  accessibilityFeatures: jsonb('accessibility_features').$type<{
    hasTranscript?: boolean;
    hasClosedCaptions?: boolean;
    hasAudioDescription?: boolean;
    altText?: string;
  }>(), // Accessibility metadata
  // Access Control
  visibility: text('visibility').default('private'), // 'private', 'shared', 'public' - who can access this lecture
  sharedWithUsers: jsonb('shared_with_users').$type<string[]>(), // User IDs who have access (for 'shared' visibility)
  sharedWithGroups: jsonb('shared_with_groups').$type<number[]>(), // Group IDs who have access (for 'shared' visibility)
  requiresPurchase: boolean('requires_purchase').default(false), // Whether purchase is required for access
  purchaseProductId: text('purchase_product_id'), // Product ID for marketplace integration
  // Distribution Settings
  distributionMethod: text('distribution_method').default('open'), // 'open', 'self_enroll', 'instructor_assign'
  availableFrom: timestamp('available_from'), // When lecture becomes available
  availableUntil: timestamp('available_until'), // When lecture expires
  enrollmentDeadline: timestamp('enrollment_deadline'), // Last date for enrollment
  maxEnrollments: integer('max_enrollments'), // Max enrollments allowed, null = unlimited
  requireApproval: boolean('require_approval').default(false), // Whether enrollment needs approval
  assignmentDueDate: timestamp('assignment_due_date'), // Due date for assignments
  sendNotifications: boolean('send_notifications').default(true), // Send assignment notifications
  reminderDays: jsonb('reminder_days').$type<number[]>(), // Days before due to send reminders
});

// Study Notes table for user-generated study notes from quiz results
export const studyNotes = pgTable('study_notes', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull(),
  tenantId: integer('tenant_id').notNull().default(1),
  quizId: integer('quiz_id'),
  title: text('title').notNull(),
  content: text('content').notNull(), // Study notes content (HTML, markdown, or plain text; format indicated by contentType)
  richContent: jsonb('rich_content'), // Rich content in TipTap JSON format (optional)
  contentType: text('content_type').default('markdown'), // 'markdown' or 'rich' to distinguish content format
  categoryIds: jsonb('category_ids').$type<number[]>(), // Categories this note covers
  tags: jsonb('tags').$type<string[]>(), // User-defined tags for organization
  score: integer('score'), // Quiz score at time of generation
  wordCount: integer('word_count'), // Tracked for success metrics
  hasCode: boolean('has_code').default(false), // Whether note contains code blocks
  hasFormulas: boolean('has_formulas').default(false), // Whether note contains LaTeX formulas
  hasDiagrams: boolean('has_diagrams').default(false), // Whether note contains Mermaid diagrams
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
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

export const insertCategorySchema = createInsertSchema(categories)
  .omit({
    id: true,
  })
  .extend({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(200, 'Name must be 200 characters or less')
      .trim(),
    description: z
      .string()
      .max(2000, 'Description must be 2000 characters or less')
      .optional()
      .nullable(),
    icon: z.string().max(100, 'Icon must be 100 characters or less').optional().nullable(),
  });

export const insertSubcategorySchema = createInsertSchema(subcategories)
  .omit({
    id: true,
  })
  .extend({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(200, 'Name must be 200 characters or less')
      .trim(),
    description: z
      .string()
      .max(2000, 'Description must be 2000 characters or less')
      .optional()
      .nullable(),
  });

export const insertLectureSchema = createInsertSchema(lectures)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(500, 'Title must be 500 characters or less')
      .trim(),
    description: z
      .string()
      .max(2000, 'Description must be 2000 characters or less')
      .optional()
      .nullable(),
    content: z
      .string()
      .min(10, 'Content must be at least 10 characters')
      .max(50000, 'Content must be 50000 characters or less'),
    topics: z
      .array(z.string().max(100, 'Each topic must be 100 characters or less'))
      .min(1, 'At least one topic is required')
      .max(50, 'Maximum 50 topics allowed'),
    tags: z
      .array(z.string().max(50, 'Each tag must be 50 characters or less'))
      .max(50, 'Maximum 50 tags allowed')
      .optional(),
    difficultyLevel: z
      .number()
      .int()
      .min(1, 'Difficulty must be between 1 and 5')
      .max(5, 'Difficulty must be between 1 and 5')
      .optional()
      .nullable(),
    authorName: z
      .string()
      .max(200, 'Author name must be 200 characters or less')
      .optional()
      .nullable(),
    prerequisites: z
      .object({
        quizIds: z.array(z.number()).optional(),
        lectureIds: z.array(z.number()).optional(),
      })
      .optional()
      .nullable(),
    // Multiple content type validation
    contentType: z.enum(['text', 'video', 'pdf', 'interactive', 'code']).default('text'),
    videoUrl: z
      .string()
      .url('Video URL must be valid')
      .max(1000, 'Video URL must be 1000 characters or less')
      .optional()
      .nullable(),
    videoProvider: z.enum(['youtube', 'vimeo', 'upload']).optional().nullable(),
    videoDuration: z
      .number()
      .int()
      .min(1, 'Video duration must be at least 1 second')
      .max(36000, 'Video duration must be less than 10 hours')
      .optional()
      .nullable(),
    pdfUrl: z
      .string()
      .url('PDF URL must be valid')
      .max(1000, 'PDF URL must be 1000 characters or less')
      .optional()
      .nullable(),
    pdfPages: z
      .number()
      .int()
      .min(1, 'PDF must have at least 1 page')
      .max(10000, 'PDF must have less than 10000 pages')
      .optional()
      .nullable(),
    interactiveUrl: z
      .string()
      .url('Interactive URL must be valid')
      .max(1000, 'Interactive URL must be 1000 characters or less')
      .optional()
      .nullable(),
    interactiveType: z.enum(['code', 'widget', 'quiz']).optional().nullable(),
    codeLanguage: z
      .string()
      .max(50, 'Code language must be 50 characters or less')
      .optional()
      .nullable(),
    codeContent: z
      .string()
      .max(50000, 'Code content must be 50000 characters or less')
      .optional()
      .nullable(),
    hasCodeHighlighting: z.boolean().default(false),
    thumbnailUrl: z
      .string()
      .url('Thumbnail URL must be valid')
      .max(1000, 'Thumbnail URL must be 1000 characters or less')
      .optional()
      .nullable(),
    fileSize: z
      .number()
      .int()
      .min(0, 'File size must be non-negative')
      .max(1073741824, 'File size must be less than 1GB')
      .optional()
      .nullable(),
    accessibilityFeatures: z
      .object({
        hasTranscript: z.boolean().optional(),
        hasClosedCaptions: z.boolean().optional(),
        hasAudioDescription: z.boolean().optional(),
        altText: z.string().max(500, 'Alt text must be 500 characters or less').optional(),
      })
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    const contentType = (data as { contentType?: string }).contentType;

    // Validate video-specific required fields
    if (contentType === 'video') {
      if (!data.videoUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Video URL is required when content type is video',
          path: ['videoUrl'],
        });
      }
      if (!data.videoProvider) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Video provider is required when content type is video',
          path: ['videoProvider'],
        });
      }
    }

    // Validate PDF-specific required fields
    if (contentType === 'pdf') {
      if (!data.pdfUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'PDF URL is required when content type is pdf',
          path: ['pdfUrl'],
        });
      }
    }

    // Validate interactive-specific required fields
    if (contentType === 'interactive') {
      if (!data.interactiveUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Interactive URL is required when content type is interactive',
          path: ['interactiveUrl'],
        });
      }
    }

    // Validate code-specific required fields
    if (contentType === 'code') {
      if (!data.codeLanguage) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Code language is required when content type is code',
          path: ['codeLanguage'],
        });
      }
      if (!data.codeContent) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Code content is required when content type is code',
          path: ['codeContent'],
        });
      }
    }
  });

export const insertStudyNoteSchema = createInsertSchema(studyNotes)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(500, 'Title must be 500 characters or less')
      .trim(),
    content: z
      .string()
      .min(10, 'Content must be at least 10 characters')
      .max(100000, 'Content must be 100000 characters or less'),
    tags: z
      .array(z.string().max(50, 'Each tag must be 50 characters or less'))
      .max(50, 'Maximum 50 tags allowed')
      .optional(),
  });

export const insertQuestionSchema = createInsertSchema(questions)
  .omit({
    id: true,
  })
  .extend({
    // Enhanced validation with character limits to prevent abuse
    text: z
      .string()
      .min(10, 'Question text must be at least 10 characters')
      .max(2000, 'Question text must be 2000 characters or less'),
    questionType: questionTypeSchema.default('multiple_choice_single'),
    // Override the options field with proper Zod validation (optional for non-MCQ types)
    options: questionOptionsSchema.optional().nullable(),
    correctAnswer: z
      .number()
      .int()
      .min(0, 'Correct answer must be a valid option index')
      .optional()
      .nullable(),
    correctAnswers: z.array(z.number().int().min(0)).optional().nullable(),
    acceptedAnswers: z.array(z.string().min(1).max(500)).max(10).optional().nullable(),
    matchingPairs: z.array(matchingPairSchema).min(2).max(10).optional().nullable(),
    orderingItems: z.array(orderingItemSchema).min(2).max(10).optional().nullable(),
    requiresManualGrading: z.boolean().default(false),
    explanation: z
      .string()
      .max(5000, 'Explanation must be 5000 characters or less')
      .optional()
      .nullable(),
    difficultyLevel: z
      .number()
      .int()
      .min(1, 'Difficulty must be between 1 and 5')
      .max(5, 'Difficulty must be between 1 and 5')
      .optional()
      .nullable(),
    tags: z
      .array(z.string().max(50, 'Each tag must be 50 characters or less'))
      .max(20, 'Maximum 20 tags allowed')
      .optional()
      .nullable(),
    // Add validation for V2 explanation fields
    explanationSteps: z
      .array(z.string().max(1000, 'Each explanation step must be 1000 characters or less'))
      .max(10, 'Maximum 10 explanation steps allowed')
      .optional(),
    referenceLinks: z
      .array(referenceLinkSchema)
      .max(10, 'Maximum 10 reference links allowed')
      .optional(),
    videoUrl: z
      .union([
        z
          .string()
          .url('Video URL must be a valid URL')
          .max(500, 'Video URL must be 500 characters or less'),
        z.literal(''),
      ])
      .optional(),
    communityExplanations: z
      .array(communityExplanationSchema)
      .max(50, 'Maximum 50 community explanations allowed')
      .optional(),
  })
  .superRefine((data, ctx) => {
    const questionType =
      (data as { questionType?: string }).questionType || 'multiple_choice_single';

    // Validate question type specific requirements
    if (questionType === 'multiple_choice_single' || questionType === 'true_false') {
      // MCQ Single and True/False require options and correctAnswer
      if (!data.options || data.options.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Options are required for multiple choice and true/false questions',
          path: ['options'],
        });
      }
      if (data.correctAnswer === undefined || data.correctAnswer === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Correct answer is required for multiple choice and true/false questions',
          path: ['correctAnswer'],
        });
      }
    }

    if (questionType === 'multiple_choice_multiple') {
      // MCQ Multiple requires options and correctAnswers (array)
      if (!data.options || data.options.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Options are required for multiple choice questions',
          path: ['options'],
        });
      }
      if (!data.correctAnswers || data.correctAnswers.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'At least one correct answer is required for multiple select questions',
          path: ['correctAnswers'],
        });
      }
    }

    if (questionType === 'fill_in_blank') {
      // Fill in blank requires acceptedAnswers
      if (!data.acceptedAnswers || data.acceptedAnswers.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'At least one accepted answer is required for fill-in-blank questions',
          path: ['acceptedAnswers'],
        });
      }
    }

    if (questionType === 'matching') {
      // Matching requires matchingPairs
      if (!data.matchingPairs || data.matchingPairs.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'At least 2 matching pairs are required for matching questions',
          path: ['matchingPairs'],
        });
      }
    }

    if (questionType === 'ordering') {
      // Ordering requires orderingItems
      if (!data.orderingItems || data.orderingItems.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'At least 2 items are required for ordering questions',
          path: ['orderingItems'],
        });
      }
    }

    if (questionType === 'short_answer') {
      // Short answer should be flagged for manual grading
      // This is handled by the default value of requiresManualGrading
    }
  });

export const insertQuizSchema = createInsertSchema(quizzes)
  .omit({
    id: true,
    startedAt: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(200, 'Title must be 200 characters or less')
      .trim(),
    description: z
      .string()
      .max(2000, 'Description must be 2000 characters or less')
      .optional()
      .nullable(),
    tags: z
      .array(z.string().max(50, 'Each tag must be 50 characters or less'))
      .max(50, 'Maximum 50 tags allowed')
      .optional(),
    difficultyLevel: z
      .number()
      .int()
      .min(1, 'Difficulty must be between 1 and 5')
      .max(5, 'Difficulty must be between 1 and 5')
      .optional()
      .nullable(),
    authorName: z
      .string()
      .max(200, 'Author name must be 200 characters or less')
      .optional()
      .nullable(),
    prerequisites: z
      .object({
        quizIds: z.array(z.number()).optional(),
        lectureIds: z.array(z.number()).optional(),
      })
      .optional()
      .nullable(),
  });

export const insertUserProgressSchema = createInsertSchema(userProgress).omit({
  id: true,
});

export const insertMasteryScoreSchema = createInsertSchema(masteryScores).omit({
  id: true,
  lastUpdated: true,
});

// Achievement badges for gamified learning milestones
export const badges = pgTable('badges', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(), // e.g., "First Steps", "Quiz Master", "Streak Champion"
  description: text('description').notNull(),
  icon: text('icon').notNull(), // Icon class or emoji
  category: text('category').notNull(), // "progress", "performance", "streak", "mastery"
  requirement: jsonb('requirement').notNull(), // Flexible requirement definition
  color: text('color').notNull(), // Badge color theme
  rarity: text('rarity').notNull(), // "common", "uncommon", "rare", "legendary"
  tier: text('tier'), // "bronze", "silver", "gold", "platinum" - for tiered achievements
  points: integer('points').default(0), // Gamification points awarded
  createdAt: timestamp('created_at').defaultNow(),
});

// User badges - tracks which badges users have earned
export const userBadges = pgTable('user_badges', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull(),
  tenantId: integer('tenant_id').notNull().default(1),
  badgeId: integer('badge_id').notNull(),
  earnedAt: timestamp('earned_at').defaultNow(),
  progress: integer('progress').default(0), // For progressive badges
  isNotified: boolean('is_notified').default(false), // Whether user has seen the achievement
});

// User statistics for gamification
export const userGameStats = pgTable('user_game_stats', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull(),
  tenantId: integer('tenant_id').notNull().default(1),
  totalPoints: integer('total_points').default(0),
  currentStreak: integer('current_streak').default(0),
  longestStreak: integer('longest_streak').default(0),
  lastActivityDate: timestamp('last_activity_date'),
  lastLoginDate: timestamp('last_login_date'), // Track last login for daily rewards
  consecutiveLoginDays: integer('consecutive_login_days').default(0), // Daily login tracking
  totalBadgesEarned: integer('total_badges_earned').default(0),
  level: integer('level').default(1), // User level based on points
  nextLevelPoints: integer('next_level_points').default(100),
  streakFreezes: integer('streak_freezes').default(1), // Weekly streak freeze allowance
  lastStreakFreezeReset: timestamp('last_streak_freeze_reset'), // Track when freeze resets
  selectedTitle: text('selected_title'), // User's selected profile title
  profileCustomization: jsonb('profile_customization').$type<{
    theme?: string;
    avatar?: string;
    border?: string;
  }>(), // Profile customization options
  gamificationEnabled: boolean('gamification_enabled').default(true), // Opt-out of gamification
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
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
  role: z.enum(['user', 'admin']).optional(),
});

// Quiz creation schema with enhanced validation
export const createQuizSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less')
    .trim(),
  categoryIds: z.array(z.number()).min(1, 'At least one category is required'),
  subcategoryIds: z.array(z.number()).optional(),
  questionCount: z
    .number()
    .min(1, 'At least 1 question is required')
    .max(100, 'Maximum 100 questions allowed'),
  timeLimit: z.number().optional(),
  mode: z.enum(['study', 'quiz']).default('study'),
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
export type InsertStudyNote = z.infer<typeof insertStudyNoteSchema>;
export type StudyNote = typeof studyNotes.$inferSelect;

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
export const studyGroups = pgTable('study_groups', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().default(1),
  name: text('name').notNull(),
  description: text('description'),
  categoryIds: jsonb('category_ids').notNull().$type<number[]>(), // Categories this group focuses on
  createdBy: varchar('created_by').notNull(), // User ID who created the group
  maxMembers: integer('max_members').default(20),
  isPublic: boolean('is_public').default(true),
  level: text('level').default('Intermediate'), // "Beginner" | "Intermediate" | "Advanced"
  meetingSchedule: jsonb('meeting_schedule').$type<{
    frequency?: string;
    dayOfWeek?: string;
    time?: string;
  }>(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Study Group Members table
export const studyGroupMembers = pgTable('study_group_members', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').notNull(),
  userId: varchar('user_id').notNull(),
  role: text('role').default('member'), // "owner", "moderator", "member"
  joinedAt: timestamp('joined_at').defaultNow(),
  lastActiveAt: timestamp('last_active_at'),
  contributionScore: integer('contribution_score').default(0), // Points for activity in group
});

// Practice Tests table for certification practice exams
export const practiceTests = pgTable('practice_tests', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().default(1),
  name: text('name').notNull(),
  description: text('description'),
  categoryIds: jsonb('category_ids').notNull().$type<number[]>(),
  questionCount: integer('question_count').notNull(),
  timeLimit: integer('time_limit').notNull(), // in minutes
  difficulty: text('difficulty').notNull(), // "Easy", "Medium", "Hard", "Mixed"
  passingScore: integer('passing_score').default(70), // percentage
  isOfficial: boolean('is_official').default(false), // Whether this is an official practice test
  questionPool: jsonb('question_pool').$type<number[]>(), // Optional: specific question IDs to use
  createdBy: varchar('created_by'), // User ID if user-created
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Practice Test Attempts table
export const practiceTestAttempts = pgTable('practice_test_attempts', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  testId: integer('test_id').notNull(),
  userId: varchar('user_id').notNull(),
  quizId: integer('quiz_id'), // Links to the actual quiz attempt
  score: integer('score'), // percentage
  isPassed: boolean('is_passed').default(false),
  timeSpent: integer('time_spent'), // in seconds
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

// Insert schemas for study groups and practice tests
export const insertStudyGroupSchema = createInsertSchema(studyGroups)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(200, 'Name must be 200 characters or less')
      .trim(),
    description: z
      .string()
      .max(2000, 'Description must be 2000 characters or less')
      .optional()
      .nullable(),
    categoryIds: z
      .array(z.number())
      .min(1, 'At least one category is required')
      .max(10, 'Maximum 10 categories allowed'),
    maxMembers: z
      .number()
      .int()
      .min(2, 'Minimum 2 members')
      .max(100, 'Maximum 100 members')
      .optional()
      .nullable(),
  });

export const insertStudyGroupMemberSchema = createInsertSchema(studyGroupMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertPracticeTestSchema = createInsertSchema(practiceTests)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(200, 'Name must be 200 characters or less')
      .trim(),
    description: z
      .string()
      .max(2000, 'Description must be 2000 characters or less')
      .optional()
      .nullable(),
    categoryIds: z
      .array(z.number())
      .min(1, 'At least one category is required')
      .max(10, 'Maximum 10 categories allowed'),
    questionCount: z.number().int().min(5, 'Minimum 5 questions').max(500, 'Maximum 500 questions'),
    timeLimit: z
      .number()
      .int()
      .min(1, 'Minimum 1 minute')
      .max(480, 'Maximum 480 minutes (8 hours)'),
    passingScore: z
      .number()
      .int()
      .min(0, 'Passing score must be 0-100')
      .max(100, 'Passing score must be 0-100')
      .optional()
      .nullable(),
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

// Quests table for gamification V2 quest system
export const quests = pgTable('quests', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  type: text('type').notNull(), // "daily", "weekly", "monthly", "special"
  requirement: jsonb('requirement').notNull().$type<{
    type: string; // e.g., "quizzes_completed", "questions_answered", "perfect_scores"
    target: number; // e.g., 5 for "complete 5 quizzes"
    categoryId?: number; // Optional category restriction
  }>(),
  reward: jsonb('reward').notNull().$type<{
    points: number;
    title?: string; // Optional title unlock
    badgeId?: number; // Optional badge unlock
  }>(),
  isActive: boolean('is_active').default(true),
  validFrom: timestamp('valid_from').defaultNow(),
  validUntil: timestamp('valid_until'), // Expiration for time-limited quests
  createdAt: timestamp('created_at').defaultNow(),
});

// User quest progress table
export const userQuestProgress = pgTable('user_quest_progress', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull(),
  tenantId: integer('tenant_id').notNull().default(1),
  questId: integer('quest_id').notNull(),
  progress: integer('progress').default(0), // Current progress towards target
  isCompleted: boolean('is_completed').default(false),
  completedAt: timestamp('completed_at'),
  rewardClaimed: boolean('reward_claimed').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Daily rewards table
export const dailyRewards = pgTable('daily_rewards', {
  id: serial('id').primaryKey(),
  day: integer('day').notNull(), // Day number (1-7 for weekly cycle, or higher for monthly)
  reward: jsonb('reward').notNull().$type<{
    points: number;
    title?: string;
    streakFreeze?: boolean; // Special reward: extra streak freeze
  }>(),
  description: text('description').notNull(),
});

// User daily reward claims
export const userDailyRewards = pgTable('user_daily_rewards', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull(),
  tenantId: integer('tenant_id').notNull().default(1),
  day: integer('day').notNull(),
  claimedAt: timestamp('claimed_at').defaultNow(),
  rewardData: jsonb('reward_data'), // Copy of reward data at time of claim
});

// User titles (unlockable profile titles)
export const userTitles = pgTable('user_titles', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull(),
  tenantId: integer('tenant_id').notNull().default(1),
  title: text('title').notNull(), // e.g., "Quiz Master", "Streak Champion", "Study Warrior"
  description: text('description'),
  unlockedAt: timestamp('unlocked_at').defaultNow(),
  source: text('source'), // Where it came from: "quest", "badge", "achievement", "special"
});

// Marketplace Product table
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().default(1),
  title: text('title').notNull(),
  description: text('description').notNull(),
  type: text('type').notNull(), // 'quiz' | 'material' | 'course' | 'bundle'
  resourceIds: jsonb('resource_ids').$type<number[]>().notNull(), // Content IDs included in this product
  price: integer('price').notNull(), // Price in cents or tokens
  currency: text('currency').notNull().default('USD'),
  isPremium: boolean('is_premium').notNull().default(false),
  subscriptionDuration: integer('subscription_duration'), // Duration in days for subscriptions (nullable)
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Purchase table for tracking marketplace purchases
export const purchases = pgTable('purchases', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull(),
  tenantId: integer('tenant_id').notNull().default(1),
  productId: integer('product_id').notNull(),
  productType: text('product_type').notNull(), // 'quiz' | 'material' | 'course' | 'bundle'
  purchaseDate: timestamp('purchase_date').defaultNow(),
  expiryDate: timestamp('expiry_date'), // For subscriptions
  status: text('status').notNull().default('active'), // 'active' | 'expired' | 'refunded'
  amount: integer('amount').notNull(), // Amount paid in cents or tokens
  currency: text('currency').notNull().default('USD'),
  paymentMethod: text('payment_method').notNull(), // 'stripe' | 'tokens' | 'polar'
  transactionId: text('transaction_id'), // External payment ID
});

// Insert schemas for products and purchases
export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPurchaseSchema = createInsertSchema(purchases).omit({
  id: true,
  purchaseDate: true,
});

// Types for products and purchases
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type Purchase = typeof purchases.$inferSelect;

// Marketplace purchase type (legacy - kept for compatibility)
export type MarketplacePurchase = {
  id: number;
  userId: string;
  materialId: string;
  materialName: string;
  materialType: string;
  tokensCost: number;
  purchasedAt: Date;
};

// Study Timer Sessions table for generic activity tracking
export const studyTimerSessions = pgTable('study_timer_sessions', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull(),
  tenantId: integer('tenant_id').notNull().default(1),
  sessionType: text('session_type').notNull(), // "work", "break", "long_break"
  activityLabel: text('activity_label'), // User-defined activity label (e.g., "Work Session", "Meditation", "Exercise")
  duration: integer('duration').notNull(), // in minutes
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  isCompleted: boolean('is_completed').default(false),
  isPaused: boolean('is_paused').default(false),
  pausedAt: timestamp('paused_at'),
  totalPausedTime: integer('total_paused_time').default(0), // in seconds
  categoryId: integer('category_id'), // Optional: link to study category
  notes: text('notes'), // Optional: user notes for the session
});

// Study Timer Settings table for user preferences
export const studyTimerSettings = pgTable('study_timer_settings', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull().unique(),
  tenantId: integer('tenant_id').notNull().default(1),
  workDuration: integer('work_duration').default(25), // in minutes
  breakDuration: integer('break_duration').default(5), // in minutes
  longBreakDuration: integer('long_break_duration').default(15), // in minutes
  sessionsUntilLongBreak: integer('sessions_until_long_break').default(4),
  autoStartBreaks: boolean('auto_start_breaks').default(false),
  autoStartWork: boolean('auto_start_work').default(false),
  enableNotifications: boolean('enable_notifications').default(true),
  enableSound: boolean('enable_sound').default(true),
  dailyGoalMinutes: integer('daily_goal_minutes').default(120), // 2 hours default
  customActivities: jsonb('custom_activities'), // Array of {label: string, duration: number} for user-defined activities
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Insert schemas for study timer
export const insertStudyTimerSessionSchema = createInsertSchema(studyTimerSessions).omit({
  id: true,
  startedAt: true,
});

export const insertStudyTimerSettingsSchema = createInsertSchema(studyTimerSettings).omit({
  id: true,
  updatedAt: true,
});

// Types for study timer
export type InsertStudyTimerSession = z.infer<typeof insertStudyTimerSessionSchema>;
export type StudyTimerSession = typeof studyTimerSessions.$inferSelect;
export type InsertStudyTimerSettings = z.infer<typeof insertStudyTimerSettingsSchema>;
export type StudyTimerSettings = typeof studyTimerSettings.$inferSelect;

// Study Timer Statistics type
export type StudyTimerStats = {
  todayMinutes: number;
  weekMinutes: number;
  monthMinutes: number;
  totalSessions: number;
  completedSessions: number;
  averageSessionLength: number;
  longestStreak: number;
  currentStreak: number;
};

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

// Insert schemas for gamification V2 features
export const insertQuestSchema = createInsertSchema(quests).omit({
  id: true,
  createdAt: true,
});

export const insertUserQuestProgressSchema = createInsertSchema(userQuestProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDailyRewardSchema = createInsertSchema(dailyRewards).omit({
  id: true,
});

export const insertUserDailyRewardSchema = createInsertSchema(userDailyRewards).omit({
  id: true,
  claimedAt: true,
});

export const insertUserTitleSchema = createInsertSchema(userTitles).omit({
  id: true,
  unlockedAt: true,
});

// Types for gamification V2 features
export type InsertQuest = z.infer<typeof insertQuestSchema>;
export type Quest = typeof quests.$inferSelect;
export type InsertUserQuestProgress = z.infer<typeof insertUserQuestProgressSchema>;
export type UserQuestProgress = typeof userQuestProgress.$inferSelect;
export type InsertDailyReward = z.infer<typeof insertDailyRewardSchema>;
export type DailyReward = typeof dailyRewards.$inferSelect;
export type InsertUserDailyReward = z.infer<typeof insertUserDailyRewardSchema>;
export type UserDailyReward = typeof userDailyRewards.$inferSelect;
export type InsertUserTitle = z.infer<typeof insertUserTitleSchema>;
export type UserTitle = typeof userTitles.$inferSelect;

// ============================================================================
// Quiz Version History
// ============================================================================

/**
 * QuizVersion - Immutable snapshot of quiz state at a point in time
 * Stored in Firestore at: /users/{userId}/quizzes/{quizId}/versions/{versionId}
 */
export interface QuizVersion {
  id: string; // Unique version ID (timestamp-based)
  quizId: number; // Parent quiz ID
  versionNumber: number; // Sequential version number (1, 2, 3...)
  createdAt: Date; // When this version was created
  createdBy: string; // User ID who created this version
  changeDescription?: string; // Optional description of changes

  // Full quiz snapshot at this version
  title: string;
  description: string | null;
  tags: string[] | null;
  categoryIds: number[];
  subcategoryIds: number[];
  questionIds: any[] | null;
  questionCount: number;
  timeLimit: number | null;
  customQuestions?: any[]; // For quiz templates
  difficultyLevel: number | null;
  passingScore: number | null;
  maxAttempts: number | null;
  randomizeQuestions: boolean | null;
  randomizeAnswers: boolean | null;
  timeLimitPerQuestion: number | null;
  questionWeights: Record<string, number> | null; // Keys are strings (JavaScript object behavior)
  feedbackMode: string | null;
  instructions?: string; // For quiz templates
  isPublished?: boolean; // For quiz templates
  isDraft?: boolean; // For quiz templates
  isAdvancedConfig: boolean | null;

  // Metadata
  author: string | null;
  authorName: string | null;
  prerequisites: { quizIds?: number[]; lectureIds?: number[] } | null;
}

/**
 * Zod schema for validating quiz versions
 */
export const quizVersionSchema = z.object({
  id: z.string(),
  quizId: z.number(),
  versionNumber: z.number().int().positive(),
  createdAt: z.date(),
  createdBy: z.string(),
  changeDescription: z.string().max(500).optional(),

  // Quiz data fields
  title: z.string(),
  description: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  categoryIds: z.array(z.number()),
  subcategoryIds: z.array(z.number()),
  questionIds: z.any().nullable(),
  questionCount: z.number(),
  timeLimit: z.number().nullable(),
  customQuestions: z.array(z.any()).optional(),
  difficultyLevel: z.number().nullable(),
  passingScore: z.number().nullable(),
  maxAttempts: z.number().nullable(),
  randomizeQuestions: z.boolean().nullable(),
  randomizeAnswers: z.boolean().nullable(),
  timeLimitPerQuestion: z.number().nullable(),
  // Note: Zod requires string keys for records, but JavaScript object keys are always strings
  // This matches the runtime behavior where numeric keys become strings
  questionWeights: z.record(z.string(), z.number()).nullable(),
  feedbackMode: z.string().nullable(),
  instructions: z.string().optional(),
  isPublished: z.boolean().optional(),
  isDraft: z.boolean().optional(),
  isAdvancedConfig: z.boolean().nullable(),

  // Metadata
  author: z.string().nullable(),
  authorName: z.string().nullable(),
  prerequisites: z
    .object({
      quizIds: z.array(z.number()).optional(),
      lectureIds: z.array(z.number()).optional(),
    })
    .nullable(),
});

export type InsertQuizVersion = z.infer<typeof quizVersionSchema>;

// ============================================================================
// Quiz Template Interface
// ============================================================================

/**
 * Interface for quiz templates used in the quiz builder
 * Templates are user-created quiz configurations that can be edited and published
 */
export interface QuizTemplate {
  id?: number;
  userId: string;
  tenantId: number;
  title: string;
  description: string;
  tags?: string[];
  instructions: string;
  categoryIds: number[];
  subcategoryIds: number[];
  customQuestions: CustomQuestion[];
  questionCount: number;
  timeLimit: number | null;
  passingScore: number;
  maxAttempts: number | null;
  difficultyLevel: number;
  isPublished: boolean;
  isDraft: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  // Advanced Configuration
  randomizeQuestions?: boolean;
  randomizeAnswers?: boolean;
  timeLimitPerQuestion?: number | null;
  questionWeights?: Record<number, number>;
  feedbackMode?: 'instant' | 'delayed' | 'final';
  isAdvancedConfig?: boolean;
}

/**
 * Interface for custom questions in quiz templates
 */
export interface CustomQuestion {
  id: string;
  text: string;
  options: QuestionOption[];
  correctAnswer: number;
  explanation: string;
  difficultyLevel: number;
  type: 'multiple_choice' | 'true_false';
  tags: string[];
}

// ============================================================================
// Template Library System
// ============================================================================

/**
 * Visibility levels for templates
 */
export type TemplateVisibility = 'private' | 'org' | 'public';

/**
 * Base interface for all templates
 */
export interface BaseTemplate {
  id?: number;
  userId: string; // Creator/author
  tenantId: number;
  title: string;
  description: string;
  tags: string[];
  visibility: TemplateVisibility;
  sharedWithUsers?: string[]; // User IDs for 'org' visibility
  sharedWithGroups?: number[]; // Group IDs for 'org' visibility
  usageCount: number; // Track how many times template has been used
  createdAt: Date;
  updatedAt: Date;
  // Search and indexing
  searchText?: string; // Denormalized search text for performance
}

/**
 * Quiz Template for template library
 * Extends QuizTemplate with library-specific fields
 */
export interface QuizTemplateLibrary extends BaseTemplate {
  templateType: 'quiz';
  // Quiz-specific fields
  instructions: string;
  categoryIds: number[];
  subcategoryIds: number[];
  customQuestions: CustomQuestion[];
  questionCount: number;
  timeLimit: number | null;
  passingScore: number;
  maxAttempts: number | null;
  difficultyLevel: number;
  // Advanced Configuration
  randomizeQuestions?: boolean;
  randomizeAnswers?: boolean;
  timeLimitPerQuestion?: number | null;
  questionWeights?: Record<number, number>;
  feedbackMode?: 'instant' | 'delayed' | 'final';
  isAdvancedConfig?: boolean;
}

/**
 * Material Template for template library
 * Reusable lecture/study material configurations
 */
export interface MaterialTemplateLibrary extends BaseTemplate {
  templateType: 'material';
  // Material-specific fields
  contentType: 'text' | 'video' | 'pdf' | 'interactive' | 'code';
  content: string;
  categoryId: number;
  subcategoryId?: number;
  difficultyLevel: number;
  topics: string[];
  prerequisites?: { quizIds?: number[]; lectureIds?: number[] };
  // Content type specific fields
  videoUrl?: string;
  videoProvider?: 'youtube' | 'vimeo' | 'upload';
  videoDuration?: number;
  pdfUrl?: string;
  pdfPages?: number;
  interactiveUrl?: string;
  interactiveType?: 'code' | 'widget' | 'quiz';
  codeLanguage?: string;
  codeContent?: string;
  hasCodeHighlighting?: boolean;
  thumbnailUrl?: string;
  fileSize?: number;
  accessibilityFeatures?: {
    hasTranscript?: boolean;
    hasClosedCaptions?: boolean;
    hasAudioDescription?: boolean;
    altText?: string;
  };
}

/**
 * Union type for all template types
 */
export type TemplateLibraryItem = QuizTemplateLibrary | MaterialTemplateLibrary;

/**
 * Zod schemas for template validation
 */
export const templateVisibilitySchema = z.enum(['private', 'org', 'public']);

export const baseTemplateSchema = z.object({
  id: z.number().optional(),
  userId: z.string(),
  tenantId: z.number(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000),
  tags: z.array(z.string()).max(50),
  visibility: templateVisibilitySchema,
  sharedWithUsers: z.array(z.string()).optional(),
  sharedWithGroups: z.array(z.number()).optional(),
  usageCount: z.number().default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
  searchText: z.string().optional(),
});

/**
 * Insert schemas (omit auto-generated fields)
 * Note: Must be created before superRefine is applied to base schema
 */
const quizTemplateLibrarySchemaBase = baseTemplateSchema.extend({
  templateType: z.literal('quiz'),
  instructions: z.string(),
  categoryIds: z.array(z.number()),
  subcategoryIds: z.array(z.number()),
  customQuestions: z.array(z.any()), // Use any for now, can be more specific
  questionCount: z.number(),
  timeLimit: z.number().nullable(),
  passingScore: z.number(),
  maxAttempts: z.number().nullable(),
  difficultyLevel: z.number().min(1).max(5),
  randomizeQuestions: z.boolean().optional(),
  randomizeAnswers: z.boolean().optional(),
  timeLimitPerQuestion: z.number().nullable().optional(),
  questionWeights: z.record(z.string(), z.number()).optional(),
  feedbackMode: z.enum(['instant', 'delayed', 'final']).optional(),
  isAdvancedConfig: z.boolean().optional(),
});

export const quizTemplateLibrarySchema = quizTemplateLibrarySchemaBase.superRefine((data, ctx) => {
  if (data.questionCount !== data.customQuestions.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['questionCount'],
      message: 'questionCount must match the number of items in customQuestions',
    });
  }
});

export const insertQuizTemplateLibrarySchema = quizTemplateLibrarySchemaBase.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  usageCount: true,
});

export const materialTemplateLibrarySchema = baseTemplateSchema.extend({
  templateType: z.literal('material'),
  contentType: z.enum(['text', 'video', 'pdf', 'interactive', 'code']),
  content: z.string(),
  categoryId: z.number(),
  subcategoryId: z.number().optional(),
  difficultyLevel: z.number().min(1).max(5),
  topics: z.array(z.string()),
  prerequisites: z
    .object({
      quizIds: z.array(z.number()).optional(),
      lectureIds: z.array(z.number()).optional(),
    })
    .optional(),
  videoUrl: z.string().optional(),
  videoProvider: z.enum(['youtube', 'vimeo', 'upload']).optional(),
  videoDuration: z.number().optional(),
  pdfUrl: z.string().optional(),
  pdfPages: z.number().optional(),
  interactiveUrl: z.string().optional(),
  interactiveType: z.enum(['code', 'widget', 'quiz']).optional(),
  codeLanguage: z.string().optional(),
  codeContent: z.string().optional(),
  hasCodeHighlighting: z.boolean().optional(),
  thumbnailUrl: z.string().optional(),
  fileSize: z.number().optional(),
  accessibilityFeatures: z
    .object({
      hasTranscript: z.boolean().optional(),
      hasClosedCaptions: z.boolean().optional(),
      hasAudioDescription: z.boolean().optional(),
      altText: z.string().optional(),
    })
    .optional(),
});

export const insertMaterialTemplateLibrarySchema = materialTemplateLibrarySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  usageCount: true,
});

/**
 * TypeScript types derived from schemas
 */
export type InsertQuizTemplateLibrary = z.infer<typeof insertQuizTemplateLibrarySchema>;
export type InsertMaterialTemplateLibrary = z.infer<typeof insertMaterialTemplateLibrarySchema>;

/**
 * Template search filters
 */
export interface TemplateSearchFilters {
  templateType?: 'quiz' | 'material';
  visibility?: TemplateVisibility;
  categoryIds?: number[];
  tags?: string[];
  difficultyLevel?: number;
  searchQuery?: string;
  userId?: string; // Filter by creator
  sortBy?: 'recent' | 'popular' | 'title';
  limit?: number;
}

// ============================================================================
// Collaborative Editing - Presence and Session Management
// ============================================================================

/**
 * Editor presence information for collaborative editing
 * Stored in Firestore at: /presence/{documentType}/{documentId}/editors/{userId}
 */
export interface EditorPresence {
  userId: string;
  userName: string;
  userEmail?: string;
  profileImageUrl?: string;
  color: string; // Unique color for this editor's cursor/highlights
  lastSeen: Date;
  isActive: boolean;
  documentType: 'quiz' | 'quizTemplate' | 'lecture' | 'material';
  documentId: string;
  editingSection?: string; // Optional: which section they're editing (e.g., 'question-3', 'description')
  cursorPosition?: {
    fieldId: string;
    offset: number;
  };
}

/**
 * Zod schema for editor presence validation
 */
export const editorPresenceSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  userEmail: z.string().optional(),
  profileImageUrl: z.string().optional(),
  color: z.string(),
  lastSeen: z.date(),
  isActive: z.boolean(),
  documentType: z.enum(['quiz', 'quizTemplate', 'lecture', 'material']),
  documentId: z.string(),
  editingSection: z.string().optional(),
  cursorPosition: z
    .object({
      fieldId: z.string(),
      offset: z.number(),
    })
    .optional(),
});

export type InsertEditorPresence = z.infer<typeof editorPresenceSchema>;

/**
 * Edit session tracking for collaborative editing
 * Stored in Firestore at: /users/{userId}/editSessions/{sessionId}
 */
export interface EditSession {
  id: string;
  userId: string;
  documentType: 'quiz' | 'quizTemplate' | 'lecture' | 'material';
  documentId: string;
  startedAt: Date;
  lastActivityAt: Date;
  endedAt?: Date;
  isActive: boolean;
  editCount: number; // Number of edits made in this session
  conflictsResolved: number; // Number of conflicts resolved
}

/**
 * Zod schema for edit session validation
 */
export const editSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  documentType: z.enum(['quiz', 'quizTemplate', 'lecture', 'material']),
  documentId: z.string(),
  startedAt: z.date(),
  lastActivityAt: z.date(),
  endedAt: z.date().optional(),
  isActive: z.boolean(),
  editCount: z.number().default(0),
  conflictsResolved: z.number().default(0),
});

export type InsertEditSession = z.infer<typeof editSessionSchema>;

/**
 * Document lock for coordinating edits
 * Stored in Firestore at: /locks/{documentType}/{documentId}
 */
export interface DocumentLock {
  documentType: 'quiz' | 'quizTemplate' | 'lecture' | 'material';
  documentId: string;
  lockedBy?: string; // userId who holds the lock (null for optimistic locking)
  lockedAt?: Date;
  lockExpiry?: Date; // Auto-release lock after this time
  lockMode: 'optimistic' | 'pessimistic'; // Optimistic = last-write-wins with conflict detection
  version: number; // Document version number for optimistic locking
  lastModifiedBy: string;
  lastModifiedAt: Date;
}

/**
 * Zod schema for document lock validation
 */
export const documentLockSchema = z.object({
  documentType: z.enum(['quiz', 'quizTemplate', 'lecture', 'material']),
  documentId: z.string(),
  lockedBy: z.string().optional(),
  lockedAt: z.date().optional(),
  lockExpiry: z.date().optional(),
  lockMode: z.enum(['optimistic', 'pessimistic']),
  version: z.number(),
  lastModifiedBy: z.string(),
  lastModifiedAt: z.date(),
});

export type InsertDocumentLock = z.infer<typeof documentLockSchema>;

/**
 * Edit operation for conflict resolution
 * Tracks individual edit operations for operational transformation
 */
export interface EditOperation {
  id: string;
  sessionId: string;
  userId: string;
  documentType: 'quiz' | 'quizTemplate' | 'lecture' | 'material';
  documentId: string;
  timestamp: Date;
  operation: 'insert' | 'delete' | 'update' | 'replace';
  fieldPath: string; // JSONPath to the field being edited
  oldValue?: any;
  newValue?: any;
  position?: number; // For insert/delete operations in arrays or text
  length?: number; // For delete operations
  baseVersion: number; // Document version this edit is based on
  applied: boolean; // Whether this operation has been applied
  conflicted: boolean; // Whether this operation conflicts with another
  mergedInto?: string; // ID of the operation this was merged into
}

/**
 * Zod schema for edit operation validation
 */
export const editOperationSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  userId: z.string(),
  documentType: z.enum(['quiz', 'quizTemplate', 'lecture', 'material']),
  documentId: z.string(),
  timestamp: z.date(),
  operation: z.enum(['insert', 'delete', 'update', 'replace']),
  fieldPath: z.string(),
  oldValue: z.any().optional(),
  newValue: z.any().optional(),
  position: z.number().optional(),
  length: z.number().optional(),
  baseVersion: z.number(),
  applied: z.boolean(),
  conflicted: z.boolean(),
  mergedInto: z.string().optional(),
});

export type InsertEditOperation = z.infer<typeof editOperationSchema>;

/**
 * Conflict record for tracking and resolving edit conflicts
 * Stored in Firestore at: /conflicts/{conflictId}
 */
export interface EditConflict {
  id: string;
  documentType: 'quiz' | 'quizTemplate' | 'lecture' | 'material';
  documentId: string;
  detectedAt: Date;
  resolvedAt?: Date;
  status: 'detected' | 'resolving' | 'resolved' | 'abandoned';
  conflictingOperations: string[]; // IDs of conflicting EditOperations
  resolution?: {
    strategy: 'manual' | 'last-write-wins' | 'first-write-wins' | 'merge' | 'reject';
    resolvedBy: string; // userId who resolved the conflict
    selectedOperation?: string; // Operation ID that was chosen
    mergedResult?: any; // Result of merge if applicable
  };
  affectedUsers: string[]; // userIds of users whose edits are in conflict
}

/**
 * Zod schema for edit conflict validation
 */
export const editConflictSchema = z.object({
  id: z.string(),
  documentType: z.enum(['quiz', 'quizTemplate', 'lecture', 'material']),
  documentId: z.string(),
  detectedAt: z.date(),
  resolvedAt: z.date().optional(),
  status: z.enum(['detected', 'resolving', 'resolved', 'abandoned']),
  conflictingOperations: z.array(z.string()),
  resolution: z
    .object({
      strategy: z.enum(['manual', 'last-write-wins', 'first-write-wins', 'merge', 'reject']),
      resolvedBy: z.string(),
      selectedOperation: z.string().optional(),
      mergedResult: z.any().optional(),
    })
    .optional(),
  affectedUsers: z.array(z.string()),
});

export type InsertEditConflict = z.infer<typeof editConflictSchema>;
// Access Control & Permissions
// ============================================================================

/**
 * Visibility levels for quizzes, lectures, and other learning materials
 */
export type VisibilityLevel = 'private' | 'shared' | 'public';

/**
 * Zod schema for visibility level validation
 */
export const visibilityLevelSchema = z.enum(['private', 'shared', 'public']);

/**
 * Access control record for quizzes and learning materials
 * Stored in Firestore at: /accessControl/{resourceType}-{resourceId}
 */
export interface AccessControl {
  id: string; // Firestore document ID: "{resourceType}-{resourceId}"
  resourceType: 'quiz' | 'lecture' | 'template';
  resourceId: number;
  creatorId: string;
  visibility: VisibilityLevel;
  sharedWith?: {
    userIds?: string[];
    groupIds?: number[];
  };
  requiresPurchase?: boolean;
  purchaseProductId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Zod schema for access control validation
 */
export const accessControlSchema = z.object({
  id: z.string(),
  resourceType: z.enum(['quiz', 'lecture', 'template']),
  resourceId: z.number(),
  creatorId: z.string(),
  visibility: visibilityLevelSchema,
  sharedWith: z
    .object({
      userIds: z.array(z.string()).optional(),
      groupIds: z.array(z.number()).optional(),
    })
    .optional(),
  requiresPurchase: z.boolean().optional(),
  purchaseProductId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type InsertAccessControl = Omit<AccessControl, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Group for sharing content with multiple users
 * Stored in Firestore at: /groups/{groupId}
 * Members stored at: /groups/{groupId}/members/{userId}
 */
export interface Group {
  id: number;
  name: string;
  description: string;
  ownerId: string;
  tenantId: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Zod schema for group validation
 */
export const groupSchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000),
  ownerId: z.string(),
  tenantId: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertGroupSchema = groupSchema.omit({ id: true, createdAt: true, updatedAt: true });

export type InsertGroup = z.infer<typeof insertGroupSchema>;

/**
 * Group member record
 */
export interface GroupMember {
  id: string; // Firestore document ID
  groupId: number;
  userId: string;
  addedBy: string;
  joinedAt: Date;
}

/**
 * Zod schema for group member validation
 */
export const groupMemberSchema = z.object({
  id: z.string(),
  groupId: z.number(),
  userId: z.string(),
  addedBy: z.string(),
  joinedAt: z.date(),
});

export const insertGroupMemberSchema = groupMemberSchema.omit({ id: true, joinedAt: true });

export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;

/**
 * Access check result
 */
export interface AccessCheckResult {
  allowed: boolean;
  reason?:
    | 'purchase_required'
    | 'private_content'
    | 'not_shared_with_you'
    | 'access_denied'
    | 'not_available_yet'
    | 'availability_expired'
    | 'prerequisites_not_met'
    | 'not_enrolled'
    | 'enrollment_closed'
    | 'not_assigned';
  productId?: string;
  missingPrerequisites?: { quizIds?: number[]; lectureIds?: number[] };
  availableFrom?: Date;
  availableUntil?: Date;
}

// ============================================================================
// Certificate System
// ============================================================================

/**
 * Logical certificate model for completion certificates.
 *
 * Storage Architecture:
 * - Firestore: Documents stored at /users/{userId}/certificates/{certificateId}
 * - This pgTable definition provides TypeScript types and schema documentation
 * - The table structure is NOT used to generate Firestore collections
 * - Drizzle/PostgreSQL syntax is used for type-safety and developer familiarity
 *
 * Note: The .unique() constraint on verificationId is a logical constraint only.
 * Firestore does not enforce uniqueness - application code must ensure UUID uniqueness.
 */
export const certificates = pgTable('certificates', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull(),
  tenantId: integer('tenant_id').notNull().default(1),
  userName: text('user_name').notNull(),
  resourceType: text('resource_type').notNull(), // 'quiz' | 'course' | 'practiceTest'
  resourceId: integer('resource_id').notNull(),
  resourceTitle: text('resource_title').notNull(),
  score: integer('score').notNull(), // Percentage score
  completedAt: timestamp('completed_at').notNull(),
  verificationId: text('verification_id').notNull().unique(), // UUID for verification
  templateId: integer('template_id'), // Optional: custom template
  issuedBy: text('issued_by').notNull().default('CertLab'),
  organizationName: text('organization_name'),
  logoUrl: text('logo_url'), // Custom logo URL
  signatureUrl: text('signature_url'), // Custom signature image URL
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Certificate template table for customizable certificate designs
 * Stored in Firestore at: /certificateTemplates/{templateId}
 */
export const certificateTemplates = pgTable('certificate_templates', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().default(1),
  name: text('name').notNull(),
  description: text('description'),
  borderStyle: text('border_style').default('double'), // 'solid' | 'double' | 'dashed' | 'none'
  borderColor: text('border_color').default('#0066cc'),
  backgroundColor: text('background_color').default('#ffffff'),
  textColor: text('text_color').default('#333333'),
  accentColor: text('accent_color').default('#0066cc'),
  fontFamily: text('font_family').default('Georgia'),
  logoUrl: text('logo_url'),
  signatureUrl: text('signature_url'),
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').default(true),
  createdBy: varchar('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Insert schemas for certificates
 */
export const insertCertificateSchema = createInsertSchema(certificates)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    userName: z.string().min(1).max(200),
    resourceType: z.enum(['quiz', 'course', 'practiceTest']),
    resourceTitle: z.string().min(1).max(500),
    score: z.number().int().min(0).max(100),
    verificationId: z.string().uuid(),
    issuedBy: z.string().max(200).default('CertLab'),
    organizationName: z.string().max(200).optional().nullable(),
    logoUrl: z.string().url().max(1000).optional().nullable(),
    signatureUrl: z.string().url().max(1000).optional().nullable(),
  });

export const insertCertificateTemplateSchema = createInsertSchema(certificateTemplates)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional().nullable(),
    borderStyle: z.enum(['solid', 'double', 'dashed', 'none']).default('double'),
    borderColor: z.string().max(20).default('#0066cc'),
    backgroundColor: z.string().max(20).default('#ffffff'),
    textColor: z.string().max(20).default('#333333'),
    accentColor: z.string().max(20).default('#0066cc'),
    fontFamily: z.string().max(100).default('Georgia'),
    logoUrl: z.string().url().max(1000).optional().nullable(),
    signatureUrl: z.string().url().max(1000).optional().nullable(),
  });

/**
 * Types for certificates
 */
export type InsertCertificate = z.infer<typeof insertCertificateSchema>;
export type Certificate = typeof certificates.$inferSelect;
export type InsertCertificateTemplate = z.infer<typeof insertCertificateTemplateSchema>;
export type CertificateTemplate = typeof certificateTemplates.$inferSelect;
// Enhanced Distribution Methods
// ============================================================================

/**
 * Distribution method for quizzes and materials
 */
export type DistributionMethod = 'open' | 'self_enroll' | 'instructor_assign';

/**
 * Zod schema for distribution method validation
 */
export const distributionMethodSchema = z.enum(['open', 'self_enroll', 'instructor_assign']);

/**
 * Enrollment status for self-enrollment
 */
export type EnrollmentStatus = 'enrolled' | 'completed' | 'withdrawn';

/**
 * Zod schema for enrollment status validation
 */
export const enrollmentStatusSchema = z.enum(['enrolled', 'completed', 'withdrawn']);

/**
 * Assignment status for instructor assignments
 */
export type AssignmentStatus = 'assigned' | 'in_progress' | 'completed' | 'overdue';

/**
 * Zod schema for assignment status validation
 */
export const assignmentStatusSchema = z.enum(['assigned', 'in_progress', 'completed', 'overdue']);

/**
 * Distribution settings for quizzes and materials
 * Stored inline with quiz/lecture or in a separate collection
 */
export interface DistributionSettings {
  method: DistributionMethod;

  // Time-based availability windows
  availableFrom?: Date; // When content becomes available
  availableUntil?: Date; // When content expires/becomes unavailable
  enrollmentDeadline?: Date; // Last date for self-enrollment

  // Self-enrollment settings
  selfEnrollEnabled?: boolean;
  maxEnrollments?: number; // Max number of users who can enroll (null = unlimited)
  requireApproval?: boolean; // Whether instructor approval is required

  // Assignment settings
  assignmentDueDate?: Date; // Due date for assigned content
  sendNotifications?: boolean; // Whether to send assignment notifications
  reminderDays?: number[]; // Days before due date to send reminders (e.g., [7, 3, 1])

  // Prerequisites
  requirePrerequisites?: boolean; // Whether prerequisites must be met
  prerequisites?: {
    quizIds?: number[];
    lectureIds?: number[];
    minimumScores?: Record<number, number>; // quizId/lectureId -> minimum score required
  };
}

/**
 * Zod schema for distribution settings validation
 */
export const distributionSettingsSchema = z
  .object({
    method: distributionMethodSchema,
    availableFrom: z.date().optional(),
    availableUntil: z.date().optional(),
    enrollmentDeadline: z.date().optional(),
    selfEnrollEnabled: z.boolean().optional(),
    maxEnrollments: z.number().int().positive().optional(),
    requireApproval: z.boolean().optional(),
    assignmentDueDate: z.date().optional(),
    sendNotifications: z.boolean().optional(),
    reminderDays: z.array(z.number().int().positive()).optional(),
    requirePrerequisites: z.boolean().optional(),
    prerequisites: z
      .object({
        quizIds: z.array(z.number()).optional(),
        lectureIds: z.array(z.number()).optional(),
        minimumScores: z.record(z.string(), z.number()).optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    // Validate date logic
    if (data.availableFrom && data.availableUntil) {
      if (data.availableFrom >= data.availableUntil) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'availableFrom must be before availableUntil',
          path: ['availableFrom'],
        });
      }
    }

    if (data.enrollmentDeadline && data.availableUntil) {
      if (data.enrollmentDeadline > data.availableUntil) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'enrollmentDeadline must be before or equal to availableUntil',
          path: ['enrollmentDeadline'],
        });
      }
    }
  });

/**
 * Enrollment record for self-enrollment
 * Stored in Firestore at: /enrollments/{enrollmentId}
 */
export interface Enrollment {
  id: string;
  resourceType: 'quiz' | 'lecture' | 'template';
  resourceId: number;
  userId: string;
  tenantId: number;
  status: EnrollmentStatus;
  enrolledAt: Date;
  completedAt?: Date;
  withdrawnAt?: Date;
  requiresApproval: boolean;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  progress?: number; // 0-100 percentage for lectures, score for quizzes
  lastAccessedAt?: Date;
}

/**
 * Zod schema for enrollment validation
 */
export const enrollmentSchema = z.object({
  id: z.string(),
  resourceType: z.enum(['quiz', 'lecture', 'template']),
  resourceId: z.number(),
  userId: z.string(),
  tenantId: z.number(),
  status: enrollmentStatusSchema,
  enrolledAt: z.date(),
  completedAt: z.date().optional(),
  withdrawnAt: z.date().optional(),
  requiresApproval: z.boolean(),
  isApproved: z.boolean(),
  approvedBy: z.string().optional(),
  approvedAt: z.date().optional(),
  progress: z.number().min(0).max(100).optional(),
  lastAccessedAt: z.date().optional(),
});

export const insertEnrollmentSchema = enrollmentSchema.omit({ id: true, enrolledAt: true });
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;

/**
 * Assignment record for instructor-assigned content
 * Stored in Firestore at: /assignments/{assignmentId}
 */
export interface Assignment {
  id: string;
  resourceType: 'quiz' | 'lecture' | 'template';
  resourceId: number;
  userId: string; // User assigned to
  assignedBy: string; // Instructor/admin who assigned
  tenantId: number;
  status: AssignmentStatus;
  assignedAt: Date;
  dueDate?: Date;
  startedAt?: Date;
  completedAt?: Date;
  score?: number; // For quizzes
  progress?: number; // 0-100 percentage for lectures
  lastAccessedAt?: Date;
  notificationSent: boolean;
  remindersSent: number[]; // Days before due date when reminders were sent
  notes?: string; // Instructor notes for the assignment
}

/**
 * Zod schema for assignment validation
 */
export const assignmentSchema = z.object({
  id: z.string(),
  resourceType: z.enum(['quiz', 'lecture', 'template']),
  resourceId: z.number(),
  userId: z.string(),
  assignedBy: z.string(),
  tenantId: z.number(),
  status: assignmentStatusSchema,
  assignedAt: z.date(),
  dueDate: z.date().optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  score: z.number().optional(),
  progress: z.number().min(0).max(100).optional(),
  lastAccessedAt: z.date().optional(),
  notificationSent: z.boolean(),
  remindersSent: z.array(z.number().int().positive()),
  notes: z.string().max(2000).optional(),
});

export const insertAssignmentSchema = assignmentSchema.omit({ id: true, assignedAt: true });
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;

/**
 * Prerequisite check result
 */
export interface PrerequisiteCheckResult {
  met: boolean;
  missingQuizzes?: Array<{
    id: number;
    title: string;
    requiredScore?: number;
    currentScore?: number;
  }>;
  missingLectures?: Array<{
    id: number;
    title: string;
    isRead: boolean;
  }>;
}

// ============================================================================
// Notification System
// ============================================================================

/**
 * Notification types for different system events
 */
export const notificationTypeSchema = z.enum([
  'assignment', // User is assigned a quiz or course
  'completion', // User completes a quiz or course
  'results', // Quiz grading complete with score/feedback
  'reminder', // Upcoming deadline or pending assignment
  'achievement', // Achievement unlocked or milestone reached
]);

export type NotificationType = z.infer<typeof notificationTypeSchema>;

/**
 * Notification data stored in Firestore
 * Collection: /users/{userId}/notifications/{notificationId}
 */
export interface Notification {
  id: string;
  userId: string;
  tenantId: number;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string; // Link to relevant page
  actionLabel?: string; // e.g., 'View Quiz', 'See Results'
  metadata?: {
    quizId?: number;
    courseId?: number;
    score?: number;
    badgeId?: number;
    [key: string]: any;
  };
  isRead: boolean;
  isDismissed: boolean;
  createdAt: Date;
  readAt?: Date;
  expiresAt?: Date; // Optional expiration
}

/**
 * Zod schema for notification validation
 */
export const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tenantId: z.number(),
  type: notificationTypeSchema,
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  actionUrl: z.string().optional(),
  actionLabel: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  isRead: z.boolean(),
  isDismissed: z.boolean(),
  createdAt: z.date(),
  readAt: z.date().optional(),
  expiresAt: z.date().optional(),
});

export const insertNotificationSchema = notificationSchema.omit({
  id: true,
  createdAt: true,
  isRead: true,
  isDismissed: true,
  readAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;

/**
 * User notification preferences
 * Collection: /users/{userId}/notificationPreferences (single document)
 */
export interface NotificationPreferences {
  userId: string;
  assignments: boolean;
  completions: boolean;
  results: boolean;
  reminders: boolean;
  achievements: boolean;
  emailEnabled: boolean; // Disabled by default
  smsEnabled: boolean; // Disabled by default
  updatedAt: Date;
}

/**
 * Zod schema for notification preferences validation
 */
export const notificationPreferencesSchema = z.object({
  userId: z.string(),
  assignments: z.boolean().default(true),
  completions: z.boolean().default(true),
  results: z.boolean().default(true),
  reminders: z.boolean().default(true),
  achievements: z.boolean().default(true),
  emailEnabled: z.boolean().default(false),
  smsEnabled: z.boolean().default(false),
  updatedAt: z.date(),
});

export const insertNotificationPreferencesSchema = notificationPreferencesSchema.omit({
  updatedAt: true,
});

export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;

// ============================================================================
// Leaderboard System
// ============================================================================

/**
 * Leaderboard entry for ranking users by various metrics
 * Stored in Firestore at: /leaderboards/{leaderboardType}/{userId}
 *
 * Leaderboard types:
 * - global: Overall ranking across all activities
 * - category-{categoryId}: Ranking within a specific category
 * - weekly: Weekly ranking (resets each week)
 * - monthly: Monthly ranking (resets each month)
 */
export interface LeaderboardEntry {
  userId: string;
  userName: string;
  userAvatar?: string;
  score: number; // Total points
  rank: number; // Current rank in the leaderboard
  quizzesCompleted: number;
  perfectScores: number;
  averageScore: number; // Average quiz score percentage
  currentStreak: number;
  totalBadges: number;
  level: number;
  categoryId?: number; // For category-specific leaderboards
  period?: 'weekly' | 'monthly' | 'all-time'; // Time period for this entry
  lastUpdated: Date;
  tenantId: number;
}

/**
 * Zod schema for leaderboard entry validation
 */
export const leaderboardEntrySchema = z.object({
  userId: z.string(),
  userName: z.string(),
  userAvatar: z.string().optional(),
  score: z.number().default(0),
  rank: z.number().default(0),
  quizzesCompleted: z.number().default(0),
  perfectScores: z.number().default(0),
  averageScore: z.number().default(0),
  currentStreak: z.number().default(0),
  totalBadges: z.number().default(0),
  level: z.number().default(1),
  categoryId: z.number().optional(),
  period: z.enum(['weekly', 'monthly', 'all-time']).optional(),
  lastUpdated: z.date(),
  tenantId: z.number(),
});

export type InsertLeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;
