# Catering API

## Overview

The Catering API provides specialized endpoints for managing catering orders, packages, delivery zones, and minimum order requirements.

## Catering Packages

### Get All Catering Packages

```http
GET /api/catering/packages
```

**Query Parameters:**

- `deliveryZone` (string): Filter packages available for delivery zone
- `minGuests` (number): Minimum number of guests
- `maxGuests` (number): Maximum number of guests
- `category` (string): Package category filter
- `available` (boolean): Filter by availability

**Response:**

```typescript
interface CateringPackagesResponse {
  success: boolean;
  data: CateringPackage[];
}

interface CateringPackage {
  id: string;
  name: string;
  description: string;
  category: string;
  servingSize: {
    min: number;
    max: number;
    recommended: number;
  };
  pricing: {
    basePrice: number;
    pricePerPerson: number;
  };
  includes: string[];
  customizable: boolean;
  minimumOrder: number;
  availableZones: string[];
  leadTime: number; // hours
  images: string[];
  isActive: boolean;
}
```

### Get Single Catering Package

```http
GET /api/catering/packages/{packageId}
```

### Get Package Quote

```http
POST /api/catering/packages/{packageId}/quote
Content-Type: application/json

{
  "guestCount": 50,
  "deliveryZone": "zone_sf_downtown",
  "deliveryDate": "2025-08-15T11:00:00Z",
  "customizations": [
    {
      "item": "add_beverages",
      "quantity": 50
    }
  ]
}
```

**Response:**

```typescript
interface CateringQuoteResponse {
  success: boolean;
  data: {
    packageId: string;
    guestCount: number;
    pricing: {
      packageBase: number;
      perPersonCost: number;
      customizations: number;
      subtotal: number;
      deliveryFee: number;
      tax: number;
      total: number;
    };
    deliveryInfo: {
      zone: string;
      estimatedDeliveryTime: string;
      setupIncluded: boolean;
    };
    availability: {
      available: boolean;
      reason?: string;
    };
  };
}
```

## Delivery Zones

### Get All Delivery Zones

```http
GET /api/catering/delivery-zones
```

**Response:**

```typescript
interface DeliveryZonesResponse {
  success: boolean;
  data: DeliveryZone[];
}

interface DeliveryZone {
  id: string;
  name: string;
  description: string;
  boundaries: {
    type: 'polygon';
    coordinates: number[][][];
  };
  deliveryFee: number;
  minimumOrder: number;
  deliveryTime: {
    standard: number; // minutes
    express?: number;
  };
  serviceHours: {
    start: string; // "09:00"
    end: string; // "22:00"
  };
  isActive: boolean;
  restrictions?: string[];
}
```

### Validate Delivery Address

```http
POST /api/catering/delivery-zones/validate
Content-Type: application/json

{
  "address": {
    "streetAddress": "123 Market St",
    "city": "San Francisco",
    "state": "CA",
    "zipCode": "94105"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "isDeliverable": true,
    "zone": {
      "id": "zone_sf_downtown",
      "name": "San Francisco Downtown",
      "deliveryFee": 25.0,
      "minimumOrder": 500.0
    },
    "estimatedDeliveryTime": 45
  }
}
```

## Minimum Orders

### Get Minimum Order Requirements

```http
GET /api/catering/minimum-orders
```

**Query Parameters:**

- `zoneId` (string): Specific delivery zone
- `date` (string): Delivery date (some zones have date-specific minimums)

**Response:**

```typescript
interface MinimumOrdersResponse {
  success: boolean;
  data: Array<{
    zoneId: string;
    zoneName: string;
    minimumOrder: number;
    deliveryFee: number;
    conditions?: {
      dayOfWeek?: string[];
      timeOfDay?: string;
      seasonalAdjustment?: number;
    };
  }>;
}
```

## Catering Orders

### Create Catering Order

