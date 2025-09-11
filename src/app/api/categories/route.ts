import { NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db-unified';
import { logger } from '@/utils/logger';
import { isBuildTime, safeBuildTimeOperation } from '@/lib/build-time-utils';

export async function GET() {
  try {
    // Get all categories
      // Handle build time or database unavailability
  if (isBuildTime()) {
    console.log('🔧 Build-time detected: Using fallback data');
    return NextResponse.json({ 
      success: true, 
      data: [], 
      note: 'Fallback data used due to build-time constraints' 
    });
  }

    const categories = await withRetry(() => 
      prisma.category.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
      3,
      'categories-fetch'
    );

    return NextResponse.json(categories);
  } catch (error) {
    logger.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}
