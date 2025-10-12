// Mock Polar API Client for Development Testing
// This module provides a complete mock implementation of the Polar API client
// with in-memory data storage and realistic API behavior simulation

// Reuse interfaces from real Polar client
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

// Subscription plan configuration
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
    productId: 'be33a4b3-f8a5-4369-89cf-7a1956dca722',
    priceId: 'price_mock_pro_monthly',
    amount: 1999, // $19.99
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
    productId: '753f19d6-7b38-47f5-8163-3c37c1c5e9f8',
    priceId: 'price_mock_enterprise_monthly',
    amount: 4999, // $49.99
    features: [
      'Everything in Pro',
      'API access',
      'Team management',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee',
    ],
    limits: {
      quizzesPerDay: -1, // Unlimited
      categoriesAccess: ['all'],
      analyticsAccess: 'enterprise',
      teamMembers: 50,
    },
  },
};

export class MockPolarClient {
  // In-memory data stores
  private customers: Map<string, PolarCustomer> = new Map();
  private subscriptions: Map<string, PolarSubscription> = new Map();
  private products: Map<string, PolarProduct> = new Map();
  private checkoutSessions: Map<string, PolarCheckoutSession> = new Map();
  
  // Counter for generating unique IDs
  private idCounter = {
    customer: 1000,
    subscription: 2000,
    checkout: 3000,
  };

  constructor() {
    console.log('[MockPolar] Initializing mock Polar client for development');
    this.initializeProducts();
    this.initializeTestData();
  }

  // Initialize mock products
  private initializeProducts(): void {
    // Pro product
    this.products.set(SUBSCRIPTION_PLANS.pro.productId, {
      id: SUBSCRIPTION_PLANS.pro.productId,
      name: 'Pro',
      description: 'Professional certification training with unlimited access',
      prices: [
        {
          id: SUBSCRIPTION_PLANS.pro.priceId,
          amount: SUBSCRIPTION_PLANS.pro.amount,
          currency: 'USD',
          interval: 'month',
          intervalCount: 1,
        },
        {
          id: 'price_mock_pro_yearly',
          amount: 19999, // $199.99
          currency: 'USD',
          interval: 'year',
          intervalCount: 1,
        },
      ],
      features: SUBSCRIPTION_PLANS.pro.features,
    });

    // Enterprise product
    this.products.set(SUBSCRIPTION_PLANS.enterprise.productId, {
      id: SUBSCRIPTION_PLANS.enterprise.productId,
      name: 'Enterprise',
      description: 'Complete solution for teams and organizations',
      prices: [
        {
          id: SUBSCRIPTION_PLANS.enterprise.priceId,
          amount: SUBSCRIPTION_PLANS.enterprise.amount,
          currency: 'USD',
          interval: 'month',
          intervalCount: 1,
        },
        {
          id: 'price_mock_enterprise_yearly',
          amount: 49999, // $499.99
          currency: 'USD',
          interval: 'year',
          intervalCount: 1,
        },
      ],
      features: SUBSCRIPTION_PLANS.enterprise.features,
    });
  }

  // Initialize test data including test user
  private initializeTestData(): void {
    // Create test user customer - use actual test user email from the database
    const testCustomer: PolarCustomer = {
      id: 'cust_test_999999',
      email: 'adam.chubbuck@gmail.com', // Actual test user email from database
      name: 'Test User',
      metadata: {
        userId: '999999',
        source: 'certlab',
        created_at: new Date('2024-01-01').toISOString(),
      },
    };
    this.customers.set(testCustomer.email, testCustomer);

    // Create a few other mock customers
    const mockCustomers = [
      { id: 'cust_mock_001', email: 'john.doe@example.com', name: 'John Doe' },
      { id: 'cust_mock_002', email: 'jane.smith@example.com', name: 'Jane Smith' },
      { id: 'cust_mock_003', email: 'pro.user@example.com', name: 'Pro User' },
    ];

    mockCustomers.forEach(customer => {
      this.customers.set(customer.email, {
        ...customer,
        metadata: { source: 'certlab', created_at: new Date().toISOString() },
      });
    });

    // Create a Pro subscription for pro.user@example.com
    const proCustomer = this.customers.get('pro.user@example.com')!;
    const proSubscription: PolarSubscription = {
      id: 'sub_mock_pro_001',
      customerId: proCustomer.id,
      productId: SUBSCRIPTION_PLANS.pro.productId,
      priceId: SUBSCRIPTION_PLANS.pro.priceId,
      status: 'active',
      currentPeriodStart: new Date('2024-01-01'),
      currentPeriodEnd: new Date('2024-02-01'),
    };
    this.subscriptions.set(proSubscription.id, proSubscription);
  }

