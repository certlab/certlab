// Utility functions for standardizing subscription plan handling

export const VALID_PLANS = ['free', 'pro', 'enterprise'] as const;
export type SubscriptionPlan = typeof VALID_PLANS[number];

/**
 * Normalizes a plan name to lowercase and validates it
 * @param plan - The plan name to normalize (can be null/undefined)
 * @returns The normalized plan name or 'free' as default
 */
export function normalizePlanName(plan: string | null | undefined): SubscriptionPlan {
  if (!plan) return 'free';
  
  const normalized = plan.toLowerCase();
  if (VALID_PLANS.includes(normalized as SubscriptionPlan)) {
    return normalized as SubscriptionPlan;
  }
  
  console.warn(`Invalid plan name: ${plan}, defaulting to 'free'`);
  return 'free';
}

/**
 * Formats a plan name for display (capitalizes first letter)
 * @param plan - The normalized plan name
 * @returns The display-friendly plan name
 */
export function formatPlanNameForDisplay(plan: SubscriptionPlan): string {
  switch (plan) {
    case 'free':
      return 'Free';
    case 'pro':
      return 'Pro';
    case 'enterprise':
      return 'Enterprise';
    default:
      return 'Free';
  }
}

/**
 * Checks if a plan is a paid plan
 * @param plan - The normalized plan name
 * @returns True if the plan is pro or enterprise
 */
export function isPaidPlan(plan: SubscriptionPlan): boolean {
  return plan === 'pro' || plan === 'enterprise';
}

/**
 * Checks if a plan is enterprise
 * @param plan - The normalized plan name
 * @returns True if the plan is enterprise
 */
export function isEnterprisePlan(plan: SubscriptionPlan): boolean {
  return plan === 'enterprise';
}

/**
 * Gets the upgrade path for a given plan
 * @param plan - The current normalized plan name
 * @returns The next plan level or null if already at enterprise
 */
export function getUpgradePlan(plan: SubscriptionPlan): SubscriptionPlan | null {
  switch (plan) {
    case 'free':
      return 'pro';
    case 'pro':
      return 'enterprise';
    case 'enterprise':
      return null;
    default:
      return 'pro';
  }
}

/**
 * Compares two plans to determine if it's an upgrade
 * @param currentPlan - The current plan
 * @param newPlan - The new plan
 * @returns True if newPlan is an upgrade from currentPlan
 */
export function isPlanUpgrade(currentPlan: SubscriptionPlan, newPlan: SubscriptionPlan): boolean {
  const planHierarchy = { free: 0, pro: 1, enterprise: 2 };
  return planHierarchy[newPlan] > planHierarchy[currentPlan];
}

/**
 * Validates subscription state to ensure data integrity
 * @param state - The subscription state to validate
 * @returns Object with validation result and any corrections needed
 */
export function validateSubscriptionState(state: {
  plan?: string | null;
  status?: string | null;
  expiresAt?: string | Date | null;
  canceledAt?: string | Date | null;
  subscriptionId?: string | null;
  trialEndsAt?: string | Date | null;
}) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const corrections: Record<string, any> = {};

  // Normalize the plan name
  const normalizedPlan = normalizePlanName(state.plan);
  if (state.plan !== normalizedPlan) {
    corrections.plan = normalizedPlan;
    warnings.push(`Plan name normalized from '${state.plan}' to '${normalizedPlan}'`);
  }

  // Validate status for paid plans
  if (isPaidPlan(normalizedPlan)) {
    if (!state.subscriptionId) {
      errors.push(`Paid plan '${normalizedPlan}' requires a subscription ID`);
    }
    
    if (state.status === 'inactive' && !state.canceledAt && !state.expiresAt) {
      errors.push(`Inactive paid plan must have either canceledAt or expiresAt date`);
    }
    
    if (state.status === 'active' && state.canceledAt) {
      warnings.push(`Active subscription should not have canceledAt date`);
      corrections.canceledAt = null;
    }
  } else {
    // Free plan validations
    if (state.subscriptionId) {
      warnings.push(`Free plan should not have a subscription ID`);
      corrections.subscriptionId = null;
    }
    
    if (state.status && state.status !== 'active') {
      warnings.push(`Free plan should always have 'active' status`);
      corrections.status = 'active';
    }
    
    if (state.canceledAt || state.expiresAt) {
      warnings.push(`Free plan should not have canceledAt or expiresAt dates`);
      corrections.canceledAt = null;
      corrections.expiresAt = null;
    }
  }

  // Validate date consistency
  if (state.expiresAt && state.canceledAt) {
    const expiresDate = new Date(state.expiresAt);
    const canceledDate = new Date(state.canceledAt);
    
    if (canceledDate > expiresDate) {
      errors.push(`canceledAt date cannot be after expiresAt date`);
    }
  }

  // Validate trial consistency
  if (state.trialEndsAt) {
    const trialEndDate = new Date(state.trialEndsAt);
    const now = new Date();
    
    if (trialEndDate < now && state.status === 'trialing') {
      errors.push(`Trial has ended but status is still 'trialing'`);
      corrections.status = 'active';
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    corrections: Object.keys(corrections).length > 0 ? corrections : null,
    normalizedPlan
  };
}

/**
 * Merges subscription state from multiple sources with validation
 * @param primary - Primary subscription state (e.g., from database)
 * @param secondary - Secondary subscription state (e.g., from external API)
 * @returns Merged and validated subscription state
 */
export function mergeSubscriptionState(
  primary: Record<string, any>,
  secondary: Record<string, any>
): Record<string, any> {
  // Start with the primary state
  const merged = { ...primary };

  // Only override with secondary if primary value is null/undefined
  for (const key in secondary) {
    if (merged[key] === null || merged[key] === undefined) {
      merged[key] = secondary[key];
    }
  }

  // Validate and apply corrections
  const validation = validateSubscriptionState(merged);
  if (validation.corrections) {
    Object.assign(merged, validation.corrections);
  }

  // Ensure plan is always normalized
  merged.plan = validation.normalizedPlan;

  return merged;
}

/**
 * Gets plan features based on the plan type
 * @param plan - The normalized plan name
 * @returns Object containing plan limits and features
 */
export function getPlanFeatures(plan: SubscriptionPlan) {
  switch (plan) {
    case 'free':
      return {
        quizzesPerDay: 5,
        categoriesAccess: ['basic'],
        analyticsAccess: 'basic',
        teamMembers: 1,
      };
    case 'pro':
      return {
        quizzesPerDay: -1, // Unlimited
        categoriesAccess: ['all'],
        analyticsAccess: 'advanced',
        teamMembers: 1,
      };
    case 'enterprise':
      return {
        quizzesPerDay: -1, // Unlimited
        categoriesAccess: ['all'],
        analyticsAccess: 'enterprise',
        teamMembers: 50,
      };
    default:
      return getPlanFeatures('free');
  }
}