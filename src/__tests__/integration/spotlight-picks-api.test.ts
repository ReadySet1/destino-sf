/**
 * Integration tests for Spotlight Picks API
 * Tests the Monthly Subscription coming soon functionality
 */
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/spotlight-picks/route';
import { prisma } from '@/lib/db';
import { SpotlightPick } from '@/types/spotlight';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    spotlightPick: {
      findMany: jest.fn(),
    },
  },
}));

const mockFindMany = prisma.spotlightPick.findMany as jest.MockedFunction<any>;

describe('Spotlight Picks API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/spotlight-picks', () => {
    it('should return Monthly Subscription as active spotlight pick', async () => {
      const mockDbData = [
        {
          id: 'pick-subscription',
          position: 4,
          productId: null,
          customTitle: 'Monthly Subscription',
          customDescription: null,
          customImageUrl: '/images/assets/2Recurso 20.png',
          customPrice: { toNumber: () => 15.99 },
          personalizeText: null,
          isCustom: true,
          isActive: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          product: null,
        },
      ];

      mockFindMany.mockResolvedValue(mockDbData as any);

      const request = new NextRequest('http://localhost/api/spotlight-picks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      
      const spotlightPick = data.data[0];
      expect(spotlightPick.customTitle).toBe('Monthly Subscription');
      expect(spotlightPick.position).toBe(4);
      expect(spotlightPick.isCustom).toBe(true);
      expect(spotlightPick.isActive).toBe(true);
      expect(spotlightPick.customPrice).toBe(15.99);
    });

    it('should filter out inactive spotlight picks', async () => {
      const mockDbData = [
        {
          id: 'pick-active',
          position: 1,
          customTitle: 'Active Product',
          isActive: true,
          isCustom: true,
          product: null,
        },
        {
          id: 'pick-inactive',
          position: 2,
          customTitle: 'Inactive Product',
          isActive: false,
          isCustom: true,
          product: null,
        },
      ];

      mockFindMany.mockResolvedValue(mockDbData as any);

      const request = new NextRequest('http://localhost/api/spotlight-picks');
      const response = await GET(request);
      const data = await response.json();

      expect(data.data).toHaveLength(1);
      expect(data.data[0].customTitle).toBe('Active Product');
    });

    it('should handle mixed product and custom spotlight picks', async () => {
      const mockDbData = [
        {
          id: 'pick-product',
          position: 1,
          productId: 'product-123',
          customTitle: null,
          isCustom: false,
          isActive: true,
          product: {
            id: 'product-123',
            name: 'Alfajores',
            description: 'Delicious cookies',
            images: ['/images/alfajores.jpg'],
            price: { toNumber: () => 12.99 },
            slug: 'alfajores',
            category: {
              name: 'ALFAJORES',
              slug: 'alfajores',
            },
          },
        },
        {
          id: 'pick-subscription',
          position: 4,
          productId: null,
          customTitle: 'Monthly Subscription',
          isCustom: true,
          isActive: true,
          product: null,
        },
      ];

      mockFindMany.mockResolvedValue(mockDbData as any);

      const request = new NextRequest('http://localhost/api/spotlight-picks');
      const response = await GET(request);
      const data = await response.json();

      expect(data.data).toHaveLength(2);
      
      const productPick = data.data.find((p: SpotlightPick) => p.position === 1);
      const subscriptionPick = data.data.find((p: SpotlightPick) => p.position === 4);
      
      expect(productPick?.isCustom).toBe(false);
      expect(productPick?.product?.name).toBe('Alfajores');
      
      expect(subscriptionPick?.isCustom).toBe(true);
      expect(subscriptionPick?.customTitle).toBe('Monthly Subscription');
    });

    it('should handle database errors gracefully', async () => {
      mockFindMany.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost/api/spotlight-picks');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Database connection failed');
    });
  });
}); 