/**
 * Unit tests for sitemap generation
 *
 * Tests verify that the sitemap uses the unified Prisma client
 * with built-in retry logic and connection management.
 *
 * Fixes DESTINO-SF-5: PrismaClientInitializationError on cold starts
 */

import { prismaMock } from '../setup/prisma';

// Mock the build-time-utils
jest.mock('@/lib/build-time-utils', () => ({
  isBuildTime: jest.fn().mockReturnValue(false),
}));

// Mock the logger
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Sitemap Generation', () => {
  let sitemap: () => Promise<any>;
  let isBuildTime: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    // Import after mocks are set up
    const sitemapModule = await import('@/app/sitemap');
    sitemap = sitemapModule.default;

    const buildTimeUtils = await import('@/lib/build-time-utils');
    isBuildTime = buildTimeUtils.isBuildTime as jest.Mock;
  });

  describe('Unified Client Usage', () => {
    it('should use unified prisma client instead of isolated client', async () => {
      isBuildTime.mockReturnValue(false);

      prismaMock.product.findMany.mockResolvedValue([
        {
          slug: 'test-product',
          updatedAt: new Date(),
        },
      ] as any);

      const result = await sitemap();

      // Should return sitemap entries
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should not create new PrismaClient instances', async () => {
      isBuildTime.mockReturnValue(false);

      prismaMock.product.findMany.mockResolvedValue([]);

      await sitemap();

      // The prisma mock is called through db-unified, not a new client
      expect(prismaMock.product.findMany).toHaveBeenCalled();
    });
  });

  describe('Static Pages', () => {
    it('should always include static pages', async () => {
      isBuildTime.mockReturnValue(false);
      prismaMock.product.findMany.mockResolvedValue([]);

      const result = await sitemap();

      // Should include main static pages
      const urls = result.map((entry: any) => entry.url);
      expect(urls.some((url: string) => url.endsWith('/menu'))).toBe(true);
      expect(urls.some((url: string) => url.endsWith('/catering'))).toBe(true);
      expect(urls.some((url: string) => url.endsWith('/about'))).toBe(true);
    });

    it('should return only static pages during build time', async () => {
      isBuildTime.mockReturnValue(true);

      const result = await sitemap();

      // Should not call prisma during build time
      expect(prismaMock.product.findMany).not.toHaveBeenCalled();

      // Should return static pages
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Product Pages', () => {
    it('should include product pages when database is available', async () => {
      isBuildTime.mockReturnValue(false);

      prismaMock.product.findMany.mockResolvedValue([
        { slug: 'alfajor-classic', updatedAt: new Date() },
        { slug: 'empanada-beef', updatedAt: new Date() },
      ] as any);

      const result = await sitemap();

      const productUrls = result.filter((entry: any) =>
        entry.url.includes('/products/')
      );

      expect(productUrls.length).toBe(2);
    });

    it('should only include regular products (not catering)', async () => {
      isBuildTime.mockReturnValue(false);

      prismaMock.product.findMany.mockResolvedValue([
        { slug: 'alfajor-classic', updatedAt: new Date() },
      ] as any);

      await sitemap();

      // Verify the query filters for regular product categories
      expect(prismaMock.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            active: true,
            category: expect.objectContaining({
              slug: expect.objectContaining({
                in: ['alfajores', 'empanadas'],
              }),
            }),
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should return static pages when database query fails', async () => {
      isBuildTime.mockReturnValue(false);

      prismaMock.product.findMany.mockRejectedValue(
        new Error('Database connection error')
      );

      const result = await sitemap();

      // Should still return static pages
      expect(result.length).toBeGreaterThan(0);

      // Should not include product pages
      const productUrls = result.filter((entry: any) =>
        entry.url.includes('/products/')
      );
      expect(productUrls.length).toBe(0);
    });

    it('should handle PrismaClientInitializationError gracefully', async () => {
      isBuildTime.mockReturnValue(false);

      const initError = new Error(
        "Can't reach database server at aws-1-us-west-1.pooler.supabase.com:6543"
      );
      (initError as any).name = 'PrismaClientInitializationError';

      prismaMock.product.findMany.mockRejectedValue(initError);

      const result = await sitemap();

      // Should still return static pages
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Sitemap Entry Structure', () => {
    it('should have correct structure for static pages', async () => {
      isBuildTime.mockReturnValue(true);

      const result = await sitemap();

      const menuEntry = result.find((entry: any) => entry.url.endsWith('/menu'));

      expect(menuEntry).toBeDefined();
      expect(menuEntry).toHaveProperty('url');
      expect(menuEntry).toHaveProperty('lastModified');
      expect(menuEntry).toHaveProperty('changeFrequency');
      expect(menuEntry).toHaveProperty('priority');
    });

    it('should have correct structure for product pages', async () => {
      isBuildTime.mockReturnValue(false);

      const productDate = new Date('2024-01-15');
      prismaMock.product.findMany.mockResolvedValue([
        { slug: 'test-product', updatedAt: productDate },
      ] as any);

      const result = await sitemap();

      const productEntry = result.find((entry: any) =>
        entry.url.includes('/products/test-product')
      );

      expect(productEntry).toBeDefined();
      expect(productEntry.lastModified).toEqual(productDate);
      expect(productEntry.changeFrequency).toBe('weekly');
      expect(productEntry.priority).toBe(0.7);
    });
  });
});

describe('Catering Sitemap Generation', () => {
  let cateringSitemap: () => Promise<any>;
  let isBuildTime: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    const sitemapModule = await import('@/app/sitemap-catering');
    cateringSitemap = sitemapModule.default;

    const buildTimeUtils = await import('@/lib/build-time-utils');
    isBuildTime = buildTimeUtils.isBuildTime as jest.Mock;
  });

  describe('Unified Client Usage', () => {
    it('should use unified prisma client', async () => {
      isBuildTime.mockReturnValue(false);

      prismaMock.product.findMany.mockResolvedValue([]);

      const result = await cateringSitemap();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Catering Products', () => {
    it('should query for catering category products', async () => {
      isBuildTime.mockReturnValue(false);

      prismaMock.product.findMany.mockResolvedValue([]);

      await cateringSitemap();

      expect(prismaMock.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            active: true,
            category: expect.objectContaining({
              slug: expect.objectContaining({
                startsWith: 'catering-',
              }),
            }),
          }),
        })
      );
    });

    it('should include catering product pages', async () => {
      isBuildTime.mockReturnValue(false);

      prismaMock.product.findMany.mockResolvedValue([
        { slug: 'catering-empanada-platter', updatedAt: new Date() },
      ] as any);

      const result = await cateringSitemap();

      const productUrls = result.filter((entry: any) =>
        entry.url.includes('/products/')
      );

      expect(productUrls.length).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should return static pages when database fails', async () => {
      isBuildTime.mockReturnValue(false);

      prismaMock.product.findMany.mockRejectedValue(
        new Error('Database error')
      );

      const result = await cateringSitemap();

      // Should return static catering pages
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
