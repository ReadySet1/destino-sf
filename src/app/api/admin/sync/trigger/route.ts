import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma, withRetry } from '@/lib/db-unified';
import { UserSyncManager, type UserSyncOptions } from '@/lib/square/user-sync-manager';
import { MockSyncManager } from '@/lib/square/mock-sync-manager';
import { logger } from '@/utils/logger';
import { z } from 'zod';

// Validation schema for sync options
const syncOptionsSchema = z.object({
  includeImages: z.boolean().default(true),
  batchSize: z.enum(['small', 'medium', 'large']).default('medium'),
  notifyOnComplete: z.boolean().default(true),
  autoRetry: z.boolean().default(true),
  // Testing options
  mockMode: z.boolean().default(false),
  simulateError: z.boolean().default(false),
  customDuration: z.number().optional(),
});

// Rate limiting: max 3 syncs per hour per user
const RATE_LIMIT_SYNCS_PER_HOUR = 3;
const COOLDOWN_MINUTES = 10;

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn('Unauthorized sync trigger attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check admin access
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true, name: true, email: true },
    });

    if (!profile || profile.role !== 'ADMIN') {
      logger.warn(`Non-admin user attempted sync: ${user.email}`);
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // 3. Parse and validate sync options
    const body = await request.json().catch(() => ({}));
    const validationResult = syncOptionsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid sync options',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const options = validationResult.data;

    // 4. Check rate limiting
    const rateLimitCheck = await checkUserRateLimit(user.id);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `You can only trigger ${RATE_LIMIT_SYNCS_PER_HOUR} syncs per hour. Next available: ${rateLimitCheck.nextAllowed}`,
          nextAllowed: rateLimitCheck.nextAllowed,
        },
        { status: 429 }
      );
    }

    // 5. Check if sync already running
    const existingSync = await prisma.userSyncLog.findFirst({
      where: {
        userId: user.id,
        status: {
          in: ['PENDING', 'RUNNING'],
        },
      },
      select: { syncId: true, startTime: true },
    });

    if (existingSync) {
      return NextResponse.json(
        {
          error: 'Sync already running',
          message: 'A sync is already in progress. Please wait for it to complete.',
          existingSyncId: existingSync.syncId,
        },
        { status: 409 }
      );
    }

    // 6. Start sync (real or mock based on options)
    let result;

    if (options.mockMode) {
      // Use MockSyncManager for testing
      logger.info('🧪 Using Mock Sync Manager for testing');
      const mockSyncManager = new MockSyncManager(
        user.id,
        profile.email || user.email || 'Unknown',
        profile.name || 'Admin User'
      );

      result = await mockSyncManager.startMockSync({
        includeImages: options.includeImages,
        batchSize: options.batchSize,
        notifyOnComplete: options.notifyOnComplete,
        autoRetry: options.autoRetry,
        simulateError: options.simulateError,
        customDuration: options.customDuration,
      });

      // Format result to match UserSyncManager response
      result = {
        syncId: result.syncId,
        status: result.status,
        message: 'Mock sync started successfully',
        estimatedDuration: options.customDuration || 25,
      };
    } else {
      // Use real UserSyncManager
      const userSyncManager = new UserSyncManager(
        user.id,
        profile.email || user.email || 'Unknown',
        profile.name || 'Admin User'
      );

      result = await userSyncManager.startUserSync(options);

      if (result.status === 'error') {
        return NextResponse.json(
          {
            error: 'Failed to start sync',
            message: result.message,
          },
          { status: 500 }
        );
      }
    }

    logger.info(`Sync ${result.syncId} started by ${profile.email}`, {
      options,
      mockMode: options.mockMode,
    });

    return NextResponse.json({
      success: true,
      syncId: result.syncId,
      message: result.message,
      estimatedDuration: result.estimatedDuration,
      options,
    });
  } catch (error) {
    logger.error('Error in sync trigger endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to start sync. Please try again.',
      },
      { status: 500 }
    );
  }
}

/**
 * Check if user has exceeded rate limits
 */
async function checkUserRateLimit(userId: string): Promise<{
  allowed: boolean;
  nextAllowed?: string;
}> {
  try {
    // Count syncs in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentSyncs = await prisma.userSyncLog.count({
      where: {
        userId,
        startTime: {
          gte: oneHourAgo,
        },
      },
    });

    if (recentSyncs < RATE_LIMIT_SYNCS_PER_HOUR) {
      return { allowed: true };
    }

    // Get the oldest sync in the current window
    const oldestRecentSync = await prisma.userSyncLog.findFirst({
      where: {
        userId,
        startTime: {
          gte: oneHourAgo,
        },
      },
      orderBy: { startTime: 'asc' },
      select: { startTime: true },
    });

    if (oldestRecentSync) {
      const nextAllowed = new Date(oldestRecentSync.startTime.getTime() + 60 * 60 * 1000);

      return {
        allowed: false,
        nextAllowed: nextAllowed.toISOString(),
      };
    }

    return { allowed: false };
  } catch (error) {
    logger.error('Error checking rate limit:', error);
    // Allow sync if rate limit check fails
    return { allowed: true };
  }
}
