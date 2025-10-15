import { mockPrismaClient, mockSupabaseClient, mockSquareClient } from '@/__mocks__/commonMocks';

export function setupMocks() {
  // Reset all mocks
  jest.clearAllMocks();

  // Setup default mock implementations
  mockPrismaClient.order.create.mockResolvedValue({
    id: 'order-123',
    status: 'PENDING',
    total: 25.0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  mockPrismaClient.product.findMany.mockResolvedValue([
    { id: 'prod-1', name: 'Test Product', price: 10.0, available: true },
  ]);

  return {
    prisma: mockPrismaClient,
    supabase: mockSupabaseClient,
    square: mockSquareClient,
  };
}

export function createMockRequest(body: any, headers: Record<string, string> = {}) {
  return new Request('http://localhost:3000/api/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

export function createMockResponse() {
  return {
    json: jest.fn().mockResolvedValue({}),
    status: jest.fn().mockReturnThis(),
    headers: new Headers(),
  };
}
