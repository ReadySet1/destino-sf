/**
 * Admin Helpers for E2E Tests
 *
 * Utilities for admin-specific navigation, actions, and interactions
 */

import { Page, expect } from '@playwright/test';
import { OrderStatus, PaymentStatus } from '@prisma/client';

/**
 * Admin Helper Class for Playwright Tests
 */
export class AdminHelpers {
  /**
   * Navigate to admin orders page
   */
  static async navigateToOrders(page: Page): Promise<void> {
    await page.goto('/admin/orders');
    await page.waitForLoadState('networkidle');

    // Wait for loading to finish - look for content that appears after loading
    // The page shows "Loading orders..." initially, then shows either:
    // - A table with orders
    // - "No orders found" message
    // - "No data available" message
    // - Error state with "Unable to Load Orders"

    // First, wait for loading to disappear (optional, might be fast)
    await page.waitForTimeout(1000);

    // Wait for any of the possible end states
    await expect(
      page
        .locator('table')
        .or(page.getByText(/no orders found/i))
        .or(page.getByText(/no data available/i))
        .or(page.getByText(/unable to load orders/i))
    ).toBeVisible({ timeout: 30000 }); // Increased timeout to 30s for API fetch

    console.log('✅ Navigated to admin orders page');
  }

  /**
   * Navigate to specific order detail page
   */
  static async navigateToOrderDetail(page: Page, orderId: string): Promise<void> {
    await page.goto(`/admin/orders/${orderId}`);
    await page.waitForLoadState('networkidle');

    // Wait for order details to load
    await expect(page.getByText(/order details/i).or(page.getByText(/order #/i))).toBeVisible({
      timeout: 10000,
    });

    console.log(`✅ Navigated to order detail page: ${orderId}`);
  }

  /**
   * Navigate to archived orders page
   */
  static async navigateToArchivedOrders(page: Page): Promise<void> {
    await page.goto('/admin/orders/archived');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByText(/archived orders/i)).toBeVisible({ timeout: 10000 });

    console.log('✅ Navigated to archived orders page');
  }

  /**
   * Search for orders using the search input
   */
  static async searchOrders(page: Page, query: string): Promise<void> {
    const searchInput = page
      .locator('input[type="search"]')
      .or(page.locator('input[placeholder*="Search"]'))
      .first();

    await searchInput.fill(query);

    // Wait for search results to update
    await page.waitForTimeout(500);

    console.log(`✅ Searched orders for: "${query}"`);
  }

  /**
   * Filter orders by status
   */
  static async filterOrdersByStatus(page: Page, status: string): Promise<void> {
    // Look for status filter dropdown/select
    const statusFilter = page
      .locator('select[name="status"]')
      .or(page.locator('[data-testid="status-filter"]'))
      .or(page.getByLabel(/status/i))
      .first();

    await statusFilter.selectOption(status);

    // Wait for filtered results
    await page.waitForTimeout(500);

    console.log(`✅ Filtered orders by status: ${status}`);
  }

  /**
   * Filter orders by payment status
   */
  static async filterOrdersByPaymentStatus(page: Page, paymentStatus: string): Promise<void> {
    const paymentFilter = page
      .locator('select[name="payment"]')
      .or(page.locator('[data-testid="payment-filter"]'))
      .or(page.getByLabel(/payment/i))
      .first();

    await paymentFilter.selectOption(paymentStatus);

    // Wait for filtered results
    await page.waitForTimeout(500);

    console.log(`✅ Filtered orders by payment status: ${paymentStatus}`);
  }

  /**
   * Filter orders by type (regular/catering)
   */
  static async filterOrdersByType(page: Page, type: string): Promise<void> {
    const typeFilter = page
      .locator('select[name="type"]')
      .or(page.locator('[data-testid="type-filter"]'))
      .or(page.getByLabel(/type/i))
      .first();

    await typeFilter.selectOption(type);

    // Wait for filtered results
    await page.waitForTimeout(500);

    console.log(`✅ Filtered orders by type: ${type}`);
  }

  /**
   * Sort orders by a specific column
   */
  static async sortOrdersBy(page: Page, column: string): Promise<void> {
    // Look for sortable column header
    const columnHeader = page
      .getByRole('button', { name: new RegExp(column, 'i') })
      .or(page.locator(`th:has-text("${column}")`))
      .first();

    await columnHeader.click();

    // Wait for sort to apply
    await page.waitForTimeout(500);

    console.log(`✅ Sorted orders by: ${column}`);
  }

