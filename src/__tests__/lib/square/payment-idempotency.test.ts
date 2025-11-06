/**
 * Payment Idempotency Test Suite
 *
 * Tests idempotency key handling and payment state management:
 * - Idempotency key generation and uniqueness
 * - Duplicate payment request handling
 * - Payment state consistency
 * - Error recovery and retry logic
 *
 * Part of DES-60: Edge Case & Error Handling Coverage (Phase 2)
 */

import { randomUUID } from 'crypto';
import { createPayment, createOrder } from '@/lib/square/orders';
import { getSquareService } from '@/lib/square/service';

// Mock Square service
jest.mock('@/lib/square/service');

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock crypto for controlled UUID generation in some tests
const actualCrypto = jest.requireActual('crypto');
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn(() => actualCrypto.randomUUID()),
}));

const mockRandomUUID = randomUUID as jest.MockedFunction<typeof randomUUID>;
const mockGetSquareService = getSquareService as jest.MockedFunction<typeof getSquareService>;

describe('Payment Idempotency - Key Generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to use actual randomUUID by default
    mockRandomUUID.mockImplementation(() => actualCrypto.randomUUID());
  });

  test('should generate unique idempotency keys', () => {
    const key1 = randomUUID();
    const key2 = randomUUID();

    expect(key1).toBeDefined();
    expect(key2).toBeDefined();
    expect(key1).not.toBe(key2);
    expect(typeof key1).toBe('string');
    expect(typeof key2).toBe('string');
  });

  test('should generate valid UUID format', () => {
    const key = randomUUID();

    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(key).toMatch(uuidPattern);
  });

  test('should generate different keys for multiple rapid calls', () => {
    const keys = new Set();
    const count = 100;

    for (let i = 0; i < count; i++) {
      keys.add(randomUUID());
    }

    // All keys should be unique
    expect(keys.size).toBe(count);
  });
});

describe('Payment Idempotency - Payment Creation', () => {
  let mockSquareService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRandomUUID.mockImplementation(() => actualCrypto.randomUUID());

    mockSquareService = {
      createPayment: jest.fn().mockResolvedValue({
        payment: {
          id: 'payment-test-123',
          status: 'COMPLETED',
          amountMoney: { amount: BigInt(5000), currency: 'USD' },
          orderId: 'order-456',
        },
      }),
      createOrder: jest.fn().mockResolvedValue({
        order: {
          id: 'order-test-789',
          locationId: 'location-123',
          state: 'DRAFT',
        },
      }),
    };

    mockGetSquareService.mockReturnValue(mockSquareService);
  });

  test('should successfully create payment with idempotency key', async () => {
    const result = await createPayment('card-nonce-123', 'order-456', 5000);

    expect(result.id).toBe('payment-test-123');
    expect(result.status).toBe('COMPLETED');
    expect(mockSquareService.createPayment).toHaveBeenCalledTimes(1);

    // Verify idempotency key was included in request
    const callArgs = mockSquareService.createPayment.mock.calls[0][0];
    expect(callArgs.idempotencyKey).toBeDefined();
    expect(typeof callArgs.idempotencyKey).toBe('string');
  });

  test('should successfully create order with idempotency key', async () => {
    const orderRequest = {
      locationId: 'location-123',
      lineItems: [
        {
          quantity: '2',
          catalogObjectId: 'catalog-item-1',
        },
      ],
    };

    const result = await createOrder(orderRequest);

    expect(result.id).toBe('order-test-789');
    expect(mockSquareService.createOrder).toHaveBeenCalledTimes(1);

    // Verify idempotency key was included in request
    const callArgs = mockSquareService.createOrder.mock.calls[0][0];
    expect(callArgs.idempotencyKey).toBeDefined();
    expect(typeof callArgs.idempotencyKey).toBe('string');
  });

  test('should use different idempotency keys for separate requests', async () => {
    await createPayment('card-nonce-1', 'order-1', 5000);
    await createPayment('card-nonce-2', 'order-2', 6000);

    const key1 = mockSquareService.createPayment.mock.calls[0][0].idempotencyKey;
    const key2 = mockSquareService.createPayment.mock.calls[1][0].idempotencyKey;

    expect(key1).not.toBe(key2);
  });
});

