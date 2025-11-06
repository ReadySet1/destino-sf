/**
 * Orders API Schemas
 *
 * Zod schemas for order-related API endpoints validation.
 * Covers regular orders, order retrieval, status updates, and payment retry.
 */

import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

// ============================================================
// Enums and Constants
// ============================================================

/**
 * Order status enum
 */
export const OrderStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'CANCELLED',
  'FAILED',
]);

/**
 * Payment status enum
 */
export const PaymentStatusSchema = z.enum([
  'PENDING',
  'COMPLETED',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
]);

/**
 * Payment method enum
 */
export const PaymentMethodSchema = z.enum(['SQUARE', 'VENMO', 'CASH', 'ZELLE']);

/**
 * Fulfillment type enum
 */
export const FulfillmentTypeSchema = z.enum(['pickup', 'delivery', 'nationwide-shipping']);

// ============================================================
// Order Item Schemas
// ============================================================

/**
 * Order item product reference
 */
export const OrderItemProductSchema = z.object({
  name: z.string(),
  images: z.array(z.string()).optional(),
});

/**
 * Order item variant reference
 */
export const OrderItemVariantSchema = z.object({
  name: z.string(),
});

/**
 * Order item schema
 */
export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
  product: OrderItemProductSchema.nullable().optional(),
  variant: OrderItemVariantSchema.nullable().optional(),
});

// ============================================================
// Order Schema
// ============================================================

/**
 * Full order schema
 */
export const OrderSchema = z.object({
  id: z.string().uuid(),
  squareOrderId: z.string().nullable().optional(),
  status: OrderStatusSchema,
  total: z.number().nonnegative(),
  userId: z.string().uuid().nullable().optional(),
  customerName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  fulfillmentType: FulfillmentTypeSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  pickupTime: z.string().datetime().nullable().optional(),
  deliveryDate: z.string().nullable().optional(),
  deliveryTime: z.string().nullable().optional(),
  shippingMethodName: z.string().nullable().optional(),
  shippingCarrier: z.string().nullable().optional(),
  shippingServiceLevelToken: z.string().nullable().optional(),
  shippingCostCents: z.number().int().nullable().optional(),
  shippingRateId: z.string().nullable().optional(),
  trackingNumber: z.string().nullable().optional(),
  cancelReason: z.string().nullable().optional(),
  paymentStatus: PaymentStatusSchema,
  paymentMethod: PaymentMethodSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  taxAmount: z.number().nonnegative(),
  deliveryFee: z.number().nonnegative(),
  serviceFee: z.number().nonnegative(),
  gratuityAmount: z.number().nonnegative(),
  isCateringOrder: z.boolean(),
  isArchived: z.boolean(),
  archiveReason: z.string().nullable().optional(),
  archivedAt: z.string().datetime().nullable().optional(),
  retryCount: z.number().int().nonnegative(),
  lastRetryAt: z.string().datetime().nullable().optional(),
  paymentUrl: z.string().url().nullable().optional(),
  paymentUrlExpiresAt: z.string().datetime().nullable().optional(),
  labelUrl: z.string().url().nullable().optional(),
  labelCreatedAt: z.string().datetime().nullable().optional(),
  items: z.array(OrderItemSchema),
});

/**
 * Order summary schema (minimal order info for listings)
 */
export const OrderSummarySchema = OrderSchema.pick({
  id: true,
  status: true,
  total: true,
  customerName: true,
  email: true,
  paymentStatus: true,
  fulfillmentType: true,
  createdAt: true,
  trackingNumber: true,
  shippingCarrier: true,
}).extend({
  itemCount: z.number().int().nonnegative(),
});

// ============================================================
// GET /api/orders - List Orders
// ============================================================

/**
 * Query parameters for listing orders
 */
export const GetOrdersQuerySchema = z.object({
  status: OrderStatusSchema.optional(),
  paymentStatus: PaymentStatusSchema.optional(),
  fulfillmentType: FulfillmentTypeSchema.optional(),
  userId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
  includeArchived: z.coerce.boolean().optional().default(false),
});

