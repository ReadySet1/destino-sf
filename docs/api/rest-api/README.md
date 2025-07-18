# REST API Documentation

Complete API reference for the Destino SF platform. All endpoints are built with TypeScript and follow RESTful conventions with comprehensive error handling and validation.

## Base URL

```
Development: http://localhost:3000/api
Production: https://destinosf.com/api
```

## Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```typescript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

## Response Format

All API responses follow a consistent format:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    timestamp: string;
  };
}
```

## Error Handling

Standard HTTP status codes are used:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `429` - Rate Limited
- `500` - Internal Server Error

### Error Response Example

```typescript
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": {
      "field": "email",
      "message": "Invalid email format"
    }
  },
  "meta": {
    "timestamp": "2025-01-17T10:30:00Z"
  }
}
```

## Rate Limiting

API endpoints are rate limited to ensure fair usage:

- **Public endpoints**: 100 requests per hour per IP
- **Authenticated endpoints**: 1000 requests per hour per user
- **Admin endpoints**: 5000 requests per hour per admin

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642694400
```

## API Endpoints Overview

### Core E-commerce
- [Products API](products.md) - Product catalog and search
- [Orders API](orders.md) - Order management and tracking
- [Checkout API](#checkout) - Payment processing and order creation

### Catering System
- [Catering API](catering.md) - Catering packages and inquiries
- [Categories API](#categories) - Product and catering categories

### Admin Operations
- [Admin API](admin.md) - Administrative functions
- [Spotlight Picks API](#spotlight) - Featured product management
- [Square Sync API](#square) - Product synchronization

### System APIs
- [Health Check](#health) - System status monitoring
- [Webhooks](../webhooks/README.md) - External service integrations

## Quick Reference

### Products

```typescript
// Get products with filters
GET /api/products?category=pastries&limit=12&page=1

// Get single product
GET /api/products/[productId]

// Search products
GET /api/products/search?q=empanadas
```

### Orders

```typescript
// Create order
POST /api/checkout
{
  "items": [
    {
      "productId": "prod_123",
      "quantity": 2,
      "packageSize": "DOZEN"
    }
  ],
  "customerInfo": {
    "email": "customer@example.com",
    "phone": "+1234567890"
  },
  "shippingAddress": {
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zipCode": "94105"
  },
  "paymentMethodId": "pm_123456789"
}

// Get order status
GET /api/orders/[orderId]

// Get user orders
GET /api/orders?userId=user_123
```

### Catering

```typescript
// Submit catering inquiry
POST /api/catering
{
  "eventDetails": {
    "eventDate": "2025-02-15T18:00:00Z",
    "guestCount": 50,
    "eventType": "CORPORATE"
  },
  "contactInfo": {
    "name": "John Doe",
    "email": "john@company.com",
    "phone": "+1234567890"
  },
  "deliveryAddress": {
    "street": "456 Business Ave",
    "city": "San Francisco",
    "state": "CA",
    "zipCode": "94107"
  },
  "requirements": {
    "dietaryRestrictions": ["VEGETARIAN"],
    "serviceStyle": "BUFFET",
    "additionalNotes": "Please include serving utensils"
  }
}

// Get catering packages
GET /api/catering/packages?guestCount=25&deliveryZone=SF
```

## Type Definitions

### Common Types

```typescript
// Product types
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  images: ProductImage[];
  inventory: {
    inStock: boolean;
    quantity: number;
    lowStockThreshold: number;
  };
  packageSizes: PackageSize[];
  tags: string[];
  nutritionalInfo?: NutritionalInfo;
  allergens: string[];
  createdAt: string;
  updatedAt: string;
}

interface PackageSize {
  id: string;
  name: string;
  servingSize: number;
  priceMultiplier: number;
  isDefault: boolean;
}

// Order types
interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerInfo: CustomerInfo;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  paymentStatus: PaymentStatus;
  shippingAddress: Address;
  billingAddress?: Address;
  trackingNumber?: string;
  estimatedDelivery?: string;
  createdAt: string;
  updatedAt: string;
}

enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

// Catering types
interface CateringInquiry {
  id: string;
  status: CateringStatus;
  eventDetails: EventDetails;
  contactInfo: ContactInfo;
  deliveryAddress: Address;
  requirements: CateringRequirements;
  estimatedCost?: number;
  proposedMenu?: MenuItem[];
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface EventDetails {
  eventDate: string;
  guestCount: number;
  eventType: EventType;
  duration?: number;
  setupTime?: string;
}

enum EventType {
  CORPORATE = 'CORPORATE',
  WEDDING = 'WEDDING',
  BIRTHDAY = 'BIRTHDAY',
  ANNIVERSARY = 'ANNIVERSARY',
  GRADUATION = 'GRADUATION',
  OTHER = 'OTHER'
}
```

## Authentication Types

```typescript
interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: UserRole;
  preferences: UserPreferences;
  addresses: Address[];
  createdAt: string;
  lastLoginAt?: string;
}

enum UserRole {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER'
}
```

## Testing the API

### Using cURL

```bash
# Get products
curl -X GET "http://localhost:3000/api/products" \
  -H "Accept: application/json"

# Create order (requires auth)
curl -X POST "http://localhost:3000/api/checkout" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "items": [{"productId": "prod_123", "quantity": 2}],
    "customerInfo": {"email": "test@example.com"},
    "paymentMethodId": "pm_test"
  }'
```

### Using TypeScript/JavaScript

```typescript
// API client example
class DestinoApiClient {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  private token?: string;

  setAuthToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    return response.json();
  }

  async getProducts(params?: ProductFilters): Promise<ApiResponse<Product[]>> {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    return this.request<Product[]>(`/products?${queryString}`);
  }

  async createOrder(orderData: CreateOrderRequest): Promise<ApiResponse<Order>> {
    return this.request<Order>('/checkout', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async submitCateringInquiry(
    inquiryData: CreateCateringInquiryRequest
  ): Promise<ApiResponse<CateringInquiry>> {
    return this.request<CateringInquiry>('/catering', {
      method: 'POST',
      body: JSON.stringify(inquiryData),
    });
  }
}
```

## Environment Configuration

```typescript
// API configuration
interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

// Environment-specific settings
const config: Record<string, ApiConfig> = {
  development: {
    baseUrl: 'http://localhost:3000/api',
    timeout: 10000,
    retryAttempts: 3,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000
    }
  },
  production: {
    baseUrl: 'https://destinosf.com/api',
    timeout: 5000,
    retryAttempts: 2,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100
    }
  }
};
```

## Next Steps

- [Products API Documentation](products.md)
- [Orders API Documentation](orders.md)
- [Catering API Documentation](catering.md)
- [Admin API Documentation](admin.md)
- [Webhook Documentation](../webhooks/README.md)
- [Authentication Guide](authentication.md)

---

For implementation examples and testing guides, see the individual endpoint documentation linked above.