  // Generate a unique ID
  private generateId(type: 'customer' | 'subscription' | 'checkout'): string {
    const prefix = {
      customer: 'cust_mock_',
      subscription: 'sub_mock_',
      checkout: 'cs_mock_',
    }[type];
    return `${prefix}${this.idCounter[type]++}`;
  }

  // Products API
  async getProducts(): Promise<PolarProduct[]> {
    console.log('[MockPolar] Getting all products');
    return Array.from(this.products.values());
  }

  async getProduct(productId: string): Promise<PolarProduct> {
    console.log('[MockPolar] Getting product:', productId);
    const product = this.products.get(productId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }
    return product;
  }

  async createProduct(product: Partial<PolarProduct>): Promise<PolarProduct> {
    console.log('[MockPolar] Creating product:', product.name);
    const newProduct: PolarProduct = {
      id: `prod_mock_${Date.now()}`,
      name: product.name || 'New Product',
      description: product.description || '',
      prices: product.prices || [],
      features: product.features,
    };
    this.products.set(newProduct.id, newProduct);
    return newProduct;
  }

  // Subscriptions API
  async getSubscriptions(customerId?: string): Promise<PolarSubscription[]> {
    console.log('[MockPolar] Getting subscriptions for customer:', customerId);
    
    if (customerId) {
      const customerSubs = Array.from(this.subscriptions.values())
        .filter(sub => sub.customerId === customerId);
      return customerSubs;
    }
    
    return Array.from(this.subscriptions.values());
  }

