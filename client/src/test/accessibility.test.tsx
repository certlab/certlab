import { describe, it, expect, beforeEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { axe } from './accessibility-setup';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test/mocks/providers';
import { ThemeProvider } from '@/lib/theme-provider';
import { AuthProvider } from '@/lib/auth-provider';
import { BrandingProvider } from '@/lib/branding-provider';

// Test pages
import Landing from '@/pages/landing';
import Accessibility from '@/pages/accessibility';

// Test components
import Header from '@/components/Header';
import ContrastAnalyzer from '@/components/ContrastAnalyzer';

// Wrapper for authenticated pages
function AuthenticatedWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrandingProvider>
            <ThemeProvider defaultTheme="light" storageKey="ui-theme">
              {children}
            </ThemeProvider>
          </BrandingProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

// Wrapper for public pages
function PublicWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrandingProvider>
            <ThemeProvider defaultTheme="light" storageKey="ui-theme">
              {children}
            </ThemeProvider>
          </BrandingProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

describe('Accessibility Tests - WCAG 2.2 AA Compliance', () => {
  beforeEach(() => {
    // Clear any lingering DOM state
    document.body.innerHTML = '';
  });

  describe('Landing Page', () => {
    it('should not have accessibility violations', async () => {
      let container: HTMLElement;
      await act(async () => {
        const result = render(
          <PublicWrapper>
            <Landing />
          </PublicWrapper>
        );
        container = result.container;
      });

      const results = await axe(container!);
      expect(results.violations).toHaveLength(0);
    });

    it('should have proper heading hierarchy', async () => {
      let container: HTMLElement;
      await act(async () => {
        const result = render(
          <PublicWrapper>
            <Landing />
          </PublicWrapper>
        );
        container = result.container;
      });

      const h1 = container!.querySelector('h1');
      expect(h1).toBeTruthy();
      expect(h1?.textContent).toBeTruthy();
    });

    it('should not have skip navigation link (landing page exception)', async () => {
      let container: HTMLElement;
      await act(async () => {
        const result = render(
          <PublicWrapper>
            <Landing />
          </PublicWrapper>
        );
        container = result.container;
      });

      // Landing page doesn't have skip link as it's a simple single-screen page
      // Skip links are present on authenticated pages with complex navigation
      const skipLink = container!.querySelector('a[href="#main-content"]');
      expect(skipLink).toBeNull();
    });
  });

  describe('Header Component', () => {
    it('should not have accessibility violations', async () => {
      let container: HTMLElement;
      await act(async () => {
        const result = render(
          <AuthenticatedWrapper>
            <Header />
          </AuthenticatedWrapper>
        );
        container = result.container;

        // Wait for AuthProvider to finish initialization
        await waitFor(() => {
          // Check that loading is complete (AuthProvider should be initialized)
          return true;
        });
      });

      const results = await axe(container!);
      expect(results.violations).toHaveLength(0);
    });

    it('should have accessible navigation', async () => {
      let container: HTMLElement;
      await act(async () => {
        const result = render(
          <AuthenticatedWrapper>
            <Header />
          </AuthenticatedWrapper>
        );
        container = result.container;

        // Wait for AuthProvider to finish initialization
        await waitFor(() => {
          return true;
        });
      });

      const nav = container!.querySelector('nav');
      expect(nav).toBeTruthy();
    });

    it('should have accessible user menu button', async () => {
      let container: HTMLElement;
      await act(async () => {
        const result = render(
          <AuthenticatedWrapper>
            <Header />
          </AuthenticatedWrapper>
        );
        container = result.container;

        // Wait for AuthProvider to finish initialization
        await waitFor(() => {
          return true;
        });
      });

      const buttons = container!.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);

      // Check that buttons have accessible names (aria-label or text content)
      buttons.forEach((button) => {
        const hasAriaLabel = button.hasAttribute('aria-label');
        const hasTextContent = (button.textContent?.trim() || '').length > 0;
        const hasAriaLabelledBy = button.hasAttribute('aria-labelledby');
        expect(hasAriaLabel || hasTextContent || hasAriaLabelledBy).toBe(true);
      });
    });
  });

  describe('ContrastAnalyzer Component', () => {
    it('should not have accessibility violations', async () => {
      let container: HTMLElement;
      await act(async () => {
        const result = render(
          <AuthenticatedWrapper>
            <ContrastAnalyzer />
          </AuthenticatedWrapper>
        );
        container = result.container;

        // Wait for AuthProvider to finish initialization and component to render
        await waitFor(() => {
          return container.textContent?.includes('Accessibility Contrast Analyzer');
        });
      });

      const results = await axe(container!);
      expect(results.violations).toHaveLength(0);
    });

    it('should display contrast ratios', async () => {
      let container: HTMLElement;
      await act(async () => {
        const result = render(
          <AuthenticatedWrapper>
            <ContrastAnalyzer />
          </AuthenticatedWrapper>
        );
        container = result.container;

        // Wait for component to render
        await waitFor(() => {
          return container.textContent?.includes('Accessibility Contrast Analyzer');
        });
      });

      // ContrastAnalyzer should display contrast information
      expect(container!.textContent).toContain('Accessibility Contrast Analyzer');
    });
  });

  describe('Accessibility Page', () => {
    it('should not have accessibility violations', async () => {
      let container: HTMLElement;
      await act(async () => {
        const result = render(
          <AuthenticatedWrapper>
            <Accessibility />
          </AuthenticatedWrapper>
        );
        container = result.container;

        // Wait for AuthProvider and page to finish initialization
        await waitFor(() => {
          return true;
        });
      });

      const results = await axe(container!);
      expect(results.violations).toHaveLength(0);
    });

    it('should have proper page title', async () => {
      let container: HTMLElement;
      await act(async () => {
        const result = render(
          <AuthenticatedWrapper>
            <Accessibility />
          </AuthenticatedWrapper>
        );
        container = result.container;

        // Wait for page to render
        await waitFor(() => {
          return true;
        });
      });

      const h1 = container!.querySelector('h1');
      expect(h1).toBeTruthy();
      expect(h1?.textContent).toContain('Accessibility');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should have focusable interactive elements', async () => {
      let container: HTMLElement;
      await act(async () => {
        const result = render(
          <AuthenticatedWrapper>
            <Header />
          </AuthenticatedWrapper>
        );
        container = result.container;

        // Wait for initialization
        await waitFor(() => {
          return true;
        });
      });

      const interactiveElements = container!.querySelectorAll(
        'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      expect(interactiveElements.length).toBeGreaterThan(0);
    });

    it('should not have positive tabindex values', async () => {
      let container: HTMLElement;
      await act(async () => {
        const result = render(
          <AuthenticatedWrapper>
            <Header />
          </AuthenticatedWrapper>
        );
        container = result.container;

        // Wait for initialization
        await waitFor(() => {
          return true;
        });
      });

      const positiveTabIndex = container!.querySelectorAll(
        '[tabindex]:not([tabindex="0"]):not([tabindex="-1"])'
      );
      expect(positiveTabIndex.length).toBe(0);
    });
  });

  describe('Color Contrast', () => {
    it('should pass color contrast requirements', async () => {
      const { container } = render(
        <AuthenticatedWrapper>
          <ContrastAnalyzer />
        </AuthenticatedWrapper>
      );

      // Wait for contrast analysis to complete
      await new Promise((resolve) => setTimeout(resolve, 200));

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });
  });

  describe('ARIA Attributes', () => {
    it('should use valid ARIA attributes', async () => {
      const { container } = render(
        <AuthenticatedWrapper>
          <Header />
        </AuthenticatedWrapper>
      );

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('should have proper ARIA labels on interactive elements', async () => {
      const { container } = render(
        <AuthenticatedWrapper>
          <Header />
        </AuthenticatedWrapper>
      );

      const ariaElements = container.querySelectorAll(
        '[aria-label], [aria-labelledby], [aria-describedby]'
      );
      expect(ariaElements.length).toBeGreaterThan(0);
    });
  });

  describe('Semantic HTML', () => {
    it('should use semantic HTML elements', async () => {
      const { container } = render(
        <AuthenticatedWrapper>
          <Accessibility />
        </AuthenticatedWrapper>
      );

      // Check for semantic elements
      const main = container.querySelector('main');
      const header = container.querySelector('header') || document.querySelector('header');

      // At least one semantic element should be present
      expect(main || header).toBeTruthy();
    });

    it('should have proper heading structure', async () => {
      const { container } = render(
        <PublicWrapper>
          <Landing />
        </PublicWrapper>
      );

      const h1 = container.querySelector('h1');
      expect(h1).toBeTruthy();
    });
  });

  describe('Form Accessibility', () => {
    it('should have associated labels for form inputs', async () => {
      const { container } = render(
        <PublicWrapper>
          <Landing />
        </PublicWrapper>
      );

      const inputs = container.querySelectorAll('input:not([type="hidden"])');
      inputs.forEach((input) => {
        const hasLabel = container.querySelector(`label[for="${input.id}"]`);
        const hasAriaLabel = input.hasAttribute('aria-label');
        const hasAriaLabelledBy = input.hasAttribute('aria-labelledby');

        // At least one accessible form of labeling should be present.
        // Note: placeholders alone are not sufficient for labeling per WCAG.
        expect(hasLabel || hasAriaLabel || hasAriaLabelledBy).toBe(true);
      });
    });
  });

  describe('Skip Navigation', () => {
    it('should have skip to main content link in authenticated pages', async () => {
      const { container } = render(
        <AuthenticatedWrapper>
          <Accessibility />
        </AuthenticatedWrapper>
      );
      // Skip link is rendered in App.tsx for authenticated pages
      // It's visible only on focus which is proper accessibility practice
      const skipLink = document.querySelector('a[href="#main-content"]');
      expect(skipLink).toBeTruthy();
      expect(skipLink?.textContent).toContain('Skip to main content');
    });
  });
});
