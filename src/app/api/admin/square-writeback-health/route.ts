/**
 * Admin health endpoint for the Destino → Square writeback queue.
 *
 * Surfaces metrics for the admin dashboard:
 *   - Job counts by status (PENDING / SUCCEEDED / FAILED / DEAD)
 *   - Product CONFLICT count
 *   - Last successful write timestamp + queue lag
 *   - Recent failures (last 5) with error messages
 *   - Active echo-suppression record count
 *   - Feature-flag status
 *
 * GET /api/admin/square-writeback-health
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db-unified';
import { verifyAdminAccess } from '@/lib/auth/admin-guard';
import { isWritebackEnabled } from '@/lib/square/write-queue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ECHO_TTL_MS = 5 * 60 * 1000;

export async function GET(): Promise<NextResponse> {
  const adminCheck = await verifyAdminAccess();
  if (!adminCheck.authorized) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.statusCode ?? 401 }
    );
  }

  try {
    const echoCutoff = new Date(Date.now() - ECHO_TTL_MS);

    const [
      jobsByStatus,
      conflictCount,
      lastSucceededJob,
      oldestPendingJob,
      recentFailures,
      activeEchoCount,
    ] = await Promise.all([
      prisma.squareWriteJob.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.product.count({ where: { syncStatus: 'CONFLICT' } }),
      prisma.squareWriteJob.findFirst({
        where: { status: 'SUCCEEDED' },
        orderBy: { succeededAt: 'desc' },
        select: { succeededAt: true, operation: true, productId: true },
      }),
      prisma.squareWriteJob.findFirst({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true, attempts: true, operation: true, productId: true },
      }),
      prisma.squareWriteJob.findMany({
        where: { status: { in: ['FAILED', 'DEAD'] } },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          status: true,
          operation: true,
          productId: true,
          attempts: true,
          lastError: true,
          updatedAt: true,
        },
      }),
      prisma.recentSquareWrite.count({ where: { writtenAt: { gte: echoCutoff } } }),
    ]);

    const counts: Record<string, number> = {
      PENDING: 0,
      SUCCEEDED: 0,
      FAILED: 0,
      DEAD: 0,
    };
    for (const row of jobsByStatus) {
      counts[row.status] = row._count._all;
    }

    const oldestPendingAgeMs = oldestPendingJob
      ? Date.now() - oldestPendingJob.createdAt.getTime()
      : null;

    const lastSucceededAgeMs = lastSucceededJob?.succeededAt
      ? Date.now() - lastSucceededJob.succeededAt.getTime()
      : null;

    // Surface a simple healthy/degraded/unhealthy signal so the admin UI
    // can render a single status pill without re-implementing the math.
    const health =
      counts.DEAD > 0 || conflictCount > 0
        ? 'unhealthy'
        : counts.FAILED > 0 || (oldestPendingAgeMs !== null && oldestPendingAgeMs > 5 * 60_000)
          ? 'degraded'
          : 'healthy';

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      featureEnabled: isWritebackEnabled(),
      health,
      jobs: {
        counts,
        oldestPending: oldestPendingJob
          ? {
              productId: oldestPendingJob.productId,
              operation: oldestPendingJob.operation,
              attempts: oldestPendingJob.attempts,
              createdAt: oldestPendingJob.createdAt.toISOString(),
              ageMs: oldestPendingAgeMs,
            }
          : null,
        lastSucceeded: lastSucceededJob?.succeededAt
          ? {
              productId: lastSucceededJob.productId,
              operation: lastSucceededJob.operation,
              succeededAt: lastSucceededJob.succeededAt.toISOString(),
              ageMs: lastSucceededAgeMs,
            }
          : null,
        recentFailures: recentFailures.map(f => ({
          id: f.id,
          status: f.status,
          operation: f.operation,
          productId: f.productId,
          attempts: f.attempts,
          lastError: f.lastError,
          updatedAt: f.updatedAt.toISOString(),
        })),
      },
      products: {
        conflictCount,
      },
      echoSuppression: {
        activeRecords: activeEchoCount,
        ttlMs: ECHO_TTL_MS,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to compute writeback health',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
