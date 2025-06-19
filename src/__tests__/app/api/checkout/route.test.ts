import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createOrder } from '@/lib/square/orders';
import { createServerClient } from '@supabase/ssr';
import { POST } from '@/app/api/checkout/route';

// Mock all external dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    productVariant: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/square/orders');
jest.mock('@supabase/ssr');
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({
    getAll: jest.fn(() => []),
  })),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCreateOrder = createOrder as jest.MockedFunction<typeof createOrder>;
const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>;

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
};

// Test fixtures
const validCheckoutRequest = {
  items: [
    {
      id: 'prod-1',
      variantId: 'variant-1',
      quantity: 2,
    },
    {
      id: 'prod-2',
      quantity: 1,
    },
  ],
  customerInfo: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    pickupTime: '2024-01-16T14:00:00Z',
  },
};

const mockCreatedOrder = {
  id: 'order-123',
  status: 'PENDING',
  total: 7500, // $75.00 in cents
  userId: 'user-123',
  customerName: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  pickupTime: new Date('2024-01-16T14:00:00Z'),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSquareOrder = {
  id: 'square-order-456',
  locationId: 'location-123',
  state: 'OPEN',
  createdAt: '2024-01-16T10:00:00Z',
};

describe('/api/checkout - POST', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mocks
    mockCreateServerClient.mockReturnValue(mockSupabaseClient as any);
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'john@example.com' } },
      error: null,
    });
  });

  describe('Successful checkout scenarios', () => {
    test('should create order successfully with authenticated user', async () => {
      // Mock successful database operations
      mockPrisma.order.create.mockResolvedValue(mockCreatedOrder as any);
      mockPrisma.order.update.mockResolvedValue({
        ...mockCreatedOrder,
        squareOrderId: mockSquareOrder.id,
      } as any);

      // Mock successful Square order creation
      mockCreateOrder.mockResolvedValue(mockSquareOrder as any);

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(validCheckoutRequest),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ orderId: 'order-123' });

      // Verify database operations
      expect(mockPrisma.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'PENDING',
          userId: 'user-123',
          customerName: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          pickupTime: new Date('2024-01-16T14:00:00Z'),
        }),
      });

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: { squareOrderId: 'square-order-456' },
      });

      // Verify Square order creation
      expect(mockCreateOrder).toHaveBeenCalledWith({
        locationId: process.env.SQUARE_LOCATION_ID,
        lineItems: expect.arrayContaining([
          expect.objectContaining({
            quantity: '2',
            catalogObjectId: 'prod-1',
          }),
          expect.objectContaining({
            quantity: '1',
            catalogObjectId: 'prod-2',
          }),
        ]),
      });
    });

    test('should create order successfully without authenticated user', async () => {
      // Mock unauthenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      mockPrisma.order.create.mockResolvedValue({
        ...mockCreatedOrder,
        userId: null,
      } as any);
      mockPrisma.order.update.mockResolvedValue({
        ...mockCreatedOrder,
        userId: null,
        squareOrderId: mockSquareOrder.id,
      } as any);
      mockCreateOrder.mockResolvedValue(mockSquareOrder as any);

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(validCheckoutRequest),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ orderId: 'order-123' });

      // Verify order created without userId
      expect(mockPrisma.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: null,
        }),
      });
    });
  });

  describe('Validation errors', () => {
    test('should return 400 for empty cart', async () => {
      const requestWithEmptyCart = {
        ...validCheckoutRequest,
        items: [],
      };

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(requestWithEmptyCart),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Cart is empty' });
      expect(mockPrisma.order.create).not.toHaveBeenCalled();
      expect(mockCreateOrder).not.toHaveBeenCalled();
    });

    test('should return 400 for missing items', async () => {
      const requestWithoutItems = {
        customerInfo: validCheckoutRequest.customerInfo,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(requestWithoutItems),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Cart is empty' });
    });

    test('should handle invalid JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: 'invalid-json',
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });

  describe('Database errors', () => {
    test('should handle database connection errors', async () => {
      mockPrisma.order.create.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(validCheckoutRequest),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to create order' });
    });

    test('should handle order update failures', async () => {
      mockPrisma.order.create.mockResolvedValue(mockCreatedOrder as any);
      mockCreateOrder.mockResolvedValue(mockSquareOrder as any);
      mockPrisma.order.update.mockRejectedValue(new Error('Update failed'));

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(validCheckoutRequest),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });

  describe('Square API errors', () => {
    test('should handle Square order creation failure', async () => {
      mockPrisma.order.create.mockResolvedValue(mockCreatedOrder as any);
      mockCreateOrder.mockRejectedValue(new Error('Square API error'));

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(validCheckoutRequest),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to create order' });

      // Should still create the order in database
      expect(mockPrisma.order.create).toHaveBeenCalled();
    });

    test('should handle Square authentication errors', async () => {
      mockPrisma.order.create.mockResolvedValue(mockCreatedOrder as any);
      mockCreateOrder.mockRejectedValue(new Error('Authentication failed'));

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(validCheckoutRequest),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });

  describe('Authentication edge cases', () => {
    test('should handle Supabase auth errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth service unavailable' },
      });

      mockPrisma.order.create.mockResolvedValue(mockCreatedOrder as any);
      mockPrisma.order.update.mockResolvedValue({
        ...mockCreatedOrder,
        squareOrderId: mockSquareOrder.id,
      } as any);
      mockCreateOrder.mockResolvedValue(mockSquareOrder as any);

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(validCheckoutRequest),
      });

      const response = await POST(request);

      // Should still complete checkout without authentication
      expect(response.status).toBe(200);
    });

    test('should handle expired authentication tokens', async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Token expired'));

      mockPrisma.order.create.mockResolvedValue(mockCreatedOrder as any);
      mockPrisma.order.update.mockResolvedValue({
        ...mockCreatedOrder,
        squareOrderId: mockSquareOrder.id,
      } as any);
      mockCreateOrder.mockResolvedValue(mockSquareOrder as any);

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(validCheckoutRequest),
      });

      const response = await POST(request);

      // Should still complete checkout
      expect(response.status).toBe(200);
    });
  });

  describe('Environment configuration', () => {
    test('should handle missing Square location ID', async () => {
      const originalLocationId = process.env.SQUARE_LOCATION_ID;
      delete process.env.SQUARE_LOCATION_ID;

      mockPrisma.order.create.mockResolvedValue(mockCreatedOrder as any);
      mockCreateOrder.mockRejectedValue(new Error('Missing location ID'));

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(validCheckoutRequest),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);

      // Restore environment
      if (originalLocationId) {
        process.env.SQUARE_LOCATION_ID = originalLocationId;
      }
    });
  });

  describe('Data integrity', () => {
    test('should maintain consistent order data across systems', async () => {
      mockPrisma.order.create.mockResolvedValue(mockCreatedOrder as any);
      mockPrisma.order.update.mockResolvedValue({
        ...mockCreatedOrder,
        squareOrderId: mockSquareOrder.id,
      } as any);
      mockCreateOrder.mockResolvedValue(mockSquareOrder as any);

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(validCheckoutRequest),
      });

      await POST(request);

      // Verify order items are properly mapped
      const createOrderCall = mockCreateOrder.mock.calls[0][0];
      expect(createOrderCall.lineItems).toHaveLength(2);
      expect(createOrderCall.lineItems[0]).toEqual({
        quantity: '2',
        catalogObjectId: 'prod-1',
      });
      expect(createOrderCall.lineItems[1]).toEqual({
        quantity: '1',
        catalogObjectId: 'prod-2',
      });
    });

    test('should handle item quantity edge cases', async () => {
      const requestWithZeroQuantity = {
        ...validCheckoutRequest,
        items: [
          { id: 'prod-1', quantity: 0 },
          { id: 'prod-2', quantity: 1 },
        ],
      };

      mockPrisma.order.create.mockResolvedValue(mockCreatedOrder as any);
      mockCreateOrder.mockResolvedValue(mockSquareOrder as any);

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(requestWithZeroQuantity),
      });

      const response = await POST(request);

      // Should handle zero quantity items appropriately
      expect(response.status).toBe(200);
    });
  });
}); 