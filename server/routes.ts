import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import adminRoutes from "./admin-routes";
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
      
      // Initialize user game stats and other data
      await storage.initializeUserGameStats(user.id);
      
      // Store user in session
      (req as any).session.userId = user.id;
      
      // Don't return password
      const { password, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      console.error('Registration error:', error);
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
      
      // Store user in session
      (req as any).session.userId = user.id;
      
      // Save session explicitly
      (req as any).session.save((err: any) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ message: "Session error" });
        }
        
        // Don't return password
        const { password: _, ...userResponse } = user;
        res.json(userResponse);
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid login data" });
    }
  });

  // Get current user (for session validation)
  app.get("/api/auth/me", async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Don't return password
      const { password, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // User logout
  app.post("/api/logout", async (req, res) => {
    (req as any).session.destroy();
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
      
      // Check available questions for the selected categories
      const availableQuestions = await storage.getQuestionsByCategories(
        quizData.categoryIds,
        quizData.subcategoryIds || []
      );
      
      const availableCount = availableQuestions.length;
      
      // Calculate adaptive question count if adaptive learning is enabled
      let adaptiveQuestionCount = quizData.questionCount;
      if (isAdaptive && quizData.categoryIds) {
        adaptiveQuestionCount = await storage.getAdaptiveQuestionCount(userId, quizData.questionCount, quizData.categoryIds);
      }
      
      // Use the lesser of requested questions or available questions
      const finalQuestionCount = Math.min(adaptiveQuestionCount, availableCount);
      
      if (finalQuestionCount === 0) {
        return res.status(400).json({ 
          message: "No questions available for the selected categories" 
        });
      }
      
      const quiz = await storage.createQuiz({
        ...quizData,
        userId,
        questionCount: finalQuestionCount,
        subcategoryIds: quizData.subcategoryIds || [],
        isAdaptive,
        difficultyLevel: 1,
        mode: quizData.mode || "study"
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
      
      console.log(`Quiz submission for quiz ${quizId}:`, { answers, answersCount: answers?.length });
      
      const quiz = await storage.getQuiz(quizId);
      if (!quiz) {
        console.error(`Quiz ${quizId} not found`);
        return res.status(404).json({ message: "Quiz not found" });
      }
      
      console.log(`Quiz found:`, { id: quiz.id, categoryIds: quiz.categoryIds, questionCount: quiz.questionCount });
      
      // Get questions to calculate score
      const questions = await storage.getQuestionsByCategories(
        quiz.categoryIds as number[],
        quiz.subcategoryIds as number[]
      );
      
      console.log(`Questions retrieved: ${questions.length}`);
      
      if (questions.length === 0) {
        console.error('No questions found for quiz', { categoryIds: quiz.categoryIds, subcategoryIds: quiz.subcategoryIds });
        return res.status(400).json({ message: "No questions found for this quiz" });
      }
      
      let correctAnswers = 0;
      const results = answers.map((answer: any) => {
        const question = questions.find(q => q.id === answer.questionId);
        if (!question) {
          console.warn(`Question not found: ${answer.questionId}`);
        }
        const isCorrect = question && question.correctAnswer === answer.answer;
        if (isCorrect) correctAnswers++;
        console.log(`Question ${answer.questionId}: selected ${answer.answer}, correct ${question?.correctAnswer}, isCorrect: ${isCorrect}`);
        return {
          questionId: answer.questionId,
          answer: answer.answer,
          correct: isCorrect,
          correctAnswer: question?.correctAnswer,
          explanation: question?.explanation
        };
      });
      
      // Use the actual number of questions available, not the requested count
      const actualQuestionCount = Math.min(questions.length, quiz.questionCount);
      const score = actualQuestionCount > 0 ? Math.round((correctAnswers / actualQuestionCount) * 100) : 0;
      
      // Update quiz with total questions count
      const updatedQuiz = await storage.updateQuiz(quizId, {
        answers: answers,
        score,
        correctAnswers,
        totalQuestions: actualQuestionCount,
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
        const categoryResults = results.filter((r: { questionId: number; correct: boolean }) => {
          const question = questions.find(q => q.id === r.questionId);
          return question?.categoryId === categoryId;
        });
        const categoryCorrect = categoryResults.filter((r: { correct: boolean }) => r.correct).length;
        const categoryScore = categoryQuestions.length > 0 
          ? Math.round((categoryCorrect / categoryQuestions.length) * 100)
          : 0;
        
        await storage.updateUserProgress(quiz.userId, categoryId, {
          questionsCompleted: categoryQuestions.length,
          totalQuestions: categoryQuestions.length,
          averageScore: categoryScore,
          lastQuizDate: new Date()
        });

        // Update mastery scores for quiz mode
        if (quiz.mode === "quiz") {
          // Update mastery scores by subcategory
          const subcategoriesToProcess = quiz.subcategoryIds && (quiz.subcategoryIds as number[]).length > 0
            ? quiz.subcategoryIds as number[]
            : questions.filter(q => q.categoryId === categoryId).map(q => q.subcategoryId);
          
          const uniqueSubcategories = Array.from(new Set(subcategoriesToProcess));
          
          for (const subcategoryId of uniqueSubcategories) {
            const subcategoryQuestions = questions.filter(q => 
              q.categoryId === categoryId && q.subcategoryId === subcategoryId
            );
            const subcategoryResults = results.filter((r: { questionId: number; correct: boolean }) => {
              const question = questions.find(q => q.id === r.questionId);
              return question?.categoryId === categoryId && question?.subcategoryId === subcategoryId;
            });
            
            if (subcategoryQuestions.length > 0 && subcategoryResults.length > 0) {
              const subcategoryCorrect = subcategoryResults.filter((r: { correct: boolean }) => r.correct).length;
              await storage.updateMasteryScoreBulk(
                quiz.userId,
                categoryId,
                subcategoryId,
                subcategoryCorrect,
                subcategoryResults.length
              );
            }
          }
        }

        // Update adaptive learning metrics (skip if method doesn't exist)
        if (quiz.isAdaptive && typeof storage.updateAdaptiveProgress === 'function') {
          try {
            await storage.updateAdaptiveProgress(quiz.userId, categoryId, categoryResults);
          } catch (error) {
            console.log('Adaptive progress update not available');
          }
        }
      }

      // Generate lecture for failed quiz (below 85%) - temporarily disabled due to database issues
      // TODO: Fix lecture creation with proper topics handling
      /*
      if (!isPassing) {
        try {
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
        } catch (lectureError) {
          console.error('Failed to create lecture:', lectureError);
          // Continue without failing the quiz submission
        }
      }
      */
      
      res.json({
        quiz: updatedQuiz,
        results,
        score,
        correctAnswers,
        totalQuestions: actualQuestionCount,
        passed: isPassing,
        passingThreshold: 85
      });
    } catch (error) {
      console.error('Quiz submission error:', error);
      res.status(500).json({ 
        message: "Failed to submit quiz",
        error: error instanceof Error ? error.message : "Unknown error"
      });
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

  // Get certification mastery scores
  app.get("/api/user/:id/mastery", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const masteryScores = await storage.getCertificationMasteryScores(userId);
      res.json(masteryScores);
    } catch (error) {
      res.status(400).json({ message: "Failed to get mastery scores" });
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

  app.post('/api/user/:userId/badges/:badgeId/notify', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const badgeId = parseInt(req.params.badgeId);
      
      await storage.updateUserBadgeNotification(userId, badgeId, true);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating badge notification:', error);
      res.status(500).json({ error: 'Failed to update notification' });
    }
  });

  app.get('/api/user/:userId/achievement-progress', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Get all badges and user's earned badges
      const allBadges = await storage.getAllBadges();
      const userBadges = await storage.getUserBadges(userId);
      const earnedBadgeIds = userBadges.map(ub => ub.badgeId);
      
      // Get user stats for progress calculation
      const userStats = await storage.getUserStats(userId);
      const userQuizzes = await storage.getUserQuizzes(userId);
      const completedQuizzes = userQuizzes.filter(q => q.completedAt);
      const gameStats = await storage.getUserGameStats(userId);
      const masteryScores = await storage.getUserMasteryScores(userId);
      
      // Calculate progress for each badge
      const progressData = allBadges.map(badge => {
        const earned = earnedBadgeIds.includes(badge.id);
        const req = badge.requirement as any;
        let progress = 0;
        let progressText = "";
        
        switch (req.type) {
          case "quiz_completed":
            progress = Math.min((completedQuizzes.length / req.count) * 100, 100);
            progressText = `${completedQuizzes.length}/${req.count} quizzes completed`;
            break;
            
          case "perfect_score":
            const perfectScores = completedQuizzes.filter(q => q.score === 100);
            progress = Math.min((perfectScores.length / req.count) * 100, 100);
            progressText = `${perfectScores.length}/${req.count} perfect scores`;
            break;
            
          case "high_score":
            const highScores = completedQuizzes.filter(q => (q.score || 0) >= req.threshold);
            progress = Math.min((highScores.length / req.count) * 100, 100);
            progressText = `${highScores.length}/${req.count} scores above ${req.threshold}%`;
            break;
            
          case "avg_score":
            if (completedQuizzes.length > 0) {
              const avgScore = completedQuizzes.reduce((sum, q) => sum + (q.score || 0), 0) / completedQuizzes.length;
              progress = Math.min((avgScore / req.threshold) * 100, 100);
              progressText = `Average score: ${Math.round(avgScore)}%/${req.threshold}%`;
            }
            break;
            
          case "daily_streak":
            const currentStreak = gameStats?.currentStreak || 0;
            progress = Math.min((currentStreak / req.count) * 100, 100);
            progressText = `${currentStreak}/${req.count} day streak`;
            break;
            
          case "mastery_score":
            const highMastery = masteryScores.filter(m => m.rollingAverage >= req.threshold);
            progress = highMastery.length > 0 ? 100 : 0;
            progressText = progress === 100 ? "Achieved!" : `Need ${req.threshold}% mastery`;
            break;
            
          case "multi_mastery":
            const qualifyingAreas = masteryScores.filter(m => m.rollingAverage >= req.threshold);
            progress = Math.min((qualifyingAreas.length / req.areas) * 100, 100);
            progressText = `${qualifyingAreas.length}/${req.areas} areas at ${req.threshold}%+`;
            break;
        }
        
        return {
          badge,
          earned,
          progress: earned ? 100 : progress,
          progressText: earned ? "Completed!" : progressText
        };
      });
      
      res.json({
        unlockedBadges: earnedBadgeIds,
        progressData
      });
    } catch (error) {
      console.error('Error fetching achievement progress:', error);
      res.status(500).json({ error: 'Failed to fetch achievement progress' });
    }
  });

  // Get personalized study plan
  app.get('/api/user/:userId/study-plan', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const sessionUserId = (req as any).session?.userId;
      
      if (!sessionUserId || sessionUserId !== userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get user's mastery scores and quiz history
      const masteryScores = await storage.getUserMasteryScores(userId);
      const userQuizzes = await storage.getUserQuizzes(userId);
      const completedQuizzes = userQuizzes.filter(q => q.completedAt);
      const categories = await storage.getCategories();

      // Calculate study recommendations
      let studyPlan: any = {
        priority: "Get Started",
        recommendation: "Take your first assessment to create a personalized study plan",
        focusAreas: [],
        estimatedTime: "30 minutes",
        nextSession: {
          type: "assessment",
          categories: categories.slice(0, 2).map(cat => cat.id),
          questionCount: 20
        },
        weeklyGoal: {
          sessions: 5,
          hoursPerWeek: 3
        }
      };

      if (masteryScores.length > 0) {
        // Find areas that need improvement
        const weakestAreas = masteryScores
          .filter(score => score.rollingAverage < 70)
          .sort((a, b) => a.rollingAverage - b.rollingAverage)
          .slice(0, 3);

        const strongAreas = masteryScores
          .filter(score => score.rollingAverage >= 80)
          .length;

        if (weakestAreas.length === 0) {
          // All areas are strong
          studyPlan = {
            priority: "Maintain Excellence",
            recommendation: "All areas show strong mastery. Focus on practice exams and maintaining readiness",
            focusAreas: masteryScores.slice(0, 2),
            estimatedTime: "45 minutes",
            nextSession: {
              type: "practice-exam",
              categories: categories.map(cat => cat.id),
              questionCount: 50
            },
            weeklyGoal: {
              sessions: 3,
              hoursPerWeek: 2
            }
          };
        } else {
          // Focus on weak areas
          studyPlan = {
            priority: "Focus Study",
            recommendation: `Concentrate on ${weakestAreas.length} areas needing improvement`,
            focusAreas: weakestAreas,
            estimatedTime: `${weakestAreas.length * 20} minutes`,
            nextSession: {
              type: "focused-study",
              categories: weakestAreas.map(area => area.categoryId),
              questionCount: 15
            },
            weeklyGoal: {
              sessions: 5,
              hoursPerWeek: 4
            }
          };
        }
      }

      // Add recent performance insights
      const recentQuizzes = completedQuizzes
        .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
        .slice(0, 5);

      const recentAverageScore = recentQuizzes.length > 0
        ? Math.round(recentQuizzes.reduce((sum, quiz) => sum + (quiz.score || 0), 0) / recentQuizzes.length)
        : 0;

      studyPlan = {
        ...studyPlan,
        insights: {
          recentPerformance: recentAverageScore,
          totalSessions: completedQuizzes.length,
          strongAreas: masteryScores.filter(s => s.rollingAverage >= 80).length,
          improvementAreas: masteryScores.filter(s => s.rollingAverage < 70).length
        }
      };

      res.json(studyPlan);
    } catch (error) {
      console.error('Error generating study plan:', error);
      res.status(500).json({ error: 'Failed to generate study plan' });
    }
  });

  // Generate lecture notes from quiz review
  app.post('/api/quiz/:quizId/generate-lecture', async (req, res) => {
    try {
      const quizId = parseInt(req.params.quizId);
      
      console.log('Generate lecture - Cookie header:', req.headers.cookie);
      console.log('Generate lecture - Session object:', (req as any).session);
      console.log('Generate lecture - Session ID:', (req as any).session?.id);
      
      const userId = (req as any).session?.userId;
      console.log('Generate lecture - User ID from session:', userId);
      
      if (!userId) {
        console.log('Generate lecture - No user ID, authentication failed');
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get quiz details
      const quiz = await storage.getQuiz(quizId);
      console.log('Generate lecture - Quiz found:', quiz);
      console.log('Generate lecture - User ID from session:', userId);
      if (!quiz || quiz.userId !== userId) {
        return res.status(404).json({ message: "Quiz not found" });
      }

      if (!quiz.completedAt) {
        return res.status(400).json({ message: "Quiz must be completed first" });
      }

      // Get quiz questions
      const questions = await storage.getQuestionsByCategories(
        quiz.categoryIds as number[],
        quiz.subcategoryIds as number[]
      );

      // Get categories for context
      const categories = await storage.getCategories();
      const categoryNames = (quiz.categoryIds as number[])
        .map(id => categories.find(c => c.id === id)?.name)
        .filter(Boolean)
        .join(", ");

      // Prepare quiz data for AI generation
      const { generateLectureNotes } = await import('./openai-service');
      
      const quizData = {
        quizTitle: quiz.title,
        categoryName: categoryNames,
        totalQuestions: quiz.totalQuestions || questions.length,
        score: quiz.score || 0,
        correctAnswers: quiz.correctAnswers || 0,
        questions: questions.slice(0, quiz.totalQuestions || questions.length).map((q, index) => {
          const userAnswer = (quiz.answers as any[])?.[index];
          return {
            id: q.id,
            text: q.text,
            options: q.options as { id: number; text: string }[],
            correctAnswer: q.correctAnswer,
            userAnswer: userAnswer?.answer,
            explanation: q.explanation || undefined,
            isCorrect: userAnswer?.answer === q.correctAnswer
          };
        })
      };

      // Generate lecture notes using AI
      const lectureContent = await generateLectureNotes(quizData);
      
      // Extract topics from questions for tagging
      const topics = questions
        .slice(0, quiz.totalQuestions || questions.length)
        .map(q => q.explanation?.split('.')[0] || q.text.substring(0, 50))
        .filter((topic, index, array) => array.indexOf(topic) === index)
        .slice(0, 10); // Limit to 10 topics

      // Save lecture to database
      const lecture = await storage.createLectureFromQuiz(
        userId,
        quizId,
        `Study Notes: ${quiz.title}`,
        lectureContent,
        topics,
        (quiz.categoryIds as number[])[0] || 1
      );

      res.json({
        success: true,
        lecture: {
          id: lecture.id,
          title: lecture.title,
          content: lecture.content,
          createdAt: lecture.createdAt
        }
      });

    } catch (error) {
      console.error('Lecture generation error:', error);
      res.status(500).json({ 
        message: "Failed to generate lecture notes",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Development endpoint to sync UI structure
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/dev/sync-ui-structure', async (req, res) => {
      try {
        const { execSync } = await import('child_process');
        execSync('node scripts/sync_ui_structure.js', { cwd: process.cwd() });
        res.json({ success: true, message: 'UI structure synced' });
      } catch (error: any) {
        console.error('UI sync error:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });
  }

  // Mount admin routes
  app.use("/api/admin", adminRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
