import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { prisma } from '@/lib/db-unified';
import { verifyAdminAccess } from '@/lib/auth/admin-guard';

interface RollbackRequest {
  productId: string;
  rollbackTo?: Date; // Rollback to specific date
  rollbackType: 'last_manual' | 'pre_sync' | 'specific_date';
  reason: string;
}

interface ProductSnapshot {
  id: string;
  productId: string;
  visibility: 'PUBLIC' | 'PRIVATE' | null;
  isAvailable: boolean;
  isPreorder: boolean;
  itemState: 'ACTIVE' | 'INACTIVE' | 'SEASONAL' | 'ARCHIVED' | null;
  snapshotDate: Date;
  snapshotReason: string;
  createdBy: string;
}

/**
 * POST /api/admin/sync-conflicts/rollback
 * Rollback product visibility settings to a previous state
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminAccess();
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.statusCode });
    }

    const body = await request.json();
    const rollbackRequest: RollbackRequest = body;

    if (!rollbackRequest.productId || !rollbackRequest.rollbackType || !rollbackRequest.reason) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, rollbackType, reason' },
        { status: 400 }
      );
    }

    // Get current product state before rollback
    const currentProduct = await prisma.product.findUnique({
      where: { id: rollbackRequest.productId },
      select: {
        id: true,
        name: true,
        visibility: true,
        isAvailable: true,
        isPreorder: true,
        itemState: true,
        updatedAt: true
      }
    });

    if (!currentProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Create snapshot of current state before rollback
    await createProductSnapshot(currentProduct, authResult.user!.id, 'pre_rollback');

    // Find the target state to rollback to
    const targetState = await findRollbackTarget(rollbackRequest);

    if (!targetState) {
      return NextResponse.json(
        { error: 'No valid rollback target found' },
        { status: 404 }
      );
    }

    // Perform the rollback
    const rollbackResult = await performRollback(
      rollbackRequest.productId,
      targetState,
      rollbackRequest.reason,
      authResult.user!.id
    );

    // Create audit trail entry
    await createRollbackAuditEntry(
      rollbackRequest,
      currentProduct,
      targetState,
      authResult.user!.id,
      authResult.user?.email
    );

    logger.info('Product rollback completed', {
      productId: rollbackRequest.productId,
      rollbackType: rollbackRequest.rollbackType,
      admin: authResult.user?.email,
      reason: rollbackRequest.reason
    });

    return NextResponse.json({
      success: true,
      data: {
        productId: rollbackRequest.productId,
        rollbackType: rollbackRequest.rollbackType,
        previousState: currentProduct,
        restoredState: targetState,
        rollbackDate: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error performing rollback:', error);
    return NextResponse.json(
      { error: 'Failed to perform rollback' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/sync-conflicts/rollback/[productId]
 * Get available rollback targets for a product
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAccess();
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.statusCode });
    }

    const url = new URL(request.url);
    const productId = url.pathname.split('/').pop();

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Get product snapshots for rollback options
    const snapshots = await getProductSnapshots(productId);

    // Get sync history for additional context
    const syncHistory = await getSyncHistory(productId);

    return NextResponse.json({
      success: true,
      data: {
        productId,
        snapshots,
        syncHistory,
        rollbackOptions: generateRollbackOptions(snapshots, syncHistory)
      }
    });

  } catch (error) {
    logger.error('Error getting rollback options:', error);
    return NextResponse.json(
      { error: 'Failed to get rollback options' },
      { status: 500 }
    );
  }
}

/**
 * Create a snapshot of the current product state
 */
async function createProductSnapshot(
  product: any,
  userId: string,
  reason: string
): Promise<void> {
  // In a real implementation, this would use a dedicated snapshots table
  // For now, we'll log it and could store in a JSONB field
  logger.info('Product snapshot created', {
    productId: product.id,
    snapshot: {
      visibility: product.visibility,
      isAvailable: product.isAvailable,
      isPreorder: product.isPreorder,
      itemState: product.itemState,
      snapshotDate: new Date(),
      snapshotReason: reason,
      createdBy: userId
    }
  });

  // TODO: Store in dedicated snapshots table
  // await prisma.productSnapshot.create({
  //   data: {
  //     productId: product.id,
  //     visibility: product.visibility,
  //     isAvailable: product.isAvailable,
  //     isPreorder: product.isPreorder,
  //     itemState: product.itemState,
  //     snapshotDate: new Date(),
  //     snapshotReason: reason,
  //     createdBy: userId
  //   }
  // });
}

/**
 * Find the appropriate rollback target based on request type
 */
async function findRollbackTarget(
  rollbackRequest: RollbackRequest
): Promise<any | null> {
  const { productId, rollbackType, rollbackTo } = rollbackRequest;

  switch (rollbackType) {
    case 'last_manual':
      // Find the last state before sync automation
      return await findLastManualState(productId);

    case 'pre_sync':
      // Find state before the last sync operation
      return await findPreSyncState(productId);

    case 'specific_date':
      if (!rollbackTo) {
        throw new Error('rollbackTo date required for specific_date type');
      }
      return await findStateAtDate(productId, rollbackTo);

    default:
      throw new Error(`Unknown rollback type: ${rollbackType}`);
  }
}

