/**
 * Premium Content Gate Component
 *
 * Wraps premium content and displays a purchase prompt if the user doesn't have access.
 */

import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Loader2 } from 'lucide-react';
import { usePurchaseVerification } from '@/hooks/usePurchaseVerification';

interface PremiumContentGateProps {
  productId: number;
  children: ReactNode;
  productTitle?: string;
}

/**
 * Gate component that restricts access to premium content based on purchase status
 */
export function PremiumContentGate({
  productId,
  children,
  productTitle = 'this content',
}: PremiumContentGateProps) {
  const navigate = useNavigate();
  const { verification, isLoading } = usePurchaseVerification(productId);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show access denied message if user doesn't have access
  if (!verification || !verification.hasAccess) {
    const message = getAccessDeniedMessage(verification?.reason);

    return (
      <Card className="max-w-2xl mx-auto my-8">
        <CardContent className="text-center py-12">
          <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Premium Content</h2>
          <p className="text-muted-foreground mb-6">{message}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate(`/app/marketplace/${productId}`)}>
              View in Marketplace
            </Button>
            <Button variant="outline" onClick={() => navigate('/app/marketplace')}>
              Browse All Materials
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // User has access, render the children
  return <>{children}</>;
}

/**
 * Get human-readable message for access denied reason
 */
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
