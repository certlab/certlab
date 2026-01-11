/**
 * AccessDenied Component
 *
 * Displays when a user attempts to access content they don't have permission to view.
 * Shows appropriate messaging based on the denial reason and provides actions.
 */

import { useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, ShoppingCart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AccessDeniedProps {
  reason?: 'purchase_required' | 'private_content' | 'not_shared_with_you' | 'access_denied';
  productId?: string;
  resourceType?: 'quiz' | 'lecture' | 'material' | 'template';
  resourceTitle?: string;
}

export function AccessDenied({
  reason = 'access_denied',
  productId,
  resourceType = 'quiz',
  resourceTitle,
}: AccessDeniedProps) {
  const navigate = useNavigate();

  const getMessage = () => {
    switch (reason) {
      case 'purchase_required':
        return {
          title: 'Premium Content',
          description: `This ${resourceType} requires a purchase to access. Unlock it to continue your learning journey.`,
          action: 'View in Marketplace',
        };
      case 'private_content':
        return {
          title: 'Private Content',
          description: `This ${resourceType} is private and only accessible to its creator.`,
          action: null,
        };
      case 'not_shared_with_you':
        return {
          title: 'Not Shared With You',
          description: `This ${resourceType} has not been shared with you. Contact the owner to request access.`,
          action: null,
        };
      default:
        return {
          title: 'Access Denied',
          description: `You don't have permission to access this ${resourceType}.`,
          action: null,
        };
    }
  };

  const message = getMessage();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="text-center py-12 px-6">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-muted p-6">
              <Lock className="w-12 h-12 text-muted-foreground" />
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-3">{message.title}</h2>

          {resourceTitle && (
            <p className="text-sm text-muted-foreground mb-2 font-medium">{resourceTitle}</p>
          )}

          <p className="text-muted-foreground mb-8">{message.description}</p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {reason === 'purchase_required' && productId && message.action && (
              <Button onClick={() => navigate(`/app/marketplace/${productId}`)}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                {message.action}
              </Button>
            )}

            <Button
              variant={reason === 'purchase_required' ? 'outline' : 'default'}
              onClick={() => navigate('/app/dashboard')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Dashboard
            </Button>
          </div>

          {reason === 'not_shared_with_you' && (
            <p className="text-xs text-muted-foreground mt-6">
              Tip: Ask the content owner to add you to the shared users or groups list.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
