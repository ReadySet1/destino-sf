import { Page, expect } from '@playwright/test';
import {
  testCustomer,
  testAdmin,
  testShippingAddress,
  testPaymentInfo,
  TestCustomer,
  TestAddress,
} from '../fixtures/test-data';
import { WaitHelpers } from './wait-helpers';

/**
 * Helper utilities for Destino SF E2E tests
 */
export class TestHelpers {
  /**
   * Login as a customer user
   */
  static async loginAsCustomer(page: Page, customer: TestCustomer = testCustomer) {
    await page.goto('/sign-in');
    await page.fill('[data-testid="email"]', customer.email);
    await page.fill('[data-testid="password"]', customer.password);
    await page.click('[data-testid="sign-in-button"]');

    // Wait for successful login redirect
    await page.waitForURL('**/account', { timeout: 10000 });
    await expect(page.getByText(`Welcome, ${customer.firstName}`)).toBeVisible();
  }

  /**
   * Login as an admin user
   */
  static async loginAsAdmin(page: Page, admin: TestCustomer = testAdmin) {
    await page.goto('/sign-in');
    await page.fill('[data-testid="email"]', admin.email);
    await page.fill('[data-testid="password"]', admin.password);
    await page.click('[data-testid="sign-in-button"]');

    // Wait for admin dashboard
    await page.waitForURL('**/admin', { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
  }

  /**
   * Add a product to cart by slug
   */
  static async addProductToCart(page: Page, productSlug: string, quantity: number = 1) {
    await page.goto(`/products/${productSlug}`);

    // Wait for product page to load - use the main product title (h1) specifically
    await expect(page.locator('h1').first()).toBeVisible();

    // For multiple quantities, add one at a time by clicking the button multiple times
    // This is more reliable than trying to use quantity inputs
    for (let i = 0; i < quantity; i++) {
      // Try multiple selectors for add to cart button
      const addToCartSelectors = [
        '[data-testid="add-to-cart"]',
        'button:has-text("Add to Cart")',
        '.bg-\\[\\#F7B614\\]:has-text("Add to Cart")',
        'button[aria-label*="Add"][aria-label*="to cart"]',
      ];

      let buttonClicked = false;
      for (const selector of addToCartSelectors) {
        const button = page.locator(selector);
        if (await button.isVisible()) {
          await button.click();
          buttonClicked = true;
          break;
        }
      }

      if (!buttonClicked) {
        throw new Error(`Add to cart button not found for product ${productSlug}`);
      }

      // Wait for confirmation notification
      await WaitHelpers.waitForNotification(page, /added to cart/i, { timeout: 5000 });

      // Wait for cart to update
      await WaitHelpers.waitForCartUpdate(page);

      // Small delay between additions only if adding multiple
      if (i < quantity - 1) {
        await page.waitForTimeout(200);
      }
    }
  }

  /**
   * Fill shipping address form
   */
  static async fillShippingAddress(page: Page, address: TestAddress = testShippingAddress) {
    await page.fill('[data-testid="address-line1"]', address.line1);
    if (address.line2) {
      await page.fill('[data-testid="address-line2"]', address.line2);
    }
    await page.fill('[data-testid="city"]', address.city);
    await page.selectOption('[data-testid="state"]', address.state);
    await page.fill('[data-testid="zip"]', address.zip);
  }

  /**
   * Complete checkout process with payment
   */
  static async completeCheckout(
    page: Page,
    options: {
      deliveryType?: 'delivery' | 'pickup';
      paymentMethod?: 'card' | 'cash';
    } = {}
  ) {
    const { deliveryType = 'delivery', paymentMethod = 'card' } = options;

    // Select delivery option
    await page.check(`[data-testid="delivery-${deliveryType}"]`);

    if (deliveryType === 'delivery') {
      await TestHelpers.fillShippingAddress(page);
    }

    // Fill customer information
    await page.fill('[data-testid="customer-email"]', testCustomer.email);
    await page.fill('[data-testid="customer-phone"]', testCustomer.phone);

    // Continue to payment
    await page.click('[data-testid="continue-to-payment"]');

    if (paymentMethod === 'card') {
      await TestHelpers.fillPaymentInfo(page);
    }

    // Place order
    await page.click('[data-testid="place-order"]');

    // Wait for order confirmation
    await page.waitForURL('**/order-confirmation/**', { timeout: 15000 });
  }

  /**
   * Fill Square payment form (iframe handling)
   */
  static async fillPaymentInfo(page: Page) {
    // Wait for Square payment form to load
    await page.waitForSelector('#sq-card-number', { timeout: 10000 });

    // Fill card number
    const cardNumberFrame = page.frameLocator('#sq-card-number');
    await cardNumberFrame.locator('input').fill(testPaymentInfo.number);

    // Fill expiry date
    const expiryFrame = page.frameLocator('#sq-expiration-date');
    await expiryFrame.locator('input').fill(testPaymentInfo.expiry);

    // Fill CVV
    const cvvFrame = page.frameLocator('#sq-cvv');
    await cvvFrame.locator('input').fill(testPaymentInfo.cvv);

    // Fill cardholder name if present
    const nameInput = page.locator('[data-testid="cardholder-name"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill(testPaymentInfo.name);
    }
  }

  /**
   * Clear cart completely
   */
  static async clearCart(page: Page) {
    await page.goto('/cart');

    // Check if cart is already empty
    const emptyCartText = page.getByText('Your cart is empty');
    if (await emptyCartText.isVisible()) {
      return; // Cart is already empty
    }

    // Handle both regular and catering cart tabs
    const tabs = ['Regular Items', 'Catering Items'];

    for (const tabName of tabs) {
      const tab = page.getByRole('button', { name: new RegExp(tabName, 'i') });
      if (await tab.isVisible()) {
        await tab.click();
        await WaitHelpers.waitForNetworkIdle(page); // Wait for tab switch

        // Clear this cart if it has items
        const clearButton = page.getByRole('button', { name: new RegExp(`Clear.*Cart`, 'i') });
        if (await clearButton.isVisible()) {
          await clearButton.click();
          await WaitHelpers.waitForCartUpdate(page);
        }

        // Alternative: Remove items individually
        const removeButtons = page.locator(
          '[data-testid="remove-item"], button:has-text("Remove")'
        );
        const count = await removeButtons.count();

        for (let i = 0; i < count; i++) {
          const button = removeButtons.first();
          if (await button.isVisible()) {
            await button.click();
            await WaitHelpers.waitForCartUpdate(page);
          }
        }
      }
    }

    // Verify cart is empty
    await expect(page.getByText('Your cart is empty')).toBeVisible({ timeout: 5000 });
  }

  /**
   * Navigate to a specific section of the site
   */
  static async navigateTo(page: Page, section: 'home' | 'menu' | 'catering' | 'about' | 'contact') {
    const routes = {
      home: '/',
      menu: '/menu',
      catering: '/catering',
      about: '/about',
      contact: '/contact',
    };

    await page.goto(routes[section]);
    await page.waitForLoadState('networkidle');
  }
}
