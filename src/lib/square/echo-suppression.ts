/**
 * Echo suppression for Square catalog webhooks.
 *
 * After every successful Destino → Square write we record the returned
 * `(squareId, version)`. When Square then fires `catalog.version.updated`
 * back at us (as it does for every mutation, including our own), the
 * webhook handler checks this record and skips the pull for items we
 * just wrote — preventing a write/pull loop that would overwrite the
 * admin's in-flight edits.
 */

import { prisma } from '@/lib/db-unified';
import { logger } from '@/utils/logger';

const ECHO_TTL_MS = 5 * 60 * 1000;

export async function recordSquareWrite(squareId: string, version: bigint | number): Promise<void> {
  const versionBig = typeof version === 'bigint' ? version : BigInt(version);
  try {
    await prisma.recentSquareWrite.upsert({
      where: { squareId_version: { squareId, version: versionBig } },
      create: { squareId, version: versionBig },
      update: { writtenAt: new Date() },
    });
  } catch (error) {
    logger.warn('[echo-suppression] failed to record write', { squareId, error });
  }
}

export async function wasRecentlyWrittenByUs(
  squareId: string,
  version: bigint | number
): Promise<boolean> {
  const versionBig = typeof version === 'bigint' ? version : BigInt(version);
  const cutoff = new Date(Date.now() - ECHO_TTL_MS);

  const row = await prisma.recentSquareWrite.findUnique({
    where: { squareId_version: { squareId, version: versionBig } },
    select: { writtenAt: true },
  });

  if (!row) return false;
  if (row.writtenAt < cutoff) {
    // Stale — garbage-collect and treat as not-ours.
    await prisma.recentSquareWrite
      .delete({ where: { squareId_version: { squareId, version: versionBig } } })
      .catch(() => void 0);
    return false;
  }
  return true;
}

/**
 * Bulk GC of expired records. Called lazily; not critical if it fails.
 */
export async function pruneExpiredEchoRecords(): Promise<number> {
  const cutoff = new Date(Date.now() - ECHO_TTL_MS);
  const result = await prisma.recentSquareWrite.deleteMany({ where: { writtenAt: { lt: cutoff } } });
  return result.count;
}
