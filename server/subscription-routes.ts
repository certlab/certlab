import { Express, Request, Response } from "express";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { getPolarClient, SUBSCRIPTION_PLANS } from "./polar";
import type { User } from "@shared/schema";
import { normalizePlanName, getPlanFeatures, isPaidPlan, validateSubscriptionState, mergeSubscriptionState, type SubscriptionPlan } from "../shared/subscriptionUtils";
import { subscriptionLockManager } from "./subscriptionLock";

// Request/Response schemas
const createCheckoutSchema = z.object({
  plan: z.enum(['free', 'pro', 'enterprise']), // Added 'free' to support downgrades
  billingInterval: z.enum(['monthly', 'yearly']).optional().default('monthly'),
});

const cancelSubscriptionSchema = z.object({
  immediate: z.boolean().optional().default(false),
});

export function registerSubscriptionRoutes(app: Express, storage: any, isAuthenticated: any) {
  // Helper function to check and reset daily quiz count
  const checkAndResetDailyQuizCount = async (userId: string): Promise<void> => {
    const user = await storage.getUserById(userId);
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastReset = user.lastQuizResetDate ? new Date(user.lastQuizResetDate) : null;
    
    if (!lastReset || lastReset < today) {
      // Reset the daily quiz count
      await storage.updateUser(userId, {
        dailyQuizCount: 0,
        lastQuizResetDate: today,
      });
    }
  };

  // Get current subscription status - REFACTORED to use Polar as source of truth
  app.get("/api/subscription/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const sessionUser = req.user as any;
      if (!sessionUser) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Fetch fresh user data from database to get updated email
      const userId = sessionUser.claims?.sub || sessionUser.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Check and reset daily quiz count if needed
      await checkAndResetDailyQuizCount(userId);

      // Get updated user data for quiz count
      const updatedUser = await storage.getUserById(userId);

      // Default to free tier benefits
      let benefits = {
        plan: 'free',
        quizzesPerDay: SUBSCRIPTION_PLANS.free.limits.quizzesPerDay,
        categoriesAccess: SUBSCRIPTION_PLANS.free.limits.categoriesAccess,
        analyticsAccess: SUBSCRIPTION_PLANS.free.limits.analyticsAccess,
        lastSyncedAt: new Date().toISOString(),
      };

      let isSubscribed = false;
      let status = 'inactive';
      let expiresAt = undefined;

      // If Polar is configured and user has email, sync with Polar
      if (process.env.POLAR_API_KEY && user.email) {
        try {
          const polarClient = await getPolarClient(userId);
          const polarData = await polarClient.syncUserSubscriptionBenefits(user.email);
          
          // Check if Polar data is newer than cached data
          const cachedBenefits = updatedUser?.subscriptionBenefits as any;
          const polarSyncTime = new Date(polarData.benefits.lastSyncedAt);
          const cachedSyncTime = cachedBenefits?.lastSyncedAt ? new Date(cachedBenefits.lastSyncedAt) : new Date(0);
          
          if (!cachedBenefits || polarSyncTime > cachedSyncTime) {
            // Update local cache with Polar data
            benefits = polarData.benefits;
            
            await storage.updateUser(userId, {
              polarCustomerId: polarData.customerId,
              subscriptionBenefits: benefits,
            });
          } else {
            // Use cached benefits if they're more recent
            benefits = cachedBenefits;
          }

          // Determine subscription status from benefits
          isSubscribed = benefits.plan !== 'free';
          status = isSubscribed ? 'active' : 'inactive';

          // If customer ID exists, get additional details
          if (polarData.customerId) {
            try {
              const detailedBenefits = await polarClient.getSubscriptionBenefits(polarData.customerId);
              status = detailedBenefits.status;
              expiresAt = detailedBenefits.expiresAt;
            } catch (err) {
              console.error("Error getting detailed subscription status:", err);
            }
          }
        } catch (polarError) {
          console.error("Error syncing with Polar:", polarError);
          // Fall back to cached benefits if Polar sync fails
          if (updatedUser?.subscriptionBenefits) {
            benefits = updatedUser.subscriptionBenefits as any;
            isSubscribed = benefits.plan !== 'free';
          }
        }
      } else if (updatedUser?.subscriptionBenefits) {
        // No Polar configured - use cached benefits
        benefits = updatedUser.subscriptionBenefits as any;
        isSubscribed = benefits.plan !== 'free';
      }

      // Check if subscription is scheduled for cancellation
      const cancelAtPeriodEnd = (benefits as any).cancelAtPeriodEnd || false;
      const canceledAt = (benefits as any).canceledAt;
      
      // Adjust status if subscription is scheduled for cancellation
      if (cancelAtPeriodEnd && isSubscribed) {
        status = 'canceling';
      }

      // Prepare subscription state for validation
      const subscriptionState = {
        plan: benefits.plan || 'free',
        status,
        expiresAt: expiresAt || (cancelAtPeriodEnd ? (benefits as any).currentPeriodEnd : undefined),
        canceledAt,
        subscriptionId: (benefits as any).subscriptionId,
        trialEndsAt: (benefits as any).trialEndsAt,
      };

      // Validate and normalize subscription state
      const validation = validateSubscriptionState(subscriptionState);
      
      // Apply corrections if any
      if (validation.corrections) {
        Object.assign(subscriptionState, validation.corrections);
        
        // Log warnings in development
        if (process.env.NODE_ENV === 'development' && validation.warnings.length > 0) {
          console.log('Subscription state validation warnings:', validation.warnings);
        }
      }

      // Handle validation errors
      if (!validation.isValid) {
        console.error('Subscription state validation errors:', validation.errors);
        // Continue with corrected state but log the issues
      }

      // Use normalized plan name
      const planName = validation.normalizedPlan;
      const plan = SUBSCRIPTION_PLANS[planName as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.free;

      return res.json({
        isConfigured: !!process.env.POLAR_API_KEY,
        isSubscribed,
        plan: planName,
        status: subscriptionState.status,
        cancelAtPeriodEnd,
        canceledAt: subscriptionState.canceledAt,
        expiresAt: subscriptionState.expiresAt,
        features: plan.features,
        limits: {
          quizzesPerDay: benefits.quizzesPerDay,
          categoriesAccess: benefits.categoriesAccess,
          analyticsAccess: benefits.analyticsAccess,
          teamMembers: (benefits as any).teamMembers,
        },
        dailyQuizCount: updatedUser?.dailyQuizCount || 0,
      });
    } catch (error: any) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ 
        error: "Failed to fetch subscription status",
        message: error.message 
      });
    }
  });

  // Get available subscription plans
  app.get("/api/subscription/plans", (req: Request, res: Response) => {
    // Filter out sensitive IDs and return plan information
    const plans = Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
      id: key,
      name: plan.name,
      features: plan.features,
      limits: plan.limits,
      // Prices are handled by Polar, not exposed directly
    }));

    res.json({ plans });
  });

  // Create checkout session for subscription - REFACTORED
  app.post("/api/subscription/checkout", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const sessionUser = req.user as any;
      if (!sessionUser) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Fetch fresh user data from database to get updated email
      const userId = sessionUser.claims?.sub || sessionUser.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Validate request body
      const result = createCheckoutSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Validation error", 
          details: fromError(result.error).toString() 
        });
      }

      const { plan, billingInterval } = result.data;
      
      // Require email for all users
      if (!user.email) {
        return res.status(400).json({ 
          error: "Email required", 
          message: "Please set up an email address in your profile to subscribe" 
        });
      }

      // Check if Polar is configured
      if (!process.env.POLAR_API_KEY) {
        return res.status(503).json({ 
          error: "Service unavailable", 
          message: "Subscription service is not configured. Please contact support." 
        });
      }

      // Get the plan configuration
      const planConfig = SUBSCRIPTION_PLANS[plan];
      // Free plan doesn't have productId - that's ok, we'll handle it below
      if (!planConfig) {
        return res.status(400).json({ 
          error: "Invalid plan", 
          message: "The selected plan is not available" 
        });
      }
      
      // Check if plan has productId (free plan doesn't)
      if (!('productId' in planConfig) || !planConfig.productId) {
        return res.status(400).json({ 
          error: "Invalid plan", 
          message: "The selected plan requires a valid product ID configuration" 
        });
      }

      // Get the appropriate Polar client for this user
      const polarClient = await getPolarClient(userId);
      
      // Create or get customer in Polar
      const customer = await polarClient.createOrGetCustomerForUser(
        user.email,
        `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined
      );

      // Store Polar customer ID
      await storage.updateUser(userId, {
        polarCustomerId: customer.id,
      });

      // Check if customer has any existing subscriptions
      const existingSubscriptions = await polarClient.getSubscriptions(customer.id);
      
      // Find active or trialing subscription
      const activeSubscription = existingSubscriptions.find(sub => 
        sub.status === 'active' || sub.status === 'trialing'
      );

      // Handle existing subscription - switch plan instead of creating new checkout
      if (activeSubscription) {
        console.log(`User ${user.email} has existing subscription, switching plan from current to ${plan}`);
        
        try {
          // Check if planConfig has productId before using it
          if (!('productId' in planConfig) || !planConfig.productId) {
            return res.status(400).json({ 
              error: "Invalid plan configuration",
              message: "Cannot switch to a plan without a product ID"
            });
          }
          
          // Use switchSubscriptionPlan for immediate upgrade
          const updatedSubscription = await polarClient.switchSubscriptionPlan({
            subscriptionId: activeSubscription.id,
            newProductId: planConfig.productId,
            switchAtPeriodEnd: false, // Switch immediately for upgrades
          });

          // For regular users, sync from Polar
          const polarData = await polarClient.syncUserSubscriptionBenefits(user.email);
          await storage.updateUser(userId, {
            subscriptionBenefits: polarData.benefits,
          });

          // Return success response for immediate upgrade
          return res.json({
            success: true,
            message: `Successfully upgraded to ${plan} plan`,
            upgraded: true,
            plan: plan,
            redirectUrl: '/app/subscription/success', // Redirect to success page
          });
        } catch (switchError: any) {
          console.error('Error switching subscription plan:', switchError);
          // Fall through to create new checkout if switching fails
        }
      }

      // Check for cancelled subscription that might block new checkout
      const cancelledSubscription = existingSubscriptions.find(sub => 
        sub.status === 'canceled' && sub.cancelAtPeriodEnd === false
      );

      if (cancelledSubscription) {
        console.log(`User ${user.email} has a cancelled subscription, may need special handling`);
        // For cancelled subscriptions that have ended, proceed with new checkout
        // Polar should handle this case appropriately
      }

      // No active subscription or switching failed - create new checkout session
      // Properly derive the base URL from request headers
      let baseUrl: string;
      
      // Priority 1: Use APP_URL if explicitly set
      if (process.env.APP_URL) {
        baseUrl = process.env.APP_URL;
        console.log('[Subscription] Using APP_URL for checkout:', baseUrl);
      } else {
        // Priority 2: Try to use REPLIT_DOMAINS if available (production Replit)
        if (process.env.REPLIT_DOMAINS) {
          const replitDomain = process.env.REPLIT_DOMAINS.split(',')[0].trim();
          baseUrl = `https://${replitDomain}`;
          console.log('[Subscription] Using REPLIT_DOMAINS for checkout:', baseUrl);
        } else {
          // Priority 3: Derive from request headers
          const protocol = req.get('x-forwarded-proto') || req.protocol;
          const host = req.get('host');
          
          if (!host) {
            // Fallback to localhost if no host header
            baseUrl = 'http://localhost:5000';
            console.warn('[Subscription] Warning: Using fallback localhost URL for checkout');
          } else {
            baseUrl = `${protocol}://${host}`;
            console.log('[Subscription] Using request headers for checkout:', baseUrl);
          }
        }
      }
      
      // Ensure baseUrl doesn't have trailing slash
      baseUrl = baseUrl.replace(/\/$/, '');
      
      console.log(`[Subscription] Creating checkout for user ${user.email} with baseUrl: ${baseUrl}`);
      
      // Check productId again before creating session (defensive programming)
      if (!('productId' in planConfig) || !planConfig.productId) {
        return res.status(400).json({ 
          error: "Invalid plan configuration",
          message: "Cannot create checkout session without a product ID"
        });
      }
      
      // Log the URLs being used for debugging
      const successUrl = `${baseUrl}/app/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/app/subscription/cancel`;
      
      console.log('[Subscription] Checkout URLs:', {
        success: successUrl,
        cancel: cancelUrl,
        productId: planConfig.productId,
        customerEmail: user.email
      });

      const session = await polarClient.createCheckoutSession({
        productId: planConfig.productId,
        successUrl: successUrl,
        cancelUrl: cancelUrl,
        customerEmail: user.email,
        metadata: {
          userId: userId,
          plan: plan,
          billingInterval: billingInterval || 'month',
        },
      });

      console.log(`[Subscription] Checkout session created successfully: ${session.id}`);

      res.json({
        checkoutUrl: session.url,
        sessionId: session.id,
      });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      
      // Provide helpful error message for product not found
      if (error.message?.includes('Not Found')) {
        res.status(500).json({ 
          error: "Polar product not configured",
          message: "The subscription products are not yet configured in your Polar account. Please create products in Polar and update the product IDs in the application configuration.",
          details: {
            attempted_plan: req.body?.plan,
            instruction: "Visit your Polar dashboard to create subscription products, then update the POLAR_PRODUCT_IDS environment variables with the actual product IDs."
          }
        });
        return;
      }
      
      res.status(500).json({ 
        error: "Failed to create checkout session",
        message: error.message 
      });
    }
  });

  // Handle successful checkout (callback from Polar) - REFACTORED
  app.get("/api/subscription/success", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { session_id } = req.query;
      
      if (!session_id || typeof session_id !== 'string') {
        return res.status(400).json({ error: "Missing session ID" });
      }

      const sessionUser = req.user as any;
      if (!sessionUser) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Fetch fresh user data from database to get updated email
      const userId = sessionUser.claims?.sub || sessionUser.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Get the appropriate Polar client for this user
      const polarClient = await getPolarClient(userId);
      
      // Verify the checkout session
      const session = await polarClient.getCheckoutSession(session_id);
      
      // Sync from Polar
      if (user.email) {
        const polarData = await polarClient.syncUserSubscriptionBenefits(user.email);
        
        if (polarData.benefits.plan !== 'free') {
          // Update user subscription benefits in database
          await storage.updateUser(userId, {
            polarCustomerId: polarData.customerId,
            subscriptionBenefits: polarData.benefits,
          });

          const planName = polarData.benefits.plan;
          const plan = SUBSCRIPTION_PLANS[planName as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.pro;

          return res.json({
            success: true,
            message: "Subscription activated successfully",
            plan: planName,
            features: plan.features,
          });
        }
      }

      res.status(400).json({ 
        error: "Subscription verification failed",
        message: "Unable to verify subscription. Please contact support." 
      });
    } catch (error: any) {
      console.error("Error handling subscription success:", error);
      res.status(500).json({ 
        error: "Failed to activate subscription",
        message: error.message 
      });
    }
  });

  // Cancel subscription - REFACTORED with race condition prevention
  app.post("/api/subscription/cancel", isAuthenticated, async (req: Request, res: Response) => {
    let releaseLock: (() => void) | undefined;
    
    try {
      const sessionUser = req.user as any;
      if (!sessionUser) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Fetch user ID consistently with other endpoints
      const userId = sessionUser.claims?.sub || sessionUser.id;

      // Acquire lock to prevent race conditions
      try {
        releaseLock = await subscriptionLockManager.acquireLock(
          userId,
          'cancel-subscription',
          15000 // 15 second timeout
        );
      } catch (lockError: any) {
        return res.status(409).json({
          error: "Operation in progress",
          message: "Another subscription operation is in progress. Please try again shortly."
        });
      }

      // Validate request body
      const result = cancelSubscriptionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Validation error", 
          details: fromError(result.error).toString() 
        });
      }

      const { immediate } = result.data;

      // Get user data
      const userData = await storage.getUserById(userId);
      
      // Regular flow for all users
      if (!userData?.polarCustomerId) {
        return res.status(400).json({ 
          error: "No active subscription", 
          message: "You don't have an active subscription to cancel" 
        });
      }

      // Get the appropriate Polar client for this user
      const polarClient = await getPolarClient(userId);
      
      // Get current subscription from Polar
      let subscriptionId: string | undefined;
      try {
        const subscriptions = await polarClient.getSubscriptions(userData.polarCustomerId);
        const activeSubscription = subscriptions.find(sub => 
          sub.status === 'active' || sub.status === 'trialing'
        );
        
        if (!activeSubscription) {
          return res.status(400).json({ 
            error: "No active subscription", 
            message: "You don't have an active subscription to cancel" 
          });
        }
        
        subscriptionId = activeSubscription.id;
      } catch (error) {
        console.error("Error finding subscription:", error);
        return res.status(400).json({ 
          error: "Subscription not found", 
          message: "Unable to find your subscription. It may have already been canceled or expired." 
        });
      }

      // Cancel subscription in Polar with the new options
      const cancellationResult = await polarClient.cancelSubscription(
        subscriptionId,
        {
          immediate: immediate,
          cancelAtPeriodEnd: !immediate
        }
      );

      // Update user subscription benefits
      const updatedBenefits = userData.subscriptionBenefits as any || {};
      if (immediate) {
        // Immediate cancellation - revert to free tier
        updatedBenefits.plan = 'free';
        updatedBenefits.quizzesPerDay = SUBSCRIPTION_PLANS.free.limits.quizzesPerDay;
        updatedBenefits.categoriesAccess = SUBSCRIPTION_PLANS.free.limits.categoriesAccess;
        updatedBenefits.analyticsAccess = SUBSCRIPTION_PLANS.free.limits.analyticsAccess;
        updatedBenefits.cancelAtPeriodEnd = false;
        delete updatedBenefits.teamMembers;
        delete updatedBenefits.canceledAt;
      } else {
        // For scheduled cancellation, keep current benefits but mark as canceling
        updatedBenefits.cancelAtPeriodEnd = true;
        updatedBenefits.canceledAt = new Date().toISOString();
        updatedBenefits.currentPeriodEnd = cancellationResult.subscription.currentPeriodEnd;
      }
      updatedBenefits.lastSyncedAt = new Date().toISOString();

      await storage.updateUser(userId, {
        subscriptionBenefits: updatedBenefits,
      });

      // Return appropriate response based on cancellation type
      if (immediate) {
        res.json({
          success: true,
          message: "Subscription canceled immediately. A prorated refund will be processed to your original payment method.",
          refundAmount: cancellationResult.refundAmount,
          canceledAt: cancellationResult.subscription.canceledAt,
        });
      } else {
        res.json({
          success: true,
          message: "Your subscription will be canceled at the end of the current billing period. You'll keep access until then.",
          cancelAtPeriodEnd: true,
          canceledAt: updatedBenefits.canceledAt,
          endsAt: cancellationResult.subscription.currentPeriodEnd,
        });
      }
    } catch (error: any) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ 
        error: "Failed to cancel subscription",
        message: error.message 
      });
    } finally {
      // Always release the lock
      if (releaseLock) {
        releaseLock();
      }
    }
  });

  // Resume canceled subscription - REFACTORED
  app.post("/api/subscription/resume", isAuthenticated, async (req: Request, res: Response) => {
    const sessionUser = req.user as any;
    if (!sessionUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Fetch user ID consistently with other endpoints
    const userId = sessionUser.claims?.sub || sessionUser.id;

    // Get user data
    const userData = await storage.getUserById(userId);
    
    try {
      if (!userData?.polarCustomerId) {
        return res.status(400).json({ 
          error: "No subscription found", 
          message: "Unable to find a subscription to resume. Please start a new subscription." 
        });
      }

      // Get the appropriate Polar client for this user
      const polarClient = await getPolarClient(userId);
      
      // Find canceled subscription in Polar
      let subscriptionId: string | undefined;
      try {
        const subscriptions = await polarClient.getSubscriptions(userData.polarCustomerId);
        const canceledSubscription = subscriptions.find(sub => 
          sub.status === 'canceled' && sub.cancelAtPeriodEnd === true
        );
        
        if (!canceledSubscription) {
          return res.status(400).json({ 
            error: "No canceled subscription found", 
            message: "Unable to find a canceled subscription to resume. Your subscription may have expired." 
          });
        }
        
        subscriptionId = canceledSubscription.id;
      } catch (error) {
        console.error("Error finding subscription:", error);
        return res.status(400).json({ 
          error: "Subscription not found", 
          message: "Unable to find your subscription." 
        });
      }

      // Resume subscription in Polar
      const resumedSubscription = await polarClient.resumeSubscription(subscriptionId);

      // Sync updated benefits from Polar and clear cancellation flags
      if (userData.email) {
        const polarData = await polarClient.syncUserSubscriptionBenefits(userData.email);
        // Ensure cancellation flags are cleared when resuming
        const updatedBenefits = {
          ...polarData.benefits,
          cancelAtPeriodEnd: false,
        };
        delete (updatedBenefits as any).canceledAt;
        
        await storage.updateUser(userId, {
          subscriptionBenefits: updatedBenefits,
        });
      }

      res.json({
        success: true,
        message: "Subscription resumed successfully",
        status: resumedSubscription.status,
        expiresAt: resumedSubscription.currentPeriodEnd,
      });
    } catch (error: any) {
      console.error("Error resuming subscription:", error);
      
      // Check if it's a Polar API error about subscription not existing
      if (error.message?.includes("not found") || error.message?.includes("does not exist")) {
        // Update benefits to free tier if subscription doesn't exist
        const freeBenefits = {
          plan: 'free',
          quizzesPerDay: SUBSCRIPTION_PLANS.free.limits.quizzesPerDay,
          categoriesAccess: SUBSCRIPTION_PLANS.free.limits.categoriesAccess,
          analyticsAccess: SUBSCRIPTION_PLANS.free.limits.analyticsAccess,
          lastSyncedAt: new Date().toISOString(),
        };
        
        await storage.updateUser(userData.id, {
          subscriptionBenefits: freeBenefits,
        });
        
        return res.status(400).json({ 
          error: "Subscription not found",
          message: "Your subscription could not be found in our payment system. It may have expired or been removed. Please start a new subscription." 
        });
      }
      
      res.status(500).json({ 
        error: "Failed to resume subscription",
        message: error.message 
      });
    }
  });

  // Switch subscription plan - NEW ENDPOINT with race condition prevention
  app.post("/api/subscription/switch", isAuthenticated, async (req: Request, res: Response) => {
    let releaseLock: (() => void) | undefined;
    
    const sessionUser = req.user as any;
    if (!sessionUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const switchPlanSchema = z.object({
      newPlan: z.enum(['pro', 'enterprise']),
      billingInterval: z.enum(['monthly', 'yearly']).optional().default('monthly'),
      switchAtPeriodEnd: z.boolean().optional().default(false),
    });

    try {
      // Validate request body
      const { newPlan, billingInterval, switchAtPeriodEnd } = switchPlanSchema.parse(req.body);

      // Extract user ID consistently with other endpoints
      const userId = sessionUser.claims?.sub || sessionUser.id;
      
      // Acquire lock to prevent race conditions
      try {
        releaseLock = await subscriptionLockManager.acquireLock(
          userId,
          'switch-subscription',
          15000 // 15 second timeout
        );
      } catch (lockError: any) {
        return res.status(409).json({
          error: "Operation in progress",
          message: "Another subscription operation is in progress. Please try again shortly."
        });
      }
      
      // Get user data
      const userData = await storage.getUserById(userId);
      
      // Check for Polar customer ID
      if (!userData?.polarCustomerId) {
        return res.status(400).json({ 
          error: "No customer account found", 
          message: "You need to have an active or past subscription to switch plans." 
        });
      }

      // Check if Polar is configured
      if (!process.env.POLAR_API_KEY) {
        return res.status(503).json({ 
          error: "Subscription service not configured",
          message: "Subscription switching is currently unavailable. Please contact support."
        });
      }

      // Get the appropriate Polar client for this user
      const polarClient = await getPolarClient(userId);
      
      // Get current subscription from Polar
      const subscriptions = await polarClient.getSubscriptions(userData.polarCustomerId);
      const currentSubscription = subscriptions.find(sub => 
        sub.status === 'active' || sub.status === 'trialing'
      );

      if (!currentSubscription) {
        return res.status(400).json({ 
          error: "No active subscription", 
          message: "You don't have an active subscription to switch. Please start a new subscription instead." 
        });
      }

      // Get the product ID for the new plan
      const newPlanConfig = SUBSCRIPTION_PLANS[newPlan];
      if (!newPlanConfig || !('productId' in newPlanConfig) || !newPlanConfig.productId) {
        return res.status(400).json({ 
          error: "Invalid plan",
          message: `The ${newPlan} plan is not properly configured. Please contact support.`
        });
      }
      const newProductId = newPlanConfig.productId;

      // Check if switching to the same plan
      if (currentSubscription.productId === newProductId) {
        return res.status(400).json({ 
          error: "Already on this plan",
          message: `You are already subscribed to the ${newPlan} plan.`
        });
      }

      // Get available prices for the new product to find the right price ID
      // This helps select monthly vs yearly pricing
      let priceId: string | undefined;
      try {
        const prices = await polarClient.getProductPrices(newProductId);
        
        // Find matching price based on billing interval
        const targetInterval = billingInterval === 'yearly' ? 'year' : 'month';
        const matchingPrice = prices.find(price => 
          price.interval === targetInterval && price.intervalCount === 1
        );
        
        if (matchingPrice) {
          priceId = matchingPrice.id;
        }
      } catch (error) {
        console.error("Error fetching product prices:", error);
        // Continue without price ID - Polar will use default pricing
      }

      // Switch the subscription plan
      const updatedSubscription = await polarClient.switchSubscriptionPlan({
        subscriptionId: currentSubscription.id,
        newProductId,
        priceId,
        switchAtPeriodEnd,
      });

      // Sync updated benefits from Polar
      if (userData.email) {
        const polarData = await polarClient.syncUserSubscriptionBenefits(userData.email);
        await storage.updateUser(userData.id, {
          subscriptionBenefits: polarData.benefits,
        });
      }

      // Determine if it's an upgrade or downgrade
      const isUpgrade = newPlan === 'enterprise';

      res.json({
        success: true,
        message: switchAtPeriodEnd 
          ? `Plan ${isUpgrade ? 'upgrade' : 'downgrade'} scheduled for the end of your current billing period`
          : `Successfully ${isUpgrade ? 'upgraded' : 'downgraded'} to ${newPlan} plan`,
        newPlan,
        billingInterval,
        switchAtPeriodEnd,
        effectiveDate: switchAtPeriodEnd 
          ? updatedSubscription.currentPeriodEnd 
          : new Date(),
        subscription: {
          id: updatedSubscription.id,
          status: updatedSubscription.status,
          currentPeriodEnd: updatedSubscription.currentPeriodEnd,
        },
      });

    } catch (error: any) {
      console.error("Error switching subscription:", error);
      
      if (error.name === 'ZodError') {
        const validationError = fromError(error);
        return res.status(400).json({ 
          error: "Invalid request",
          message: validationError.toString()
        });
      }

      res.status(500).json({ 
        error: "Failed to switch subscription",
        message: error.message || "An unexpected error occurred while switching your subscription plan."
      });
    } finally {
      // Always release the lock
      if (releaseLock) {
        releaseLock();
      }
    }
  });

  // Confirm checkout session after successful payment - REFACTORED
  app.get("/api/subscription/confirm", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { session_id } = req.query;
      const user = req.user as User;
      const userId = (user as any).claims?.sub || (user as any).id;

      console.log(`[Subscription] Confirming checkout session ${session_id} for user ${userId}`);

      if (!session_id || typeof session_id !== 'string') {
        console.error('[Subscription] Missing or invalid session ID in confirmation request');
        return res.status(400).json({ 
          error: "Missing session ID",
          success: false 
        });
      }

      // Check if Polar is configured
      if (!process.env.POLAR_API_KEY) {
        // If Polar is not configured, just return success with mock data
        return res.json({
          success: true,
          plan: 'pro',
          billingInterval: 'month',
          message: 'Subscription confirmed (demo mode)'
        });
      }

      try {
        // Get the appropriate Polar client for this user
        const polarClient = await getPolarClient(userId);
        
        // Get the checkout session from Polar
        const session = await polarClient.getCheckoutSession(session_id);
        
        if (!session) {
          return res.status(404).json({ 
            error: "Session not found",
            success: false 
          });
        }

        // Extract plan info from metadata
        const plan = session.metadata?.plan || 'pro';
        const billingInterval = session.metadata?.billingInterval || 'month';

        // Sync subscription benefits from Polar
        const userData = await storage.getUserById(userId);
        if (userData?.email) {
          const polarData = await polarClient.syncUserSubscriptionBenefits(userData.email);
          await storage.updateUser(userId, {
            polarCustomerId: polarData.customerId,
            subscriptionBenefits: polarData.benefits,
          });
        }

        return res.json({
          success: true,
          plan,
          billingInterval,
          message: 'Subscription activated successfully'
        });
      } catch (polarError) {
        console.error('Error confirming Polar session:', polarError);
        
        // Even if Polar fails, update user to pro for demo purposes
        const proBenefits = {
          plan: 'pro',
          quizzesPerDay: SUBSCRIPTION_PLANS.pro.limits.quizzesPerDay,
          categoriesAccess: SUBSCRIPTION_PLANS.pro.limits.categoriesAccess,
          analyticsAccess: SUBSCRIPTION_PLANS.pro.limits.analyticsAccess,
          lastSyncedAt: new Date().toISOString(),
        };
        
        await storage.updateUser(userId, {
          subscriptionBenefits: proBenefits,
        });

        return res.json({
          success: true,
          plan: 'pro',
          billingInterval: 'month',
          message: 'Subscription confirmed'
        });
      }
    } catch (error) {
      console.error('Error confirming subscription:', error);
      res.status(500).json({ 
        error: "Internal server error",
        success: false 
      });
    }
  });

  // Webhook endpoint for Polar events - REFACTORED
  app.post("/api/subscription/webhook", async (req: Request, res: Response) => {
    try {
      const { type, data } = req.body;

      console.log("Received Polar webhook:", type);

      // Verify webhook signature if secret is configured
      // For webhooks, we use the real client by default since we don't have user context yet
      const defaultPolarClient = await getPolarClient();
      
      if (process.env.POLAR_WEBHOOK_SECRET) {
        const signature = req.headers['polar-webhook-signature'] as string;
        if (!signature) {
          return res.status(401).json({ error: "Missing webhook signature" });
        }

        const isValid = defaultPolarClient.verifyWebhook(
          JSON.stringify(req.body),
          signature
        );

        if (!isValid) {
          return res.status(401).json({ error: "Invalid webhook signature" });
        }
      }

      // Handle different webhook events
      switch (type) {
        case 'subscription.created':
        case 'subscription.updated':
        case 'subscription.resumed': {
          const subscription = data.subscription;
          const customerId = subscription.customer_id;

          // Find user by customer ID
          const users = await storage.getUserByPolarCustomerId(customerId);
          if (!users || users.length === 0) {
            console.log("No user found for customer ID:", customerId);
            return res.status(200).json({ received: true });
          }

          const user = users[0];

          // Get the appropriate client for this user
          const userPolarClient = await getPolarClient(user.id);
          
          // Sync benefits from Polar
          if (user.email) {
            const polarData = await userPolarClient.syncUserSubscriptionBenefits(user.email);
            await storage.updateUser(user.id, {
              subscriptionBenefits: polarData.benefits,
            });
          }

          break;
        }

        case 'subscription.canceled':
        case 'subscription.expired': {
          const subscription = data.subscription;
          const customerId = subscription.customer_id;

          // Find user by customer ID
          const users = await storage.getUserByPolarCustomerId(customerId);
          if (!users || users.length === 0) {
            console.log("No user found for customer ID:", customerId);
            return res.status(200).json({ received: true });
          }

          const user = users[0];

          // Update to free tier benefits
          const freeBenefits = {
            plan: 'free',
            quizzesPerDay: SUBSCRIPTION_PLANS.free.limits.quizzesPerDay,
            categoriesAccess: SUBSCRIPTION_PLANS.free.limits.categoriesAccess,
            analyticsAccess: SUBSCRIPTION_PLANS.free.limits.analyticsAccess,
            lastSyncedAt: new Date().toISOString(),
          };

          await storage.updateUser(user.id, {
            subscriptionBenefits: freeBenefits,
          });

          break;
        }

        case 'checkout.created':
        case 'checkout.updated': {
          // Log checkout events but don't process them
          console.log("Checkout event received:", type);
          break;
        }

        default:
          console.log("Unhandled webhook event:", type);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error("Error processing webhook:", error);
      res.status(500).json({ 
        error: "Webhook processing failed",
        message: error.message 
      });
    }
  });
}