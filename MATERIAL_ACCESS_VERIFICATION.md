# Material Access Verification System

## Overview

This system provides comprehensive purchase verification and access control for premium content in CertLab. It integrates with Firebase/Firestore to manage products, purchases, and user entitlements.

## Architecture

### Data Models

#### Product
Represents a purchasable item in the marketplace:
```typescript
interface Product {
  id: number;
  tenantId: number;
  title: string;
  description: string;
  type: 'quiz' | 'material' | 'course' | 'bundle';
  resourceIds: number[];  // Content IDs included
  price: number;          // Price in cents or tokens
  currency: string;
  isPremium: boolean;
  subscriptionDuration?: number;  // Days for subscriptions
  createdAt: Date;
  updatedAt: Date;
}
```

#### Purchase
Tracks user purchases and entitlements:
```typescript
interface Purchase {
  id: number;
  userId: string;
  tenantId: number;
  productId: number;
  productType: 'quiz' | 'material' | 'course' | 'bundle';
  purchaseDate: Date;
  expiryDate?: Date;      // For subscriptions
  status: 'active' | 'expired' | 'refunded';
  amount: number;          // Amount paid in cents
  currency: string;
  paymentMethod: string;   // 'stripe' | 'tokens' | 'polar' | 'admin_grant'
  transactionId?: string;
}
```

### Storage Methods

All purchase and product operations are available through the storage interface:

```typescript
// Product operations
await storage.getProducts(tenantId?);
await storage.getProduct(id);
await storage.createProduct(product);
await storage.updateProduct(id, updates);
await storage.deleteProduct(id);

// Purchase operations
await storage.getUserPurchases(userId);
await storage.getUserPurchase(userId, productId);
await storage.createPurchase(purchase);
await storage.updatePurchase(id, updates);
await storage.getAllPurchases(tenantId?);
await storage.refundPurchase(id);
await storage.checkProductAccess(userId, productId);
```

## Components

### PremiumContentGate

The main component for restricting access to premium content:

```tsx
import { PremiumContentGate } from '@/components/PremiumContentGate';

function MyPremiumPage() {
  return (
    <PremiumContentGate productId={123} productTitle="Advanced Course">
      {/* Your premium content here */}
      <div>This content is only visible to users who purchased the product</div>
    </PremiumContentGate>
  );
}
```

**Features:**
- Automatic purchase verification
- Loading state handling
- Access denied messages with purchase prompts
- Admin bypass support
- Handles expired subscriptions and refunded purchases

### AdminPurchasesView

Admin interface for managing purchases:

```tsx
import { AdminPurchasesView } from '@/components/AdminPurchasesView';

function AdminPage() {
  return (
    <div>
      <h1>Purchase Management</h1>
      <AdminPurchasesView />
    </div>
  );
}
```

**Features:**
- View all purchases
- Search by user ID, product, or transaction
- Grant manual access (admin grants)
- Refund purchases
- Filter and sort purchases

### UserPurchasesCard

Display user's purchase history in their profile:

```tsx
import { UserPurchasesCard } from '@/components/UserPurchasesCard';

function ProfilePage() {
  return (
    <div>
      {/* Other profile content */}
      <UserPurchasesCard />
    </div>
  );
}
```

**Features:**
- Shows active and expired purchases
- Purchase status badges
- Expiry date warnings
- Quick links to marketplace

## Hooks

### usePurchaseVerification

React hook for verifying purchases:

```tsx
import { usePurchaseVerification } from '@/hooks/usePurchaseVerification';

function MyComponent({ productId }) {
  const { verification, isLoading, refetch } = usePurchaseVerification(productId);

  if (isLoading) return <div>Loading...</div>;
  
  if (!verification?.hasAccess) {
    return <div>Access denied: {verification?.reason}</div>;
  }

  return <div>Welcome! You have access.</div>;
}
```

**Returns:**
- `verification` - Object with `hasAccess`, `reason`, and `purchase` details
- `isLoading` - Boolean indicating loading state
- `refetch` - Function to manually re-check verification

## Utilities

### verifyPurchase

Low-level function for purchase verification:

```typescript
import { verifyPurchase } from '@/lib/purchase-verification';

const result = await verifyPurchase(userId, productId);

if (result.hasAccess) {
  console.log('Access granted!');
} else {
  console.log('Access denied:', result.reason);
  // reason can be: 'no_purchase', 'expired', or 'refunded'
}
```

### verifyPurchaseWithAdminBypass

Verification with automatic admin bypass:

```typescript
import { verifyPurchaseWithAdminBypass } from '@/lib/purchase-verification';

const result = await verifyPurchaseWithAdminBypass(userId, productId, userRole);
// Automatically returns hasAccess: true for admin users
```

## Integration Examples

### Example 1: Protecting a Lecture Page

