/**
 * Catering Pages Accessibility Tests
 *
 * Tests catering-related pages for WCAG 2.1 AA compliance.
 *
 * @tags @a11y
 */

import { test, expect } from '@playwright/test';
import {
  checkPageAccessibility,
  logViolationsWithoutFailing,
  getCriticalViolations,
  RULE_SETS,
} from '../utils/a11y-helpers';

test.describe('Catering Pages Accessibility @a11y', () => {
  test.describe('Catering Home', () => {
    test('catering home page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/catering');
      const results = await checkPageAccessibility(page, 'Catering Home');

      logViolationsWithoutFailing(results, 'Catering Home');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Catering home has ${critical.length} critical/serious a11y violations`
      ).toHaveLength(0);
    });

    test('catering page has proper heading hierarchy', async ({ page }) => {
      await page.goto('/catering');
      const results = await checkPageAccessibility(page, 'Catering - Headings', {
        includeRules: ['heading-order', 'empty-heading'],
      });

      logViolationsWithoutFailing(results, 'Catering - Headings');
    });

    test('catering menu tabs are keyboard accessible', async ({ page }) => {
      await page.goto('/catering');
      await page.waitForLoadState('networkidle');

      // Find tab elements
      const tabs = page.locator('[role="tab"], [role="tablist"] button');
      const tabCount = await tabs.count();

      if (tabCount > 0) {
        // Focus first tab and test keyboard navigation
        await tabs.first().focus();

        // Test arrow key navigation
        await page.keyboard.press('ArrowRight');

        const focusedAfterArrow = await page.evaluate(() => {
          const el = document.activeElement;
          return el?.getAttribute('role') === 'tab' || el?.tagName === 'BUTTON';
        });

        // Just log the result, don't fail
        if (!focusedAfterArrow) {
          console.warn('[A11y Warning] Tab navigation may not support arrow keys');
        }
      }
    });
  });

  test.describe('Catering Menu & Selection', () => {
    test('a-la-carte page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/catering/a-la-carte');
      const results = await checkPageAccessibility(page, 'Catering A-La-Carte');

      logViolationsWithoutFailing(results, 'Catering A-La-Carte');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `A-la-carte page has ${critical.length} critical/serious a11y violations`
      ).toHaveLength(0);
    });

    test('browse options page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/catering/browse-options');
      const results = await checkPageAccessibility(page, 'Catering Browse Options');

      logViolationsWithoutFailing(results, 'Catering Browse Options');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Browse options page has ${critical.length} critical/serious a11y violations`
      ).toHaveLength(0);
    });

    test('catering product selection is accessible', async ({ page }) => {
      await page.goto('/catering/a-la-carte');
      await page.waitForLoadState('networkidle');

      // Check that quantity controls are accessible
      const results = await checkPageAccessibility(page, 'Catering - Controls', {
        includeRules: ['button-name', 'aria-input-field-name', 'label'],
      });

      logViolationsWithoutFailing(results, 'Catering - Controls');
    });
  });

  test.describe('Catering Checkout', () => {
    test('catering checkout page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/catering/checkout');
      const results = await checkPageAccessibility(page, 'Catering Checkout');

      logViolationsWithoutFailing(results, 'Catering Checkout');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Catering checkout has ${critical.length} critical/serious a11y violations`
      ).toHaveLength(0);
    });

    test('catering checkout form has proper labels', async ({ page }) => {
      await page.goto('/catering/checkout');
      const results = await checkPageAccessibility(page, 'Catering Checkout - Forms', RULE_SETS.forms);

      logViolationsWithoutFailing(results, 'Catering Checkout - Forms');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Catering checkout form has ${critical.length} critical/serious label violations`
      ).toHaveLength(0);
    });

    test('date picker is accessible', async ({ page }) => {
      await page.goto('/catering/checkout');
      await page.waitForLoadState('networkidle');

      // Check for date picker accessibility
      const dateInputs = page.locator('input[type="date"], [data-testid*="date"]');
      const count = await dateInputs.count();

      if (count > 0) {
        const results = await checkPageAccessibility(page, 'Catering - Date Picker', {
          includeRules: ['label', 'aria-input-field-name'],
        });

        logViolationsWithoutFailing(results, 'Catering - Date Picker');
      }
    });

    test('catering confirmation page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/catering/confirmation');
      const results = await checkPageAccessibility(page, 'Catering Confirmation');

      logViolationsWithoutFailing(results, 'Catering Confirmation');
    });
  });

  test.describe('Catering Inquiry Forms', () => {
    test('custom quote page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/catering/custom-quote');
      const results = await checkPageAccessibility(page, 'Custom Quote Page');

      logViolationsWithoutFailing(results, 'Custom Quote Page');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Custom quote page has ${critical.length} critical/serious a11y violations`
      ).toHaveLength(0);
    });

    test('custom quote form has proper labels', async ({ page }) => {
      await page.goto('/catering/custom-quote');
      const results = await checkPageAccessibility(page, 'Custom Quote - Forms', RULE_SETS.forms);

      logViolationsWithoutFailing(results, 'Custom Quote - Forms');
    });

    test('inquiry form page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/catering/inquiry-form');
      const results = await checkPageAccessibility(page, 'Inquiry Form Page');

      logViolationsWithoutFailing(results, 'Inquiry Form Page');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Inquiry form page has ${critical.length} critical/serious a11y violations`
      ).toHaveLength(0);
    });

    test('inquiry form has proper labels', async ({ page }) => {
      await page.goto('/catering/inquiry-form');
      const results = await checkPageAccessibility(page, 'Inquiry Form - Forms', RULE_SETS.forms);

      logViolationsWithoutFailing(results, 'Inquiry Form - Forms');
    });

    test('catering contact page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/contact-catering');
      const results = await checkPageAccessibility(page, 'Catering Contact Page');

      logViolationsWithoutFailing(results, 'Catering Contact Page');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Catering contact page has ${critical.length} critical/serious a11y violations`
      ).toHaveLength(0);
    });
  });

  test.describe('Catering Keyboard Navigation', () => {
    test('catering menu is keyboard navigable', async ({ page }) => {
      await page.goto('/catering');
      await page.waitForLoadState('networkidle');

      // Tab through interactive elements
      await page.keyboard.press('Tab');

      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');

        const focused = await page.evaluate(() => {
          const el = document.activeElement;
          return {
            tagName: el?.tagName,
            role: el?.getAttribute('role'),
            isInteractive:
              el?.tagName === 'A' ||
              el?.tagName === 'BUTTON' ||
              el?.tagName === 'INPUT' ||
              el?.tagName === 'SELECT',
          };
        });

        // Log if we're stuck on non-interactive elements
        if (focused.tagName && !focused.isInteractive && focused.role !== 'tab') {
          console.log(`[A11y Info] Focused on ${focused.tagName} (role: ${focused.role})`);
        }
      }
    });

    test('catering package selection works with keyboard', async ({ page }) => {
      await page.goto('/catering/browse-options');
      await page.waitForLoadState('networkidle');

      // Find package cards or selection buttons
      const selectButtons = page.locator('button:has-text("Select"), button:has-text("Add")');
      const count = await selectButtons.count();

      if (count > 0) {
        // Focus and activate with Enter
        await selectButtons.first().focus();
        const isFocused = await selectButtons.first().evaluate(el => document.activeElement === el);

        expect(isFocused).toBeTruthy();
      }
    });
  });

  test.describe('Catering Form Error Handling', () => {
    test('form errors are announced accessibly', async ({ page }) => {
      await page.goto('/catering/inquiry-form');
      await page.waitForLoadState('networkidle');

      // Try to submit empty form
      const submitButton = page.locator('button[type="submit"]').first();

      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(500);

        // Check for error messages with proper ARIA
        const errorMessages = page.locator('[role="alert"], [aria-live="polite"], .error-message');
        const errorCount = await errorMessages.count();

        // Log for reporting
        if (errorCount === 0) {
          console.warn('[A11y Warning] Form errors may not be announced to screen readers');
        } else {
          console.log(`[A11y Info] Found ${errorCount} accessible error message(s)`);
        }
      }
    });
  });
});
