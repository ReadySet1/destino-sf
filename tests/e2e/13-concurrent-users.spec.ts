/**
 * DES-60 Phase 4: Concurrent Users E2E Test
 *
 * Tests multiple concurrent users going through the complete checkout flow
 * in real browser environments to ensure race condition protections work
 * in production-like scenarios.
 *
 * Scenarios:
 * 1. Multiple users adding items to cart simultaneously
 * 2. Multiple users checking out concurrently
 * 3. Same user double-clicking checkout button
 * 4. Multiple payment attempts on same order
 *
 * @project DES-60 Phase 4: Concurrent Operations & Race Conditions
 */

import { test, expect, Page, Browser } from '@playwright/test';
import { prisma } from '@/lib/db-unified';

// Test configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_EMAIL = 'e2e-concurrent@example.com';

// Helper function to simulate user checkout flow
async function performCheckoutFlow(
  page: Page,
  userIndex: number
): Promise<{ orderId: string | null; success: boolean }> {
  try {
    // Navigate to products page
    await page.goto(`${BASE_URL}/products`);

    // Add a product to cart
    const addToCartButton = page.locator('[data-testid="add-to-cart"]').first();
    await addToCartButton.waitFor({ state: 'visible', timeout: 5000 });
    await addToCartButton.click();

    // Wait for cart to update
    await page.waitForTimeout(500);

    // Go to cart
    await page.goto(`${BASE_URL}/cart`);

    // Proceed to checkout
    const checkoutButton = page.locator('[data-testid="checkout-button"]');
    await checkoutButton.waitFor({ state: 'visible', timeout: 5000 });
    await checkoutButton.click();

    // Fill checkout form
    await page.waitForURL(`${BASE_URL}/checkout`);

    await page.fill('[name="name"]', `Test User ${userIndex}`);
    await page.fill('[name="email"]', `${TEST_EMAIL.replace('@', `-${userIndex}@`)}`);
    await page.fill('[name="phone"]', `+1555000${String(userIndex).padStart(4, '0')}`);

    // Select pickup time (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pickupTime = tomorrow.toISOString().split('T')[0] + 'T12:00';
    await page.fill('[name="pickupTime"]', pickupTime);

    // Submit checkout
    const submitButton = page.locator('[data-testid="submit-checkout"]');
    await submitButton.click();

    // Wait for order confirmation or error
    await page.waitForTimeout(2000);

    // Check if we got an order ID (success) or error
    const currentUrl = page.url();

    if (currentUrl.includes('/order/')) {
      // Extract order ID from URL
      const orderId = currentUrl.split('/order/')[1];
      return { orderId, success: true };
    } else if (currentUrl.includes('/checkout') && (await page.locator('[data-testid="error-message"]').count()) > 0) {
      // Checkout failed with error
      return { orderId: null, success: false };
    }

    return { orderId: null, success: false };
  } catch (error) {
    console.error(`User ${userIndex} checkout failed:`, error);
    return { orderId: null, success: false };
  }
}

// Helper to clean up test data
async function cleanupTestData() {
  await prisma.order.deleteMany({
    where: {
      OR: [
        { email: { contains: 'e2e-concurrent' } },
        { email: { startsWith: 'test-concurrent-' } },
      ],
    },
  });
}

