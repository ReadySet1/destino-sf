/**
 * Schema Registration
 *
 * Centralized registration of all API schemas and routes
 * with the OpenAPI registry for documentation generation.
 */

import { registry, registerSchema, registerRoute } from './schema-generator';
import {
  // Common schemas
  ApiErrorSchema,
  PaginationSchema,
  SuccessResponseSchema,
} from './schemas/common';
import {
  // Products schemas
  ProductSchema,
  ProductCategorySchema,
  ProductVariantSchema,
  ProductSummarySchema,
  GetProductsQuerySchema,
  GetProductsResponseSchema,
  GetProductsPaginatedResponseSchema,
  GetProductByIdParamsSchema,
  GetProductByIdResponseSchema,
  GetProductBySlugParamsSchema,
  GetProductBySlugResponseSchema,
  CreateProductRequestSchema,
  CreateProductResponseSchema,
  UpdateProductRequestSchema,
  UpdateProductResponseSchema,
  DeleteProductParamsSchema,
  DeleteProductResponseSchema,
  // Extended Products schemas (Phase 3)
  ProductDisplayOrderSchema,
  GetProductsByCategoryQuerySchema,
  GetProductsByCategoryParamsSchema,
  GetProductsByCategoryResponseSchema,
  ProductValidationIssueSchema,
  ValidateProductRequestSchema,
  ValidateProductResponseSchema,
  ProductReorderUpdateSchema,
  ReorderProductsRequestSchema,
  ReorderProductsResponseSchema,
  ReorderStrategySchema,
  QuickSortProductsRequestSchema,
  QuickSortProductsResponseSchema,
  GetCategoriesResponseSchema,
} from './schemas/products';
import {
  // Checkout schemas
  FulfillmentTypeSchema,
  PaymentMethodSchema,
  PaymentStatusSchema,
  OrderItemSchema,
  CartItemSchema,
  CreatePaymentRequestSchema,
  CreatePaymentResponseSchema,
  CreateOrderRequestSchema,
  OrderSchema,
  CreateOrderResponseSchema,
  GetOrderParamsSchema,
  GetOrderResponseSchema,
  GetOrdersQuerySchema,
  GetOrdersResponseSchema,
  UpdateOrderRequestSchema,
  UpdateOrderResponseSchema,
} from './schemas/checkout';
import {
  // Orders schemas
  OrderStatusSchema,
  PaymentStatusSchema as OrderPaymentStatusSchema,
  PaymentMethodSchema as OrderPaymentMethodSchema,
  FulfillmentTypeSchema as OrderFulfillmentTypeSchema,
  OrderItemSchema as OrdersOrderItemSchema,
  OrderSchema as OrdersOrderSchema,
  OrderSummarySchema,
  GetOrdersQuerySchema as OrdersGetOrdersQuerySchema,
  GetOrdersResponseSchema as OrdersGetOrdersResponseSchema,
  GetOrderByIdParamsSchema,
  GetOrderByIdResponseSchema,
  UpdateOrderRequestSchema as OrdersUpdateOrderRequestSchema,
  UpdateOrderResponseSchema as OrdersUpdateOrderResponseSchema,
  RetryPaymentRequestSchema,
  RetryPaymentResponseSchema,
  UserOrderSchema,
  GetUserOrdersResponseSchema,
} from './schemas/orders';
import {
  // Catering schemas
  CateringStatusSchema,
  DeliveryZoneSchema,
  CateringItemTypeSchema,
  CateringCategorySchema,
  CateringItemSchema,
  CateringOrderItemSchema,
  CateringOrderSchema,
  BoxedLunchEntreeSchema,
  BoxedLunchTierSchema,
  LegacyBoxedLunchItemSchema,
  GetCateringOrderByIdResponseSchema,
} from './schemas/catering';

/**
 * Register all component schemas with the OpenAPI registry
 */
export function registerComponentSchemas() {
  // Common components
  registerSchema('ApiError', ApiErrorSchema);
  registerSchema('Pagination', PaginationSchema);
  registerSchema('SuccessResponse', SuccessResponseSchema);

  // Product components
  registerSchema('Product', ProductSchema);
  registerSchema('ProductCategory', ProductCategorySchema);
  registerSchema('ProductVariant', ProductVariantSchema);
  registerSchema('ProductSummary', ProductSummarySchema);

  // Extended Products components (Phase 3)
  registerSchema('ProductDisplayOrder', ProductDisplayOrderSchema);
  registerSchema('ProductValidationIssue', ProductValidationIssueSchema);
  registerSchema('ProductReorderUpdate', ProductReorderUpdateSchema);
  registerSchema('ReorderStrategy', ReorderStrategySchema);

  // Checkout/Order components
  registerSchema('FulfillmentType', FulfillmentTypeSchema);
  registerSchema('PaymentMethod', PaymentMethodSchema);
  registerSchema('PaymentStatus', PaymentStatusSchema);
  registerSchema('OrderItem', OrderItemSchema);
  registerSchema('CartItem', CartItemSchema);
  registerSchema('Order', OrderSchema);

  // Orders API components
  registerSchema('OrderStatus', OrderStatusSchema);
  registerSchema('OrderSummary', OrderSummarySchema);
  registerSchema('UserOrder', UserOrderSchema);

  // Catering API components
  registerSchema('CateringStatus', CateringStatusSchema);
  registerSchema('DeliveryZone', DeliveryZoneSchema);
  registerSchema('CateringItemType', CateringItemTypeSchema);
  registerSchema('CateringCategory', CateringCategorySchema);
  registerSchema('CateringItem', CateringItemSchema);
  registerSchema('CateringOrderItem', CateringOrderItemSchema);
  registerSchema('CateringOrder', CateringOrderSchema);
  registerSchema('BoxedLunchEntree', BoxedLunchEntreeSchema);
  registerSchema('BoxedLunchTier', BoxedLunchTierSchema);
  registerSchema('LegacyBoxedLunchItem', LegacyBoxedLunchItemSchema);
}

