import { MetadataRoute } from 'next';
import { PrismaClient } from '@prisma/client';
import { withPreparedStatementHandling } from '@/lib/db';

// Create isolated Prisma client for sitemap generation to avoid prepared statement conflicts
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : 'https://development.destinosf.com';

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

  // Use isolated Prisma client to avoid prepared statement conflicts during build
  let prismaClient: PrismaClient | null = null;
  
  try {
    prismaClient = createSitemapPrismaClient();
    
    // Dynamic product pages with retry logic and error handling
    const products = await withPreparedStatementHandling(
      () => prismaClient!.product.findMany({
        where: {
          active: true,
        },
        select: {
          slug: true,
          updatedAt: true,
        },
      }),
      'sitemap product query'
    );

    const productPages = products.map(product => ({
      url: `${baseUrl}/products/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

    return [...staticPages, ...productPages];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    // Return static pages if database query fails
    return staticPages;
  } finally {
    // Always disconnect the isolated client
    if (prismaClient) {
      try {
        await prismaClient.$disconnect();
      } catch (disconnectError) {
        console.warn('Error disconnecting sitemap Prisma client:', disconnectError);
      }
    }
  }
}
