import React from 'react';
import { SpotlightPicksManager } from '@/components/admin/SpotlightPicks/SpotlightPicksManager';
import { SpotlightPick } from '@/types/spotlight';
import { prisma } from '@/lib/prisma';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'Spotlight Picks | Admin Dashboard',
  description: 'Manage featured products for the homepage spotlight section',
};

// Remove admin check - let the layout handle it like other admin pages

// Fetch spotlight picks with product data
async function getSpotlightPicks(): Promise<SpotlightPick[]> {
  try {
    console.log('[DEBUG] Fetching spotlight picks...');

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

    console.log('[DEBUG] Raw picks count:', rawSpotlightPicks.length);

    // Transform the data to match our interface
    const spotlightPicks: SpotlightPick[] = rawSpotlightPicks.map((pick) => ({
      id: pick.id,
      position: pick.position as 1 | 2 | 3 | 4,
      productId: pick.productId,
      customTitle: pick.customTitle,
      customDescription: pick.customDescription,
      customImageUrl: pick.customImageUrl,
      customPrice: pick.customPrice ? Number(pick.customPrice) : null,
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