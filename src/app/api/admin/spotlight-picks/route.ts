import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { SpotlightAPIResponse, SpotlightPick } from '@/types/spotlight';

// Validation schema
const spotlightPickSchema = z.object({
  position: z.number().int().min(1).max(4),
  isCustom: z.boolean(),
  productId: z.string().uuid().optional().nullable(),
  customTitle: z.string().optional().nullable(),
  customDescription: z.string().optional().nullable(),
  customImageUrl: z.string().url().optional().nullable(),
  customPrice: z.number().positive().optional().nullable(),
  isActive: z.boolean(),
});

// Check if user is admin
async function isUserAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data: adminProfile } = await supabase
    .from('Profile')
    .select('*')
    .eq('id', user.id)
    .single();

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

    // Fetch spotlight picks with product data using table queries
    const { data: rawSpotlightPicks, error } = await supabase
      .from('spotlight_picks')
      .select(`
        *,
        Product (
          id,
          name,
          description,
          images,
          price,
          slug,
          Category (
            name,
            slug
          )
        )
      `)
      .order('position');

    if (error) {
      console.error('Error fetching spotlight picks:', error);
      return NextResponse.json({ 
        success: false, 
        error: `Failed to fetch spotlight picks: ${error.message}` 
      }, { status: 500 });
    }

    // Transform the data to match our interface
    const spotlightPicks: SpotlightPick[] = (rawSpotlightPicks || []).map((pick: any) => ({
      id: pick.id,
      position: pick.position,
      productId: pick.product_id,
      customTitle: pick.custom_title,
      customDescription: pick.custom_description,
      customImageUrl: pick.custom_image_url,
      customPrice: pick.custom_price,
      isCustom: pick.is_custom,
      isActive: pick.is_active,
      createdAt: new Date(pick.created_at),
      updatedAt: new Date(pick.updated_at),
              product: pick.Product ? {
          id: pick.Product.id,
          name: pick.Product.name,
          description: pick.Product.description,
          images: pick.Product.images || [],
          price: pick.Product.price,
          slug: pick.Product.slug,
          category: pick.Product.Category ? {
            name: pick.Product.Category.name,
            slug: pick.Product.Category.slug,
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
    
    // Validate the request body
    const validatedData = spotlightPickSchema.parse(body);

    // Additional validation
    if (validatedData.isCustom) {
      if (!validatedData.customTitle) {
        return NextResponse.json({ 
          success: false, 
          error: 'Custom title is required for custom spotlight picks' 
        }, { status: 400 });
      }
    } else {
      if (!validatedData.productId) {
        return NextResponse.json({ 
          success: false, 
          error: 'Product ID is required for product-based spotlight picks' 
        }, { status: 400 });
      }
    }

    // Upsert the spotlight pick
    const { data: spotlightPick, error } = await supabase
      .from('spotlight_picks')
      .upsert({
        position: validatedData.position,
        product_id: validatedData.isCustom ? null : validatedData.productId,
        custom_title: validatedData.isCustom ? validatedData.customTitle : null,
        custom_description: validatedData.isCustom ? validatedData.customDescription : null,
        custom_image_url: validatedData.isCustom ? validatedData.customImageUrl : null,
        custom_price: validatedData.isCustom ? validatedData.customPrice : null,
        is_custom: validatedData.isCustom,
        is_active: validatedData.isActive,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'position',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting spotlight pick:', error);
      return NextResponse.json({ 
        success: false, 
        error: `Failed to save spotlight pick: ${error.message}` 
      }, { status: 500 });
    }

    // Transform response
    const transformedPick: SpotlightPick = {
      id: spotlightPick.id,
      position: spotlightPick.position,
      productId: spotlightPick.product_id,
      customTitle: spotlightPick.custom_title,
      customDescription: spotlightPick.custom_description,
      customImageUrl: spotlightPick.custom_image_url,
      customPrice: spotlightPick.custom_price,
      isCustom: spotlightPick.is_custom,
      isActive: spotlightPick.is_active,
      createdAt: new Date(spotlightPick.created_at),
      updatedAt: new Date(spotlightPick.updated_at),
    };

    return NextResponse.json({ 
      success: true, 
      data: transformedPick,
      message: 'Spotlight pick saved successfully' 
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        success: false, 
        error: `Validation error: ${error.errors.map(e => e.message).join(', ')}` 
      }, { status: 400 });
    }

    console.error('Error in POST /api/admin/spotlight-picks:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}

// DELETE: Remove a spotlight pick (set to inactive)
export async function DELETE(request: NextRequest): Promise<NextResponse<SpotlightAPIResponse>> {
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
    const position = searchParams.get('position');

    if (!position) {
      return NextResponse.json({ 
        success: false, 
        error: 'Position parameter is required' 
      }, { status: 400 });
    }

    const positionNumber = parseInt(position);
    if (isNaN(positionNumber) || positionNumber < 1 || positionNumber > 4) {
      return NextResponse.json({ 
        success: false, 
        error: 'Position must be between 1 and 4' 
      }, { status: 400 });
    }

    // Update spotlight pick to be inactive and reset custom fields
    const { error } = await supabase
      .from('spotlight_picks')
      .update({
        product_id: null,
        custom_title: null,
        custom_description: null,
        custom_image_url: null,
        custom_price: null,
        is_custom: false,
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('position', positionNumber);

    if (error) {
      console.error('Error clearing spotlight pick:', error);
      return NextResponse.json({ 
        success: false, 
        error: `Failed to clear spotlight pick: ${error.message}` 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Spotlight pick cleared successfully' 
    });

  } catch (error) {
    console.error('Error in DELETE /api/admin/spotlight-picks:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
} 