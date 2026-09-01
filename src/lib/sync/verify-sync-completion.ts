/**
 * Post-cutover QA F6 (2026-08-31): the unified-sync POST is synchronous and can
 * run ~35s+. A dropped browser connection surfaces as "Failed to fetch" even
 * when the server-side sync completes successfully, which misleads admins into
 * re-triggering full force-update syncs. Before reporting failure, consult the
 * sync history to see what actually happened server-side.
 */

export type SyncVerificationResult =
  | { outcome: 'completed'; syncedProducts: number; skippedProducts: number }
  | { outcome: 'running' }
  | { outcome: 'unknown' };

interface SyncHistoryEntry {
  syncId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  startTime: string;
  summary?: { syncedProducts?: number; skippedProducts?: number } | null;
}

/** Allowance for client/server clock skew when matching history to the trigger. */
const CLOCK_SKEW_MS = 60_000;

/** Give the server a moment to persist the sync log before checking. */
const DEFAULT_DELAY_MS = 4_000;

export async function verifySyncAfterNetworkError(
  triggeredAt: Date,
  options: { delayMs?: number } = {}
): Promise<SyncVerificationResult> {
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS;
  if (delayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  try {
    const response = await fetch('/api/admin/sync/history?limit=5&days=1');
    if (!response.ok) {
      return { outcome: 'unknown' };
    }

    const data = await response.json();
    const history: SyncHistoryEntry[] = Array.isArray(data?.history) ? data.history : [];

    const match = history.find(
      sync => new Date(sync.startTime).getTime() >= triggeredAt.getTime() - CLOCK_SKEW_MS
    );

    if (!match) {
      return { outcome: 'unknown' };
    }

    if (match.status === 'COMPLETED') {
      return {
        outcome: 'completed',
        syncedProducts: match.summary?.syncedProducts ?? 0,
        skippedProducts: match.summary?.skippedProducts ?? 0,
      };
    }

    if (match.status === 'RUNNING' || match.status === 'PENDING') {
      return { outcome: 'running' };
    }

    return { outcome: 'unknown' };
  } catch {
    return { outcome: 'unknown' };
  }
}
