/**
 * ProtectedResource Component
 *
 * A wrapper component that checks access permissions before rendering content.
 * Shows loading state while checking, and access denied page if permission is denied.
 */

import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-provider';
import { storage } from '@/lib/storage-factory';
import { AccessDenied } from './AccessDenied';
import { LoadingSpinner } from './ui/loading-spinner';

interface ProtectedResourceProps {
  resourceType: 'quiz' | 'lecture' | 'template';
  resourceId: number;
  resourceTitle?: string;
  children: ReactNode;
  loadingMessage?: string;
}

export function ProtectedResource({
  resourceType,
  resourceId,
  resourceTitle,
  children,
  loadingMessage = 'Checking access permissions...',
}: ProtectedResourceProps) {
  const { user } = useAuth();
  const [accessCheck, setAccessCheck] = useState<{
    loading: boolean;
    allowed: boolean;
    reason?:
      | 'purchase_required'
      | 'private_content'
      | 'not_shared_with_you'
      | 'access_denied'
      | 'not_available_yet'
      | 'availability_expired'
      | 'prerequisites_not_met'
      | 'not_enrolled'
      | 'enrollment_closed'
      | 'not_assigned';
    productId?: string;
    missingPrerequisites?: { quizIds?: number[]; lectureIds?: number[] };
    availableFrom?: Date;
    availableUntil?: Date;
  }>({ loading: true, allowed: false });

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setAccessCheck({ loading: false, allowed: false, reason: 'access_denied' });
        return;
      }

      try {
        const result = await storage.checkAccess(user.id, resourceType, resourceId);
        setAccessCheck({ loading: false, ...result });
      } catch (error) {
        console.error('[ProtectedResource] Access check failed:', error);
        setAccessCheck({ loading: false, allowed: false, reason: 'access_denied' });
      }
    };

    checkAccess();
  }, [user, resourceType, resourceId]);

  if (accessCheck.loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-muted-foreground mt-4">{loadingMessage}</p>
      </div>
    );
  }

  if (!accessCheck.allowed) {
    return (
      <AccessDenied
        reason={accessCheck.reason}
        productId={accessCheck.productId}
        resourceType={resourceType === 'template' ? 'material' : resourceType}
        resourceTitle={resourceTitle}
      />
    );
  }

  return <>{children}</>;
}
