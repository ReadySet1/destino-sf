import { MetadataRoute } from 'next';
import { PrismaClient } from '@prisma/client';
import { withRetry } from '@/lib/db-unified';
import { isBuildTime } from '@/lib/build-time-utils';
import { logger } from '@/utils/logger';

// Create isolated Prisma client for sitemap generation
const createSitemapPrismaClient = () => {
  return new PrismaClient({
    log: ['error'],
    errorFormat: 'minimal',
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
};

/**
 * Sitemap for catering products only
 * These products are intentionally excluded from the main sitemap
 * to prevent them from appearing in general product searches
 */
export default async function cateringSitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : process.env.NEXT_PUBLIC_APP_URL || 'https://destinosf.com';

  // Static catering pages
  const staticCateringPages = [
    {
      url: `${baseUrl}/catering`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/catering/browse-options`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/catering/a-la-carte`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/catering/packages`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/catering/boxed-lunches`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/catering/menu`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact-catering`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
  ];

  // During build time, return static pages only
  if (isBuildTime()) {
    if (process.env.BUILD_DEBUG === 'true') {
      logger.info('🔧 Build-time detected: Using static catering sitemap');
    }
    return staticCateringPages;
  }

  let prismaClient: PrismaClient | null = null;

  try {
    prismaClient = createSitemapPrismaClient();

    // Get catering product pages (categories that start with "CATERING-")
    const cateringProducts = await withRetry(
      () =>
        prismaClient!.product.findMany({
          where: {
            active: true,
            category: {
              slug: {
                startsWith: 'catering-',
              },
            },
          },
          select: {
            slug: true,
            updatedAt: true,
          },
        }),
      3,
      'catering sitemap product query'
    );

    const cateringProductPages = cateringProducts.map(product => ({
      url: `${baseUrl}/products/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.5, // Lower priority - catering-specific
    }));

    if (process.env.BUILD_DEBUG === 'true') {
      logger.info(
        `✅ Generated catering sitemap with ${staticCateringPages.length} static pages and ${cateringProductPages.length} catering product pages`
      );
    }

    return [...staticCateringPages, ...cateringProductPages];
  } catch (error) {
    logger.error('❌ Error generating catering sitemap:', error);
    return staticCateringPages;
  } finally {
    if (prismaClient) {
      try {
        await prismaClient.$disconnect();
        if (process.env.BUILD_DEBUG === 'true') {
          logger.info('✅ Catering sitemap Prisma client disconnected');
        }
      } catch (disconnectError) {
        logger.warn('⚠️ Error disconnecting catering sitemap Prisma client:', disconnectError);
      }
    }
  }
}