  async getSubscription(subscriptionId: string): Promise<PolarSubscription> {
    console.log('[MockPolar] Getting subscription:', subscriptionId);
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }
    return subscription;
  }

  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd = true): Promise<PolarSubscription> {
    console.log('[MockPolar] Canceling subscription:', subscriptionId, 'at period end:', cancelAtPeriodEnd);
    
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    if (cancelAtPeriodEnd) {
      subscription.cancelAtPeriodEnd = true;
    } else {
      subscription.status = 'canceled';
      subscription.canceledAt = new Date();
    }

    this.subscriptions.set(subscriptionId, subscription);
    return subscription;
  }

  async resumeSubscription(subscriptionId: string): Promise<PolarSubscription> {
    console.log('[MockPolar] Resuming subscription:', subscriptionId);
    
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    subscription.status = 'active';
    subscription.cancelAtPeriodEnd = false;
    subscription.canceledAt = undefined;

    this.subscriptions.set(subscriptionId, subscription);
    return subscription;
  }

  async switchSubscriptionPlan(params: {
    subscriptionId: string;
    newProductId: string;
    priceId?: string;
    switchAtPeriodEnd?: boolean;
  }): Promise<PolarSubscription> {
    console.log('[MockPolar] Switching subscription plan:', params);
    
    const subscription = this.subscriptions.get(params.subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${params.subscriptionId} not found`);
    }

    const newProduct = this.products.get(params.newProductId);
    if (!newProduct) {
      throw new Error(`Product ${params.newProductId} not found`);
    }

    // Determine if this is an upgrade or downgrade
    const oldPlan = this.getPlanFromProductId(subscription.productId);
    const newPlan = this.getPlanFromProductId(params.newProductId);
    const isUpgrade = this.isPlanUpgrade(oldPlan, newPlan);

    if (!params.switchAtPeriodEnd || isUpgrade) {
      // Immediate switch for upgrades
      subscription.productId = params.newProductId;
      subscription.priceId = params.priceId || newProduct.prices[0].id;
      console.log('[MockPolar] Immediately switched to new plan');
    } else {
      // Schedule for end of period (for downgrades)
      console.log('[MockPolar] Scheduled switch for end of period');
      // In a real implementation, we'd track the pending change
    }

    this.subscriptions.set(params.subscriptionId, subscription);
    return subscription;
  }

  async getProductPrices(productId: string): Promise<PolarPrice[]> {
    console.log('[MockPolar] Getting prices for product:', productId);
    const product = await this.getProduct(productId);
    return product.prices || [];
  }

  // Customers API
  async createCustomer(customer: Partial<PolarCustomer>): Promise<PolarCustomer> {
    console.log('[MockPolar] Creating customer:', customer.email);
    
    // Check if customer already exists
    if (customer.email && this.customers.has(customer.email)) {
      throw new Error(`Customer with email ${customer.email} already exists`);
    }

    const newCustomer: PolarCustomer = {
      id: this.generateId('customer'),
      email: customer.email || `user_${Date.now()}@example.com`,
      name: customer.name,
      metadata: customer.metadata || {},
    };

    this.customers.set(newCustomer.email, newCustomer);
    return newCustomer;
  }

  async getCustomer(customerId: string): Promise<PolarCustomer> {
    console.log('[MockPolar] Getting customer:', customerId);
    
    const customer = Array.from(this.customers.values())
      .find(c => c.id === customerId);
    
    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }
    
    return customer;
  }

  async getCustomerByEmail(email: string): Promise<PolarCustomer | null> {
    console.log('[MockPolar] Searching for customer with email:', email);
    const customer = this.customers.get(email);
    return customer || null;
  }

  async updateCustomer(customerId: string, updates: Partial<PolarCustomer>): Promise<PolarCustomer> {
    console.log('[MockPolar] Updating customer:', customerId);
    
    const customer = await this.getCustomer(customerId);
    const updatedCustomer = { ...customer, ...updates };
    
    // Update the email key if email changed
    if (updates.email && updates.email !== customer.email) {
      this.customers.delete(customer.email);
    }
    
    this.customers.set(updatedCustomer.email, updatedCustomer);
    return updatedCustomer;
  }

  // Checkout Sessions API
  async createCheckoutSession(params: {
    productId: string;
    successUrl: string;
    cancelUrl?: string;
    customerEmail?: string;
    metadata?: Record<string, any>;
  }): Promise<PolarCheckoutSession> {
    console.log('[MockPolar] Creating checkout session for product:', params.productId);
    
    const product = this.products.get(params.productId);
    if (!product) {
      throw new Error(`Product ${params.productId} not found`);
    }

    const sessionId = this.generateId('checkout');
    
    // In dev mode, immediately create a subscription for the customer
    if (params.customerEmail) {
      const customer = await this.getCustomerByEmail(params.customerEmail);
      if (customer) {
        console.log('[MockPolar] Immediately creating subscription for customer:', customer.id);
        
        // Check for existing subscriptions first
        const existingSubscriptions = await this.getSubscriptions(customer.id);
        const activeSubscription = existingSubscriptions.find(sub => 
          sub.status === 'active' || sub.status === 'trialing'
        );
        
        if (activeSubscription) {
          // Cancel existing subscription
          console.log('[MockPolar] Canceling existing subscription:', activeSubscription.id);
          activeSubscription.status = 'canceled';
          activeSubscription.canceledAt = new Date();
        }
        
        // Create new subscription immediately
        const subscriptionId = this.generateId('subscription');
        const newSubscription: PolarSubscription = {
          id: subscriptionId,
          customerId: customer.id,
          productId: params.productId,
          priceId: product.prices[0].id,
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        };
        
        this.subscriptions.set(subscriptionId, newSubscription);
        console.log('[MockPolar] Created subscription:', subscriptionId, 'for product:', product.name);
      }
    }
    
    // Replace {CHECKOUT_SESSION_ID} placeholder in successUrl with actual session ID
    const successUrlWithSessionId = params.successUrl.replace('{CHECKOUT_SESSION_ID}', sessionId);
    
    // Return the success URL directly as the checkout URL (simulating instant checkout)
    const checkoutSession: PolarCheckoutSession = {
      id: sessionId,
      url: successUrlWithSessionId, // Use the success URL instead of external mock URL
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      productId: params.productId,
      priceId: product.prices[0].id,
      metadata: params.metadata,
    };

    if (params.customerEmail) {
      const customer = await this.getCustomerByEmail(params.customerEmail);
      if (customer) {
        checkoutSession.customer = customer;
      }
    }

    this.checkoutSessions.set(sessionId, checkoutSession);
    console.log('[MockPolar] Created checkout session:', sessionId);
    console.log('[MockPolar] Redirecting to:', successUrlWithSessionId);
    
    return checkoutSession;
  }

  async getCheckoutSession(sessionId: string): Promise<PolarCheckoutSession> {
    console.log('[MockPolar] Getting checkout session:', sessionId);
    
    const session = this.checkoutSessions.get(sessionId);
    if (!session) {
      throw new Error(`Checkout session ${sessionId} not found`);
    }
    
    return session;
  }

  // Webhook verification (always returns true in mock)
  verifyWebhook(payload: string, signature: string): boolean {
    console.log('[MockPolar] Verifying webhook (mock always returns true)');
    return true;
  }

  // Helper methods for CertLab integration
  async createOrGetCustomerForUser(email: string, name?: string): Promise<PolarCustomer> {
    console.log('[MockPolar] Create or get customer for:', email);
    
    let customer = await this.getCustomerByEmail(email);
    
    if (!customer) {
      try {
        customer = await this.createCustomer({
          email,
          name,
          metadata: {
            source: 'certlab',
            created_at: new Date().toISOString(),
          },
        });
      } catch (error: any) {
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
    console.log('[MockPolar] Getting subscription status for:', customerEmail);
    
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
      console.error('[MockPolar] Error checking subscription status:', error);
      return { isSubscribed: false };
    }
  }

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
    console.log('[MockPolar] Getting subscription benefits for customer:', customerId);
    
    try {
      const subscriptions = await this.getSubscriptions(customerId);
      const activeSubscription = subscriptions.find(sub => 
        sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due'
      );

      if (activeSubscription) {
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
      console.error('[MockPolar] Error getting subscription benefits:', error);
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

  async syncUserSubscriptionBenefits(email: string): Promise<{
    customerId?: string;
    benefits: any;
  }> {
    console.log('[MockPolar] Syncing subscription benefits for:', email);
    
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
      console.error('[MockPolar] Error syncing subscription benefits:', error);
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

  // Additional mock-specific methods

  // Create a customer portal URL (mock)
  async getCustomerPortal(customerId: string): Promise<string> {
    console.log('[MockPolar] Getting customer portal URL for:', customerId);
    return `https://mock-portal.polar.sh/customer/${customerId}`;
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

  // Helper to determine if a plan change is an upgrade
  private isPlanUpgrade(oldPlan: string, newPlan: string): boolean {
    const planOrder = { free: 0, pro: 1, enterprise: 2 };
    return (planOrder[newPlan as keyof typeof planOrder] || 0) > 
           (planOrder[oldPlan as keyof typeof planOrder] || 0);
  }

  // Mock method to simulate successful checkout completion
  async completeCheckout(sessionId: string): Promise<PolarSubscription> {
    console.log('[MockPolar] Completing checkout for session:', sessionId);
    
    const session = await this.getCheckoutSession(sessionId);
    
    // Create or get customer
    let customer: PolarCustomer;
    if (session.customer) {
      customer = session.customer;
    } else {
      customer = await this.createCustomer({
        email: `customer_${Date.now()}@example.com`,
        metadata: { checkoutSession: sessionId },
      });
    }

    // Create subscription
    const subscription: PolarSubscription = {
      id: this.generateId('subscription'),
      customerId: customer.id,
      productId: session.productId,
      priceId: session.priceId,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };

    this.subscriptions.set(subscription.id, subscription);
    console.log('[MockPolar] Created subscription from checkout:', subscription.id);
    
    return subscription;
  }

  // Debug method to view all mock data
  async debugGetAllData(): Promise<{
    customers: PolarCustomer[];
    subscriptions: PolarSubscription[];
    products: PolarProduct[];
    checkoutSessions: PolarCheckoutSession[];
  }> {
    return {
      customers: Array.from(this.customers.values()),
      subscriptions: Array.from(this.subscriptions.values()),
      products: Array.from(this.products.values()),
      checkoutSessions: Array.from(this.checkoutSessions.values()),
    };
  }
}

// Export a singleton instance for consistency
export const mockPolarClient = new MockPolarClient();

// Export for testing convenience
export default MockPolarClient;