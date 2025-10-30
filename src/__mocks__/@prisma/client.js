// Manual mock for @prisma/client to avoid Jest import issues
module.exports = {
  PrismaClient: jest.fn(),
  Prisma: {
    PrismaClientKnownRequestError: class extends Error {
      constructor(message, { code, clientVersion }) {
        super(message);
        this.code = code;
        this.clientVersion = clientVersion;
        this.name = 'PrismaClientKnownRequestError';
      }
    },
  },
  // Mock Prisma enums
  OrderStatus: {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    READY: 'READY',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
  },
  PaymentMethod: {
    CREDIT_CARD: 'CREDIT_CARD',
    VENMO: 'VENMO',
    CASH: 'CASH',
  },
  PaymentStatus: {
    PENDING: 'PENDING',
    PAID: 'PAID',
    FAILED: 'FAILED',
    REFUNDED: 'REFUNDED',
  },
  CateringStatus: {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    PREPARING: 'PREPARING',
    READY: 'READY',
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED',
  },
  FulfillmentType: {
    PICKUP: 'PICKUP',
    DELIVERY: 'DELIVERY',
    NATIONWIDE_SHIPPING: 'NATIONWIDE_SHIPPING',
  },
  Role: {
    CUSTOMER: 'CUSTOMER',
    ADMIN: 'ADMIN',
  },
};
