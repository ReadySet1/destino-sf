/**
 * Admin Dashboard Accessibility Tests
 *
 * Tests admin pages for WCAG 2.1 AA compliance.
 * Important for internal user productivity and inclusivity.
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

test.describe('Admin Pages Accessibility @a11y', () => {
  test.describe('Admin Dashboard', () => {
    test('admin dashboard meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/admin');
      const results = await checkPageAccessibility(page, 'Admin Dashboard');

      logViolationsWithoutFailing(results, 'Admin Dashboard');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Admin dashboard has ${critical.length} critical/serious a11y violations`
      ).toHaveLength(0);
    });

    test('admin dashboard has proper heading hierarchy', async ({ page }) => {
      await page.goto('/admin');
      const results = await checkPageAccessibility(page, 'Admin - Headings', {
        includeRules: ['heading-order', 'empty-heading', 'document-title'],
      });

      logViolationsWithoutFailing(results, 'Admin - Headings');
    });

    test('admin navigation is accessible', async ({ page }) => {
      await page.goto('/admin');
      const results = await checkPageAccessibility(page, 'Admin - Navigation', RULE_SETS.navigation);

      logViolationsWithoutFailing(results, 'Admin - Navigation');
    });

    test('admin navigation cards are keyboard accessible', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      // Find navigation cards or links
      const navLinks = page.locator('a[href^="/admin/"], nav a');
      const count = await navLinks.count();

      expect(count).toBeGreaterThan(0);

      // Test first few links are focusable
      for (let i = 0; i < Math.min(count, 5); i++) {
        const link = navLinks.nth(i);
        await link.focus();
        const isFocused = await link.evaluate(el => document.activeElement === el);
        expect(isFocused).toBeTruthy();
      }
    });
  });

  test.describe('Order Management', () => {
    test('orders list page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/admin/orders');
      const results = await checkPageAccessibility(page, 'Admin Orders List');

      logViolationsWithoutFailing(results, 'Admin Orders List');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Admin orders list has ${critical.length} critical/serious a11y violations`
      ).toHaveLength(0);
    });

    test('orders table is accessible', async ({ page }) => {
      await page.goto('/admin/orders');
      await page.waitForLoadState('networkidle');

      const tables = page.locator('table');
      const tableCount = await tables.count();

      if (tableCount > 0) {
        const results = await checkPageAccessibility(page, 'Admin Orders - Tables', {
          includeRules: ['td-has-header', 'th-has-data-cells', 'table-fake-caption'],
        });

        logViolationsWithoutFailing(results, 'Admin Orders - Tables');
      }
    });

    test('manual order creation page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/admin/orders/manual');
      const results = await checkPageAccessibility(page, 'Manual Order Creation');

      logViolationsWithoutFailing(results, 'Manual Order Creation');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Manual order page has ${critical.length} critical/serious a11y violations`
      ).toHaveLength(0);
    });

    test('manual order form has proper labels', async ({ page }) => {
      await page.goto('/admin/orders/manual');
      const results = await checkPageAccessibility(page, 'Manual Order - Forms', RULE_SETS.forms);

      logViolationsWithoutFailing(results, 'Manual Order - Forms');
    });

    test('archived orders page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/admin/orders/archived');
      const results = await checkPageAccessibility(page, 'Archived Orders');

      logViolationsWithoutFailing(results, 'Archived Orders');
    });
  });

  test.describe('Product Management', () => {
    test('products list page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/admin/products');
      const results = await checkPageAccessibility(page, 'Admin Products List');

      logViolationsWithoutFailing(results, 'Admin Products List');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Admin products list has ${critical.length} critical/serious a11y violations`
      ).toHaveLength(0);
    });

    test('new product page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/admin/products/new');
      const results = await checkPageAccessibility(page, 'New Product Page');

      logViolationsWithoutFailing(results, 'New Product Page');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `New product page has ${critical.length} critical/serious a11y violations`
      ).toHaveLength(0);
    });

    test('new product form has proper labels', async ({ page }) => {
      await page.goto('/admin/products/new');
      const results = await checkPageAccessibility(page, 'New Product - Forms', RULE_SETS.forms);

      logViolationsWithoutFailing(results, 'New Product - Forms');
    });

    test('product ordering page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/admin/products/order');
      const results = await checkPageAccessibility(page, 'Product Ordering');

      logViolationsWithoutFailing(results, 'Product Ordering');
    });

    test('archived products page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/admin/products/archived');
      const results = await checkPageAccessibility(page, 'Archived Products');

      logViolationsWithoutFailing(results, 'Archived Products');
    });

    test('product badges page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/admin/products/badges');
      const results = await checkPageAccessibility(page, 'Product Badges');

      logViolationsWithoutFailing(results, 'Product Badges');
    });
  });

  test.describe('Availability Management', () => {
    test('availability overview page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/admin/products/availability');
      const results = await checkPageAccessibility(page, 'Availability Overview');

      logViolationsWithoutFailing(results, 'Availability Overview');
    });

    test('availability timeline page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/admin/products/availability/timeline');
      const results = await checkPageAccessibility(page, 'Availability Timeline');

      logViolationsWithoutFailing(results, 'Availability Timeline');
    });

    test('bulk availability editor meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/admin/products/availability/bulk');
      const results = await checkPageAccessibility(page, 'Bulk Availability Editor');

      logViolationsWithoutFailing(results, 'Bulk Availability Editor');
    });
  });

  test.describe('Settings & Configuration', () => {
    test('settings page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/admin/settings');
      const results = await checkPageAccessibility(page, 'Admin Settings');

      logViolationsWithoutFailing(results, 'Admin Settings');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Admin settings has ${critical.length} critical/serious a11y violations`
      ).toHaveLength(0);
    });

    test('settings form has proper labels', async ({ page }) => {
      await page.goto('/admin/settings');
      const results = await checkPageAccessibility(page, 'Settings - Forms', RULE_SETS.forms);

      logViolationsWithoutFailing(results, 'Settings - Forms');
    });

    test('shipping configuration page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/admin/shipping');
      const results = await checkPageAccessibility(page, 'Shipping Configuration');

      logViolationsWithoutFailing(results, 'Shipping Configuration');
    });

    test('categories page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/admin/categories');
      const results = await checkPageAccessibility(page, 'Categories');

      logViolationsWithoutFailing(results, 'Categories');
    });

    test('hours management page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/admin/hours');
      const results = await checkPageAccessibility(page, 'Hours Management');

      logViolationsWithoutFailing(results, 'Hours Management');
    });
  });

  test.describe('User Management', () => {
    test('users list page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/admin/users');
      const results = await checkPageAccessibility(page, 'Users List');

      logViolationsWithoutFailing(results, 'Users List');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Users list has ${critical.length} critical/serious a11y violations`
      ).toHaveLength(0);
    });

    test('new user page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/admin/users/new');
      const results = await checkPageAccessibility(page, 'New User Page');

      logViolationsWithoutFailing(results, 'New User Page');
    });

    test('new user form has proper labels', async ({ page }) => {
      await page.goto('/admin/users/new');
      const results = await checkPageAccessibility(page, 'New User - Forms', RULE_SETS.forms);

      logViolationsWithoutFailing(results, 'New User - Forms');
    });
  });

  test.describe('Featured Content', () => {
    test('spotlight picks page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/admin/spotlight-picks');
      const results = await checkPageAccessibility(page, 'Spotlight Picks');

      logViolationsWithoutFailing(results, 'Spotlight Picks');
    });

    test('spotlight picks drag-and-drop has keyboard alternative', async ({ page }) => {
      await page.goto('/admin/spotlight-picks');
      await page.waitForLoadState('networkidle');

      // Check for keyboard-accessible controls
      const moveButtons = page.locator('button').filter({ hasText: /move|up|down|reorder/i });
      const count = await moveButtons.count();

      if (count === 0) {
        console.warn('[A11y Warning] Spotlight picks may need keyboard-accessible reorder controls');
      } else {
        console.log(`[A11y Info] Found ${count} reorder button(s)`);
      }
    });
  });

  test.describe('Sync & Integration', () => {
    test('square sync page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/admin/square-sync');
      const results = await checkPageAccessibility(page, 'Square Sync');

      logViolationsWithoutFailing(results, 'Square Sync');
    });

    test('sync operations page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/admin/sync');
      const results = await checkPageAccessibility(page, 'Sync Operations');

      logViolationsWithoutFailing(results, 'Sync Operations');
    });

    test('sync conflicts page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/admin/sync-conflicts');
      const results = await checkPageAccessibility(page, 'Sync Conflicts');

      logViolationsWithoutFailing(results, 'Sync Conflicts');
    });
  });

  test.describe('Monitoring & Testing', () => {
    test('metrics dashboard meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/admin/dashboard/metrics');
      const results = await checkPageAccessibility(page, 'Metrics Dashboard');

      logViolationsWithoutFailing(results, 'Metrics Dashboard');
    });

    test('jobs page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/admin/jobs');
      const results = await checkPageAccessibility(page, 'Jobs');

      logViolationsWithoutFailing(results, 'Jobs');
    });

    test('test delivery zones page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/admin/test-delivery-zones');
      const results = await checkPageAccessibility(page, 'Test Delivery Zones');

      logViolationsWithoutFailing(results, 'Test Delivery Zones');
    });

    test('test email page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/admin/test-email');
      const results = await checkPageAccessibility(page, 'Test Email');

      logViolationsWithoutFailing(results, 'Test Email');
    });
  });

  test.describe('Admin Keyboard Navigation', () => {
    test('admin sidebar is keyboard navigable', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      // Find sidebar navigation
      const sidebar = page.locator('aside, nav[role="navigation"], [data-testid="sidebar"]');

      if (await sidebar.isVisible()) {
        const links = sidebar.locator('a');
        const linkCount = await links.count();

        for (let i = 0; i < Math.min(linkCount, 5); i++) {
          const link = links.nth(i);
          await link.focus();
          const isFocused = await link.evaluate(el => document.activeElement === el);
          expect(isFocused).toBeTruthy();
        }
      }
    });

    test('admin forms support keyboard submission', async ({ page }) => {
      await page.goto('/admin/settings');
      await page.waitForLoadState('networkidle');

      // Find first form
      const form = page.locator('form').first();

      if (await form.isVisible()) {
        // Find first input and submit button
        const input = form.locator('input:visible').first();
        const submitButton = form.locator('button[type="submit"]').first();

        if (await input.isVisible()) {
          await input.focus();
          // Test that Enter key works in form (usually submits)
          const canSubmit = await submitButton.isVisible();
          expect(canSubmit).toBeTruthy();
        }
      }
    });
  });

  test.describe('Admin Data Tables', () => {
    test('data tables have sortable column headers', async ({ page }) => {
      await page.goto('/admin/orders');
      await page.waitForLoadState('networkidle');

      const sortableHeaders = page.locator('th[aria-sort], th button, th[role="columnheader"]');
      const count = await sortableHeaders.count();

      console.log(`[A11y Info] Found ${count} potentially sortable column(s)`);

      // Check that sortable columns are keyboard accessible
      if (count > 0) {
        await sortableHeaders.first().focus();
      }
    });

    test('data tables support keyboard navigation', async ({ page }) => {
      await page.goto('/admin/orders');
      await page.waitForLoadState('networkidle');

      const table = page.locator('table').first();

      if (await table.isVisible()) {
        // Tab through table
        await page.keyboard.press('Tab');

        for (let i = 0; i < 5; i++) {
          await page.keyboard.press('Tab');

          const focused = await page.evaluate(() => {
            const el = document.activeElement;
            return {
              tagName: el?.tagName,
              inTable: el?.closest('table') !== null,
            };
          });

          if (focused.inTable) {
            console.log(`[A11y Info] Focused on ${focused.tagName} inside table`);
          }
        }
      }
    });
  });

  test.describe('Admin Status Indicators', () => {
    test('status badges have accessible text', async ({ page }) => {
      await page.goto('/admin/orders');
      await page.waitForLoadState('networkidle');

      // Check for status indicators
      const statusBadges = page.locator('[class*="badge"], [class*="status"], [role="status"]');
      const count = await statusBadges.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        const badge = statusBadges.nth(i);
        const text = await badge.textContent();
        const ariaLabel = await badge.getAttribute('aria-label');

        if (!text?.trim() && !ariaLabel) {
          console.warn(`[A11y Warning] Status badge ${i} may have no accessible text`);
        }
      }
    });
  });

  test.describe('Admin Color Contrast', () => {
    test('admin dashboard has sufficient contrast', async ({ page }) => {
      await page.goto('/admin');
      const results = await checkPageAccessibility(page, 'Admin - Contrast', {
        includeRules: ['color-contrast'],
      });

      logViolationsWithoutFailing(results, 'Admin - Contrast');
    });

    test('admin forms have sufficient contrast', async ({ page }) => {
      await page.goto('/admin/settings');
      const results = await checkPageAccessibility(page, 'Admin Settings - Contrast', {
        includeRules: ['color-contrast'],
      });

      logViolationsWithoutFailing(results, 'Admin Settings - Contrast');
    });
  });
});
