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
      let status = 'inactive';
      let expiresAt = undefined;

      // FIRST: Check database for active subscription
      const dbSubscription = await storage.getSubscriptionByUserId(userId);
      
      // Check if we have a recent subscription in database (within last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const shouldSyncWithPolar = !dbSubscription || 
        !dbSubscription.updatedAt || 
        new Date(dbSubscription.updatedAt) < oneHourAgo;

      if (dbSubscription && !shouldSyncWithPolar) {
        // Use database subscription data as source of truth
        console.log(`[Subscription Status] Using cached database subscription for user ${userId}`);
        
        const plan = SUBSCRIPTION_PLANS[dbSubscription.plan as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.free;
        benefits = {
          plan: dbSubscription.plan || 'free',
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
      } else if (process.env.POLAR_API_KEY && user.email) {
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
                const subscriptionData = {
                  userId: userId,
                  polarSubscriptionId: sub.id,
                  polarCustomerId: polarData.customerId,
                  productId: sub.productId || sub.product_id,
                  priceId: sub.priceId || sub.price_id,
                  status: sub.status,
                  plan: benefits.plan || 'free',
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
      if (process.env.POLAR_API_KEY && user.email) {
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
          let planName = 'free';
          const productId = sub.productId || sub.product_id;
          if (productId === SUBSCRIPTION_PLANS.pro.productId) {
            planName = 'pro';
          } else if (productId === SUBSCRIPTION_PLANS.enterprise.productId) {
            planName = 'enterprise';
          }

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
      if (!process.env.POLAR_API_KEY && !process.env.POLAR_SANDBOX_API_KEY) {
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
      
      // Validate product ID configuration early
      const productId = ('productId' in planConfig) ? planConfig.productId : null;
      
      if (!productId) {
        console.error(`[Checkout] Product ID not configured for plan: ${plan}`);
        
        // Use correct environment variable names based on environment
        const isDev = process.env.NODE_ENV === 'development' || 
                     process.env.NODE_ENV === 'dev' ||
                     (process.env.NODE_ENV === undefined && process.env.POLAR_SANDBOX_API_KEY !== undefined);
        
        const prefix = isDev ? 'POLAR_SANDBOX_' : 'POLAR_';
        const envVarName = plan === 'pro' 
          ? `${prefix}PRO_PRODUCT_ID` 
          : `${prefix}ENTERPRISE_PRODUCT_ID`;
        
        return res.status(500).json({ 
          error: "Configuration error", 
          message: `The ${plan} plan is not properly configured. Product ID is missing.`,
          details: `The environment variable ${envVarName} must be set with a valid Polar product ID.`,
          action: "contact_support"
        });
      }
      
      console.log(`[Checkout] Product ID validated for plan ${plan}: ${productId.substring(0, 8)}...`);

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
      
      // Check if customer has any existing subscriptions
      const existingSubscriptions = await polarClient.getSubscriptions(customer.id);
      
      // Find active or trialing subscription
      const activeSubscription = existingSubscriptions.find(sub => 
        sub.status === 'active' || sub.status === 'trialing'
      );

      // Handle existing subscription - check if we can switch directly or need checkout
      if (activeSubscription) {
        // Determine the current plan from the subscription's productId
        let currentPlan: SubscriptionPlan = 'free';
        if (activeSubscription.productId === SUBSCRIPTION_PLANS.pro.productId) {
          currentPlan = 'pro';
        } else if (activeSubscription.productId === SUBSCRIPTION_PLANS.enterprise.productId) {
          currentPlan = 'enterprise';
        }
        
        console.log(`User ${user.email} has existing subscription (${currentPlan}), wants to switch to ${plan}`);
        
        // Only use direct plan switching for paid-to-paid changes
        // Free-to-paid requires checkout for payment collection
        const isCurrentPlanPaid = isPaidPlan(currentPlan);
        const isNewPlanPaid = isPaidPlan(plan as SubscriptionPlan);
        
        if (isCurrentPlanPaid && isNewPlanPaid && currentPlan !== plan) {
          // Paid-to-paid plan switch - can use direct switching
          console.log(`Direct switch: ${currentPlan} -> ${plan} (both paid plans)`);
          
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
      
      // Build URLs with proper session ID placeholder
      // Polar will replace {CHECKOUT_SESSION_ID} with the actual session ID
      const successUrl = `${baseUrl}/app/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/app/subscription/cancel`;
      
      console.log('[Checkout] URLs configured:', {
        success: successUrl.replace('{CHECKOUT_SESSION_ID}', '[SESSION_ID]'),
        cancel: cancelUrl,
        baseUrl: baseUrl
      });
      
      // Prepare customer name if available
      const customerName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined;

      const session = await polarClient.createCheckoutSession({
        productId: productId,
        successUrl: successUrl,
        cancelUrl: cancelUrl,
        customerEmail: user.email,
        customerName: customerName,
        metadata: {
          userId: userId,
          plan: plan,
          billingInterval: billingInterval || 'month',
          requestTime: new Date().toISOString(),
        },
      });

      console.log(`[Checkout] Checkout session created successfully: ${session.id}`);

      // Prepare database for incoming webhook by creating a pending subscription record
      // This helps track checkout sessions and handle webhook delays
      const pendingSubscriptionData = {
        userId: userId,
        polarSubscriptionId: session.id, // Store checkout session ID temporarily
        polarCustomerId: customer.id,
        productId: productId, // Use the validated productId variable
        status: 'pending_checkout',
        plan: plan,
        billingInterval: billingInterval,
        metadata: {
          checkoutSessionId: session.id,
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

      console.log(`[Success] Processing session: ${session_id}`);

      const sessionUser = req.user as any;
      if (!sessionUser) {
        console.error('[Success] User not authenticated');
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Fetch fresh user data from database to get updated email
      const userId = sessionUser.claims?.sub || sessionUser.id;
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
      } catch (error: any) {
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
      } catch (polarError: any) {
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
    } catch (error: any) {
      console.error('Error confirming subscription:', error);
      res.status(500).json({ 
        error: "Internal server error",
        success: false 
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
            let planName = 'free';
            if (subscription.product_id === SUBSCRIPTION_PLANS.pro.productId) {
              planName = 'pro';
            } else if (subscription.product_id === SUBSCRIPTION_PLANS.enterprise.productId) {
              planName = 'enterprise';
            }

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