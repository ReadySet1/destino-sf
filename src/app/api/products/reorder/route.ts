import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminAccess } from '@/lib/auth/admin-guard';
import {
  reorderProducts,
  validateProductsInCategory,
  applyReorderStrategy,
} from '@/lib/products/display-order';
import type { ReorderStrategy } from '@/types/product-admin';

// Validation schemas
const ReorderSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string().uuid(),
        ordinal: z.number().int().positive(),
      })
    )
    .min(1),
  categoryId: z.string().uuid().optional(),
});

const QuickSortSchema = z.object({
  categoryId: z.string().uuid(),
  strategy: z.enum(['ALPHABETICAL', 'PRICE_ASC', 'PRICE_DESC', 'NEWEST_FIRST']),
});

/**
 * POST /api/products/reorder
 * Reorder products with custom ordinals
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role using centralized guard
    const authResult = await verifyAdminAccess();

    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.statusCode });
    }

    const body = await request.json();
    const { updates, categoryId } = ReorderSchema.parse(body);

    // If categoryId is provided, validate all products belong to that category
    if (categoryId) {
      const productIds = updates.map(u => u.id);
      const isValid = await validateProductsInCategory(productIds, categoryId);

      if (!isValid) {
        return NextResponse.json(
          { error: 'Some products do not belong to the specified category' },
          { status: 400 }
        );
      }
    }

    // Perform the reorder operation
    const result = await reorderProducts(updates);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Failed to update product order',
          message: result.error || 'Failed to update product order',
          details: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated display order for ${result.updatedCount} products`,
      updatedCount: result.updatedCount,
    });
  } catch (error) {
    console.error('Error in reorder API:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/products/reorder
 * Apply quick sort strategy to category
 */
export async function PUT(request: NextRequest) {
  try {
    // Check authentication and admin role using centralized guard
    const authResult = await verifyAdminAccess();

    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.statusCode });
    }

    const body = await request.json();
    const { categoryId, strategy } = QuickSortSchema.parse(body);

    // Generate new ordinals based on strategy
    const updates = await applyReorderStrategy(categoryId, strategy as ReorderStrategy);

    // Apply the updates
    const result = await reorderProducts(updates);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Failed to apply sorting strategy',
          message: result.error || 'Failed to apply sorting strategy',
          details: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully applied ${strategy} sorting to ${result.updatedCount} products`,
      updatedCount: result.updatedCount,
      strategy,
    });
  } catch (error) {
    console.error('Error in quick sort API:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
