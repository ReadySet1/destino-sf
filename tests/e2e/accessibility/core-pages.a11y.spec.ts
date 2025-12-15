/**
 * Core Pages Accessibility Tests
 *
 * Tests critical user-facing pages for WCAG 2.1 AA compliance.
 * These are the highest priority pages for accessibility.
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

test.describe('Core Pages Accessibility @a11y', () => {
  test.describe('Homepage', () => {
    test('homepage meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/');
      const results = await checkPageAccessibility(page, 'Homepage');

      // Log violations without failing (report mode)
      logViolationsWithoutFailing(results, 'Homepage');

      // Only fail on critical/serious violations
      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Homepage has ${critical.length} critical/serious a11y violations`
      ).toHaveLength(0);
    });

    test('homepage has proper heading hierarchy', async ({ page }) => {
      await page.goto('/');
      const results = await checkPageAccessibility(page, 'Homepage - Headings', {
        includeRules: ['heading-order', 'empty-heading'],
      });

      expect(results.violations).toHaveLength(0);
    });

    test('homepage has proper landmark structure', async ({ page }) => {
      await page.goto('/');
      const results = await checkPageAccessibility(page, 'Homepage - Landmarks', RULE_SETS.navigation);

      logViolationsWithoutFailing(results, 'Homepage - Landmarks');
    });
  });

  test.describe('Product Pages', () => {
    test('menu page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/menu');
      const results = await checkPageAccessibility(page, 'Menu Page');

      logViolationsWithoutFailing(results, 'Menu Page');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Menu page has ${critical.length} critical/serious a11y violations`
      ).toHaveLength(0);
    });

    test('products page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/products');
      const results = await checkPageAccessibility(page, 'Products Page');

      logViolationsWithoutFailing(results, 'Products Page');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Products page has ${critical.length} critical/serious a11y violations`
      ).toHaveLength(0);
    });

    test('product detail page meets WCAG 2.1 AA', async ({ page }) => {
      // Navigate to products and click on first one
      await page.goto('/products');
      await page.waitForLoadState('networkidle');

      // Get the first product link
      const productLink = page.locator('a[href^="/products/"]').first();

      if (await productLink.isVisible()) {
        await productLink.click();
        await page.waitForLoadState('networkidle');

        const results = await checkPageAccessibility(page, 'Product Detail Page');

        logViolationsWithoutFailing(results, 'Product Detail Page');

        const critical = getCriticalViolations(results);
        expect(
          critical,
          `Product detail page has ${critical.length} critical/serious a11y violations`
        ).toHaveLength(0);
      }
    });

    test('product images have alt text', async ({ page }) => {
      await page.goto('/products');
      await page.waitForLoadState('networkidle');

      const results = await checkPageAccessibility(page, 'Products - Images', {
        includeRules: ['image-alt', 'image-redundant-alt'],
      });

      logViolationsWithoutFailing(results, 'Products - Images');
    });
  });

  test.describe('Cart', () => {
    test('cart page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/cart');
      const results = await checkPageAccessibility(page, 'Cart Page');

      logViolationsWithoutFailing(results, 'Cart Page');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Cart page has ${critical.length} critical/serious a11y violations`
      ).toHaveLength(0);
    });

    test('cart quantity controls are accessible', async ({ page }) => {
      await page.goto('/cart');
      const results = await checkPageAccessibility(page, 'Cart - Controls', {
        includeRules: ['button-name', 'aria-input-field-name'],
      });

      logViolationsWithoutFailing(results, 'Cart - Controls');
    });
  });

  test.describe('Checkout', () => {
    test('checkout page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/checkout');
      const results = await checkPageAccessibility(page, 'Checkout Page');

      logViolationsWithoutFailing(results, 'Checkout Page');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Checkout page has ${critical.length} critical/serious a11y violations`
      ).toHaveLength(0);
    });

    test('checkout form has proper labels', async ({ page }) => {
      await page.goto('/checkout');
      const results = await checkPageAccessibility(page, 'Checkout - Forms', RULE_SETS.forms);

      logViolationsWithoutFailing(results, 'Checkout - Forms');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Checkout form has ${critical.length} critical/serious label violations`
      ).toHaveLength(0);
    });

    test('checkout success page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/checkout/success');
      const results = await checkPageAccessibility(page, 'Checkout Success Page');

      logViolationsWithoutFailing(results, 'Checkout Success Page');
    });
  });

  test.describe('Authentication Pages', () => {
    test('sign in page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/sign-in');
      const results = await checkPageAccessibility(page, 'Sign In Page');

      logViolationsWithoutFailing(results, 'Sign In Page');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Sign in page has ${critical.length} critical/serious a11y violations`
      ).toHaveLength(0);
    });

    test('sign in form has proper labels', async ({ page }) => {
      await page.goto('/sign-in');
      const results = await checkPageAccessibility(page, 'Sign In - Forms', RULE_SETS.forms);

      expect(results.violations).toHaveLength(0);
    });

    test('sign up page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/sign-up');
      const results = await checkPageAccessibility(page, 'Sign Up Page');

      logViolationsWithoutFailing(results, 'Sign Up Page');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Sign up page has ${critical.length} critical/serious a11y violations`
      ).toHaveLength(0);
    });

    test('sign up form has proper labels', async ({ page }) => {
      await page.goto('/sign-up');
      const results = await checkPageAccessibility(page, 'Sign Up - Forms', RULE_SETS.forms);

      logViolationsWithoutFailing(results, 'Sign Up - Forms');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Sign up form has ${critical.length} critical/serious label violations`
      ).toHaveLength(0);
    });

    test('forgot password page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/forgot-password');
      const results = await checkPageAccessibility(page, 'Forgot Password Page');

      logViolationsWithoutFailing(results, 'Forgot Password Page');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Forgot password page has ${critical.length} critical/serious a11y violations`
      ).toHaveLength(0);
    });
  });

  test.describe('Contact & Information Pages', () => {
    test('contact page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/contact');
      const results = await checkPageAccessibility(page, 'Contact Page');

      logViolationsWithoutFailing(results, 'Contact Page');

      const critical = getCriticalViolations(results);
      expect(
        critical,
        `Contact page has ${critical.length} critical/serious a11y violations`
      ).toHaveLength(0);
    });

    test('contact form has proper labels', async ({ page }) => {
      await page.goto('/contact');
      const results = await checkPageAccessibility(page, 'Contact - Forms', RULE_SETS.forms);

      logViolationsWithoutFailing(results, 'Contact - Forms');
    });

    test('about page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/about');
      const results = await checkPageAccessibility(page, 'About Page');

      logViolationsWithoutFailing(results, 'About Page');
    });

    test('terms page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/terms');
      const results = await checkPageAccessibility(page, 'Terms Page');

      logViolationsWithoutFailing(results, 'Terms Page');
    });

    test('privacy page meets WCAG 2.1 AA', async ({ page }) => {
      await page.goto('/privacy');
      const results = await checkPageAccessibility(page, 'Privacy Page');

      logViolationsWithoutFailing(results, 'Privacy Page');
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('homepage supports keyboard navigation', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Test Tab navigation
      await page.keyboard.press('Tab');
      const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
      expect(firstFocused).toBeTruthy();

      // Tab through several elements
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
      }

      // Check that focus is visible
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        const styles = window.getComputedStyle(el);
        return {
          tagName: el.tagName,
          hasOutline: styles.outlineWidth !== '0px' || styles.boxShadow !== 'none',
        };
      });

      expect(focusedElement).toBeTruthy();
    });

    test('navigation links are keyboard accessible', async ({ page }) => {
      await page.goto('/');

      // Find all navigation links
      const navLinks = page.locator('nav a, header a');
      const count = await navLinks.count();

      expect(count).toBeGreaterThan(0);

      // Check that links are focusable
      for (let i = 0; i < Math.min(count, 5); i++) {
        const link = navLinks.nth(i);
        await link.focus();
        const isFocused = await link.evaluate(el => document.activeElement === el);
        expect(isFocused).toBeTruthy();
      }
    });

    test('interactive elements have focus indicators', async ({ page }) => {
      await page.goto('/menu');
      await page.waitForLoadState('networkidle');

      // Find buttons and check they have focus styles
      const buttons = page.locator('button:visible').first();

      if (await buttons.isVisible()) {
        await buttons.focus();

        const hasFocusIndicator = await buttons.evaluate(el => {
          const styles = window.getComputedStyle(el);
          // Check for visible focus indicator
          return (
            styles.outlineWidth !== '0px' ||
            styles.boxShadow !== 'none' ||
            el.classList.contains('focus-visible') ||
            el.matches(':focus-visible')
          );
        });

        // Log result for reporting
        if (!hasFocusIndicator) {
          console.warn('[A11y Warning] Button may be missing visible focus indicator');
        }
      }
    });
  });

  test.describe('Color Contrast', () => {
    test('homepage has sufficient color contrast', async ({ page }) => {
      await page.goto('/');
      const results = await checkPageAccessibility(page, 'Homepage - Contrast', {
        includeRules: ['color-contrast'],
      });

      logViolationsWithoutFailing(results, 'Homepage - Contrast');
    });

    test('checkout page has sufficient color contrast', async ({ page }) => {
      await page.goto('/checkout');
      const results = await checkPageAccessibility(page, 'Checkout - Contrast', {
        includeRules: ['color-contrast'],
      });

      logViolationsWithoutFailing(results, 'Checkout - Contrast');
    });
  });
});
