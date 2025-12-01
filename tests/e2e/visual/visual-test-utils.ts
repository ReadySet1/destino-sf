import { Page, expect } from '@playwright/test';

/**
 * Visual Test Utilities for DES-62: Component Visual Testing
 *
 * Provides helper functions for capturing consistent visual snapshots
 * across desktop and mobile viewports.
 */

// Base URL for the visual components test page
export const VISUAL_TEST_PAGE = '/test/visual-components';

/**
 * Section IDs on the visual components test page
 * These correspond to anchor IDs on the test page for easy navigation
 */
export const COMPONENT_SECTIONS = {
  buttons: 'buttons',
  formInputs: 'form-inputs',
  productCard: 'product-card',
  cartItem: 'cart-item',
  navigation: 'navigation',
  footer: 'footer',
  dialog: 'dialog',
  toast: 'toast',
  loading: 'loading',
  errorDisplay: 'error-display',
} as const;

/**
 * Navigate to the visual components test page
 */
export async function navigateToTestPage(page: Page): Promise<void> {
  await page.goto(VISUAL_TEST_PAGE);
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to a specific component section on the test page
 */
export async function navigateToSection(
  page: Page,
  section: keyof typeof COMPONENT_SECTIONS
): Promise<void> {
  await page.goto(`${VISUAL_TEST_PAGE}#${COMPONENT_SECTIONS[section]}`);
  await page.waitForLoadState('networkidle');

  // Scroll the section into view
  const sectionElement = page.locator(`#${COMPONENT_SECTIONS[section]}`);
  await sectionElement.scrollIntoViewIfNeeded();

  // Wait for any animations to complete
  await waitForAnimations(page);
}

/**
 * Wait for animations to complete before taking screenshots
 * This helps ensure consistent snapshots
 */
export async function waitForAnimations(page: Page, timeout = 500): Promise<void> {
  // Wait for any CSS animations to settle
  await page.waitForTimeout(timeout);

  // Wait for all images to load (with timeout fallback)
  try {
    await page.waitForFunction(
      () => {
        const images = document.querySelectorAll('img');
        return Array.from(images).every(img => img.complete || img.naturalHeight === 0);
      },
      { timeout: 5000 }
    );
  } catch {
    // If images don't load in time, continue anyway
    // Some images may be external and slow to load
    console.log('Some images may not have loaded, continuing with screenshot');
  }
}

/**
 * Take a screenshot of a specific element by test ID
 */
export async function screenshotElement(
  page: Page,
  testId: string,
  name: string
): Promise<void> {
  const element = page.getByTestId(testId);
  await element.scrollIntoViewIfNeeded();
  await waitForAnimations(page);
  await expect(element).toHaveScreenshot(`${name}.png`);
}

/**
 * Take a screenshot of a specific section
 */
export async function screenshotSection(
  page: Page,
  section: keyof typeof COMPONENT_SECTIONS,
  name: string
): Promise<void> {
  await navigateToSection(page, section);
  const sectionElement = page.locator(`#${COMPONENT_SECTIONS[section]}`);
  await expect(sectionElement).toHaveScreenshot(`${name}.png`);
}

/**
 * Take a full-page screenshot
 */
export async function screenshotFullPage(page: Page, name: string): Promise<void> {
  await waitForAnimations(page);
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
}

/**
 * Disable animations on the page for consistent screenshots
 * This is also configured in playwright.config.ts but can be called explicitly
 */
export async function disableAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });
}

/**
 * Set up page for visual testing with consistent settings
 */
export async function setupVisualTest(page: Page): Promise<void> {
  // Disable animations for consistent screenshots
  await disableAnimations(page);

  // Wait for fonts to load
  await page.waitForFunction(() => document.fonts.ready);
}

/**
 * Trigger a hover state on an element for hover screenshots
 */
export async function hoverElement(page: Page, selector: string): Promise<void> {
  const element = page.locator(selector);
  await element.hover();
  await page.waitForTimeout(100); // Small delay for hover effects
}

/**
 * Focus an element for focus state screenshots
 */
export async function focusElement(page: Page, selector: string): Promise<void> {
  const element = page.locator(selector);
  await element.focus();
  await page.waitForTimeout(100); // Small delay for focus effects
}

/**
 * Click an element and wait for state change
 */
export async function clickElement(page: Page, selector: string): Promise<void> {
  const element = page.locator(selector);
  await element.click();
  await waitForAnimations(page, 300);
}

/**
 * Open a dialog by clicking its trigger
 */
export async function openDialog(page: Page, triggerSelector: string): Promise<void> {
  await clickElement(page, triggerSelector);
  // Wait for dialog animation
  await page.waitForTimeout(300);
}

/**
 * Trigger a toast notification
 */
export async function triggerToast(page: Page, buttonSelector: string): Promise<void> {
  await clickElement(page, buttonSelector);
  // Wait for toast to appear
  await page.waitForTimeout(500);
}

/**
 * Get the current viewport size
 */
export function getViewportInfo(page: Page): { width: number; height: number } | null {
  return page.viewportSize();
}

/**
 * Check if current viewport is mobile
 */
export function isMobileViewport(page: Page): boolean {
  const viewport = getViewportInfo(page);
  return viewport ? viewport.width < 768 : false;
}
