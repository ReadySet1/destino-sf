# Products API

## Overview

The Products API provides comprehensive access to the product catalog, including search, filtering, and management capabilities.

## Product Endpoints

### Get All Products
```http
GET /api/products
```

**Query Parameters:**
- `category` (string): Filter by product category
- `search` (string): Search in product names and descriptions  
- `limit` (number): Number of products to return (default: 20, max: 100)
- `page` (number): Page number for pagination (default: 1)
- `sortBy` (string): Sort field (name, price, created_at)
- `sortOrder` (string): Sort direction (asc, desc)
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter
- `available` (boolean): Filter by availability status

**Example Request:**
```http
GET /api/products?category=appetizers&limit=10&page=1&sortBy=price&sortOrder=asc
```

**Response:**
```typescript
interface ProductsResponse {
  success: boolean;
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  images: ProductImage[];
  variants: ProductVariant[];
  availability: {
    inStock: boolean;
    quantity?: number;
  };
  nutritionalInfo?: NutritionalInfo;
  cateringEligible: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Get Single Product
```http
GET /api/products/{productId}
```

### Get Product Recommendations
```http
GET /api/products/{productId}/recommendations
```

**Query Parameters:**
- `limit` (number): Number of recommendations (default: 5, max: 20)
- `type` (string): Recommendation type (related, category, popular)

### Search Products
```http
GET /api/products/search?q=pasta&category=main&limit=10
```

## Product Categories

### Get All Categories
```http
GET /api/products/categories
```

**Response:**
```typescript
interface CategoryResponse {
  success: boolean;
  data: ProductCategory[];
}

interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string;
  productCount: number;
  isActive: boolean;
}
```

## Admin Endpoints (Admin Only)

### Create Product
```http
POST /api/products
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "New Signature Dish",
  "description": "Description of the new dish",
  "price": 29.99,
  "categoryId": "cat_main",
  "cateringEligible": true,
  "variants": [
    {
      "name": "Regular",
      "price": 29.99
    },
    {
      "name": "Large",
      "price": 39.99
    }
  ]
}
```

### Update Product
```http
PUT /api/products/{productId}
Authorization: Bearer <admin_token>
```

### Delete Product
```http
DELETE /api/products/{productId}
Authorization: Bearer <admin_token>
```

### Bulk Update Products
```http
PATCH /api/products/bulk
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "action": "update_availability",
  "productIds": ["prod_1", "prod_2"],
  "data": {
    "inStock": false
  }
}
```

## Error Responses

### Common Error Codes
- `PRODUCT_NOT_FOUND`: Product does not exist
- `PRODUCT_UNAVAILABLE`: Product is out of stock
- `INVALID_CATEGORY`: Category does not exist
- `INSUFFICIENT_PERMISSIONS`: Admin access required
- `VALIDATION_ERROR`: Invalid product data

### Example Error Response
```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product with ID 'prod_123' was not found"
  }
}
```

## Rate Limits

- **GET endpoints**: 100 requests per minute
- **Admin endpoints**: 1000 requests per minute
- **Search endpoints**: 50 requests per minute

## Caching

- Product list responses cached for 5 minutes
- Individual product responses cached for 15 minutes
- Category data cached for 1 hour
- Admin endpoints bypass cache
