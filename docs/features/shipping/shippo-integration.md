# Enhanced Shippo Integration for Destino SF

## 🚢 Overview

This implementation provides a comprehensive integration with [Shippo's shipping API](https://docs.goshippo.com/docs/shipments/shipments/) that combines our custom shipping weight calculation logic with Shippo's full feature set for accurate shipping rates and label creation.

## ✨ Enhanced Features

### 1. Dynamic Weight Calculation + Shippo Integration

- **Smart weight calculation** based on alfajores and empanadas product types
- **Real-time shipping rates** from multiple carriers via Shippo
- **Optimized packaging weights** for cost-effective shipping
- **Fallback mechanisms** for unknown products

### 2. Advanced Shippo Features

- **Address validation** with detailed error reporting
- **Multiple carrier support** (USPS, UPS, FedEx, etc.)
- **Service level attributes** (FASTEST, CHEAPEST, etc.)
- **Enhanced metadata tracking** for analytics
- **Carrier logos and branding** in rate display
- **Estimated delivery dates** and zones

### 3. Comprehensive Error Handling

- **Address validation errors** with specific feedback
- **Rate availability checks** with fallback options
- **Detailed error messages** from Shippo API
- **Graceful degradation** when services are unavailable

### 4. Shipment Tracking & Analytics

- **Rich metadata** for each shipment including:
  - Product types and quantities
  - Total weight and estimated value
  - Source tracking (website, order type)
  - Timestamps and customer information

## 🔧 Technical Implementation

### Core Functions

#### `getShippingRates()`

```typescript
interface ShippingRateRequestInput {
  shippingAddress: {
    recipientName?: string;
    street: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
    email?: string;
  };
  cartItems: {
    id: string;
    name: string;
    quantity: number;
    variantId?: string;
    price?: number; // For insurance/customs
  }[];
  estimatedLengthIn?: number;
  estimatedWidthIn?: number;
  estimatedHeightIn?: number;
  insuranceAmount?: number;
  extraServices?: string[];
}
```

**Returns enhanced shipping rates with:**

- Carrier information and logos
- Service attributes (fastest, cheapest, etc.)
- Estimated delivery dates
- Smart sorting by attributes then price
- Shipment ID for tracking

#### `createShippingLabel()`

```typescript
async function createShippingLabel(
  rateId: string,
  orderMetadata?: { orderId?: string; customerEmail?: string }
): Promise<{ success: boolean; label?: any; error?: string }>;
```

**Creates shipping labels with:**

- PDF format labels
- Tracking numbers
- Enhanced metadata for order tracking
- Error handling for failed label creation

### Shippo API Integration Details

#### Address Validation

- **Real-time validation** using Shippo's address verification
- **Detailed error reporting** for invalid addresses
- **Warning handling** for addresses with potential issues
- **Automatic correction suggestions** when available

#### Rate Shopping

- **Multi-carrier comparison** across USPS, UPS, FedEx, DHL
- **Service level filtering** and attribute-based sorting
- **Zone-based pricing** with delivery estimates
- **Real-time rate updates** based on current carrier pricing

#### Metadata Tracking

```json
{
  "source": "destino_sf_website",
  "order_type": "food_delivery",
  "productTypes": ["alfajores", "empanadas"],
  "totalWeight": 1.9,
  "itemCount": 3,
  "estimatedValue": 75.0,
  "timestamp": "2024-01-20T10:30:00Z"
}
```

## 📊 Weight Calculation Integration

### How It Works

1. **Cart Analysis**: Analyze cart items to determine product types
2. **Weight Calculation**: Apply alfajores/empanadas specific weight rules
3. **Shippo Request**: Create shipment with calculated weight
4. **Rate Retrieval**: Get real-time rates from multiple carriers
5. **Smart Sorting**: Prioritize by service attributes and price

### Example Weight Calculations

```typescript
// 2 alfajores + 1 empanada pack
const cartItems = [
  { name: 'Alfajores- Classic', quantity: 2, price: 25 },
  { name: 'Empanadas- Beef', quantity: 1, price: 35 },
];

// Weight calculation: (0.5 + 0.4) + 1.0 = 1.9 lbs
// Estimated value: (25 × 2) + (35 × 1) = $85
```

## 🎯 Benefits Over Previous Implementation

### Before (Static Weight)

- ❌ Fixed 1 lb weight for all orders
- ❌ Basic error handling
- ❌ Limited carrier information
- ❌ No tracking metadata
- ❌ Simple rate sorting

### After (Enhanced Integration)

- ✅ **Dynamic weight** based on actual products
- ✅ **Comprehensive error handling** with specific feedback
- ✅ **Rich carrier information** with logos and attributes
- ✅ **Detailed tracking metadata** for analytics
- ✅ **Smart rate sorting** by service level
- ✅ **Address validation** with correction suggestions
- ✅ **Label creation capability** for order fulfillment
- ✅ **Estimated delivery dates** and zones
- ✅ **Future-ready** for international shipping

## 🚀 Usage Examples

### Frontend Integration

```typescript
// Enhanced rate fetching with dynamic weights
const result = await getShippingRates({
  shippingAddress: customerAddress,
  cartItems: [
    { id: '1', name: 'Alfajores- Classic', quantity: 2, price: 25 },
    { id: '2', name: 'Empanadas- Beef', quantity: 1, price: 35 },
  ],
  estimatedLengthIn: 10,
  estimatedWidthIn: 8,
  estimatedHeightIn: 4,
});

// Enhanced rate display with carrier branding
rates.map(rate => ({
  carrier: rate.carrier,
  name: rate.name,
  price: `$${(rate.amount / 100).toFixed(2)}`,
  logo: rate.providerImage75,
  attributes: rate.attributes, // ["CHEAPEST"] or ["FASTEST"]
  estimatedDays: rate.estimatedDays,
  arrivesBy: rate.arrives_by,
}));
```

### Admin Functions

```typescript
// Create shipping label after order completion
const labelResult = await createShippingLabel(selectedRateId, {
  orderId: order.id,
  customerEmail: customer.email,
});

if (labelResult.success) {
  // Save tracking number and label URL
  await updateOrder(order.id, {
    trackingNumber: labelResult.label.trackingNumber,
    labelUrl: labelResult.label.labelUrl,
    shippingStatus: 'LABEL_CREATED',
  });
}
```

## 🔄 Future Enhancements

### International Shipping

- **Customs declarations** for international orders
- **Duty and tax calculations** via Shippo
- **Country-specific restrictions** and requirements
- **Multi-currency support** for international rates

### Advanced Features

- **Package optimization** for multiple items
- **Shipping insurance** for high-value orders
- **Signature confirmation** for premium orders
- **Pickup scheduling** and drop-off locations
- **Real-time tracking** updates via webhooks

### Analytics & Optimization

- **Shipping cost analytics** by product type
- **Carrier performance tracking** (delivery times, issues)
- **Customer preferences** analysis (speed vs. cost)
- **Seasonal shipping pattern** optimization

## 📈 Performance & Reliability

### Error Resilience

- **Graceful fallbacks** to default weights if database fails
- **Multiple error types** handled appropriately
- **Retry logic** for transient API failures
- **Detailed logging** for debugging and monitoring

### Scalability

- **Efficient weight calculations** with product type grouping
- **Minimal API calls** through smart caching opportunities
- **Optimized rate sorting** for better user experience
- **Metadata tracking** for business intelligence

This enhanced Shippo integration provides a production-ready shipping solution that combines intelligent weight calculation with comprehensive carrier services, positioning Destino SF for scalable growth and excellent customer experience.
