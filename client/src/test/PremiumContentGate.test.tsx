/**
 * Tests for PremiumContentGate Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PremiumContentGate } from '../components/PremiumContentGate';
import type { PurchaseVerificationResult } from '../lib/purchase-verification';

// Mock the router
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock the auth provider
vi.mock('../lib/auth-provider', () => ({
  useAuth: () => ({
    user: {
      id: 'user123',
      email: 'user@example.com',
      role: 'user',
      tenantId: 1,
    },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

// Mock the purchase verification hook
vi.mock('../hooks/usePurchaseVerification', () => ({
  usePurchaseVerification: vi.fn(),
}));

import { usePurchaseVerification } from '../hooks/usePurchaseVerification';

describe('PremiumContentGate', () => {
  it('should show loading spinner when verification is loading', () => {
    vi.mocked(usePurchaseVerification).mockReturnValue({
      verification: null,
      isLoading: true,
      refetch: vi.fn(),
    });

    render(
      <PremiumContentGate productId={1}>
        <div>Premium Content</div>
      </PremiumContentGate>
    );

    expect(screen.queryByText('Premium Content')).not.toBeInTheDocument();
    // Check for loading spinner (Loader2 component)
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should render children when user has access', () => {
    const verification: PurchaseVerificationResult = {
      hasAccess: true,
    };

    vi.mocked(usePurchaseVerification).mockReturnValue({
      verification,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <PremiumContentGate productId={1}>
        <div>Premium Content</div>
      </PremiumContentGate>
    );

    expect(screen.getByText('Premium Content')).toBeInTheDocument();
  });

  it('should show purchase prompt when user has no purchase', () => {
    const verification: PurchaseVerificationResult = {
      hasAccess: false,
      reason: 'no_purchase',
    };

    vi.mocked(usePurchaseVerification).mockReturnValue({
      verification,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <PremiumContentGate productId={1}>
        <div data-testid="premium-child">Premium Content</div>
      </PremiumContentGate>
    );

    expect(screen.queryByTestId('premium-child')).not.toBeInTheDocument();
    expect(screen.getByText('Purchase required to access this content.')).toBeInTheDocument();
    expect(screen.getByText('View in Marketplace')).toBeInTheDocument();
  });

  it('should show expired message when subscription has expired', () => {
    const verification: PurchaseVerificationResult = {
      hasAccess: false,
      reason: 'expired',
    };

    vi.mocked(usePurchaseVerification).mockReturnValue({
      verification,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <PremiumContentGate productId={1}>
        <div data-testid="premium-child">Premium Content</div>
      </PremiumContentGate>
    );

    expect(screen.queryByTestId('premium-child')).not.toBeInTheDocument();
    expect(
      screen.getByText('Your subscription has expired. Renew your access to continue.')
    ).toBeInTheDocument();
  });

  it('should show refunded message when purchase was refunded', () => {
    const verification: PurchaseVerificationResult = {
      hasAccess: false,
      reason: 'refunded',
    };

    vi.mocked(usePurchaseVerification).mockReturnValue({
      verification,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <PremiumContentGate productId={1}>
        <div>Premium Content</div>
      </PremiumContentGate>
    );

    expect(
      screen.getByText('This purchase has been refunded. Purchase again to regain access.')
    ).toBeInTheDocument();
  });

  it('should display lock icon when access is denied', () => {
    const verification: PurchaseVerificationResult = {
      hasAccess: false,
      reason: 'no_purchase',
    };

    vi.mocked(usePurchaseVerification).mockReturnValue({
      verification,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <PremiumContentGate productId={1}>
        <div>Premium Content</div>
      </PremiumContentGate>
    );

    // Check for Lock icon
    const lockIcon = document.querySelector('.lucide-lock');
    expect(lockIcon).toBeInTheDocument();
  });

  it('should show browse all materials button when access is denied', () => {
    const verification: PurchaseVerificationResult = {
      hasAccess: false,
      reason: 'no_purchase',
    };

    vi.mocked(usePurchaseVerification).mockReturnValue({
      verification,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <PremiumContentGate productId={1}>
        <div>Premium Content</div>
      </PremiumContentGate>
    );

    expect(screen.getByText('Browse All Materials')).toBeInTheDocument();
  });
});
