import { GET, POST, DELETE } from '@/app/api/admin/spotlight-picks/route';
import { prisma } from '@/lib/db-unified';
import { createClient } from '@/utils/supabase/server';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/db-unified', () => ({
  prisma: {
    profile: {
      findUnique: jest.fn(),
    },
    spotlightPick: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
  },
  withRetry: jest.fn((fn: () => Promise<unknown>) => fn()),
}));
jest.mock('@/utils/supabase/server');
jest.mock('next/headers', () => ({
  cookies: jest.fn(() =>
    Promise.resolve({
      getAll: () => [],
    })
  ),
}));

const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('/api/admin/spotlight-picks API Routes', () => {
  const mockSupabaseClient = {
    auth: {
      getUser: jest.fn(),
    },
  };

  const mockAdminProfile = {
    id: 'admin-123',
    role: 'ADMIN',
  };

  const mockSpotlightPick = {
    id: 'pick-123',
    position: 1,
    productId: 'product-123',
    customTitle: null,
    customDescription: null,
    customImageUrl: null,
    customPrice: null,
    personalizeText: 'Perfect for your special occasion',
    customLink: null,
    showNewFeatureModal: false,
    newFeatureTitle: null,
    newFeatureDescription: null,
    newFeatureBadgeText: null,
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedCreateClient.mockResolvedValue(mockSupabaseClient as any);
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-123' } },
      error: null,
    });
    (prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockAdminProfile);
  });

  describe('GET /api/admin/spotlight-picks', () => {
    it('should fetch all spotlight picks with product data for admin', async () => {
      (prisma.spotlightPick.findMany as jest.Mock).mockResolvedValue([mockSpotlightPick]);

      const request = new NextRequest('http://localhost:3000/api/admin/spotlight-picks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      // Verify the transformed data matches what the route returns
      expect(data.data[0]).toEqual({
        id: 'pick-123',
        position: 1,
        productId: 'product-123',
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

      expect(prisma.spotlightPick.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              productId: {
                not: undefined,
              },
            },
          ],
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
    });

    it('should return 401 for non-admin users', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        role: 'CUSTOMER',
      });

      const request = new NextRequest('http://localhost:3000/api/admin/spotlight-picks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 for unauthenticated users', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/spotlight-picks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('POST /api/admin/spotlight-picks', () => {
    // Use a valid UUID for productId as required by the schema
    const validProductId = '550e8400-e29b-41d4-a716-446655440000';

    const validRequestData = {
      position: 1,
      productId: validProductId,
      isActive: true,
    };

    it('should create a new product-based spotlight pick', async () => {
      const mockCreatedPick = {
        ...mockSpotlightPick,
        productId: validProductId,
        product: {
          ...mockSpotlightPick.product,
          id: validProductId,
        },
      };
      (prisma.spotlightPick.upsert as jest.Mock).mockResolvedValue(mockCreatedPick);

      const request = new NextRequest('http://localhost:3000/api/admin/spotlight-picks', {
        method: 'POST',
        body: JSON.stringify(validRequestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.position).toBe(1);
      expect(data.data.productId).toBe(validProductId);

      expect(prisma.spotlightPick.upsert).toHaveBeenCalledWith({
        where: { position: 1 },
        update: {
          productId: validProductId,
          isActive: true,
        },
        create: {
          position: 1,
          productId: validProductId,
          isActive: true,
        },
        include: expect.objectContaining({
          product: expect.any(Object),
        }),
      });
    });

    it('should return 400 for invalid position', async () => {
      const invalidData = {
        position: 5, // Invalid position (must be 1-4)
        productId: validProductId,
        isActive: true,
      };

      const request = new NextRequest('http://localhost:3000/api/admin/spotlight-picks', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 for missing productId', async () => {
      const invalidData = {
        position: 1,
        isActive: true,
      };

      const request = new NextRequest('http://localhost:3000/api/admin/spotlight-picks', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid productId format', async () => {
      const invalidData = {
        position: 1,
        productId: 'not-a-valid-uuid',
        isActive: true,
      };

      const request = new NextRequest('http://localhost:3000/api/admin/spotlight-picks', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 401 for non-admin users', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        role: 'CUSTOMER',
      });

      const request = new NextRequest('http://localhost:3000/api/admin/spotlight-picks', {
        method: 'POST',
        body: JSON.stringify(validRequestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('DELETE /api/admin/spotlight-picks', () => {
    it('should delete a spotlight pick at a specific position', async () => {
      (prisma.spotlightPick.delete as jest.Mock).mockResolvedValue({});

      const request = new NextRequest(
        'http://localhost:3000/api/admin/spotlight-picks?position=1',
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      expect(prisma.spotlightPick.delete).toHaveBeenCalledWith({
        where: { position: 1 },
      });
    });

    it('should return 400 for invalid position', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/admin/spotlight-picks?position=5',
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Valid position (1-4) is required');
    });

    it('should return 400 for missing position', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/spotlight-picks', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Valid position (1-4) is required');
    });

    it('should return 401 for non-admin users', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        role: 'CUSTOMER',
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/spotlight-picks?position=1',
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Database Error Handling', () => {
    it('should handle database errors in GET', async () => {
      (prisma.spotlightPick.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/spotlight-picks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database error');
    });

    it('should handle database errors in POST', async () => {
      (prisma.spotlightPick.upsert as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/spotlight-picks', {
        method: 'POST',
        body: JSON.stringify({
          position: 1,
          productId: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
          isActive: true,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database error');
    });

    it('should handle database errors in DELETE', async () => {
      (prisma.spotlightPick.delete as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest(
        'http://localhost:3000/api/admin/spotlight-picks?position=1',
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database error');
    });
  });
});
