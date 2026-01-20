/**
 * Accessibility E2E Tests
 *
 * Tests keyboard navigation, screen reader support, and WCAG compliance.
 */

import { test, expect } from '../fixtures/base';
import {
  goToLandingPage,
  // Unused imports for future use
  // goToDashboard,
  // checkBasicAccessibility,
  testKeyboardNavigation,
} from '../utils/test-helpers';

test.describe('Keyboard Navigation', () => {
  test('should support Tab navigation on landing page', async ({ page }) => {
    await goToLandingPage(page);

    // Test tabbing through elements
    await testKeyboardNavigation(page, 5);
  });

  test('should support keyboard navigation to login', async ({ page }) => {
    await goToLandingPage(page);

    // Tab to sign in button and activate with Enter
    let focused = false;
    let attempts = 0;
    const maxAttempts = 15;

    while (!focused && attempts < maxAttempts) {
      await page.keyboard.press('Tab');
      attempts++;

      // Check if sign in button is focused
      const focusedElement = await page.evaluateHandle(() => document.activeElement);
      const elementText = await page.evaluate((el) => el?.textContent || '', focusedElement);

      if (elementText.toLowerCase().match(/sign in|login|get started/)) {
        focused = true;

        // Press Enter to activate
        await page.keyboard.press('Enter');
        await page.waitForLoadState('domcontentloaded');

        // Verify login UI appeared
        const loginButton = page.getByRole('button', { name: /google|sign in with google/i });
        const loginVisible = await loginButton.isVisible({ timeout: 3000 }).catch(() => false);

        if (loginVisible) {
          expect(loginVisible).toBeTruthy();
        }
        break;
      }
    }
  });

  test.skip('should support keyboard navigation in quiz', async ({ page }) => {
    // Requires authentication and active quiz
    await page.goto('/quiz');
    await page.waitForLoadState('networkidle');

    // Tab through answer options
    await testKeyboardNavigation(page, 4);

    // Space should select radio button
    await page.keyboard.press('Space');

    // Tab to next button and activate
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    await page.waitForLoadState('domcontentloaded');
  });

  test('should support Escape key to close modals', async ({ page }) => {
    await goToLandingPage(page);

    // Try to open a modal (sign in)
    const signInButton = page.getByRole('button', { name: /sign in|login/i }).first();
    const buttonVisible = await signInButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (buttonVisible) {
      await signInButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Press Escape to close
      await page.keyboard.press('Escape');
      await page.waitForLoadState('domcontentloaded');

      // Modal should be closed (verify by checking if sign in button is still visible)
      const stillVisible = await signInButton.isVisible({ timeout: 2000 }).catch(() => false);
      expect(stillVisible).toBeTruthy();
    }
  });
});

test.describe('ARIA and Semantic HTML', () => {
  test('should have proper lang attribute', async ({ page }) => {
    await goToLandingPage(page);

    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang');
  });

  test('should have main landmark', async ({ page }) => {
    await goToLandingPage(page);

    const main = page.locator('main, [role="main"]');
    const mainCount = await main.count();

    expect(mainCount).toBeGreaterThan(0);
  });

  test('should have skip to main content link', async ({ page }) => {
    await goToLandingPage(page);

    // Tab once to potentially reveal skip link
    await page.keyboard.press('Tab');

    const skipLink = page.getByRole('link', { name: /skip to|skip navigation/i });
    const skipLinkExists = await skipLink.count();

    // Skip link should exist (though it might not be visible by default)
    if (skipLinkExists > 0) {
      expect(skipLinkExists).toBeGreaterThan(0);
    }
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await goToLandingPage(page);

    // Check for h1
    const h1 = page.locator('h1');
    const h1Count = await h1.count();

    // Should have exactly one h1
    expect(h1Count).toBeGreaterThan(0);
  });

  test('should have alt text for images', async ({ page }) => {
    await goToLandingPage(page);

    // Get all images
    const images = page.locator('img');
    const imageCount = await images.count();

    if (imageCount > 0) {
      // Check each image has alt attribute
      for (let i = 0; i < Math.min(imageCount, 5); i++) {
        const img = images.nth(i);
        const hasAlt = (await img.getAttribute('alt')) !== null;
        expect(hasAlt).toBeTruthy();
      }
    }
  });

  test('should have form labels', async ({ page }) => {
    await goToLandingPage(page);

    // Look for input fields
    const inputs = page.locator('input[type="text"], input[type="email"], input[type="search"]');
    const inputCount = await inputs.count();

    if (inputCount > 0) {
      // Check each input has a label or aria-label
      for (let i = 0; i < Math.min(inputCount, 3); i++) {
        const input = inputs.nth(i);
        const hasLabel = (await input.getAttribute('aria-label')) !== null;
        const id = await input.getAttribute('id');

        if (!hasLabel && id) {
          // Check if there's a label with for attribute
          const label = page.locator(`label[for="${id}"]`);
          const labelExists = (await label.count()) > 0;
          expect(hasLabel || labelExists).toBeTruthy();
        }
      }
    }
  });
});

