import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { SpotlightAPIResponse, SpotlightPick } from '@/types/spotlight';
import { prisma } from '@/lib/db';

// Validation schema
const spotlightPickSchema = z.object({
  position: z.number().int().min(1).max(4),
  isCustom: z.boolean(),
  productId: z.string().uuid().optional().nullable(),
  customTitle: z.string().optional().nullable(),
  customDescription: z.string().optional().nullable(),
  customImageUrl: z.string().url().optional().nullable(),
  customPrice: z.number().positive().optional().nullable(),
  personalizeText: z.string().optional().nullable(),
  customLink: z.string().optional().nullable(),
  showNewFeatureModal: z.boolean().optional(),
  newFeatureTitle: z.string().optional().nullable(),
  newFeatureDescription: z.string().optional().nullable(),
  newFeatureBadgeText: z.string().optional().nullable(),
  isActive: z.boolean(),
});

// Check if user is admin
async function isUserAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const adminProfile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  return adminProfile?.role === 'ADMIN';
}

// GET: Fetch all spotlight picks with product data
export async function GET(request: NextRequest): Promise<NextResponse<SpotlightAPIResponse<SpotlightPick[]>>> {
  try {
    const supabase = await createClient();

    // Check admin authentication
    if (!(await isUserAdmin(supabase))) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Fetch spotlight picks with product data using Prisma
    const rawSpotlightPicks = await prisma.spotlightPick.findMany({
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
      customLink: pick.customLink,
      showNewFeatureModal: pick.showNewFeatureModal,
      newFeatureTitle: pick.newFeatureTitle,
      newFeatureDescription: pick.newFeatureDescription,
      newFeatureBadgeText: pick.newFeatureBadgeText,
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
    console.error('Error in GET /api/admin/spotlight-picks:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}

// POST: Create or update a spotlight pick
export async function POST(request: NextRequest): Promise<NextResponse<SpotlightAPIResponse<SpotlightPick>>> {
  try {
    const supabase = await createClient();

    // Check admin authentication
    if (!(await isUserAdmin(supabase))) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = spotlightPickSchema.parse(body);

    // Upsert the spotlight pick using Prisma
    const spotlightPick = await prisma.spotlightPick.upsert({
      where: {
        position: validatedData.position,
      },
      update: {
        productId: validatedData.productId,
        customTitle: validatedData.customTitle,
        customDescription: validatedData.customDescription,
        customImageUrl: validatedData.customImageUrl,
        customPrice: validatedData.customPrice,
        personalizeText: validatedData.personalizeText,
        customLink: validatedData.customLink,
        showNewFeatureModal: validatedData.showNewFeatureModal || false,
        newFeatureTitle: validatedData.newFeatureTitle,
        newFeatureDescription: validatedData.newFeatureDescription,
        newFeatureBadgeText: validatedData.newFeatureBadgeText,
        isCustom: validatedData.isCustom,
        isActive: validatedData.isActive,
      },
      create: {
        position: validatedData.position,
        productId: validatedData.productId,
        customTitle: validatedData.customTitle,
        customDescription: validatedData.customDescription,
        customImageUrl: validatedData.customImageUrl,
        customPrice: validatedData.customPrice,
        personalizeText: validatedData.personalizeText,
        customLink: validatedData.customLink,
        showNewFeatureModal: validatedData.showNewFeatureModal || false,
        newFeatureTitle: validatedData.newFeatureTitle,
        newFeatureDescription: validatedData.newFeatureDescription,
        newFeatureBadgeText: validatedData.newFeatureBadgeText,
        isCustom: validatedData.isCustom,
        isActive: validatedData.isActive,
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
    });

    // Transform the data to match our interface
    const transformedPick: SpotlightPick = {
      id: spotlightPick.id,
      position: spotlightPick.position as 1 | 2 | 3 | 4,
      productId: spotlightPick.productId,
      customTitle: spotlightPick.customTitle,
      customDescription: spotlightPick.customDescription,
      customImageUrl: spotlightPick.customImageUrl,
      customPrice: spotlightPick.customPrice ? Number(spotlightPick.customPrice) : null,
      personalizeText: spotlightPick.personalizeText,
      customLink: spotlightPick.customLink,
      showNewFeatureModal: spotlightPick.showNewFeatureModal,
      newFeatureTitle: spotlightPick.newFeatureTitle,
      newFeatureDescription: spotlightPick.newFeatureDescription,
      newFeatureBadgeText: spotlightPick.newFeatureBadgeText,
      isCustom: spotlightPick.isCustom,
      isActive: spotlightPick.isActive,
      createdAt: spotlightPick.createdAt,
      updatedAt: spotlightPick.updatedAt,
      product: spotlightPick.product ? {
        id: spotlightPick.product.id,
        name: spotlightPick.product.name,
        description: spotlightPick.product.description,
        images: spotlightPick.product.images || [],
        price: Number(spotlightPick.product.price),
        slug: spotlightPick.product.slug,
        category: spotlightPick.product.category ? {
          name: spotlightPick.product.category.name,
          slug: spotlightPick.product.category.slug,
        } : undefined,
      } : null,
    };

    return NextResponse.json({ 
      success: true, 
      data: transformedPick 
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid data provided' 
      }, { status: 400 });
    }

    console.error('Error in POST /api/admin/spotlight-picks:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}

// DELETE: Clear a spotlight pick at a specific position
export async function DELETE(request: NextRequest): Promise<NextResponse<SpotlightAPIResponse<void>>> {
  try {
    const supabase = await createClient();

    // Check admin authentication
    if (!(await isUserAdmin(supabase))) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const position = parseInt(searchParams.get('position') || '');

    if (!position || position < 1 || position > 4) {
      return NextResponse.json({ 
        success: false, 
        error: 'Valid position (1-4) is required' 
      }, { status: 400 });
    }

    // Update the spotlight pick to inactive using Prisma
    await prisma.spotlightPick.update({
      where: {
        position: position,
      },
      data: {
        isActive: false,
        productId: null,
        customTitle: null,
        customDescription: null,
        customImageUrl: null,
        customPrice: null,
        personalizeText: null,
        isCustom: false,
      },
    });

    return NextResponse.json({ 
      success: true 
    });

  } catch (error) {
    console.error('Error in DELETE /api/admin/spotlight-picks:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
} 