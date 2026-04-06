import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db-unified';
import { UserSyncManager } from '@/lib/square/user-sync-manager';
import { verifyAdminAccess } from '@/lib/auth/admin-guard';
import { logger } from '@/utils/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ syncId: string }> }
) {
  // Get syncId first for error logging
  const { syncId } = await params;

  try {
    // 1. Authenticate user and check admin access
    const adminCheck = await verifyAdminAccess();
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.statusCode });
    }

    const user = adminCheck.user!;

    // Fetch profile for name/email used downstream (guaranteed to exist since admin check passed)
    const profile = await withRetry(
      () =>
        prisma.profile.findUnique({
          where: { id: user.id },
          select: { role: true, name: true, email: true },
        }),
      3,
      'fetch admin profile'
    );

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // 3. Validate syncId parameter
    if (!syncId) {
      return NextResponse.json(
        {
          error: 'Missing sync ID',
        },
        { status: 400 }
      );
    }

    // 4. Get sync status from database
    const syncLog = await withRetry(
      () =>
        prisma.userSyncLog.findUnique({
          where: {
            syncId,
            userId: user.id, // Ensure user can only see their own syncs
          },
          select: {
            id: true,
            syncId: true,
            status: true,
            startTime: true,
            endTime: true,
            progress: true,
            message: true,
            currentStep: true,
            results: true,
            errors: true,
            options: true,
            startedBy: true,
          },
        }),
      3,
      'get sync status'
    );

    if (!syncLog) {
      return NextResponse.json(
        {
          error: 'Sync not found',
          message: 'The sync ID was not found or you do not have permission to view it.',
        },
        { status: 404 }
      );
    }

    // 4.1. Check if sync is stale (older than 45 minutes and still running)
    const STALE_SYNC_THRESHOLD = 45 * 60 * 1000; // 45 minutes
    const syncAge = new Date().getTime() - new Date(syncLog.startTime).getTime();
    const isStale = syncAge > STALE_SYNC_THRESHOLD;

    if (isStale && ['RUNNING', 'PENDING'].includes(syncLog.status)) {
      // Mark stale sync as failed to prevent infinite polling
      await prisma.userSyncLog.update({
        where: { syncId },
        data: {
          status: 'FAILED',
          endTime: new Date(),
          message: 'Sync timed out - exceeded maximum duration',
          progress: syncLog.progress,
        },
      });

      logger.warn(
        `Marked stale sync ${syncId} as failed (age: ${Math.floor(syncAge / 60000)} minutes)`
      );

      // Return the updated status
      return NextResponse.json({
        syncId: syncLog.syncId,
        status: 'FAILED',
        progress: syncLog.progress,
        message: 'Sync timed out - exceeded maximum duration',
        currentStep: 'timeout',
        startTime: syncLog.startTime,
        endTime: new Date(),
        duration: Math.round(syncAge / 1000),
        startedBy: syncLog.startedBy,
        errors: ['Sync exceeded maximum allowed duration and was automatically terminated'],
        options: syncLog.options,
      });
    }

    // 5. Use UserSyncManager to get detailed progress if running
    let detailedProgress = null;
    if (syncLog.status === 'RUNNING' || syncLog.status === 'PENDING') {
      try {
        const userSyncManager = new UserSyncManager(
          user.id,
          profile.email || user.email || 'Unknown',
          profile.name || 'Admin User'
        );
        detailedProgress = await userSyncManager.getProgress(syncId);
      } catch (error) {
        logger.warn('Failed to get detailed progress:', error);
      }
    }

    // 6. Calculate duration
    const duration = syncLog.endTime
      ? Math.round((syncLog.endTime.getTime() - syncLog.startTime.getTime()) / 1000)
      : Math.round((new Date().getTime() - syncLog.startTime.getTime()) / 1000);

    // 7. Format response
    const response = {
      syncId: syncLog.syncId,
      status: syncLog.status,
      progress: detailedProgress?.percentage || syncLog.progress,
      message: detailedProgress?.message || syncLog.message,
      currentStep: detailedProgress?.currentStep || syncLog.currentStep,
      startTime: syncLog.startTime,
      endTime: syncLog.endTime,
      duration: duration,
      startedBy: syncLog.startedBy,

      // Detailed progress info (if available)
      ...(detailedProgress && {
        processed: detailedProgress.processed,
        total: detailedProgress.total,
        currentProduct: detailedProgress.currentProduct,
      }),

      // Results (if completed)
      ...(syncLog.results && {
        results: syncLog.results,
      }),

      // Errors (if failed)
      ...(syncLog.errors && {
        errors: syncLog.errors,
      }),

      // Original options
      options: syncLog.options,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error(`Error getting sync status for ${syncId}:`, error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to get sync status. Please try again.',
      },
      { status: 500 }
    );
  }
}

// Also support HEAD requests for lightweight status checks
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ syncId: string }> }
) {
  const { syncId } = await params;

  try {
    const adminCheck = await verifyAdminAccess();
    if (!adminCheck.authorized) {
      return new Response(null, { status: adminCheck.statusCode });
    }

    const syncExists = await prisma.userSyncLog.findUnique({
      where: {
        syncId: syncId,
        userId: adminCheck.user!.id,
      },
      select: { id: true },
    });

    return new Response(null, {
      status: syncExists ? 200 : 404,
    });
  } catch (error) {
    return new Response(null, { status: 500 });
  }
}
