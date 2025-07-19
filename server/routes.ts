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

  // User logout
  app.post("/api/logout", async (req, res) => {
    res.json({ message: "Logged out successfully" });
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

  // Create quiz with adaptive learning
  app.post("/api/quiz", async (req, res) => {
    try {
      const quizData = createQuizSchema.parse(req.body);
      const userId = parseInt(req.body.userId);
      const isAdaptive = req.body.isAdaptive || false;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }
      
      // Calculate adaptive question count if adaptive learning is enabled
      let adaptiveQuestionCount = quizData.questionCount;
      if (isAdaptive && quizData.categoryIds) {
        adaptiveQuestionCount = await storage.getAdaptiveQuestionCount(userId, quizData.questionCount, quizData.categoryIds);
      }
      
      const quiz = await storage.createQuiz({
        ...quizData,
        userId,
        questionCount: adaptiveQuestionCount,
        subcategoryIds: quizData.subcategoryIds || [],
        isAdaptive,
        difficultyLevel: 1
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
      
      // Update quiz with total questions count
      const updatedQuiz = await storage.updateQuiz(quizId, {
        answers: answers,
        score,
        correctAnswers,
        totalQuestions: quiz.questionCount,
        completedAt: new Date()
      });
      
      // Determine pass/fail status (85% threshold)
      const isPassing = score >= 85;
      
      // Update quiz with pass/fail status
      await storage.updateQuiz(quizId, { 
        isPassing,
        missedTopics: isPassing ? [] : results
          .filter((r: any) => !r.correct)
          .map((r: any) => {
            const question = questions.find(q => q.id === r.questionId);
            return question?.tags || ['General'];
          })
          .flat()
      });

      // Update user progress for each category and adaptive learning metrics
      for (const categoryId of quiz.categoryIds as number[]) {
        const categoryQuestions = questions.filter(q => q.categoryId === categoryId);
        const categoryResults = results.filter((r: any) => {
          const question = questions.find(q => q.id === r.questionId);
          return question?.categoryId === categoryId;
        });
        const categoryCorrect = categoryResults.filter(r => r.correct).length;
        const categoryScore = categoryQuestions.length > 0 
          ? Math.round((categoryCorrect / categoryQuestions.length) * 100)
          : 0;
        
        await storage.updateUserProgress(quiz.userId, categoryId, {
          questionsCompleted: categoryQuestions.length,
          totalQuestions: categoryQuestions.length,
          averageScore: categoryScore,
          lastQuizDate: new Date()
        });

        // Update adaptive learning metrics
        if (quiz.isAdaptive) {
          await storage.updateAdaptiveProgress(quiz.userId, categoryId, categoryResults);
        }
      }

      // Generate lecture for failed quiz (below 85%)
      if (!isPassing) {
        const missedTopics = results
          .filter((r: any) => !r.correct)
          .map((r: any) => {
            const question = questions.find(q => q.id === r.questionId);
            return question?.explanation?.split('.')[0] || 'Review Required';
          })
          .filter((topic, index, array) => array.indexOf(topic) === index); // Remove duplicates

        if (missedTopics.length > 0) {
          await storage.createLecture(quiz.userId, quizId, missedTopics);
        }
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

  // Create adaptive quiz - enhanced version of regular quiz
  app.post("/api/quiz/adaptive", async (req, res) => {
    try {
      const { title, categoryIds, subcategoryIds, questionCount, timeLimit, userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      // Always calculate adaptive question count for this endpoint
      const adaptiveQuestionCount = await storage.getAdaptiveQuestionCount(userId, questionCount, categoryIds);
      
      const quiz = await storage.createQuiz({
        title: title || "Adaptive Learning Quiz",
        categoryIds,
        subcategoryIds: subcategoryIds || [],
        questionCount: adaptiveQuestionCount,
        timeLimit,
        userId,
        isAdaptive: true,
        difficultyLevel: 1
      });
      
      res.json({
        ...quiz,
        adaptiveInfo: {
          originalQuestionCount: questionCount,
          adaptedQuestionCount: adaptiveQuestionCount,
          increasePercentage: Math.round(((adaptiveQuestionCount - questionCount) / questionCount) * 100)
        }
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to create adaptive quiz" });
    }
  });

  // Get user lectures
  app.get("/api/user/:id/lectures", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const lectures = await storage.getUserLectures(userId);
      res.json(lectures);
    } catch (error) {
      res.status(400).json({ message: "Failed to get user lectures" });
    }
  });

  // Get specific lecture (shareable link)
  app.get("/api/lecture/:id", async (req, res) => {
    try {
      const lectureId = parseInt(req.params.id);
      const lecture = await storage.getLecture(lectureId);
      
      if (!lecture) {
        return res.status(404).json({ message: "Lecture not found" });
      }
      
      res.json(lecture);
    } catch (error) {
      res.status(400).json({ message: "Failed to get lecture" });
    }
  });

  // Generate personalized lecture based on user performance
  app.post("/api/user/:userId/generate-lecture", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Analyze user performance to identify weak areas
      const userQuizzes = await storage.getUserQuizzes(userId);
      const completedQuizzes = userQuizzes.filter(quiz => quiz.completedAt && quiz.answers);
      
      if (completedQuizzes.length === 0) {
        return res.status(400).json({ 
          message: "No completed quizzes found. Take some learning sessions first to generate personalized study guides." 
        });
      }

      // Generate performance-based lecture
      const lecture = await storage.generatePerformanceLecture(userId);
      res.json(lecture);
    } catch (error) {
      console.error("Error generating performance lecture:", error);
      res.status(500).json({ message: "Failed to generate personalized study guide" });
    }
  });

  // Create quiz with difficulty filtering
  app.post("/api/quiz/filtered", async (req, res) => {
    try {
      const { title, categoryIds, subcategoryIds, questionCount, timeLimit, userId, difficultyLevels } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      // Get questions with difficulty filter
      const filteredQuestions = await storage.getQuestionsByCategories(
        categoryIds, 
        subcategoryIds, 
        difficultyLevels
      );

      if (filteredQuestions.length < questionCount) {
        return res.status(400).json({ 
          message: `Only ${filteredQuestions.length} questions available for selected difficulty levels` 
        });
      }

      const quiz = await storage.createQuiz({
        title: title || "Filtered Difficulty Quiz",
        categoryIds,
        subcategoryIds: subcategoryIds || [],
        questionCount,
        timeLimit,
        userId,
        isAdaptive: false,
        difficultyFilter: difficultyLevels,
        difficultyLevel: Math.max(...(difficultyLevels || [1]))
      });
      
      res.json(quiz);
    } catch (error) {
      res.status(400).json({ message: "Failed to create filtered quiz" });
    }
  });

  // Achievement system endpoints
  app.get('/api/user/:userId/achievements', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Initialize game stats if they don't exist
      await storage.initializeUserGameStats(userId);
      
      // Check for new achievements
      const newBadges = await storage.checkAndAwardAchievements(userId);
      
      // Get all user badges with badge details
      const userBadges = await storage.getUserBadges(userId);
      const allBadges = await storage.getAllBadges();
      
      // Combine badge data with user progress
      const badgeData = userBadges.map(userBadge => {
        const badge = allBadges.find(b => b.id === userBadge.badgeId);
        return {
          ...userBadge,
          badge: badge
        };
      });
      
      // Get game stats
      const gameStats = await storage.getUserGameStats(userId);
      
      res.json({
        badges: badgeData,
        gameStats,
        newBadges: newBadges.length
      });
    } catch (error) {
      console.error('Error fetching user achievements:', error);
      res.status(500).json({ error: 'Failed to fetch achievements' });
    }
  });

  app.get('/api/badges', async (req: Request, res: Response) => {
    try {
      const badges = await storage.getAllBadges();
      res.json(badges);
    } catch (error) {
      console.error('Error fetching badges:', error);
      res.status(500).json({ error: 'Failed to fetch badges' });
    }
  });

  app.post('/api/user/:userId/achievements/check', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const newBadges = await storage.checkAndAwardAchievements(userId);
      
      res.json({
        newBadges: newBadges.length,
        badges: newBadges
      });
    } catch (error) {
      console.error('Error checking achievements:', error);
      res.status(500).json({ error: 'Failed to check achievements' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
