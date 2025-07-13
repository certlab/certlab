import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  loginSchema, 
  createQuizSchema, 
  submitAnswerSchema 
} from "@shared/schema";
import bcrypt from "bcrypt";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // User registration
  app.post("/api/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      // Don't return password
      const { password, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  // User login
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Don't return password
      const { password: _, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      res.status(400).json({ message: "Invalid login data" });
    }
  });

  // Get user profile
  app.get("/api/user/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      res.status(400).json({ message: "Invalid user ID" });
    }
  });

  // Get user stats
  app.get("/api/user/:id/stats", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(400).json({ message: "Failed to get user stats" });
    }
  });

  // Get categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to get categories" });
    }
  });

  // Get subcategories
  app.get("/api/subcategories", async (req, res) => {
    try {
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const subcategories = await storage.getSubcategories(categoryId);
      res.json(subcategories);
    } catch (error) {
      res.status(500).json({ message: "Failed to get subcategories" });
    }
  });

  // Create quiz
  app.post("/api/quiz", async (req, res) => {
    try {
      const quizData = createQuizSchema.parse(req.body);
      const userId = parseInt(req.body.userId);
      
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }
      
      const quiz = await storage.createQuiz({
        ...quizData,
        userId,
        subcategoryIds: quizData.subcategoryIds || []
      });
      
      res.json(quiz);
    } catch (error) {
      res.status(400).json({ message: "Invalid quiz data" });
    }
  });

  // Get quiz
  app.get("/api/quiz/:id", async (req, res) => {
    try {
      const quizId = parseInt(req.params.id);
      const quiz = await storage.getQuiz(quizId);
      
      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }
      
      res.json(quiz);
    } catch (error) {
      res.status(400).json({ message: "Invalid quiz ID" });
    }
  });

  // Get quiz questions
  app.get("/api/quiz/:id/questions", async (req, res) => {
    try {
      const quizId = parseInt(req.params.id);
      const quiz = await storage.getQuiz(quizId);
      
      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }
      
      const questions = await storage.getQuestionsByCategories(
        quiz.categoryIds as number[],
        quiz.subcategoryIds as number[]
      );
      
      // Randomize and limit questions
      const shuffled = questions.sort(() => 0.5 - Math.random());
      const selectedQuestions = shuffled.slice(0, quiz.questionCount);
      
      res.json(selectedQuestions);
    } catch (error) {
      res.status(400).json({ message: "Failed to get quiz questions" });
    }
  });

  // Submit quiz answers
  app.post("/api/quiz/:id/submit", async (req, res) => {
    try {
      const quizId = parseInt(req.params.id);
      const { answers } = req.body;
      
      const quiz = await storage.getQuiz(quizId);
      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }
      
      // Get questions to calculate score
      const questions = await storage.getQuestionsByCategories(
        quiz.categoryIds as number[],
        quiz.subcategoryIds as number[]
      );
      
      let correctAnswers = 0;
      const results = answers.map((answer: any) => {
        const question = questions.find(q => q.id === answer.questionId);
        const isCorrect = question && question.correctAnswer === answer.answer;
        if (isCorrect) correctAnswers++;
        return {
          questionId: answer.questionId,
          answer: answer.answer,
          correct: isCorrect,
          correctAnswer: question?.correctAnswer,
          explanation: question?.explanation
        };
      });
      
      const score = Math.round((correctAnswers / quiz.questionCount) * 100);
      
      // Update quiz
      const updatedQuiz = await storage.updateQuiz(quizId, {
        answers: answers,
        score,
        correctAnswers,
        completedAt: new Date()
      });
      
      // Update user progress for each category
      for (const categoryId of quiz.categoryIds as number[]) {
        const categoryQuestions = questions.filter(q => q.categoryId === categoryId);
        const categoryCorrect = results.filter((r: any) => {
          const question = questions.find(q => q.id === r.questionId);
          return question?.categoryId === categoryId && r.correct;
        }).length;
        const categoryScore = categoryQuestions.length > 0 
          ? Math.round((categoryCorrect / categoryQuestions.length) * 100)
          : 0;
        
        await storage.updateUserProgress(quiz.userId, categoryId, {
          questionsCompleted: categoryQuestions.length,
          totalQuestions: categoryQuestions.length,
          averageScore: categoryScore,
          lastQuizDate: new Date()
        });
      }
      
      res.json({
        quiz: updatedQuiz,
        results,
        score,
        correctAnswers,
        totalQuestions: quiz.questionCount
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to submit quiz" });
    }
  });

  // Get user quizzes
  app.get("/api/user/:id/quizzes", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const quizzes = await storage.getUserQuizzes(userId);
      res.json(quizzes);
    } catch (error) {
      res.status(400).json({ message: "Failed to get user quizzes" });
    }
  });

  // Get user progress
  app.get("/api/user/:id/progress", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const progress = await storage.getUserProgress(userId);
      res.json(progress);
    } catch (error) {
      res.status(400).json({ message: "Failed to get user progress" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
