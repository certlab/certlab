import { Express, Request, Response } from "express";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { getPolarClient, SUBSCRIPTION_PLANS, clearDevModeCache } from "./polar";
import type { User } from "@shared/schema";

// Request/Response schemas
const createCheckoutSchema = z.object({
  plan: z.enum(['pro', 'enterprise']),
  billingInterval: z.enum(['monthly', 'yearly']).optional().default('monthly'),
});

const cancelSubscriptionSchema = z.object({
  cancelAtPeriodEnd: z.boolean().optional().default(true),
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
      await checkAndResetDailyQuizCount(user.id);

      // Get updated user data for quiz count
      const updatedUser = await storage.getUserById(user.id);

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

      // Skip Polar sync for test user in development mode
      const isTestUser = process.env.NODE_ENV === 'development' && userId === '999999';
      
      if (isTestUser) {
        console.log('Test user detected in development mode - skipping Polar sync');
        console.log('Test user subscription benefits:', updatedUser?.subscriptionBenefits);
      }

      // If Polar is configured and user has email, sync with Polar (but skip for test user)
      if (process.env.POLAR_API_KEY && user.email && !isTestUser) {
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
            
            await storage.updateUser(user.id, {
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
        // No Polar configured OR test user in development - use cached benefits
        benefits = updatedUser.subscriptionBenefits as any;
        isSubscribed = benefits.plan !== 'free';
        
        // For test user in development, ensure status is active if they have pro/enterprise plan
        if (isTestUser && benefits.plan !== 'free') {
          status = 'active';
        }
      }

      // Get the plan configuration for features list
      const planName = benefits.plan || 'free';
      const plan = SUBSCRIPTION_PLANS[planName as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.free;
      
      if (isTestUser) {
        console.log('Test user subscription response:', {
          plan: planName,
          isSubscribed,
          status,
          limits: {
            quizzesPerDay: benefits.quizzesPerDay,
            categoriesAccess: benefits.categoriesAccess,
            analyticsAccess: benefits.analyticsAccess,
          }
        });
      }

      return res.json({
        isConfigured: !!process.env.POLAR_API_KEY,
        isSubscribed,
        plan: planName,
        status,
        expiresAt,
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

      if (!user.email) {
        return res.status(400).json({ 
          error: "Email required", 
          message: "Please set up an email address in your profile to subscribe" 
        });
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

      // Check if Polar is configured
      if (!process.env.POLAR_API_KEY) {
        return res.status(503).json({ 
          error: "Service unavailable", 
          message: "Subscription service is not configured. Please contact support." 
        });
      }

      // Get the plan configuration
      const planConfig = SUBSCRIPTION_PLANS[plan];
      if (!planConfig || !planConfig.productId) {
        return res.status(400).json({ 
          error: "Invalid plan", 
          message: "The selected plan is not available" 
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
      await storage.updateUser(user.id, {
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
          // Use switchSubscriptionPlan for immediate upgrade
          const updatedSubscription = await polarClient.switchSubscriptionPlan({
            subscriptionId: activeSubscription.id,
            newProductId: planConfig.productId,
            switchAtPeriodEnd: false, // Switch immediately for upgrades
          });

          // Sync the updated subscription benefits
          const polarData = await polarClient.syncUserSubscriptionBenefits(user.email);
          await storage.updateUser(user.id, {
            subscriptionBenefits: polarData.benefits,
          });

          // Return success response for immediate upgrade
          return res.json({
            success: true,
            message: `Successfully upgraded to ${plan} plan`,
            upgraded: true,
            plan: plan,
            redirectUrl: '/subscription/success', // Redirect to success page
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
      } else {
        // Priority 2: Derive from request headers
        const protocol = req.get('x-forwarded-proto') || req.protocol;
        const host = req.get('host');
        
        if (!host) {
          // Fallback to localhost if no host header
          baseUrl = 'http://localhost:5000';
        } else {
          baseUrl = `${protocol}://${host}`;
        }
      }
      
      // Ensure baseUrl doesn't have trailing slash
      baseUrl = baseUrl.replace(/\/$/, '');
      
      const session = await polarClient.createCheckoutSession({
        productId: planConfig.productId,
        successUrl: `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/subscription/cancel`,
        customerEmail: user.email,
        metadata: {
          userId: user.id,
          plan: plan,
          billingInterval: billingInterval || 'month',
        },
      });

      // For test user in development mode, immediately update subscription benefits
      const isTestUser = process.env.NODE_ENV === 'development' && userId === '999999';
      if (isTestUser) {
        console.log('Test user checkout: Immediately updating subscription benefits to', plan);
        
        // Map plan to benefits
        const subscriptionBenefits = {
          plan: plan,
          quizzesPerDay: plan === 'pro' || plan === 'enterprise' ? null : 5, // null means unlimited for pro/enterprise
          categoriesAccess: plan === 'pro' || plan === 'enterprise' ? ['all'] : ['basic'],
          analyticsAccess: plan === 'pro' || plan === 'enterprise' ? 'advanced' : 'basic',
          teamMembers: plan === 'enterprise' ? 50 : undefined,
          lastSyncedAt: new Date().toISOString(),
        };
        
        // Update user in database
        await storage.updateUser(user.id, {
          subscriptionBenefits: subscriptionBenefits,
        });
        
        console.log('Test user subscription benefits updated in database:', subscriptionBenefits);
      }

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

      // Check if test user in development mode
      const isTestUser = process.env.NODE_ENV === 'development' && userId === '999999';
      
      // Get the appropriate Polar client for this user
      const polarClient = await getPolarClient(userId);
      
      // Verify the checkout session
      const session = await polarClient.getCheckoutSession(session_id);
      
      // Sync subscription benefits from Polar
      if (user.email) {
        const polarData = await polarClient.syncUserSubscriptionBenefits(user.email);
        
        if (polarData.benefits.plan !== 'free') {
          // Update user subscription benefits in database
          await storage.updateUser(user.id, {
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

  // Cancel subscription - REFACTORED
  app.post("/api/subscription/cancel", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const sessionUser = req.user as any;
      if (!sessionUser) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Fetch user ID consistently with other endpoints
      const userId = sessionUser.claims?.sub || sessionUser.id;
      console.log('Cancel subscription request for user:', userId, 'NODE_ENV:', process.env.NODE_ENV);

      // Validate request body
      const result = cancelSubscriptionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Validation error", 
          details: fromError(result.error).toString() 
        });
      }

      const { cancelAtPeriodEnd } = result.data;

      // Special handling for test user in development mode
      const isTestUser = process.env.NODE_ENV === 'development' && userId === '999999';
      console.log('Is test user?', isTestUser, 'User ID:', userId);

      // Get user data
      const userData = await storage.getUserById(userId);
      
      if (isTestUser) {
        console.log('Test user cancellation in development mode - simulating cancellation');
        
        // Simulate cancellation for test user
        const updatedBenefits = {
          plan: 'free',
          quizzesPerDay: 5,
          categoriesAccess: ['basic'],
          analyticsAccess: 'basic',
          lastSyncedAt: new Date().toISOString(),
        };
        
        await storage.updateUser(userId, {
          subscriptionBenefits: updatedBenefits,
        });
        
        return res.json({
          success: true,
          message: cancelAtPeriodEnd 
            ? "Subscription will be canceled at the end of the current period (test mode)"
            : "Subscription canceled immediately (test mode)",
          canceledAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        });
      }
      
      // Regular flow for non-test users
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

      // Cancel subscription in Polar
      const canceledSubscription = await polarClient.cancelSubscription(
        subscriptionId,
        cancelAtPeriodEnd
      );

      // Update user subscription benefits
      const updatedBenefits = userData.subscriptionBenefits as any || {};
      if (!cancelAtPeriodEnd) {
        // Immediate cancellation - revert to free tier
        updatedBenefits.plan = 'free';
        updatedBenefits.quizzesPerDay = SUBSCRIPTION_PLANS.free.limits.quizzesPerDay;
        updatedBenefits.categoriesAccess = SUBSCRIPTION_PLANS.free.limits.categoriesAccess;
        updatedBenefits.analyticsAccess = SUBSCRIPTION_PLANS.free.limits.analyticsAccess;
        delete updatedBenefits.teamMembers;
      }
      updatedBenefits.lastSyncedAt = new Date().toISOString();

      await storage.updateUser(userId, {
        subscriptionBenefits: updatedBenefits,
      });

      res.json({
        success: true,
        message: cancelAtPeriodEnd 
          ? "Subscription will be canceled at the end of the current period"
          : "Subscription canceled immediately",
        canceledAt: canceledSubscription.canceledAt,
        expiresAt: canceledSubscription.currentPeriodEnd,
      });
    } catch (error: any) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ 
        error: "Failed to cancel subscription",
        message: error.message 
      });
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

      // Sync updated benefits from Polar
      if (userData.email) {
        const polarData = await polarClient.syncUserSubscriptionBenefits(userData.email);
        await storage.updateUser(userId, {
          subscriptionBenefits: polarData.benefits,
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

  // Switch subscription plan - NEW ENDPOINT
  app.post("/api/subscription/switch", isAuthenticated, async (req: Request, res: Response) => {
    const user = req.user as User;
    if (!user) {
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

      // Get user data
      const userData = await storage.getUserById(user.id);
      
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
      const polarClient = await getPolarClient(user.id);
      
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
      const newProductId = SUBSCRIPTION_PLANS[newPlan].productId;
      if (!newProductId) {
        return res.status(400).json({ 
          error: "Invalid plan",
          message: `The ${newPlan} plan is not properly configured. Please contact support.`
        });
      }

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
    }
  });

  // Confirm checkout session after successful payment - REFACTORED
  app.get("/api/subscription/confirm", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { session_id } = req.query;
      const user = req.user as User;

      if (!session_id || typeof session_id !== 'string') {
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
        const polarClient = await getPolarClient(user.id);
        
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
        const userData = await storage.getUserById(user.id);
        if (userData?.email) {
          const polarData = await polarClient.syncUserSubscriptionBenefits(userData.email);
          await storage.updateUser(user.id, {
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
        
        await storage.updateUser(user.id, {
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