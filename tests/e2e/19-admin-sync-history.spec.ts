/**
 * E2E: Admin Square Sync History
 *
 * Verifies the cross-admin history view:
 *  - Admins can reach /admin/square-sync
 *  - The Synchronization History section renders
 *  - The history API returns rows whose payload includes a `startedBy` field
 *    (so the UI can label who triggered each sync)
 *  - Customers and unauthenticated users are denied
 *
 * The seed dataset is environment-specific, so tests assert on shape rather
 * than concrete sync counts.
 */

import { test, expect } from '@playwright/test';
import { AuthHelpers } from './utils/auth-helpers';

test.describe('Admin Square Sync — history view', () => {
  test('admin can open the sync page and history section is rendered', async ({ page }) => {
    await AuthHelpers.loginAsAdmin(page);
    await page.goto('/admin/square-sync');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/admin\/square-sync/);
    await expect(
      page.getByRole('heading', { name: /Square Synchronization/i })
    ).toBeVisible();
    await expect(page.getByText(/Synchronization History/i)).toBeVisible();
  });

  test('history API returns startedBy field for admin requests', async ({ page }) => {
    await AuthHelpers.loginAsAdmin(page);

    const response = await page.request.get(
      '/api/admin/sync/history?days=30&limit=10'
    );
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body.history)).toBe(true);

    // If the env has any sync rows, every row should expose startedBy so the
    // UI can render "Started by: …". Empty environments are acceptable.
    for (const row of body.history) {
      expect(row).toHaveProperty('startedBy');
    }
  });

  test('customer cannot reach the admin sync page', async ({ page }) => {
    await AuthHelpers.loginAsCustomer(page);
    await page.goto('/admin/square-sync');
    await expect(page).not.toHaveURL(/\/admin\/square-sync$/);
  });

  test('unauthenticated user is redirected to sign-in', async ({ page }) => {
    await AuthHelpers.ensureLoggedOut(page);
    await page.goto('/admin/square-sync');
    await expect(page).toHaveURL(/\/(auth\/)?sign-in/);
  });
});
