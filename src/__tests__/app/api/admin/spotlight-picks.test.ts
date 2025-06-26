import { GET, POST, DELETE } from '@/app/api/admin/spotlight-picks/route';
import { prisma } from '@/lib/db';
import { createClient } from '@/utils/supabase/server';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/db');
jest.mock('@/utils/supabase/server');
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({
    getAll: () => []
  })),
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
      expect(data.data[0]).toEqual({
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
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
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
    const validRequestData = {
      position: 1,
      isCustom: false,
      productId: 'product-123',
      isActive: true,
    };

    const validCustomRequestData = {
      position: 2,
      isCustom: true,
      customTitle: 'Custom Spotlight Pick',
      customDescription: 'This is a custom description',
      customImageUrl: 'https://example.com/custom-image.jpg',
      customPrice: 15.99,
      personalizeText: 'Made just for you!',
      isActive: true,
    };

    const validCustomLinkRequestData = {
      position: 3,
      isCustom: true,
      customTitle: 'Custom Link Product',
      customLink: 'https://special-promotion.com',
      isActive: true,
    };

    const validNewFeatureRequestData = {
      position: 4,
      isCustom: true,
      customTitle: 'New Feature Product',
      showNewFeatureModal: true,
      newFeatureTitle: 'Amazing New Feature',
      newFeatureDescription: 'This feature will revolutionize your experience',
      newFeatureBadgeText: 'BETA',
      isActive: true,
    };

    it('should create a new product-based spotlight pick', async () => {
      (prisma.spotlightPick.upsert as jest.Mock).mockResolvedValue({
        ...mockSpotlightPick,
        personalizeText: null,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/spotlight-picks', {
        method: 'POST',
        body: JSON.stringify(validRequestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.position).toBe(1);
      expect(data.data.productId).toBe('product-123');
      expect(data.data.isCustom).toBe(false);

      expect(prisma.spotlightPick.upsert).toHaveBeenCalledWith({
        where: { position: 1 },
        update: expect.objectContaining({
          productId: 'product-123',
          isCustom: false,
          isActive: true,
        }),
        create: expect.objectContaining({
          position: 1,
          productId: 'product-123',
          isCustom: false,
          isActive: true,
        }),
        include: expect.any(Object),
      });
    });

    it('should create a new custom spotlight pick with personalize text', async () => {
      const mockCustomPick = {
        ...mockSpotlightPick,
        position: 2,
        productId: null,
        customTitle: 'Custom Spotlight Pick',
        customDescription: 'This is a custom description',
        customImageUrl: 'https://example.com/custom-image.jpg',
        customPrice: 15.99,
        personalizeText: 'Made just for you!',
        isCustom: true,
        product: null,
      };

      (prisma.spotlightPick.upsert as jest.Mock).mockResolvedValue(mockCustomPick);

      const request = new NextRequest('http://localhost:3000/api/admin/spotlight-picks', {
        method: 'POST',
        body: JSON.stringify(validCustomRequestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.position).toBe(2);
      expect(data.data.isCustom).toBe(true);
      expect(data.data.customTitle).toBe('Custom Spotlight Pick');
      expect(data.data.personalizeText).toBe('Made just for you!');

      expect(prisma.spotlightPick.upsert).toHaveBeenCalledWith({
        where: { position: 2 },
        update: expect.objectContaining({
          customTitle: 'Custom Spotlight Pick',
          customDescription: 'This is a custom description',
          customImageUrl: 'https://example.com/custom-image.jpg',
          customPrice: 15.99,
          personalizeText: 'Made just for you!',
          isCustom: true,
          isActive: true,
        }),
        create: expect.objectContaining({
          position: 2,
          customTitle: 'Custom Spotlight Pick',
          customDescription: 'This is a custom description',
          customImageUrl: 'https://example.com/custom-image.jpg',
          customPrice: 15.99,
          personalizeText: 'Made just for you!',
          isCustom: true,
          isActive: true,
        }),
        include: expect.any(Object),
      });
    });

    it('should create a spotlight pick with custom link', async () => {
      const mockCustomLinkPick = {
        ...mockSpotlightPick,
        position: 3,
        productId: null,
        customTitle: 'Custom Link Product',
        customLink: 'https://special-promotion.com',
        isCustom: true,
        product: null,
      };

      (prisma.spotlightPick.upsert as jest.Mock).mockResolvedValue(mockCustomLinkPick);

      const request = new NextRequest('http://localhost:3000/api/admin/spotlight-picks', {
        method: 'POST',
        body: JSON.stringify(validCustomLinkRequestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.customLink).toBe('https://special-promotion.com');
      expect(data.data.customTitle).toBe('Custom Link Product');

      expect(prisma.spotlightPick.upsert).toHaveBeenCalledWith({
        where: { position: 3 },
        update: expect.objectContaining({
          customLink: 'https://special-promotion.com',
          showNewFeatureModal: false,
        }),
        create: expect.objectContaining({
          customLink: 'https://special-promotion.com',
          showNewFeatureModal: false,
        }),
        include: expect.any(Object),
      });
    });

    it('should create a spotlight pick with new feature modal', async () => {
      const mockNewFeaturePick = {
        ...mockSpotlightPick,
        position: 4,
        productId: null,
        customTitle: 'New Feature Product',
        showNewFeatureModal: true,
        newFeatureTitle: 'Amazing New Feature',
        newFeatureDescription: 'This feature will revolutionize your experience',
        newFeatureBadgeText: 'BETA',
        isCustom: true,
        product: null,
      };

      (prisma.spotlightPick.upsert as jest.Mock).mockResolvedValue(mockNewFeaturePick);

      const request = new NextRequest('http://localhost:3000/api/admin/spotlight-picks', {
        method: 'POST',
        body: JSON.stringify(validNewFeatureRequestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.showNewFeatureModal).toBe(true);
      expect(data.data.newFeatureTitle).toBe('Amazing New Feature');
      expect(data.data.newFeatureDescription).toBe('This feature will revolutionize your experience');
      expect(data.data.newFeatureBadgeText).toBe('BETA');

      expect(prisma.spotlightPick.upsert).toHaveBeenCalledWith({
        where: { position: 4 },
        update: expect.objectContaining({
          showNewFeatureModal: true,
          newFeatureTitle: 'Amazing New Feature',
          newFeatureDescription: 'This feature will revolutionize your experience',
          newFeatureBadgeText: 'BETA',
        }),
        create: expect.objectContaining({
          showNewFeatureModal: true,
          newFeatureTitle: 'Amazing New Feature',
          newFeatureDescription: 'This feature will revolutionize your experience',
          newFeatureBadgeText: 'BETA',
        }),
        include: expect.any(Object),
      });
    });

    it('should create a spotlight pick with both custom link and new feature modal', async () => {
      const combinedRequestData = {
        position: 1,
        isCustom: true,
        customTitle: 'Ultimate Feature',
        customLink: 'https://ultimate-feature.com',
        showNewFeatureModal: true,
        newFeatureTitle: 'Revolutionary Product',
        newFeatureDescription: 'This will change everything!',
        newFeatureBadgeText: 'REVOLUTIONARY',
        isActive: true,
      };

      const mockCombinedPick = {
        ...mockSpotlightPick,
        ...combinedRequestData,
        productId: null,
        product: null,
      };

      (prisma.spotlightPick.upsert as jest.Mock).mockResolvedValue(mockCombinedPick);

      const request = new NextRequest('http://localhost:3000/api/admin/spotlight-picks', {
        method: 'POST',
        body: JSON.stringify(combinedRequestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.customLink).toBe('https://ultimate-feature.com');
      expect(data.data.showNewFeatureModal).toBe(true);
      expect(data.data.newFeatureBadgeText).toBe('REVOLUTIONARY');
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        position: 5, // Invalid position (must be 1-4)
        isCustom: false,
      };

      const request = new NextRequest('http://localhost:3000/api/admin/spotlight-picks', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid data provided');
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
    it('should clear a spotlight pick at a specific position', async () => {
      (prisma.spotlightPick.update as jest.Mock).mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/admin/spotlight-picks?position=1', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      expect(prisma.spotlightPick.update).toHaveBeenCalledWith({
        where: { position: 1 },
        data: {
          isActive: false,
          productId: null,
          customTitle: null,
          customDescription: null,
          customImageUrl: null,
          customPrice: null,
          personalizeText: null,
          customLink: null,
          showNewFeatureModal: false,
          newFeatureTitle: null,
          newFeatureDescription: null,
          newFeatureBadgeText: null,
          isCustom: false,
        },
      });
    });

    it('should return 400 for invalid position', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/spotlight-picks?position=5', {
        method: 'DELETE',
      });

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

      const request = new NextRequest('http://localhost:3000/api/admin/spotlight-picks?position=1', {
        method: 'DELETE',
      });

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
          isCustom: false,
          productId: 'product-123',
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
      (prisma.spotlightPick.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/spotlight-picks?position=1', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database error');
    });
  });
}); 