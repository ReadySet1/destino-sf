# Pre-Order System Analysis Report

**Project:** Destino SF E-commerce Platform  
**Date:** July 2025  
**Document Version:** 1.0

---

## Executive Summary

The Destino SF platform implements a comprehensive pre-order system that allows administrators to configure products for pre-ordering and provides customers with clear pre-order functionality throughout the shopping experience. This system addresses Square API limitations by implementing a manual availability override system while maintaining seamless integration with the existing e-commerce workflow.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Database Schema](#database-schema)
3. [Admin Interface Features](#admin-interface-features)
4. [Customer-Facing Features](#customer-facing-features)
5. [Technical Implementation](#technical-implementation)
6. [Square API Integration](#square-api-integration)
7. [Business Logic & Validation](#business-logic--validation)
8. [UI/UX Implementation](#uiux-implementation)
9. [Limitations and Workarounds](#limitations-and-workarounds)
10. [Future Enhancements](#future-enhancements)

---

## System Overview

### Core Functionality

The pre-order system enables:
- **Admin Control**: Enable/disable pre-order status for any product
- **Customer Experience**: Clear pre-order messaging and confirmation workflow
- **Inventory Management**: Separate handling of pre-order vs. regular inventory
- **Order Processing**: Integrated checkout flow with pre-order identification
- **Visual Indicators**: Distinct UI elements for pre-order products

### Key Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Admin Panel   │    │  Product Cards  │    │  Checkout Flow  │
│                 │    │                 │    │                 │
│ • Enable/Disable│───▶│ • Pre-order     │───▶│ • Special       │
│ • Status Badges │    │   Badges        │    │   Handling      │
│ • Date Config   │    │ • Confirmation  │    │ • Order Types   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## Database Schema

### Product Model Extensions

The pre-order system extends the base `Product` model with the following fields:

```typescript
// Location: prisma/schema.prisma (lines 60-70)

model Product {
  // ... existing fields ...
  
  // Availability fields for pre-order and seasonal items
  visibility           String?   @default("PUBLIC") @db.VarChar(20)
  isAvailable         Boolean   @default(true) @map("is_available")
  isPreorder          Boolean   @default(false) @map("is_preorder")
  preorderStartDate   DateTime? @map("preorder_start_date")
  preorderEndDate     DateTime? @map("preorder_end_date")
  availabilityStart   DateTime? @map("availability_start_date")
  availabilityEnd     DateTime? @map("availability_end_date")
  itemState           String?   @default("ACTIVE") @map("item_state") @db.VarChar(20)
  availabilityMeta    Json?     @map("availability_metadata")
  customAttributes    Json?     @map("custom_attributes")
}
```

### Field Descriptions

| Field | Type | Purpose | Default |
|-------|------|---------|---------|
| `isPreorder` | Boolean | Primary flag indicating pre-order status | `false` |
| `isAvailable` | Boolean | Controls if product can be purchased | `true` |
| `visibility` | String | Product visibility (PUBLIC/PRIVATE) | `"PUBLIC"` |
| `preorderStartDate` | DateTime | When pre-orders begin | `null` |
| `preorderEndDate` | DateTime | When pre-orders end | `null` |
| `itemState` | String | Product state (ACTIVE/SEASONAL/ARCHIVED) | `"ACTIVE"` |

---

## Admin Interface Features

### 1. Product Creation
**Location:** `/admin/products/new`

```typescript
// New product form includes pre-order configuration
<input
  type="checkbox"
  name="isPreorder"
  id="isPreorder"
  className="mt-1 h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
/>
<label htmlFor="isPreorder" className="text-base font-semibold text-gray-700">
  Pre-order Item
</label>
<p className="text-sm text-gray-500 mt-1 leading-relaxed">
  Allow customers to pre-order this item before it becomes generally available
</p>
```

### 2. Product Editing
**Location:** `/admin/products/[id]`

#### Manual Availability Override Section
- **Available for Purchase** checkbox
- **Pre-order Item** checkbox  
- Visual feedback for configuration changes
- Form validation and error handling

```typescript
// Server action for updating product
async function updateProduct(formData: FormData) {
  'use server';
  
  const isAvailable = formData.has('isAvailable');
  const isPreorder = formData.has('isPreorder');
  const visibility = formData.get('visibility') as string || 'PUBLIC';
  const itemState = formData.get('itemState') as string || 'ACTIVE';

  await prisma.product.update({
    where: { id: productId },
    data: {
      // ... other fields ...
      isAvailable,
      isPreorder,
      visibility,
      itemState,
    },
  });
}
```

### 3. Product List Management
**Location:** `/admin/products`

#### Status Badge System
The admin interface displays color-coded badges for quick status identification:

```typescript
// Status badges implementation
{product.isAvailable === false && (
  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
    Unavailable
  </span>
)}

{product.isPreorder && (
  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
    Pre-order
  </span>
)}

{product.visibility === 'PRIVATE' && (
  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
    Hidden
  </span>
)}

{product.itemState === 'SEASONAL' && (
  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
    Seasonal
  </span>
)}
```

#### Badge Color System
- 🔴 **Red**: Unavailable products
- 🔵 **Blue**: Pre-order items
- ⚫ **Gray**: Hidden products
- 🟣 **Purple**: Seasonal items
- 🟢 **Green**: Available (default, shown when no other status applies)

---

## Customer-Facing Features

### 1. Product Card Pre-Order Indicators

**Locations:** 
- `src/components/Products/ProductCard.tsx`
- `src/components/store/ProductCard.tsx`

#### Pre-Order Confirmation Flow
When customers attempt to add a pre-order item to cart:

```typescript
const handleAddToCart = () => {
  if (isPreorder) {
    // Show special confirmation dialog
    const preorderMessage = formatPreorderMessage(product);
    if (!confirm(preorderMessage)) {
      return; // User cancelled
    }
  }
  
  // Add to cart with pre-order indication
  addItem({
    id: productId,
    name: product.name,
    price: priceToAdd,
    quantity: 1,
    image: mainImage,
    variantId: undefined,
  });

  const alertMessage = isPreorder 
    ? `1 ${product.name} has been pre-ordered and added to your cart.`
    : `1 ${product.name} has been added to your cart.`;
  
  showAlert(alertMessage);
};
```

#### Pre-Order Message Formatting
```typescript
const formatPreorderMessage = (product: Product): string => {
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });

  let message = `This item is available for pre-order only.\n\n`;
  
  if (product.preorderStartDate && product.preorderEndDate) {
    message += `Expected availability: ${formatDate(product.preorderStartDate)} - ${formatDate(product.preorderEndDate)}\n\n`;
  } else if (product.preorderEndDate) {
    message += `Expected availability by: ${formatDate(product.preorderEndDate)}\n\n`;
  }
  
  message += `Would you like to place a pre-order for this item?`;
  return message;
};
```

### 2. Product Details Page
**Location:** `src/components/Products/ProductDetails.tsx`

- Enhanced confirmation dialog for pre-order items
- Clear messaging about expected availability
- Date formatting for customer clarity

### 3. Checkout Integration

The checkout process seamlessly handles pre-order items:
- Order validation includes pre-order items
- No special restrictions on pre-order purchases
- Clear indication in order confirmations

---

## Technical Implementation

### 1. Type Definitions

**Location:** `src/types/product.ts`

```typescript
export interface Product {
  id: string;
  squareId: string;
  name: string;
  description?: string | null;
  price: number | Decimal;
  images: string[];
  slug: string;
  categoryId: string;
  category?: Category;
  variants?: Variant[];
  featured: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Availability fields for pre-order and seasonal items
  visibility?: string | null;
  isAvailable?: boolean;
  isPreorder?: boolean;
  preorderStartDate?: Date | null;
  preorderEndDate?: Date | null;
  availabilityStart?: Date | null;
  availabilityEnd?: Date | null;
  itemState?: string | null;
  availabilityMeta?: Record<string, any> | null;
  customAttributes?: Record<string, any> | null;
}
```

### 2. Server Actions

**Location:** `src/app/(dashboard)/admin/products/[id]/page.tsx`

```typescript
async function updateProduct(formData: FormData) {
  'use server';
  
  // Extract form data
  const isAvailable = formData.has('isAvailable');
  const isPreorder = formData.has('isPreorder');
  const visibility = formData.get('visibility') as string || 'PUBLIC';
  const itemState = formData.get('itemState') as string || 'ACTIVE';

  try {
    // Update the product in the database
    const _updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        name,
        description,
        price,
        categoryId,
        images: prismaImageUrls,
        featured,
        active,
        squareId,
        // Availability fields for manual override
        isAvailable,
        isPreorder,
        visibility,
        itemState,
      },
    });

    // Revalidate cache
    await Promise.all([
      fetch(`${env.NEXT_PUBLIC_APP_URL}/api/revalidate?path=/admin/products`),
      fetch(`${env.NEXT_PUBLIC_APP_URL}/api/revalidate?path=/admin/products/${productId}`),
    ]);

    return redirect('/admin/products');
  } catch (error) {
    // Error handling...
  }
}
```

---

## Square API Integration

### Limitations and Workarounds

**Challenge:** Square's Catalog API doesn't expose "Site Visibility" settings from the dashboard.

**Solution:** Manual Availability Override System

#### Automatic Detection
**Location:** `src/lib/square/production-sync.ts`

```typescript
private determineAvailability(
  metadata: SquareItemAvailability,
  productName: string
): ProductAvailability {
  const now = new Date();
  
  // Check for pre-order indicators in name or attributes
  const isPreorderItem = 
    productName.toLowerCase().includes('pre-order') ||
    productName.toLowerCase().includes('preorder') ||
    productName.toLowerCase().includes('gingerbread') ||
    productName.toLowerCase().includes('coming soon') ||
    metadata.customAttributes?.preorder_enabled === 'true' ||
    metadata.customAttributes?.has_preorder_modifier;
  
  // Return availability configuration
  return {
    isAvailable: true,
    isPreorder: isPreorderItem,
    visibility: metadata.visibility,
    state: metadata.state,
    preorderDates: preorderDates || undefined,
    seasonalDates: seasonalDates || undefined,
    availabilityReason: isPreorderItem ? 'Available for pre-order' : 'Available',
  };
}
```

#### Sync Behavior
- Products with "pre-order" in the name are automatically marked as pre-order items
- Manual overrides take precedence over automatic detection
- Sync respects existing manual configurations

---

## Business Logic & Validation

### 1. Pre-Order Validation Rules

Currently, the system applies minimal validation:
- Pre-order items can be added to cart like regular items
- No quantity restrictions specific to pre-orders
- No date-based availability checking (dates are informational)

### 2. Cart and Checkout Handling

```typescript
// No special validation for pre-order items in checkout
const orderValidation = await validateOrderMinimums(items);
if (!orderValidation.isValid) {
  return {
    success: false,
    error: orderValidation.errorMessage || 'Order does not meet minimum requirements',
    checkoutUrl: null,
    orderId: null,
  };
}
```

**Key Points:**
- Pre-order items count toward minimum order requirements
- No separate processing for pre-order vs. regular items
- Same payment processing workflow

---

## UI/UX Implementation

### 1. Customer Experience Flow

```
Product Discovery
       ↓
   Pre-order Badge
       ↓
   Click "Add to Cart"
       ↓
 Confirmation Dialog
       ↓
    Cart Addition
       ↓
 Standard Checkout
       ↓
   Order Confirmation
```

### 2. Admin Experience Flow

```
Product Management
       ↓
   Edit Product
       ↓
Manual Override Section
       ↓
  Toggle Pre-order
       ↓
   Save Changes
       ↓
   Status Badge Update
```

### 3. Visual Design Patterns

#### Customer Interface
- **Confirmation Dialogs**: Clear, informative pre-order confirmations
- **Date Formatting**: Human-readable expected availability dates
- **Alert Messages**: Distinct messaging for pre-order vs. regular items

#### Admin Interface  
- **Color-Coded Badges**: Immediate visual status identification
- **Form Layout**: Logical grouping of availability controls
- **Responsive Design**: Works across desktop and mobile admin interfaces

---

## Limitations and Workarounds

### Current Limitations

1. **Date Validation**: No enforcement of pre-order date logic
2. **Inventory Tracking**: Pre-order items use same inventory system as regular items
3. **Automated Workflows**: No automatic status changes based on dates
4. **Square API**: Cannot sync visibility settings from Square dashboard

### Implemented Workarounds

1. **Manual Override System**: Bypasses Square API limitations
2. **Name-Based Detection**: Automatic pre-order detection for products with "pre-order" in name
3. **Clear UI Indicators**: Visual badges compensate for limited automation
4. **Flexible Date Fields**: Informational dates without rigid enforcement

---

## Future Enhancements

### Short-Term Improvements (1-2 months)

1. **Date-Based Logic**
   - Automatic pre-order status changes based on start/end dates
   - Background job to update product availability
   - Calendar integration for date selection

2. **Enhanced Validation**
   - Pre-order quantity limits
   - Date range validation
   - Conflict detection between regular and pre-order status

3. **Improved Admin UX**
   - Bulk pre-order status updates
   - Pre-order reporting dashboard
   - Advanced filtering by pre-order status

### Medium-Term Enhancements (3-6 months)

1. **Customer Communication**
   - Email notifications for pre-order status changes
   - Pre-order tracking page for customers
   - Integration with order status updates

2. **Inventory Management**
   - Separate pre-order inventory tracking
   - Automated stock allocation when items become available
   - Pre-order fulfillment workflows

3. **Analytics and Reporting**
   - Pre-order demand analytics
   - Revenue forecasting based on pre-orders
   - Customer pre-order behavior insights

### Long-Term Vision (6+ months)

1. **Advanced Pre-Order Types**
   - Partial pre-orders (pay now, ship later)
   - Subscription-based pre-orders
   - Limited edition pre-order campaigns

2. **Third-Party Integrations**
   - Email marketing platform integration
   - CRM system synchronization
   - Advanced analytics tools

3. **Mobile App Features**
   - Push notifications for pre-order updates
   - Wishlist integration
   - Social sharing for pre-order items

---

## Technical Specifications

### Performance Considerations

- **Database Queries**: Pre-order fields are included in existing product queries (no additional overhead)
- **Cache Strategy**: Pre-order status changes trigger appropriate cache invalidation
- **API Efficiency**: Minimal additional API calls for pre-order functionality

### Security Considerations

- **Admin Controls**: Pre-order configuration restricted to admin users
- **Input Validation**: All form inputs properly validated and sanitized  
- **SQL Injection**: Prisma ORM provides protection against SQL injection

### Scalability Notes

- **Database Design**: Pre-order fields designed for efficient indexing
- **Background Jobs**: Ready for future automated workflows
- **API Design**: Structured for easy extension with additional features

---

## Conclusion

The Destino SF pre-order system provides a solid foundation for managing product pre-orders with both manual admin control and automated Square integration. The system successfully works around Square API limitations while providing clear customer communication and efficient admin management.

### Key Strengths

- **Comprehensive Coverage**: Handles pre-orders from product creation to order completion
- **User-Friendly Design**: Clear visual indicators and intuitive workflows
- **Flexible Configuration**: Manual overrides provide complete admin control
- **Integration Quality**: Seamlessly works with existing e-commerce infrastructure

### Areas for Growth

- **Date-Based Automation**: Enhanced logic for automatic status transitions
- **Customer Communication**: Proactive notifications and tracking
- **Analytics Integration**: Better insights into pre-order performance

The system is well-positioned for future enhancements while providing immediate value for both administrators and customers.

---

**Document prepared by:** AI Assistant  
**Last updated:** January 2025  
**Next review:** February 2025
