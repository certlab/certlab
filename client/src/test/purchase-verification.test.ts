/**
 * Tests for Purchase Verification
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  verifyPurchase,
  isAdmin,
  verifyPurchaseWithAdminBypass,
} from '../lib/purchase-verification';
import type { Purchase } from '@shared/schema';

// Mock the storage module
vi.mock('../lib/storage-factory', () => ({
  storage: {
    getUserPurchase: vi.fn(),
  },
}));

// Mock the errors module
vi.mock('../lib/errors', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

import { storage } from '../lib/storage-factory';

describe('Purchase Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyPurchase', () => {
    it('should return hasAccess: false with no_purchase reason when purchase does not exist', async () => {
      vi.mocked(storage.getUserPurchase).mockResolvedValue(null);

      const result = await verifyPurchase('user123', 1);

      expect(result).toEqual({
        hasAccess: false,
        reason: 'no_purchase',
      });
      expect(storage.getUserPurchase).toHaveBeenCalledWith('user123', 1);
    });

    it('should return hasAccess: false with refunded reason when purchase is refunded', async () => {
      const refundedPurchase: Purchase = {
        id: 1,
        userId: 'user123',
        tenantId: 1,
        productId: 1,
        productType: 'material',
        purchaseDate: new Date('2024-01-01'),
        expiryDate: null,
        status: 'refunded',
        amount: 1000,
        currency: 'USD',
        paymentMethod: 'stripe',
        transactionId: 'tx_123',
      };

      vi.mocked(storage.getUserPurchase).mockResolvedValue(refundedPurchase);

      const result = await verifyPurchase('user123', 1);

      expect(result).toEqual({
        hasAccess: false,
        reason: 'refunded',
        purchase: refundedPurchase,
      });
    });

    it('should return hasAccess: false with expired reason when subscription has expired', async () => {
      const expiredPurchase: Purchase = {
        id: 1,
        userId: 'user123',
        tenantId: 1,
        productId: 1,
        productType: 'course',
        purchaseDate: new Date('2024-01-01'),
        expiryDate: new Date('2024-01-31'), // Expired
        status: 'active',
        amount: 1000,
        currency: 'USD',
        paymentMethod: 'stripe',
        transactionId: 'tx_123',
      };

      vi.mocked(storage.getUserPurchase).mockResolvedValue(expiredPurchase);

      const result = await verifyPurchase('user123', 1);

      expect(result).toEqual({
        hasAccess: false,
        reason: 'expired',
        purchase: expiredPurchase,
      });
    });

    it('should return hasAccess: true when purchase is active and not expired', async () => {
      const activePurchase: Purchase = {
        id: 1,
        userId: 'user123',
        tenantId: 1,
        productId: 1,
        productType: 'material',
        purchaseDate: new Date('2024-01-01'),
        expiryDate: null,
        status: 'active',
        amount: 1000,
        currency: 'USD',
        paymentMethod: 'stripe',
        transactionId: 'tx_123',
      };

      vi.mocked(storage.getUserPurchase).mockResolvedValue(activePurchase);

      const result = await verifyPurchase('user123', 1);

      expect(result).toEqual({
        hasAccess: true,
        purchase: activePurchase,
      });
    });

    it('should return hasAccess: true when purchase is active with future expiry date', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const activePurchase: Purchase = {
        id: 1,
        userId: 'user123',
        tenantId: 1,
        productId: 1,
        productType: 'course',
        purchaseDate: new Date('2024-01-01'),
        expiryDate: futureDate,
        status: 'active',
        amount: 1000,
        currency: 'USD',
        paymentMethod: 'stripe',
        transactionId: 'tx_123',
      };

      vi.mocked(storage.getUserPurchase).mockResolvedValue(activePurchase);

      const result = await verifyPurchase('user123', 1);

      expect(result).toEqual({
        hasAccess: true,
        purchase: activePurchase,
      });
    });

    it('should handle errors gracefully and return no_purchase', async () => {
      vi.mocked(storage.getUserPurchase).mockRejectedValue(new Error('Database error'));

      const result = await verifyPurchase('user123', 1);

      expect(result).toEqual({
        hasAccess: false,
        reason: 'no_purchase',
      });
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin role', () => {
      expect(isAdmin('admin')).toBe(true);
    });

    it('should return false for user role', () => {
      expect(isAdmin('user')).toBe(false);
    });

    it('should return false for other roles', () => {
      expect(isAdmin('moderator')).toBe(false);
      expect(isAdmin('')).toBe(false);
    });
  });

  describe('verifyPurchaseWithAdminBypass', () => {
    it('should grant access for admin users without checking purchases', async () => {
      const result = await verifyPurchaseWithAdminBypass('admin123', 1, 'admin');

      expect(result).toEqual({
        hasAccess: true,
      });
      expect(storage.getUserPurchase).not.toHaveBeenCalled();
    });

    it('should verify purchase for non-admin users', async () => {
      vi.mocked(storage.getUserPurchase).mockResolvedValue(null);

      const result = await verifyPurchaseWithAdminBypass('user123', 1, 'user');

      expect(result).toEqual({
        hasAccess: false,
        reason: 'no_purchase',
      });
      expect(storage.getUserPurchase).toHaveBeenCalledWith('user123', 1);
    });
  });
});
