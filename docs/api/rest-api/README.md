# REST API Documentation

## Overview

Destino SF provides a comprehensive REST API for managing e-commerce operations, catering orders, and administrative functions.

## Base Configuration

### API Base URL

```
Production: https://destino-sf.vercel.app/api
Development: http://localhost:3000/api
```

### Authentication

```typescript
// API client setup
const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`, // When authenticated
  },
});
```

## Core Endpoints

### Health Check

```http
GET /api/health
```

Returns API status and version information.

### Version Information

```http
GET /api/version
```

Returns current API version and build information.

## Endpoint Categories

### Product Management

- **Products API**: Complete product catalog management
- **Categories API**: Product categorization system
- **Inventory API**: Stock management and availability

### Order Processing

- **Orders API**: Order creation, retrieval, and management
- **Cart API**: Shopping cart operations
- **Checkout API**: Payment processing and order completion

### Catering System

- **Catering API**: Specialized catering order handling
- **Packages API**: Catering package management
- **Delivery Zones API**: Geographic service area management

### User Management

- **Authentication API**: Login, registration, and session management
- **Profile API**: User profile and preferences
- **Address API**: Delivery address management

### Administrative

- **Admin API**: Administrative operations and reporting
- **Analytics API**: Business intelligence and metrics
- **Configuration API**: System settings and parameters

## Response Format

### Standard Response Structure

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}
```

### Success Response Example

```json
{
  "success": true,
  "data": {
    "id": "prod_123",
    "name": "Signature Pasta",
    "price": 24.99
  },
  "meta": {
    "timestamp": "2025-01-25T10:00:00Z",
    "requestId": "req_abc123",
    "version": "1.0.0"
  }
}
```

### Error Response Example

```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "The requested product could not be found",
    "details": {
      "productId": "prod_123"
    }
  }
}
```

## Error Handling

### HTTP Status Codes

- **200 OK**: Successful request
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **422 Unprocessable Entity**: Validation errors
- **500 Internal Server Error**: Server error

### Error Code Standards

```typescript
enum ErrorCodes {
  // Authentication
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Products
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  PRODUCT_UNAVAILABLE = 'PRODUCT_UNAVAILABLE',
  INVALID_PRODUCT_DATA = 'INVALID_PRODUCT_DATA',

  // Orders
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  INVALID_ORDER_STATUS = 'INVALID_ORDER_STATUS',
  MINIMUM_ORDER_NOT_MET = 'MINIMUM_ORDER_NOT_MET',

  // Payments
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  INVALID_PAYMENT_METHOD = 'INVALID_PAYMENT_METHOD',

  // Delivery
  DELIVERY_ZONE_INVALID = 'DELIVERY_ZONE_INVALID',
  ADDRESS_VALIDATION_FAILED = 'ADDRESS_VALIDATION_FAILED',
}
```

## Rate Limiting

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1643673600
```

### Rate Limits by Endpoint Type

- **Public Endpoints**: 100 requests per minute
- **Authenticated Endpoints**: 1000 requests per minute
- **Admin Endpoints**: 5000 requests per minute
- **Webhook Endpoints**: 10000 requests per minute

## Request/Response Examples

### Create Order Example

```http
POST /api/orders
Content-Type: application/json
Authorization: Bearer your-jwt-token

{
  "items": [
    {
      "productId": "prod_123",
      "quantity": 2,
      "variantId": "var_456"
    }
  ],
  "deliveryAddress": {
    "streetAddress": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zipCode": "94102"
  },
  "paymentMethodId": "pm_card_123"
}
```

### Get Products Example

```http
GET /api/products?category=appetizers&limit=20&page=1
```

## API Versioning

### Version Strategy

- **URL Versioning**: `/api/v1/products`
- **Header Versioning**: `Accept: application/vnd.api+json;version=1`
- **Backward Compatibility**: Minimum 6 months support for deprecated versions

### Migration Guidelines

- Deprecation notices 30 days before removal
- New feature additions are non-breaking
- Breaking changes require version increment
- Migration guides provided for major versions

## Development Tools

### API Documentation

- **OpenAPI 3.0**: Complete API specification
- **Swagger UI**: Interactive API explorer
- **Postman Collection**: Ready-to-use API collection

### Testing

- **Mock Server**: Development testing environment
- **Test Data**: Predefined test datasets
- **Validation**: Request/response validation tools
