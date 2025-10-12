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
  private baseUrl = 'https://api.polar.sh/v1';
  private _organizationId?: string;
  private _webhookSecret?: string;

  constructor(config?: Partial<PolarConfig>) {
    // Store config if provided, but allow dynamic reading
    this._apiKey = config?.apiKey;
    this._organizationId = config?.organizationId;
    this._webhookSecret = config?.webhookSecret;
  }

  // Getter for API key that reads from env vars dynamically
  private get apiKey(): string {
    const key = this._apiKey || process.env.POLAR_API_KEY || '';
    if (!key) {
      console.log('[Polar] API key not configured (checked at runtime)');
    } else {
      console.log('[Polar] API key found:', key.substring(0, 8) + '...');
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
      console.error('Polar API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        url: url,
        error: error,
        errorDetail: error.detail ? JSON.stringify(error.detail, null, 2) : 'No detail',
        body: options.body
      });
      throw new Error(`Polar API Error: ${error.message || response.statusText}`);
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

  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd = true): Promise<PolarSubscription> {
    return this.request<PolarSubscription>(`/subscriptions/${subscriptionId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        cancel_at_period_end: cancelAtPeriodEnd,
      }),
    });
  }

  async resumeSubscription(subscriptionId: string): Promise<PolarSubscription> {
    return this.request<PolarSubscription>(`/subscriptions/${subscriptionId}/resume`, {
      method: 'POST',
    });
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
    console.log('[Polar] Creating checkout session with product ID:', params.productId ? params.productId.substring(0, 8) + '...' : '(empty)');
    console.log('[Polar] Environment check at checkout time:');
    console.log('  - POLAR_API_KEY:', process.env.POLAR_API_KEY ? 'Set' : 'Not set');
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

  // Webhook verification
  verifyWebhook(payload: string, signature: string): boolean {
    // Use dynamic webhook secret
    const secret = this.webhookSecret;
    
    if (!secret) {
      console.log('[Polar] Webhook secret not configured');
      return false;
    }
    
    console.log('[Polar] Verifying webhook with secret:', secret.substring(0, 8) + '...');
    
    // Implement webhook signature verification
    // This is a placeholder - actual implementation depends on Polar's webhook signature format
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return signature === expectedSignature;
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
}

// Export singleton instance that reads environment variables dynamically
// Don't pass any config to constructor so it will use the getters
console.log('[Polar] Initializing Polar client with dynamic environment variable reading');
export const polarClient = new PolarClient();

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