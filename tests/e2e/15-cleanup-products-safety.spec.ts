import { test, expect } from '@playwright/test';

/**
 * E2E tests for the cleanup-products debug endpoint safety features.
 *
 * These tests verify that:
 * 1. The delete action (action=2) is permanently disabled
 * 2. The list action (action=3) works correctly
 * 3. The clear Square IDs action (action=1) is available
 */
test.describe('Cleanup Products Safety Features', () => {
  const baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

  test.describe('Delete Action Disabled', () => {
    test('should reject action=2 with clear error message', async ({ request }) => {
      const response = await request.get(
        `${baseUrl}/api/debug/cleanup-products?action=2`
      );

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Delete action disabled');
      expect(data.message).toContain('permanently removed for safety');
      expect(data.availableActions).toBeDefined();
      expect(data.availableActions['1']).toContain('Clear Square IDs');
      expect(data.availableActions['3']).toContain('List invalid products');
    });

    test('should reject action=2 even with confirmation parameter', async ({
      request,
    }) => {
      const response = await request.get(
        `${baseUrl}/api/debug/cleanup-products?action=2&confirm=DELETE_PRODUCTS_PERMANENTLY`
      );

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Delete action disabled');
    });

    test('should reject action=2 with any variation of confirmation', async ({
      request,
    }) => {
      const confirmations = [
        'yes',
        'true',
        '1',
        'DELETE',
        'confirm',
        'DELETE_ALL',
      ];

      for (const confirm of confirmations) {
        const response = await request.get(
          `${baseUrl}/api/debug/cleanup-products?action=2&confirm=${confirm}`
        );

        expect(response.status()).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Delete action disabled');
      }
    });
  });

  test.describe('List Action (Default)', () => {
    test('should default to list action when no action specified', async ({
      request,
    }) => {
      const response = await request.get(`${baseUrl}/api/debug/cleanup-products`);

      // Should succeed (200) or return Square config error (500) - either is acceptable
      // The important thing is it doesn't try to delete anything
      expect([200, 500]).toContain(response.status());

      const data = await response.json();

      if (response.status() === 200) {
        // If Square is configured, verify response structure
        expect(data.action === '3' || data.invalidProductCount === 0).toBeTruthy();
      } else {
        // If Square is not configured, that's also acceptable
        expect(data.error).toBeDefined();
      }
    });

    test('should return valid response structure for action=3', async ({
      request,
    }) => {
      const response = await request.get(
        `${baseUrl}/api/debug/cleanup-products?action=3`
      );

      if (response.status() === 200) {
        const data = await response.json();

        // Check for either "clean" response or "invalid products" response
        if (data.message) {
          expect(data.message).toContain('No invalid products found');
          expect(data.invalidProductCount).toBe(0);
        } else {
          expect(data.action).toBe('3');
          expect(typeof data.invalidProductCount).toBe('number');
          expect(typeof data.totalProductCount).toBe('number');
          expect(data.changes).toEqual([]); // action=3 should never make changes
        }
      }
    });
  });

  test.describe('Clear Action', () => {
    test('should accept action=1 without error', async ({ request }) => {
      const response = await request.get(
        `${baseUrl}/api/debug/cleanup-products?action=1`
      );

      // Should succeed (200) or return Square config error (500)
      // Should NOT return 400 (that would mean action=1 is blocked)
      expect(response.status()).not.toBe(400);

      if (response.status() === 200) {
        const data = await response.json();
        expect(data.action === '1' || data.invalidProductCount === 0).toBeTruthy();
      }
    });
  });

  test.describe('Invalid Actions', () => {
    test('should handle unknown action gracefully', async ({ request }) => {
      const response = await request.get(
        `${baseUrl}/api/debug/cleanup-products?action=99`
      );

      // Unknown actions should fall through to default (list)
      expect([200, 500]).toContain(response.status());

      if (response.status() === 200) {
        const data = await response.json();
        // Should not have made any changes
        expect(data.changes === undefined || data.changes.length === 0).toBeTruthy();
      }
    });

    test('should handle non-numeric action gracefully', async ({ request }) => {
      const response = await request.get(
        `${baseUrl}/api/debug/cleanup-products?action=delete`
      );

      // Should fall through to default behavior
      expect([200, 500]).toContain(response.status());
    });
  });

  test.describe('Response Structure', () => {
    test('should include helpful information in error responses', async ({
      request,
    }) => {
      const response = await request.get(
        `${baseUrl}/api/debug/cleanup-products?action=2`
      );

      const data = await response.json();

      // Error response should guide users to correct actions
      expect(data.error).toBeDefined();
      expect(data.message).toBeDefined();
      expect(data.availableActions).toBeDefined();

      // Available actions should not include delete
      expect(data.availableActions['2']).toBeUndefined();
    });
  });
});
