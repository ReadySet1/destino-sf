# Delivery Systems Overview

This document explains the **dual delivery zone systems** implemented in Destino SF to handle different product types with appropriate pricing strategies.

## 🎯 System Architecture

Destino SF implements **two separate delivery zone systems** to accommodate different business models:

### 1. **Catering Delivery Zones**

_For large-scale catering orders_

### 2. **Regular Product Delivery Zones**

_For individual products (empanadas, alfajores)_

---

## 🍽️ Catering Delivery Zones

**Purpose**: Handle high-value catering orders with substantial minimum requirements

### Characteristics:

- **High minimum orders**: $250 - $500+ depending on zone
- **Higher delivery fees**: $50 - $150+ per delivery
- **Longer delivery windows**: 1-4 hours
- **Advance booking**: Often requires scheduling
- **Business focus**: Corporate events, large gatherings

### Current Zones:

| Zone            | Areas                                  | Minimum | Delivery Fee | Est. Time |
| --------------- | -------------------------------------- | ------- | ------------ | --------- |
| San Francisco   | SF and surrounding                     | $250.00 | $50.00       | 1-2 hours |
| South Bay       | San José, Santa Clara, Sunnyvale       | $350.00 | $75.00       | 2-3 hours |
| Lower Peninsula | Redwood City, Palo Alto, Mountain View | $400.00 | $100.00      | 2-3 hours |
| Peninsula       | San Ramón, Walnut Creek, Far Peninsula | $500.00 | $150.00      | 3-4 hours |

### Database Table: `catering_delivery_zones`

---

## 🥟 Regular Product Delivery Zones

**Purpose**: Handle individual product orders with reasonable delivery fees

### Characteristics:

- **Low/no minimums**: $0 - $75 for free delivery
- **Affordable fees**: $15 - $25 per delivery
- **Quick delivery**: 30-90 minutes
- **Immediate ordering**: No advance booking required
- **Consumer focus**: Individual customers, small orders

### Current Zones:

| Zone        | Areas                              | Free Over | Delivery Fee | Est. Time     |
| ----------- | ---------------------------------- | --------- | ------------ | ------------- |
| SF Nearby   | San Francisco, Daly City, South SF | $75.00    | $15.00       | 30-60 minutes |
| SF Extended | Peninsula, East Bay, South Bay     | $0.00     | $25.00       | 45-90 minutes |

### Database Table: `regular_delivery_zones`

---

## 🔧 Technical Implementation

### API Endpoints

#### Catering Zones

```
GET    /api/admin/delivery-zones
POST   /api/admin/delivery-zones
DELETE /api/admin/delivery-zones?id={zoneId}
```

#### Regular Zones

```
GET    /api/admin/regular-delivery-zones
POST   /api/admin/regular-delivery-zones
DELETE /api/admin/regular-delivery-zones?id={zoneId}
```

### Admin Interface

Both systems are managed through the **Admin Settings** panel:

1. **Catering Zones Tab** (`/admin/settings` → Catering Zones)
   - Manage high-value catering delivery areas
   - Set minimum order requirements
   - Configure delivery fees and time estimates

2. **Regular Zones Tab** (`/admin/settings` → Regular Zones)
   - Manage regular product delivery areas
   - Set delivery fees and free delivery thresholds
   - Configure coverage areas

### Checkout Integration

The system **automatically determines** which delivery zone system to use:

```typescript
// For regular products (empanadas, alfajores)
const deliveryFee = await calculateDeliveryFee(address, subtotal);
// Uses: regular_delivery_zones table

// For catering products
const cateringValidation = await validateCateringDelivery(address, items);
// Uses: catering_delivery_zones table
```

---

## 📍 Zone Matching Logic

Both systems use the same matching algorithm but query different tables:

1. **Postal Code Match** (Primary)
   - Direct postal code lookup in zone's `postalCodes` array
   - Most accurate method

2. **City Name Match** (Fallback)
   - Case-insensitive city name matching
   - Used when postal code isn't found

3. **No Match** (Default)
   - Order rejected or flat shipping rate applied
   - Customer prompted to contact for custom quote

---

## 🎛️ Configuration Options

### Catering Zones

- `minimumAmount`: Required order value for delivery
- `deliveryFee`: Fixed fee regardless of order size
- `estimatedDeliveryTime`: Display to customers
- `postalCodes`: Array of supported postal codes
- `cities`: Array of supported city names
- `active`: Enable/disable zone
- `displayOrder`: Sorting priority

### Regular Zones

- `minimumOrderForFree`: Order value for free delivery (0 = never free)
- `deliveryFee`: Fee charged if under minimum
- `estimatedDeliveryTime`: Display to customers
- `postalCodes`: Array of supported postal codes
- `cities`: Array of supported city names
- `active`: Enable/disable zone
- `displayOrder`: Sorting priority

---

## 🔄 Data Flow

### Regular Product Order Flow

```
1. Customer adds empanadas/alfajores to cart
2. Enters delivery address at checkout
3. System queries regular_delivery_zones table
4. Matches by postal code or city
5. Calculates fee based on zone rules:
   - If order ≥ minimumOrderForFree: $0 delivery
   - If order < minimumOrderForFree: deliveryFee charged
6. Displays result to customer
```

### Catering Order Flow

```
1. Customer selects catering items
2. Enters delivery details
3. System queries catering_delivery_zones table
4. Matches by postal code or city
5. Validates minimum order requirement
6. Applies fixed delivery fee
7. Displays total with delivery fee
```

---

## 🔍 Troubleshooting

### Common Issues

**Problem**: Customer sees "Outside delivery area"

- **Check**: Address matches postal codes or cities in active zones
- **Solution**: Add postal code/city to appropriate zone

**Problem**: Wrong delivery fee calculated

- **Check**: Order type (regular vs catering) matches expected system
- **Solution**: Verify product categorization and zone configuration

**Problem**: Free delivery not applying

- **Check**: Order total meets `minimumOrderForFree` threshold
- **Solution**: Review zone settings and order calculation

### Testing Tools

Run comprehensive system test:

```bash
npx tsx scripts/test-delivery-systems.ts
```

Check specific address:

```bash
# Test in browser console
calculateDeliveryFee({
  city: 'San Carlos',
  postalCode: '94070'
}, 60.00)
```

---

## 📈 Analytics & Monitoring

### Key Metrics

- **Zone Coverage**: Percentage of orders matched to zones
- **Average Delivery Fee**: By zone and product type
- **Free Delivery Rate**: Orders qualifying for free delivery
- **Geographic Distribution**: Popular delivery areas

### Admin Reports

- Zone performance analytics
- Delivery fee revenue by area
- Customer geographic patterns
- Optimization recommendations

---

## 🚀 Future Enhancements

### Planned Features

1. **Dynamic Pricing**: Time-based delivery fees
2. **Distance Calculation**: GPS-based fee adjustment
3. **Delivery Slots**: Time-specific availability
4. **Zone Analytics**: Performance dashboards
5. **Auto-expansion**: AI-suggested new zones

### Migration Considerations

- **Backward Compatibility**: Legacy orders still supported
- **Data Integrity**: Automated validation checks
- **Performance**: Optimized database queries
- **Caching**: Zone data cached for speed

---

## 📞 Support

For technical issues or zone configuration questions:

- **Admin Interface**: `/admin/settings`
- **Test Script**: `scripts/test-delivery-systems.ts`
- **API Documentation**: `/docs/api/delivery-zones.md`
- **System Logs**: Monitor delivery fee calculations

---

_Last Updated: January 2025_  
_System Version: v2.0 - Dual Zone Architecture_
