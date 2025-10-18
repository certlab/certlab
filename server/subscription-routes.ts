import { Express, Request, Response } from "express";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { getPolarClient, SUBSCRIPTION_PLANS, getPriceId, getProductId, getPlanFromProductId } from "./polar";
import type { User } from "@shared/schema";
import { normalizePlanName, getPlanFeatures, isPaidPlan, validateSubscriptionState, mergeSubscriptionState, type SubscriptionPlan } from "../shared/subscriptionUtils";
import { subscriptionLockManager } from "./subscriptionLock";

// Request/Response schemas
const createCheckoutSchema = z.object({
  plan: z.enum(['pro', 'enterprise']), // Checkout only for paid plans; free downgrades use /switch endpoint
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

  // Get current subscription status - DATABASE-FIRST approach
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
      let status = 'active'; // Free plan is always active
      let expiresAt = undefined;

      // FIRST: Check database for active subscription
      const dbSubscription = await storage.getSubscriptionByUserId(userId);
      
      // Check if we have a recent subscription in database (within last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const shouldSyncWithPolar = !dbSubscription || 
        !dbSubscription.updatedAt || 
        new Date(dbSubscription.updatedAt) < oneHourAgo;

      // If user has no database subscription, check if they have free tier benefits
      // Free tier users won't have a database subscription, so use their benefits directly
      if (!dbSubscription && updatedUser?.subscriptionBenefits?.plan === 'free') {
        console.log(`[Subscription Status] User ${userId} on free tier (no Polar subscription)`);
        benefits = updatedUser.subscriptionBenefits as any;
        isSubscribed = false;
        status = 'active'; // Free plan is always active
        
        // Skip Polar sync for confirmed free tier users
      } else if (dbSubscription && !shouldSyncWithPolar) {
        // Use database subscription data as source of truth
        console.log(`[Subscription Status] Using cached database subscription for user ${userId}`);
        
        // Verify the plan matches the product ID (data integrity check)
        let planName = dbSubscription.plan || 'free';
        if (dbSubscription.productId) {
          const planFromProduct = getPlanFromProductId(dbSubscription.productId);
          if (planFromProduct !== planName) {
            console.warn(`[Subscription Status] Plan mismatch detected: DB shows '${planName}' but product ID indicates '${planFromProduct}'. Correcting to '${planFromProduct}'.`);
            planName = planFromProduct;
            
            // Fix the database record
            await storage.updateSubscription(dbSubscription.id, { plan: planFromProduct });
          }
        }
        
        const plan = SUBSCRIPTION_PLANS[planName as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.free;
        benefits = {
          plan: planName,
          quizzesPerDay: plan.limits.quizzesPerDay,
          categoriesAccess: plan.limits.categoriesAccess,
          analyticsAccess: plan.limits.analyticsAccess,
          lastSyncedAt: dbSubscription.updatedAt?.toISOString() || new Date().toISOString(),
        };
        
        isSubscribed = dbSubscription.status === 'active' || dbSubscription.status === 'trialing';
        status = dbSubscription.status || 'inactive';
        expiresAt = dbSubscription.currentPeriodEnd?.toISOString();
        
        // Also update user's cached benefits for consistency
        await storage.updateUser(userId, {
          subscriptionBenefits: {
            ...benefits,
            subscriptionId: dbSubscription.id,
            polarSubscriptionId: dbSubscription.polarSubscriptionId,
            cancelAtPeriodEnd: dbSubscription.cancelAtPeriodEnd,
            canceledAt: dbSubscription.canceledAt?.toISOString(),
            currentPeriodEnd: dbSubscription.currentPeriodEnd?.toISOString(),
            trialEndsAt: dbSubscription.trialEndsAt?.toISOString(),
          },
        });
      } else if (user.email) {
        // Check if Polar is configured (works for both sandbox and production)
        const isDev = process.env.NODE_ENV === 'development' || 
                     process.env.NODE_ENV === 'dev' ||
                     (process.env.NODE_ENV === undefined && process.env.POLAR_SANDBOX_API_KEY !== undefined);
        
        const polarConfigured = isDev 
          ? !!process.env.POLAR_SANDBOX_API_KEY
          : !!process.env.POLAR_PRODUCTION_API_KEY;
        
        if (polarConfigured) {
          // Database data is stale or missing - sync with Polar
          console.log(`[Subscription Status] Syncing with Polar for user ${userId} (data ${shouldSyncWithPolar ? 'stale' : 'missing'})`);
          
          try {
            const polarClient = await getPolarClient(userId);
            const polarData = await polarClient.syncUserSubscriptionBenefits(user.email);
          
          // Update user with Polar customer ID and benefits
          benefits = polarData.benefits;
          
          await storage.updateUser(userId, {
            polarCustomerId: polarData.customerId,
            subscriptionBenefits: benefits,
          });

          // If we have a Polar subscription, update or create database record
          if (polarData.customerId) {
            try {
              const detailedBenefits = await polarClient.getSubscriptionBenefits(polarData.customerId);
              status = detailedBenefits.status;
              expiresAt = detailedBenefits.expiresAt;
              
              // Get the active subscription from Polar to update database
              const subscriptions = await polarClient.getSubscriptions(polarData.customerId);
              const activeSubscription = subscriptions.find(sub => 
                sub.status === 'active' || sub.status === 'trialing'
              );
              
              if (activeSubscription) {
                // Update or create subscription in database
                // Handle both camelCase and snake_case from Polar API
                const sub = activeSubscription as any;
                const productId = sub.productId || sub.product_id;
                
                // Determine plan from product ID (source of truth)
                const planFromProduct = getPlanFromProductId(productId);
                
                const subscriptionData = {
                  userId: userId,
                  polarSubscriptionId: sub.id,
                  polarCustomerId: polarData.customerId,
                  productId: productId,
                  priceId: sub.priceId || sub.price_id,
                  status: sub.status,
                  plan: planFromProduct, // Use product ID as source of truth
                  billingInterval: sub.billingInterval || sub.recurring_interval || 'month',
                  currentPeriodStart: sub.currentPeriodStart || sub.current_period_start ? new Date(sub.currentPeriodStart || sub.current_period_start) : new Date(),
                  currentPeriodEnd: sub.currentPeriodEnd || sub.current_period_end ? new Date(sub.currentPeriodEnd || sub.current_period_end) : new Date(),
                  trialEndsAt: sub.trialEndsAt || sub.trial_ends_at ? new Date(sub.trialEndsAt || sub.trial_ends_at) : undefined,
                  cancelAtPeriodEnd: sub.cancelAtPeriodEnd !== undefined ? sub.cancelAtPeriodEnd : (sub.cancel_at_period_end || false),
                  canceledAt: sub.canceledAt || sub.canceled_at ? new Date(sub.canceledAt || sub.canceled_at) : undefined,
                  metadata: {
                    syncedFromPolar: true,
                    syncedAt: new Date().toISOString(),
                  },
                };
                
                if (dbSubscription) {
                  await storage.updateSubscription(dbSubscription.id, subscriptionData);
                } else {
                  await storage.createSubscription(subscriptionData);
                }
                
                // Update benefits to match the correct plan from product ID
                const correctPlan = SUBSCRIPTION_PLANS[planFromProduct as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.free;
                benefits = {
                  plan: planFromProduct,
                  quizzesPerDay: correctPlan.limits.quizzesPerDay,
                  categoriesAccess: correctPlan.limits.categoriesAccess,
                  analyticsAccess: correctPlan.limits.analyticsAccess,
                  lastSyncedAt: new Date().toISOString(),
                };
              }
            } catch (err: any) {
              console.error("Error getting detailed subscription status:", err);
            }
          }

          // Determine subscription status from benefits
          isSubscribed = benefits.plan !== 'free';
          status = isSubscribed ? 'active' : 'inactive';
        } catch (polarError: any) {
          console.error("Error syncing with Polar:", polarError);
          // Fall back to cached benefits if Polar sync fails
          if (updatedUser?.subscriptionBenefits) {
            benefits = updatedUser.subscriptionBenefits as any;
            isSubscribed = benefits.plan !== 'free';
          }
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

      // Check if Polar is configured based on environment
      const envIsDev = process.env.NODE_ENV === 'development' || 
                      process.env.NODE_ENV === 'dev' ||
                      (process.env.NODE_ENV === undefined && process.env.POLAR_SANDBOX_API_KEY !== undefined);
      
      const polarApiConfigured = envIsDev 
        ? !!process.env.POLAR_SANDBOX_API_KEY
        : !!process.env.POLAR_API_KEY;

      return res.json({
        isConfigured: polarApiConfigured,
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

  // Get current subscription details - DATABASE-FIRST approach
  app.get("/api/subscription/current", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const sessionUser = req.user as any;
      if (!sessionUser) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const userId = sessionUser.claims?.sub || sessionUser.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // FIRST: Check database for active subscription
      const dbSubscription = await storage.getSubscriptionByUserId(userId);
      
      // Check if we have a recent subscription in database (within last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const shouldSyncWithPolar = !dbSubscription || 
        !dbSubscription.updatedAt || 
        new Date(dbSubscription.updatedAt) < oneHourAgo;

      if (dbSubscription && !shouldSyncWithPolar) {
        // Use database subscription data as source of truth
        console.log(`[Subscription Current] Using cached database subscription for user ${userId}`);
        
        return res.json({
          subscription: {
            id: dbSubscription.id,
            polarSubscriptionId: dbSubscription.polarSubscriptionId,
            plan: dbSubscription.plan,
            status: dbSubscription.status,
            billingInterval: dbSubscription.billingInterval,
            currentPeriodStart: dbSubscription.currentPeriodStart?.toISOString(),
            currentPeriodEnd: dbSubscription.currentPeriodEnd?.toISOString(),
            trialEndsAt: dbSubscription.trialEndsAt?.toISOString(),
            cancelAtPeriodEnd: dbSubscription.cancelAtPeriodEnd,
            canceledAt: dbSubscription.canceledAt?.toISOString(),
            updatedAt: dbSubscription.updatedAt?.toISOString(),
          },
          fromCache: true,
        });
      }

      // Database data is stale or missing - sync with Polar if configured
      const isDev = process.env.NODE_ENV === 'development' || 
                   process.env.NODE_ENV === 'dev' ||
                   (process.env.NODE_ENV === undefined && process.env.POLAR_SANDBOX_API_KEY !== undefined);
      
      const polarConfigured = isDev 
        ? !!process.env.POLAR_SANDBOX_API_KEY
        : !!process.env.POLAR_API_KEY;
      
      if (polarConfigured && user.email) {
        console.log(`[Subscription Current] Syncing with Polar for user ${userId} (data ${shouldSyncWithPolar ? 'stale' : 'missing'})`);
        
        try {
          const polarClient = await getPolarClient(userId);
          
          // Get customer ID first
          const customer = await polarClient.getCustomerByEmail(user.email);
          if (!customer) {
            return res.json({ subscription: null, message: "No subscription found" });
          }

          const customerId = customer.id;
          
          // Get active subscription from Polar
          const subscriptions = await polarClient.getSubscriptions(customerId);
          const activeSubscription = subscriptions.find(sub => 
            sub.status === 'active' || sub.status === 'trialing'
          );
          
          if (!activeSubscription) {
            return res.json({ subscription: null, message: "No active subscription found" });
          }

          // Determine plan from product ID (handle both camelCase and snake_case)
          const sub = activeSubscription as any;
          const productId = sub.productId || sub.product_id;
          const planName = getPlanFromProductId(productId);

          // Update or create subscription in database
          const subscriptionData = {
            userId: userId,
            polarSubscriptionId: sub.id,
            polarCustomerId: customerId,
            productId: productId,
            priceId: sub.priceId || sub.price_id,
            status: sub.status,
            plan: planName,
            billingInterval: sub.billingInterval || sub.recurring_interval || 'month',
            currentPeriodStart: sub.currentPeriodStart || sub.current_period_start ? new Date(sub.currentPeriodStart || sub.current_period_start) : new Date(),
            currentPeriodEnd: sub.currentPeriodEnd || sub.current_period_end ? new Date(sub.currentPeriodEnd || sub.current_period_end) : new Date(),
            trialEndsAt: sub.trialEndsAt || sub.trial_ends_at ? new Date(sub.trialEndsAt || sub.trial_ends_at) : undefined,
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd !== undefined ? sub.cancelAtPeriodEnd : (sub.cancel_at_period_end || false),
            canceledAt: sub.canceledAt || sub.canceled_at ? new Date(sub.canceledAt || sub.canceled_at) : undefined,
            metadata: {
              syncedFromPolar: true,
              syncedAt: new Date().toISOString(),
            },
          };
          
          let savedSubscription;
          if (dbSubscription) {
            savedSubscription = await storage.updateSubscription(dbSubscription.id, subscriptionData);
          } else {
            savedSubscription = await storage.createSubscription(subscriptionData);
          }

          return res.json({
            subscription: {
              id: savedSubscription?.id,
              polarSubscriptionId: savedSubscription?.polarSubscriptionId,
              plan: savedSubscription?.plan,
              status: savedSubscription?.status,
              billingInterval: savedSubscription?.billingInterval,
              currentPeriodStart: savedSubscription?.currentPeriodStart?.toISOString(),
              currentPeriodEnd: savedSubscription?.currentPeriodEnd?.toISOString(),
              trialEndsAt: savedSubscription?.trialEndsAt?.toISOString(),
              cancelAtPeriodEnd: savedSubscription?.cancelAtPeriodEnd,
              canceledAt: savedSubscription?.canceledAt?.toISOString(),
              updatedAt: savedSubscription?.updatedAt?.toISOString(),
            },
            fromCache: false,
          });
        } catch (error: any) {
          console.error("Error fetching subscription from Polar:", error);
          
          // If Polar fails but we have database data, return it
          if (dbSubscription) {
            return res.json({
              subscription: {
                id: dbSubscription.id,
                polarSubscriptionId: dbSubscription.polarSubscriptionId,
                plan: dbSubscription.plan,
                status: dbSubscription.status,
                billingInterval: dbSubscription.billingInterval,
                currentPeriodStart: dbSubscription.currentPeriodStart?.toISOString(),
                currentPeriodEnd: dbSubscription.currentPeriodEnd?.toISOString(),
                trialEndsAt: dbSubscription.trialEndsAt?.toISOString(),
                cancelAtPeriodEnd: dbSubscription.cancelAtPeriodEnd,
                canceledAt: dbSubscription.canceledAt?.toISOString(),
                updatedAt: dbSubscription.updatedAt?.toISOString(),
              },
              fromCache: true,
              warning: "Unable to sync with Polar, using cached data",
            });
          }
          
          return res.status(500).json({ 
            error: "Failed to fetch subscription",
            message: "Unable to retrieve subscription information" 
          });
        }
      }

      // No Polar configured and no database subscription
      return res.json({ subscription: null, message: "No subscription service configured" });
    } catch (error: any) {
      console.error("Error fetching current subscription:", error);
      res.status(500).json({ 
        error: "Failed to fetch subscription",
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

  // Create checkout session for subscription - ENHANCED
  app.post("/api/subscription/checkout", isAuthenticated, async (req: Request, res: Response) => {
    const startTime = Date.now();
    console.log('[Checkout] Starting new checkout session request');
    
    try {
      const sessionUser = req.user as any;
      if (!sessionUser) {
        console.log('[Checkout] Unauthorized - no session user');
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Fetch fresh user data from database to get updated email
      const userId = sessionUser.claims?.sub || sessionUser.id;
      console.log(`[Checkout] Processing checkout for user: ${userId}`);
      
      const user = await storage.getUser(userId);

      if (!user) {
        console.error(`[Checkout] User not found: ${userId}`);
        return res.status(401).json({ error: "User not found" });
      }

      // Validate request body
      const result = createCheckoutSchema.safeParse(req.body);
      if (!result.success) {
        console.log('[Checkout] Validation failed:', fromError(result.error).toString());
        return res.status(400).json({ 
          error: "Validation error", 
          details: fromError(result.error).toString() 
        });
      }

      const { plan, billingInterval } = result.data;
      console.log(`[Checkout] Requested plan: ${plan}, billing: ${billingInterval}`);
      
      // Require email for all users
      if (!user.email) {
        console.log('[Checkout] User missing email address');
        return res.status(400).json({ 
          error: "Email required", 
          message: "Please set up an email address in your profile to subscribe",
          action: "update_profile"
        });
      }

      // Check if Polar is configured
      if (!process.env.POLAR_PRODUCTION_API_KEY && !process.env.POLAR_SANDBOX_API_KEY) {
        console.error('[Checkout] Polar API keys not configured');
        return res.status(503).json({ 
          error: "Service unavailable", 
          message: "Subscription service is not configured. Please contact support.",
          supportInfo: "The Polar integration needs to be set up by the administrator."
        });
      }

      // Get the plan configuration
      const planConfig = SUBSCRIPTION_PLANS[plan];
      
      if (!planConfig) {
        console.error(`[Checkout] Invalid plan requested: ${plan}`);
        return res.status(400).json({ 
          error: "Invalid plan", 
          message: `The plan '${plan}' is not available. Available plans are: pro, enterprise.`,
          availablePlans: ['pro', 'enterprise']
        });
      }
      
      // Get price ID for checkout (Polar requires price ID, not product ID)
      const priceId = getPriceId(plan, billingInterval === 'yearly' ? 'yearly' : 'monthly');
      const productId = getProductId(plan, billingInterval === 'yearly' ? 'yearly' : 'monthly');
      
      if (!priceId || !productId) {
        console.error(`[Checkout] Price/Product ID not configured for plan: ${plan} (${billingInterval})`);
        
        // Use correct environment variable names based on environment
        const isDev = process.env.NODE_ENV === 'development' || 
                     process.env.NODE_ENV === 'dev' ||
                     (process.env.NODE_ENV === undefined && process.env.POLAR_SANDBOX_API_KEY !== undefined);
        
        const prefix = isDev ? 'POLAR_SANDBOX_' : 'POLAR_PRODUCTION_';
        const interval = billingInterval === 'yearly' ? 'YEARLY' : 'MONTHLY';
        const planUpper = plan.toUpperCase();
        const envVarName = `${prefix}${planUpper}_${interval}_PRICE_ID`;
        
        return res.status(500).json({ 
          error: "Configuration error", 
          message: `The ${plan} plan (${billingInterval}) is not properly configured. Price ID is missing.`,
          details: `The environment variable ${envVarName} must be set with a valid Polar price ID.`,
          action: "contact_support"
        });
      }
      
      console.log(`[Checkout] Price ID validated for plan ${plan} (${billingInterval}): ${priceId.substring(0, 8)}...`);

      // Get the appropriate Polar client for this user
      const polarClient = await getPolarClient(userId);
      
      // Skip customer creation - let the checkout session handle it
      // Polar will create the customer automatically when checkout completes
      console.log('[Checkout] Proceeding without pre-creating customer (will be created during checkout)');

      // Check for any pending checkout sessions first
      const existingPendingCheckout = await storage.getSubscriptionByUserId(userId);
      
      if (existingPendingCheckout && existingPendingCheckout.status === 'pending_checkout') {
        console.log('[Checkout] Found existing pending checkout for user');
        
        // Check if the pending checkout is still valid (created within last 1 hour)
        const checkoutAge = Date.now() - new Date(existingPendingCheckout.createdAt || 0).getTime();
        const oneHourInMs = 60 * 60 * 1000;
        
        if (checkoutAge < oneHourInMs) {
          const checkoutMetadata = existingPendingCheckout.metadata as any;
          if (checkoutMetadata?.checkoutUrl) {
            console.log('[Checkout] Returning existing valid checkout session');
            return res.json({
              checkoutUrl: checkoutMetadata.checkoutUrl,
              sessionId: checkoutMetadata.checkoutSessionId,
              message: "You have an existing checkout session that's still valid. Redirecting to complete your purchase.",
              existingSession: true,
            });
          }
        } else {
          console.log('[Checkout] Existing pending checkout expired, creating new one');
        }
      }
      
      // Check for existing subscription to determine upgrade path
      // Paid-to-paid upgrades can use direct API switch, free-to-paid needs checkout
      const dbSubscription = await storage.getSubscriptionByUserId(userId);
      let activeSubscription = null;
      
      // Only consider active or trialing subscriptions as "active"
      if (dbSubscription && (dbSubscription.status === 'active' || dbSubscription.status === 'trialing')) {
        activeSubscription = dbSubscription;
        console.log(`[Checkout] User has existing active subscription: ${dbSubscription.plan}`);
      } else if (dbSubscription) {
        console.log(`[Checkout] User has non-active subscription (status: ${dbSubscription.status})`);
      } else {
        console.log(`[Checkout] User has no existing subscription (free tier)`);
      }

      // Handle existing subscription - check if we can switch directly or need checkout
      if (activeSubscription) {
        // Determine the current plan from the subscription's productId
        const currentPlan = getPlanFromProductId((activeSubscription as any).productId);
        
        console.log(`User ${user.email} has existing subscription (${currentPlan}), wants to switch to ${plan}`);
        
        // Only use direct plan switching for paid-to-paid changes
        // Free-to-paid requires checkout for payment collection
        const isCurrentPlanPaid = isPaidPlan(currentPlan);
        const isNewPlanPaid = isPaidPlan(plan as SubscriptionPlan);
        
        if (isCurrentPlanPaid && isNewPlanPaid && currentPlan !== plan) {
          // Paid-to-paid plan switch - can use direct switching
          console.log(`Direct switch: ${currentPlan} -> ${plan} (both paid plans)`);
          
          try {
            // Validate that we have a product ID for the new plan
            if (!productId) {
              return res.status(400).json({ 
                error: "Invalid plan configuration",
                message: "Cannot switch to a plan without a product ID"
              });
            }
            
            // Use switchSubscriptionPlan for immediate upgrade with proration
            console.log(`[Checkout] Calling Polar API to switch subscription`);
            const updatedSubscription = await polarClient.switchSubscriptionPlan({
              subscriptionId: (activeSubscription as any).polarSubscriptionId, // Use Polar subscription ID
              newProductId: productId,
              priceId: priceId, // Include price ID for monthly/yearly specificity
              switchAtPeriodEnd: false, // Switch immediately for upgrades (with proration)
            });

            console.log(`[Checkout] Subscription switched successfully:`, updatedSubscription.id);

            // Update database subscription record
            await storage.updateSubscription(dbSubscription.id, {
              productId: productId,
              priceId: priceId,
              plan: plan,
              billingInterval: billingInterval || 'monthly',
              status: updatedSubscription.status,
              currentPeriodStart: updatedSubscription.currentPeriodStart ? new Date(updatedSubscription.currentPeriodStart) : undefined,
              currentPeriodEnd: updatedSubscription.currentPeriodEnd ? new Date(updatedSubscription.currentPeriodEnd) : undefined,
              metadata: {
                ...dbSubscription.metadata,
                lastUpgrade: new Date().toISOString(),
                previousPlan: currentPlan,
                upgradeType: 'paid_to_paid',
              },
            });

            // Sync benefits from Polar and update user
            const polarData = await polarClient.syncUserSubscriptionBenefits(user.email);
            await storage.updateUser(userId, {
              subscriptionBenefits: polarData.benefits,
            });

            console.log(`[Checkout] Successfully upgraded ${currentPlan} → ${plan}`);

            // Return success response for immediate upgrade
            return res.json({
              success: true,
              message: `Successfully upgraded from ${currentPlan} to ${plan}. Proration has been applied to your next bill.`,
              upgraded: true,
              plan: plan,
              previousPlan: currentPlan,
              redirectUrl: '/app/subscription/success',
            });
          } catch (switchError: any) {
            console.error('Error switching subscription plan:', switchError);
            // Fall through to create new checkout if switching fails
          }
        } else if (!isCurrentPlanPaid && isNewPlanPaid) {
          // Free-to-paid upgrade - need checkout for payment collection
          console.log(`Free-to-paid upgrade: ${currentPlan} -> ${plan} (requires checkout for payment)`);
          // Fall through to create checkout session
        } else if (isCurrentPlanPaid && !isNewPlanPaid) {
          // Downgrade to free - this might need special handling
          console.log(`Downgrade to free: ${currentPlan} -> ${plan}`);
          // For now, fall through to checkout (though free plan doesn't have checkout)
          return res.status(400).json({ 
            error: "Downgrade not supported",
            message: "To downgrade to the free plan, please cancel your current subscription"
          });
        } else if (currentPlan === plan) {
          // Same plan - no action needed
          return res.status(400).json({ 
            error: "Already subscribed",
            message: `You are already subscribed to the ${plan} plan`
          });
        }
      }

      // Skip checking for cancelled subscriptions - let Polar handle this
      // Polar will manage subscription states and prevent conflicts

      // No active subscription or switching failed - create new checkout session
      // Properly derive the base URL from request headers
      let baseUrl: string;
      
      // Priority 1: Use APP_URL if explicitly set
      if (process.env.APP_URL) {
        baseUrl = process.env.APP_URL;
        console.log('[Checkout] Using APP_URL for base URL:', baseUrl);
      } else {
        // Priority 2: Try to use REPLIT_DOMAINS if available (production Replit)
        if (process.env.REPLIT_DOMAINS) {
          const replitDomain = process.env.REPLIT_DOMAINS.split(',')[0].trim();
          baseUrl = `https://${replitDomain}`;
          console.log('[Checkout] Using REPLIT_DOMAINS for base URL:', baseUrl);
        } else {
          // Priority 3: Derive from request headers
          const protocol = req.get('x-forwarded-proto') || req.protocol;
          const host = req.get('host');
          
          if (!host) {
            // Fallback to localhost if no host header
            baseUrl = 'http://localhost:5000';
            console.warn('[Checkout] Warning: Using fallback localhost URL');
          } else {
            baseUrl = `${protocol}://${host}`;
            console.log('[Checkout] Using request headers for base URL:', baseUrl);
          }
        }
      }
      
      // Ensure baseUrl doesn't have trailing slash
      baseUrl = baseUrl.replace(/\/$/, '');
      
      console.log(`[Checkout] Creating session for user ${user.email}`);
      
      // Double-check productId before creating session (defensive programming)
      if (!productId) {
        console.error('[Checkout] Product ID missing at session creation');
        return res.status(500).json({ 
          error: "Configuration error",
          message: "Product ID is not available for checkout session creation"
        });
      }
      
      // Prepare customer name if available
      const customerName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined;
      
      // Validate and potentially clean up the email for sandbox mode
      let customerEmail = user.email;
      
      // In sandbox mode, if email ends with @example.com (test email), 
      // replace with a valid test domain that Polar accepts
      if (polarClient.isDevelopment && customerEmail.endsWith('@example.com')) {
        console.log('[Checkout] Detected test email with @example.com, replacing with @test.com for Polar sandbox');
        customerEmail = customerEmail.replace('@example.com', '@test.com');
      }

      // Generate a temporary checkout ID that we'll use to track this session
      const tempCheckoutId = `checkout_${Date.now()}_${userId}`;
      
      // Build URLs - we'll use our own tracking mechanism since Polar sandbox doesn't replace placeholders reliably
      const successUrl = `${baseUrl}/app/subscription/success?checkout_id=${tempCheckoutId}`;
      const cancelUrl = `${baseUrl}/app/subscription/cancel`;
      
      console.log('[Checkout] URLs configured:', {
        success: successUrl,
        cancel: cancelUrl,
        baseUrl: baseUrl
      });

      const session = await polarClient.createCheckoutSession({
        priceId: priceId, // Use price ID, not product ID
        successUrl: successUrl,
        cancelUrl: cancelUrl,
        customerEmail: customerEmail,
        customerName: customerName,
        metadata: {
          userId: userId,
          plan: plan,
          billingInterval: billingInterval || 'month',
          requestTime: new Date().toISOString(),
          checkoutId: tempCheckoutId, // Our tracking ID
        },
      });

      console.log(`[Checkout] Checkout session created successfully: ${session.id}`);
      console.log(`[Checkout] Full checkout URL: ${session.url}`);

      // Prepare database for incoming webhook by creating a pending subscription record
      // This helps track checkout sessions and handle webhook delays
      const pendingSubscriptionData = {
        userId: userId,
        polarSubscriptionId: session.id, // Store checkout session ID temporarily
        polarCustomerId: null, // Customer will be created by Polar during checkout
        productId: productId, // Use the validated productId variable
        status: 'pending_checkout',
        plan: plan,
        billingInterval: billingInterval,
        metadata: {
          checkoutSessionId: session.id,
          checkoutTrackingId: tempCheckoutId, // Our custom tracking ID
          checkoutCreatedAt: new Date().toISOString(),
          checkoutUrl: session.url,
          isPendingCheckout: true,
        },
      };

      // Check if there's an existing pending checkout record
      const existingPendingSubscription = await storage.getSubscriptionByUserId(userId);
      
      if (existingPendingSubscription && existingPendingSubscription.status === 'pending_checkout') {
        // Update existing pending record with new checkout session
        await storage.updateSubscription(existingPendingSubscription.id, pendingSubscriptionData);
        console.log(`[Subscription] Updated existing pending checkout record for user ${userId}`);
      } else if (!existingPendingSubscription) {
        // Create new pending subscription record
        await storage.createSubscription(pendingSubscriptionData);
        console.log(`[Subscription] Created pending checkout record for user ${userId}`);
      }

      res.json({
        checkoutUrl: session.url,
        sessionId: session.id,
      });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      
      // Provide helpful error message for Polar configuration issues
      if (error.message?.includes('Not Found') || error.message?.includes('404') || error.message?.includes('not found')) {
        res.status(500).json({ 
          error: "Polar not configured",
          message: "The Polar API is not properly configured. Please ensure you have set up your Polar sandbox/production account with the correct products and API keys.",
          details: {
            plan: req.body?.plan,
            message: error.message
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

  // Handle successful checkout (callback from Polar) - ENHANCED with validation
  app.get("/api/subscription/success", isAuthenticated, async (req: Request, res: Response) => {
    const startTime = Date.now();
    console.log('[Success] Processing checkout success callback');
    
    try {
      const { session_id } = req.query;
      
      if (!session_id || typeof session_id !== 'string') {
        console.error('[Success] Missing or invalid session ID');
        return res.status(400).json({ 
          error: "Missing session ID",
          message: "No checkout session ID provided. Please return to the checkout page and try again."
        });
      }
      
      // Get user info first
      const sessionUser = req.user as any;
      if (!sessionUser) {
        console.error('[Success] User not authenticated');
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const userId = sessionUser.claims?.sub || sessionUser.id;

      console.log(`[Success] Processing session: ${session_id}`);
      const user = await storage.getUser(userId);

      if (!user) {
        console.error(`[Success] User not found: ${userId}`);
        return res.status(401).json({ error: "User not found" });
      }

      // Get the appropriate Polar client for this user
      const polarClient = await getPolarClient(userId);
      
      // Validate the checkout session using the new helper method
      const validation = await polarClient.validateCheckoutSession(session_id);
      
      if (!validation.isValid || !validation.session) {
        console.error('[Success] Session validation failed:', validation.error);
        
        // Provide specific error messages based on the failure reason
        if (validation.error?.includes('expired')) {
          return res.status(400).json({ 
            error: "Session expired",
            message: "This checkout session has expired. Please start a new subscription process.",
            action: "restart_checkout"
          });
        }
        
        if (validation.error?.includes('canceled')) {
          return res.status(400).json({ 
            error: "Session canceled",
            message: "This checkout session was canceled. Please start a new subscription if you wish to proceed.",
            action: "restart_checkout"
          });
        }
        
        if (validation.error?.includes('not found')) {
          return res.status(404).json({ 
            error: "Session not found",
            message: "This checkout session could not be found. It may have already been processed or the link is invalid.",
            action: "contact_support"
          });
        }
        
        return res.status(400).json({ 
          error: "Invalid session",
          message: validation.error || "The checkout session is not valid for processing.",
          action: "restart_checkout"
        });
      }
      
      const session = validation.session;
      console.log('[Success] Session validated successfully:', {
        status: session.status,
        hasSubscriptionId: !!session.subscription_id,
        product: session.product?.name,
      });
      
      // Check if this session has already been processed
      const existingDbSubscription = await storage.getSubscriptionByUserId(userId);
      
      if (existingDbSubscription?.metadata) {
        const metadata = existingDbSubscription.metadata as any;
        if (metadata.checkoutSessionId === session_id && existingDbSubscription.status !== 'pending_checkout') {
          console.log('[Success] Session already processed');
          const planName = existingDbSubscription.plan || 'pro';
          const plan = SUBSCRIPTION_PLANS[planName as keyof typeof SUBSCRIPTION_PLANS];
          
          return res.json({
            success: true,
            message: "Your subscription is already active",
            plan: planName,
            features: plan?.features,
            alreadyProcessed: true,
          });
        }
      }
      
      // Implement retry logic for webhook race conditions
      // Try to sync subscription data with retries
      let retries = 0;
      const maxRetries = 3;
      const retryDelay = 2000; // 2 seconds
      
      let subscriptionActivated = false;
      let planName: string | undefined;
      
      while (retries < maxRetries && !subscriptionActivated) {
        console.log(`[Success] Attempt ${retries + 1} to sync subscription data`);
        
        try {
          // Sync subscription data from Polar
          if (user.email) {
            const polarData = await polarClient.syncUserSubscriptionBenefits(user.email);
            
            if (polarData.benefits.plan !== 'free') {
              // Subscription found - update database
              subscriptionActivated = true;
              planName = polarData.benefits.plan;
              
              console.log(`[Success] Subscription activated: ${planName}`);
              
              // Update user subscription benefits in database
              await storage.updateUser(userId, {
                polarCustomerId: polarData.customerId,
                subscriptionBenefits: polarData.benefits,
              });
              
              // Update or create subscription record
              if (existingDbSubscription) {
                await storage.updateSubscription(existingDbSubscription.id, {
                  status: 'active',
                  plan: planName,
                  metadata: {
                    ...((existingDbSubscription.metadata as any) || {}),
                    checkoutSessionId: session_id,
                    activatedAt: new Date().toISOString(),
                    processedBySuccess: true,
                  },
                });
              } else {
                // Create new subscription record
                await storage.createSubscription({
                  userId: userId,
                  polarSubscriptionId: session.subscription_id || session_id,
                  polarCustomerId: polarData.customerId,
                  productId: session.productId,
                  priceId: session.priceId,
                  status: 'active',
                  plan: planName,
                  metadata: {
                    checkoutSessionId: session_id,
                    activatedAt: new Date().toISOString(),
                    processedBySuccess: true,
                  },
                });
              }
              
              break; // Success - exit retry loop
            }
          }
          
          // If we didn't find a subscription, the webhook might not have processed yet
          if (!subscriptionActivated && retries < maxRetries - 1) {
            console.log('[Success] Subscription not found yet, waiting for webhook processing...');
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            retries++;
          } else {
            break;
          }
        } catch (syncError: any) {
          console.error('[Success] Error syncing subscription:', syncError);
          if (retries < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            retries++;
          } else {
            throw syncError;
          }
        }
      }
      
      if (subscriptionActivated && planName) {
        const plan = SUBSCRIPTION_PLANS[planName as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.pro;
        console.log(`[Success] Successfully activated ${planName} subscription for user ${userId}`);
        
        return res.json({
          success: true,
          message: `Your ${planName} subscription has been activated successfully!`,
          plan: planName,
          features: plan.features,
          processingTime: Date.now() - startTime,
        });
      } else {
        // Subscription not found after retries
        console.warn('[Success] Subscription not activated after retries');
        return res.status(400).json({ 
          error: "Subscription pending",
          message: "Your payment was received but subscription activation is still pending. Please refresh the page in a few moments or contact support if the issue persists.",
          action: "wait_and_retry",
          sessionId: session_id,
        });
      }
    } catch (error: any) {
      console.error("[Success] Error handling subscription success:", error);
      res.status(500).json({ 
        error: "Failed to activate subscription",
        message: "An error occurred while activating your subscription. Please contact support with your session ID.",
        sessionId: req.query.session_id,
        details: error.message 
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
      } catch (error: any) {
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

      // Update database subscription record immediately after Polar cancellation
      const dbSubscription = await storage.getSubscriptionByUserId(userId);
      
      if (dbSubscription) {
        const now = new Date();
        const updateData: any = {
          canceledAt: now,
          cancelAtPeriodEnd: !immediate,
          status: immediate ? 'canceled' : dbSubscription.status, // Keep current status if canceling at period end
          metadata: {
            ...(dbSubscription.metadata as any || {}),
            cancellationRequestedAt: now.toISOString(),
            cancellationImmediate: immediate,
            cancellationProcessed: true,
          },
        };

        // If immediate cancellation, also update the end date
        if (immediate) {
          updateData.endedAt = now;
        }

        await storage.updateSubscription(dbSubscription.id, updateData);
      }

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
      } catch (error: any) {
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
      newPlan: z.enum(['free', 'pro', 'enterprise']),
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

      // Check if Polar is configured based on environment
      const isDev = process.env.NODE_ENV === 'development' || 
                   process.env.NODE_ENV === 'dev' ||
                   (process.env.NODE_ENV === undefined && process.env.POLAR_SANDBOX_API_KEY !== undefined);
      
      const polarConfigured = isDev 
        ? !!process.env.POLAR_SANDBOX_API_KEY
        : !!process.env.POLAR_API_KEY;

      if (!polarConfigured) {
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

      // SPECIAL HANDLING: Downgrade to free (local-only, no Polar subscription)
      if (newPlan === 'free') {
        console.log(`[Switch Plan] Downgrading to free tier - canceling Polar subscription`);
        
        try {
          // Cancel the Polar subscription
          await polarClient.cancelSubscription(currentSubscription.id);
          console.log(`[Switch Plan] Polar subscription ${currentSubscription.id} canceled successfully`);
          
          // Update database subscription to canceled status
          const dbSubscription = await storage.getSubscriptionByUserId(userId);
          if (dbSubscription) {
            await storage.updateSubscription(dbSubscription.id, {
              status: 'canceled',
              canceledAt: new Date(),
              cancelAtPeriodEnd: false, // Canceled immediately
              metadata: {
                downgradedToFree: true,
                downgradedAt: new Date().toISOString(),
                previousPlan: getPlanFromProductId(currentSubscription.productId),
              } as any,
            });
            console.log(`[Switch Plan] Database subscription updated to canceled status`);
          }
          
          // Set user's benefits to free tier (local-only)
          const freeBenefits = {
            plan: 'free',
            quizzesPerDay: SUBSCRIPTION_PLANS.free.limits.quizzesPerDay,
            categoriesAccess: SUBSCRIPTION_PLANS.free.limits.categoriesAccess,
            analyticsAccess: SUBSCRIPTION_PLANS.free.limits.analyticsAccess,
            lastSyncedAt: new Date().toISOString(),
          };
          
          await storage.updateUser(userId, {
            subscriptionBenefits: freeBenefits,
          });
          
          console.log(`[Switch Plan] User benefits updated to free tier`);
          
          return res.json({
            success: true,
            message: "Successfully downgraded to free plan",
            plan: 'free',
            effectiveDate: new Date().toISOString(),
            benefits: freeBenefits,
          });
        } catch (error: any) {
          console.error(`[Switch Plan] Error downgrading to free:`, error);
          return res.status(500).json({
            error: "Failed to downgrade",
            message: error.message || "An unexpected error occurred while downgrading your subscription."
          });
        }
      }

      // Get the product ID and price ID for the new plan (paid plans only)
      const newPlanConfig = SUBSCRIPTION_PLANS[newPlan];
      if (!newPlanConfig) {
        return res.status(400).json({ 
          error: "Invalid plan",
          message: `The ${newPlan} plan is not available. Please contact support.`
        });
      }
      
      const newProductId = getProductId(newPlan, billingInterval === 'yearly' ? 'yearly' : 'monthly');
      const priceId = getPriceId(newPlan, billingInterval === 'yearly' ? 'yearly' : 'monthly');
      
      if (!newProductId || !priceId) {
        return res.status(400).json({ 
          error: "Invalid plan configuration",
          message: `The ${newPlan} plan (${billingInterval}) is not properly configured. Please contact support.`
        });
      }

      // Check if switching to the same plan
      if (currentSubscription.productId === newProductId) {
        return res.status(400).json({ 
          error: "Already on this plan",
          message: `You are already subscribed to the ${newPlan} plan.`
        });
      }

      // Switch the subscription plan
      const updatedSubscription = await polarClient.switchSubscriptionPlan({
        subscriptionId: currentSubscription.id,
        newProductId,
        priceId,
        switchAtPeriodEnd,
      });

      // Update database subscription record immediately after successful Polar API call
      const dbSubscription = await storage.getSubscriptionByUserId(userId);
      
      // Handle both camelCase and snake_case from Polar API
      const updatedSub = updatedSubscription as any;
      const subscriptionData = {
        userId: userId,
        polarSubscriptionId: updatedSub.id,
        polarCustomerId: userData.polarCustomerId,
        productId: newProductId,
        priceId: priceId || updatedSub.priceId || updatedSub.price_id,
        status: updatedSub.status,
        plan: newPlan,
        billingInterval: billingInterval,
        currentPeriodStart: updatedSub.currentPeriodStart || updatedSub.current_period_start ? new Date(updatedSub.currentPeriodStart || updatedSub.current_period_start) : new Date(),
        currentPeriodEnd: updatedSub.currentPeriodEnd || updatedSub.current_period_end ? new Date(updatedSub.currentPeriodEnd || updatedSub.current_period_end) : new Date(),
        trialEndsAt: updatedSub.trialEndsAt || updatedSub.trial_ends_at ? new Date(updatedSub.trialEndsAt || updatedSub.trial_ends_at) : undefined,
        cancelAtPeriodEnd: updatedSub.cancelAtPeriodEnd !== undefined ? updatedSub.cancelAtPeriodEnd : (updatedSub.cancel_at_period_end || false),
        metadata: {
          switchedFrom: currentSubscription.productId,
          switchedAt: new Date().toISOString(),
          switchAtPeriodEnd: switchAtPeriodEnd,
        },
      };

      let savedSubscription;
      if (dbSubscription) {
        savedSubscription = await storage.updateSubscription(dbSubscription.id, subscriptionData);
      } else {
        savedSubscription = await storage.createSubscription(subscriptionData);
      }

      // Sync updated benefits from Polar and update user
      if (userData.email) {
        const polarData = await polarClient.syncUserSubscriptionBenefits(userData.email);
        await storage.updateUser(userData.id, {
          subscriptionBenefits: {
            ...polarData.benefits,
            subscriptionId: savedSubscription?.id,
          },
        });
      }

      // Determine if it's an upgrade or downgrade
      const isUpgrade = newPlan === 'enterprise';

      // Return data from database record as source of truth
      res.json({
        success: true,
        message: switchAtPeriodEnd 
          ? `Plan ${isUpgrade ? 'upgrade' : 'downgrade'} scheduled for the end of your current billing period`
          : `Successfully ${isUpgrade ? 'upgraded' : 'downgraded'} to ${newPlan} plan`,
        newPlan,
        billingInterval,
        switchAtPeriodEnd,
        effectiveDate: switchAtPeriodEnd 
          ? savedSubscription?.currentPeriodEnd?.toISOString() 
          : savedSubscription?.updatedAt?.toISOString(),
        subscription: {
          id: savedSubscription?.id,
          polarSubscriptionId: savedSubscription?.polarSubscriptionId,
          status: savedSubscription?.status,
          currentPeriodEnd: savedSubscription?.currentPeriodEnd?.toISOString(),
          plan: savedSubscription?.plan,
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

  // Redirect to Polar Customer Portal for subscription management
  app.get("/api/subscription/portal", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      const userId = (user as any).claims?.sub || (user as any).id;
      
      console.log(`[Customer Portal] Creating portal session for user ${userId}`);
      
      // Get user data
      const userData = await storage.getUserById(userId);
      if (!userData) {
        console.error('[Customer Portal] User not found');
        return res.status(401).json({ 
          error: "User not found",
          message: "Unable to verify user account"
        });
      }
      
      // Check if user has a Polar customer ID
      if (!userData.polarCustomerId) {
        console.log('[Customer Portal] User has no Polar customer ID - may not have subscription');
        return res.status(400).json({
          error: "No subscription found",
          message: "You don't have an active subscription to manage. Please subscribe first."
        });
      }
      
      // Get the appropriate Polar client
      const polarClient = await getPolarClient(userId);
      
      // Create customer portal session
      try {
        console.log('[Customer Portal] Creating portal session for customer:', userData.polarCustomerId);
        
        // Get the customer portal URL from Polar
        // Note: Polar's customer portal is accessed via a direct URL pattern
        const isDev = process.env.NODE_ENV === 'development' || 
                     process.env.NODE_ENV === 'dev' ||
                     (process.env.NODE_ENV === undefined && process.env.POLAR_SANDBOX_API_KEY !== undefined);
        
        const baseUrl = isDev ? 'https://sandbox.polar.sh' : 'https://polar.sh';
        const returnUrl = `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000'}/app/subscription`;
        
        // Polar customer portal URL pattern
        const portalUrl = `${baseUrl}/purchases?customer_id=${userData.polarCustomerId}&return_url=${encodeURIComponent(returnUrl)}`;
        
        console.log('[Customer Portal] Redirecting to portal:', portalUrl);
        
        // Return the portal URL for the frontend to handle redirect
        res.json({
          success: true,
          portalUrl,
          customerId: userData.polarCustomerId
        });
        
      } catch (portalError: any) {
        console.error('[Customer Portal] Error creating portal session:', portalError);
        return res.status(500).json({
          error: "Portal access failed",
          message: "Unable to access the customer portal. Please try again later."
        });
      }
      
    } catch (error: any) {
      console.error('[Customer Portal] Unexpected error:', error);
      res.status(500).json({
        error: "Internal server error",
        message: "An unexpected error occurred. Please try again later."
      });
    }
  });

  // Confirm checkout session after successful payment - ENHANCED WITH FULL VERIFICATION
  app.get("/api/subscription/confirm", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { session_id, checkout_id } = req.query;
      const user = req.user as User;
      const userId = (user as any).claims?.sub || (user as any).id;

      console.log(`[Subscription Confirm] Starting checkout confirmation for session ${session_id || checkout_id}, user ${userId}`);

      // Handle both session_id and checkout_id parameters
      if (!session_id && !checkout_id) {
        console.error('[Subscription Confirm] Missing session ID and checkout ID');
        return res.status(400).json({ 
          error: "Missing session ID",
          success: false,
          message: "Invalid checkout session reference"
        });
      }
      
      const verificationId = session_id || checkout_id;

      // Get user data for processing
      const userData = await storage.getUserById(userId);
      if (!userData || !userData.email) {
        console.error('[Subscription Confirm] User data not found');
        return res.status(401).json({ 
          error: "User not found",
          success: false,
          message: "Unable to verify user account"
        });
      }

      // Check if Polar is configured
      const isDev = process.env.NODE_ENV === 'development' || 
                   process.env.NODE_ENV === 'dev' ||
                   (process.env.NODE_ENV === undefined && process.env.POLAR_SANDBOX_API_KEY !== undefined);
      
      const apiKeyConfigured = isDev 
        ? !!process.env.POLAR_SANDBOX_API_KEY
        : !!process.env.POLAR_API_KEY;

      if (!apiKeyConfigured) {
        console.log('[Subscription Confirm] Polar not configured - demo mode');
        // If Polar is not configured, return demo success
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
        
        // If using checkout_id, look up the actual Polar session ID from our database
        let actualSessionId: string;
        
        if (checkout_id && typeof checkout_id === 'string' && !session_id) {
          // Look up the pending subscription by our custom checkout ID
          const pendingSubscription = await storage.getPendingCheckoutByUserId(userId);
          
          if (pendingSubscription && pendingSubscription.metadata) {
            const metadata = pendingSubscription.metadata as any;
            
            // Check if this is the matching checkout
            if (metadata.checkoutTrackingId === checkout_id) {
              actualSessionId = metadata.checkoutSessionId || pendingSubscription.polarSubscriptionId;
              console.log(`[Subscription Confirm] Found Polar session ID ${actualSessionId} for checkout ID ${checkout_id}`);
            } else {
              console.error(`[Subscription Confirm] Checkout ID mismatch. Expected: ${checkout_id}, Found: ${metadata.checkoutTrackingId}`);
              return res.status(400).json({
                error: "Invalid checkout",
                success: false,
                message: "This checkout session does not belong to your account or has expired"
              });
            }
          } else {
            console.error(`[Subscription Confirm] No pending subscription found for checkout ID ${checkout_id}`);
            return res.status(400).json({
              error: "Checkout not found",
              success: false,
              message: "Could not find your checkout session. It may have expired or already been processed."
            });
          }
        } else {
          // Using direct session_id
          actualSessionId = session_id as string;
        }
        
        // Validate the checkout session
        console.log('[Subscription Confirm] Validating checkout session with Polar...');
        const verification = await polarClient.validateCheckoutSession(actualSessionId);
        
        // Check if session belongs to this user (by email)
        const isAlreadyProcessed = verification.session?.subscription_id ? true : false;
        
        if (!verification.isValid) {
          console.error('[Subscription Confirm] Invalid checkout session:', verification.error);
          
          // Provide specific error messages based on the issue
          if (verification.session?.status === 'expired') {
            return res.status(400).json({ 
              error: "Session expired",
              success: false,
              message: "This checkout session has expired. Please start a new subscription.",
              sessionStatus: 'expired'
            });
          } else if (verification.session?.status === 'canceled') {
            return res.status(400).json({ 
              error: "Session canceled",
              success: false,
              message: "This checkout session was canceled. Please start a new subscription if you'd like to upgrade.",
              sessionStatus: 'canceled'
            });
          } else if (verification.session?.status === 'failed') {
            return res.status(400).json({ 
              error: "Payment failed",
              success: false,
              message: "The payment for this session failed. Please try again with a different payment method.",
              sessionStatus: 'failed'
            });
          } else if (isAlreadyProcessed) {
            // Session was already processed - still success but with different message
            console.log('[Subscription Confirm] Session already processed, returning success');
            
            // Extract plan info from session metadata
            const plan = verification.session?.metadata?.plan || 'pro';
            const billingInterval = verification.session?.metadata?.billingInterval || 'month';
            
            return res.json({
              success: true,
              plan,
              billingInterval,
              message: 'Your subscription is already active',
              alreadyProcessed: true
            });
          }
          
          return res.status(400).json({ 
            error: verification.error || "Invalid session",
            success: false,
            message: verification.error || "Unable to verify checkout session",
            sessionStatus: verification.session?.status
          });
        }

        // Session is valid and succeeded - process the subscription
        const session = verification.session!;
        console.log('[Subscription Confirm] Checkout session verified successfully:', {
          sessionId: session.id,
          status: session.status,
          productId: session.productId,
          subscriptionId: session.subscription_id
        });

        // Extract plan and billing info from session metadata and product
        const plan = session.metadata?.plan || getPlanFromProductId(session.productId);
        
        const billingInterval = session.metadata?.billingInterval || 
                               session.price?.recurring_interval || 
                               'month';

        // Create or update subscription record in database
        console.log('[Subscription Confirm] Creating subscription record in database...');
        
        const subscriptionData = {
          userId,
          polarSubscriptionId: session.subscription_id || `checkout_${session.id}`,
          polarCustomerId: session.customer?.id || userData.polarCustomerId || '',
          plan: plan as SubscriptionPlan,
          status: 'active' as const, // Successful checkout means active subscription
          billingInterval: billingInterval as 'month' | 'year',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days for monthly
          metadata: {
            checkoutSessionId: session.id,
            productId: session.productId,
            priceId: session.price?.id,
            amount: session.amount || session.price?.amount,
            currency: session.currency || session.price?.currency || 'USD'
          }
        };

        // Check if subscription already exists for this user
        const existingSubscription = await storage.getSubscriptionByUserId(userId);
        
        if (existingSubscription) {
          // Update existing subscription
          await storage.updateSubscription(existingSubscription.id, subscriptionData);
          console.log('[Subscription Confirm] Updated existing subscription');
        } else {
          // Create new subscription
          await storage.createSubscription(subscriptionData);
          console.log('[Subscription Confirm] Created new subscription');
        }

        // Sync subscription benefits from Polar to ensure consistency
        console.log('[Subscription Confirm] Syncing subscription benefits from Polar...');
        try {
          const polarData = await polarClient.syncUserSubscriptionBenefits(userData.email);
          
          // Update user with Polar customer ID and synced benefits
          await storage.updateUser(userId, {
            polarCustomerId: polarData.customerId || session.customer?.id,
            subscriptionBenefits: polarData.benefits,
          });
          
          console.log('[Subscription Confirm] Successfully synced benefits from Polar');
        } catch (syncError: any) {
          console.warn('[Subscription Confirm] Could not sync from Polar, using local benefits:', syncError.message);
          
          // Fall back to local benefits calculation
          const planConfig = SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.free;
          const localBenefits = {
            plan,
            quizzesPerDay: planConfig.limits.quizzesPerDay,
            categoriesAccess: planConfig.limits.categoriesAccess,
            analyticsAccess: planConfig.limits.analyticsAccess,
            lastSyncedAt: new Date().toISOString(),
          };
          
          await storage.updateUser(userId, {
            polarCustomerId: session.customer?.id,
            subscriptionBenefits: localBenefits,
          });
        }

        console.log('[Subscription Confirm] Checkout confirmation completed successfully');
        
        return res.json({
          success: true,
          plan,
          billingInterval,
          message: 'Subscription activated successfully!',
          subscriptionId: session.subscription_id
        });
        
      } catch (polarError: any) {
        console.error('[Subscription Confirm] Error with Polar API:', polarError);
        
        // Check if this is a network/connection error
        if (polarError.message?.includes('network') || polarError.message?.includes('fetch')) {
          return res.status(503).json({ 
            error: "Service temporarily unavailable",
            success: false,
            message: "Unable to connect to payment service. Please try again in a moment."
          });
        }
        
        // For other errors, return generic message
        return res.status(500).json({ 
          error: "Verification failed",
          success: false,
          message: "Unable to verify your subscription. Please contact support if the issue persists."
        });
      }
      
    } catch (error: any) {
      console.error('[Subscription Confirm] Unexpected error:', error);
      res.status(500).json({ 
        error: "Internal server error",
        success: false,
        message: "An unexpected error occurred. Please contact support."
      });
    }
  });

  // Webhook endpoint for Polar events - ENHANCED WITH FULL SUBSCRIPTION DATA PERSISTENCE
  app.post("/api/subscription/webhook", async (req: Request, res: Response) => {
    const webhookStartTime = Date.now();
    let processedEventId: string | undefined;
    
    try {
      // Log incoming webhook (excluding sensitive data)
      const sanitizedBody = {
        type: req.body?.type,
        eventId: req.body?.eventId || req.body?.event_id || req.body?.id,
        timestamp: req.body?.timestamp || new Date().toISOString(),
        dataKeys: req.body?.data ? Object.keys(req.body.data) : [],
      };
      
      console.log(`[Webhook] ========== WEBHOOK RECEIVED ==========`);
      console.log(`[Webhook] Headers:`, {
        'content-type': req.headers['content-type'],
        'polar-webhook-signature': req.headers['polar-webhook-signature'] ? 'present' : 'missing',
        'x-request-id': req.headers['x-request-id'],
      });
      console.log(`[Webhook] Sanitized payload:`, JSON.stringify(sanitizedBody, null, 2));
      
      // Validate payload structure
      if (!req.body) {
        console.error("[Webhook] ERROR: Empty request body");
        return res.status(200).json({ 
          received: true, 
          error: "EMPTY_BODY",
          message: "Empty request body" 
        });
      }
      
      const { type, data } = req.body;
      
      if (!type) {
        console.error("[Webhook] ERROR: Missing event type");
        return res.status(200).json({ 
          received: true, 
          error: "MISSING_TYPE",
          message: "Missing event type" 
        });
      }
      
      if (!data) {
        console.error("[Webhook] ERROR: Missing event data");
        return res.status(200).json({ 
          received: true, 
          error: "MISSING_DATA",
          message: "Missing event data" 
        });
      }

      // Extract event ID for idempotency
      processedEventId = req.body.eventId || req.body.event_id || req.body.id || `${type}_${Date.now()}`;
      
      console.log(`[Webhook] Processing event: ${type} (ID: ${processedEventId})`);
      console.log(`[Webhook] Full event data (for debugging):`, JSON.stringify(data, null, 2));

      // Check for duplicate webhook delivery (idempotency check)
      try {
        const isDuplicate = await storage.checkWebhookProcessed(processedEventId);
        if (isDuplicate) {
          console.log(`[Webhook] Duplicate webhook detected (ID: ${processedEventId}) - skipping processing`);
          return res.status(200).json({ 
            received: true, 
            duplicate: true,
            message: "Webhook already processed" 
          });
        }
      } catch (idempotencyError: any) {
        console.warn(`[Webhook] Warning: Could not check idempotency:`, idempotencyError);
        // Continue processing even if idempotency check fails
      }

      // Verify webhook signature if secret is configured
      // For webhooks, we use the real client by default since we don't have user context yet
      const defaultPolarClient = await getPolarClient();
      
      if (process.env.POLAR_WEBHOOK_SECRET) {
        const signature = req.headers['polar-webhook-signature'] as string;
        
        if (!signature) {
          console.error("[Webhook] SECURITY ERROR: Missing webhook signature header");
          console.error("[Webhook] Expected header: 'polar-webhook-signature'");
          console.error("[Webhook] Received headers:", Object.keys(req.headers).join(', '));
          
          // Mark as processed to prevent retries but log security concern
          await storage.markWebhookProcessed(processedEventId, {
            status: 'failed',
            error: 'MISSING_SIGNATURE',
            timestamp: new Date(),
          }).catch((err: any) => console.error('[Webhook] Failed to mark webhook:', err));
          
          return res.status(200).json({ 
            received: true, 
            error: "MISSING_SIGNATURE",
            message: "Missing webhook signature" 
          });
        }

        console.log("[Webhook] Verifying webhook signature...");
        const isValid = defaultPolarClient.verifyWebhook(
          JSON.stringify(req.body),
          signature
        );

        if (!isValid) {
          console.error("[Webhook] SECURITY ERROR: Invalid webhook signature");
          console.error("[Webhook] Signature header value:", signature.substring(0, 20) + '...');
          console.error("[Webhook] Payload size:", JSON.stringify(req.body).length, "bytes");
          
          // Mark as processed to prevent retries but log security concern
          await storage.markWebhookProcessed(processedEventId, {
            status: 'failed',
            error: 'INVALID_SIGNATURE',
            timestamp: new Date(),
          }).catch((err: any) => console.error('[Webhook] Failed to mark webhook:', err));
          
          return res.status(200).json({ 
            received: true, 
            error: "INVALID_SIGNATURE",
            message: "Invalid webhook signature" 
          });
        }
        
        console.log("[Webhook] ✓ Signature verified successfully");
      } else {
        console.warn("[Webhook] WARNING: Webhook secret not configured - skipping signature verification");
      }

      // Handle different webhook events
      switch (type) {
        case 'subscription.created':
        case 'subscription.updated':
        case 'subscription.resumed': {
          // Validate subscription data structure
          if (!data.subscription) {
            console.error(`[Webhook] ERROR: Missing subscription object in ${type} event`);
            await storage.markWebhookProcessed(processedEventId, {
              status: 'failed',
              error: 'MISSING_SUBSCRIPTION',
              timestamp: new Date(),
            }).catch((err: any) => console.error('[Webhook] Failed to mark webhook:', err));
            
            return res.status(200).json({ 
              received: true, 
              error: "MISSING_SUBSCRIPTION",
              message: "Missing subscription object" 
            });
          }
          
          const subscription = data.subscription;
          
          // Validate required subscription fields
          const requiredFields = ['id', 'customer_id', 'product_id', 'status'];
          const missingFields = requiredFields.filter(field => !subscription[field]);
          
          if (missingFields.length > 0) {
            console.error(`[Webhook] ERROR: Missing required subscription fields: ${missingFields.join(', ')}`);
            await storage.markWebhookProcessed(processedEventId, {
              status: 'failed',
              error: 'INVALID_SUBSCRIPTION_DATA',
              missingFields,
              timestamp: new Date(),
            }).catch((err: any) => console.error('[Webhook] Failed to mark webhook:', err));
            
            return res.status(200).json({ 
              received: true, 
              error: "INVALID_SUBSCRIPTION_DATA",
              message: `Missing required fields: ${missingFields.join(', ')}` 
            });
          }
          
          const customerId = subscription.customer_id;

          console.log(`[Webhook] Processing ${type} for customer ID: ${customerId}`);
          console.log(`[Webhook] Subscription details:`, {
            id: subscription.id,
            product_id: subscription.product_id,
            status: subscription.status,
            price_id: subscription.price_id,
            interval: subscription.recurring_interval,
            trial: subscription.trial_ends_at ? 'yes' : 'no',
            cancel_at_period_end: subscription.cancel_at_period_end,
          });

          // Find user by customer ID with retry logic for transient errors
          let user;
          let retryCount = 0;
          const maxRetries = 3;
          
          while (retryCount < maxRetries) {
            try {
              const users = await storage.getUserByPolarCustomerId(customerId);
              if (!users || users.length === 0) {
                console.warn(`[Webhook] No user found for customer ID: ${customerId}`);
                await storage.markWebhookProcessed(processedEventId, {
                  status: 'skipped',
                  reason: 'USER_NOT_FOUND',
                  customerId,
                  timestamp: new Date(),
                }).catch((err: any) => console.error('[Webhook] Failed to mark webhook:', err));
                
                return res.status(200).json({ 
                  received: true,
                  skipped: true,
                  reason: "User not found" 
                });
              }
              user = users[0];
              break; // Success, exit retry loop
            } catch (dbError: any) {
              retryCount++;
              if (retryCount >= maxRetries) {
                console.error(`[Webhook] ERROR: Failed to fetch user after ${maxRetries} retries:`, dbError);
                await storage.markWebhookProcessed(processedEventId, {
                  status: 'failed',
                  error: 'DATABASE_ERROR',
                  retries: retryCount,
                  timestamp: new Date(),
                }).catch((err: any) => console.error('[Webhook] Failed to mark webhook:', err));
                
                return res.status(200).json({ 
                  received: true,
                  error: "DATABASE_ERROR",
                  message: "Failed to fetch user" 
                });
              }
              console.warn(`[Webhook] Database error fetching user (retry ${retryCount}/${maxRetries}):`, dbError.message);
              // Wait before retry with exponential backoff
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
            }
          }

          console.log(`[Webhook] Found user: ${user.id} (${user.email})`);

          // Update user's Polar customer ID if not set
          if (!user.polarCustomerId) {
            console.log(`[Webhook] Updating user's Polar customer ID`);
            try {
              await storage.updateUser(user.id, {
                polarCustomerId: customerId,
              });
            } catch (updateError: any) {
              console.error(`[Webhook] ERROR: Failed to update user's Polar customer ID:`, updateError);
              // Continue processing - this is not critical
            }
          }

          // Start database transaction for subscription processing
          let transactionStarted = false;
          try {
            // Note: If storage supports transactions, uncomment this:
            // await storage.beginTransaction();
            // transactionStarted = true;
            
            // Check if subscription exists in database (idempotency check by subscription ID)
            const existingSubscription = await storage.getSubscriptionByPolarId(subscription.id);
            
            // Determine plan from product ID
            const planName = getPlanFromProductId(subscription.product_id);

            const plan = SUBSCRIPTION_PLANS[planName as keyof typeof SUBSCRIPTION_PLANS];

            // Prepare subscription data
            const subscriptionData = {
              userId: user.id,
              polarSubscriptionId: subscription.id,
              polarCustomerId: customerId,
              productId: subscription.product_id,
              priceId: subscription.price_id,
              status: subscription.status,
              plan: planName,
              billingInterval: subscription.recurring_interval || 'month',
              currentPeriodStart: subscription.current_period_start ? new Date(subscription.current_period_start) : new Date(),
              currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end) : new Date(),
              trialEndsAt: subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : undefined,
              cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
              canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at) : undefined,
              endedAt: subscription.ended_at ? new Date(subscription.ended_at) : undefined,
              metadata: {
                productName: subscription.product?.name,
                priceAmount: subscription.price?.amount,
                priceCurrency: subscription.price?.currency,
                customerEmail: subscription.customer?.email,
                webhookProcessedAt: new Date().toISOString(),
                eventType: type,
              },
            };

            let savedSubscription;
            
            if (existingSubscription) {
              const previousPlan = existingSubscription.plan;
              const newPlan = planName;
              
              // Detect plan changes for better observability
              if (previousPlan !== newPlan) {
                console.log(`[Webhook] 🔄 PLAN SWITCH DETECTED: ${previousPlan} → ${newPlan}`);
                console.log(`[Webhook] Event type: ${type}`);
                console.log(`[Webhook] Product ID changed: ${existingSubscription.productId} → ${subscription.product_id}`);
                console.log(`[Webhook] Price ID changed: ${existingSubscription.priceId} → ${subscription.price_id}`);
                
                // Add plan switch metadata
                subscriptionData.metadata = {
                  ...subscriptionData.metadata,
                  previousPlan: previousPlan,
                  planSwitchDetectedAt: new Date().toISOString(),
                  planSwitchType: type === 'subscription.updated' ? 'upgrade_or_downgrade' : 'other',
                } as any;
              }
              
              console.log(`[Webhook] Updating existing subscription ${existingSubscription.id}`);
              // Update existing subscription
              savedSubscription = await storage.updateSubscription(
                existingSubscription.id,
                subscriptionData
              );
            } else {
              console.log(`[Webhook] Creating new subscription record`);
              // Create new subscription
              savedSubscription = await storage.createSubscription(subscriptionData);
            }

            console.log(`[Webhook] Subscription ${savedSubscription ? 'saved' : 'save failed'} - ID: ${savedSubscription?.id}`);

            // Update user's subscription benefits with full details
            const benefitsWithSubscription = {
              plan: planName,
              quizzesPerDay: plan.limits.quizzesPerDay,
              categoriesAccess: plan.limits.categoriesAccess,
              analyticsAccess: plan.limits.analyticsAccess,
              teamMembers: (plan.limits as any).teamMembers,
              subscriptionId: savedSubscription?.id,
              polarSubscriptionId: subscription.id,
              cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
              canceledAt: subscription.canceled_at,
              currentPeriodEnd: subscription.current_period_end,
              trialEndsAt: subscription.trial_ends_at,
              lastSyncedAt: new Date().toISOString(),
            };

            console.log(`[Webhook] Updating user benefits to ${planName} plan`);
            await storage.updateUser(user.id, {
              subscriptionBenefits: benefitsWithSubscription,
            });

            console.log(`[Webhook] ✓ Successfully processed ${type} for user ${user.id}`);
            
            // Mark webhook as successfully processed
            await storage.markWebhookProcessed(processedEventId, {
              status: 'success',
              eventType: type,
              userId: user.id,
              subscriptionId: savedSubscription?.id,
              timestamp: new Date(),
            }).catch((err: any) => console.error('[Webhook] Failed to mark webhook as processed:', err));
            
            // Commit transaction if started
            // if (transactionStarted) {
            //   await storage.commitTransaction();
            // }
          } catch (dbError: any) {
            console.error(`[Webhook] ERROR: Database error processing subscription:`, dbError);
            console.error(`[Webhook] Error stack:`, dbError.stack);
            
            // Rollback transaction if started
            // if (transactionStarted) {
            //   try {
            //     await storage.rollbackTransaction();
            //     console.log(`[Webhook] Transaction rolled back due to error`);
            //   } catch (rollbackError: any) {
            //     console.error(`[Webhook] ERROR: Failed to rollback transaction:`, rollbackError);
            //   }
            // }
            
            // Mark webhook as failed but still return 200
            await storage.markWebhookProcessed(processedEventId, {
              status: 'failed',
              error: 'DATABASE_ERROR',
              errorMessage: dbError.message,
              eventType: type,
              timestamp: new Date(),
            }).catch((err: any) => console.error('[Webhook] Failed to mark webhook as failed:', err));
            
            // Continue processing - we'll still return 200 to prevent retries
          }

          break;
        }

        case 'subscription.canceled':
        case 'subscription.expired': {
          // Validate subscription data structure
          if (!data.subscription) {
            console.error(`[Webhook] ERROR: Missing subscription object in ${type} event`);
            await storage.markWebhookProcessed(processedEventId, {
              status: 'failed',
              error: 'MISSING_SUBSCRIPTION',
              timestamp: new Date(),
            }).catch((err: any) => console.error('[Webhook] Failed to mark webhook:', err));
            
            return res.status(200).json({ 
              received: true, 
              error: "MISSING_SUBSCRIPTION",
              message: "Missing subscription object" 
            });
          }
          
          const subscription = data.subscription;
          
          // Validate required fields for cancellation
          if (!subscription.id || !subscription.customer_id) {
            console.error(`[Webhook] ERROR: Missing required fields in ${type} event`);
            await storage.markWebhookProcessed(processedEventId, {
              status: 'failed',
              error: 'INVALID_CANCELLATION_DATA',
              timestamp: new Date(),
            }).catch((err: any) => console.error('[Webhook] Failed to mark webhook:', err));
            
            return res.status(200).json({ 
              received: true, 
              error: "INVALID_CANCELLATION_DATA",
              message: "Missing subscription ID or customer ID" 
            });
          }
          
          const customerId = subscription.customer_id;

          console.log(`[Webhook] Processing ${type} for customer ID: ${customerId}`);
          console.log(`[Webhook] Cancellation details:`, {
            id: subscription.id,
            status: subscription.status,
            canceled_at: subscription.canceled_at,
            ended_at: subscription.ended_at,
            cancel_at_period_end: subscription.cancel_at_period_end,
            cancellation_reason: subscription.cancellation_reason,
          });

          // Find user by customer ID with retry logic
          let user;
          let retryCount = 0;
          const maxRetries = 3;
          
          while (retryCount < maxRetries) {
            try {
              const users = await storage.getUserByPolarCustomerId(customerId);
              if (!users || users.length === 0) {
                console.warn(`[Webhook] No user found for customer ID: ${customerId}`);
                await storage.markWebhookProcessed(processedEventId, {
                  status: 'skipped',
                  reason: 'USER_NOT_FOUND',
                  customerId,
                  timestamp: new Date(),
                }).catch((err: any) => console.error('[Webhook] Failed to mark webhook:', err));
                
                return res.status(200).json({ 
                  received: true,
                  skipped: true,
                  reason: "User not found" 
                });
              }
              user = users[0];
              break; // Success, exit retry loop
            } catch (dbError: any) {
              retryCount++;
              if (retryCount >= maxRetries) {
                console.error(`[Webhook] ERROR: Failed to fetch user after ${maxRetries} retries:`, dbError);
                await storage.markWebhookProcessed(processedEventId, {
                  status: 'failed',
                  error: 'DATABASE_ERROR',
                  retries: retryCount,
                  timestamp: new Date(),
                }).catch((err: any) => console.error('[Webhook] Failed to mark webhook:', err));
                
                return res.status(200).json({ 
                  received: true,
                  error: "DATABASE_ERROR",
                  message: "Failed to fetch user" 
                });
              }
              console.warn(`[Webhook] Database error fetching user (retry ${retryCount}/${maxRetries}):`, dbError.message);
              // Wait before retry with exponential backoff
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
            }
          }

          console.log(`[Webhook] Found user: ${user.id} (${user.email})`);

          try {
            // Find and update subscription in database
            const existingSubscription = await storage.getSubscriptionByPolarId(subscription.id);
            
            if (existingSubscription) {
              console.log(`[Webhook] Updating subscription ${existingSubscription.id} to ${type === 'subscription.canceled' ? 'canceled' : 'expired'}`);
              
              const updateData: any = {
                status: type === 'subscription.canceled' ? 'canceled' : 'expired',
              };

              if (type === 'subscription.canceled') {
                updateData.canceledAt = subscription.canceled_at ? new Date(subscription.canceled_at) : new Date();
                updateData.cancelAtPeriodEnd = subscription.cancel_at_period_end || false;
              } else if (type === 'subscription.expired') {
                updateData.endedAt = subscription.ended_at ? new Date(subscription.ended_at) : new Date();
              }

              // Add metadata about the cancellation/expiration
              updateData.metadata = {
                ...(existingSubscription.metadata as any || {}),
                [`${type}_processed_at`]: new Date().toISOString(),
                cancellationReason: subscription.cancellation_reason,
                eventType: type,
              };

              await storage.updateSubscriptionByPolarId(
                subscription.id,
                updateData
              );
            } else {
              console.warn(`[Webhook] No subscription found in database for Polar ID: ${subscription.id}`);
            }

            // Update user to free tier benefits
            const freeBenefits = {
              plan: 'free',
              quizzesPerDay: SUBSCRIPTION_PLANS.free.limits.quizzesPerDay,
              categoriesAccess: SUBSCRIPTION_PLANS.free.limits.categoriesAccess,
              analyticsAccess: SUBSCRIPTION_PLANS.free.limits.analyticsAccess,
              subscriptionId: null, // Clear the subscription reference
              polarSubscriptionId: null,
              cancelAtPeriodEnd: false,
              canceledAt: type === 'subscription.canceled' ? (subscription.canceled_at || new Date().toISOString()) : undefined,
              endedAt: type === 'subscription.expired' ? (subscription.ended_at || new Date().toISOString()) : undefined,
              lastSyncedAt: new Date().toISOString(),
            };

            console.log(`[Webhook] Reverting user to free tier`);
            await storage.updateUser(user.id, {
              subscriptionBenefits: freeBenefits,
            });

            console.log(`[Webhook] ✓ Successfully processed ${type} for user ${user.id}`);
            
            // Mark webhook as successfully processed
            await storage.markWebhookProcessed(processedEventId, {
              status: 'success',
              eventType: type,
              userId: user.id,
              timestamp: new Date(),
            }).catch((err: any) => console.error('[Webhook] Failed to mark webhook as processed:', err));
          } catch (dbError: any) {
            console.error(`[Webhook] ERROR: Database error processing cancellation/expiration:`, dbError);
            console.error(`[Webhook] Error stack:`, dbError.stack);
            
            // Mark webhook as failed but still return 200
            await storage.markWebhookProcessed(processedEventId, {
              status: 'failed',
              error: 'DATABASE_ERROR',
              errorMessage: dbError.message,
              eventType: type,
              timestamp: new Date(),
            }).catch((err: any) => console.error('[Webhook] Failed to mark webhook as failed:', err));
            
            // Continue processing - we'll still return 200 to prevent retries
          }

          break;
        }

        case 'checkout.created':
        case 'checkout.updated': {
          // Log checkout events but don't process them
          console.log(`[Webhook] Checkout event received: ${type}`);
          
          // Mark as acknowledged but not processed
          await storage.markWebhookProcessed(processedEventId, {
            status: 'acknowledged',
            eventType: type,
            reason: 'Checkout events are logged only',
            timestamp: new Date(),
          }).catch((err: any) => console.error('[Webhook] Failed to mark webhook:', err));
          
          break;
        }

        default:
          console.log(`[Webhook] WARNING: Unhandled webhook event: ${type}`);
          
          // Mark as acknowledged but not processed
          await storage.markWebhookProcessed(processedEventId, {
            status: 'unhandled',
            eventType: type,
            timestamp: new Date(),
          }).catch((err: any) => console.error('[Webhook] Failed to mark webhook:', err));
      }

      // Calculate processing time
      const processingTime = Date.now() - webhookStartTime;
      
      // Log webhook processing complete
      console.log(`[Webhook] ========== WEBHOOK COMPLETE ==========`);
      console.log(`[Webhook] Event: ${type}`);
      console.log(`[Webhook] Event ID: ${processedEventId}`);
      console.log(`[Webhook] Processing time: ${processingTime}ms`);
      console.log(`[Webhook] =====================================`);

      // Always return 200 OK to prevent webhook retries
      res.json({ 
        received: true,
        eventId: processedEventId,
        eventType: type,
        processingTimeMs: processingTime
      });
    } catch (error: any) {
      // Calculate processing time even on error
      const processingTime = Date.now() - webhookStartTime;
      
      console.error(`[Webhook] ========== CRITICAL ERROR ==========`);
      console.error(`[Webhook] Error processing webhook:`, error.message);
      console.error(`[Webhook] Error stack:`, error.stack);
      console.error(`[Webhook] Event ID: ${processedEventId}`);
      console.error(`[Webhook] Processing time before error: ${processingTime}ms`);
      console.error(`[Webhook] ====================================`);
      
      // Try to mark webhook as failed
      if (processedEventId) {
        await storage.markWebhookProcessed(processedEventId, {
          status: 'critical_error',
          error: error.message,
          errorStack: error.stack,
          timestamp: new Date(),
        }).catch((err: any) => console.error('[Webhook] Failed to mark critical error:', err));
      }
      
      // Even on critical errors, return 200 OK to prevent webhook retries
      // Polar will not retry if we return 200, preventing duplicate processing
      res.status(200).json({ 
        received: true,
        error: "CRITICAL_ERROR",
        message: "Internal processing error - logged for investigation",
        eventId: processedEventId,
        processingTimeMs: processingTime
      });
    }
  });
}