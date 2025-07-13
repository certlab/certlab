import { 
  users, categories, subcategories, questions, quizzes, userProgress,
  type User, type InsertUser, type Category, type InsertCategory,
  type Subcategory, type InsertSubcategory, type Question, type InsertQuestion,
  type Quiz, type InsertQuiz, type UserProgress, type InsertUserProgress
} from "@shared/schema";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Categories and subcategories
  getCategories(): Promise<Category[]>;
  getSubcategories(categoryId?: number): Promise<Subcategory[]>;
  
  // Questions
  getQuestionsByCategories(categoryIds: number[], subcategoryIds?: number[]): Promise<Question[]>;
  getQuestion(id: number): Promise<Question | undefined>;
  
  // Quizzes
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;
  getQuiz(id: number): Promise<Quiz | undefined>;
  getUserQuizzes(userId: number): Promise<Quiz[]>;
  updateQuiz(id: number, updates: Partial<Quiz>): Promise<Quiz>;
  
  // User progress
  getUserProgress(userId: number): Promise<UserProgress[]>;
  updateUserProgress(userId: number, categoryId: number, progress: Partial<InsertUserProgress>): Promise<UserProgress>;
  getUserStats(userId: number): Promise<{
    totalQuizzes: number;
    averageScore: number;
    studyStreak: number;
    certifications: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private categories: Map<number, Category> = new Map();
  private subcategories: Map<number, Subcategory> = new Map();
  private questions: Map<number, Question> = new Map();
  private quizzes: Map<number, Quiz> = new Map();
  private userProgress: Map<string, UserProgress> = new Map(); // key: `${userId}-${categoryId}`
  
  private currentUserId = 1;
  private currentCategoryId = 1;
  private currentSubcategoryId = 1;
  private currentQuestionId = 1;
  private currentQuizId = 1;
  private currentProgressId = 1;

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Seed categories
    const cats = [
      { name: "CISSP", description: "Certified Information Systems Security Professional", icon: "fas fa-shield-alt" },
      { name: "Security+", description: "CompTIA Security+ Certification", icon: "fas fa-lock" },
      { name: "CEH", description: "Certified Ethical Hacker", icon: "fas fa-user-secret" },
      { name: "CISM", description: "Certified Information Security Manager", icon: "fas fa-cogs" },
    ];
    
    cats.forEach(cat => {
      const category: Category = { id: this.currentCategoryId++, ...cat };
      this.categories.set(category.id, category);
    });

    // Seed subcategories for CISSP
    const cisspsubs = [
      { categoryId: 1, name: "Asset Security", description: "Information and asset classification" },
      { categoryId: 1, name: "Security Architecture", description: "Security models and architecture" },
      { categoryId: 1, name: "Communication Security", description: "Network and communication security" },
      { categoryId: 1, name: "Identity & Access Management", description: "IAM principles and practices" },
      { categoryId: 1, name: "Security Testing", description: "Assessment and testing" },
    ];

    cisspsubs.forEach(sub => {
      const subcategory: Subcategory = { id: this.currentSubcategoryId++, ...sub };
      this.subcategories.set(subcategory.id, subcategory);
    });

    // Seed some questions for CISSP Asset Security
    const assetSecurityQuestions = [
      {
        categoryId: 1,
        subcategoryId: 1,
        text: "Which of the following is the PRIMARY purpose of implementing data classification in an organization?",
        options: [
          { text: "To ensure compliance with legal and regulatory requirements", id: 0 },
          { text: "To determine appropriate security controls and handling procedures", id: 1 },
          { text: "To reduce storage costs by identifying redundant data", id: 2 },
          { text: "To improve data processing performance", id: 3 }
        ],
        correctAnswer: 1,
        explanation: "The primary purpose of data classification is to determine appropriate security controls and handling procedures based on the sensitivity and value of the data."
      },
      {
        categoryId: 1,
        subcategoryId: 1,
        text: "What is the MOST important consideration when establishing data retention policies?",
        options: [
          { text: "Storage capacity limitations", id: 0 },
          { text: "Legal and regulatory requirements", id: 1 },
          { text: "Employee convenience", id: 2 },
          { text: "Technology refresh cycles", id: 3 }
        ],
        correctAnswer: 1,
        explanation: "Legal and regulatory requirements are the most important consideration when establishing data retention policies as they define mandatory retention periods."
      }
    ];

    assetSecurityQuestions.forEach(q => {
      const question: Question = { id: this.currentQuestionId++, ...q };
      this.questions.set(question.id, question);
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async getSubcategories(categoryId?: number): Promise<Subcategory[]> {
    const subs = Array.from(this.subcategories.values());
    return categoryId ? subs.filter(sub => sub.categoryId === categoryId) : subs;
  }

  async getQuestionsByCategories(categoryIds: number[], subcategoryIds?: number[]): Promise<Question[]> {
    const allQuestions = Array.from(this.questions.values());
    let filtered = allQuestions.filter(q => categoryIds.includes(q.categoryId));
    
    if (subcategoryIds && subcategoryIds.length > 0) {
      filtered = filtered.filter(q => subcategoryIds.includes(q.subcategoryId));
    }
    
    return filtered;
  }

  async getQuestion(id: number): Promise<Question | undefined> {
    return this.questions.get(id);
  }

  async createQuiz(insertQuiz: InsertQuiz): Promise<Quiz> {
    const id = this.currentQuizId++;
    const quiz: Quiz = {
      ...insertQuiz,
      id,
      startedAt: new Date(),
      completedAt: null,
      score: null,
      correctAnswers: null,
      totalQuestions: insertQuiz.questionCount,
      answers: null,
      timeLimit: insertQuiz.timeLimit || null
    };
    this.quizzes.set(id, quiz);
    return quiz;
  }

  async getQuiz(id: number): Promise<Quiz | undefined> {
    return this.quizzes.get(id);
  }

  async getUserQuizzes(userId: number): Promise<Quiz[]> {
    return Array.from(this.quizzes.values()).filter(quiz => quiz.userId === userId);
  }

  async updateQuiz(id: number, updates: Partial<Quiz>): Promise<Quiz> {
    const quiz = this.quizzes.get(id);
    if (!quiz) throw new Error("Quiz not found");
    
    const updatedQuiz = { ...quiz, ...updates };
    this.quizzes.set(id, updatedQuiz);
    return updatedQuiz;
  }

  async getUserProgress(userId: number): Promise<UserProgress[]> {
    return Array.from(this.userProgress.values()).filter(progress => progress.userId === userId);
  }

  async updateUserProgress(userId: number, categoryId: number, progressData: Partial<InsertUserProgress>): Promise<UserProgress> {
    const key = `${userId}-${categoryId}`;
    const existing = this.userProgress.get(key);
    
    if (existing) {
      const updated = { ...existing, ...progressData };
      this.userProgress.set(key, updated);
      return updated;
    } else {
      const newProgress: UserProgress = {
        id: this.currentProgressId++,
        userId,
        categoryId,
        questionsCompleted: 0,
        totalQuestions: 0,
        averageScore: 0,
        lastQuizDate: null,
        ...progressData
      };
      this.userProgress.set(key, newProgress);
      return newProgress;
    }
  }

  async getUserStats(userId: number): Promise<{
    totalQuizzes: number;
    averageScore: number;
    studyStreak: number;
    certifications: number;
  }> {
    const userQuizzes = await this.getUserQuizzes(userId);
    const completedQuizzes = userQuizzes.filter(quiz => quiz.completedAt);
    
    const totalQuizzes = completedQuizzes.length;
    const averageScore = totalQuizzes > 0 
      ? Math.round(completedQuizzes.reduce((sum, quiz) => sum + (quiz.score || 0), 0) / totalQuizzes)
      : 0;
    
    // Simple streak calculation - consecutive days with quizzes
    const studyStreak = this.calculateStudyStreak(completedQuizzes);
    
    // Count certifications (categories with >80% average score)
    const progress = await this.getUserProgress(userId);
    const certifications = progress.filter(p => p.averageScore > 80).length;
    
    return {
      totalQuizzes,
      averageScore,
      studyStreak,
      certifications
    };
  }

  private calculateStudyStreak(quizzes: Quiz[]): number {
    if (quizzes.length === 0) return 0;
    
    const dates = quizzes
      .map(quiz => quiz.completedAt)
      .filter(date => date !== null)
      .map(date => new Date(date!).toDateString())
      .sort();
    
    const uniqueDates = Array.from(new Set(dates));
    if (uniqueDates.length === 0) return 0;
    
    let streak = 1;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    // Check if streak is current
    if (uniqueDates[uniqueDates.length - 1] !== today && uniqueDates[uniqueDates.length - 1] !== yesterday) {
      return 0;
    }
    
    for (let i = uniqueDates.length - 2; i >= 0; i--) {
      const current = new Date(uniqueDates[i + 1]);
      const previous = new Date(uniqueDates[i]);
      const diffTime = current.getTime() - previous.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }
}

export const storage = new MemStorage();