/**
 * Response for listing orders
 */
export const GetOrdersResponseSchema = z.object({
  orders: z.array(OrderSchema),
  total: z.number().int().nonnegative().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
});

// ============================================================
// GET /api/orders/[orderId] - Get Order by ID
// ============================================================

/**
 * Path parameters for getting order by ID
 */
export const GetOrderByIdParamsSchema = z.object({
  orderId: z.string().uuid(),
});

/**
 * Response for getting order by ID
 */
export const GetOrderByIdResponseSchema = z.object({
  success: z.boolean(),
  order: OrderSchema.optional(),
  error: z.string().optional(),
});

// ============================================================
// PATCH /api/orders/[orderId] - Update Order
// ============================================================

/**
 * Request body for updating order
 */
export const UpdateOrderRequestSchema = z.object({
  status: OrderStatusSchema.optional(),
  paymentStatus: PaymentStatusSchema.optional(),
  notes: z.string().optional(),
  trackingNumber: z.string().optional(),
  shippingCarrier: z.string().optional(),
  cancelReason: z.string().optional(),
  isArchived: z.boolean().optional(),
  archiveReason: z.string().optional(),
});

/**
 * Response for updating order
 */
export const UpdateOrderResponseSchema = z.object({
  success: z.boolean(),
  order: OrderSchema.optional(),
  error: z.string().optional(),
});

// ============================================================
// POST /api/orders/[orderId]/retry-payment - Retry Payment
// ============================================================

/**
 * Request body for retrying payment (optional payment method override)
 */
export const RetryPaymentRequestSchema = z.object({
  paymentMethod: PaymentMethodSchema.optional(),
});

/**
 * Response for retrying payment
 */
export const RetryPaymentResponseSchema = z.object({
  success: z.boolean(),
  order: OrderSchema.optional(),
  paymentUrl: z.string().url().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

// ============================================================
// GET /api/user/orders - User's Orders
// ============================================================

/**
 * Unified order schema for user orders (combines regular + catering)
 */
export const UserOrderSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  status: z.string(),
  total: z.number().nonnegative(),
  paymentStatus: z.string(),
  trackingNumber: z.string().nullable().optional(),
  shippingCarrier: z.string().nullable().optional(),
  type: z.enum(['regular', 'catering']),
  eventDate: z.string().datetime().nullable().optional(),
  numberOfPeople: z.number().int().positive().nullable().optional(),
  items: z.array(
    z.object({
      id: z.string().uuid(),
      quantity: z.number().int().positive(),
      price: z.number().nonnegative(),
      product: z.object({ name: z.string() }).nullable().optional(),
      variant: z.object({ name: z.string() }).nullable().optional(),
      name: z.string().optional(), // For catering items
    })
  ),
});

/**
 * Response for user orders
 */
export const GetUserOrdersResponseSchema = z.array(UserOrderSchema);

// ============================================================
// Type Exports
// ============================================================

export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
export type FulfillmentType = z.infer<typeof FulfillmentTypeSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type OrderSummary = z.infer<typeof OrderSummarySchema>;
export type GetOrdersQuery = z.infer<typeof GetOrdersQuerySchema>;
export type GetOrdersResponse = z.infer<typeof GetOrdersResponseSchema>;
export type GetOrderByIdParams = z.infer<typeof GetOrderByIdParamsSchema>;
export type GetOrderByIdResponse = z.infer<typeof GetOrderByIdResponseSchema>;
export type UpdateOrderRequest = z.infer<typeof UpdateOrderRequestSchema>;
export type UpdateOrderResponse = z.infer<typeof UpdateOrderResponseSchema>;
export type RetryPaymentRequest = z.infer<typeof RetryPaymentRequestSchema>;
export type RetryPaymentResponse = z.infer<typeof RetryPaymentResponseSchema>;
export type UserOrder = z.infer<typeof UserOrderSchema>;
export type GetUserOrdersResponse = z.infer<typeof GetUserOrdersResponseSchema>;