```tsx
import { useParams } from 'react-router-dom';
import { PremiumContentGate } from '@/components/PremiumContentGate';

export default function LecturePage() {
  const { lectureId } = useParams();
  const productId = 5; // ID of the product that includes this lecture

  return (
    <PremiumContentGate productId={productId}>
      <div className="lecture-content">
        <h1>Premium Lecture</h1>
        <video src={`/lectures/${lectureId}`} />
        <div className="transcript">
          {/* Lecture transcript */}
        </div>
      </div>
    </PremiumContentGate>
  );
}
```

### Example 2: Creating a Purchase

```typescript
import { storage } from '@/lib/storage-factory';

async function completePurchase(userId: string, productId: number) {
  const product = await storage.getProduct(productId);
  
  if (!product) {
    throw new Error('Product not found');
  }

  const purchase = await storage.createPurchase({
    userId,
    tenantId: 1,
    productId,
    productType: product.type,
    status: 'active',
    amount: product.price,
    currency: product.currency,
    paymentMethod: 'stripe',
    transactionId: 'stripe_tx_123456',
    expiryDate: product.subscriptionDuration
      ? new Date(Date.now() + product.subscriptionDuration * 24 * 60 * 60 * 1000)
      : null,
  });

  return purchase;
}
```

### Example 3: Admin Granting Access

```typescript
import { storage } from '@/lib/storage-factory';

async function grantAccess(adminUserId: string, targetUserId: string, productId: number) {
  // Verify admin has permissions (in real code)
  const admin = await storage.getUser(adminUserId);
  if (admin?.role !== 'admin') {
    throw new Error('Unauthorized');
  }

  const product = await storage.getProduct(productId);
  if (!product) {
    throw new Error('Product not found');
  }

  // Create purchase with admin_grant payment method
  await storage.createPurchase({
    userId: targetUserId,
    tenantId: 1,
    productId,
    productType: product.type,
    status: 'active',
    amount: 0, // Admin grants are free
    currency: product.currency,
    paymentMethod: 'admin_grant',
    transactionId: `admin_grant_${Date.now()}`,
    expiryDate: product.subscriptionDuration
      ? new Date(Date.now() + product.subscriptionDuration * 24 * 60 * 60 * 1000)
      : null,
  });
}
```

### Example 4: Checking Multiple Products

```typescript
import { storage } from '@/lib/storage-factory';

async function checkAccessToBundle(userId: string, productIds: number[]) {
  const results = await Promise.all(
    productIds.map(id => storage.checkProductAccess(userId, id))
  );

  return {
    hasFullAccess: results.every(r => r),
    accessCount: results.filter(r => r).length,
    totalCount: results.length,
  };
}
```

## Access Denied Reasons

The system provides specific reasons for access denial:

- **`no_purchase`** - User has not purchased the product
- **`expired`** - Subscription has expired
- **`refunded`** - Purchase was refunded

Display appropriate messages based on the reason:

```typescript
function getAccessDeniedMessage(reason?: string): string {
  switch (reason) {
    case 'expired':
      return 'Your subscription has expired. Renew your access to continue.';
    case 'refunded':
      return 'This purchase has been refunded. Purchase again to regain access.';
    case 'no_purchase':
    default:
      return 'Purchase required to access this content.';
  }
}
```

## Testing

The system includes comprehensive tests:

```bash
# Run purchase verification tests
npm run test:run -- client/src/test/purchase-verification.test.ts

# Run PremiumContentGate tests
npm run test:run -- client/src/test/PremiumContentGate.test.tsx

# Run all tests
npm run test:run
```

**Test Coverage:**
- Purchase verification logic (11 tests)
- PremiumContentGate component (7 tests)
- Admin bypass functionality
- Expiry date handling
- Refund detection
- Loading states
- Access denied messages

## Security Considerations

1. **Server-side verification** - While this implementation provides client-side gating, actual content should be protected server-side or in Firestore rules.

2. **Firestore Security Rules** - Add rules to protect purchase data:
```javascript
// Allow users to read their own purchases
match /users/{userId}/purchases/{purchaseId} {
  allow read: if request.auth.uid == userId;
  allow write: if false; // Only server can write
}

// Allow admins to read all purchases
match /users/{userId}/purchases/{purchaseId} {
  allow read: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

3. **Admin verification** - Always verify admin role server-side before granting manual access.

4. **Token validation** - Validate payment tokens and transaction IDs on the server before creating purchases.

## Future Enhancements

Potential improvements for the system:

1. **Webhook integration** - Automatic purchase creation from payment webhooks
2. **Trial periods** - Support for free trial subscriptions
3. **Bulk operations** - Admin tools for bulk access grants/revokes
4. **Purchase analytics** - Revenue tracking and reporting
5. **Upgrade/downgrade** - Support for subscription plan changes
6. **Family sharing** - Allow sharing purchases within groups
7. **Gift purchases** - Enable users to purchase for others
8. **Coupons/discounts** - Promotional code system

## Support

For issues or questions:
- Check Firestore logs for storage errors
- Verify product IDs match between marketplace and protection
- Ensure user authentication is working
- Check browser console for client-side errors
- Review Firestore security rules for permission issues
