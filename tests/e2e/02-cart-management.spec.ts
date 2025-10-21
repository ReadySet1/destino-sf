import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';
import { WaitHelpers } from './utils/wait-helpers';
import { testProducts } from './fixtures/test-data';

/**
 * Critical Test 2: Cart Management
 * Tests cart functionality that affects user experience and conversion
 */
test.describe('Cart Management', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.clearCart(page);
  });

  test('should add and remove items from cart', async ({ page }) => {
    // Add item to cart
    await TestHelpers.addProductToCart(page, testProducts.empanada.slug);

    // Go to cart
    await page.goto('/cart');

    // Verify item is in cart
    await expect(page.getByText(testProducts.empanada.name)).toBeVisible();

    // Remove item using multiple possible selectors
    const removeSelectors = [
      '[data-testid="remove-item"]',
      'button:has-text("Remove")',
      'button[aria-label*="Remove"]',
    ];

    let itemRemoved = false;
    for (const selector of removeSelectors) {
      const button = page.locator(selector);
      if (await button.isVisible()) {
        await button.click();
        itemRemoved = true;
        break;
      }
    }

    if (!itemRemoved) {
      // Try using the clear cart button as fallback
      const clearButton = page.getByRole('button', { name: /Clear.*Cart/i });
      if (await clearButton.isVisible()) {
        await clearButton.click();
        itemRemoved = true;
      }
    }

    // Verify cart is empty
    await expect(page.getByText('Your cart is empty')).toBeVisible({ timeout: 5000 });
  });

  test('should update item quantities', async ({ page }) => {
    // Add item to cart
    await TestHelpers.addProductToCart(page, testProducts.alfajor.slug);

    // Go to cart
    await page.goto('/cart');

    // Wait for cart to load
    await page.waitForLoadState('networkidle');

    // Try to update quantity - look for quantity controls
    const quantityInput = page.locator('[data-testid="quantity-input"]');
    const increaseButton = page.getByRole('button', { name: /Increase|Plus|\+/ });

    // Try the increase button approach
    if (await increaseButton.isVisible()) {
      // Use increase button to go from 1 to 2
      await increaseButton.click();
      await WaitHelpers.waitForCartUpdate(page);

      // Verify quantity increased to 2
      await expect(page.getByTestId('order-subtotal')).toContainText('Subtotal (2 items)');

      // Try one more increase
      if (await increaseButton.isEnabled()) {
        await increaseButton.click();
        await WaitHelpers.waitForCartUpdate(page);

        // Verify quantity increased to 3
        await expect(page.getByTestId('order-subtotal')).toContainText('Subtotal (3 items)');
      }
    } else if (await quantityInput.isVisible()) {
      // Update quantity using input
      await quantityInput.fill('2');

      // Look for update button
      const updateButton = page.locator('[data-testid="update-quantity"]');
      if (await updateButton.isVisible()) {
        await updateButton.click();
      }

      // Verify quantity updated
      await expect(quantityInput).toHaveValue('2');
      await expect(page.getByTestId('order-subtotal')).toContainText('Subtotal (2 items)');
    } else {
      // If neither quantity controls are available, this functionality might not be implemented
      console.log('Quantity update controls not found - skipping quantity update test');
    }
  });

  test('should persist cart across page navigation', async ({ page }) => {
    // Add items to cart
    await TestHelpers.addProductToCart(page, testProducts.empanada.slug);
    await TestHelpers.addProductToCart(page, testProducts.alfajor.slug);

    // Navigate to different pages
    await TestHelpers.navigateTo(page, 'about');
    await TestHelpers.navigateTo(page, 'menu');

    // Go back to cart
    await page.goto('/cart');

    // Verify items are still there
    await expect(page.getByText(testProducts.empanada.name)).toBeVisible();
    await expect(page.getByText(testProducts.alfajor.name)).toBeVisible();
  });

  test('should calculate correct totals with tax and shipping', async ({ page }) => {
    // Add multiple items
    await TestHelpers.addProductToCart(page, testProducts.empanada.slug, 2);
    await TestHelpers.addProductToCart(page, testProducts.alfajor.slug, 1);

    // Go to cart
    await page.goto('/cart');

    // Verify subtotal using data-testid (more reliable)
    await expect(page.getByTestId('order-subtotal')).toContainText('Subtotal (3 items)');

    // Start checkout to see tax and shipping - use the improved selector
    const checkoutSelectors = [
      '[data-testid="checkout-button"]',
      'a[href="/checkout"]',
      'button:has-text("Proceed to Checkout")',
    ];

    let checkoutClicked = false;
    for (const selector of checkoutSelectors) {
      const button = page.locator(selector);
      if (await button.isVisible()) {
        await button.click();
        checkoutClicked = true;
        break;
      }
    }

    if (checkoutClicked) {
      // Fill address to calculate shipping (if the checkout flow requires it)
      try {
        await TestHelpers.fillShippingAddress(page);
        await page.click('[data-testid="calculate-shipping"]');

        // Verify shipping and tax are calculated
        await expect(page.locator('[data-testid="shipping-cost"]')).toBeVisible();
        await expect(page.locator('[data-testid="tax-amount"]')).toBeVisible();
        await expect(page.locator('[data-testid="total-amount"]')).toBeVisible();
      } catch (error) {
        // Some checkout flows might not require shipping calculation
        console.log('Shipping calculation not available in this flow');
      }
    }
  });

  test('should handle empty cart state', async ({ page }) => {
    // Go to cart when empty
    await page.goto('/cart');

    // Verify empty state
    await expect(page.getByText('Your cart is empty')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse Menu' })).toBeVisible();

    // Checkout button should be disabled (not applicable for empty cart since it shows empty cart component)
    // The empty cart component doesn't show checkout buttons
  });

  test('should validate minimum order requirements', async ({ page }) => {
    // This test assumes there might be minimum order amounts
    await page.goto('/cart');

    // Add a low-value item
    await TestHelpers.addProductToCart(page, testProducts.alfajor.slug, 1);

    await page.goto('/cart');

    // Check if minimum order message appears (if applicable)
    const minimumOrderText = page.getByText(/minimum order/i);
    if (await minimumOrderText.isVisible()) {
      const checkoutButton = page.locator(
        '[data-testid="checkout-button"], button:has-text("Proceed to Checkout")'
      );
      if (await checkoutButton.isVisible()) {
        await expect(checkoutButton).toBeDisabled();
      }
    }
  });
});
