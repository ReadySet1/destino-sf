import { createOrderAndGenerateCheckoutUrl } from '../../app/actions';
import type { FulfillmentData } from '../../app/actions';

// Mock next/cache to prevent revalidatePath errors in Jest
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

beforeAll(() => {
  process.env.SQUARE_LOCATION_ID = 'test-location-id';
  process.env.SQUARE_ACCESS_TOKEN = 'test-access-token';
  process.env.SQUARE_ENVIRONMENT = 'sandbox';
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

  // Mock fetch for Square API
  global.fetch = jest.fn().mockImplementation((url, options) => {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        payment_link: {
          url: 'https://squareup.com/checkout/test-link',
          order_id: 'square-order-id',
        },
      }),
    });
  });
});

// Mock Supabase client
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
    },
  })),
}));

// Mock Prisma client
jest.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      create: jest.fn().mockResolvedValue({ id: 'test-order-id' }),
      update: jest.fn(),
    },
    profile: {
      findUnique: jest.fn().mockResolvedValue({ role: 'CUSTOMER' }),
    },
  },
}));

// Mock dependencies (Prisma, Square API, Supabase, etc.)
jest.mock('../../app/actions', () => {
  const actual = jest.requireActual('../../app/actions');
  return {
    ...actual,
    // Mock any external calls if needed
  };
});

describe('createOrderAndGenerateCheckoutUrl', () => {
  const baseCustomerInfo = {
    name: 'Test User',
    email: 'test@example.com',
    phone: '555-123-4567',
  };
  const baseItem = {
    id: 'prod-1',
    name: 'Test Product',
    price: 10.0,
    quantity: 2,
  };

  it('creates a PICKUP order with valid data', async () => {
    const fulfillment: FulfillmentData = {
      method: 'pickup',
      pickupTime: '2024-07-01T12:00:00',
    };
    const result = await createOrderAndGenerateCheckoutUrl({
      items: [baseItem],
      customerInfo: baseCustomerInfo,
      fulfillment,
    });
    expect(result.success).toBe(true);
    expect(result.checkoutUrl).toBeDefined();
    expect(result.error).toBeNull();
  });

  it('creates a DELIVERY order with valid data', async () => {
    const fulfillment: FulfillmentData = {
      method: 'delivery',
      deliveryAddress: {
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
        country: 'US',
        recipientName: 'Test User',
      },
      deliveryTime: '2024-07-01T14:00:00',
      deliveryInstructions: 'Leave at door',
    };
    const result = await createOrderAndGenerateCheckoutUrl({
      items: [baseItem],
      customerInfo: baseCustomerInfo,
      fulfillment,
    });
    expect(result.success).toBe(true);
    expect(result.checkoutUrl).toBeDefined();
    expect(result.error).toBeNull();
  });

  it('creates a SHIPPING order with valid data', async () => {
    const fulfillment: FulfillmentData = {
      method: 'shipping',
      shippingAddress: {
        street: '456 Market St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
        country: 'US',
        recipientName: 'Test User',
      },
      shippingMethod: 'Standard',
    };
    const result = await createOrderAndGenerateCheckoutUrl({
      items: [baseItem],
      customerInfo: baseCustomerInfo,
      fulfillment,
    });
    expect(result.success).toBe(true);
    expect(result.checkoutUrl).toBeDefined();
    expect(result.error).toBeNull();
  });

  it('fails with missing required fulfillment fields', async () => {
    // Missing pickupTime for pickup (omit the field entirely)
    // @ts-expect-error: purposely missing pickupTime
    const fulfillment: FulfillmentData = {
      method: 'pickup',
      // pickupTime is omitted
    };
    const result = await createOrderAndGenerateCheckoutUrl({
      items: [baseItem],
      customerInfo: baseCustomerInfo,
      fulfillment,
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('fails with missing address for delivery', async () => {
    // @ts-expect-error: purposely missing address
    const fulfillment: FulfillmentData = {
      method: 'delivery',
      deliveryTime: '2024-07-01T14:00:00',
    };
    const result = await createOrderAndGenerateCheckoutUrl({
      items: [baseItem],
      customerInfo: baseCustomerInfo,
      fulfillment,
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('fails with invalid fulfillment method', async () => {
    // Purposely invalid method, cast as any to bypass type check
    const fulfillment = {
      method: 'invalid_method',
    } as any;
    const result = await createOrderAndGenerateCheckoutUrl({
      items: [baseItem],
      customerInfo: baseCustomerInfo,
      fulfillment,
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('fails with empty items array', async () => {
    const fulfillment: FulfillmentData = {
      method: 'pickup',
      pickupTime: '2024-07-01T12:00:00',
    };
    const result = await createOrderAndGenerateCheckoutUrl({
      items: [],
      customerInfo: baseCustomerInfo,
      fulfillment,
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('fails with missing customer info', async () => {
    const fulfillment: FulfillmentData = {
      method: 'pickup',
      pickupTime: '2024-07-01T12:00:00',
    };
    // @ts-expect-error: purposely missing customerInfo
    const result = await createOrderAndGenerateCheckoutUrl({
      items: [baseItem],
      fulfillment,
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  // Add more edge case tests as needed (e.g., invalid dates, unsupported country codes, etc.)
}); 