/**
 * Order Test Data Factory
 * Generates realistic order data for testing
 */

import { faker } from '@faker-js/faker';
import { Prisma, OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client';

export interface OrderFactoryOptions {
  profileId?: string;
  orderNumber?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  fulfillmentType?: string;
  paymentMethod?: PaymentMethod;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  subtotal?: number;
  taxAmount?: number;
  shippingCost?: number;
  totalAmount?: number;
}

/**
 * Generate order data (does not create in database)
 */
export function buildOrder(options: OrderFactoryOptions = {}): Prisma.OrderUncheckedCreateInput {
  const subtotal = options.subtotal || faker.number.int({ min: 2000, max: 10000 }); // $20-$100
  const taxRate = 0.0825; // 8.25% tax
  const taxAmount = options.taxAmount || Math.round(subtotal * taxRate);
  const shippingCost = options.shippingCost || (options.fulfillmentType === 'NATIONWIDE_SHIPPING' ? faker.number.int({ min: 1000, max: 3000 }) : 0);
  const totalAmount = options.totalAmount || (subtotal + taxAmount + shippingCost);

  return {
    profileId: options.profileId || faker.string.uuid(),
    orderNumber: options.orderNumber || `ORD-${faker.string.alphanumeric(8).toUpperCase()}`,
    status: options.status || OrderStatus.PENDING,
    paymentStatus: options.paymentStatus || PaymentStatus.PENDING,
    fulfillmentType: options.fulfillmentType || faker.helpers.arrayElement(['PICKUP', 'LOCAL_DELIVERY', 'NATIONWIDE_SHIPPING']),
    paymentMethod: options.paymentMethod || faker.helpers.enumValue(PaymentMethod),
    customerName: options.customerName || faker.person.fullName(),
    customerEmail: options.customerEmail || faker.internet.email().toLowerCase(),
    customerPhone: options.customerPhone || faker.phone.number('(###) ###-####'),
    subtotal,
    taxAmount,
    shippingCost,
    totalAmount,
  };
}

/**
 * Generate multiple orders
 */
export function buildOrders(count: number, options: OrderFactoryOptions = {}): Prisma.OrderUncheckedCreateInput[] {
  return Array.from({ length: count }, () => buildOrder(options));
}

/**
 * Generate pending order
 */
export function buildPendingOrder(options: Omit<OrderFactoryOptions, 'status' | 'paymentStatus'> = {}): Prisma.OrderUncheckedCreateInput {
  return buildOrder({
    ...options,
    status: OrderStatus.PENDING,
    paymentStatus: PaymentStatus.PENDING,
  });
}

/**
 * Generate completed order
 */
export function buildCompletedOrder(options: Omit<OrderFactoryOptions, 'status' | 'paymentStatus'> = {}): Prisma.OrderUncheckedCreateInput {
  return buildOrder({
    ...options,
    status: OrderStatus.COMPLETED,
    paymentStatus: PaymentStatus.PAID,
  });
}

/**
 * Generate cancelled order
 */
export function buildCancelledOrder(options: Omit<OrderFactoryOptions, 'status' | 'paymentStatus'> = {}): Prisma.OrderUncheckedCreateInput {
  return buildOrder({
    ...options,
    status: OrderStatus.CANCELLED,
    paymentStatus: faker.helpers.arrayElement([PaymentStatus.CANCELLED, PaymentStatus.REFUNDED]),
  });
}

/**
 * Generate order with specific fulfillment type
 */
export function buildOrderWithFulfillment(
  fulfillmentType: string,
  options: Omit<OrderFactoryOptions, 'fulfillmentType'> = {}
): Prisma.OrderUncheckedCreateInput {
  return buildOrder({
    ...options,
    fulfillmentType,
    shippingCost: fulfillmentType === 'NATIONWIDE_SHIPPING' ? faker.number.int({ min: 1000, max: 3000 }) : 0,
  });
}

/**
 * Generate test order with predictable data
 */
export function buildTestOrder(suffix: string = ''): Prisma.OrderUncheckedCreateInput {
  return {
    profileId: 'test-profile-id',
    orderNumber: `TEST-ORDER${suffix}`,
    status: OrderStatus.PENDING,
    paymentStatus: PaymentStatus.PENDING,
    fulfillmentType: 'PICKUP',
    paymentMethod: PaymentMethod.CARD,
    customerName: `Test Customer${suffix}`,
    customerEmail: `test${suffix}@example.com`,
    customerPhone: '(555) 123-4567',
    subtotal: 5000, // $50.00
    taxAmount: 413, // $4.13 (8.25% tax)
    shippingCost: 0,
    totalAmount: 5413, // $54.13
  };
}

export interface OrderItemFactoryOptions {
  orderId?: string;
  productId?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  productName?: string;
  variantName?: string | null;
}

/**
 * Generate order item data
 */
export function buildOrderItem(options: OrderItemFactoryOptions = {}): Prisma.OrderItemUncheckedCreateInput {
  const quantity = options.quantity || faker.number.int({ min: 1, max: 5 });
  const unitPrice = options.unitPrice || faker.number.int({ min: 1000, max: 3000 }); // $10-$30
  const totalPrice = options.totalPrice || (unitPrice * quantity);

  return {
    orderId: options.orderId || faker.string.uuid(),
    productId: options.productId || faker.string.uuid(),
    quantity,
    unitPrice,
    totalPrice,
    productName: options.productName || faker.commerce.productName(),
    variantName: options.variantName === undefined ? faker.helpers.maybe(() => `${faker.number.int({ min: 4, max: 12 })}-pack`) : options.variantName,
  };
}

/**
 * Generate multiple order items
 */
export function buildOrderItems(count: number, options: OrderItemFactoryOptions = {}): Prisma.OrderItemUncheckedCreateInput[] {
  return Array.from({ length: count }, () => buildOrderItem(options));
}

/**
 * Generate order with items
 */
export interface OrderWithItemsOptions extends OrderFactoryOptions {
  itemCount?: number;
  itemOptions?: OrderItemFactoryOptions;
}

export function buildOrderWithItems(options: OrderWithItemsOptions = {}): {
  order: Prisma.OrderUncheckedCreateInput;
  items: Prisma.OrderItemUncheckedCreateInput[];
} {
  const itemCount = options.itemCount || faker.number.int({ min: 1, max: 5 });

  // Generate order items first to calculate totals
  const items = Array.from({ length: itemCount }, () => buildOrderItem(options.itemOptions || {}));

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxAmount = Math.round(subtotal * 0.0825);
  const shippingCost = options.fulfillmentType === 'NATIONWIDE_SHIPPING' ? faker.number.int({ min: 1000, max: 3000 }) : 0;
  const totalAmount = subtotal + taxAmount + shippingCost;

  const order = buildOrder({
    ...options,
    subtotal,
    taxAmount,
    shippingCost,
    totalAmount,
  });

  return {
    order,
    items: items.map(item => ({ ...item, orderId: order.orderNumber })),
  };
}
