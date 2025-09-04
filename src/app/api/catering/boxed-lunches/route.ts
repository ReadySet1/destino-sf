import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { safeQuery } from '@/lib/db-utils';
import { logger } from '@/utils/logger';
import { 
  BoxedLunchEntree, 
  BoxedLunchTierModel, 
  BoxedLunchTierWithEntrees 
} from '@/types/catering';

export const revalidate = 0; // Disable caching for real-time data

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode'); // 'legacy' for old items, 'build-your-own' for new feature

    logger.info(`📦 Fetching boxed lunch data (mode: ${mode || 'legacy'})...`);

    if (mode === 'build-your-own') {
      // New Build Your Own Box functionality
      return await getBuildYourOwnBoxData();
    } else {
      // Legacy boxed lunch items
      return await getLegacyBoxedLunchItems();
    }
  } catch (error) {
    logger.error('❌ Failed to fetch boxed lunch data:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch boxed lunch data',
        items: []
      },
      { status: 500 }
    );
  }
}

async function getLegacyBoxedLunchItems() {
  const products = await safeQuery(() =>
    prisma.product.findMany({
      where: {
        active: true,
        category: {
          name: {
            in: ['CATERING- BOXED LUNCHES'],
            mode: 'insensitive'
          }
        }
      },
      include: {
        category: true,
        variants: {
          select: {
            id: true,
            name: true,
            price: true,
          }
        }
      },
      orderBy: [
        { ordinal: 'asc' },  // Admin-controlled order first
        { name: 'asc' }      // Alphabetical fallback
      ]
    })
  );

  logger.info(`✅ Found ${products.length} legacy boxed lunch products`);

  // Transform to match the BoxedLunchItem interface
  const transformedItems = products.map(product => {
    // Parse dietary information from description
    const description = product.description || '';
    const dietaryPreferences = product.dietaryPreferences || [];
    
    // Extract dietary info from description text (e.g., "-gf", "-vg", "-vegan")
    const isGlutenFree = dietaryPreferences.includes('gluten-free') || 
                        description.toLowerCase().includes('-gf') || 
                        description.toLowerCase().includes('gluten free');
    
    const isVegan = dietaryPreferences.includes('vegan') || 
                   description.toLowerCase().includes('-vg') || 
                   description.toLowerCase().includes('vegan');
    
    const isVegetarian = dietaryPreferences.includes('vegetarian') || 
                        description.toLowerCase().includes('vegetarian') || 
                        isVegan; // Vegan items are also vegetarian

    // Check if this is the Tropical Salad that needs modifiers
    const isTropicalSalad = product.name.toLowerCase().includes('tropical salad');
    
    const modifiers = isTropicalSalad ? [
      {
        id: 'queso_fresco',
        name: 'Add Queso Fresco (4oz)',
        price: 2.00,
        dietaryInfo: 'gf'
      },
      {
        id: 'sirloin_steak', 
        name: 'Add Sirloin Steak (4oz)',
        price: 4.00,
        dietaryInfo: 'gf'
      },
      {
        id: 'chicken_mojo',
        name: 'Add Chicken Mojo (4oz)', 
        price: 3.00,
        dietaryInfo: 'gf'
      }
    ] : [];

    return {
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: Number(product.price),
      squareId: product.squareId || '',
      imageUrl: product.images?.[0] || null,
      dietaryPreferences: dietaryPreferences,
      isGlutenFree,
      isVegan,
      isVegetarian,
      modifiers: modifiers.length > 0 ? modifiers : undefined
    };
  });

  return NextResponse.json({
    success: true,
    items: transformedItems
  });
}

async function getBuildYourOwnBoxData() {
  // Fetch both tiers and entrees in parallel with connection management
  const [tiers, entreeProducts] = await Promise.all([
    // Get tier configurations from the new table
    safeQuery(() =>
      prisma.$queryRaw<BoxedLunchTierModel[]>`
        SELECT id, tier_number as "tierNumber", name, price_cents as "priceCents", 
               protein_amount as "proteinAmount", sides, active, created_at as "createdAt", 
               updated_at as "updatedAt"
        FROM boxed_lunch_tiers 
        WHERE active = true 
        ORDER BY tier_number
      `
    ),
    
    // Get entree products from the new category
    safeQuery(() =>
      prisma.product.findMany({
        where: {
          active: true,
          category: {
            name: {
              in: ['CATERING- BOXED LUNCH ENTREES'],
              mode: 'insensitive'
            }
          }
        },
        include: {
          category: true,
          variants: {
            select: {
              id: true,
              name: true,
              price: true,
            }
          }
        },
        orderBy: [
          { ordinal: 'asc' },
          { name: 'asc' }
        ]
      })
    )
  ]);

  logger.info(`✅ Found ${tiers.length} tiers and ${entreeProducts.length} entree products`);

  // Transform entree products to BoxedLunchEntree format
  const entrees: BoxedLunchEntree[] = entreeProducts.map((product, index) => ({
    id: product.id,
    squareId: product.squareId,
    name: product.name,
    description: product.description || undefined,
    imageUrl: product.images?.[0] || null,
    category: 'BOXED_LUNCH_ENTREE' as const,
    available: product.active,
    sortOrder: product.ordinal ? Number(product.ordinal) : index,
    dietaryPreferences: product.dietaryPreferences || [],
    calories: product.calories || undefined,
    ingredients: product.ingredients || undefined,
    allergens: product.allergens || undefined,
  }));

  // Combine tiers with entrees
  const tiersWithEntrees: BoxedLunchTierWithEntrees[] = tiers.map(tier => ({
    tier: `TIER_${tier.tierNumber}` as any, // Map to enum
    name: tier.name,
    price: tier.priceCents / 100, // Convert cents to dollars
    proteinAmount: tier.proteinAmount || '',
    sides: Array.isArray(tier.sides) ? tier.sides : [],
    availableEntrees: entrees // All entrees available for all tiers
  }));

  return NextResponse.json({
    success: true,
    tiers: tiersWithEntrees,
    entrees: entrees,
    mode: 'build-your-own'
  });
}
