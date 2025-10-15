# Orders API

## Overview

The Orders API handles order creation, retrieval, and management for both regular and catering orders.

## Customer Endpoints

### Create Order

```http
POST /api/orders
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "items": [
    {
      "productId": "prod_123",
      "variantId": "var_large",
      "quantity": 2,
      "customizations": []
    }
  ],
  "deliveryAddress": {
    "streetAddress": "123 Main St",
    "aptSuite": "Apt 4B",
    "city": "San Francisco",
    "state": "CA",
    "zipCode": "94102",
    "deliveryInstructions": "Ring doorbell twice"
  },
  "paymentMethodId": "pm_card_123",
  "specialInstructions": "Extra napkins please",
  "isCateringOrder": false,
  "deliveryDate": "2025-07-26T18:00:00Z"
}
```

**Response:**

```typescript
interface CreateOrderResponse {
  success: boolean;
  data: {
    order: Order;
    paymentIntent: {
      id: string;
      status: string;
      clientSecret?: string;
    };
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerId?: string;
  items: OrderItem[];
  pricing: {
    subtotal: number;
    deliveryFee: number;
    tax: number;
    total: number;
  };
  deliveryAddress: Address;
  isCateringOrder: boolean;
  specialInstructions?: string;
  estimatedDeliveryTime?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Get User Orders

```http
GET /api/orders
Authorization: Bearer <user_token>
```

**Query Parameters:**

- `status` (string): Filter by order status
- `limit` (number): Number of orders to return (default: 10)
- `page` (number): Page number for pagination
- `startDate` (string): Filter orders from this date
- `endDate` (string): Filter orders until this date

**Example:**

```http
GET /api/orders?status=delivered&limit=5&page=1
```

### Get Single Order

```http
GET /api/orders/{orderId}
Authorization: Bearer <user_token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "order_123",
    "orderNumber": "DSF-2025-001234",
    "status": "confirmed",
    "items": [
      {
        "id": "item_456",
        "productId": "prod_123",
        "productName": "Signature Pasta",
        "variantName": "Large",
        "quantity": 2,
        "unitPrice": 32.99,
        "totalPrice": 65.98
      }
    ],
    "pricing": {
      "subtotal": 65.98,
      "deliveryFee": 5.99,
      "tax": 6.47,
      "total": 78.44
    },
    "deliveryAddress": {
      "streetAddress": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "zipCode": "94102"
    },
    "estimatedDeliveryTime": "2025-07-26T19:30:00Z",
    "trackingInfo": {
      "status": "in_preparation",
      "estimatedDelivery": "2025-07-26T19:30:00Z",
      "updates": [
        {
          "status": "confirmed",
          "timestamp": "2025-07-26T17:00:00Z",
          "message": "Order confirmed and sent to kitchen"
        }
      ]
    }
  }
}
```

### Cancel Order

```http
POST /api/orders/{orderId}/cancel
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "reason": "Changed my mind"
}
```

### Reorder Previous Order

```http
POST /api/orders/{orderId}/reorder
Authorization: Bearer <user_token>
```

## Admin Endpoints

### Get All Orders (Admin Only)

```http
GET /api/admin/orders
Authorization: Bearer <admin_token>
```

**Query Parameters:**

- `status` (string): Filter by order status
- `customerId` (string): Filter by customer
- `isCateringOrder` (boolean): Filter catering orders
- `deliveryDate` (string): Filter by delivery date
- `limit` (number): Results per page
- `page` (number): Page number
- `sortBy` (string): Sort field (createdAt, total, status)
- `sortOrder` (string): Sort direction (asc, desc)

### Update Order Status (Admin Only)

```http
PATCH /api/orders/{orderId}/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "in_preparation",
  "notes": "Started preparation at 5:30 PM"
}
```

**Valid Status Transitions:**

- `pending` → `confirmed`
- `confirmed` → `in_preparation`
- `in_preparation` → `ready_for_pickup`
- `ready_for_pickup` → `out_for_delivery`
- `out_for_delivery` → `delivered`
- Any status → `cancelled` (with reason)

### Archive Order (Admin Only)

```http
POST /api/orders/{orderId}/archive
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "Order completed and archived"
}
```

### Get Order Analytics (Admin Only)

```http
GET /api/admin/orders/analytics
Authorization: Bearer <admin_token>
```

**Query Parameters:**

- `startDate` (string): Start date for analytics
- `endDate` (string): End date for analytics
- `groupBy` (string): Group results by (day, week, month)

**Response:**

```typescript
interface OrderAnalytics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Record<OrderStatus, number>;
  revenueByDay: Array<{
    date: string;
    revenue: number;
    orderCount: number;
  }>;
  topProducts: Array<{
    productId: string;
    productName: string;
    orderCount: number;
    revenue: number;
  }>;
}
```

## Order Status Types

```typescript
enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PREPARATION = 'in_preparation',
  READY_FOR_PICKUP = 'ready_for_pickup',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}
```

## Webhooks

### Order Status Updates

Orders API sends webhooks for status changes to configured endpoints:

```json
{
  "event": "order.status_updated",
  "data": {
    "orderId": "order_123",
    "previousStatus": "confirmed",
    "newStatus": "in_preparation",
    "timestamp": "2025-07-26T17:30:00Z"
  }
}
```

## Error Responses

### Common Error Codes

- `ORDER_NOT_FOUND`: Order does not exist
- `INVALID_ORDER_STATUS`: Invalid status transition
- `INSUFFICIENT_PERMISSIONS`: Access denied
- `ORDER_CANNOT_BE_CANCELLED`: Order too far in process
- `PAYMENT_FAILED`: Payment processing error
- `INVALID_DELIVERY_ADDRESS`: Address validation failed

### Example Error Response

```json
{
  "success": false,
  "error": {
    "code": "ORDER_CANNOT_BE_CANCELLED",
    "message": "Orders that are out for delivery cannot be cancelled",
    "details": {
      "orderId": "order_123",
      "currentStatus": "out_for_delivery"
    }
  }
}
```

## Rate Limits

- **Customer endpoints**: 100 requests per minute
- **Admin endpoints**: 1000 requests per minute
- **Order creation**: 10 requests per minute per user

## Caching

- Order list responses cached for 1 minute
- Individual orders cached for 30 seconds (admin), not cached (customer)
- Analytics data cached for 15 minutes
