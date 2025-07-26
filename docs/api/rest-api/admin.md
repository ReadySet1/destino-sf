# Admin API

## Overview

The Admin API provides administrative endpoints for managing orders, products, users, and system settings. All endpoints require admin-level authentication.

## Authentication Required

All admin endpoints require a valid JWT token with admin privileges:

```http
Authorization: Bearer <admin_token>
```

## Dashboard Analytics

### Get Dashboard Overview
```http
GET /api/admin/dashboard
Authorization: Bearer <admin_token>
```

**Response:**
```typescript
interface DashboardOverview {
  success: boolean;
  data: {
    todayStats: {
      orders: number;
      revenue: number;
      newCustomers: number;
    };
    weekStats: {
      orders: number;
      revenue: number;
      averageOrderValue: number;
    };
    monthStats: {
      orders: number;
      revenue: number;
      growth: number; // percentage
    };
    recentOrders: Order[];
    lowStockAlerts: Product[];
    pendingOrders: Order[];
  };
}
```

### Get Revenue Analytics
```http
GET /api/admin/analytics/revenue
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `period` (string): day, week, month, year
- `startDate` (string): Start date in ISO format
- `endDate` (string): End date in ISO format

## Order Management

### Get All Orders with Admin View
```http
GET /api/admin/orders
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `status` (string): Filter by order status
- `customer` (string): Filter by customer email/name
- `dateRange` (string): today, week, month, custom
- `orderType` (string): regular, catering
- `limit` (number): Results per page
- `page` (number): Page number
- `export` (boolean): Export to CSV

### Bulk Order Operations
```http
POST /api/admin/orders/bulk
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "action": "update_status",
  "orderIds": ["order_1", "order_2", "order_3"],
  "data": {
    "status": "in_preparation",
    "notes": "Batch preparation started"
  }
}
```

**Supported Bulk Actions:**
- `update_status`: Change status for multiple orders
- `archive`: Archive completed orders
- `export`: Export order data
- `send_notification`: Send custom notifications

## Product Management

### Advanced Product Search
```http
GET /api/admin/products
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `status` (string): active, inactive, out_of_stock
- `category` (string): Filter by category
- `priceRange` (string): Format: "min-max"
- `sortBy` (string): name, price, popularity, stock
- `lowStock` (boolean): Show only low stock items

### Product Performance Analytics
```http
GET /api/admin/products/{productId}/analytics
Authorization: Bearer <admin_token>
```

### Bulk Product Operations
```http
POST /api/admin/products/bulk
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "action": "update_pricing",
  "productIds": ["prod_1", "prod_2"],
  "data": {
    "priceAdjustment": 0.1, // 10% increase
    "reason": "Cost increase from suppliers"
  }
}
```

## Customer Management

### Get All Customers
```http
GET /api/admin/customers
Authorization: Bearer <admin_token>
```

### Customer Details with Order History
```http
GET /api/admin/customers/{customerId}
Authorization: Bearer <admin_token>
```

## System Management

### Get System Health
```http
GET /api/admin/system/health
Authorization: Bearer <admin_token>
```

### Update System Settings
```http
POST /api/admin/system/settings
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "deliveryFees": {
    "baseRate": 5.99,
    "perMileRate": 1.50
  },
  "minimumOrders": {
    "regular": 25.00,
    "catering": 500.00
  },
  "operatingHours": {
    "monday": { "open": "09:00", "close": "22:00" },
    "sunday": { "open": "10:00", "close": "21:00" }
  }
}
```

## Reports & Exports

### Generate Sales Report
```http
POST /api/admin/reports/sales
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "startDate": "2025-07-01",
  "endDate": "2025-07-31",
  "format": "csv",
  "groupBy": "day",
  "filters": {
    "orderType": "all",
    "includeRefunds": false
  }
}
```

### Export Customer Data
```http
GET /api/admin/export/customers
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `format` (string): csv, xlsx, json
- `fields` (string): Comma-separated list of fields to include
- `dateRange` (string): Filter by registration date

## Error Responses

### Common Admin Error Codes
- `INSUFFICIENT_ADMIN_PRIVILEGES`: User lacks admin permissions
- `INVALID_BULK_OPERATION`: Bulk operation not supported
- `EXPORT_GENERATION_FAILED`: Report/export generation failed
- `SYSTEM_SETTINGS_INVALID`: Invalid system configuration
- `CUSTOMER_DATA_RESTRICTED`: Access to customer data restricted

### Example Error Response
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_ADMIN_PRIVILEGES",
    "message": "This operation requires super admin privileges",
    "details": {
      "requiredRole": "super_admin",
      "currentRole": "admin"
    }
  }
}
```

## Rate Limits

- **Admin Dashboard**: 1000 requests per minute
- **Bulk Operations**: 100 requests per minute
- **Reports/Exports**: 10 requests per minute
- **System Settings**: 50 requests per minute

## Audit Logging

All admin actions are automatically logged with:
- Admin user ID and email
- Action performed
- Timestamp
- IP address
- Affected resources
- Before/after values (for updates)

### Get Audit Logs
```http
GET /api/admin/audit-logs
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `adminId` (string): Filter by admin user
- `action` (string): Filter by action type
- `startDate` (string): Start date for logs
- `endDate` (string): End date for logs
- `resource` (string): Filter by affected resource type
