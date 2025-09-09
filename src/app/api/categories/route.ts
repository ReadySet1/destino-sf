import { NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db-unified';
import { logger } from '@/utils/logger';

export async function GET() {
  try {
    // Get all categories
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
