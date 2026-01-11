/**
 * Purchase Verification Hook
 *
 * React hook for verifying user purchases and checking access to premium content.
 */

import { useEffect, useState } from 'react';
import { useAuth } from './auth-provider';
import { verifyPurchaseWithAdminBypass } from './purchase-verification';
import type { PurchaseVerificationResult } from './purchase-verification';

/**
 * Hook for verifying user purchase access to a product
 *
 * @param productId - The product to verify access for
 * @returns Verification result including loading state
 */
export function usePurchaseVerification(productId: number | null): {
  verification: PurchaseVerificationResult | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
} {
  const { user } = useAuth();
  const [verification, setVerification] = useState<PurchaseVerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchVerification = async () => {
    if (!user || !productId) {
      setVerification(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await verifyPurchaseWithAdminBypass(user.id, productId, user.role);
      setVerification(result);
    } catch (error) {
      console.error('Failed to verify purchase:', error);
      setVerification({ hasAccess: false, reason: 'no_purchase' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVerification();
  }, [user?.id, productId, user?.role]);

  return {
    verification,
    isLoading,
    refetch: fetchVerification,
  };
}
