import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { UserSyncManager } from '@/lib/square/user-sync-manager';
import { logger } from '@/utils/logger';
import { z } from 'zod';

// Validation schema for cancel request
const cancelRequestSchema = z.object({
  syncId: z.string().uuid('Invalid sync ID format'),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check admin access
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true, name: true, email: true },
    });

    if (!profile || profile.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // 3. Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const validationResult = cancelRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { syncId, reason } = validationResult.data;

    // 4. Check if sync exists and belongs to user
    const syncLog = await prisma.userSyncLog.findUnique({
      where: {
        syncId,
        userId: user.id,
      },
      select: {
        id: true,
        syncId: true,
        status: true,
        startTime: true,
        startedBy: true,
      },
    });

    if (!syncLog) {
      return NextResponse.json(
        {
          error: 'Sync not found',
          message: 'The sync ID was not found or you do not have permission to cancel it.',
        },
        { status: 404 }
      );
    }

    // 5. Check if sync can be cancelled
    if (!['PENDING', 'RUNNING'].includes(syncLog.status)) {
      const statusMessages = {
        COMPLETED: 'Sync has already completed successfully.',
        FAILED: 'Sync has already failed.',
        CANCELLED: 'Sync has already been cancelled.',
      };

      return NextResponse.json(
        {
          error: 'Cannot cancel sync',
          message:
            statusMessages[syncLog.status as keyof typeof statusMessages] ||
            'Sync cannot be cancelled in its current state.',
          currentStatus: syncLog.status,
        },
        { status: 409 }
      );
    }

    // 6. Cancel the sync
    const userSyncManager = new UserSyncManager(
      user.id,
      profile.email || user.email || 'Unknown',
      profile.name || 'Admin User'
    );

    await userSyncManager.cancelSync(syncId);

    // 7. Log the cancellation
    logger.info(`Sync ${syncId} cancelled by ${profile.email}`, {
      reason,
      originalStartTime: syncLog.startTime,
    });

    // 8. Get updated sync status
    const updatedSync = await prisma.userSyncLog.findUnique({
      where: { syncId },
      select: {
        status: true,
        endTime: true,
        message: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Sync cancelled successfully',
      syncId,
      status: updatedSync?.status || 'CANCELLED',
      cancelledAt: updatedSync?.endTime || new Date(),
      reason: reason || 'Cancelled by user request',
    });
  } catch (error) {
    logger.error('Error cancelling sync:', error);

    // Check if it's a specific cancellation error
    if (error instanceof Error && error.message.includes('Failed to cancel sync')) {
      return NextResponse.json(
        {
          error: 'Cancellation failed',
          message: 'The sync could not be cancelled. It may have already completed or failed.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to cancel sync. Please try again.',
      },
      { status: 500 }
    );
  }
}

// Support DELETE method as well for RESTful API design
export async function DELETE(request: NextRequest) {
  // Get syncId from query parameters for DELETE method
  const { searchParams } = new URL(request.url);
  const syncId = searchParams.get('syncId');

  if (!syncId) {
    return NextResponse.json(
      {
        error: 'Missing sync ID',
        message: 'Please provide a syncId query parameter.',
      },
      { status: 400 }
    );
  }

  // Create a new request body with the syncId and forward to POST handler
  const newRequest = new NextRequest(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({ syncId }),
  });

  return POST(newRequest);
}
