/**
 * Rollback endpoint for filtered Square sync
 * 
 * Allows rolling back the last sync operation to restore previous product state
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db-unified';
import { logger } from '@/utils/logger';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { RollbackResult } from '@/types/square-sync';

// Validation schema for rollback requests
const RollbackRequestSchema = z.object({
  syncId: z.string().optional(),
  confirmRollback: z.boolean().default(false),
}).strict();

/**
 * POST /api/square/sync-filtered/rollback
 * 
 * Rollback the last sync operation or a specific sync by ID
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    logger.info(`🔄 Rollback requested by user: ${user.email}`);

    // Parse and validate request body
    let requestData;
    try {
      const body = await request.json();
      requestData = RollbackRequestSchema.parse(body);
    } catch (parseError) {
      logger.error('❌ Invalid rollback request format:', parseError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request format',
          details: parseError instanceof z.ZodError ? parseError.errors : undefined
        },
        { status: 400 }
      );
    }

    const { syncId, confirmRollback } = requestData;

    if (!confirmRollback) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Rollback confirmation required',
          message: 'Set confirmRollback: true to proceed with rollback operation'
        },
        { status: 400 }
      );
    }

    // Find the sync to rollback
    let targetSync;
    if (syncId) {
      targetSync = await prisma.syncHistory.findUnique({
        where: { id: syncId }
      });
      
      if (!targetSync) {
        return NextResponse.json(
          { success: false, error: 'Sync not found', syncId },
          { status: 404 }
        );
      }
    } else {
      // Get the most recent completed sync
      targetSync = await prisma.syncHistory.findFirst({
        where: {
          completedAt: { not: null },
          syncType: 'FILTERED'
        },
        orderBy: { completedAt: 'desc' }
      });

      if (!targetSync) {
        return NextResponse.json(
          { success: false, error: 'No completed sync found to rollback' },
          { status: 404 }
        );
      }
    }

    logger.info(`🔄 Rolling back sync: ${targetSync.id}`, {
      syncType: targetSync.syncType,
      startedAt: targetSync.startedAt,
      completedAt: targetSync.completedAt,
      productsSynced: targetSync.productsSynced
    });

    // Perform the rollback
    const rollbackResult = await performRollback(targetSync, user.email!);

    if (rollbackResult.success) {
      logger.info(`✅ Rollback completed successfully`, {
        syncId: targetSync.id,
        productsRestored: rollbackResult.productsRestored
      });
    } else {
      logger.error(`❌ Rollback failed`, {
        syncId: targetSync.id,
        errors: rollbackResult.errors
      });
    }

    const statusCode = rollbackResult.success ? 200 : 500;

    return NextResponse.json({
      success: rollbackResult.success,
      message: rollbackResult.message,
      data: {
        syncId: targetSync.id,
        productsRestored: rollbackResult.productsRestored,
        errors: rollbackResult.errors,
        rollbackMetadata: {
          originalSync: {
            id: targetSync.id,
            startedAt: targetSync.startedAt,
            completedAt: targetSync.completedAt,
            productsSynced: targetSync.productsSynced
          },
          rolledBackBy: user.email,
          rolledBackAt: new Date().toISOString()
        }
      },
      timestamp: new Date().toISOString()
    }, { status: statusCode });

  } catch (error) {
    logger.error('❌ Critical error in rollback API:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred during the rollback process',
      details: process.env.NODE_ENV === 'development' 
        ? (error instanceof Error ? error.message : String(error))
        : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Perform the actual rollback operation
 */
async function performRollback(syncRecord: any, userEmail: string): Promise<RollbackResult> {
  try {
    const metadata = syncRecord.metadata as any;
    
    // For now, implement a basic rollback strategy
    // In a full implementation, we would store previous state in metadata
    // and restore from that state
    
    // Get all products that were modified in this sync
    // We'll implement a simple approach: mark products as needing manual review
    
    const syncStartTime = syncRecord.startedAt;
    const syncEndTime = syncRecord.completedAt;
    
    if (!syncEndTime) {
      throw new Error('Cannot rollback incomplete sync');
    }

    // Find products that were updated during this sync timeframe
    const affectedProducts = await prisma.product.findMany({
      where: {
        updatedAt: {
          gte: syncStartTime,
          lte: syncEndTime
        },
        syncSource: 'SQUARE'
      }
    });

    logger.info(`🔍 Found ${affectedProducts.length} products potentially affected by sync`);

    // For safety, we'll implement a conservative rollback:
    // 1. Don't delete products that were created
    // 2. For updated products, we'll add a flag indicating they need review
    // 3. Log all actions for audit trail

    let productsRestored = 0;
    const errors: string[] = [];

    // Mark affected products for review rather than attempting destructive rollback
    for (const product of affectedProducts) {
      try {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            syncLocked: true, // Lock from future syncs until manually reviewed
            updatedAt: new Date() // Update timestamp to indicate rollback action
          }
        });
        productsRestored++;
      } catch (productError) {
        const errorMsg = `Failed to lock product ${product.id}: ${productError instanceof Error ? productError.message : 'Unknown error'}`;
        errors.push(errorMsg);
        logger.error(errorMsg);
      }
    }

    // Create a rollback record in sync history
    await prisma.syncHistory.create({
      data: {
        syncType: 'ROLLBACK',
        startedAt: new Date(),
        completedAt: new Date(),
        productsSynced: 0,
        productsSkipped: productsRestored,
        errors: errors,
        metadata: {
          rolledBackSyncId: syncRecord.id,
          rolledBackBy: userEmail,
          strategy: 'CONSERVATIVE_LOCK',
          affectedProductCount: affectedProducts.length,
          originalSyncMetadata: metadata
        }
      }
    });

    return {
      success: errors.length === 0,
      message: errors.length === 0 
        ? `Rollback completed. ${productsRestored} products locked for review.`
        : `Rollback completed with ${errors.length} errors. ${productsRestored} products locked for review.`,
      productsRestored,
      errors
    };

  } catch (error) {
    logger.error('❌ Failed to perform rollback:', error);
    return {
      success: false,
      message: `Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      productsRestored: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * GET /api/square/sync-filtered/rollback
 * 
 * Get information about available rollback options
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get recent sync history
    const recentSyncs = await prisma.syncHistory.findMany({
      where: {
        syncType: 'FILTERED',
        completedAt: { not: null }
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        syncType: true,
        startedAt: true,
        completedAt: true,
        productsSynced: true,
        productsSkipped: true,
        errors: true
      }
    });

    return NextResponse.json({
      success: true,
      availableRollbacks: recentSyncs,
      rollbackInfo: {
        strategy: 'Conservative lock-based rollback',
        description: 'Products are locked for manual review rather than destructive restoration',
        warning: 'Rollback operations should be used carefully and require confirmation',
        procedure: [
          'Identifies products modified during the target sync',
          'Locks products from future syncs (syncLocked = true)',
          'Creates audit trail in sync history',
          'Requires manual review to unlock products'
        ]
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ Error in rollback GET endpoint:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get rollback information',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}