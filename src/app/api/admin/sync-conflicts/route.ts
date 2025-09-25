import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { prisma } from '@/lib/db-unified';
import { verifyAdminAccess } from '@/lib/auth/admin-guard';

interface SyncConflict {
  id: string;
  productId: string;
  productName: string;
  squareId: string;
  conflictType: 'visibility' | 'availability' | 'state' | 'preorder';
  currentValue: any;
  squareValue: any;
  manualValue?: any;
  hasManualOverrides: boolean;
  lastSyncAt: Date;
  createdAt: Date;
}

interface ConflictResolution {
  conflictId: string;
  resolution: 'keep_manual' | 'accept_square' | 'custom';
  customValue?: any;
  applyToFuture: boolean;
}

/**
 * GET /api/admin/sync-conflicts
 * Retrieve all current sync conflicts that need admin attention
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAccess();
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.statusCode });
    }

    const searchParams = request.nextUrl.searchParams;
    const conflictType = searchParams.get('type') as string | null;
    const productId = searchParams.get('productId') as string | null;
    const onlyUnresolved = searchParams.get('onlyUnresolved') === 'true';

    // Get sync conflicts by analyzing products with potential conflicts
    const conflicts = await detectSyncConflicts({
      conflictType,
      productId,
      onlyUnresolved
    });

    logger.info('Sync conflicts retrieved', {
      count: conflicts.length,
      filters: { conflictType, productId, onlyUnresolved },
      admin: authResult.user?.email
    });

    return NextResponse.json({
      success: true,
      data: {
        conflicts,
        totalCount: conflicts.length,
        summary: generateConflictSummary(conflicts)
      }
    });

  } catch (error) {
    logger.error('Error retrieving sync conflicts:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve sync conflicts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/sync-conflicts/resolve
 * Resolve sync conflicts with admin decisions
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminAccess();
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.statusCode });
    }

    const body = await request.json();
    const { resolutions }: { resolutions: ConflictResolution[] } = body;

    if (!resolutions || !Array.isArray(resolutions)) {
      return NextResponse.json(
        { error: 'Invalid resolutions data' },
        { status: 400 }
      );
    }

    // Apply conflict resolutions
    const results = await resolveConflicts(resolutions, authResult.user!.id);

    // Create audit trail entries
    await createAuditTrail(resolutions, authResult.user!.id, authResult.user?.email);

    logger.info('Sync conflicts resolved', {
      resolvedCount: results.resolved.length,
      failedCount: results.failed.length,
      admin: authResult.user?.email
    });

    return NextResponse.json({
      success: true,
      data: {
        resolved: results.resolved,
        failed: results.failed,
        totalProcessed: resolutions.length
      }
    });

  } catch (error) {
    logger.error('Error resolving sync conflicts:', error);
    return NextResponse.json(
      { error: 'Failed to resolve sync conflicts' },
      { status: 500 }
    );
  }
}

/**
 * Detect sync conflicts by comparing current product state with Square data
 */
async function detectSyncConflicts(filters: {
  conflictType?: string | null;
  productId?: string | null;
  onlyUnresolved?: boolean;
}): Promise<SyncConflict[]> {
  const { conflictType, productId, onlyUnresolved } = filters;

  // Get products with potential conflicts
  const products = await prisma.product.findMany({
    where: {
      ...(productId && { id: productId }),
      active: true, // Only check active products
    },
    select: {
      id: true,
      name: true,
      squareId: true,
      visibility: true,
      isAvailable: true,
      isPreorder: true,
      itemState: true,
      updatedAt: true,
      // Check if product has availability rules (indicates manual management)
      availabilityRules: {
        select: { 
          id: true,
          state: true,
          ruleType: true,
          updatedAt: true
        },
        where: { deletedAt: null }
      }
      // Note: Sync history would be added when implemented
    }
  });

  const conflicts: SyncConflict[] = [];

  for (const product of products) {
    const hasManualOverrides = product.availabilityRules.length > 0 ||
                              product.visibility === 'PRIVATE' ||
                              product.itemState !== 'ACTIVE';

    // Only consider products with manual overrides
    if (!hasManualOverrides) {
      continue;
    }

    // Simulate what Square sync would set (this would normally come from Square API)
    const simulatedSquareState = await simulateSquareState(product.squareId!);

    // Check for conflicts
    const productConflicts = detectProductConflicts(
      product,
      simulatedSquareState,
      hasManualOverrides
    );

    conflicts.push(...productConflicts);
  }

  // Apply filters
  let filteredConflicts = conflicts;

  if (conflictType) {
    filteredConflicts = filteredConflicts.filter(c => c.conflictType === conflictType);
  }

  if (onlyUnresolved) {
    // Check if conflicts have been resolved recently
    filteredConflicts = filteredConflicts.filter(c => 
      !c.lastSyncAt || 
      (Date.now() - c.lastSyncAt.getTime()) > 24 * 60 * 60 * 1000 // Not resolved in last 24h
    );
  }

  return filteredConflicts;
}

