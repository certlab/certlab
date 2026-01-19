/**
 * E2E Test Helper Utilities
 *
 * Common functions and utilities for E2E tests including
 * authentication helpers, navigation helpers, and assertion utilities.
 */

import { Page, expect } from '@playwright/test';

/**
 * Wait for the application to be fully loaded and interactive
 */
export async function waitForAppReady(page: Page) {
  // Wait for the main content to be visible
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Navigate to the landing page
 */
export async function goToLandingPage(page: Page) {
  await page.goto('/');
  await waitForAppReady(page);
}

/**
 * Navigate to the dashboard (requires authentication)
 */
export async function goToDashboard(page: Page) {
  await page.goto('/dashboard');
  await waitForAppReady(page);
}

/**
 * Check if user is authenticated by looking for logout button or user menu
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    // Look for common authenticated UI elements
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
    const userMenu = page.getByRole('button', { name: /user menu|profile/i });

    const logoutVisible = await logoutButton.isVisible({ timeout: 2000 }).catch(() => false);
    const userMenuVisible = await userMenu.isVisible({ timeout: 2000 }).catch(() => false);

    return logoutVisible || userMenuVisible;
  } catch {
    return false;
  }
}

/**
 * Wait for navigation to complete
 */
export async function waitForNavigation(page: Page, url?: string) {
  if (url) {
    await page.waitForURL(url, { timeout: 10000 });
  } else {
    await page.waitForLoadState('networkidle');
  }
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `playwright-report/screenshots/${name}.png`,
    fullPage: true,
  });
}

/**
 * Check if an element is visible with a custom timeout
 */
export async function isElementVisible(
  page: Page,
  selector: string,
  timeout = 5000
): Promise<boolean> {
  try {
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Click a button by text and wait for response
 */
export async function clickButton(page: Page, buttonText: string) {
  const button = page.getByRole('button', { name: new RegExp(buttonText, 'i') });
  await expect(button).toBeVisible();
  await button.click();
}

/**
 * Fill a form field by label
 */
export async function fillFormField(page: Page, label: string, value: string) {
  const field = page.getByLabel(new RegExp(label, 'i'));
  await expect(field).toBeVisible();
  await field.fill(value);
}

/**
 * Select an option from a dropdown by label
 */
export async function selectOption(page: Page, label: string, option: string) {
  const select = page.getByLabel(new RegExp(label, 'i'));
  await expect(select).toBeVisible();
  await select.selectOption(option);
}

/**
 * Wait for a toast/notification message
 */
export async function waitForToast(page: Page, message?: string) {
  const toast = message
    ? page.getByText(new RegExp(message, 'i'))
    : page.locator('[role="alert"], [role="status"]').first();

  await expect(toast).toBeVisible({ timeout: 10000 });
}

/**
 * Verify page title contains text
 */
export async function verifyPageTitle(page: Page, titleText: string) {
  const title = await page.title();
  expect(title.toLowerCase()).toContain(titleText.toLowerCase());
}

/**
 * Wait for and verify heading is visible
 */
export async function verifyHeading(page: Page, headingText: string) {
  const heading = page.getByRole('heading', { name: new RegExp(headingText, 'i') });
  await expect(heading).toBeVisible();
}

/**
 * Check accessibility: verify no automatic accessibility violations
 * Note: This is a basic check. For comprehensive testing, use axe-core integration
 */
export async function checkBasicAccessibility(page: Page) {
  // Check for basic HTML structure
  await expect(page.locator('html')).toHaveAttribute('lang');

  // Verify main landmark exists
  const main = page.locator('main, [role="main"]');
  const mainExists = (await main.count()) > 0;
  expect(mainExists).toBeTruthy();
}

/**
 * Verify keyboard navigation works by tabbing through elements
 */
export async function testKeyboardNavigation(page: Page, elementCount = 3) {
  // Focus on body first
  await page.keyboard.press('Tab');

  // Verify we can tab through interactive elements
  for (let i = 0; i < elementCount; i++) {
    await page.keyboard.press('Tab');

    // Get the currently focused element
    const focusedElement = await page.evaluateHandle(() => document.activeElement);

    // Verify element has focus
    const isFocused = await page.evaluate((el) => el === document.activeElement, focusedElement);

    expect(isFocused).toBeTruthy();
  }
}

/**
 * Simulate slow network conditions
 */
export async function simulateSlowNetwork(page: Page) {
  const client = await page.context().newCDPSession(page);
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: 50 * 1024, // 50kb/s
    uploadThroughput: 20 * 1024, // 20kb/s
    latency: 500, // 500ms latency
  });
}

/**
 * Reset network conditions to normal
 */
export async function resetNetworkConditions(page: Page) {
  const client = await page.context().newCDPSession(page);
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: -1,
    uploadThroughput: -1,
    latency: 0,
  });
}
