import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { SpotlightAPIResponse, SpotlightPick } from '@/types/spotlight';
import { prisma, withRetry } from '@/lib/db-unified';

// Validation schema
const spotlightPickSchema = z.object({
  position: z.number().int().min(1).max(4),
  productId: z.string().uuid(),
  isActive: z.boolean(),
});

// Check if user is admin
async function isUserAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const adminProfile = await withRetry(
    () => prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true },
    }),
    3,
    'check admin profile in spotlight-picks'
  );

  return adminProfile?.role === 'ADMIN';
}

// GET: Fetch all spotlight picks with product data
export async function GET(
  request: NextRequest
): Promise<NextResponse<SpotlightAPIResponse<SpotlightPick[]>>> {
  try {
    const supabase = await createClient();

    // Check admin authentication
    if (!(await isUserAdmin(supabase))) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Fetch spotlight picks with product data using Prisma
    // Only fetch picks that have products (filter out any legacy data)
    const rawSpotlightPicks = await prisma.spotlightPick.findMany({
      where: {
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

    // Transform the data to match our interface
    const spotlightPicks: SpotlightPick[] = rawSpotlightPicks
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
          price: Number(pick.product!.price),
          slug: pick.product!.slug,
          category: pick.product!.category
            ? {
                name: pick.product!.category.name,
                slug: pick.product!.category.slug,
              }
            : undefined,
        },
      }));

    return NextResponse.json({
      success: true,
      data: spotlightPicks,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/spotlight-picks:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

// POST: Create or update a spotlight pick
export async function POST(
  request: NextRequest
): Promise<NextResponse<SpotlightAPIResponse<SpotlightPick>>> {
  try {
    const supabase = await createClient();

    // Check admin authentication
    if (!(await isUserAdmin(supabase))) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
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
        isActive: validatedData.isActive,
      },
      create: {
        position: validatedData.position,
        productId: validatedData.productId,
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
      productId: spotlightPick.productId!,
      isActive: spotlightPick.isActive,
      createdAt: spotlightPick.createdAt,
      updatedAt: spotlightPick.updatedAt,
      product: {
        id: spotlightPick.product!.id,
        name: spotlightPick.product!.name,
        description: spotlightPick.product!.description,
        images: spotlightPick.product!.images || [],
        price: Number(spotlightPick.product!.price),
        slug: spotlightPick.product!.slug,
        category: spotlightPick.product!.category
          ? {
              name: spotlightPick.product!.category.name,
              slug: spotlightPick.product!.category.slug,
            }
          : undefined,
      },
    };

    return NextResponse.json({
      success: true,
      data: transformedPick,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);

      // Create a more user-friendly error message
      const errorMessages = error.errors.map(err => {
        const field = err.path.join('.');
        switch (field) {
          case 'customTitle':
            return 'Custom title is required for custom items';
          case 'customImageUrl':
            return 'Please provide a valid image URL or leave empty';
          case 'customPrice':
            return 'Price must be a valid positive number';
          case 'customLink':
            return 'Please provide a valid URL for custom link or leave empty';
          case 'productId':
            return 'Please select a product for product-based items';
          default:
            return `${field}: ${err.message}`;
        }
      });

      return NextResponse.json(
        {
          success: false,
          error: errorMessages.join('; '),
          validationErrors: error.errors,
        },
        { status: 400 }
      );
    }

    console.error('Error in POST /api/admin/spotlight-picks:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

// DELETE: Clear a spotlight pick at a specific position
export async function DELETE(
  request: NextRequest
): Promise<NextResponse<SpotlightAPIResponse<void>>> {
  try {
    const supabase = await createClient();

    // Check admin authentication
    if (!(await isUserAdmin(supabase))) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const position = parseInt(searchParams.get('position') || '');

    if (!position || position < 1 || position > 4) {
      return NextResponse.json(
        {
          success: false,
          error: 'Valid position (1-4) is required',
        },
        { status: 400 }
      );
    }

    // Delete the spotlight pick using Prisma
    await prisma.spotlightPick.delete({
      where: {
        position: position,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error in DELETE /api/admin/spotlight-picks:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
