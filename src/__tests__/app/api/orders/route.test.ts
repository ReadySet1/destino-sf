/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/orders/route';
import { prisma } from '@/lib/db';
import { createClient } from '@/utils/supabase/server';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    order: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('/api/orders - GET', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return orders for authenticated user', async () => {
    // Mock authenticated user
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    } as any);

    // Mock orders data
    const mockOrders = [
      {
        id: 'order-1',
        status: 'PENDING',
        total: 25.99,
        customerName: 'John Doe',
        email: 'john@example.com',
        phone: '415-123-4567',
        pickupTime: new Date(),
        userId: 'user-123',
        createdAt: new Date(),
        items: [
          {
            id: 'item-1',
            quantity: 2,
            price: 12.99,
            product: {
              name: 'Test Product',
              images: ['/test-image.jpg'],
            },
            variant: {
              name: 'Large',
            },
          },
        ],
      },
    ];

    mockPrisma.order.findMany.mockResolvedValue(mockOrders);

    // Create mock request
    const request = new NextRequest('http://localhost:3000/api/orders');

    // Call the API
    const response = await GET(request);
    const data = await response.json();

    // Assertions
    expect(response.status).toBe(200);
    expect(data.orders).toMatchObject(mockOrders.map(order => ({
      ...order,
      createdAt: expect.any(String),
      pickupTime: expect.any(String),
    })));
    expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      include: {
        items: {
          include: {
            product: {
              select: { name: true, images: true },
            },
            variant: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  });

  it('should return 401 for unauthenticated user', async () => {
    // Mock unauthenticated user
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/orders');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized - Authentication failed');
    expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
  });

  it('should return 401 for authentication error', async () => {
    // Mock authentication error
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('Auth failed'),
        }),
      },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/orders');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized - Authentication failed');
    expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
  });

  it('should handle database errors gracefully', async () => {
    // Mock authenticated user
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    } as any);

    // Mock database error
    mockPrisma.order.findMany.mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost:3000/api/orders');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch orders');
    expect(data.details).toBe('Database connection failed');
  });

  it('should handle unknown errors gracefully', async () => {
    // Mock authenticated user
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    } as any);

    // Mock unknown error (not an Error instance)
    mockPrisma.order.findMany.mockRejectedValue('Unknown error');

    const request = new NextRequest('http://localhost:3000/api/orders');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch orders');
    expect(data.details).toBe('Unknown error');
  });

  it('should return empty array when user has no orders', async () => {
    // Mock authenticated user
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    } as any);

    // Mock empty orders
    mockPrisma.order.findMany.mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/orders');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.orders).toEqual([]);
    expect(mockPrisma.order.findMany).toHaveBeenCalled();
  });

  it('should handle orders with null product data', async () => {
    // Mock authenticated user
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    } as any);

    // Mock orders with null product data
    const mockOrders = [
      {
        id: 'order-1',
        status: 'PENDING',
        total: 25.99,
        customerName: 'John Doe',
        email: 'john@example.com',
        phone: '415-123-4567',
        pickupTime: new Date(),
        userId: 'user-123',
        createdAt: new Date(),
        items: [
          {
            id: 'item-1',
            quantity: 2,
            price: 12.99,
            product: null,
            variant: null,
          },
        ],
      },
    ];

    mockPrisma.order.findMany.mockResolvedValue(mockOrders);

    const request = new NextRequest('http://localhost:3000/api/orders');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.orders).toMatchObject(mockOrders.map(order => ({
      ...order,
      createdAt: expect.any(String),
      pickupTime: expect.any(String),
    })));
  });
}); 