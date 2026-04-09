import { SpotlightPick } from '@/types/spotlight';
import { prisma } from '@/lib/db-unified';

export async function getSpotlightPicks(): Promise<SpotlightPick[]> {
  // The prisma proxy already wraps every query in withRetry, so no need for an extra layer
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

  return rawSpotlightPicks
    .filter(pick => pick.product && pick.productId)
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
