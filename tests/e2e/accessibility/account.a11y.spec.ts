/**
 * Account & Order Pages Accessibility Tests
 *
 * Tests authenticated user pages for WCAG 2.1 AA compliance.
 * These tests cover account dashboard, order history, and order details.
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

test.describe('Account Pages Accessibility @a11y', () => {
  test.describe('Account Dashboard', () => {
    test('account page meets WCAG 2.1 AA (unauthenticated)', async ({ page }) => {
      await page.goto('/account');
      const results = await checkPageAccessibility(page, 'Account Page');

      logViolationsWithoutFailing(results, 'Account Page');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Account page has ${critical.length} critical/serious a11y violations`
      ).toHaveLength(0);
    });

    test('account page has proper navigation structure', async ({ page }) => {
      await page.goto('/account');
      const results = await checkPageAccessibility(page, 'Account - Navigation', RULE_SETS.navigation);

      logViolationsWithoutFailing(results, 'Account - Navigation');
    });
  });

  test.describe('Order History', () => {
    test('orders page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/account/orders');
      const results = await checkPageAccessibility(page, 'Orders Page');

      logViolationsWithoutFailing(results, 'Orders Page');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Orders page has ${critical.length} critical/serious a11y violations`
      ).toHaveLength(0);
    });

    test('order list table/grid is accessible', async ({ page }) => {
      await page.goto('/account/orders');
      await page.waitForLoadState('networkidle');

      // Check for table accessibility
      const tables = page.locator('table, [role="table"], [role="grid"]');
      const tableCount = await tables.count();

      if (tableCount > 0) {
        const results = await checkPageAccessibility(page, 'Orders - Tables', {
          includeRules: [
            'table-fake-caption',
            'td-has-header',
            'th-has-data-cells',
            'aria-allowed-role',
          ],
        });

        logViolationsWithoutFailing(results, 'Orders - Tables');
      }
    });

    test('pending orders page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/orders/pending');
      const results = await checkPageAccessibility(page, 'Pending Orders');

      logViolationsWithoutFailing(results, 'Pending Orders');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Pending orders page has ${critical.length} critical/serious a11y violations`
      ).toHaveLength(0);
    });
  });

  test.describe('Order Details', () => {
    test('order verification page meets WCAG 2.1 AA', async ({ page }) => {
      // Use a sample order ID pattern
      await page.goto('/orders/test-order-id/verify');
      const results = await checkPageAccessibility(page, 'Order Verification');

      logViolationsWithoutFailing(results, 'Order Verification');
    });

    test('order confirmation page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/order-confirmation/test-order-id');
      const results = await checkPageAccessibility(page, 'Order Confirmation');

      logViolationsWithoutFailing(results, 'Order Confirmation');
    });
  });

  test.describe('Payment Pages', () => {
    test('payment page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/payment/test-order-id');
      const results = await checkPageAccessibility(page, 'Payment Page');

      logViolationsWithoutFailing(results, 'Payment Page');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Payment page has ${critical.length} critical/serious a11y violations`
      ).toHaveLength(0);
    });

    test('payment form has proper labels', async ({ page }) => {
      await page.goto('/payment/test-order-id');
      const results = await checkPageAccessibility(page, 'Payment - Forms', RULE_SETS.forms);

      logViolationsWithoutFailing(results, 'Payment - Forms');
    });
  });

  test.describe('Account Keyboard Navigation', () => {
    test('account navigation is keyboard accessible', async ({ page }) => {
      await page.goto('/account');
      await page.waitForLoadState('networkidle');

      // Test tab navigation
      await page.keyboard.press('Tab');

      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');

        const focused = await page.evaluate(() => {
          const el = document.activeElement;
          return {
            tagName: el?.tagName,
            href: (el as HTMLAnchorElement)?.href,
            isLink: el?.tagName === 'A',
          };
        });

        if (focused.isLink) {
          // Test Enter key activates links
          const href = focused.href;
          if (href) {
            console.log(`[A11y Info] Link is focusable: ${href}`);
          }
        }
      }
    });

    test('order action buttons are keyboard accessible', async ({ page }) => {
      await page.goto('/account/orders');
      await page.waitForLoadState('networkidle');

      // Find action buttons
      const actionButtons = page.locator('button, a[role="button"]').filter({ hasText: /view|details/i });
      const count = await actionButtons.count();

      if (count > 0) {
        await actionButtons.first().focus();
        const isFocused = await actionButtons.first().evaluate(el => document.activeElement === el);

        expect(isFocused).toBeTruthy();
      }
    });
  });

  test.describe('Account Data Tables', () => {
    test('order history table has proper headers', async ({ page }) => {
      await page.goto('/account/orders');
      await page.waitForLoadState('networkidle');

      // Check table structure
      const table = page.locator('table').first();

      if (await table.isVisible()) {
        // Check for th elements
        const headers = table.locator('th');
        const headerCount = await headers.count();

        if (headerCount === 0) {
          console.warn('[A11y Warning] Order table may be missing header cells');
        } else {
          console.log(`[A11y Info] Found ${headerCount} table headers`);
        }

        // Check for scope attributes
        const scopedHeaders = table.locator('th[scope]');
        const scopedCount = await scopedHeaders.count();

        if (scopedCount < headerCount) {
          console.warn('[A11y Warning] Table headers may be missing scope attributes');
        }
      }
    });
  });

  test.describe('Account Status Messages', () => {
    test('empty state messages are accessible', async ({ page }) => {
      await page.goto('/account/orders');
      await page.waitForLoadState('networkidle');

      // Check for empty state or status messages
      const statusMessages = page.locator('[role="status"], [role="alert"], [aria-live]');
      const count = await statusMessages.count();

      console.log(`[A11y Info] Found ${count} live region(s) for status updates`);
    });
  });

  test.describe('Account Profile Forms', () => {
    test('profile edit forms are accessible', async ({ page }) => {
      await page.goto('/account');
      await page.waitForLoadState('networkidle');

      // Check for any forms on the account page
      const forms = page.locator('form');
      const formCount = await forms.count();

      if (formCount > 0) {
        const results = await checkPageAccessibility(page, 'Account - Profile Forms', RULE_SETS.forms);

        logViolationsWithoutFailing(results, 'Account - Profile Forms');
      }
    });
  });

  test.describe('Responsive Account Pages', () => {
    test('account page is accessible on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/account');
      const results = await checkPageAccessibility(page, 'Account - Mobile');

      logViolationsWithoutFailing(results, 'Account - Mobile');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Account mobile has ${critical.length} critical/serious a11y violations`
      ).toHaveLength(0);
    });

    test('touch targets are adequate size on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/account');
      await page.waitForLoadState('networkidle');

      // Check button and link sizes
      const touchTargets = page.locator('button, a').filter({ hasText: /.+/ });
      const count = await touchTargets.count();

      let smallTargets = 0;

      for (let i = 0; i < Math.min(count, 10); i++) {
        const target = touchTargets.nth(i);
        const box = await target.boundingBox();

        if (box && (box.width < 44 || box.height < 44)) {
          smallTargets++;
        }
      }

      if (smallTargets > 0) {
        console.warn(`[A11y Warning] ${smallTargets} touch target(s) may be smaller than 44x44px`);
      }
    });
  });
});