/**
 * Find the last manually-set state (before automation)
 */
async function findLastManualState(productId: string): Promise<any | null> {
  // This would query the snapshots table in a real implementation
  // For now, return a mock state that represents "manual defaults"
  return {
    visibility: 'PUBLIC',
    isAvailable: true,
    isPreorder: false,
    itemState: 'ACTIVE',
    source: 'manual_default'
  };
}

/**
 * Find the state before the last sync operation
 */
async function findPreSyncState(productId: string): Promise<any | null> {
  // This would look at sync history and snapshots
  // For now, return a reasonable pre-sync state
  return {
    visibility: 'PUBLIC',
    isAvailable: true,
    isPreorder: false,
    itemState: 'ACTIVE',
    source: 'pre_sync'
  };
}

/**
 * Find the state at a specific date
 */
async function findStateAtDate(productId: string, date: Date): Promise<any | null> {
  // This would query snapshots closest to the specified date
  return {
    visibility: 'PUBLIC',
    isAvailable: true,
    isPreorder: false,
    itemState: 'ACTIVE',
    source: 'specific_date',
    targetDate: date
  };
}

/**
 * Perform the actual rollback operation
 */
async function performRollback(
  productId: string,
  targetState: any,
  reason: string,
  userId: string
): Promise<void> {
  await prisma.product.update({
    where: { id: productId },
    data: {
      visibility: targetState.visibility,
      isAvailable: targetState.isAvailable,
      isPreorder: targetState.isPreorder,
      itemState: targetState.itemState,
      updatedAt: new Date()
      // Note: Rollback metadata would be stored in audit trail instead of product table
    }
  });

  // Remove any conflict prevention rules that might interfere
  await prisma.availabilityRule.updateMany({
    where: {
      productId,
      ruleType: 'CUSTOM',
      name: { contains: 'Conflict prevention rule' }
    },
    data: {
      deletedAt: new Date(),
      updatedBy: userId
    }
  });
}

/**
 * Get product snapshots for rollback options
 */
async function getProductSnapshots(productId: string): Promise<ProductSnapshot[]> {
  // This would query the snapshots table
  // For now, return mock snapshots
  return [
    {
      id: '1',
      productId,
      visibility: 'PUBLIC',
      isAvailable: true,
      isPreorder: false,
      itemState: 'ACTIVE',
      snapshotDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      snapshotReason: 'pre_sync',
      createdBy: 'system'
    },
    {
      id: '2',
      productId,
      visibility: 'PRIVATE',
      isAvailable: false,
      isPreorder: true,
      itemState: 'SEASONAL',
      snapshotDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      snapshotReason: 'manual_override',
      createdBy: 'admin'
    }
  ];
}

/**
 * Get sync history for additional context
 */
async function getSyncHistory(productId: string): Promise<any[]> {
  // This would query the sync history table
  return [
    {
      id: '1',
      productId,
      syncType: 'production_sync',
      syncDate: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      changesMade: ['visibility: PRIVATE -> PUBLIC', 'isAvailable: false -> true'],
      conflictResolved: false
    }
  ];
}

/**
 * Generate rollback options based on snapshots and sync history
 */
function generateRollbackOptions(snapshots: ProductSnapshot[], syncHistory: any[]) {
  const options = [];

  // Add manual state option
  options.push({
    type: 'last_manual',
    label: 'Last Manual State',
    description: 'Restore to the last manually-configured state',
    available: true
  });

  // Add pre-sync option if there was a recent sync
  if (syncHistory.length > 0) {
    options.push({
      type: 'pre_sync',
      label: 'Before Last Sync',
      description: 'Restore to state before the most recent sync operation',
      available: true,
      syncDate: syncHistory[0].syncDate
    });
  }

  // Add specific snapshot options
  snapshots.forEach((snapshot, index) => {
    options.push({
      type: 'specific_date',
      label: `Snapshot ${index + 1}`,
      description: `Restore to ${snapshot.snapshotReason} state`,
      available: true,
      snapshotDate: snapshot.snapshotDate,
      snapshot
    });
  });

  return options;
}

/**
 * Create audit trail entry for rollback operation
 */
async function createRollbackAuditEntry(
  rollbackRequest: RollbackRequest,
  previousState: any,
  restoredState: any,
  userId: string,
  adminEmail?: string
): Promise<void> {
  const auditEntry = {
    entityType: 'PRODUCT',
    entityId: rollbackRequest.productId,
    action: 'ROLLBACK',
    changedFields: {
      rollbackType: rollbackRequest.rollbackType,
      reason: rollbackRequest.reason,
      previousState: {
        visibility: previousState.visibility,
        isAvailable: previousState.isAvailable,
        isPreorder: previousState.isPreorder,
        itemState: previousState.itemState
      },
      restoredState: {
        visibility: restoredState.visibility,
        isAvailable: restoredState.isAvailable,
        isPreorder: restoredState.isPreorder,
        itemState: restoredState.itemState
      }
    },
    adminUserId: userId,
    adminEmail: adminEmail,
    timestamp: new Date(),
    reason: `Product rollback: ${rollbackRequest.reason}`
  };

  logger.info('Rollback audit entry created', auditEntry);
}