  /**
   * Click on an order row to view details
   */
  static async clickOrderRow(page: Page, orderNumber: string): Promise<void> {
    const orderRow = page.locator(`tr:has-text("${orderNumber}")`).first();
    await orderRow.click();

    // Wait for navigation
    await page.waitForLoadState('networkidle');

    console.log(`✅ Clicked order row: ${orderNumber}`);
  }

  /**
   * Open order actions dropdown
   */
  static async openOrderActions(page: Page, orderNumber?: string): Promise<void> {
    let actionsButton;

    if (orderNumber) {
      // Find actions button in specific order row
      const orderRow = page.locator(`tr:has-text("${orderNumber}")`).first();
      actionsButton = orderRow
        .locator('button:has-text("Actions")')
        .or(orderRow.locator('[data-testid="order-actions"]'))
        .first();
    } else {
      // Find first actions button
      actionsButton = page
        .locator('button:has-text("Actions")')
        .or(page.locator('[data-testid="order-actions"]'))
        .first();
    }

    await actionsButton.click();

    // Wait for dropdown to appear
    await page.waitForTimeout(300);

    console.log('✅ Opened order actions dropdown');
  }

  /**
   * Update order status via UI
   */
  static async updateOrderStatus(
    page: Page,
    orderId: string,
    newStatus: OrderStatus
  ): Promise<void> {
    // Navigate to order detail if not already there
    if (!page.url().includes(`/admin/orders/${orderId}`)) {
      await this.navigateToOrderDetail(page, orderId);
    }

    // Look for status dropdown or button
    const statusButton = page
      .locator('[data-testid="update-status"]')
      .or(page.getByRole('button', { name: /update status/i }))
      .or(page.locator('select[name="status"]'))
      .first();

    if ((await statusButton.locator('select').count()) > 0) {
      // It's a select dropdown
      await statusButton.locator('select').selectOption(newStatus);
    } else {
      // It's a button - open dropdown and select option
      await statusButton.click();
      await page.getByRole('option', { name: new RegExp(newStatus, 'i') }).click();
    }

    // Look for save/confirm button
    const saveButton = page.getByRole('button', { name: /save|update|confirm/i }).first();
    if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveButton.click();
    }

    // Wait for update to complete
    await page.waitForTimeout(1000);

