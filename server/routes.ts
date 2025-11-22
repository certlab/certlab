import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import adminRoutes from "./admin-routes";
import { setupAuth, isAuthenticated } from "./auth";
import { polarClient } from "./polar";
import { 
  insertUserSchema, 
  createQuizSchema, 
  submitAnswerSchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const { passwordHash, ...sanitizedUser } = user;
      res.json(sanitizedUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get user profile (protected)
  app.get("/api/user/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { passwordHash, ...sanitizedUser } = user;
      res.json(sanitizedUser);
    } catch (error) {
      res.status(400).json({ message: "Invalid user ID" });
    }
  });

  // Get user stats (protected)
  app.get("/api/user/:id/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(400).json({ message: "Failed to get user stats" });
    }
  });

  // Update user goals (protected)
  app.post("/api/user/:id/goals", isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
      const { certificationGoals, studyPreferences, skillsAssessment } = req.body;
      
      // Validate required fields
      if (!certificationGoals || !Array.isArray(certificationGoals)) {
        return res.status(400).json({ message: "Invalid certification goals" });
      }
      
      const updatedUser = await storage.updateUserGoals(userId, {
        certificationGoals,
        studyPreferences: studyPreferences || {},
        skillsAssessment: skillsAssessment || {},
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user goals:', error);
      res.status(500).json({ message: "Failed to update user goals" });
    }
  });
  
  // Update user profile (protected)
  app.patch("/api/user/:id/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.params.id;
      
      // Verify the user is updating their own profile
      if (userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized to update this profile" });
      }
      
      const { 
        email,
        firstName, 
        lastName, 
        certificationGoals, 
        studyPreferences, 
        skillsAssessment 
      } = req.body;
      
      const updates: any = {};
      
      // Validate and include email if provided
      if (email !== undefined) {
        // Allow empty email (to clear it) or validate non-empty email
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return res.status(400).json({ message: "Invalid email format" });
        }
        updates.email = email;
      }
      
      // Only include fields that were provided
      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (certificationGoals !== undefined) updates.certificationGoals = certificationGoals;
      if (studyPreferences !== undefined) updates.studyPreferences = studyPreferences;
      if (skillsAssessment !== undefined) updates.skillsAssessment = skillsAssessment;
      
      const updatedUser = await storage.updateUser(userId, updates);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ message: "Failed to update profile" });
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

  // Get credit products from Polar (protected)
  app.get("/api/credits/products", isAuthenticated, async (req: any, res) => {
    try {
      console.log('[Credits Products] Fetching products from Polar');
      
      // Fetch all products from Polar
      const productsResponse = await polarClient.getProducts();
      console.log('[Credits Products] Raw response type:', typeof productsResponse);
      console.log('[Credits Products] Raw response:', JSON.stringify(productsResponse).substring(0, 200));
      
      // Polar API may return { data: [...] } or { items: [...] } or just [...]
      const products = Array.isArray(productsResponse) 
        ? productsResponse 
        : (productsResponse as any).data || (productsResponse as any).items || (productsResponse as any).results || [];
      
      // Filter for credit products and format response
      const creditProducts = products
        .filter((product: any) => {
          // Filter for credit products with robust checking
          if (!product) return false;
          
          // Check for explicit product_type metadata flag (preferred)
          if (product.metadata?.product_type === 'credits') return true;
          
          // Fallback to legacy 'type' field
          if (product.metadata?.type === 'credits') return true;
          
          // Final fallback: check product name (case-insensitive)
          if (product.name && product.name.toLowerCase().includes('credit')) return true;
          
          return false;
        })
        .map((product: any) => {
          try {
            // Safely extract credit amount from metadata or product name
            let credits = 0;
            const creditsValue = product.metadata?.credits || product.metadata?.credit_amount;
            
            if (creditsValue) {
              credits = parseInt(String(creditsValue), 10);
            } else if (product.name) {
              // Fallback: try to extract credit amount from product name
              // Matches patterns like "50 Credits", "100 Credit Pack", etc.
              const match = product.name.match(/(\d+)\s*credit/i);
              if (match) {
                credits = parseInt(match[1], 10);
              }
            }
            
            if (isNaN(credits) || credits <= 0) {
              console.warn(`[Credits Products] Invalid or missing credits for product ${product.id}. Name: "${product.name}", metadata:`, product.metadata);
              return null;
            }
            
            // Find the USD price (or first available price as fallback)
            const prices = product.prices || [];
            
            console.log(`[Credits Products] Product ${product.id} prices:`, JSON.stringify(prices));
            
            const usdPrice = prices.find((p: any) => p.currency?.toLowerCase() === 'usd' || p.price_currency?.toLowerCase() === 'usd');
            const price = usdPrice || prices[0];
            
            if (!price) {
              console.warn(`[Credits Products] No price found for product ${product.id}`);
              return null;
            }
            
            // Extract price amount and currency (handle different possible field names)
            const priceAmount = price.price_amount || price.amount || 0;
            const priceCurrency = price.price_currency || price.currency || 'USD';
            
            console.log(`[Credits Products] Product ${product.id} selected price:`, { priceAmount, priceCurrency, priceId: price.id });
            
            // Format price display
            const currencySymbols: Record<string, string> = {
              usd: '$',
              eur: '€',
              gbp: '£',
            };
            const currencySymbol = currencySymbols[priceCurrency?.toLowerCase()] || priceCurrency?.toUpperCase() || '$';
            const formattedPrice = `${currencySymbol}${((priceAmount || 0) / 100).toFixed(2)}`;
            
            return {
              id: product.id,
              name: product.name || 'Credit Package',
              description: product.description || '',
              credits,
              price: {
                amount: priceAmount,
                currency: priceCurrency,
                priceId: price.id,
                formatted: formattedPrice,
              },
              metadata: {
                popular: product.metadata?.popular === true || product.metadata?.popular === 'true',
                savings: product.metadata?.savings || null,
                ...(product.metadata || {}),
              },
              features: Array.isArray(product.features) ? product.features : [],
            };
          } catch (err) {
            console.error(`[Credits Products] Error mapping product ${product?.id}:`, err);
            return null;
          }
        })
        .filter((product: any) => product !== null) // Remove invalid products
        .sort((a: any, b: any) => a.credits - b.credits); // Sort by credits ascending

      console.log('[Credits Products] Found valid products:', creditProducts.length);
      
      res.json(creditProducts);
    } catch (error: any) {
      console.error('[Credits Products] Error fetching products:', error);
      res.status(500).json({ 
        error: "Failed to fetch products",
        message: error.message || "Unable to load credit packages. Please try again later.",
      });
    }
  });

  // Get credit balance (protected)
  app.get("/api/credits/balance", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUserById(userId);
      
      if (!user || !user.email) {
        return res.status(400).json({ 
          error: "User not found",
          message: "Unable to verify user account" 
        });
      }

      try {
        // Get or create Polar customer
        const polarCustomer = await polarClient.createOrGetCustomerForUser(
          user.email,
          `${user.firstName || ''} ${user.lastName || ''}`.trim()
        );
        
        // Get credit balance from Polar
        const balance = await polarClient.getCustomerBalance(polarCustomer.id);
        
        res.json({
          availableCredits: balance.availableCredits,
          totalPurchased: balance.totalPurchased,
          totalConsumed: balance.totalConsumed,
          customerId: polarCustomer.id,
        });
      } catch (error: any) {
        console.error('[Credits] Error fetching balance:', error);
        // Return 0 credits on error to prevent blocking UI
        res.json({
          availableCredits: 0,
          totalPurchased: 0,
          totalConsumed: 0,
          error: 'Unable to fetch credit balance',
        });
      }
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to get credit balance",
        message: "Please try again later" 
      });
    }
  });

  // Create checkout session for credit purchase (protected)
  app.post("/api/credits/checkout", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUserById(userId);
      
      if (!user || !user.email) {
        return res.status(400).json({ 
          error: "User not found",
          message: "Unable to verify user account" 
        });
      }

      const { priceId, packageId, credits } = req.body;
      
      if (!priceId) {
        return res.status(400).json({ 
          error: "Invalid request",
          message: "Price ID is required" 
        });
      }

      try {
        // Get or create Polar customer
        const polarCustomer = await polarClient.createOrGetCustomerForUser(
          user.email,
          `${user.firstName || ''} ${user.lastName || ''}`.trim()
        );
        
        console.log('[Credits Checkout] Creating checkout session:', {
          userId,
          packageId,
          credits,
          priceId,
        });

        // Get the base URL for success/cancel redirects
        const baseUrl = process.env.APP_URL || `http://localhost:5000`;
        
        // Create Polar checkout session for credit purchase
        const checkoutSession = await polarClient.createCheckoutSession({
          priceId,
          successUrl: `${baseUrl}/app/credits?purchase=success&session_id=${'{CHECKOUT_ID}'}`,
          cancelUrl: `${baseUrl}/app/credits?purchase=canceled`,
          customerEmail: user.email,
          customerName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          metadata: {
            userId,
            packageId,
            credits: credits.toString(),
            type: 'credit_purchase',
          },
        });

        console.log('[Credits Checkout] Checkout session created:', {
          sessionId: checkoutSession.id,
          url: checkoutSession.url,
        });

        res.json({
          checkoutUrl: checkoutSession.url,
          sessionId: checkoutSession.id,
        });
      } catch (error: any) {
        console.error('[Credits Checkout] Error creating checkout session:', error);
        res.status(500).json({ 
          error: "Checkout failed",
          message: error.message || "Unable to create checkout session. Please try again later.",
        });
      }
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to create checkout",
        message: "Please try again later" 
      });
    }
  });

  // Verify and process successful credit purchase
  app.get("/api/credits/verify", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { session_id } = req.query;
      
      if (!session_id) {
        return res.status(400).json({ 
          error: "Invalid request",
          message: "Session ID is required" 
        });
      }

      try {
        console.log('[Credits Verify] Fetching checkout session:', session_id);
        
        // Get checkout session from Polar
        const session = await polarClient.getCheckoutSession(session_id as string);
        
        console.log('[Credits Verify] Session status:', {
          sessionId: session.id,
          status: session.status,
          metadata: session.metadata,
        });

        // Verify session belongs to this user
        if (session.metadata?.userId !== userId) {
          console.error('[Credits Verify] User ID mismatch');
          return res.status(403).json({ 
            error: "Unauthorized",
            message: "This purchase does not belong to you" 
          });
        }

        // Check if purchase was successful
        if (session.status !== 'succeeded') {
          return res.json({ 
            success: false,
            status: session.status,
          });
        }

        // Get credit amount from metadata
        const credits = parseInt(session.metadata?.credits || '0', 10);
        
        if (credits <= 0) {
          console.error('[Credits Verify] Invalid credit amount in metadata');
          return res.status(400).json({ 
            error: "Invalid purchase",
            message: "Credit amount not found" 
          });
        }

        // Get user and Polar customer
        const user = await storage.getUserById(userId);
        if (!user || !user.email) {
          return res.status(404).json({ 
            error: "User not found",
            message: "Unable to verify user account" 
          });
        }

        const polarCustomer = await polarClient.getCustomerByEmail(user.email);
        if (!polarCustomer) {
          return res.status(404).json({ 
            error: "Customer not found",
            message: "Unable to find Polar customer" 
          });
        }

        // Add credits to customer's balance via Polar customer state
        console.log('[Credits Verify] Adding credits to customer:', {
          customerId: polarCustomer.id,
          credits,
        });

        const productId = session.metadata?.packageId || session.productId;
        const balance = await polarClient.addCredits({
          customerId: polarCustomer.id,
          amount: credits,
          sessionId: session.id,
          productId,
        });

        console.log('[Credits Verify] Credits granted successfully:', balance);

        res.json({
          success: true,
          credits,
          balance: balance.availableCredits,
        });
      } catch (error: any) {
        console.error('[Credits Verify] Error verifying purchase:', error);
        res.status(500).json({ 
          error: "Verification failed",
          message: error.message || "Unable to verify purchase" 
        });
      }
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to verify purchase",
        message: "Please try again later" 
      });
    }
  });

  // Polar webhook endpoint (public)
  app.post("/api/webhooks/polar", async (req, res) => {
    try {
      const event = req.body;
      
      console.log('[Polar Webhook] Received event:', {
        type: event.type,
        id: event.id,
      });

      // Handle different event types
      switch (event.type) {
        case 'checkout.completed':
        case 'checkout.succeeded':
        case 'order.created':
          await handleCheckoutCompleted(event.data);
          break;
        default:
          console.log('[Polar Webhook] Unhandled event type:', event.type);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('[Polar Webhook] Error processing webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Helper function to handle checkout completion
  async function handleCheckoutCompleted(data: any) {
    try {
      const metadata = data.metadata || {};
      const userId = metadata.userId;
      const credits = parseInt(metadata.credits || '0', 10);

      if (!userId || credits <= 0) {
        console.log('[Polar Webhook] Missing userId or credits in metadata');
        return;
      }

      console.log('[Polar Webhook] Processing checkout completion:', {
        userId,
        credits,
        sessionId: data.id,
      });

      // Get user
      const user = await storage.getUserById(userId);
      if (!user || !user.email) {
        console.error('[Polar Webhook] User not found:', userId);
        return;
      }

      // Get Polar customer
      const polarCustomer = await polarClient.getCustomerByEmail(user.email);
      if (!polarCustomer) {
        console.error('[Polar Webhook] Polar customer not found for:', user.email);
        return;
      }

      // Add credits to customer's balance via Polar customer state
      const productId = metadata.packageId || data.product_id;
      await polarClient.addCredits({
        customerId: polarCustomer.id,
        amount: credits,
        sessionId: data.id,
        productId,
      });

      console.log('[Polar Webhook] Credits added via webhook:', {
        customerId: polarCustomer.id,
        credits,
      });
    } catch (error) {
      console.error('[Polar Webhook] Error handling checkout completion:', error);
    }
  }

  // Create quiz with adaptive learning (protected)
  app.post("/api/quiz", isAuthenticated, async (req: any, res) => {
    try {
      const quizData = createQuizSchema.parse(req.body);
      const userId = req.user.id; // Get userId from authenticated user
      const isAdaptive = req.body.isAdaptive || false;
      
      // Credit-based billing: check if user has enough credits
      const CREDITS_PER_QUIZ = 5;
      const user = await storage.getUserById(userId);
      
      if (!user || !user.email) {
        return res.status(400).json({ 
          error: "User not found",
          message: "Unable to verify user account" 
        });
      }
      
      let polarCustomer;
      try {
        // Get or create Polar customer
        polarCustomer = await polarClient.createOrGetCustomerForUser(
          user.email,
          `${user.firstName || ''} ${user.lastName || ''}`.trim()
        );
        
        // Check credit balance from Polar
        const balance = await polarClient.getCustomerBalance(polarCustomer.id);
        
        console.log('[Quiz Creation] Credit check:', {
          userId,
          email: user.email,
          availableCredits: balance.availableCredits,
          requiredCredits: CREDITS_PER_QUIZ,
        });
        
        // Ensure user has enough credits
        if (balance.availableCredits < CREDITS_PER_QUIZ) {
          return res.status(403).json({ 
            error: "Insufficient credits",
            message: `You need ${CREDITS_PER_QUIZ} credits to create a quiz. You currently have ${balance.availableCredits} credits.`,
            availableCredits: balance.availableCredits,
            requiredCredits: CREDITS_PER_QUIZ,
            purchaseUrl: "/app/credits",
          });
        }
      } catch (error: any) {
        console.error('[Quiz Creation] Error checking credits:', error);
        return res.status(500).json({ 
          error: "Credit check failed",
          message: "Unable to verify credit balance. Please try again later.",
        });
      }
      
      // Deduct credits BEFORE creating quiz to prevent free usage
      let updatedBalance;
      try {
        await polarClient.deductCredits({
          customerId: polarCustomer.id,
          amount: CREDITS_PER_QUIZ,
          reason: `Quiz creation`,
        });
        
        // Get updated balance to return in response
        updatedBalance = await polarClient.getCustomerBalance(polarCustomer.id);
        
        console.log('[Quiz Creation] Credits deducted:', {
          userId,
          creditsConsumed: CREDITS_PER_QUIZ,
          newBalance: updatedBalance.availableCredits,
        });
      } catch (error: any) {
        console.error('[Quiz Creation] Failed to deduct credits:', error);
        return res.status(500).json({ 
          error: "Credit deduction failed",
          message: "Unable to process credits. Please try again later.",
        });
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
      
      console.log('[Quiz Creation] Quiz created:', {
        quizId: quiz.id,
        userId,
        finalQuestionCount,
      });
      
      res.json({
        ...quiz,
        creditBalance: updatedBalance ? {
          availableCredits: updatedBalance.availableCredits,
          totalPurchased: updatedBalance.totalPurchased,
          totalConsumed: updatedBalance.totalConsumed,
        } : undefined,
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid quiz data" });
    }
  });

  // Get quiz (protected)
  app.get("/api/quiz/:id", isAuthenticated, async (req, res) => {
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

  // Get quiz questions (protected)
  app.get("/api/quiz/:id/questions", isAuthenticated, async (req, res) => {
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

  // Submit quiz answers (protected)
  app.post("/api/quiz/:id/submit", isAuthenticated, async (req: any, res) => {
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

  // Get user quizzes (protected)
  app.get("/api/user/:id/quizzes", isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
      const quizzes = await storage.getUserQuizzes(userId);
      res.json(quizzes);
    } catch (error) {
      res.status(400).json({ message: "Failed to get user quizzes" });
    }
  });

  // Get user progress (protected)
  app.get("/api/user/:id/progress", isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
      const progress = await storage.getUserProgress(userId);
      res.json(progress);
    } catch (error) {
      res.status(400).json({ message: "Failed to get user progress" });
    }
  });

  // Get certification mastery scores (protected)
  app.get("/api/user/:id/mastery", isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
      const masteryScores = await storage.getCertificationMasteryScores(userId);
      res.json(masteryScores);
    } catch (error) {
      res.status(400).json({ message: "Failed to get mastery scores" });
    }
  });

  // Create adaptive quiz - enhanced version of regular quiz (protected)
  app.post("/api/quiz/adaptive", isAuthenticated, async (req: any, res) => {
    try {
      const { title, categoryIds, subcategoryIds, questionCount, timeLimit } = req.body;
      const userId = req.user.id;

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

  // Get user lectures (protected)
  app.get("/api/user/:id/lectures", isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
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

  // Generate personalized lecture based on user performance (protected)
  app.post("/api/user/:userId/generate-lecture", isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.userId;
      
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

  // Create quiz with difficulty filtering (protected)
  app.post("/api/quiz/filtered", isAuthenticated, async (req: any, res) => {
    try {
      const { title, categoryIds, subcategoryIds, questionCount, timeLimit, difficultyLevels } = req.body;
      const userId = req.user.id;

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

  // Achievement system endpoints (protected)
  app.get('/api/user/:userId/achievements', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId;
      
      // Get game stats and user badges in parallel for better performance
      const [gameStats, userBadges, allBadges] = await Promise.all([
        storage.getUserGameStats(userId),
        storage.getUserBadges(userId),
        storage.getAllBadges()
      ]);
      
      // Initialize game stats only if they don't exist
      if (!gameStats) {
        await storage.initializeUserGameStats(userId);
      }
      
      // Skip checking for new achievements on every request to improve performance
      // This check should only happen after meaningful events (quiz completion, etc.)
      // It can be triggered separately via the /achievements/check endpoint
      
      // Combine badge data with user progress
      const badgeData = userBadges.map(userBadge => {
        const badge = allBadges.find(b => b.id === userBadge.badgeId);
        return {
          ...userBadge,
          badge: badge
        };
      });
      
      res.json({
        badges: badgeData,
        gameStats: gameStats || await storage.getUserGameStats(userId),
        newBadges: 0  // Will be updated via separate check endpoint
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

  app.post('/api/user/:userId/achievements/check', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId;
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

  app.post('/api/user/:userId/badges/:badgeId/notify', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId;
      const badgeId = parseInt(req.params.badgeId);
      
      await storage.updateUserBadgeNotification(userId, badgeId, true);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating badge notification:', error);
      res.status(500).json({ error: 'Failed to update notification' });
    }
  });

  app.get('/api/user/:userId/achievement-progress', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId;
      
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

  // Study Groups endpoints
  app.get('/api/study-groups', async (req, res) => {
    try {
      const groups = await storage.getStudyGroups();
      
      // Add member count for each group
      const groupsWithMembers = await Promise.all(
        groups.map(async (group) => {
          const members = await storage.getStudyGroupMembers(group.id);
          return {
            ...group,
            memberCount: members.length,
            recentActivity: members[0]?.joinedAt ? 
              getRelativeTime(new Date(members[0].joinedAt)) : 
              'No recent activity'
          };
        })
      );
      
      res.json(groupsWithMembers);
    } catch (error) {
      console.error('Error fetching study groups:', error);
      res.status(500).json({ message: 'Failed to fetch study groups' });
    }
  });

  app.get('/api/study-groups/:id', async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const result = await storage.getStudyGroupWithMembers(groupId);
      
      if (!result) {
        return res.status(404).json({ message: 'Study group not found' });
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching study group:', error);
      res.status(500).json({ message: 'Failed to fetch study group' });
    }
  });

  app.post('/api/study-groups', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { name, description, categoryIds, maxMembers, level } = req.body;
      
      if (!name || !categoryIds || categoryIds.length === 0) {
        return res.status(400).json({ message: 'Name and at least one category are required' });
      }
      
      const group = await storage.createStudyGroup({
        name,
        description: description || '',
        categoryIds,
        createdBy: userId,
        maxMembers: maxMembers || 20,
        level: level || 'Intermediate',
        tenantId: 1,
      });
      
      res.json(group);
    } catch (error) {
      console.error('Error creating study group:', error);
      res.status(500).json({ message: 'Failed to create study group' });
    }
  });

  app.post('/api/study-groups/:id/join', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const groupId = parseInt(req.params.id);
      
      const member = await storage.joinStudyGroup(groupId, userId);
      res.json(member);
    } catch (error) {
      console.error('Error joining study group:', error);
      res.status(500).json({ message: 'Failed to join study group' });
    }
  });

  app.post('/api/study-groups/:id/leave', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const groupId = parseInt(req.params.id);
      
      await storage.leaveStudyGroup(groupId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error leaving study group:', error);
      res.status(500).json({ message: 'Failed to leave study group' });
    }
  });

  app.get('/api/user/:userId/study-groups', isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.userId;
      const groups = await storage.getUserStudyGroups(userId);
      res.json(groups);
    } catch (error) {
      console.error('Error fetching user study groups:', error);
      res.status(500).json({ message: 'Failed to fetch user study groups' });
    }
  });

  // Practice Tests endpoints
  app.get('/api/practice-tests', async (req, res) => {
    try {
      const tests = await storage.getPracticeTests();
      
      // Add attempt statistics for each test if user is authenticated
      const testsWithStats = await Promise.all(
        tests.map(async (test) => {
          const attempts = await storage.getPracticeTestAttempts(test.id);
          return {
            ...test,
            totalAttempts: attempts.length,
            averageScore: attempts.length > 0 ?
              attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length :
              0
          };
        })
      );
      
      res.json(testsWithStats);
    } catch (error) {
      console.error('Error fetching practice tests:', error);
      res.status(500).json({ message: 'Failed to fetch practice tests' });
    }
  });

  app.get('/api/practice-tests/:id', async (req, res) => {
    try {
      const testId = parseInt(req.params.id);
      const test = await storage.getPracticeTest(testId);
      
      if (!test) {
        return res.status(404).json({ message: 'Practice test not found' });
      }
      
      res.json(test);
    } catch (error) {
      console.error('Error fetching practice test:', error);
      res.status(500).json({ message: 'Failed to fetch practice test' });
    }
  });

  app.post('/api/practice-tests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { 
        name, 
        description, 
        categoryIds, 
        questionCount, 
        timeLimit, 
        difficulty, 
        passingScore 
      } = req.body;
      
      if (!name || !categoryIds || categoryIds.length === 0 || !questionCount || !timeLimit) {
        return res.status(400).json({ 
          message: 'Name, categories, question count, and time limit are required' 
        });
      }
      
      const test = await storage.createPracticeTest({
        name,
        description: description || '',
        categoryIds,
        questionCount,
        timeLimit,
        difficulty: difficulty || 'Mixed',
        passingScore: passingScore || 70,
        createdBy: userId,
        tenantId: 1,
      });
      
      res.json(test);
    } catch (error) {
      console.error('Error creating practice test:', error);
      res.status(500).json({ message: 'Failed to create practice test' });
    }
  });

  app.post('/api/practice-tests/:id/start', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const testId = parseInt(req.params.id);
      const CREDITS_PER_QUIZ = 5;
      
      // Get the practice test details
      const test = await storage.getPracticeTest(testId);
      if (!test) {
        return res.status(404).json({ message: 'Practice test not found' });
      }
      
      // Credit-based billing: check if user has enough credits
      const user = await storage.getUserById(userId);
      
      if (!user || !user.email) {
        return res.status(400).json({ 
          error: "User not found",
          message: "Unable to verify user account" 
        });
      }
      
      let polarCustomer;
      try {
        // Get or create Polar customer
        polarCustomer = await polarClient.createOrGetCustomerForUser(
          user.email,
          `${user.firstName || ''} ${user.lastName || ''}`.trim()
        );
        
        // Check credit balance from Polar
        const balance = await polarClient.getCustomerBalance(polarCustomer.id);
        
        console.log('[Practice Test] Credit check:', {
          userId,
          email: user.email,
          availableCredits: balance.availableCredits,
          requiredCredits: CREDITS_PER_QUIZ,
        });
        
        // Ensure user has enough credits
        if (balance.availableCredits < CREDITS_PER_QUIZ) {
          return res.status(403).json({ 
            error: "Insufficient credits",
            message: `You need ${CREDITS_PER_QUIZ} credits to start a practice test. You currently have ${balance.availableCredits} credits.`,
            availableCredits: balance.availableCredits,
            requiredCredits: CREDITS_PER_QUIZ,
            purchaseUrl: "/app/credits",
          });
        }
      } catch (error: any) {
        console.error('[Practice Test] Error checking credits:', error);
        return res.status(500).json({ 
          error: "Credit check failed",
          message: "Unable to verify credit balance. Please try again later.",
        });
      }
      
      // Deduct credits BEFORE creating quiz to prevent free usage
      let updatedBalance;
      try {
        await polarClient.deductCredits({
          customerId: polarCustomer.id,
          amount: CREDITS_PER_QUIZ,
          reason: `Practice test started (ID: ${testId})`,
        });
        
        // Get updated balance to return in response
        updatedBalance = await polarClient.getCustomerBalance(polarCustomer.id);
        
        console.log('[Practice Test] Credits deducted:', {
          testId,
          creditsConsumed: CREDITS_PER_QUIZ,
          newBalance: updatedBalance.availableCredits,
        });
      } catch (error: any) {
        console.error('[Practice Test] Failed to deduct credits:', error);
        return res.status(500).json({ 
          error: "Credit deduction failed",
          message: "Unable to process credits. Please try again later.",
        });
      }
      
      // Get all subcategories for the selected categories
      // This ensures we can fetch questions properly
      const allSubcategories = await storage.getSubcategories();
      const relevantSubcategoryIds = allSubcategories
        .filter(sub => test.categoryIds.includes(sub.categoryId))
        .map(sub => sub.id);
      
      // Check if questions are available for this test
      const availableQuestions = await storage.getQuestionsByCategories(
        test.categoryIds,
        relevantSubcategoryIds
      );
      
      if (availableQuestions.length === 0) {
        return res.status(400).json({ 
          message: 'No questions available for this practice test. Please try a different test or contact support.',
          error: 'NO_QUESTIONS_AVAILABLE'
        });
      }
      
      // Adjust question count if fewer questions are available
      const finalQuestionCount = Math.min(test.questionCount, availableQuestions.length);
      
      // Create a quiz for this practice test
      const quiz = await storage.createQuiz({
        title: test.name,
        categoryIds: test.categoryIds,
        subcategoryIds: relevantSubcategoryIds, // Pass all subcategories for the selected categories
        questionCount: finalQuestionCount, // Use adjusted question count
        timeLimit: test.timeLimit,
        userId,
        mode: 'quiz',
        difficultyLevel: test.difficulty === 'Easy' ? 1 : 
                        test.difficulty === 'Medium' ? 2 : 
                        test.difficulty === 'Hard' ? 3 : 
                        test.difficulty === 'Expert' ? 4 : 1, // Default to 1 for Mixed
      });
      
      // Create practice test attempt
      const attempt = await storage.startPracticeTest(testId, userId);
      
      console.log('[Practice Test] Quiz and attempt created:', {
        testId,
        quizId: quiz.id,
        attemptId: attempt.id,
      });
      
      res.json({ 
        quiz, 
        attempt,
        creditBalance: updatedBalance ? {
          availableCredits: updatedBalance.availableCredits,
          totalPurchased: updatedBalance.totalPurchased,
          totalConsumed: updatedBalance.totalConsumed,
        } : undefined,
      });
    } catch (error) {
      console.error('Error starting practice test:', error);
      res.status(500).json({ message: 'Failed to start practice test' });
    }
  });

  app.post('/api/practice-tests/attempts/:attemptId/complete', isAuthenticated, async (req, res) => {
    try {
      const attemptId = parseInt(req.params.attemptId);
      const { quizId, score, timeSpent } = req.body;
      
      const attempt = await storage.completePracticeTest(attemptId, quizId, score, timeSpent);
      res.json(attempt);
    } catch (error) {
      console.error('Error completing practice test:', error);
      res.status(500).json({ message: 'Failed to complete practice test' });
    }
  });

  app.get('/api/user/:userId/practice-test-attempts', isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.userId;
      const attempts = await storage.getUserPracticeTestAttempts(userId);
      
      // Add test details to each attempt
      const attemptsWithTests = await Promise.all(
        attempts.map(async (attempt) => {
          const test = await storage.getPracticeTest(attempt.testId);
          return {
            ...attempt,
            test
          };
        })
      );
      
      res.json(attemptsWithTests);
    } catch (error) {
      console.error('Error fetching user practice test attempts:', error);
      res.status(500).json({ message: 'Failed to fetch practice test attempts' });
    }
  });

  // Helper function for relative time
  function getRelativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  }

  // Get personalized study plan (protected)
  app.get('/api/user/:userId/study-plan', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.params.userId;
      const authenticatedUserId = req.user.id;
      
      // Allow access if requesting own data or if admin
      if (userId !== authenticatedUserId) {
        return res.status(403).json({ message: "Access denied" });
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


  // Challenge System Routes
  // Get user's available challenges
  app.get("/api/user/:id/challenges", isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
      const challenges = await storage.getAvailableChallenges(userId);
      res.json(challenges);
    } catch (error) {
      console.error("Error getting challenges:", error);
      res.status(500).json({ message: "Failed to get challenges" });
    }
  });

  // Get user's challenge history
  app.get("/api/user/:id/challenge-attempts", isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
      const attempts = await storage.getUserChallengeAttempts(userId);
      res.json(attempts);
    } catch (error) {
      console.error("Error getting challenge attempts:", error);
      res.status(500).json({ message: "Failed to get challenge attempts" });
    }
  });

  // Generate daily challenges for user
  app.post("/api/user/:id/generate-daily-challenges", isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
      console.log("=== Challenge Generation Debug ===");
      console.log("User ID:", userId);
      console.log("Request authenticated:", !!req.user);
      console.log("Request body:", req.body);
      
      const challenges = await storage.generateDailyChallenges(userId);
      console.log("Generated challenges count:", challenges.length);
      console.log("Challenge titles:", challenges.map(c => c.title));
      
      res.json(challenges);
    } catch (error) {
      console.error("=== Challenge Generation Error ===");
      console.error("Error type:", typeof error);
      console.error("Error message:", error instanceof Error ? error.message : String(error));
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
      res.status(400).json({ message: "Failed to generate daily challenges: " + (error instanceof Error ? error.message : String(error)) });
    }
  });

  // Start a challenge attempt
  app.post("/api/challenge/:id/start", isAuthenticated, async (req, res) => {
    try {
      const challengeId = parseInt(req.params.id);
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const attempt = await storage.startChallengeAttempt(userId, challengeId);
      res.json(attempt);
    } catch (error) {
      console.error("Error starting challenge:", error);
      res.status(500).json({ message: "Failed to start challenge" });
    }
  });

  // Complete a challenge attempt
  app.post("/api/challenge-attempt/:id/complete", isAuthenticated, async (req, res) => {
    try {
      const attemptId = parseInt(req.params.id);
      const { score, answers, timeSpent } = req.body;

      if (typeof score !== 'number' || !Array.isArray(answers) || typeof timeSpent !== 'number') {
        return res.status(400).json({ message: "Invalid completion data" });
      }

      const completedAttempt = await storage.completeChallengeAttempt(attemptId, score, answers, timeSpent);
      res.json(completedAttempt);
    } catch (error) {
      console.error("Error completing challenge:", error);
      res.status(500).json({ message: "Failed to complete challenge" });
    }
  });

  // Get challenge details
  app.get("/api/challenge/:id", isAuthenticated, async (req, res) => {
    try {
      const challengeId = parseInt(req.params.id);
      const challenge = await storage.getChallenge(challengeId);
      
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }

      res.json(challenge);
    } catch (error) {
      console.error("Error getting challenge:", error);
      res.status(500).json({ message: "Failed to get challenge" });
    }
  });

  // Create a custom challenge (for quick challenges)
  app.post("/api/challenge/create", isAuthenticated, async (req, res) => {
    try {
      const challengeData = req.body;
      const challenge = await storage.createChallenge(challengeData);
      res.json(challenge);
    } catch (error) {
      console.error("Error creating challenge:", error);
      res.status(500).json({ message: "Failed to create challenge" });
    }
  });

  // Development endpoint to sync UI structure (admin only)
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/dev/sync-ui-structure', isAuthenticated, async (req: any, res) => {
      try {
        // Check if user is admin
        const userId = req.user?.id || req.user?.claims?.sub;
        if (userId) {
          const user = await storage.getUser(userId);
          if (!user || user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Admin access required' });
          }
        }
        
        const { execSync } = await import('child_process');
        execSync('node scripts/sync_ui_structure.js', { cwd: process.cwd() });
        res.json({ success: true, message: 'UI structure synced' });
      } catch (error: any) {
        console.error('UI sync error:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });
  }

  // Mount admin routes with authentication
  app.use("/api/admin", isAuthenticated, adminRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
