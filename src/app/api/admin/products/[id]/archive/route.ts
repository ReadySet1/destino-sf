/**
 * Archive/Unarchive Product API Endpoint
 * @version 2.0.0 - Fixed 405 error with DELETE method support
 *
 * POST /api/admin/products/[id]/archive - Archive a product
 * DELETE /api/admin/products/[id]/archive - Unarchive (restore) a product
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db-unified';
import { logger } from '@/utils/logger';

// Force Node.js runtime (required for Prisma and proper HTTP method handling)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Archive a product
 * POST /api/admin/products/[id]/archive
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Await params (Next.js 15 requirement)
    const { id: productId } = await params;

    // Authentication check
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

    // Check if user is admin
    const userProfile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (userProfile?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    // Find the product
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        squareId: true,
        isArchived: true,
        active: true,
      },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // Check if already archived
    if (product.isArchived) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product is already archived',
          product: {
            id: product.id,
            name: product.name,
            isArchived: true,
          },
        },
        { status: 400 }
      );
    }

    // Archive the product
    const archivedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedReason: 'manual', // Manual archiving by admin
        active: false,
        updatedAt: new Date(),
      },
    });

    logger.info(`✅ Product archived by admin: "${product.name}" (${product.squareId})`, {
      userId: user.id,
      productId: product.id,
      productName: product.name,
    });

    return NextResponse.json({
      success: true,
      message: `Product "${product.name}" has been archived`,
      product: {
        id: archivedProduct.id,
        name: archivedProduct.name,
        squareId: archivedProduct.squareId,
        isArchived: archivedProduct.isArchived,
        archivedAt: archivedProduct.archivedAt,
        archivedReason: archivedProduct.archivedReason,
        active: archivedProduct.active,
      },
    });
  } catch (error) {
    logger.error('❌ Error archiving product:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to archive product',
      },
      { status: 500 }
    );
  }
}

/**
 * Unarchive (restore) a product
 * DELETE /api/admin/products/[id]/archive
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params (Next.js 15 requirement)
    const { id: productId } = await params;

    // Authentication check
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

    // Check if user is admin
    const userProfile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (userProfile?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    // Find the product
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        squareId: true,
        isArchived: true,
        active: true,
      },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // Check if already active
    if (!product.isArchived) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product is not archived',
          product: {
            id: product.id,
            name: product.name,
            isArchived: false,
          },
        },
        { status: 400 }
      );
    }

    // Restore the product
    const restoredProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        isArchived: false,
        archivedAt: null,
        archivedReason: null,
        active: true,
        updatedAt: new Date(),
      },
    });

    logger.info(`🔄 Product restored by admin: "${product.name}" (${product.squareId})`, {
      userId: user.id,
      productId: product.id,
      productName: product.name,
    });

    return NextResponse.json({
      success: true,
      message: `Product "${product.name}" has been restored`,
      product: {
        id: restoredProduct.id,
        name: restoredProduct.name,
        squareId: restoredProduct.squareId,
        isArchived: restoredProduct.isArchived,
        archivedAt: restoredProduct.archivedAt,
        archivedReason: restoredProduct.archivedReason,
        active: restoredProduct.active,
      },
    });
  } catch (error) {
    logger.error('❌ Error restoring product:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to restore product',
      },
      { status: 500 }
    );
  }
}

/**
 * Get archive status and statistics
 * GET /api/admin/products/[id]/archive
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Await params (Next.js 15 requirement)
    const { id: productId } = await params;

    // Authentication check
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

    // Find the product
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        squareId: true,
        isArchived: true,
        archivedAt: true,
        archivedReason: true,
        active: true,
        updatedAt: true,
      },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        squareId: product.squareId,
        isArchived: product.isArchived,
        archivedAt: product.archivedAt,
        archivedReason: product.archivedReason,
        active: product.active,
        updatedAt: product.updatedAt,
      },
    });
  } catch (error) {
    logger.error('❌ Error getting product archive status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get archive status',
      },
      { status: 500 }
    );
  }
}

/**
 * Handle CORS preflight requests
 * OPTIONS /api/admin/products/[id]/archive
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
