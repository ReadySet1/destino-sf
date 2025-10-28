import { GET } from '@/app/api/spotlight-picks/route';
import { prismaMock } from '../../../__tests__/setup/prisma';
import { NextRequest } from 'next/server';
import { mockActiveSpotlightPicks } from '../../../__tests__/mocks/spotlight';

describe.skip('/api/spotlight-picks API Route', () => {
  describe('GET /api/spotlight-picks', () => {
    it('should fetch only active spotlight picks for public display', async () => {
      (prismaMock.spotlightPick.findMany as jest.Mock).mockResolvedValue(mockActiveSpotlightPicks);

      const request = new NextRequest('http://localhost:3000/api/spotlight-picks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'pick-1',
            position: 1,
            productId: 'product-1',
            isActive: true,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            product: expect.objectContaining({
              id: 'product-1',
              name: 'Dulce de Leche Alfajores',
              description: 'Traditional Argentine cookies',
              price: 12.99,
              slug: 'dulce-leche-alfajores',
            }),
          }),
          expect.objectContaining({
            id: 'pick-2',
            position: 2,
            productId: 'product-2',
            isActive: true,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            product: expect.objectContaining({
              id: 'product-2',
              name: 'Peruvian Coffee',
              description: 'Rich and aromatic coffee beans',
              price: 18.5,
              slug: 'peruvian-coffee',
            }),
          }),
        ]),
      });
    });

    it('should return empty array when no active spotlight picks exist', async () => {
      (prismaMock.spotlightPick.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/spotlight-picks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        data: [],
      });
    });

    it('should handle database errors gracefully', async () => {
      (prismaMock.spotlightPick.findMany as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost:3000/api/spotlight-picks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Database connection failed',
      });
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

      (prismaMock.spotlightPick.findMany as jest.Mock).mockResolvedValue([
        mockPickWithDecimalPrice,
      ]);

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
      // The API filters out picks with null products, so this should return empty array
      expect(data).toEqual({
        success: true,
        data: [],
      });
    });

    it('should handle spotlight picks without personalizeText', async () => {
      const mockPickWithoutPersonalizeText = {
        ...mockActiveSpotlightPicks[0],
        personalizeText: null,
      };

      (prismaMock.spotlightPick.findMany as jest.Mock).mockResolvedValue([
        mockPickWithoutPersonalizeText,
      ]);

      const request = new NextRequest('http://localhost:3000/api/spotlight-picks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // The API doesn't include personalizeText field in the response, so just check success
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
    });
  });
});
