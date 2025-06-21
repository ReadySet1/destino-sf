import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { SpotlightAPIResponse, SpotlightPick } from '@/types/spotlight';

// GET: Fetch active spotlight picks for public display
export async function GET(request: NextRequest): Promise<NextResponse<SpotlightAPIResponse<SpotlightPick[]>>> {
  try {
    const supabase = await createClient();

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
      .eq('is_active', true)
      .order('position');

    if (error) {
      console.error('Error fetching spotlight picks:', error);
      return NextResponse.json({ 
        success: false, 
        error: `Failed to fetch spotlight picks: ${error.message}` 
      }, { status: 500 });
    }

    // Transform the data to match our interface
    const spotlightPicks: SpotlightPick[] = (rawSpotlightPicks || [])
      .map((pick: any) => ({
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
    console.error('Error in GET /api/spotlight-picks:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
} 