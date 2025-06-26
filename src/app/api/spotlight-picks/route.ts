import { NextRequest, NextResponse } from 'next/server';
import { SpotlightAPIResponse, SpotlightPick } from '@/types/spotlight';
import { prisma } from '@/lib/db';

// GET: Fetch active spotlight picks for public display
export async function GET(request: NextRequest): Promise<NextResponse<SpotlightAPIResponse<SpotlightPick[]>>> {
  try {
    // Fetch spotlight picks with product data using Prisma
    const rawSpotlightPicks = await prisma.spotlightPick.findMany({
      where: {
        isActive: true,
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

    // Transform the data to match our interface
    const spotlightPicks: SpotlightPick[] = rawSpotlightPicks.map((pick) => ({
      id: pick.id,
      position: pick.position as 1 | 2 | 3 | 4,
      productId: pick.productId,
      customTitle: pick.customTitle,
      customDescription: pick.customDescription,
      customImageUrl: pick.customImageUrl,
      customPrice: pick.customPrice ? Number(pick.customPrice) : null,
      personalizeText: pick.personalizeText,
      isCustom: pick.isCustom,
      isActive: pick.isActive,
      createdAt: pick.createdAt,
      updatedAt: pick.updatedAt,
      product: pick.product ? {
        id: pick.product.id,
        name: pick.product.name,
        description: pick.product.description,
        images: pick.product.images || [],
        price: Number(pick.product.price),
        slug: pick.product.slug,
        category: pick.product.category ? {
          name: pick.product.category.name,
          slug: pick.product.category.slug,
        } : undefined,
      } : null,
    }));

    return NextResponse.json({ 
      success: true, 
      data: spotlightPicks 
    });

  } catch (error) {
    console.error('Error in GET /api/spotlight-picks:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
} 