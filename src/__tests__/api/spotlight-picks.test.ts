import { SpotlightPick } from '@/types/spotlight';

// Mock fetch for API testing
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('Spotlight Picks API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockSpotlightPicks: SpotlightPick[] = [
    {
      id: 'pick-1',
      position: 1,
      productId: 'product-123',
      isCustom: false,
      isActive: true,
      personalizeText: 'Perfect for celebrations',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      product: {
        id: 'product-123',
        name: 'Dulce de Leche Alfajores',
        description: 'Traditional cookies',
        images: ['alfajor.jpg'],
        price: 12.99,
        slug: 'alfajores-dulce',
        category: {
          name: 'ALFAJORES',
          slug: 'alfajores',
        },
      },
    },
    {
      id: 'pick-2',
      position: 2,
      customTitle: 'Custom Special',
      customDescription: 'Limited time offer',
      customImageUrl: 'custom.jpg',
      customPrice: 18.99,
      isCustom: true,
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ];

  describe('GET /api/spotlight-picks', () => {
    it('should return active spotlight picks successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: mockSpotlightPicks,
        }),
      } as Response);

      const response = await fetch('/api/spotlight-picks');
      const data = await response.json();

      expect(mockFetch).toHaveBeenCalledWith('/api/spotlight-picks');
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].product).toBeDefined();
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: 'Failed to fetch spotlight picks',
        }),
      } as Response);

      const response = await fetch('/api/spotlight-picks');
      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to fetch spotlight picks');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      try {
        await fetch('/api/spotlight-picks');
        fail('Expected network error to be thrown');
      } catch (error) {
        expect(error).toEqual(new Error('Network error'));
      }
    });

    it('should return empty array when no picks exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: [],
        }),
      } as Response);

      const response = await fetch('/api/spotlight-picks');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it('should return only active picks in correct order', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: mockSpotlightPicks.filter(pick => pick.isActive)
            .sort((a, b) => a.position - b.position),
        }),
      } as Response);

      const response = await fetch('/api/spotlight-picks');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.every((pick: SpotlightPick) => pick.isActive)).toBe(true);
      expect(data.data[0].position).toBe(1);
      expect(data.data[1].position).toBe(2);
    });
  });

  describe('POST /api/admin/spotlight-picks', () => {
    it('should create a new product-based spotlight pick', async () => {
      const newPick = {
        position: 3,
        productId: 'product-456',
        isCustom: false,
        isActive: true,
        personalizeText: 'Great choice!',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          success: true,
          data: {
            id: 'pick-3',
            ...newPick,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      } as Response);

      const response = await fetch('/api/admin/spotlight-picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPick),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.position).toBe(3);
      expect(data.data.productId).toBe('product-456');
    });

    it('should create a custom spotlight pick', async () => {
      const customPick = {
        position: 4,
        customTitle: 'Special Offer',
        customDescription: 'Limited time',
        customImageUrl: 'special.jpg',
        customPrice: 25.99,
        isCustom: true,
        isActive: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          success: true,
          data: {
            id: 'pick-4',
            ...customPick,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      } as Response);

      const response = await fetch('/api/admin/spotlight-picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customPick),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.customTitle).toBe('Special Offer');
      expect(data.data.isCustom).toBe(true);
    });

    it('should validate required fields', async () => {
      const invalidPick = {
        position: 1,
        // Missing required fields
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Validation failed: Missing required fields',
        }),
      } as Response);

      const response = await fetch('/api/admin/spotlight-picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPick),
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.success).toBe(false);
      expect(data.error).toContain('validation');
    });

    it('should reject unauthorized requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: 'Unauthorized: Admin access required',
        }),
      } as Response);

      const response = await fetch('/api/admin/spotlight-picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: 1, isCustom: false, isActive: true }),
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Unauthorized');
    });
  });

  describe('DELETE /api/admin/spotlight-picks', () => {
    it('should delete a spotlight pick by position', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          message: 'Spotlight pick deleted successfully',
        }),
      } as Response);

      const response = await fetch('/api/admin/spotlight-picks?position=1', {
        method: 'DELETE',
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.message).toContain('deleted successfully');
    });

    it('should handle delete errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          success: false,
          error: 'Spotlight pick not found',
        }),
      } as Response);

      const response = await fetch('/api/admin/spotlight-picks?position=99', {
        method: 'DELETE',
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });

    it('should validate position parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Position parameter is required',
        }),
      } as Response);

      const response = await fetch('/api/admin/spotlight-picks', {
        method: 'DELETE',
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Position');
    });
  });

  describe('Data Validation', () => {
    it('should validate position range (1-4)', async () => {
      const invalidPick = {
        position: 5, // Invalid position
        isCustom: false,
        isActive: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Position must be between 1 and 4',
        }),
      } as Response);

      const response = await fetch('/api/admin/spotlight-picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPick),
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Position must be between 1 and 4');
    });

    it('should validate custom pick fields when isCustom is true', async () => {
      const invalidCustomPick = {
        position: 1,
        isCustom: true,
        isActive: true,
        // Missing customTitle
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Custom title is required for custom picks',
        }),
      } as Response);

      const response = await fetch('/api/admin/spotlight-picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidCustomPick),
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Custom title is required');
    });

    it('should validate product pick fields when isCustom is false', async () => {
      const invalidProductPick = {
        position: 1,
        isCustom: false,
        isActive: true,
        // Missing productId
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Product ID is required for product-based picks',
        }),
      } as Response);

      const response = await fetch('/api/admin/spotlight-picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidProductPick),
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Product ID is required');
    });
  });

  describe('Response Format Validation', () => {
    it('should return consistent response format for success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: [],
        }),
      } as Response);

      const response = await fetch('/api/spotlight-picks');
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(typeof data.success).toBe('boolean');
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should return consistent response format for errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: 'Test error message',
        }),
      } as Response);

      const response = await fetch('/api/spotlight-picks');
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('error');
      expect(data.success).toBe(false);
      expect(typeof data.error).toBe('string');
    });

    it('should include product details for product-based picks', async () => {
      const productBasedPick = mockSpotlightPicks.filter(pick => !pick.isCustom);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: productBasedPick,
        }),
      } as Response);

      const response = await fetch('/api/spotlight-picks');
      const data = await response.json();

      const pick = data.data[0];
      expect(pick.isCustom).toBe(false);
      expect(pick.product).toBeDefined();
      expect(pick.product.id).toBeDefined();
      expect(pick.product.name).toBeDefined();
      expect(pick.product.price).toBeDefined();
      expect(pick.product.category).toBeDefined();
    });

    it('should include custom content for custom picks', async () => {
      const customPicks = mockSpotlightPicks.filter(pick => pick.isCustom);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: customPicks,
        }),
      } as Response);

      const response = await fetch('/api/spotlight-picks');
      const data = await response.json();

      const pick = data.data[0];
      expect(pick.isCustom).toBe(true);
      expect(pick.customTitle).toBeDefined();
      expect(pick.customDescription).toBeDefined();
      expect(pick.customPrice).toBeDefined();
      expect(pick.customImageUrl).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
         it('should handle malformed JSON responses', async () => {
       mockFetch.mockResolvedValueOnce({
         ok: false,
         status: 500,
         json: async () => {
           throw new Error('Invalid JSON');
         },
       } as unknown as Response);

      try {
        const response = await fetch('/api/spotlight-picks');
        await response.json();
        fail('Expected JSON parsing error');
      } catch (error) {
        expect(error).toEqual(new Error('Invalid JSON'));
      }
    });

    it('should handle concurrent requests', async () => {
      // Mock multiple successful responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: [mockSpotlightPicks[0]] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: [mockSpotlightPicks[1]] }),
        } as Response);

      const [response1, response2] = await Promise.all([
        fetch('/api/spotlight-picks'),
        fetch('/api/spotlight-picks'),
      ]);

      const [data1, data2] = await Promise.all([
        response1.json(),
        response2.json(),
      ]);

      expect(data1.success).toBe(true);
      expect(data2.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle timeout scenarios', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      try {
        await fetch('/api/spotlight-picks');
        fail('Expected timeout error');
      } catch (error) {
        expect(error).toEqual(new Error('Request timeout'));
      }
    });
  });
}); 