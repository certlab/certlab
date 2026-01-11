/**
 * Purchase Verification Utilities
 *
 * Provides functions and types for verifying user purchases and access to premium content.
 */

import { storage } from './storage-factory';
import { logError } from './errors';
import type { Purchase } from '@shared/schema';

/**
 * Reason why access was denied
 */
export type AccessDeniedReason = 'no_purchase' | 'expired' | 'refunded';

/**
 * Result of purchase verification
 */
export interface PurchaseVerificationResult {
  hasAccess: boolean;
  reason?: AccessDeniedReason;
  purchase?: Purchase;
}

/**
 * Verify if a user has active access to a product
 *
 * @param userId - The user's unique identifier
 * @param productId - The product's unique identifier
 * @returns Verification result with access status and reason if denied
 */
export async function verifyPurchase(
  userId: string,
  productId: number
): Promise<PurchaseVerificationResult> {
  try {
    const purchase = await storage.getUserPurchase(userId, productId);

    if (!purchase) {
      return {
        hasAccess: false,
        reason: 'no_purchase',
      };
    }

    if (purchase.status === 'refunded') {
      return {
        hasAccess: false,
        reason: 'refunded',
        purchase,
      };
    }

    if (purchase.expiryDate && new Date() > new Date(purchase.expiryDate)) {
      return {
        hasAccess: false,
        reason: 'expired',
        purchase,
      };
    }

    return {
      hasAccess: true,
      purchase,
    };
  } catch (error) {
    logError('verifyPurchase', error, { userId, productId });
    return {
      hasAccess: false,
      reason: 'no_purchase',
    };
  }
}

/**
 * Check if a user has admin role
 * Admins bypass all purchase checks
 *
 * @param userRole - The user's role
 * @returns True if user is admin
 */
export function isAdmin(userRole: string): boolean {
  return userRole === 'admin';
}

/**
 * Verify purchase with admin bypass
 *
 * @param userId - The user's unique identifier
 * @param productId - The product's unique identifier
 * @param userRole - The user's role (for admin bypass)
 * @returns Verification result with access status
 */
export async function verifyPurchaseWithAdminBypass(
  userId: string,
  productId: number,
  userRole: string
): Promise<PurchaseVerificationResult> {
  // Admin bypass
  if (isAdmin(userRole)) {
    return {
      hasAccess: true,
    };
  }

  return verifyPurchase(userId, productId);
}
