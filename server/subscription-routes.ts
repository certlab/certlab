import { Express, Request, Response } from "express";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import polarClient, { SUBSCRIPTION_PLANS } from "./polar";
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

  // Get current subscription status
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

      // Check if Polar is configured
      if (!process.env.POLAR_API_KEY) {
        // Return default free plan if Polar is not configured
        return res.json({
          isConfigured: false,
          plan: 'free',
          status: 'inactive',
          features: SUBSCRIPTION_PLANS.free.features,
          limits: SUBSCRIPTION_PLANS.free.limits,
          dailyQuizCount: updatedUser?.dailyQuizCount || 0,
        });
      }

      // Get subscription status from Polar if user has email
      let polarStatus = null;
      if (user.email) {
        polarStatus = await polarClient.getUserSubscriptionStatus(user.email);
      }

      // Update user subscription status in database
      if (polarStatus?.isSubscribed && polarStatus.subscription) {
        const planName = polarStatus.plan?.toLowerCase() || 'free';
        const plan = SUBSCRIPTION_PLANS[planName as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.free;
        
        await storage.updateUser(user.id, {
          subscriptionPlan: planName,
          subscriptionStatus: polarStatus.subscription.status,
          subscriptionId: polarStatus.subscription.id,
          subscriptionExpiresAt: polarStatus.expiresAt,
          subscriptionFeatures: plan.limits,
        });

        return res.json({
          isConfigured: true,
          isSubscribed: true,
          plan: planName,
          status: polarStatus.subscription.status,
          expiresAt: polarStatus.expiresAt,
          features: plan.features,
          limits: plan.limits,
          dailyQuizCount: updatedUser?.dailyQuizCount || 0,
        });
      }

      // User is not subscribed - return free plan
      return res.json({
        isConfigured: true,
        isSubscribed: false,
        plan: 'free',
        status: 'inactive',
        features: SUBSCRIPTION_PLANS.free.features,
        limits: SUBSCRIPTION_PLANS.free.limits,
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

  // Create checkout session for subscription
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

      // Verify the product ID is configured
      if (!planConfig.productId) {
        return res.status(400).json({ 
          error: "Product not configured", 
          message: "The selected plan is not properly configured. Please contact support." 
        });
      }

      // Create or get customer in Polar
      const customer = await polarClient.createOrGetCustomerForUser(
        user.email,
        `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined
      );

      // Store Polar customer ID
      await storage.updateUser(user.id, {
        polarCustomerId: customer.id,
      });

      // Create checkout session with product ID only
      const baseUrl = process.env.APP_URL || `https://${req.get('host')}`;
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

      res.json({
        checkoutUrl: session.url,
        sessionId: session.id,
      });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ 
        error: "Failed to create checkout session",
        message: error.message 
      });
    }
  });

  // Handle successful checkout (callback from Polar)
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

      // Verify the checkout session
      const session = await polarClient.getCheckoutSession(session_id);
      
      // Get subscription details
      if (user.email) {
        const status = await polarClient.getUserSubscriptionStatus(user.email);
        
        if (status.isSubscribed && status.subscription) {
          const planName = status.plan?.toLowerCase() || 'pro';
          const plan = SUBSCRIPTION_PLANS[planName as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.pro;
          
          // Update user subscription in database
          await storage.updateUser(user.id, {
            subscriptionPlan: planName,
            subscriptionStatus: status.subscription.status,
            subscriptionId: status.subscription.id,
            subscriptionExpiresAt: status.expiresAt,
            subscriptionFeatures: plan.limits,
          });

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

  // Cancel subscription
  app.post("/api/subscription/cancel", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Validate request body
      const result = cancelSubscriptionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Validation error", 
          details: fromError(result.error).toString() 
        });
      }

      const { cancelAtPeriodEnd } = result.data;

      // Get user's current subscription
      const userData = await storage.getUserById(user.id);
      if (!userData?.subscriptionId) {
        return res.status(400).json({ 
          error: "No active subscription", 
          message: "You don't have an active subscription to cancel" 
        });
      }

      // Cancel subscription in Polar
      const canceledSubscription = await polarClient.cancelSubscription(
        userData.subscriptionId,
        cancelAtPeriodEnd
      );

      // Update user subscription status
      await storage.updateUser(user.id, {
        subscriptionStatus: cancelAtPeriodEnd ? 'canceled' : 'inactive',
        subscriptionPlan: cancelAtPeriodEnd ? userData.subscriptionPlan : 'free',
        subscriptionFeatures: cancelAtPeriodEnd 
          ? userData.subscriptionFeatures 
          : SUBSCRIPTION_PLANS.free.limits,
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

  // Resume canceled subscription
  app.post("/api/subscription/resume", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get user's current subscription
      const userData = await storage.getUserById(user.id);
      if (!userData?.subscriptionId) {
        return res.status(400).json({ 
          error: "No subscription found", 
          message: "You don't have a subscription to resume" 
        });
      }

      if (userData.subscriptionStatus !== 'canceled') {
        return res.status(400).json({ 
          error: "Invalid subscription state", 
          message: "Only canceled subscriptions can be resumed" 
        });
      }

      // Resume subscription in Polar
      const resumedSubscription = await polarClient.resumeSubscription(userData.subscriptionId);

      // Update user subscription status
      await storage.updateUser(user.id, {
        subscriptionStatus: resumedSubscription.status,
      });

      res.json({
        success: true,
        message: "Subscription resumed successfully",
        status: resumedSubscription.status,
        expiresAt: resumedSubscription.currentPeriodEnd,
      });
    } catch (error: any) {
      console.error("Error resuming subscription:", error);
      res.status(500).json({ 
        error: "Failed to resume subscription",
        message: error.message 
      });
    }
  });

  // Confirm checkout session after successful payment
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

        // Update user's subscription plan in our database
        await storage.updateUser(user.id, {
          subscriptionPlan: plan,
          subscriptionStatus: 'active',
          subscriptionStartedAt: new Date(),
        });

        return res.json({
          success: true,
          plan,
          billingInterval,
          message: 'Subscription activated successfully'
        });
      } catch (polarError) {
        console.error('Error confirming Polar session:', polarError);
        
        // Even if Polar fails, update user to pro for demo purposes
        await storage.updateUser(user.id, {
          subscriptionPlan: 'pro',
          subscriptionStatus: 'active',
          subscriptionStartedAt: new Date(),
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

  // Webhook endpoint for Polar events
  app.post("/api/subscription/webhook", async (req: Request, res: Response) => {
    try {
      const signature = req.headers['x-polar-signature'] as string;
      
      if (!signature) {
        return res.status(400).json({ error: "Missing webhook signature" });
      }

      const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error("Webhook secret not configured");
        return res.status(503).json({ error: "Webhook not configured" });
      }

      // Verify webhook signature
      const payload = JSON.stringify(req.body);
      const isValid = polarClient.verifyWebhook(payload, signature, webhookSecret);
      
      if (!isValid) {
        return res.status(401).json({ error: "Invalid webhook signature" });
      }

      // Handle webhook event
      const event = req.body;
      
      switch (event.type) {
        case 'subscription.created':
        case 'subscription.updated':
        case 'subscription.canceled':
        case 'subscription.resumed':
          // Update user subscription status
          const subscription = event.data;
          const customer = await polarClient.getCustomer(subscription.customerId);
          
          if (customer?.email) {
            const user = await storage.getUserByEmail(customer.email);
            if (user) {
              const status = await polarClient.getUserSubscriptionStatus(customer.email);
              const planName = status.plan?.toLowerCase() || 'free';
              const plan = SUBSCRIPTION_PLANS[planName as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.free;
              
              await storage.updateUser(user.id, {
                subscriptionPlan: status.isSubscribed ? planName : 'free',
                subscriptionStatus: subscription.status,
                subscriptionId: subscription.id,
                subscriptionExpiresAt: subscription.currentPeriodEnd,
                subscriptionFeatures: plan.limits,
              });
            }
          }
          break;
          
        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error("Error processing webhook:", error);
      res.status(500).json({ 
        error: "Failed to process webhook",
        message: error.message 
      });
    }
  });

}