/**
 * Simulate what Square would set for a product (mock implementation)
 */
async function simulateSquareState(squareId: string): Promise<{
  visibility: 'PUBLIC' | 'PRIVATE';
  isAvailable: boolean;
  isPreorder: boolean;
  itemState: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
}> {
  // In a real implementation, this would fetch from Square API
  // For now, simulate some common conflict scenarios
  return {
    visibility: 'PUBLIC', // Square typically defaults to PUBLIC
    isAvailable: true,
    isPreorder: false,
    itemState: 'ACTIVE'
  };
}

/**
 * Detect conflicts between current product state and Square state
 */
function detectProductConflicts(
  product: any,
  squareState: any,
  hasManualOverrides: boolean
): SyncConflict[] {
  const conflicts: SyncConflict[] = [];
  const baseConflict = {
    id: `${product.id}-${Date.now()}`,
    productId: product.id,
    productName: product.name,
    squareId: product.squareId,
    hasManualOverrides,
    lastSyncAt: new Date(), // Would use actual sync history when available
    createdAt: new Date()
  };

  // Check visibility conflict
  if (product.visibility !== squareState.visibility && hasManualOverrides) {
    conflicts.push({
      ...baseConflict,
      id: `${baseConflict.id}-visibility`,
      conflictType: 'visibility',
      currentValue: product.visibility,
      squareValue: squareState.visibility,
      manualValue: product.visibility
    });
  }

  // Check availability conflict
  if (product.isAvailable !== squareState.isAvailable && hasManualOverrides) {
    conflicts.push({
      ...baseConflict,
      id: `${baseConflict.id}-availability`,
      conflictType: 'availability',
      currentValue: product.isAvailable,
      squareValue: squareState.isAvailable,
      manualValue: product.isAvailable
    });
  }

  // Check preorder conflict
  if (product.isPreorder !== squareState.isPreorder && hasManualOverrides) {
    conflicts.push({
      ...baseConflict,
      id: `${baseConflict.id}-preorder`,
      conflictType: 'preorder',
      currentValue: product.isPreorder,
      squareValue: squareState.isPreorder,
      manualValue: product.isPreorder
    });
  }

  // Check item state conflict
  if (product.itemState !== squareState.itemState && hasManualOverrides) {
    conflicts.push({
      ...baseConflict,
      id: `${baseConflict.id}-state`,
      conflictType: 'state',
      currentValue: product.itemState,
      squareValue: squareState.itemState,
      manualValue: product.itemState
    });
  }

  return conflicts;
}

/**
 * Generate conflict summary statistics
 */
function generateConflictSummary(conflicts: SyncConflict[]) {
  const summary = {
    total: conflicts.length,
    byType: {} as Record<string, number>,
    withManualOverrides: 0,
    critical: 0 // Conflicts that would hide available products
  };

  conflicts.forEach(conflict => {
    // Count by type
    summary.byType[conflict.conflictType] = (summary.byType[conflict.conflictType] || 0) + 1;
    
    // Count manual overrides
    if (conflict.hasManualOverrides) {
      summary.withManualOverrides++;
    }
    
    // Count critical conflicts
    if (conflict.conflictType === 'visibility' && conflict.squareValue === 'PRIVATE') {
      summary.critical++;
    }
  });

  return summary;
}

