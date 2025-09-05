// Common mocks for all tests
export const mockPrismaClient = {
  $transaction: jest.fn((fn) => fn()),
  $disconnect: jest.fn(),
  $connect: jest.fn(),
  order: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  product: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
  user: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  orderItem: {
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
  },
};

export const mockSupabaseClient = {
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null,
    }),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
  from: jest.fn((table: string) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: {}, error: null }),
  })),
};

export const mockSquareClient = {
  paymentsApi: {
    createPayment: jest.fn().mockResolvedValue({
      result: {
        payment: {
          id: 'payment-id',
          status: 'COMPLETED',
          amountMoney: { amount: 2500, currency: 'USD' },
        },
      },
    }),
  },
  ordersApi: {
    createOrder: jest.fn().mockResolvedValue({
      result: {
        order: {
          id: 'order-id',
          totalMoney: { amount: 2500, currency: 'USD' },
        },
      },
    }),
  },
  catalogApi: {
    searchCatalogItems: jest.fn().mockResolvedValue({
      result: { items: [] },
    }),
  },
};
