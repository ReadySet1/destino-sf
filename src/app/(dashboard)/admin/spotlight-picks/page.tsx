import React from 'react';
import { SpotlightPicksManager } from '@/components/admin/SpotlightPicks/SpotlightPicksManager';
import { SpotlightPick } from '@/types/spotlight';
import { createClient } from '@/utils/supabase/server';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'Spotlight Picks | Admin Dashboard',
  description: 'Manage featured products for the homepage spotlight section',
};

// Remove admin check - let the layout handle it like other admin pages

// Fetch spotlight picks with product data
async function getSpotlightPicks(): Promise<SpotlightPick[]> {
  const supabase = await createClient();
  
  try {
    console.log('[DEBUG] Fetching spotlight picks...');

    // First try to get basic data without joins to see if table exists
    const { data: basicPicks, error: basicError } = await supabase
      .from('spotlight_picks')
      .select('*')
      .order('position');

    console.log('[DEBUG] Basic picks query error:', basicError);
    console.log('[DEBUG] Basic picks count:', basicPicks?.length || 0);

    if (basicError) {
      console.error('Error fetching basic spotlight picks:', basicError);
      // Return empty array with default positions
      return [
        { id: '1', position: 1, productId: null, customTitle: null, customDescription: null, customImageUrl: null, customPrice: null, isCustom: false, isActive: false, createdAt: new Date(), updatedAt: new Date(), product: null },
        { id: '2', position: 2, productId: null, customTitle: null, customDescription: null, customImageUrl: null, customPrice: null, isCustom: false, isActive: false, createdAt: new Date(), updatedAt: new Date(), product: null },
        { id: '3', position: 3, productId: null, customTitle: null, customDescription: null, customImageUrl: null, customPrice: null, isCustom: false, isActive: false, createdAt: new Date(), updatedAt: new Date(), product: null },
        { id: '4', position: 4, productId: null, customTitle: null, customDescription: null, customImageUrl: null, customPrice: null, isCustom: false, isActive: false, createdAt: new Date(), updatedAt: new Date(), product: null }
      ];
    }

    // If basic query works, try with joins
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

    console.log('[DEBUG] Full picks query error:', error);
    console.log('[DEBUG] Full picks count:', rawSpotlightPicks?.length || 0);

    if (error) {
      console.error('Error fetching spotlight picks:', error);
      // Return the basic picks if join fails
      return (basicPicks || []).map((pick: any) => ({
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
        product: null,
      }));
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
        price: parseFloat(pick.Product.price) || 0,
        slug: pick.Product.slug,
        category: pick.Product.Category ? {
          name: pick.Product.Category.name,
          slug: pick.Product.Category.slug,
        } : undefined,
      } : null,
    }));

    console.log('[DEBUG] Transformed picks:', spotlightPicks.length);
    return spotlightPicks;
  } catch (error) {
    console.error('[DEBUG] Error in getSpotlightPicks:', error);
    // Return default empty positions
    return [
      { id: '1', position: 1, productId: null, customTitle: null, customDescription: null, customImageUrl: null, customPrice: null, isCustom: false, isActive: false, createdAt: new Date(), updatedAt: new Date(), product: null },
      { id: '2', position: 2, productId: null, customTitle: null, customDescription: null, customImageUrl: null, customPrice: null, isCustom: false, isActive: false, createdAt: new Date(), updatedAt: new Date(), product: null },
      { id: '3', position: 3, productId: null, customTitle: null, customDescription: null, customImageUrl: null, customPrice: null, isCustom: false, isActive: false, createdAt: new Date(), updatedAt: new Date(), product: null },
      { id: '4', position: 4, productId: null, customTitle: null, customDescription: null, customImageUrl: null, customPrice: null, isCustom: false, isActive: false, createdAt: new Date(), updatedAt: new Date(), product: null }
    ];
  }
}

export default async function SpotlightPicksPage() {
  // Skip admin check for now - let the system handle it like other admin pages
  // Fetch initial data with fallback
  let initialPicks: SpotlightPick[] = [];
  
  try {
    initialPicks = await getSpotlightPicks();
  } catch (error) {
    console.error('Failed to load spotlight picks:', error);
    // Provide fallback empty positions
    initialPicks = [
      { id: '1', position: 1, productId: null, customTitle: null, customDescription: null, customImageUrl: null, customPrice: null, isCustom: false, isActive: false, createdAt: new Date(), updatedAt: new Date(), product: null },
      { id: '2', position: 2, productId: null, customTitle: null, customDescription: null, customImageUrl: null, customPrice: null, isCustom: false, isActive: false, createdAt: new Date(), updatedAt: new Date(), product: null },
      { id: '3', position: 3, productId: null, customTitle: null, customDescription: null, customImageUrl: null, customPrice: null, isCustom: false, isActive: false, createdAt: new Date(), updatedAt: new Date(), product: null },
      { id: '4', position: 4, productId: null, customTitle: null, customDescription: null, customImageUrl: null, customPrice: null, isCustom: false, isActive: false, createdAt: new Date(), updatedAt: new Date(), product: null }
    ];
  }

  return (
    <>
      <Toaster 
        position="top-right" 
        richColors 
        closeButton
        expand={false}
      />
      <SpotlightPicksManager initialPicks={initialPicks} />
    </>
  );
} 