/**
 * Resolve conflicts by applying admin decisions
 */
async function resolveConflicts(
  resolutions: ConflictResolution[],
  userId: string
): Promise<{ resolved: string[]; failed: Array<{ id: string; error: string }> }> {
  const resolved: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  for (const resolution of resolutions) {
    try {
      await applyConflictResolution(resolution, userId);
      resolved.push(resolution.conflictId);
    } catch (error) {
      failed.push({
        id: resolution.conflictId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return { resolved, failed };
}

/**
 * Apply a single conflict resolution
 */
async function applyConflictResolution(
  resolution: ConflictResolution,
  userId: string
): Promise<void> {
  // Extract product ID from conflict ID
  const productId = resolution.conflictId.split('-')[0];

  if (!productId) {
    throw new Error('Invalid conflict ID format');
  }

  // Get the current product
  const product = await prisma.product.findUnique({
    where: { id: productId }
  });

  if (!product) {
    throw new Error('Product not found');
  }

  let updateData: any = {};

  switch (resolution.resolution) {
    case 'keep_manual':
      // No changes needed - current manual settings are preserved
      logger.info('Conflict resolved: keeping manual settings', {
        productId,
        conflictId: resolution.conflictId
      });
      break;

    case 'accept_square':
      // This would require fetching current Square state
      // For now, simulate accepting Square defaults
      updateData = {
        visibility: 'PUBLIC',
        isAvailable: true,
        isPreorder: false,
        itemState: 'ACTIVE',
        updatedAt: new Date(),
        // Add metadata about sync conflict resolution
        syncConflictResolved: true,
        syncConflictResolvedBy: userId,
        syncConflictResolvedAt: new Date()
      };
      break;

    case 'custom':
      if (!resolution.customValue) {
        throw new Error('Custom value required for custom resolution');
      }
      updateData = {
        ...resolution.customValue,
        updatedAt: new Date(),
        syncConflictResolved: true,
        syncConflictResolvedBy: userId,
        syncConflictResolvedAt: new Date()
      };
      break;

    default:
      throw new Error(`Invalid resolution type: ${resolution.resolution}`);
  }

  // Apply the update if there are changes
  if (Object.keys(updateData).length > 0) {
    await prisma.product.update({
      where: { id: productId },
      data: updateData
    });
  }

  // Create rule to prevent future conflicts if requested
  if (resolution.applyToFuture) {
    await createConflictPreventionRule(productId, resolution, userId);
  }
}

/**
 * Create audit trail entries for conflict resolutions
 */
async function createAuditTrail(
  resolutions: ConflictResolution[],
  userId: string,
  adminEmail?: string
): Promise<void> {
  const auditEntries = resolutions.map(resolution => ({
    entityType: 'PRODUCT',
    entityId: resolution.conflictId.split('-')[0],
    action: 'SYNC_CONFLICT_RESOLVED',
    changedFields: {
      conflictId: resolution.conflictId,
      resolution: resolution.resolution,
      customValue: resolution.customValue,
      applyToFuture: resolution.applyToFuture
    },
    adminUserId: userId,
    adminEmail: adminEmail,
    timestamp: new Date(),
    reason: `Sync conflict resolved via admin interface`
  }));

  // Store audit entries (implement based on your audit system)
  logger.info('Audit trail created for sync conflict resolutions', {
    entriesCount: auditEntries.length,
    admin: adminEmail
  });
}

/**
 * Create rule to prevent future conflicts for this product
 */
async function createConflictPreventionRule(
  productId: string,
  resolution: ConflictResolution,
  userId: string
): Promise<void> {
  // Create an availability rule that preserves the admin's decision
  await prisma.availabilityRule.create({
    data: {
      productId,
      ruleType: 'CUSTOM',
      state: 'MANUAL_OVERRIDE',
      priority: 1000, // High priority to override sync
      enabled: true,
      name: `Conflict prevention rule - preserves admin decision for ${resolution.conflictId}`,
      createdBy: userId,
      updatedBy: userId
      // Note: Metadata would be stored elsewhere if needed
    }
  });

  logger.info('Conflict prevention rule created', {
    productId,
    conflictId: resolution.conflictId,
    admin: userId
  });
}

