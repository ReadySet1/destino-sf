import { GET } from '@/app/api/spotlight-picks/route';
import { prisma } from '@/lib/db';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/db');

describe('/api/spotlight-picks API Route', () => {
  const mockActiveSpotlightPicks = [
    {
      id: 'pick-1',
      position: 1,
      productId: 'product-123',
      customTitle: null,
      customDescription: null,
      customImageUrl: null,
      customPrice: null,
      personalizeText: 'Perfect for your special occasion',
      isCustom: false,
      isActive: true,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      product: {
        id: 'product-123',
        name: 'Dulce de Leche Alfajores',
        description: 'Traditional Argentine cookies',
        images: ['https://example.com/alfajor.jpg'],
        price: 12.99,
        slug: 'alfajores-dulce-de-leche',
        category: {
          name: 'ALFAJORES',
          slug: 'alfajores',
        },
      },
    },
    {
      id: 'pick-2',
      position: 2,
      productId: null,
      customTitle: 'Custom Empanadas Special',
      customDescription: 'Hand-made empanadas with premium fillings',
      customImageUrl: 'https://example.com/custom-empanadas.jpg',
      customPrice: 18.99,
      personalizeText: 'Made fresh daily just for you!',
      isCustom: true,
      isActive: true,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      product: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/spotlight-picks', () => {
    it('should fetch only active spotlight picks for public display', async () => {
      (prisma.spotlightPick.findMany as jest.Mock).mockResolvedValue(mockActiveSpotlightPicks);

      const request = new NextRequest('http://localhost:3000/api/spotlight-picks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);

      // Test product-based pick
      expect(data.data[0]).toEqual({
        id: 'pick-1',
        position: 1,
        productId: 'product-123',
        customTitle: null,
        customDescription: null,
        customImageUrl: null,
        customPrice: null,
        personalizeText: 'Perfect for your special occasion',
        isCustom: false,
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        product: {
          id: 'product-123',
          name: 'Dulce de Leche Alfajores',
          description: 'Traditional Argentine cookies',
          images: ['https://example.com/alfajor.jpg'],
          price: 12.99,
          slug: 'alfajores-dulce-de-leche',
          category: {
            name: 'ALFAJORES',
            slug: 'alfajores',
          },
        },
      });

      // Test custom pick
      expect(data.data[1]).toEqual({
        id: 'pick-2',
        position: 2,
        productId: null,
        customTitle: 'Custom Empanadas Special',
        customDescription: 'Hand-made empanadas with premium fillings',
        customImageUrl: 'https://example.com/custom-empanadas.jpg',
        customPrice: 18.99,
        personalizeText: 'Made fresh daily just for you!',
        isCustom: true,
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        product: null,
      });

      expect(prisma.spotlightPick.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
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
        orderBy: { position: 'asc' },
      });
    });

    it('should return empty array when no active spotlight picks exist', async () => {
      (prisma.spotlightPick.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/spotlight-picks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      (prisma.spotlightPick.findMany as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/spotlight-picks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database connection failed');
    });

    it('should properly transform decimal prices to numbers', async () => {
      const mockPickWithDecimalPrice = {
        id: 'pick-1',
        position: 1,
        productId: 'product-123',
        customTitle: null,
        customDescription: null,
        customImageUrl: null,
        customPrice: null,
        personalizeText: 'Perfect for your special occasion',
        isCustom: false,
        isActive: true,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        product: {
          id: 'product-123',
          name: 'Dulce de Leche Alfajores',
          description: 'Traditional Argentine cookies',
          images: ['https://example.com/alfajor.jpg'],
          price: { toNumber: () => 12.99 }, // Mock Prisma Decimal
          slug: 'alfajores-dulce-de-leche',
          category: {
            name: 'ALFAJORES',
            slug: 'alfajores',
          },
        },
      };

      (prisma.spotlightPick.findMany as jest.Mock).mockResolvedValue([mockPickWithDecimalPrice]);

      const request = new NextRequest('http://localhost:3000/api/spotlight-picks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data[0].product.price).toBe(12.99);
      expect(typeof data.data[0].product.price).toBe('number');
    });

    it('should handle spotlight picks with null product data', async () => {
      const mockPickWithNullProduct = {
        ...mockActiveSpotlightPicks[1],
        product: null,
      };

      (prisma.spotlightPick.findMany as jest.Mock).mockResolvedValue([mockPickWithNullProduct]);

      const request = new NextRequest('http://localhost:3000/api/spotlight-picks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data[0].product).toBeNull();
    });

    it('should handle spotlight picks without personalizeText', async () => {
      const mockPickWithoutPersonalizeText = {
        ...mockActiveSpotlightPicks[0],
        personalizeText: null,
      };

      (prisma.spotlightPick.findMany as jest.Mock).mockResolvedValue([mockPickWithoutPersonalizeText]);

      const request = new NextRequest('http://localhost:3000/api/spotlight-picks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data[0].personalizeText).toBeNull();
    });
  });
}); 