    console.log(`✅ Updated order status to: ${newStatus}`);
  }

  /**
   * Update payment status via UI
   */
  static async updatePaymentStatus(
    page: Page,
    orderId: string,
    newStatus: PaymentStatus
  ): Promise<void> {
    // Navigate to order detail if not already there
    if (!page.url().includes(`/admin/orders/${orderId}`)) {
      await this.navigateToOrderDetail(page, orderId);
    }

    // Look for payment status button
    const paymentButton = page
      .locator('[data-testid="update-payment-status"]')
      .or(page.getByRole('button', { name: /manual payment/i }))
      .or(page.getByRole('button', { name: /update payment/i }))
      .first();

    await paymentButton.click();

    // Select new payment status in modal/dropdown
    const statusSelect = page
      .locator('select[name="paymentStatus"]')
      .or(page.locator('[data-testid="payment-status-select"]'))
      .first();

    await statusSelect.selectOption(newStatus);

    // Confirm update
    const confirmButton = page.getByRole('button', { name: /confirm|update|save/i }).first();
    await confirmButton.click();

    // Wait for update to complete
    await page.waitForTimeout(1000);

    console.log(`✅ Updated payment status to: ${newStatus}`);
  }

  /**
   * Archive a single order with reason
   */
  static async archiveOrder(page: Page, orderNumber: string, reason: string): Promise<void> {
    // Find order row and open actions
    await this.openOrderActions(page, orderNumber);

    // Click archive option
    const archiveOption = page
      .getByRole('menuitem', { name: /archive/i })
      .or(page.locator('button:has-text("Archive")'))
      .first();

    await archiveOption.click();

    // Wait for modal/dialog
    await page.waitForTimeout(500);

    // Fill in archive reason
    const reasonInput = page
      .locator('textarea[name="reason"]')
      .or(page.locator('textarea[placeholder*="reason"]'))
      .or(page.locator('input[name="reason"]'))
      .first();

    await reasonInput.fill(reason);

    // Confirm archive
    const confirmButton = page.getByRole('button', { name: /confirm|archive/i }).first();
    await confirmButton.click();

    // Wait for action to complete
    await page.waitForTimeout(1000);

    console.log(`✅ Archived order ${orderNumber} with reason: ${reason}`);
  }

  /**
   * Select multiple orders for bulk operations
   */
  static async selectOrders(page: Page, orderNumbers: string[]): Promise<void> {
    for (const orderNumber of orderNumbers) {
      const orderRow = page.locator(`tr:has-text("${orderNumber}")`).first();
      const checkbox = orderRow.locator('input[type="checkbox"]').first();

      await checkbox.check();
    }

    console.log(`✅ Selected ${orderNumbers.length} orders for bulk operation`);
  }

  /**
   * Bulk archive multiple orders
   */
  static async bulkArchiveOrders(
    page: Page,
    orderNumbers: string[],
    reason: string
  ): Promise<void> {
    // Select all specified orders
    await this.selectOrders(page, orderNumbers);

    // Find and click bulk archive button
    const bulkArchiveButton = page
      .getByRole('button', { name: /archive selected/i })
      .or(page.locator('[data-testid="bulk-archive"]'))
      .first();

    await bulkArchiveButton.click();

    // Wait for modal
    await page.waitForTimeout(500);

    // Fill in archive reason
    const reasonInput = page
      .locator('textarea[name="reason"]')
      .or(page.locator('textarea[placeholder*="reason"]'))
      .first();

    await reasonInput.fill(reason);

    // Confirm bulk archive
    const confirmButton = page.getByRole('button', { name: /confirm|archive/i }).first();
    await confirmButton.click();

    // Wait for bulk action to complete
    await page.waitForTimeout(2000);

    console.log(`✅ Bulk archived ${orderNumbers.length} orders`);
  }

  /**
   * Unarchive an order
   */
  static async unarchiveOrder(page: Page, orderNumber: string): Promise<void> {
    // Should be on archived orders page
    if (!page.url().includes('/admin/orders/archived')) {
      await this.navigateToArchivedOrders(page);
    }

    // Find order and click unarchive
    const orderRow = page.locator(`tr:has-text("${orderNumber}")`).first();
    const unarchiveButton = orderRow
      .getByRole('button', { name: /unarchive/i })
      .or(orderRow.locator('[data-testid="unarchive"]'))
      .first();

    await unarchiveButton.click();

    // Confirm if dialog appears
    const confirmButton = page.getByRole('button', { name: /confirm|unarchive/i }).first();
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.click();
    }

    // Wait for action to complete
    await page.waitForTimeout(1000);

    console.log(`✅ Unarchived order: ${orderNumber}`);
  }

  /**
   * Navigate to next page of results
   */
  static async goToNextPage(page: Page): Promise<void> {
    const nextButton = page
      .getByRole('button', { name: /next/i })
      .or(page.locator('[data-testid="pagination-next"]'))
      .first();

    await nextButton.click();
    await page.waitForLoadState('networkidle');

    console.log('✅ Navigated to next page');
  }

  /**
   * Navigate to previous page of results
   */
  static async goToPreviousPage(page: Page): Promise<void> {
    const prevButton = page
      .getByRole('button', { name: /previous/i })
      .or(page.locator('[data-testid="pagination-previous"]'))
      .first();

    await prevButton.click();
    await page.waitForLoadState('networkidle');

    console.log('✅ Navigated to previous page');
  }

  /**
   * Get order count from page
   */
  static async getOrderCount(page: Page): Promise<number> {
    const orderRows = page.locator('tbody tr');
    const count = await orderRows.count();

    console.log(`✅ Found ${count} orders on page`);
    return count;
  }

  /**
   * Check if order exists in list
   */
  static async orderExistsInList(page: Page, orderNumber: string): Promise<boolean> {
    const orderRow = page.locator(`tr:has-text("${orderNumber}")`);
    const exists = (await orderRow.count()) > 0;

    console.log(`✅ Order ${orderNumber} ${exists ? 'exists' : 'does not exist'} in list`);
    return exists;
  }

  /**
   * Get order status badge text
   */
  static async getOrderStatusBadge(page: Page, orderNumber: string): Promise<string> {
    const orderRow = page.locator(`tr:has-text("${orderNumber}")`).first();
    const statusBadge = orderRow
      .locator('[data-testid="order-status"]')
      .or(orderRow.locator('.badge'))
      .first();

    const statusText = await statusBadge.textContent();

    console.log(`✅ Order ${orderNumber} status badge: ${statusText}`);
    return statusText?.trim() || '';
  }

  /**
   * Wait for order list to update (after action)
   */
  static async waitForOrderListUpdate(page: Page): Promise<void> {
    await page.waitForTimeout(1000);
    await page.waitForLoadState('networkidle');

    console.log('✅ Waited for order list update');
  }

  /**
   * Check if admin is on admin dashboard
   */
  static async verifyAdminDashboard(page: Page): Promise<void> {
    await expect(page).toHaveURL(/\/admin/);

    // Check for admin-specific elements
    await expect(page.getByText(/admin/i).or(page.getByText(/dashboard/i))).toBeVisible({
      timeout: 5000,
    });

    console.log('✅ Verified admin dashboard access');
  }
}
