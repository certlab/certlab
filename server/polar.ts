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
  status: 'pending' | 'succeeded' | 'expired' | 'failed' | 'canceled';
  created_at: string;
  expires_at: string;
  success_url: string;
  cancel_url?: string;
  customer?: PolarCustomer;
  customer_email?: string;
  customer_name?: string;
  product: {
    id: string;
    name: string;
    description?: string;
  };
  price: {
    id: string;
    amount: number;
    currency: string;
    recurring_interval?: 'month' | 'year';
  };
  amount?: number;
  currency?: string;
  productId: string;
  priceId: string;
  metadata?: Record<string, any>;
  payment_intent_status?: string;
  subscription_id?: string;
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

  // Getter for organization ID that reads from env vars dynamically based on environment
  private get organizationId(): string | undefined {
    const isDev = this.isDevelopment;
    
    // Use correct prefix based on environment
    const envVarName = isDev ? 'POLAR_SANDBOX_ORGANIZATION_ID' : 'POLAR_ORGANIZATION_ID';
    const orgId = this._organizationId || process.env[envVarName];
    
    if (orgId) {
      console.log(`[Polar] Organization ID found (${isDev ? 'SANDBOX' : 'PRODUCTION'}):`, orgId.substring(0, 8) + '...');
    } else if (this._organizationId === undefined) {
      console.log(`[Polar] Organization ID not set (checked ${envVarName})`);
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

  // Checkout Sessions API - Enhanced with full compliance
  async createCheckoutSession(params: {
    productId: string;
    successUrl: string;
    cancelUrl?: string;
    customerEmail?: string;
    customerName?: string;
    metadata?: Record<string, any>;
    amount?: number; // For custom amount support
    priceId?: string; // Optional specific price ID
    allowPromotionCodes?: boolean;
    billingAddressCollection?: boolean;
  }): Promise<PolarCheckoutSession> {
    const isDev = this.isDevelopment;
    
    // Comprehensive validation
    if (!params.productId) {
      throw new Error('Product ID is required to create a checkout session');
    }
    
    if (!params.successUrl) {
      throw new Error('Success URL is required for checkout session');
    }
    
    // Validate URLs are properly formatted
    try {
      new URL(params.successUrl);
      if (params.cancelUrl) {
        new URL(params.cancelUrl);
      }
    } catch (error) {
      throw new Error('Invalid URL format in success_url or cancel_url');
    }
    
    console.log(`[Polar] ${isDev ? '🧪 SANDBOX' : '🚀 PRODUCTION'} - Creating checkout session`);
    console.log('[Polar] Checkout parameters:', {
      productId: params.productId ? params.productId.substring(0, 8) + '...' : '(empty)',
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      customerEmail: params.customerEmail ? '***' + params.customerEmail.substring(params.customerEmail.indexOf('@')) : undefined,
      hasMetadata: !!params.metadata,
      customAmount: params.amount,
    });
    
    console.log('[Polar] Environment check at checkout time:');
    if (isDev) {
      console.log('  - POLAR_SANDBOX_API_KEY:', process.env.POLAR_SANDBOX_API_KEY ? 'Set' : 'Not set');
      console.log('  - POLAR_SANDBOX_PRO_PRODUCT_ID:', process.env.POLAR_SANDBOX_PRO_PRODUCT_ID ? process.env.POLAR_SANDBOX_PRO_PRODUCT_ID.substring(0, 8) + '...' : 'Not set');
      console.log('  - POLAR_SANDBOX_ENTERPRISE_PRODUCT_ID:', process.env.POLAR_SANDBOX_ENTERPRISE_PRODUCT_ID ? process.env.POLAR_SANDBOX_ENTERPRISE_PRODUCT_ID.substring(0, 8) + '...' : 'Not set');
    } else {
      console.log('  - POLAR_API_KEY:', process.env.POLAR_API_KEY ? 'Set' : 'Not set');
      console.log('  - POLAR_PRO_PRODUCT_ID:', process.env.POLAR_PRO_PRODUCT_ID ? process.env.POLAR_PRO_PRODUCT_ID.substring(0, 8) + '...' : 'Not set');
      console.log('  - POLAR_ENTERPRISE_PRODUCT_ID:', process.env.POLAR_ENTERPRISE_PRODUCT_ID ? process.env.POLAR_ENTERPRISE_PRODUCT_ID.substring(0, 8) + '...' : 'Not set');
    }
    
    // Build request body according to Polar API spec
    const requestBody: any = {
      product_id: params.productId,
      success_url: params.successUrl,
    };
    
    // Add optional fields only if provided
    if (params.cancelUrl) {
      requestBody.cancel_url = params.cancelUrl;
    }
    
    if (params.customerEmail) {
      requestBody.customer_email = params.customerEmail;
    }
    
    if (params.customerName) {
      requestBody.customer_name = params.customerName;
    }
    
    if (params.metadata) {
      requestBody.metadata = params.metadata;
    }
    
    if (params.amount !== undefined) {
      requestBody.amount = params.amount;
    }
    
    if (params.priceId) {
      requestBody.price_id = params.priceId;
    }
    
    if (params.allowPromotionCodes !== undefined) {
      requestBody.allow_promotion_codes = params.allowPromotionCodes;
    }
    
    if (params.billingAddressCollection !== undefined) {
      requestBody.billing_address_collection = params.billingAddressCollection;
    }
    
    try {
      const session = await this.request<PolarCheckoutSession>('/checkouts', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
      
      console.log('[Polar] Checkout session created successfully:', {
        sessionId: session.id,
        status: session.status,
        expiresAt: session.expires_at,
      });
      
      return session;
    } catch (error: any) {
      // Enhanced error handling with specific error messages
      console.error('[Polar] Failed to create checkout session:', error);
      
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        throw new Error(
          `Product not found: The product ID '${params.productId}' does not exist in your Polar account. ` +
          `Please verify the product ID is correct and that the product is active in your Polar dashboard.`
        );
      }
      
      if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
        throw new Error(
          'Authentication failed: Please check your Polar API key configuration. ' +
          'Ensure you are using the correct API key for the current environment (sandbox vs production).'
        );
      }
      
      if (error.message?.includes('400') || error.message?.includes('bad request')) {
        throw new Error(
          `Invalid checkout request: ${error.message}. ` +
          'Please verify all required fields are provided and properly formatted.'
        );
      }
      
      // Re-throw with more context
      throw new Error(`Failed to create Polar checkout session: ${error.message}`);
    }
  }

  async getCheckoutSession(sessionId: string): Promise<PolarCheckoutSession> {
    if (!sessionId) {
      throw new Error('Session ID is required to retrieve checkout session');
    }
    
    console.log('[Polar] Retrieving checkout session:', sessionId);
    
    try {
      const session = await this.request<PolarCheckoutSession>(`/checkouts/${sessionId}`);
      
      // Log session status for debugging
      console.log('[Polar] Checkout session retrieved:', {
        sessionId: session.id,
        status: session.status,
        createdAt: session.created_at,
        expiresAt: session.expires_at,
        hasCustomer: !!session.customer,
        hasProduct: !!session.product,
        subscriptionId: session.subscription_id,
      });
      
      // Check session status and provide helpful information
      if (session.status === 'expired') {
        console.warn('[Polar] Checkout session has expired:', sessionId);
        throw new Error(
          'This checkout session has expired. Please start a new checkout process to continue with your subscription.'
        );
      }
      
      if (session.status === 'canceled') {
        console.warn('[Polar] Checkout session was canceled:', sessionId);
        throw new Error(
          'This checkout session was canceled. Please start a new checkout process if you wish to subscribe.'
        );
      }
      
      if (session.status === 'failed') {
        console.error('[Polar] Checkout session failed:', sessionId);
        throw new Error(
          'This checkout session failed due to a payment issue. Please try again with a different payment method.'
        );
      }
      
      // Check if session is near expiration (within 5 minutes)
      if (session.expires_at) {
        const expiresAt = new Date(session.expires_at);
        const now = new Date();
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();
        const fiveMinutesInMs = 5 * 60 * 1000;
        
        if (timeUntilExpiry < fiveMinutesInMs && timeUntilExpiry > 0) {
          console.warn('[Polar] Checkout session expiring soon:', {
            sessionId,
            expiresIn: Math.round(timeUntilExpiry / 1000) + ' seconds',
          });
        }
      }
      
      // Return the complete session details
      return session;
    } catch (error: any) {
      console.error('[Polar] Failed to retrieve checkout session:', error);
      
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        throw new Error(
          `Checkout session not found: The session ID '${sessionId}' does not exist or has already been used. ` +
          'Please start a new checkout process.'
        );
      }
      
      if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
        throw new Error(
          'Authentication failed while retrieving checkout session. Please contact support.'
        );
      }
      
      // Re-throw the error if it's already formatted
      if (error.message?.includes('expired') || error.message?.includes('canceled') || error.message?.includes('failed')) {
        throw error;
      }
      
      // Generic error
      throw new Error(`Failed to retrieve checkout session: ${error.message}`);
    }
  }
  
  // Helper method to validate checkout session for processing
  async validateCheckoutSession(sessionId: string): Promise<{
    isValid: boolean;
    session?: PolarCheckoutSession;
    error?: string;
  }> {
    try {
      const session = await this.getCheckoutSession(sessionId);
      
      if (session.status !== 'succeeded') {
        return {
          isValid: false,
          session,
          error: `Checkout session is in ${session.status} state. Only succeeded sessions can be processed.`,
        };
      }
      
      // Check if session has already been processed (has subscription_id)
      if (session.subscription_id) {
        console.log('[Polar] Checkout session already processed with subscription:', session.subscription_id);
      }
      
      return {
        isValid: true,
        session,
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message,
      };
    }
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
    // Use getter to read environment variable dynamically based on environment
    get productId() {
      const isDev = process.env.NODE_ENV === 'development' || 
                   process.env.NODE_ENV === 'dev' ||
                   (process.env.NODE_ENV === undefined && process.env.POLAR_SANDBOX_API_KEY !== undefined);
      
      const productId = isDev 
        ? process.env.POLAR_SANDBOX_PRO_PRODUCT_ID || ''
        : process.env.POLAR_PRO_PRODUCT_ID || '';
      
      console.log(`[Polar] Getting Pro Product ID (${isDev ? 'SANDBOX' : 'PRODUCTION'}):`, 
                  productId ? `${productId.substring(0, 8)}...` : '(empty)');
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
    // Use getter to read environment variable dynamically based on environment
    get productId() {
      const isDev = process.env.NODE_ENV === 'development' || 
                   process.env.NODE_ENV === 'dev' ||
                   (process.env.NODE_ENV === undefined && process.env.POLAR_SANDBOX_API_KEY !== undefined);
      
      const productId = isDev 
        ? process.env.POLAR_SANDBOX_ENTERPRISE_PRODUCT_ID || ''
        : process.env.POLAR_ENTERPRISE_PRODUCT_ID || '';
      
      console.log(`[Polar] Getting Enterprise Product ID (${isDev ? 'SANDBOX' : 'PRODUCTION'}):`, 
                  productId ? `${productId.substring(0, 8)}...` : '(empty)');
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