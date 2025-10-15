// Polar API Integration Module
// Documentation: https://polar.sh/docs/introduction

interface PolarConfig {
  apiKey: string;
  organizationId?: string;
  webhookSecret?: string;
}

interface PolarProduct {
  id: string;
  name: string;
  description: string;
  prices: PolarPrice[];
  features?: string[];
}

interface PolarPrice {
  id: string;
  amount: number;
  currency: string;
  interval?: 'month' | 'year';
  intervalCount?: number;
}

interface PolarSubscription {
  id: string;
  customerId: string;
  productId: string;
  priceId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt?: Date;
  cancelAtPeriodEnd?: boolean;
}

interface PolarCustomer {
  id: string;
  email: string;
  name?: string;
  metadata?: Record<string, any>;
}

interface PolarCheckoutSession {
  id: string;
  url: string;
  successUrl: string;
  cancelUrl?: string;
  customer?: PolarCustomer;
  productId: string;
  priceId: string;
  metadata?: Record<string, any>;
}

class PolarClient {
  private _apiKey?: string;
  private _organizationId?: string;
  private _webhookSecret?: string;

  constructor(config?: Partial<PolarConfig>) {
    // Store config if provided, but allow dynamic reading
    this._apiKey = config?.apiKey;
    this._organizationId = config?.organizationId;
    this._webhookSecret = config?.webhookSecret;
    
    // Log initial environment detection
    const isDev = this.isDevelopment;
    if (isDev) {
      console.log('[Polar] 🧪 SANDBOX MODE - Using Polar sandbox environment');
    } else {
      console.log('[Polar] 🚀 PRODUCTION MODE - Using Polar production environment');
    }
    console.log('[Polar] API Endpoint:', this.baseUrl);
  }

