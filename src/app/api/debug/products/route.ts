import { NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db-unified';

export async function GET() {
  try {
    // Get first 10 products with their images
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        images: true,
        slug: true,
        squareId: true,
        updatedAt: true,
      },
      take: 10,
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json({
      products,
      count: products.length,
      hasImages: products.some(p => p.images && p.images.length > 0),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching product debug info:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