```http
POST /api/catering/orders
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "packageId": "pkg_executive_lunch",
  "guestCount": 75,
  "deliveryAddress": {
    "companyName": "Tech Corp Inc",
    "contactPerson": "Jane Smith",
    "contactPhone": "+1-555-0123",
    "streetAddress": "456 Business Blvd",
    "city": "San Francisco",
    "state": "CA",
    "zipCode": "94105"
  },
  "deliveryDate": "2025-08-15T11:30:00Z",
  "customizations": [
    {
      "item": "dietary_vegetarian",
      "quantity": 15,
      "notes": "Vegan options preferred"
    }
  ],
  "setupRequirements": {
    "setupRequired": true,
    "setupLocation": "Conference Room A, 3rd Floor",
    "specialInstructions": "Use main entrance, ask for Jane at reception"
  },
  "paymentMethodId": "pm_corp_card_456"
}
```

### Get Catering Order Availability

```http
POST /api/catering/availability
Content-Type: application/json

{
  "deliveryDate": "2025-08-15T11:30:00Z",
  "guestCount": 75,
  "deliveryZone": "zone_sf_downtown"
}
```

**Response:**

```typescript
interface AvailabilityResponse {
  success: boolean;
  data: {
    available: boolean;
    reasons?: string[];
    alternatives?: Array<{
      date: string;
      time: string;
      available: boolean;
    }>;
    capacity: {
      maxGuests: number;
      currentBookings: number;
      remainingCapacity: number;
    };
  };
}
```

## Admin Endpoints

### Get Catering Analytics (Admin Only)

```http
GET /api/admin/catering/analytics
Authorization: Bearer <admin_token>
```

**Query Parameters:**

- `startDate` (string): Start date for analytics
- `endDate` (string): End date for analytics
- `zoneId` (string): Filter by delivery zone

**Response:**

```typescript
interface CateringAnalytics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  averageGuestCount: number;
  popularPackages: Array<{
    packageId: string;
    packageName: string;
    orderCount: number;
    revenue: number;
  }>;
  zonePerformance: Array<{
    zoneId: string;
    zoneName: string;
    orderCount: number;
    revenue: number;
    averageOrderValue: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    orderCount: number;
    revenue: number;
  }>;
}
```

### Update Package Availability (Admin Only)

```http
PATCH /api/admin/catering/packages/{packageId}
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "isActive": false,
  "reason": "Temporarily unavailable due to supply issues"
}
```

### Manage Delivery Zones (Admin Only)

```http
POST /api/admin/catering/delivery-zones
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "South Bay",
  "boundaries": {
    "type": "polygon",
    "coordinates": [/* GeoJSON coordinates */]
  },
  "deliveryFee": 35.00,
  "minimumOrder": 750.00,
  "deliveryTime": {
    "standard": 60
  },
  "serviceHours": {
    "start": "08:00",
    "end": "20:00"
  }
}
```

## Error Responses

### Common Error Codes

- `PACKAGE_NOT_FOUND`: Catering package does not exist
- `DELIVERY_ZONE_INVALID`: Address not in deliverable area
- `MINIMUM_ORDER_NOT_MET`: Order total below zone minimum
- `CAPACITY_EXCEEDED`: Guest count exceeds package capacity
- `LEAD_TIME_INSUFFICIENT`: Not enough advance notice
- `DATE_UNAVAILABLE`: Requested date not available

### Example Error Response

```json
{
  "success": false,
  "error": {
    "code": "MINIMUM_ORDER_NOT_MET",
    "message": "Order total of $450 is below the minimum of $500 for this delivery zone",
    "details": {
      "orderTotal": 450,
      "minimumRequired": 500,
      "zoneId": "zone_sf_downtown"
    }
  }
}
```

## Business Rules

### Lead Time Requirements

- Standard catering orders: 24 hours minimum
- Large orders (100+ guests): 48 hours minimum
- Holiday periods: 72 hours minimum
- Custom packages: 1 week minimum

### Capacity Management

- Kitchen capacity limits based on date/time
- Automatic availability checking
- Overbooking prevention
- Alternative date suggestions

### Pricing Rules

- Base package price + per-person multiplier
- Zone-based delivery fees
- Holiday surcharges may apply
- Volume discounts for large orders

## Rate Limits

- **Public endpoints**: 50 requests per minute
- **Authenticated endpoints**: 200 requests per minute
- **Admin endpoints**: 1000 requests per minute
- **Quote generation**: 10 requests per minute per user
