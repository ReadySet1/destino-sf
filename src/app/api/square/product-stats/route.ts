import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db-unified';
import { logger } from '@/utils/logger';

interface ProductStats {
  total: number;
  withSquareId: number;
  withImages: number;
  withoutImages: number;
  samples: {
    withImages: Array<{
      id: string;
      name: string;
      squareId: string | null;
      imageCount: number;
      images: string[];
    }>;
    withoutImages: Array<{
      id: string;
      name: string;
      squareId: string | null;
    }>;
  };
}

export async function GET(request: NextRequest) {
  try {
    // Get all products
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        squareId: true,
        images: true,
      },
    });

    const stats: ProductStats = {
      total: products.length,
      withSquareId: 0,
      withImages: 0,
      withoutImages: 0,
      samples: {
        withImages: [],
        withoutImages: [],
      },
    };

    // Calculate stats
    for (const product of products) {
      if (product.squareId) {
        stats.withSquareId++;
      }

      if (product.images && product.images.length > 0) {
        stats.withImages++;

        // Add sample with images (limited to first 5)
        if (stats.samples.withImages.length < 5) {
          stats.samples.withImages.push({
            id: product.id,
            name: product.name,
            squareId: product.squareId,
            imageCount: product.images.length,
            images: product.images,
          });
        }
      } else {
        stats.withoutImages++;

        // Add sample without images (limited to first 5)
        if (stats.samples.withoutImages.length < 5 && product.squareId) {
          stats.samples.withoutImages.push({
            id: product.id,
            name: product.name,
            squareId: product.squareId,
          });
        }
      }
    }

    return NextResponse.json(stats);
  } catch (error) {
    logger.error('Error in product-stats endpoint:', error);
    return NextResponse.json({ error: 'Failed to get product stats' }, { status: 500 });
  }
}
