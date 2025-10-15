/**
 * Square Categories API Endpoint
 *
 * Fetches all available categories from Square catalog for category selection
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { createClient } from '@/utils/supabase/server';
import { prisma, withRetry } from '@/lib/db-unified';

/**
 * GET /api/square/categories
 *
 * Fetches all categories from Square catalog
 * Requires admin authentication
 */
export async function GET(request: NextRequest) {
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

    // Check admin role using Prisma
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: user.id },
        select: { role: true },
      });

      if (!profile || profile.role !== 'ADMIN') {
        return NextResponse.json(
          { success: false, error: 'Admin access required' },
          { status: 403 }
        );
      }
    } catch (dbError) {
      console.error('Database error checking admin role:', dbError);
      return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
    }

    // Fetch categories from Square using MCP API
    // Note: This will be replaced with the actual MCP call when the function is implemented
    const requestBody = {
      object_types: ['CATEGORY'],
      include_deleted_objects: false,
      limit: 1000, // Get all categories
    };

    // For now, we'll need to use the existing Square API implementation
    const { searchCatalogObjects } = await import('@/lib/square/catalog-api');
    const categoriesResponse = await searchCatalogObjects(requestBody);

    if (!categoriesResponse || !categoriesResponse.result) {
      throw new Error('Failed to fetch categories from Square API');
    }

    // Extract and format categories
    const categories = (categoriesResponse.result.objects || [])
      .filter((obj: any) => obj.type === 'CATEGORY' && obj.category_data?.name)
      .map((obj: any) => ({
        id: obj.id,
        name: obj.category_data.name,
        present_at_all_locations: obj.present_at_all_locations || false,
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    logger.info(`📋 Fetched ${categories.length} categories from Square`);

    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error) {
    logger.error('❌ Error fetching Square categories:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
