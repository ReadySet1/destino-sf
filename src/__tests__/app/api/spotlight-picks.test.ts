import { GET } from '@/app/api/spotlight-picks/route';
import { prismaMock } from '../../../__tests__/setup/prisma';
import { NextRequest } from 'next/server';
import { mockActiveSpotlightPicks } from '../../../__tests__/mocks/spotlight';

describe('/api/spotlight-picks API Route', () => {
  describe('GET /api/spotlight-picks', () => {
    it('should fetch only active spotlight picks for public display', async () => {
      (prismaMock.spotlightPick.findMany as jest.Mock).mockResolvedValue(mockActiveSpotlightPicks);

      const request = new NextRequest('http://localhost:3000/api/spotlight-picks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockActiveSpotlightPicks);
    });

    it('should return empty array when no active spotlight picks exist', async () => {
      (prismaMock.spotlightPick.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/spotlight-picks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      (prismaMock.spotlightPick.findMany as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/spotlight-picks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to fetch spotlight picks' });
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

      (prismaMock.spotlightPick.findMany as jest.Mock).mockResolvedValue([mockPickWithDecimalPrice]);

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

      (prismaMock.spotlightPick.findMany as jest.Mock).mockResolvedValue([mockPickWithNullProduct]);

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

      (prismaMock.spotlightPick.findMany as jest.Mock).mockResolvedValue([mockPickWithoutPersonalizeText]);

      const request = new NextRequest('http://localhost:3000/api/spotlight-picks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data[0].personalizeText).toBeNull();
    });
  });
}); 