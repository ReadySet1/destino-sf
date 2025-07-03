// Force dynamic rendering to avoid build-time database queries
export const dynamic = 'force-dynamic';

import React from 'react';
import { SpotlightPicksManager } from '@/components/admin/SpotlightPicks/SpotlightPicksManager';
import { SpotlightPick } from '@/types/spotlight';
import { prisma } from '@/lib/db';

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

    console.log('[DEBUG] Raw picks count:', rawSpotlightPicks.length);

    // Transform the data to match our interface
    const spotlightPicks: SpotlightPick[] = rawSpotlightPicks
      .filter((pick) => pick.product && pick.productId) // Extra safety filter
      .map((pick) => ({
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
          category: pick.product!.category ? {
            name: pick.product!.category.name,
            slug: pick.product!.category.slug,
          } : undefined,
        },
      }));

    console.log('[DEBUG] Transformed picks:', spotlightPicks.length);
    return spotlightPicks;
  } catch (error) {
    console.error('[DEBUG] Error in getSpotlightPicks:', error);
    // Return empty array for fallback
    return [];
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
    // Provide empty array as fallback - the component will handle empty state
    initialPicks = [];
  }

  return <SpotlightPicksManager initialPicks={initialPicks} />;
} 