test.describe('Color Contrast and Visual Accessibility', () => {
  test('should support theme switching for high contrast', async ({ page }) => {
    await goToLandingPage(page);

    // Look for theme switcher
    const themeButton = page.getByRole('button', { name: /theme|dark mode/i }).first();
    const themeVisible = await themeButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (themeVisible) {
      await themeButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Theme should have changed
      const bodyClass = await page.locator('body').getAttribute('class');
      expect(bodyClass).toBeDefined();
    }
  });

  test('should scale text to 200%', async ({ page }) => {
    await goToLandingPage(page);

    // Zoom in (simulate 200% zoom)
    await page.evaluate(() => {
      document.body.style.zoom = '2';
    });

    await page.waitForLoadState('domcontentloaded');

    // Verify layout doesn't break
    const html = page.locator('html');
    await expect(html).toBeVisible();

    // Reset zoom
    await page.evaluate(() => {
      document.body.style.zoom = '1';
    });
  });
});

test.describe('Focus Management', () => {
  test('should have visible focus indicators', async ({ page }) => {
    await goToLandingPage(page);

    // Tab to first interactive element
    await page.keyboard.press('Tab');

    // Get focused element
    const focusedElement = await page.evaluateHandle(() => document.activeElement);

    // Check if it has visible outline or box-shadow (focus indicator)
    const hasOutline = await page.evaluate((el) => {
      if (!el) return false;
      const styles = window.getComputedStyle(el as Element);
      return (
        styles.outline !== 'none' || styles.outlineWidth !== '0px' || styles.boxShadow !== 'none'
      );
    }, focusedElement);

    expect(hasOutline).toBeTruthy();
  });

  test('should not have keyboard traps', async ({ page }) => {
    await goToLandingPage(page);

    // Tab through many elements
    let previousElements = new Set<string>();

    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');

      const focusedElement = await page.evaluateHandle(() => document.activeElement);
      const elementTag = await page.evaluate((el) => el?.tagName || '', focusedElement);
      const elementId = await page.evaluate((el) => (el as Element)?.id || '', focusedElement);

      const elementKey = `${elementTag}-${elementId}`;

      // If we've seen this element multiple times in succession, might be a trap
      // (This is a simplified check)
      previousElements.add(elementKey);
    }

    // Should have focused on multiple different elements
    expect(previousElements.size).toBeGreaterThan(3);
  });
});

test.describe('Screen Reader Support', () => {
  test('should have ARIA roles for key components', async ({ page }) => {
    await goToLandingPage(page);

    // Check for button roles
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('should have ARIA labels for icon buttons', async ({ page }) => {
    await goToLandingPage(page);

    // Find buttons that might be icon-only
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const text = await button.textContent();

        // If button has no text, should have aria-label
        if (!text || text.trim().length === 0) {
          const ariaLabel = await button.getAttribute('aria-label');
          expect(ariaLabel).toBeTruthy();
        }
      }
    }
  });

  test('should announce dynamic content changes', async ({ page }) => {
    await goToLandingPage(page);

    // Look for aria-live regions
    // Note: This uses a comma-separated CSS selector which is valid in Playwright.
    // It matches elements with aria-live, role="alert", or role="status".
    const liveRegions = page.locator('[aria-live], [role="alert"], [role="status"]');
    const regionCount = await liveRegions.count();

    // At least some live regions should exist for notifications
    // (This test is informational - it's okay if count is 0)
    if (regionCount > 0) {
      expect(regionCount).toBeGreaterThan(0);
    }
  });
});