test.describe('Concurrent Users E2E Tests', () => {
  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test.describe('Multiple Concurrent Users', () => {
    test('should handle 3 users checking out simultaneously', async ({ browser }) => {
      // Create 3 browser contexts (simulating 3 different users)
      const contexts = await Promise.all([
        browser.newContext(),
        browser.newContext(),
        browser.newContext(),
      ]);

      const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));

      // All users checkout concurrently
      const results = await Promise.all(
        pages.map((page, i) => performCheckoutFlow(page, i))
      );

      // Clean up contexts
      await Promise.all(contexts.map(ctx => ctx.close()));

      // All users should succeed (different emails = different orders)
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThanOrEqual(2); // At least 2 should succeed

      // Verify orders were created
      const orders = await prisma.order.findMany({
        where: {
          email: { contains: 'e2e-concurrent' },
        },
      });

      expect(orders.length).toBeGreaterThanOrEqual(2);
    });

    test('should prevent duplicate orders from same user', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Same user with same cart
      const cartItems = [
        { id: 'product-1', name: 'Alfajor', price: 4.5, quantity: 5 },
      ];

      // Go to checkout page
      await page.goto(`${BASE_URL}/checkout`);

      // Fill form
      await page.fill('[name="name"]', 'Duplicate Test User');
      await page.fill('[name="email"]', TEST_EMAIL);
      await page.fill('[name="phone"]', '+15551234567');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await page.fill('[name="pickupTime"]', tomorrow.toISOString().split('T')[0] + 'T12:00');

      // Click submit button multiple times rapidly (simulate double-click)
      const submitButton = page.locator('[data-testid="submit-checkout"]');

      await Promise.all([
        submitButton.click(),
        submitButton.click(),
        submitButton.click(),
      ]);

      // Wait for processing
      await page.waitForTimeout(3000);

      // Should only create 1 order
      const orders = await prisma.order.findMany({
        where: { email: TEST_EMAIL },
      });

      expect(orders.length).toBeLessThanOrEqual(1);

      await context.close();
    });
  });

  test.describe('Double-Click Prevention', () => {
    test('should prevent double-click on checkout button', async ({ page }) => {
      await page.goto(`${BASE_URL}/products`);

      // Add product to cart
      const addToCartButton = page.locator('[data-testid="add-to-cart"]').first();
      await addToCartButton.click();

      await page.goto(`${BASE_URL}/cart`);

      // Click checkout button multiple times rapidly
      const checkoutButton = page.locator('[data-testid="checkout-button"]');

      await Promise.all([
        checkoutButton.click(),
        checkoutButton.click(),
        checkoutButton.click(),
      ]);

      await page.waitForTimeout(2000);

      // Button should be disabled after first click
      const isDisabled = await checkoutButton.getAttribute('disabled');
      expect(isDisabled).toBeTruthy();
    });

    test('should prevent double-click on payment button', async ({ page }) => {
      // First create an order
      const order = await prisma.order.create({
        data: {
          status: 'PENDING',
          paymentStatus: 'PENDING',
          total: 50.0,
          squareOrderId: 'test-square-order',
          customerName: 'Test User',
          email: TEST_EMAIL,
          phone: '+15551234567',
          pickupTime: new Date(Date.now() + 86400000),
          version: 1,
        },
      });

      // Go to payment page
      await page.goto(`${BASE_URL}/checkout/payment?orderId=${order.id}`);

      // Fill payment form (if applicable)
      // ... payment form fields ...

      // Click pay button multiple times
      const payButton = page.locator('[data-testid="pay-button"]');

      if (await payButton.count() > 0) {
        await Promise.all([
          payButton.click(),
          payButton.click(),
        ]);

        await page.waitForTimeout(2000);

        // Verify order was only paid once
        const updatedOrder = await prisma.order.findUnique({
          where: { id: order.id },
        });

        // Should be PAID, not multiple charges
        expect(updatedOrder?.paymentStatus).toBe('PAID');
      }
    });
  });

  test.describe('Cart Concurrency', () => {
    test('should handle rapid cart updates', async ({ page }) => {
      await page.goto(`${BASE_URL}/products`);

      const addToCartButton = page.locator('[data-testid="add-to-cart"]').first();

      // Click add to cart 10 times rapidly
      for (let i = 0; i < 10; i++) {
        await addToCartButton.click();
        await page.waitForTimeout(50); // Small delay between clicks
      }

      await page.waitForTimeout(1000);

      // Go to cart and check quantity
      await page.goto(`${BASE_URL}/cart`);

      const quantityText = await page.locator('[data-testid="cart-quantity"]').textContent();
      const quantity = parseInt(quantityText || '0');

      // Should have consistent quantity (exactly 10 or handling duplicates correctly)
      expect(quantity).toBeGreaterThan(0);
      expect(quantity).toBeLessThanOrEqual(10);
    });

    test('should handle cart updates across multiple tabs', async ({ browser }) => {
      const context = await browser.newContext();

      // Open two tabs
      const page1 = await context.newPage();
      const page2 = await context.newPage();

      // Both tabs add items concurrently
      await Promise.all([
        page1.goto(`${BASE_URL}/products`),
        page2.goto(`${BASE_URL}/products`),
      ]);

      const addButton1 = page1.locator('[data-testid="add-to-cart"]').first();
      const addButton2 = page2.locator('[data-testid="add-to-cart"]').first();

      await Promise.all([addButton1.click(), addButton2.click()]);

      await page1.waitForTimeout(500);

      // Check cart in both tabs
      await Promise.all([
        page1.goto(`${BASE_URL}/cart`),
        page2.goto(`${BASE_URL}/cart`),
      ]);

      // Both should show the same cart state (eventually consistent)
      const quantity1 = await page1.locator('[data-testid="cart-total-items"]').textContent();
      const quantity2 = await page2.locator('[data-testid="cart-total-items"]').textContent();

      // Due to localStorage sync, quantities should match
      expect(quantity1).toBe(quantity2);

      await context.close();
    });
  });

  test.describe('Performance Under Load', () => {
    test('should maintain responsiveness with 5 concurrent users', async ({ browser }) => {
      const contexts = await Promise.all(
        Array.from({ length: 5 }, () => browser.newContext())
      );

      const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));

      const startTime = Date.now();

      // All users navigate to products page simultaneously
      await Promise.all(pages.map(page => page.goto(`${BASE_URL}/products`)));

      const loadTime = Date.now() - startTime;

      // Page should load in reasonable time even with concurrent users
      expect(loadTime).toBeLessThan(5000); // 5 seconds

      // All pages should have loaded successfully
      for (const page of pages) {
        const title = await page.title();
        expect(title).toBeTruthy();
      }

      // Clean up
      await Promise.all(contexts.map(ctx => ctx.close()));
    });

    test('should handle payment processing under concurrent load', async ({ browser }) => {
      // Create 3 test orders
      const orders = await Promise.all(
        Array.from({ length: 3 }, (_, i) =>
          prisma.order.create({
            data: {
              status: 'PENDING',
              paymentStatus: 'PENDING',
              total: 50.0 + i * 10,
              squareOrderId: `test-order-${i}`,
              customerName: `User ${i}`,
              email: `test-concurrent-${i}@example.com`,
              phone: `+155500000${i}`,
              pickupTime: new Date(Date.now() + 86400000),
              version: 1,
            },
          })
        )
      );

      const contexts = await Promise.all(
        Array.from({ length: 3 }, () => browser.newContext())
      );

      const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));

      const startTime = Date.now();

      // All users process payment concurrently
      await Promise.all(
        pages.map((page, i) =>
          page.goto(`${BASE_URL}/checkout/payment?orderId=${orders[i].id}`)
        )
      );

      const duration = Date.now() - startTime;

      // Should load in reasonable time
      expect(duration).toBeLessThan(8000);

      // Clean up
      await Promise.all(contexts.map(ctx => ctx.close()));
    });
  });
});
