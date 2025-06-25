import { POST } from '@/app/api/checkout/route';
import { createOrder } from '@/lib/square/orders';
import { prisma } from '@/lib/db';
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Mock dependencies
jest.mock('@/lib/square/orders');
// Note: @/lib/db is mocked globally in jest.setup.js
jest.mock('@supabase/ssr');
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({
    getAll: () => []
  })),
}));

const mockedCreateOrder = createOrder as jest.MockedFunction<typeof createOrder>;
const mockedCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>;

describe('POST /api/checkout', () => {
  const mockSupabaseClient = {
    auth: {
      getUser: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedCreateServerClient.mockReturnValue(mockSupabaseClient as any);
  });

  describe('Order Creation Flow', () => {
    it('should create order with valid payment and cart data', async () => {
      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      // Mock Prisma order creation
      const mockOrder = {
        id: 'order-123',
        status: 'PENDING',
        total: 25.98,
        userId: 'user-123',
      };
      (prisma.order.create as jest.Mock).mockResolvedValue(mockOrder);

      // Mock Square order creation
      const mockSquareOrder = { id: 'square-order-123' };
      mockedCreateOrder.mockResolvedValue(mockSquareOrder);

      // Mock Prisma order update
      (prisma.order.update as jest.Mock).mockResolvedValue({
        ...mockOrder,
        squareOrderId: 'square-order-123',
      });

      const request = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          items: [
            { id: 'product-1', quantity: 2 },
            { id: 'product-2', quantity: 1, variantId: 'variant-1' },
          ],
          customerInfo: {
            name: 'John Doe',
            email: 'john@example.com',
            phone: '555-1234',
            pickupTime: '2024-12-20T15:00:00Z',
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.orderId).toBe('order-123');
      expect(prisma.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'PENDING',
          userId: 'user-123',
          customerName: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234',
        }),
      });
    });
  });
});