describe('Payment Idempotency - Error Handling', () => {
  let mockSquareService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRandomUUID.mockImplementation(() => actualCrypto.randomUUID());
  });

  test('should handle Square API errors during payment creation', async () => {
    const apiError = new Error('Payment declined');

    mockSquareService = {
      createPayment: jest.fn().mockRejectedValue(apiError),
    };

    mockGetSquareService.mockReturnValue(mockSquareService);

    await expect(createPayment('card-nonce-123', 'order-456', 5000)).rejects.toThrow(
      'Payment declined'
    );
  });

  test('should handle idempotency conflict errors from Square', async () => {
    const conflictError = new Error('Idempotency key reused');
    (conflictError as any).statusCode = 409;

    mockSquareService = {
      createPayment: jest.fn().mockRejectedValue(conflictError),
    };

    mockGetSquareService.mockReturnValue(mockSquareService);

    await expect(createPayment('card-nonce-123', 'order-456', 5000)).rejects.toThrow();
  });

  test('should handle network errors during payment creation', async () => {
    const networkError = new Error('Network timeout');

    mockSquareService = {
      createPayment: jest.fn().mockRejectedValue(networkError),
    };

    mockGetSquareService.mockReturnValue(mockSquareService);

    await expect(createPayment('card-nonce-123', 'order-456', 5000)).rejects.toThrow(
      'Network timeout'
    );
  });
});

describe('Payment Idempotency - Retry Scenarios', () => {
  let mockSquareService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRandomUUID.mockImplementation(() => actualCrypto.randomUUID());
  });

  test('should retry payment after recoverable failure', async () => {
    mockSquareService = {
      createPayment: jest
        .fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          payment: {
            id: 'payment-retry-success',
            status: 'COMPLETED',
            amountMoney: { amount: BigInt(5000), currency: 'USD' },
          },
        }),
    };

    mockGetSquareService.mockReturnValue(mockSquareService);

    // First attempt fails
    await expect(createPayment('card-nonce-123', 'order-456', 5000)).rejects.toThrow(
      'Temporary failure'
    );

    // Second attempt succeeds (new idempotency key)
    const result = await createPayment('card-nonce-123', 'order-456', 5000);
    expect(result.id).toBe('payment-retry-success');
    expect(mockSquareService.createPayment).toHaveBeenCalledTimes(2);

    // Verify different idempotency keys were used
    const key1 = mockSquareService.createPayment.mock.calls[0][0].idempotencyKey;
    const key2 = mockSquareService.createPayment.mock.calls[1][0].idempotencyKey;
    expect(key1).not.toBe(key2);
  });

  test('should handle multiple retry attempts with different keys', async () => {
    mockSquareService = {
      createPayment: jest
        .fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockRejectedValueOnce(new Error('Attempt 2 failed'))
        .mockResolvedValueOnce({
          payment: {
            id: 'payment-third-attempt',
            status: 'COMPLETED',
            amountMoney: { amount: BigInt(5000), currency: 'USD' },
          },
        }),
    };

    mockGetSquareService.mockReturnValue(mockSquareService);

    // Three attempts
    await expect(createPayment('card-nonce-123', 'order-456', 5000)).rejects.toThrow();
    await expect(createPayment('card-nonce-123', 'order-456', 5000)).rejects.toThrow();
    const result = await createPayment('card-nonce-123', 'order-456', 5000);

    expect(result.id).toBe('payment-third-attempt');
    expect(mockSquareService.createPayment).toHaveBeenCalledTimes(3);

    // All three calls should have different idempotency keys
    const keys = mockSquareService.createPayment.mock.calls.map(
      (call: any[]) => call[0].idempotencyKey
    );
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(3);
  });
});

describe('Payment Idempotency - Concurrent Operations', () => {
  let mockSquareService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRandomUUID.mockImplementation(() => actualCrypto.randomUUID());

    mockSquareService = {
      createPayment: jest.fn().mockImplementation(
        () =>
          new Promise(resolve => {
            setTimeout(() => {
              resolve({
                payment: {
                  id: `payment-${Date.now()}`,
                  status: 'COMPLETED',
                  amountMoney: { amount: BigInt(5000), currency: 'USD' },
                },
              });
            }, 50);
          })
      ),
    };

    mockGetSquareService.mockReturnValue(mockSquareService);
  });

  test('should use different idempotency keys for concurrent requests', async () => {
    const requests = [
      createPayment('card-nonce-1', 'order-1', 5000),
      createPayment('card-nonce-2', 'order-2', 5000),
      createPayment('card-nonce-3', 'order-3', 5000),
    ];

    await Promise.all(requests);

    expect(mockSquareService.createPayment).toHaveBeenCalledTimes(3);

    // Extract all idempotency keys
    const keys = mockSquareService.createPayment.mock.calls.map(
      (call: any[]) => call[0].idempotencyKey
    );

    // All keys should be unique
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(3);
  }, 10000);

  test('should handle concurrent payments successfully', async () => {
    const results = await Promise.all([
      createPayment('card-nonce-1', 'order-1', 5000),
      createPayment('card-nonce-2', 'order-2', 6000),
      createPayment('card-nonce-3', 'order-3', 7000),
    ]);

    results.forEach(result => {
      expect(result.status).toBe('COMPLETED');
      expect(result.id).toBeDefined();
    });
  }, 10000);
});