/**
 * Register all API routes with the OpenAPI registry
 *
 * NOTE: Path registration is commented out for now as it requires schemas with OpenAPI metadata.
 * For Phase 2, we'll use validation middleware directly on routes instead.
 * OpenAPI documentation can be generated from component schemas in the future.
 */
export function registerApiRoutes() {
  // Paths will be registered in future phase when applying middleware to actual routes
  return;

  /* Path registration - TODO: implement with proper OpenAPI metadata

  // Example of how routes would be registered:
  /*
  // ============================================================
  // Products API Routes
  // ============================================================

  registerRoute({
    method: 'get',
    path: '/api/products',
    summary: 'List all products',
    description: 'Retrieve a list of products with optional filtering, pagination, and sorting',
    tags: ['Products'],
    request: {
      query: GetProductsQuerySchema,
    },
    responses: {
      200: {
        description: 'List of products (with or without pagination)',
        content: {
          'application/json': {
            schema: GetProductsResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid query parameters',
        content: {
          'application/json': {
            schema: ApiErrorSchema,
          },
        },
      },
    },
  });

  registerRoute({
    method: 'get',
    path: '/api/products/{id}',
    summary: 'Get product by ID',
    description: 'Retrieve detailed information about a specific product by UUID',
    tags: ['Products'],
    request: {
      params: GetProductByIdParamsSchema,
    },
    responses: {
      200: {
        description: 'Product details',
        content: {
          'application/json': {
            schema: GetProductByIdResponseSchema,
          },
        },
      },
      404: {
        description: 'Product not found',
        content: {
          'application/json': {
            schema: ApiErrorSchema,
          },
        },
      },
    },
  });

  registerRoute({
    method: 'get',
    path: '/api/products/slug/{slug}',
    summary: 'Get product by slug',
    description: 'Retrieve detailed information about a specific product by URL slug',
    tags: ['Products'],
    request: {
      params: GetProductBySlugParamsSchema,
    },
    responses: {
      200: {
        description: 'Product details',
        content: {
          'application/json': {
            schema: GetProductBySlugResponseSchema,
          },
        },
      },
      404: {
        description: 'Product not found',
        content: {
          'application/json': {
            schema: ApiErrorSchema,
          },
        },
      },
    },
  });

  // ============================================================
  // Checkout API Routes
  // ============================================================

  registerRoute({
    method: 'post',
    path: '/api/checkout/payment',
    summary: 'Process payment',
    description: 'Process a payment for an existing order using Square',
    tags: ['Checkout'],
    request: {
      body: {
        content: {
          'application/json': {
            schema: CreatePaymentRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Payment processed successfully',
        content: {
          'application/json': {
            schema: CreatePaymentResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid payment request',
        content: {
          'application/json': {
            schema: ApiErrorSchema,
          },
        },
      },
      500: {
        description: 'Payment processing failed',
        content: {
          'application/json': {
            schema: ApiErrorSchema,
          },
        },
      },
    },
  });

  registerRoute({
    method: 'post',
    path: '/api/checkout',
    summary: 'Create order',
    description: 'Create a new order with customer details and cart items',
    tags: ['Checkout'],
    request: {
      body: {
        content: {
          'application/json': {
            schema: CreateOrderRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Order created successfully',
        content: {
          'application/json': {
            schema: CreateOrderResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid order request',
        content: {
          'application/json': {
            schema: ApiErrorSchema,
          },
        },
      },
    },
  });

  // ============================================================
  // Orders API Routes
  // ============================================================

  registerRoute({
    method: 'get',
    path: '/api/orders',
    summary: 'List orders',
    description: 'Retrieve a list of orders with optional filtering',
    tags: ['Orders'],
    request: {
      query: GetOrdersQuerySchema,
    },
    responses: {
      200: {
        description: 'List of orders',
        content: {
          'application/json': {
            schema: GetOrdersResponseSchema,
          },
        },
      },
    },
  });

  registerRoute({
    method: 'get',
    path: '/api/orders/{id}',
    summary: 'Get order by ID',
    description: 'Retrieve detailed information about a specific order',
    tags: ['Orders'],
    request: {
      params: GetOrderParamsSchema,
    },
    responses: {
      200: {
        description: 'Order details',
        content: {
          'application/json': {
            schema: GetOrderResponseSchema,
          },
        },
      },
      404: {
        description: 'Order not found',
        content: {
          'application/json': {
            schema: ApiErrorSchema,
          },
        },
      },
    },
  });

  registerRoute({
    method: 'patch',
    path: '/api/orders/{id}',
    summary: 'Update order',
    description: 'Update order status or details (admin only)',
    tags: ['Orders'],
    request: {
      params: GetOrderParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: UpdateOrderRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Order updated successfully',
        content: {
          'application/json': {
            schema: UpdateOrderResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid update request',
        content: {
          'application/json': {
            schema: ApiErrorSchema,
          },
        },
      },
      404: {
        description: 'Order not found',
        content: {
          'application/json': {
            schema: ApiErrorSchema,
          },
        },
      },
    },
  });
  */
}

/**
 * Initialize all schema and route registrations
 */
export function initializeOpenAPIRegistry() {
  registerComponentSchemas();
  registerApiRoutes();
}
