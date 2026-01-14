/**
 * BrandingProvider - Context provider for organization branding configuration
 *
 * Manages organization-wide branding settings including:
 * - Logo and visual identity
 * - Color customization
 * - Typography settings
 * - Default theme configuration
 *
 * The branding configuration is loaded from Firestore on app initialization
 * and can be updated by admins through the admin dashboard.
 *
 * @module branding-provider
 */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { storage } from './storage-factory';
import type { OrganizationBranding } from '@shared/schema';
import { logError, logInfo } from './errors';

interface BrandingContextValue {
  branding: OrganizationBranding | null;
  isLoading: boolean;
  error: Error | null;
  updateBranding: (branding: OrganizationBranding) => Promise<void>;
  refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue | undefined>(undefined);

interface BrandingProviderProps {
  children: ReactNode;
  tenantId?: number; // Default to 1 if not provided
}

export function BrandingProvider({ children, tenantId = 1 }: BrandingProviderProps) {
  const [branding, setBranding] = useState<OrganizationBranding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadBranding = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const brandingData = await storage.getOrganizationBranding(tenantId);
      setBranding(brandingData);

      if (brandingData) {
        logInfo('Organization branding loaded', { tenantId });
        applyBrandingToDOM(brandingData);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load branding');
      setError(error);
      logError('loadBranding', error, { tenantId });
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  const updateBranding = async (newBranding: OrganizationBranding) => {
    try {
      await storage.setOrganizationBranding(newBranding);
      setBranding(newBranding);
      applyBrandingToDOM(newBranding);
      logInfo('Organization branding updated', { tenantId });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update branding');
      logError('updateBranding', error, { tenantId });
      throw error;
    }
  };

  const refreshBranding = useCallback(async () => {
    await loadBranding();
  }, [loadBranding]);

  // Load branding on mount and when tenantId changes
  useEffect(() => {
    loadBranding();
  }, [loadBranding]);

  const value: BrandingContextValue = {
    branding,
    isLoading,
    error,
    updateBranding,
    refreshBranding,
  };

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

/**
 * Hook to access branding context
 */
export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}

/**
 * Apply branding configuration to the DOM via CSS variables
 */
function applyBrandingToDOM(branding: OrganizationBranding) {
  const root = document.documentElement;

  // Apply custom colors as CSS variables
  if (branding.primaryColor) {
    root.style.setProperty('--brand-primary', branding.primaryColor);
    root.style.setProperty('--primary', branding.primaryColor);
  }

  if (branding.secondaryColor) {
    root.style.setProperty('--brand-secondary', branding.secondaryColor);
  }

  if (branding.accentColor) {
    root.style.setProperty('--brand-accent', branding.accentColor);
    root.style.setProperty('--accent', branding.accentColor);
  }

  if (branding.backgroundColor) {
    root.style.setProperty('--brand-background', branding.backgroundColor);
  }

  if (branding.surfaceColor) {
    root.style.setProperty('--brand-surface', branding.surfaceColor);
  }

  // Apply custom font families
  if (branding.fontFamily) {
    root.style.setProperty('--brand-font-family', branding.fontFamily);
    root.style.fontFamily = branding.fontFamily;
  }

  if (branding.headingFontFamily) {
    root.style.setProperty('--brand-heading-font-family', branding.headingFontFamily);
  }

  // Apply custom favicon if provided
  if (branding.faviconUrl) {
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) {
      favicon.href = branding.faviconUrl;
    }
  }

  // Inject custom CSS if provided
  if (branding.customCss) {
    let styleTag = document.getElementById('custom-branding-css');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'custom-branding-css';
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = branding.customCss;
  }

  logInfo('Branding applied to DOM', { tenantId: branding.tenantId });
}

/**
 * Remove branding customizations from the DOM
 */
export function removeBrandingFromDOM() {
  const root = document.documentElement;

  // Remove custom CSS variables
  root.style.removeProperty('--brand-primary');
  root.style.removeProperty('--brand-secondary');
  root.style.removeProperty('--brand-accent');
  root.style.removeProperty('--brand-background');
  root.style.removeProperty('--brand-surface');
  root.style.removeProperty('--brand-font-family');
  root.style.removeProperty('--brand-heading-font-family');
  root.style.removeProperty('--primary');
  root.style.removeProperty('--accent');

  // Remove custom CSS
  const styleTag = document.getElementById('custom-branding-css');
  if (styleTag) {
    styleTag.remove();
  }

  logInfo('Branding removed from DOM');
}