  // Check if running in development environment
  private get isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development' || 
           process.env.NODE_ENV === 'dev' ||
           (process.env.NODE_ENV === undefined && process.env.POLAR_SANDBOX_API_KEY !== undefined);
  }

  // Dynamic base URL based on environment
  private get baseUrl(): string {
    if (this.isDevelopment) {
      return 'https://sandbox.polar.sh/api/v1';
    }
    return 'https://api.polar.sh/v1';
  }

  // Getter for API key that reads from env vars dynamically based on environment
  private get apiKey(): string {
    let key: string;
    const isDev = this.isDevelopment;
    
    if (isDev) {
      // In development, use sandbox API key
      key = this._apiKey || process.env.POLAR_SANDBOX_API_KEY || '';
      if (!key) {
        console.warn('[Polar] ⚠️ SANDBOX API key not configured in development environment!');
        console.warn('[Polar] Please set POLAR_SANDBOX_API_KEY environment variable');
      } else {
        console.log('[Polar] 🧪 Using SANDBOX API key:', key.substring(0, 8) + '...');
      }
    } else {
      // In production, use production API key
      key = this._apiKey || process.env.POLAR_API_KEY || '';
      if (!key) {
        console.log('[Polar] API key not configured (checked at runtime)');
      } else {
        console.log('[Polar] 🚀 Using PRODUCTION API key:', key.substring(0, 8) + '...');
      }
    }
    
    return key;
  }

  // Getter for organization ID that reads from env vars dynamically
  private get organizationId(): string | undefined {
    const orgId = this._organizationId || process.env.POLAR_ORGANIZATION_ID;
    if (orgId) {
      console.log('[Polar] Organization ID found:', orgId.substring(0, 8) + '...');
    }
    return orgId;
  }

  // Getter for webhook secret that reads from env vars dynamically
  get webhookSecret(): string | undefined {
    return this._webhookSecret || process.env.POLAR_WEBHOOK_SECRET;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Polar API key not configured');
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error('[Polar] API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        url: url,
        error: error,
        errorDetail: error.detail ? JSON.stringify(error.detail, null, 2) : 'No detail',
        body: options.body,
        apiKeyPresent: !!this.apiKey,
        organizationId: this.organizationId,
        endpoint: endpoint
      });
      
      // Provide more specific error messages based on status code
      if (response.status === 404) {
        throw new Error(`Polar API Error: Resource not found. Please ensure your product IDs and organization ID are correct.`);
      } else if (response.status === 401) {
        throw new Error(`Polar API Error: Authentication failed. Please check your API key configuration.`);
      } else if (response.status === 403) {
        throw new Error(`Polar API Error: Permission denied. Please check your API key permissions.`);
      } else {
        throw new Error(`Polar API Error (${response.status}): ${error.message || response.statusText}`);
      }
    }

    return response.json();
  }

  // Products API
  async getProducts(): Promise<PolarProduct[]> {
    const params = this.organizationId ? `?organization_id=${this.organizationId}` : '';
    return this.request<PolarProduct[]>(`/products${params}`);
  }

  async getProduct(productId: string): Promise<PolarProduct> {
    return this.request<PolarProduct>(`/products/${productId}`);
  }

  async createProduct(product: Partial<PolarProduct>): Promise<PolarProduct> {
    return this.request<PolarProduct>('/products', {
      method: 'POST',
      body: JSON.stringify({
        ...product,
        organization_id: this.organizationId,
      }),
    });
  }

  // Subscriptions API
  async getSubscriptions(customerId?: string): Promise<PolarSubscription[]> {
    const params = new URLSearchParams();
    if (customerId) params.append('customer_id', customerId);
    if (this.organizationId) params.append('organization_id', this.organizationId);
    
    const queryString = params.toString();
    const response = await this.request<any>(`/subscriptions${queryString ? `?${queryString}` : ''}`);
    
    // Handle paginated response from Polar API
    const subscriptions = response.items || response || [];
    return Array.isArray(subscriptions) ? subscriptions : [];
  }

  async getSubscription(subscriptionId: string): Promise<PolarSubscription> {
    return this.request<PolarSubscription>(`/subscriptions/${subscriptionId}`);
  }

  async cancelSubscription(
    subscriptionId: string, 
    options: { 
      immediate?: boolean;
      cancelAtPeriodEnd?: boolean;
    } = {}
  ): Promise<{
    subscription: PolarSubscription;
    refundAmount?: number;
  }> {
    const { immediate = false, cancelAtPeriodEnd = true } = options;
    
    if (immediate) {
      // Immediate cancellation - Polar API should handle refund calculation
      // Using the DELETE method for immediate cancellation with refund
      const response = await this.request<any>(`/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
      });
      
      // Polar API should return refund information with immediate cancellation
      return {
        subscription: response.subscription || response,
        refundAmount: response.refund_amount || response.refundAmount
      };
    } else {
      // Schedule cancellation at period end
      const subscription = await this.request<PolarSubscription>(`/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          cancel_at_period_end: cancelAtPeriodEnd,
        }),
      });
      
      return {
        subscription,
        refundAmount: undefined
      };
    }
  }

  async resumeSubscription(subscriptionId: string): Promise<PolarSubscription> {
    return this.request<PolarSubscription>(`/subscriptions/${subscriptionId}/resume`, {
      method: 'POST',
    });
  }

  // Update subscription to switch plans
  async switchSubscriptionPlan(params: {
    subscriptionId: string;
    newProductId: string;
    priceId?: string;
    switchAtPeriodEnd?: boolean;
  }): Promise<PolarSubscription> {
    const isDev = this.isDevelopment;
    console.log(`[Polar] ${isDev ? '🧪 SANDBOX' : '🚀 PRODUCTION'} - Switching subscription plan:`, {
      subscriptionId: params.subscriptionId,
      newProductId: params.newProductId ? params.newProductId.substring(0, 8) + '...' : '(empty)',
      switchAtPeriodEnd: params.switchAtPeriodEnd
    });

    return this.request<PolarSubscription>(`/subscriptions/${params.subscriptionId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        product_id: params.newProductId,
        price_id: params.priceId,
        // If switching immediately, Polar will handle proration
        switch_at_period_end: params.switchAtPeriodEnd || false,
      }),
    });
  }

  // Get available prices for a product (useful for monthly/yearly selection)
  async getProductPrices(productId: string): Promise<PolarPrice[]> {
    const product = await this.getProduct(productId);
    return product.prices || [];
  }

  // Customers API
  async createCustomer(customer: Partial<PolarCustomer>): Promise<PolarCustomer> {
    return this.request<PolarCustomer>('/customers', {
      method: 'POST',
      body: JSON.stringify({
        ...customer,
        // Don't send organization_id when using organization token
      }),
    });
  }

  async getCustomer(customerId: string): Promise<PolarCustomer> {
    return this.request<PolarCustomer>(`/customers/${customerId}`);
  }

  async getCustomerByEmail(email: string): Promise<PolarCustomer | null> {
    const params = new URLSearchParams({ email });
    // Don't send organization_id when using organization token
    
    console.log('Searching for customer with email:', email);
    const response = await this.request<any>(`/customers?${params}`);
    
    // Handle paginated response from Polar API
    const customers = response.items || response || [];
    console.log('Found customers:', customers.length);
    return customers.length > 0 ? customers[0] : null;
  }

  async updateCustomer(customerId: string, updates: Partial<PolarCustomer>): Promise<PolarCustomer> {
    return this.request<PolarCustomer>(`/customers/${customerId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // Checkout Sessions API - Simplified to use product ID only
  async createCheckoutSession(params: {
    productId: string;
    successUrl: string;
    cancelUrl?: string;
    customerEmail?: string;
    metadata?: Record<string, any>;
  }): Promise<PolarCheckoutSession> {
    const isDev = this.isDevelopment;
    console.log(`[Polar] ${isDev ? '🧪 SANDBOX' : '🚀 PRODUCTION'} - Creating checkout session with product ID:`, params.productId ? params.productId.substring(0, 8) + '...' : '(empty)');
    console.log('[Polar] Environment check at checkout time:');
    if (isDev) {
      console.log('  - POLAR_SANDBOX_API_KEY:', process.env.POLAR_SANDBOX_API_KEY ? 'Set' : 'Not set');
    } else {
      console.log('  - POLAR_API_KEY:', process.env.POLAR_API_KEY ? 'Set' : 'Not set');
    }
    console.log('  - POLAR_PRO_PRODUCT_ID:', process.env.POLAR_PRO_PRODUCT_ID ? 'Set' : 'Not set');
    console.log('  - POLAR_ENTERPRISE_PRODUCT_ID:', process.env.POLAR_ENTERPRISE_PRODUCT_ID ? 'Set' : 'Not set');
    
    // Try using 'checkouts' endpoint instead of 'checkout/sessions'
    return this.request<PolarCheckoutSession>('/checkouts', {
      method: 'POST',
      body: JSON.stringify({
        product_id: params.productId,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        customer_email: params.customerEmail,
        metadata: params.metadata,
        // Don't send organization_id when using organization token
      }),
    });
  }

  async getCheckoutSession(sessionId: string): Promise<PolarCheckoutSession> {
    // Update to match the checkouts endpoint
    return this.request<PolarCheckoutSession>(`/checkouts/${sessionId}`);
  }

  // Webhook verification with proper HMAC-SHA256 and timing-safe comparison
  verifyWebhook(payload: string, signature: string): boolean {
    // Use dynamic webhook secret
    const secret = this.webhookSecret;
    
    if (!secret) {
      console.log('[Polar] Webhook secret not configured - skipping verification');
      return false;
    }
    
    console.log('[Polar] Verifying webhook signature');
    
    try {
      // Import crypto at the top if not already available
      const crypto = require('crypto');
      
      // Parse the signature header - Polar uses format: sha256=<hex_signature>
      if (!signature || !signature.startsWith('sha256=')) {
        console.error('[Polar] Invalid signature format. Expected: sha256=<signature>, Got:', signature?.substring(0, 50));
        return false;
      }
      
      // Extract the hex signature from the header
      const providedSignature = signature.slice('sha256='.length);
      
      // Generate expected signature using HMAC-SHA256
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');
      
      // Log signature comparison (first 16 chars only for security)
      console.log('[Polar] Signature comparison:');
      console.log('  - Expected (first 16 chars):', expectedSignature.substring(0, 16) + '...');
      console.log('  - Provided (first 16 chars):', providedSignature.substring(0, 16) + '...');
      
      // Use timing-safe comparison to prevent timing attacks
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      const providedBuffer = Buffer.from(providedSignature, 'hex');
      
      // Ensure both buffers are the same length before comparison
      if (expectedBuffer.length !== providedBuffer.length) {
        console.error('[Polar] Signature length mismatch');
        return false;
      }
      
      // Timing-safe comparison
      const isValid = crypto.timingSafeEqual(expectedBuffer, providedBuffer);
      
      if (isValid) {
        console.log('[Polar] Webhook signature verified successfully');
      } else {
        console.error('[Polar] Webhook signature verification failed');
      }
      
      return isValid;
    } catch (error) {
      console.error('[Polar] Error during webhook verification:', error);
      return false;
    }
  }

  // Helper methods for CertLab integration
  async createOrGetCustomerForUser(email: string, name?: string): Promise<PolarCustomer> {
    // Check if customer exists
    let customer = await this.getCustomerByEmail(email);
    
    if (!customer) {
      try {
        // Create new customer
        customer = await this.createCustomer({
          email,
          name,
          metadata: {
            source: 'certlab',
            created_at: new Date().toISOString(),
          },
        });
      } catch (error: any) {
        // If customer already exists (race condition), fetch it
        if (error.message?.includes('already exists')) {
          customer = await this.getCustomerByEmail(email);
          if (!customer) {
            throw new Error('Failed to create or get customer');
          }
        } else {
          throw error;
        }
      }
    }
    
    return customer;
  }

  async getUserSubscriptionStatus(customerEmail: string): Promise<{
    isSubscribed: boolean;
    subscription?: PolarSubscription;
    plan?: string;
    expiresAt?: Date;
  }> {
    try {
      const customer = await this.getCustomerByEmail(customerEmail);
      if (!customer) {
        return { isSubscribed: false };
      }

      const subscriptions = await this.getSubscriptions(customer.id);
      const activeSubscription = subscriptions.find(sub => 
        sub.status === 'active' || sub.status === 'trialing'
      );

      if (activeSubscription) {
        const product = await this.getProduct(activeSubscription.productId);
        return {
          isSubscribed: true,
          subscription: activeSubscription,
          plan: product.name,
          expiresAt: activeSubscription.currentPeriodEnd,
        };
      }

      return { isSubscribed: false };
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return { isSubscribed: false };
    }
  }

  // New method to get subscription details and determine benefits
  async getSubscriptionBenefits(customerId: string): Promise<{
    plan: string;
    status: 'active' | 'inactive' | 'past_due' | 'canceled' | 'trialing';
    benefits: {
      plan: string;
      quizzesPerDay: number;
      categoriesAccess: string[];
      analyticsAccess: string;
      teamMembers?: number;
    };
    subscriptionId?: string;
    expiresAt?: Date;
  }> {
    try {
      const subscriptions = await this.getSubscriptions(customerId);
      const activeSubscription = subscriptions.find(sub => 
        sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due'
      );

      if (activeSubscription) {
        // Determine plan based on product ID
        const planName = this.getPlanFromProductId(activeSubscription.productId);
        const plan = SUBSCRIPTION_PLANS[planName as keyof typeof SUBSCRIPTION_PLANS];
        
        return {
          plan: planName,
          status: activeSubscription.status as any,
          benefits: {
            plan: planName,
            quizzesPerDay: plan.limits.quizzesPerDay,
            categoriesAccess: plan.limits.categoriesAccess,
            analyticsAccess: plan.limits.analyticsAccess,
            teamMembers: (plan.limits as any).teamMembers,
          },
          subscriptionId: activeSubscription.id,
          expiresAt: activeSubscription.currentPeriodEnd,
        };
      }

      // Return free tier benefits if no active subscription
      return {
        plan: 'free',
        status: 'inactive',
        benefits: {
          plan: 'free',
          quizzesPerDay: SUBSCRIPTION_PLANS.free.limits.quizzesPerDay,
          categoriesAccess: SUBSCRIPTION_PLANS.free.limits.categoriesAccess,
          analyticsAccess: SUBSCRIPTION_PLANS.free.limits.analyticsAccess,
        },
      };
    } catch (error) {
      console.error('Error getting subscription benefits:', error);
      // Return free tier benefits on error
      return {
        plan: 'free',
        status: 'inactive',
        benefits: {
          plan: 'free',
          quizzesPerDay: SUBSCRIPTION_PLANS.free.limits.quizzesPerDay,
          categoriesAccess: SUBSCRIPTION_PLANS.free.limits.categoriesAccess,
          analyticsAccess: SUBSCRIPTION_PLANS.free.limits.analyticsAccess,
        },
      };
    }
  }

  // Helper method to determine plan from product ID
  private getPlanFromProductId(productId: string): string {
    if (productId === SUBSCRIPTION_PLANS.pro.productId) {
      return 'pro';
    }
    if (productId === SUBSCRIPTION_PLANS.enterprise.productId) {
      return 'enterprise';
    }
    return 'free';
  }

  // Method to fetch and sync subscription benefits for a user
  async syncUserSubscriptionBenefits(email: string): Promise<{
    customerId?: string;
    benefits: any;
  }> {
    try {
      const customer = await this.getCustomerByEmail(email);
      if (!customer) {
        // No customer in Polar, return free benefits
        return {
          benefits: {
            plan: 'free',
            quizzesPerDay: SUBSCRIPTION_PLANS.free.limits.quizzesPerDay,
            categoriesAccess: SUBSCRIPTION_PLANS.free.limits.categoriesAccess,
            analyticsAccess: SUBSCRIPTION_PLANS.free.limits.analyticsAccess,
            lastSyncedAt: new Date().toISOString(),
          },
        };
      }

      const subscriptionData = await this.getSubscriptionBenefits(customer.id);
      return {
        customerId: customer.id,
        benefits: {
          ...subscriptionData.benefits,
          lastSyncedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Error syncing subscription benefits:', error);
      // Return free benefits on error
      return {
        benefits: {
          plan: 'free',
          quizzesPerDay: SUBSCRIPTION_PLANS.free.limits.quizzesPerDay,
          categoriesAccess: SUBSCRIPTION_PLANS.free.limits.categoriesAccess,
          analyticsAccess: SUBSCRIPTION_PLANS.free.limits.analyticsAccess,
          lastSyncedAt: new Date().toISOString(),
        },
      };
    }
  }
}

// Create singleton instance of Polar client
const polarClientInstance = new PolarClient();

// Simplified function to always return the real Polar client
export async function getPolarClient(userId?: string): Promise<PolarClient> {
  console.log('[Polar] Using real Polar client');
  return polarClientInstance;
}

// Export singleton instance
export const polarClient = polarClientInstance;

// Subscription plans configuration with dynamic environment variable reading
export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free',
    features: [
      'Access to basic certifications',
      'Up to 5 quizzes per day',
      'Basic performance analytics',
      'Community support',
    ],
    limits: {
      quizzesPerDay: 5,
      categoriesAccess: ['basic'],
      analyticsAccess: 'basic',
    },
  },
  pro: {
    name: 'Pro',
    // Use getter to read environment variable dynamically
    get productId() {
      const productId = process.env.POLAR_PRO_PRODUCT_ID || '';
      console.log('[Polar] Getting Pro Product ID:', productId ? `${productId.substring(0, 8)}...` : '(empty)');
      return productId;
    },
    features: [
      'Access to all certifications',
      'Unlimited quizzes',
      'Advanced analytics & insights',
      'AI-powered study recommendations',
      'Priority support',
      'Custom study plans',
    ],
    limits: {
      quizzesPerDay: -1, // Unlimited
      categoriesAccess: ['all'],
      analyticsAccess: 'advanced',
    },
  },
  enterprise: {
    name: 'Enterprise',
    // Use getter to read environment variable dynamically
    get productId() {
      const productId = process.env.POLAR_ENTERPRISE_PRODUCT_ID || '';
      console.log('[Polar] Getting Enterprise Product ID:', productId ? `${productId.substring(0, 8)}...` : '(empty)');
      return productId;
    },
    features: [
      'Everything in Pro',
      'Team management',
      'Custom certifications',
      'API access',
      'Dedicated support',
      'Custom integrations',
    ],
    limits: {
      quizzesPerDay: -1,
      categoriesAccess: ['all'],
      analyticsAccess: 'enterprise',
      teamMembers: -1,
    },
  },
};

export default polarClient;