import { MetadataRoute } from 'next';
import { prisma, withRetry } from '@/lib/db-unified';
import { isBuildTime } from '@/lib/build-time-utils';
import { logger } from '@/utils/logger';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : process.env.NEXT_PUBLIC_APP_URL || 'https://destinosf.com';

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/menu`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/catering`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    // Catering sub-pages
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

  // During build time or if database is unavailable, return static pages only
  if (isBuildTime()) {
    // Only log in debug mode to reduce build noise
    if (process.env.BUILD_DEBUG === 'true') {
      logger.info('🔧 Build-time detected: Using static sitemap without dynamic product pages');
    }
    return staticPages;
  }

  // Use unified Prisma client with built-in retry logic and connection management
  // Fixes DESTINO-SF-5: PrismaClientInitializationError on cold starts
  try {
    // Dynamic product pages - ONLY include regular products (not catering)
    // Catering products should not appear in general search results
    const products = await withRetry(
      () =>
        prisma.product.findMany({
          where: {
            active: true,
            category: {
              slug: {
                in: ['alfajores', 'empanadas'], // Only regular product categories
              },
            },
          },
          select: {
            slug: true,
            updatedAt: true,
          },
        }),
      3, // maxRetries
      'sitemap product query'
    );

    const productPages = products.map(product => ({
      url: `${baseUrl}/products/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7, // Higher priority for main products
    }));

    // Only log success in debug mode to reduce build noise
    if (process.env.BUILD_DEBUG === 'true') {
      logger.info(
        `✅ Generated sitemap with ${staticPages.length} static pages and ${productPages.length} product pages`
      );
    }
    return [...staticPages, ...productPages];
  } catch (error) {
    logger.error('❌ Error generating sitemap:', error);
    // Return static pages if database query fails
    return staticPages;
  }
}
