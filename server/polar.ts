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
  private apiKey: string;
  private baseUrl = 'https://api.polar.sh/v1';
  private organizationId?: string;

  constructor(config: PolarConfig) {
    this.apiKey = config.apiKey;
    this.organizationId = config.organizationId;
    
    if (!this.apiKey) {
      console.warn('Polar API key not configured. Subscription features will be disabled.');
    }
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
    return this.request<PolarSubscription[]>(`/subscriptions${queryString ? `?${queryString}` : ''}`);
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
    const customers = await this.request<PolarCustomer[]>(`/customers?${params}`);
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
    return this.request<PolarCheckoutSession>('/checkout/sessions', {
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
    return this.request<PolarCheckoutSession>(`/checkout/sessions/${sessionId}`);
  }

  // Webhook verification
  verifyWebhook(payload: string, signature: string, secret: string): boolean {
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

// Export singleton instance
const polarApiKey = process.env.POLAR_API_KEY || '';
const polarOrganizationId = process.env.POLAR_ORGANIZATION_ID;
const polarWebhookSecret = process.env.POLAR_WEBHOOK_SECRET;

export const polarClient = new PolarClient({
  apiKey: polarApiKey,
  organizationId: polarOrganizationId,
  webhookSecret: polarWebhookSecret,
});

// Subscription plans configuration
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
    productId: process.env.POLAR_PRO_PRODUCT_ID || '',
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
    productId: process.env.POLAR_ENTERPRISE_PRODUCT_ID || '',
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