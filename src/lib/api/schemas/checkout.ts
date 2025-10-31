/**
 * Checkout & Payment API Schemas
 *
 * Zod schemas for checkout and payment processing endpoints
 * for request/response validation and OpenAPI generation.
 */

import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import {
  MoneySchema,
  IdParamSchema,
  EmailSchema,
  PhoneSchema,
  AddressSchema,
  StatusSchema,
  TimestampSchema,
} from './common';

// Extend Zod with OpenAPI extensions
extendZodWithOpenApi(z);

/**
 * Fulfillment type enum
 */
export const FulfillmentTypeSchema = z
  .enum(['PICKUP', 'DELIVERY', 'SHIPPING'])
  .describe('Order fulfillment method');

export type FulfillmentType = z.infer<typeof FulfillmentTypeSchema>;

/**
 * Payment method enum
 */
export const PaymentMethodSchema = z
  .enum(['CREDIT_CARD', 'GIFT_CARD', 'CASH', 'VENMO', 'ZELLE'])
  .describe('Payment method used for the order');

export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

/**
 * Payment status enum
 */
export const PaymentStatusSchema = z
  .enum(['PENDING', 'APPROVED', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'])
  .describe('Payment processing status');

export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

/**
 * Order item schema
 */
export const OrderItemSchema = z.object({
  productId: z.string().uuid().describe('Product UUID'),
  productName: z.string().min(1).describe('Product name at time of order'),
  variantId: z.string().uuid().nullable().optional().describe('Variant UUID if applicable'),
  variantName: z.string().nullable().optional().describe('Variant name if applicable'),
  quantity: z.number().int().positive().describe('Quantity ordered'),
  unitPrice: MoneySchema.describe('Unit price in cents at time of order'),
  total: MoneySchema.describe('Line item total (quantity × unitPrice)'),
});

export type OrderItem = z.infer<typeof OrderItemSchema>;

/**
 * Cart item schema (for request)
 */
export const CartItemSchema = z.object({
  id: z.string().describe('Product or variant ID'),
  name: z.string().min(1).describe('Product name'),
  price: MoneySchema.describe('Unit price in cents'),
  quantity: z.number().int().positive().describe('Quantity'),
  variantId: z.string().optional().nullable().describe('Variant ID if applicable'),
  imageUrl: z.string().url().optional().describe('Product image URL'),
});

export type CartItem = z.infer<typeof CartItemSchema>;

/**
 * POST /api/checkout/payment request body
 */
export const CreatePaymentRequestSchema = z.object({
  sourceId: z
    .string()
    .min(1)
    .describe('Square payment source ID (card nonce or gift card nonce)'),
  orderId: z.string().uuid().describe('Order UUID to process payment for'),
  amount: z.number().int().positive().describe('Payment amount in cents (must be positive)'),
});

export type CreatePaymentRequest = z.infer<typeof CreatePaymentRequestSchema>;

/**
 * POST /api/checkout/payment response
 */
export const CreatePaymentResponseSchema = z.object({
  success: z.boolean().describe('Payment success status'),
  paymentId: z.string().describe('Square payment ID'),
});

export type CreatePaymentResponse = z.infer<typeof CreatePaymentResponseSchema>;

/**
 * POST /api/checkout/order request body
 */
export const CreateOrderRequestSchema = z
  .object({
    customerName: z.string().min(1).max(255).describe('Customer full name'),
    email: EmailSchema.describe('Customer email address'),
    phone: PhoneSchema.describe('Customer phone number'),
    fulfillmentType: FulfillmentTypeSchema.describe('Order fulfillment method'),
    paymentMethod: PaymentMethodSchema.describe('Payment method'),
    items: z
      .array(CartItemSchema)
      .min(1)
      .describe('Cart items to include in the order'),
    notes: z.string().max(1000).optional().describe('Special instructions or notes'),
    pickupDate: z
      .string()
      .datetime()
      .optional()
      .describe('Requested pickup date (for PICKUP orders)'),
    deliveryAddress: AddressSchema.optional().describe('Delivery address (for DELIVERY orders)'),
    shippingAddress: AddressSchema.optional().describe('Shipping address (for SHIPPING orders)'),
    shippingMethod: z
      .string()
      .optional()
      .describe('Shipping method (for SHIPPING orders, e.g., "USPS Priority")'),
    shippingCost: MoneySchema.optional().describe('Shipping cost in cents (for SHIPPING orders)'),
    subtotal: MoneySchema.describe('Order subtotal in cents (before fees)'),
    tax: MoneySchema.optional().describe('Tax amount in cents'),
    total: MoneySchema.describe('Order total in cents (including all fees)'),
  });

export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;

/**
 * Order schema (full details)
 */
export const OrderSchema = z
  .object({
    id: z.string().uuid().describe('Order UUID'),
    orderNumber: z.string().describe('Human-readable order number'),
    status: StatusSchema.describe('Order status'),
    paymentStatus: PaymentStatusSchema.describe('Payment status'),
    customerName: z.string().describe('Customer name'),
    email: EmailSchema.describe('Customer email'),
    phone: PhoneSchema.describe('Customer phone'),
    fulfillmentType: FulfillmentTypeSchema.describe('Fulfillment method'),
    paymentMethod: PaymentMethodSchema.describe('Payment method'),
    items: z.array(OrderItemSchema).describe('Order items'),
    notes: z.string().nullable().optional().describe('Order notes'),
    pickupDate: TimestampSchema.nullable().optional().describe('Pickup date'),
    deliveryAddress: AddressSchema.nullable().optional().describe('Delivery address'),
    shippingAddress: AddressSchema.nullable().optional().describe('Shipping address'),
    shippingMethod: z.string().nullable().optional().describe('Shipping method'),
    shippingCost: MoneySchema.nullable().optional().describe('Shipping cost'),
    subtotal: MoneySchema.describe('Subtotal'),
    tax: MoneySchema.nullable().optional().describe('Tax amount'),
    total: MoneySchema.describe('Total amount'),
    squareOrderId: z.string().nullable().optional().describe('Square order ID'),
    squarePaymentId: z.string().nullable().optional().describe('Square payment ID'),
    createdAt: TimestampSchema.describe('Order creation timestamp'),
    updatedAt: TimestampSchema.describe('Order last update timestamp'),
  });

export type Order = z.infer<typeof OrderSchema>;

/**
 * POST /api/checkout/order response
 */
export const CreateOrderResponseSchema = z.object({
  success: z.boolean().describe('Order creation success status'),
  orderId: z.string().uuid().describe('Created order UUID'),
  order: OrderSchema.describe('Created order details'),
});

export type CreateOrderResponse = z.infer<typeof CreateOrderResponseSchema>;

/**
 * GET /api/orders/:id parameters
 */
export const GetOrderParamsSchema = IdParamSchema;

/**
 * GET /api/orders/:id response
 */
export const GetOrderResponseSchema = OrderSchema;

/**
 * GET /api/orders query parameters
 */
export const GetOrdersQuerySchema = z.object({
  status: StatusSchema.optional().describe('Filter by order status'),
  paymentStatus: PaymentStatusSchema.optional().describe('Filter by payment status'),
  email: EmailSchema.optional().describe('Filter by customer email'),
  page: z.coerce.number().int().positive().default(1).optional().describe('Page number'),
  limit: z.coerce.number().int().positive().max(100).default(20).optional().describe('Page size'),
  startDate: TimestampSchema.optional().describe('Filter orders after this date'),
  endDate: TimestampSchema.optional().describe('Filter orders before this date'),
});

export type GetOrdersQuery = z.infer<typeof GetOrdersQuerySchema>;

/**
 * GET /api/orders response
 */
export const GetOrdersResponseSchema = z.array(OrderSchema);

/**
 * PATCH /api/orders/:id request body (admin)
 */
export const UpdateOrderRequestSchema = z.object({
  status: StatusSchema.optional().describe('Update order status'),
  paymentStatus: PaymentStatusSchema.optional().describe('Update payment status'),
  notes: z.string().max(1000).optional().describe('Update order notes'),
});

export type UpdateOrderRequest = z.infer<typeof UpdateOrderRequestSchema>;

/**
 * PATCH /api/orders/:id response
 */
export const UpdateOrderResponseSchema = OrderSchema;
