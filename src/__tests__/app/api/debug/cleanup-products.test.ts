/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/debug/cleanup-products/route';

// Mock dependencies
jest.mock('@/lib/db-unified', () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
    },
    $executeRaw: jest.fn(),
  },
}));

jest.mock('@/lib/square/client', () => ({
  squareClient: {
    catalogApi: {
      searchCatalogObjects: jest.fn(),
    },
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { prisma } from '@/lib/db-unified';
import { squareClient } from '@/lib/square/client';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockSquareClient = squareClient as jest.Mocked<typeof squareClient>;

describe('/api/debug/cleanup-products', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Action validation', () => {
    it('should reject action=2 (delete) with 400 status', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/debug/cleanup-products?action=2'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Delete action disabled');
      expect(data.message).toContain('permanently removed for safety');
      expect(data.availableActions).toEqual({
        '1': 'Clear Square IDs from invalid products (keeps products)',
        '3': 'List invalid products only (no changes, default)',
      });
    });

    it('should reject action=2 even with confirmation parameter', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/debug/cleanup-products?action=2&confirm=DELETE_PRODUCTS_PERMANENTLY'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Delete action disabled');
    });
  });

  describe('Square client validation', () => {
    it('should return 500 if Square client is not configured', async () => {
      // Temporarily set squareClient to null-like state
      const originalCatalogApi = mockSquareClient.catalogApi;
      (mockSquareClient as any).catalogApi = null;

      const request = new NextRequest(
        'http://localhost:3000/api/debug/cleanup-products'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Square client not properly configured');

      // Restore
      (mockSquareClient as any).catalogApi = originalCatalogApi;
    });
  });

  describe('List action (action=3, default)', () => {
    it('should return clean status when no invalid products found', async () => {
      // Mock Square catalog with items
      (mockSquareClient.catalogApi!.searchCatalogObjects as jest.Mock).mockResolvedValue({
        result: {
          objects: [
            { id: 'SQUARE-1', type: 'ITEM' },
            { id: 'SQUARE-2', type: 'ITEM' },
          ],
        },
      });

      // Mock database products that all have valid Square IDs
      (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'prod-1', name: 'Product 1', squareId: 'SQUARE-1', images: [] },
        { id: 'prod-2', name: 'Product 2', squareId: 'SQUARE-2', images: [] },
      ]);

      const request = new NextRequest(
        'http://localhost:3000/api/debug/cleanup-products'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('No invalid products found. Database is clean.');
      expect(data.invalidProductCount).toBe(0);
      expect(data.totalProductCount).toBe(2);
      expect(data.validSquareItemCount).toBe(2);
    });

    it('should list invalid products without making changes', async () => {
      // Mock Square catalog with only one item
      (mockSquareClient.catalogApi!.searchCatalogObjects as jest.Mock).mockResolvedValue({
        result: {
          objects: [{ id: 'SQUARE-1', type: 'ITEM' }],
        },
      });

      // Mock database products where one has an invalid Square ID
      (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'prod-1', name: 'Valid Product', squareId: 'SQUARE-1', images: [] },
        { id: 'prod-2', name: 'Invalid Product', squareId: 'INVALID-ID', images: [] },
      ]);

      const request = new NextRequest(
        'http://localhost:3000/api/debug/cleanup-products?action=3'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.action).toBe('3');
      expect(data.invalidProductCount).toBe(1);
      expect(data.totalProductCount).toBe(2);
      expect(data.invalidProducts).toEqual([
        { id: 'prod-2', name: 'Invalid Product', squareId: 'INVALID-ID' },
      ]);
      expect(data.changes).toEqual([]);
      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
    });

    it('should default to action=3 when no action specified', async () => {
      (mockSquareClient.catalogApi!.searchCatalogObjects as jest.Mock).mockResolvedValue({
        result: { objects: [] },
      });

      (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'prod-1', name: 'Product', squareId: 'SQUARE-1', images: [] },
      ]);

      const request = new NextRequest(
        'http://localhost:3000/api/debug/cleanup-products'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.action).toBe('3');
      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
    });
  });

  describe('Clear Square IDs action (action=1)', () => {
    it('should clear Square IDs from invalid products when under threshold', async () => {
      // Mock Square catalog with 8 items (so 2 invalid out of 10 = 20%, under 50% threshold)
      (mockSquareClient.catalogApi!.searchCatalogObjects as jest.Mock).mockResolvedValue({
        result: {
          objects: [
            { id: 'SQUARE-1', type: 'ITEM' },
            { id: 'SQUARE-2', type: 'ITEM' },
            { id: 'SQUARE-3', type: 'ITEM' },
            { id: 'SQUARE-4', type: 'ITEM' },
            { id: 'SQUARE-5', type: 'ITEM' },
            { id: 'SQUARE-6', type: 'ITEM' },
            { id: 'SQUARE-7', type: 'ITEM' },
            { id: 'SQUARE-8', type: 'ITEM' },
          ],
        },
      });

      // Mock database products - 8 valid, 2 invalid (20% affected)
      (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'prod-1', name: 'Valid Product 1', squareId: 'SQUARE-1', images: [] },
        { id: 'prod-2', name: 'Valid Product 2', squareId: 'SQUARE-2', images: [] },
        { id: 'prod-3', name: 'Valid Product 3', squareId: 'SQUARE-3', images: [] },
        { id: 'prod-4', name: 'Valid Product 4', squareId: 'SQUARE-4', images: [] },
        { id: 'prod-5', name: 'Valid Product 5', squareId: 'SQUARE-5', images: [] },
        { id: 'prod-6', name: 'Valid Product 6', squareId: 'SQUARE-6', images: [] },
        { id: 'prod-7', name: 'Valid Product 7', squareId: 'SQUARE-7', images: [] },
        { id: 'prod-8', name: 'Valid Product 8', squareId: 'SQUARE-8', images: [] },
        { id: 'prod-9', name: 'Invalid Product 1', squareId: 'INVALID-1', images: [] },
        { id: 'prod-10', name: 'Invalid Product 2', squareId: 'INVALID-2', images: [] },
      ]);

      (mockPrisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      const request = new NextRequest(
        'http://localhost:3000/api/debug/cleanup-products?action=1'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.action).toBe('1');
      expect(data.invalidProductCount).toBe(2);
      expect(data.changes).toHaveLength(2);

      // Verify $executeRaw was called twice (once for each invalid product)
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(2);
    });

    it('should reject action=1 when over 50% of products would be affected (safety threshold)', async () => {
      // Mock empty Square catalog (simulating sandbox or API error)
      (mockSquareClient.catalogApi!.searchCatalogObjects as jest.Mock).mockResolvedValue({
        result: { objects: [] },
      });

      // All products have squareIds, all would be marked invalid (100%)
      (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'prod-1', name: 'Product 1', squareId: 'SQUARE-1', images: [] },
        { id: 'prod-2', name: 'Product 2', squareId: 'SQUARE-2', images: [] },
        { id: 'prod-3', name: 'Product 3', squareId: 'SQUARE-3', images: [] },
      ]);

      const request = new NextRequest(
        'http://localhost:3000/api/debug/cleanup-products?action=1'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Safety threshold exceeded');
      expect(data.message).toContain('Refusing to clear squareIds');
      expect(data.safetyThreshold).toBe(50);
      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
    });

    it('should not clear Square IDs for products without squareId', async () => {
      (mockSquareClient.catalogApi!.searchCatalogObjects as jest.Mock).mockResolvedValue({
        result: { objects: [] },
      });

      // Product without squareId should not be considered invalid
      (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'prod-1', name: 'Product without Square ID', squareId: null, images: [] },
      ]);

      const request = new NextRequest(
        'http://localhost:3000/api/debug/cleanup-products?action=1'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('No invalid products found. Database is clean.');
      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty Square catalog gracefully', async () => {
      (mockSquareClient.catalogApi!.searchCatalogObjects as jest.Mock).mockResolvedValue({
        result: { objects: [] },
      });

      (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'prod-1', name: 'Product', squareId: 'SQUARE-1', images: [] },
      ]);

      const request = new NextRequest(
        'http://localhost:3000/api/debug/cleanup-products'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.validSquareItemCount).toBe(0);
      expect(data.invalidProductCount).toBe(1);
    });

    it('should handle Square API returning undefined objects', async () => {
      (mockSquareClient.catalogApi!.searchCatalogObjects as jest.Mock).mockResolvedValue({
        result: { objects: undefined },
      });

      (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost:3000/api/debug/cleanup-products'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.validSquareItemCount).toBe(0);
    });

    it('should handle empty database gracefully', async () => {
      (mockSquareClient.catalogApi!.searchCatalogObjects as jest.Mock).mockResolvedValue({
        result: {
          objects: [{ id: 'SQUARE-1', type: 'ITEM' }],
        },
      });

      (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost:3000/api/debug/cleanup-products'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('No invalid products found. Database is clean.');
      expect(data.totalProductCount).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should handle Square API errors gracefully', async () => {
      (mockSquareClient.catalogApi!.searchCatalogObjects as jest.Mock).mockRejectedValue(
        new Error('Square API unavailable')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/debug/cleanup-products'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to clean up products');
      expect(data.details).toBe('Square API unavailable');
    });

    it('should handle database errors gracefully', async () => {
      (mockSquareClient.catalogApi!.searchCatalogObjects as jest.Mock).mockResolvedValue({
        result: { objects: [] },
      });

      (mockPrisma.product.findMany as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/debug/cleanup-products'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to clean up products');
      expect(data.details).toBe('Database connection failed');
    });

    it('should handle update errors during action=1', async () => {
      // Setup: 9 valid products, 1 invalid (10% affected, under threshold)
      (mockSquareClient.catalogApi!.searchCatalogObjects as jest.Mock).mockResolvedValue({
        result: {
          objects: [
            { id: 'SQUARE-1', type: 'ITEM' },
            { id: 'SQUARE-2', type: 'ITEM' },
            { id: 'SQUARE-3', type: 'ITEM' },
            { id: 'SQUARE-4', type: 'ITEM' },
            { id: 'SQUARE-5', type: 'ITEM' },
            { id: 'SQUARE-6', type: 'ITEM' },
            { id: 'SQUARE-7', type: 'ITEM' },
            { id: 'SQUARE-8', type: 'ITEM' },
            { id: 'SQUARE-9', type: 'ITEM' },
          ],
        },
      });

      (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'prod-1', name: 'Valid 1', squareId: 'SQUARE-1', images: [] },
        { id: 'prod-2', name: 'Valid 2', squareId: 'SQUARE-2', images: [] },
        { id: 'prod-3', name: 'Valid 3', squareId: 'SQUARE-3', images: [] },
        { id: 'prod-4', name: 'Valid 4', squareId: 'SQUARE-4', images: [] },
        { id: 'prod-5', name: 'Valid 5', squareId: 'SQUARE-5', images: [] },
        { id: 'prod-6', name: 'Valid 6', squareId: 'SQUARE-6', images: [] },
        { id: 'prod-7', name: 'Valid 7', squareId: 'SQUARE-7', images: [] },
        { id: 'prod-8', name: 'Valid 8', squareId: 'SQUARE-8', images: [] },
        { id: 'prod-9', name: 'Valid 9', squareId: 'SQUARE-9', images: [] },
        { id: 'prod-10', name: 'Invalid Product', squareId: 'INVALID', images: [] },
      ]);

      (mockPrisma.$executeRaw as jest.Mock).mockRejectedValue(
        new Error('Update failed')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/debug/cleanup-products?action=1'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to clean up products');
    });
  });
});
