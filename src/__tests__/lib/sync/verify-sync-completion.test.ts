/**
 * Regression tests for QA F6 (post-cutover, 2026-08-31): the browser connection
 * dropped mid-request while the server-side Square sync completed successfully,
 * so the admin UI reported "Failed to fetch" for a sync that had worked.
 * verifySyncAfterNetworkError checks the sync history before declaring failure.
 */
import { verifySyncAfterNetworkError } from '@/lib/sync/verify-sync-completion';

describe('verifySyncAfterNetworkError', () => {
  const triggeredAt = new Date('2026-08-31T20:48:20Z');

  const historyResponse = (history: unknown[]) => ({
    ok: true,
    json: async () => ({ history }),
  });

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reports completed when history shows a COMPLETED sync started at/after the trigger', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      historyResponse([
        {
          syncId: 'sync_1788209308288',
          status: 'COMPLETED',
          startTime: '2026-08-31T20:48:24Z',
          summary: { syncedProducts: 12, skippedProducts: 120 },
        },
      ])
    );

    const result = await verifySyncAfterNetworkError(triggeredAt, { delayMs: 0 });

    expect(result).toEqual({
      outcome: 'completed',
      syncedProducts: 12,
      skippedProducts: 120,
    });
  });

  it('reports running when the matching sync is still RUNNING', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      historyResponse([
        {
          syncId: 'sync_x',
          status: 'RUNNING',
          startTime: '2026-08-31T20:48:25Z',
          summary: null,
        },
      ])
    );

    const result = await verifySyncAfterNetworkError(triggeredAt, { delayMs: 0 });

    expect(result).toEqual({ outcome: 'running' });
  });

  it('reports unknown when the history request itself fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await verifySyncAfterNetworkError(triggeredAt, { delayMs: 0 });

    expect(result).toEqual({ outcome: 'unknown' });
  });

  it('reports unknown on a non-ok history response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, json: async () => ({}) });

    const result = await verifySyncAfterNetworkError(triggeredAt, { delayMs: 0 });

    expect(result).toEqual({ outcome: 'unknown' });
  });

  it('ignores syncs that started before the trigger (stale history)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      historyResponse([
        {
          syncId: 'sync_old',
          status: 'COMPLETED',
          // Well before the trigger minus the clock-skew allowance
          startTime: '2026-08-31T20:40:00Z',
          summary: { syncedProducts: 5, skippedProducts: 0 },
        },
      ])
    );

    const result = await verifySyncAfterNetworkError(triggeredAt, { delayMs: 0 });

    expect(result).toEqual({ outcome: 'unknown' });
  });

  it('treats a FAILED matching sync as unknown so the caller still surfaces the error', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      historyResponse([
        {
          syncId: 'sync_failed',
          status: 'FAILED',
          startTime: '2026-08-31T20:48:24Z',
          summary: null,
        },
      ])
    );

    const result = await verifySyncAfterNetworkError(triggeredAt, { delayMs: 0 });

    expect(result).toEqual({ outcome: 'unknown' });
  });
});
