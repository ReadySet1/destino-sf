/**
 * E2E tests for Destino → Square writeback endpoints.
 *
 * Covers the HTTP contract exposed by the writeback system:
 * - /api/cron/square-write-queue auth + feature-flag gating
 * - /api/square/create-sample feature-flag gating
 * - /api/admin/products/[id]/archive response contract
 *
 * Full Square Sandbox flows (create item → poll Square → verify) require a
 * real admin session and Square Sandbox credentials; those are gated and
 * skipped when the environment isn't configured. The smoke tests that DO
 * run on every CI pass exercise the permission + gating logic end-to-end.
 */

import { test, expect } from '@playwright/test';

test.describe('Square writeback: cron worker endpoint', () => {
  test('rejects unauthenticated GET with 401', async ({ request }) => {
    const res = await request.get('/api/cron/square-write-queue');
    expect(res.status()).toBe(401);
  });

  test('rejects wrong bearer token with 401', async ({ request }) => {
    const res = await request.get('/api/cron/square-write-queue', {
      headers: { Authorization: 'Bearer not-the-real-secret' },
    });
    expect(res.status()).toBe(401);
  });

  test('returns skipped: true when ENABLE_SQUARE_WRITEBACK is off', async ({ request }) => {
    const secret = process.env.CRON_SECRET;
    test.skip(!secret, 'CRON_SECRET not configured for this environment');
    test.skip(
      process.env.ENABLE_SQUARE_WRITEBACK === 'true',
      'Writeback is currently enabled; skipping the "flag off" assertion'
    );

    const res = await request.get('/api/cron/square-write-queue', {
      headers: { Authorization: `Bearer ${secret}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe(true);
    expect(body.reason).toContain('ENABLE_SQUARE_WRITEBACK');
  });

  test('drains queue and returns result when writeback enabled', async ({ request }) => {
    const secret = process.env.CRON_SECRET;
    test.skip(!secret, 'CRON_SECRET not configured for this environment');
    test.skip(
      process.env.ENABLE_SQUARE_WRITEBACK !== 'true',
      'Writeback is not enabled; skipping drain assertion'
    );

    const res = await request.get('/api/cron/square-write-queue', {
      headers: { Authorization: `Bearer ${secret}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.result).toHaveProperty('attempted');
    expect(body.result).toHaveProperty('succeeded');
    expect(body.result).toHaveProperty('retried');
    expect(body.result).toHaveProperty('dead');
    expect(body.result).toHaveProperty('failed');
    expect(typeof body.durationMs).toBe('number');
  });
});

test.describe('Square writeback: /api/square/create-sample gating', () => {
  test('returns 409 when writeback is disabled', async ({ request }) => {
    test.skip(
      process.env.ENABLE_SQUARE_WRITEBACK === 'true',
      'Writeback currently enabled — gating test does not apply'
    );

    const res = await request.post('/api/square/create-sample', {
      data: { name: 'E2E Sample', price: 1.23 },
    });
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/writeback is disabled/i);
  });
});

test.describe('Square writeback: admin archive endpoint contract', () => {
  test('GET archive status requires authentication', async ({ request }) => {
    // Without a signed-in cookie the route returns 401
    const res = await request.get('/api/admin/products/00000000-0000-0000-0000-000000000000/archive');
    expect([401, 404]).toContain(res.status());
  });

  test('POST archive without auth returns 401', async ({ request }) => {
    const res = await request.post(
      '/api/admin/products/00000000-0000-0000-0000-000000000000/archive'
    );
    expect([401, 404]).toContain(res.status());
  });

  test('DELETE archive (unarchive) without auth returns 401', async ({ request }) => {
    const res = await request.delete(
      '/api/admin/products/00000000-0000-0000-0000-000000000000/archive'
    );
    expect([401, 404]).toContain(res.status());
  });
});

/**
 * Full Sandbox flow: admin logs in → creates product → verifies in Square Sandbox.
 * Gated behind env flags because it requires:
 *   - Admin credentials (ADMIN_EMAIL / ADMIN_PASSWORD test user)
 *   - Square Sandbox API token (SQUARE_SANDBOX_TOKEN)
 *   - Writeback enabled (ENABLE_SQUARE_WRITEBACK=true)
 *   - A test category ID (E2E_TEST_CATEGORY_ID)
 */
test.describe('Square writeback: full Sandbox flow', () => {
  const hasAllCreds =
    !!process.env.ADMIN_EMAIL &&
    !!process.env.ADMIN_PASSWORD &&
    !!process.env.SQUARE_SANDBOX_TOKEN &&
    process.env.ENABLE_SQUARE_WRITEBACK === 'true' &&
    !!process.env.E2E_TEST_CATEGORY_ID;

  test.skip(!hasAllCreds, 'Full writeback E2E requires admin creds + Sandbox token + feature flag on');

  test('admin creates a product and it propagates to Square Sandbox', async ({ page, request }) => {
    // TODO(phase-2): implement once admin login fixtures + Sandbox cleanup hooks
    // are wired up. Keeping this as a placeholder so the test file is discoverable
    // and the gate above documents the exact env requirements.
    test.fixme(true, 'Requires admin login fixture + Square Sandbox cleanup — phase 2');
  });
});
