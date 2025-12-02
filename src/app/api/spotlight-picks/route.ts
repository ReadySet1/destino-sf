import { NextRequest, NextResponse } from 'next/server';
import { SpotlightAPIResponse, SpotlightPick } from '@/types/spotlight';
import { prisma, withRetry } from '@/lib/db-unified';
import { safeCateringApiOperation } from '@/lib/catering-api-utils';

// DES-81: Increase function timeout for database connection resilience
export const maxDuration = 60;

async function getSpotlightPicks(): Promise<SpotlightPick[]> {
  // Fetch spotlight picks with product data using Prisma
  const rawSpotlightPicks = await withRetry(
    async () => {
      return await prisma.spotlightPick.findMany({
        where: {
          isActive: true,
          AND: [
            {
              productId: {
                not: undefined,
              },
            },
          ],
        },
        include: {
          product: {
            include: {
              category: {
                select: {
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
        orderBy: {
          position: 'asc',
        },
      });
    },
    3,
    'spotlight-picks-fetch'
  );

  // Transform the data to match our interface
  return rawSpotlightPicks
    .filter(pick => pick.product && pick.productId) // Extra safety filter
    .map(pick => ({
      id: pick.id,
      position: pick.position as 1 | 2 | 3 | 4,
      productId: pick.productId!,
      isActive: pick.isActive,
      createdAt: pick.createdAt,
      updatedAt: pick.updatedAt,
      product: {
        id: pick.product!.id,
        name: pick.product!.name,
        description: pick.product!.description,
        images: pick.product!.images || [],
        price:
          typeof pick.product!.price === 'object' &&
          pick.product!.price &&
          'toNumber' in pick.product!.price
            ? pick.product!.price.toNumber()
            : Number(pick.product!.price),
        slug: pick.product!.slug,
        category: pick.product!.category
          ? {
              name: pick.product!.category.name,
              slug: pick.product!.category.slug,
            }
          : undefined,
      },
    }));
}

// GET: Fetch active spotlight picks for public display
export async function GET(
  request: NextRequest
): Promise<NextResponse<SpotlightAPIResponse<SpotlightPick[]>>> {
  try {
    const spotlightPicks = await getSpotlightPicks();

    return NextResponse.json({
      success: true,
      data: spotlightPicks,
    });
  } catch (error) {
    console.error('Failed to fetch spotlight picks:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch spotlight picks',
      },
      { status: 500 }
    );
  }
}
