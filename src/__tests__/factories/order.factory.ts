// Comprehensive Order Factory for Phase 4 QA Implementation
import { faker } from '@faker-js/faker';
import type { Order, OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client';
import { Decimal } from 'decimal.js';

export interface OrderFactoryOptions {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  fulfillmentType?: 'pickup' | 'local_delivery' | 'nationwide_shipping';
  total?: number;
  customerEmail?: string;
  customerName?: string;
  phone?: string;
  includeItems?: boolean;
  itemCount?: number;
  squareOrderId?: string;
  userId?: string;
  deliveryAddress?: Record<string, any>;
  pickupTime?: Date;
  deliveryDate?: Date;
}

/**
 * Creates a realistic order object with customizable options
 */
export function createMockOrder(overrides: OrderFactoryOptions = {}): Partial<Order> {
  const {
    status = 'PENDING',
    paymentStatus = 'PENDING',
    paymentMethod = 'SQUARE',
    fulfillmentType = 'pickup',
    total = faker.number.float({ min: 25, max: 200, precision: 0.01 }),
    customerEmail = faker.internet.email(),
    customerName = faker.person.fullName(),
    phone = faker.phone.number('415-###-####'),
    squareOrderId = `sq-order-${faker.string.uuid()}`,
    userId = faker.string.uuid(),
    pickupTime = faker.date.future({ days: 7 }),
    deliveryDate = fulfillmentType === 'local_delivery' ? faker.date.future({ days: 5 }) : undefined,
    ...customOverrides
  } = overrides;

  const subtotal = total * 0.92; // Approximate subtotal
  const tax = total * 0.08; // Approximate tax

  const baseOrder: Partial<Order> = {
    id: faker.string.uuid(),
    status: status as OrderStatus,
    paymentStatus: paymentStatus as PaymentStatus,
    paymentMethod: paymentMethod as PaymentMethod,
    fulfillmentType,
    customerName,
    email: customerEmail,
    phone,
    total: new Decimal(total),
    subtotal: new Decimal(subtotal),
    tax: new Decimal(tax),
    squareOrderId,
    userId,
    pickupTime,
    deliveryDate,
    deliveryTime: fulfillmentType === 'local_delivery' ? faker.helpers.arrayElement(['10:00', '11:00', '12:00', '13:00', '14:00']) : undefined,
    createdAt: faker.date.recent({ days: 30 }),
    updatedAt: faker.date.recent({ days: 1 }),
    notes: faker.lorem.sentence(),
    // Add delivery-specific fields
    ...(fulfillmentType === 'local_delivery' && {
      deliveryAddress: overrides.deliveryAddress || {
        street: faker.location.streetAddress(),
        city: 'San Francisco',
        state: 'CA',
        postalCode: faker.location.zipCode('#####'),
      },
      deliveryInstructions: faker.lorem.sentence(),
      deliveryFee: new Decimal(faker.number.float({ min: 5, max: 15, precision: 0.01 })),
    }),
    // Add shipping-specific fields
    ...(fulfillmentType === 'nationwide_shipping' && {
      shippingAddress: {
        recipientName: faker.person.fullName(),
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state({ abbreviated: true }),
        postalCode: faker.location.zipCode('#####'),
      },
      shippingMethodName: faker.helpers.arrayElement(['Standard', 'Express', 'Overnight']),
      shippingCost: new Decimal(faker.number.float({ min: 8, max: 25, precision: 0.01 })),
      trackingNumber: faker.string.alphanumeric(12).toUpperCase(),
    }),
    ...customOverrides,
  };

  return baseOrder;
}

/**
 * Creates multiple orders with varying characteristics
 */
export function createMockOrders(count: number, baseOptions: OrderFactoryOptions = {}): Partial<Order>[] {
  return Array.from({ length: count }, (_, index) => {
    // Vary the characteristics for realistic test data
    const variations: OrderFactoryOptions = {
      status: faker.helpers.arrayElement(['PENDING', 'PROCESSING', 'READY', 'COMPLETED', 'CANCELLED'] as OrderStatus[]),
      paymentMethod: faker.helpers.weightedArrayElement([
        { weight: 0.8, value: 'SQUARE' as PaymentMethod },
        { weight: 0.2, value: 'CASH' as PaymentMethod },
      ]),
      fulfillmentType: faker.helpers.weightedArrayElement([
        { weight: 0.6, value: 'pickup' },
        { weight: 0.3, value: 'local_delivery' },
        { weight: 0.1, value: 'nationwide_shipping' },
      ]),
      total: faker.number.float({ min: 15, max: 300, precision: 0.01 }),
    };

    return createMockOrder({ ...baseOptions, ...variations });
  });
}

/**
 * Creates orders for specific test scenarios
 */
export const OrderScenarios = {
  // Successful completed order
  completedOrder: (): Partial<Order> => createMockOrder({
    status: 'COMPLETED',
    paymentStatus: 'PAID',
    paymentMethod: 'SQUARE',
    fulfillmentType: 'pickup',
    total: 65.50,
  }),

  // Failed payment order
  failedPaymentOrder: (): Partial<Order> => createMockOrder({
    status: 'CANCELLED',
    paymentStatus: 'FAILED',
    paymentMethod: 'SQUARE',
    fulfillmentType: 'pickup',
    total: 45.99,
  }),

  // Cash order awaiting pickup
  cashOrder: (): Partial<Order> => createMockOrder({
    status: 'PENDING',
    paymentStatus: 'PENDING',
    paymentMethod: 'CASH',
    fulfillmentType: 'pickup',
    total: 28.50,
  }),

  // Delivery order with address
  deliveryOrder: (): Partial<Order> => createMockOrder({
    status: 'PROCESSING',
    paymentStatus: 'PAID',
    paymentMethod: 'SQUARE',
    fulfillmentType: 'local_delivery',
    total: 89.75,
    deliveryAddress: {
      street: '123 Mission St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94105',
    },
  }),

  // Large catering order
  cateringOrder: (): Partial<Order> => createMockOrder({
    status: 'PROCESSING',
    paymentStatus: 'PAID',
    paymentMethod: 'SQUARE',
    fulfillmentType: 'pickup',
    total: 285.00,
    customerName: 'Acme Corp',
    customerEmail: 'catering@acmecorp.com',
  }),

  // Shipping order
  shippingOrder: (): Partial<Order> => createMockOrder({
    status: 'SHIPPING',
    paymentStatus: 'PAID',
    paymentMethod: 'SQUARE',
    fulfillmentType: 'nationwide_shipping',
    total: 125.99,
  }),

  // Minimum order amount
  minimumOrder: (): Partial<Order> => createMockOrder({
    status: 'PENDING',
    paymentStatus: 'PENDING',
    paymentMethod: 'SQUARE',
    fulfillmentType: 'pickup',
    total: 25.00, // Minimum order amount
  }),

  // Order missing customer info (edge case)
  incompleteOrder: (): Partial<Order> => createMockOrder({
    status: 'PENDING',
    paymentStatus: 'PENDING',
    paymentMethod: 'SQUARE',
    fulfillmentType: 'pickup',
    total: 35.00,
    customerEmail: '',
    phone: '',
  }),
};

/**
 * Creates a complete order with items for database seeding
 */
export function createCompleteOrderWithItems(options: OrderFactoryOptions = {}) {
  const order = createMockOrder(options);
  const itemCount = options.itemCount || faker.number.int({ min: 1, max: 5 });
  
  const items = Array.from({ length: itemCount }, () => ({
    id: faker.string.uuid(),
    productId: faker.string.uuid(),
    variantId: faker.string.uuid(),
    quantity: faker.number.int({ min: 1, max: 4 }),
    price: new Decimal(faker.number.float({ min: 8, max: 25, precision: 0.01 })),
    orderId: order.id!,
  }));

  return { order, items };
}
