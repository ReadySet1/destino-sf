# API Architecture

## Overview

Destino SF implements a hybrid API architecture combining Next.js API routes with tRPC for type-safe client-server communication.

## API Structure

### REST API Endpoints

#### Product Management

```typescript
// GET /api/products
// GET /api/products/[id]
// POST /api/products (admin only)
// PUT /api/products/[id] (admin only)
// DELETE /api/products/[id] (admin only)
```

#### Order Management

```typescript
// GET /api/orders
// GET /api/orders/[id]
// POST /api/orders
// PUT /api/orders/[id]/status (admin only)
```

#### Catering System

```typescript
// GET /api/catering/packages
// GET /api/catering/delivery-zones
// POST /api/catering/quote
// GET /api/catering/minimum-orders
```

#### Administrative

```typescript
// GET /api/admin/dashboard
// GET /api/admin/orders
// POST /api/admin/orders/[id]/archive
```

### tRPC Procedures

#### Type-Safe Client Communication

```typescript
// Product procedures
product.getAll();
product.getById(id);
product.getRecommendations(productId);

// Order procedures
order.create(orderData);
order.getByUserId(userId);
order.updateStatus(id, status);

// Catering procedures
catering.calculateDeliveryFee(zone, orderTotal);
catering.getAvailablePackages();
```

## Authentication & Authorization

### JWT-based Authentication

- Secure token generation and validation
- Role-based access control (customer, admin, staff)
- Session management with automatic refresh

### API Route Protection

```typescript
// Protected route middleware
export async function authenticateApiRoute(
  req: NextApiRequest,
  res: NextApiResponse,
  requiredRole?: UserRole
) {
  // JWT verification logic
  // Role-based authorization
}
```

## Data Validation

### Input Validation with Zod

```typescript
// Example order creation schema
const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().positive(),
      variantId: z.string().uuid().optional(),
    })
  ),
  deliveryAddress: addressSchema,
  paymentMethodId: z.string(),
  specialInstructions: z.string().optional(),
});
```

### Error Handling

- Standardized error responses
- Type-safe error objects
- Appropriate HTTP status codes
- Client-friendly error messages

## Rate Limiting

### API Protection

- Request rate limiting per IP/user
- Endpoint-specific limits
- Graceful degradation under load

## Caching Strategy

### Response Caching

- Static data caching (products, categories)
- User-specific data handling
- Cache invalidation strategies

### Database Query Optimization

- Query result caching
- Connection pooling
- Index optimization for common queries

## Webhook Integration

### Square Webhooks

- Payment status updates
- Inventory synchronization
- Order fulfillment notifications

### Shippo Webhooks

- Shipping status updates
- Tracking information
- Delivery confirmations

## API Documentation

### OpenAPI Specification

- Comprehensive endpoint documentation
- Request/response schemas
- Authentication requirements
- Example requests and responses

### Development Tools

- API testing with automated tests
- Mock data for development
- Environment-specific configurations
