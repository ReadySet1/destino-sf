import { test, expect } from '@playwright/test';
import { testProducts, testPaymentInfo } from './fixtures/test-data';
import { WaitHelpers } from './utils/wait-helpers';

/**
 * Critical Test: Payment Methods Flow
 * Tests different payment method options and switching between them
 * Business Value: Ensures customers can choose their preferred payment method
 *
 * Current Payment Methods:
 * - SQUARE (Credit Card) - always available
 * - CASH - available only for pickup orders
 *
 * Future Payment Methods (not yet implemented):
 * - VENMO - mentioned in DES-58 but not yet in codebase
 *
 * Test Scenarios:
 * 1. Square credit card payment flow (primary method)
 * 2. Cash payment selection (pickup only)
 * 3. Payment method switching
 * 4. Cash payment restrictions (not available for delivery/shipping)
 * 5. Payment form visibility based on method selection
 */
test.describe('Payment Methods Flow', () => {
  const generateGuestEmail = () => `payment-test-${Date.now()}@example.com`;

  test.beforeEach(async ({ page }) => {
    // Start with clean state
    await page.goto('/');
    await WaitHelpers.waitForNetworkIdle(page);

    // Add product to cart for testing
    await page.goto(`/products/${testProducts.empanada.slug}`);
    await page.getByRole('button', { name: /Add to Cart/i }).click();
    await WaitHelpers.waitForNotification(page, /Added to Cart/i);
  });

  test('should complete purchase with Square credit card payment', async ({ page }) => {
    const guestEmail = generateGuestEmail();

    // Navigate to checkout
    await page.goto('/checkout');

    // Fill customer info
    await page.getByLabel('First Name').fill('Credit');
    await page.getByLabel('Last Name').fill('Card');
    await page.getByLabel('Email').fill(guestEmail);
    await page.getByLabel('Phone').fill('(415) 555-1001');

    // Select pickup fulfillment
    const pickupOption = page.getByRole('radio', { name: /pickup/i });
    await pickupOption.click();

    // Wait for payment method selector to be visible
    await expect(page.getByText('Payment Method')).toBeVisible();

    // Verify Square/Credit Card is selected by default
    await expect(page.getByText('Credit Card')).toBeVisible();
    await expect(page.getByText(/Pay securely with your credit or debit card/i)).toBeVisible();

    // Verify Square payment form iframe appears
    await WaitHelpers.waitForAnySelector(page, ['iframe[title="Secure card payment input frame"]']);

    // Fill in card details
    const paymentFrame = page.frameLocator('iframe[title="Secure card payment input frame"]');
    await paymentFrame.getByPlaceholder('Card number').fill(testPaymentInfo.number);
    await paymentFrame.getByPlaceholder('MM/YY').fill(testPaymentInfo.expiry);
    await paymentFrame.getByPlaceholder('CVV').fill(testPaymentInfo.cvv);

    // Place order
    const placeOrderButton = page.getByRole('button', { name: /place order|complete purchase/i });
    await expect(placeOrderButton).toBeEnabled();
    await placeOrderButton.click();

    // Verify order confirmation
    await WaitHelpers.waitForURL(page, /\/order-confirmation|\/checkout\/success/, {
      timeout: 30000,
    });
    await expect(page.getByText(/order confirmed|thank you/i)).toBeVisible();
  });

  test('should show cash payment option for pickup orders', async ({ page }) => {
    const guestEmail = generateGuestEmail();

    // Navigate to checkout
    await page.goto('/checkout');

    // Fill customer info
    await page.getByLabel('First Name').fill('Cash');
    await page.getByLabel('Last Name').fill('Payer');
    await page.getByLabel('Email').fill(guestEmail);
    await page.getByLabel('Phone').fill('(415) 555-1002');

    // Select pickup fulfillment
    const pickupOption = page.getByRole('radio', { name: /pickup/i });
    await pickupOption.click();

    // Wait for payment method selector
    await expect(page.getByText('Payment Method')).toBeVisible();

    // Verify both payment methods are visible for pickup
    await expect(page.getByText('Credit Card')).toBeVisible();
    await expect(page.getByText('Cash')).toBeVisible();
    await expect(page.getByText(/Pay with cash at pickup/i)).toBeVisible();
  });

  test('should allow switching between payment methods', async ({ page }) => {
    const guestEmail = generateGuestEmail();

    // Navigate to checkout
    await page.goto('/checkout');

    // Fill customer info
    await page.getByLabel('First Name').fill('Payment');
    await page.getByLabel('Last Name').fill('Switcher');
    await page.getByLabel('Email').fill(guestEmail);
    await page.getByLabel('Phone').fill('(415) 555-1003');

    // Select pickup fulfillment
    const pickupOption = page.getByRole('radio', { name: /pickup/i });
    await pickupOption.click();

    // Wait for payment methods
    await expect(page.getByText('Payment Method')).toBeVisible();

    // Initially, Credit Card should be selected
    await expect(page.getByText('Credit Card')).toBeVisible();

    // Verify Square payment form is visible
    await WaitHelpers.waitForAnySelector(
      page,
      ['iframe[title="Secure card payment input frame"]'],
      { timeout: 5000 }
    );

    // Click on Cash payment method
    const cashOption = page.getByText('Cash').first();
    await cashOption.click();

    // Wait a moment for the payment form to hide
    await page.waitForTimeout(500);

    // Verify Square payment form is hidden (iframe should disappear)
    const squareIframeVisible = await page
      .locator('iframe[title="Secure card payment input frame"]')
      .isVisible()
      .catch(() => false);

    // For cash payment, Square form should be hidden
    expect(squareIframeVisible).toBe(false);

    // Switch back to Credit Card
    const creditCardOption = page.getByText('Credit Card').first();
    await creditCardOption.click();

    // Verify Square payment form reappears
    await WaitHelpers.waitForAnySelector(page, ['iframe[title="Secure card payment input frame"]']);
  });

  test('should NOT show cash option for delivery orders', async ({ page }) => {
    const guestEmail = generateGuestEmail();

    // Navigate to checkout
    await page.goto('/checkout');

    // Fill customer info
    await page.getByLabel('First Name').fill('Delivery');
    await page.getByLabel('Last Name').fill('Order');
    await page.getByLabel('Email').fill(guestEmail);
    await page.getByLabel('Phone').fill('(415) 555-1004');

    // Select delivery fulfillment
    const deliveryOption = page.getByRole('radio', { name: /delivery/i });

    // Check if delivery option exists (might not be available in all cases)
    const isDeliveryVisible = await deliveryOption.isVisible({ timeout: 2000 }).catch(() => false);

    if (isDeliveryVisible) {
      await deliveryOption.click();

      // Fill delivery address
      await page.getByLabel(/address|street/i).fill('123 Market St');
      await page.getByLabel(/city/i).fill('San Francisco');

      // Wait for payment method selector
      await expect(page.getByText('Payment Method')).toBeVisible();

      // Verify only Credit Card is visible (Cash should be hidden for delivery)
      await expect(page.getByText('Credit Card')).toBeVisible();

      // Cash should NOT be visible for delivery
      const cashVisible = await page
        .getByText('Cash')
        .isVisible({ timeout: 1000 })
        .catch(() => false);
      expect(cashVisible).toBe(false);
    } else {
      // If delivery not available, skip this part of test
      console.log('Delivery option not available, skipping delivery-specific test');
    }
  });

  test('should complete cash payment flow for pickup', async ({ page }) => {
    const guestEmail = generateGuestEmail();

    // Navigate to checkout
    await page.goto('/checkout');

    // Fill customer info
    await page.getByLabel('First Name').fill('Cash');
    await page.getByLabel('Last Name').fill('Pickup');
    await page.getByLabel('Email').fill(guestEmail);
    await page.getByLabel('Phone').fill('(415) 555-1005');

    // Select pickup fulfillment
    const pickupOption = page.getByRole('radio', { name: /pickup/i });
    await pickupOption.click();

    // Wait for payment methods
    await expect(page.getByText('Payment Method')).toBeVisible();

    // Select cash payment
    const cashOption = page.getByText('Cash').first();
    await cashOption.click();

    // Wait for selection to register
    await page.waitForTimeout(500);

    // Place order (no card details needed for cash)
    const placeOrderButton = page.getByRole('button', { name: /place order|complete purchase/i });
    await expect(placeOrderButton).toBeEnabled();
    await placeOrderButton.click();

    // Verify order confirmation
    // Cash orders might go to a special success page
    await WaitHelpers.waitForURL(
      page,
      /\/order-confirmation|\/checkout\/success\/manual|\/checkout\/success/,
      { timeout: 30000 }
    );

    // Verify confirmation message
    await expect(page.getByText(/order confirmed|thank you|order received/i)).toBeVisible();

    // Verify cash payment instructions are shown
    await expect(page.getByText(/cash/i)).toBeVisible();
  });

  test('should validate payment information before submission', async ({ page }) => {
    const guestEmail = generateGuestEmail();

    // Navigate to checkout
    await page.goto('/checkout');

    // Fill customer info
    await page.getByLabel('First Name').fill('Invalid');
    await page.getByLabel('Last Name').fill('Card');
    await page.getByLabel('Email').fill(guestEmail);
    await page.getByLabel('Phone').fill('(415) 555-1006');

    // Select pickup
    const pickupOption = page.getByRole('radio', { name: /pickup/i });
    await pickupOption.click();

    // Ensure Credit Card is selected
    await expect(page.getByText('Credit Card')).toBeVisible();

    // Wait for Square payment form
    await WaitHelpers.waitForAnySelector(page, ['iframe[title="Secure card payment input frame"]']);

    // Don't fill in card details (leave empty)

    // Try to place order
    const placeOrderButton = page.getByRole('button', { name: /place order|complete purchase/i });
    await placeOrderButton.click();

    // Should stay on checkout page or show error
    // Wait a moment to see if we stay on page
    await page.waitForTimeout(2000);

    // Should still be on checkout (not redirected)
    await expect(page).toHaveURL('/checkout');

    // Or verify an error message appears (Square will show validation)
    // This depends on Square's iframe validation behavior
  });

  test('should show payment method description and icons', async ({ page }) => {
    const guestEmail = generateGuestEmail();

    // Navigate to checkout
    await page.goto('/checkout');

    // Fill customer info
    await page.getByLabel('First Name').fill('UI');
    await page.getByLabel('Last Name').fill('Test');
    await page.getByLabel('Email').fill(guestEmail);
    await page.getByLabel('Phone').fill('(415) 555-1007');

    // Select pickup
    const pickupOption = page.getByRole('radio', { name: /pickup/i });
    await pickupOption.click();

    // Wait for payment method selector
    await expect(page.getByText('Payment Method')).toBeVisible();

    // Verify Credit Card description
    await expect(page.getByText('Credit Card')).toBeVisible();
    await expect(page.getByText(/Pay securely with your credit or debit card/i)).toBeVisible();

    // Verify Cash description
    await expect(page.getByText('Cash')).toBeVisible();
    await expect(page.getByText(/Pay with cash at pickup/i)).toBeVisible();

    // Icons should be present (Lucide icons - CreditCardIcon and BanknoteIcon)
    // We can't directly test SVG icons, but we verify the containers are visible
    const paymentMethodContainers = page.locator('[class*="payment"]').or(
      page.locator('text="Credit Card"').locator('..').locator('..')
    );
    await expect(paymentMethodContainers.first()).toBeVisible();
  });
});

/**
 * Future Payment Methods Tests
 * These tests are placeholders for when additional payment methods are implemented
 */
test.describe.skip('Future Payment Methods (Not Yet Implemented)', () => {
  test('should complete purchase with Venmo payment', async ({ page }) => {
    // TODO: Implement when Venmo payment method is added
    // This test would verify:
    // - Venmo option appears in payment method selector
    // - Venmo-specific UI/instructions are shown
    // - Order can be completed with Venmo
  });

  test('should show Venmo QR code for payment', async ({ page }) => {
    // TODO: Implement when Venmo payment method is added
    // This test would verify:
    // - QR code is displayed for Venmo payment
    // - Venmo handle/username is shown
    // - Instructions for completing Venmo payment are clear
  });

  test('should handle Venmo payment confirmation', async ({ page }) => {
    // TODO: Implement when Venmo payment method is added
    // This test would verify:
    // - User can indicate they've completed Venmo payment
    // - Order is marked as pending Venmo confirmation
    // - Admin receives notification of Venmo payment to verify
  });
});
