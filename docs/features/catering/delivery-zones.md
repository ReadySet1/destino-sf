# Minimum Purchase Requirements System

## Overview

The Minimum Purchase Requirements system implements zone-based minimum order amounts for catering deliveries. Different delivery zones have different minimum purchase requirements based on delivery distance, costs, and operational efficiency.

## Features

- **Zone-Based Minimums**: Different minimum amounts for different geographic areas
- **Consistent Across Pages**: Same minimums apply to lunch, buffet, appetizers, and share plates
- **Admin Configurable**: James can adjust minimum amounts without code changes
- **Automatic Zone Detection**: System determines delivery zone from postal code/city
- **Real-Time Validation**: Orders are validated against minimums before submission
- **Delivery Fee Integration**: Automatic calculation of delivery fees per zone

## Delivery Zones

### Current Zones

| Zone            | Area                                   | Minimum | Delivery Fee | Est. Time |
| --------------- | -------------------------------------- | ------- | ------------ | --------- |
| San Francisco   | SF and surrounding                     | $250.00 | $50.00       | 1-2 hours |
| South Bay       | San José, Santa Clara, Sunnyvale       | $350.00 | $75.00       | 2-3 hours |
| Lower Peninsula | Redwood City, Palo Alto, Mountain View | $400.00 | $100.00      | 2-3 hours |
| Peninsula       | San Ramón, Walnut Creek, Far Peninsula | $500.00 | $150.00      | 3-4 hours |

### Zone Configuration

```typescript
export const DELIVERY_ZONE_MINIMUMS: Record<DeliveryZone, ZoneMinimumConfig> = {
  [DeliveryZone.SAN_FRANCISCO]: {
    zone: DeliveryZone.SAN_FRANCISCO,
    name: 'San Francisco',
    minimumAmount: 250.0,
    description: 'San Francisco and surrounding areas',
    deliveryFee: 50.0,
    estimatedDeliveryTime: '1-2 hours',
    isActive: true,
  },
  // ... other zones
};
```

## Implementation Guide

### 1. Database Schema Updates

Add the following fields to your database schema:

```sql
-- Add to catering_orders table
ALTER TABLE catering_orders ADD COLUMN delivery_zone VARCHAR(50);
ALTER TABLE catering_orders ADD COLUMN delivery_address TEXT;
ALTER TABLE catering_orders ADD COLUMN delivery_fee DECIMAL(10,2);

-- Create delivery_zone_configs table for admin management
CREATE TABLE delivery_zone_configs (
  id SERIAL PRIMARY KEY,
  zone VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  minimum_amount DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2),
  estimated_delivery_time VARCHAR(50),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(100)
);

-- Create audit log table for admin changes
CREATE TABLE zone_config_audit_log (
  id SERIAL PRIMARY KEY,
  operation VARCHAR(20) NOT NULL,
  resource VARCHAR(50) NOT NULL,
  resource_id VARCHAR(100) NOT NULL,
  admin_user_id VARCHAR(100),
  admin_user_email VARCHAR(255),
  old_values JSONB,
  new_values JSONB,
  timestamp TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT
);
```

### 2. Frontend Integration

#### Display Minimums on Catering Pages

```tsx
import { getActiveDeliveryZones, getMinimumPurchaseMessage } from '@/types/catering';

function CateringPageHeader() {
  const activeZones = getActiveDeliveryZones();

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <h3 className="font-semibold text-yellow-800 mb-2">Delivery Minimums</h3>
      <ul className="text-yellow-700 text-sm space-y-1">
        {activeZones.map(zone => (
          <li key={zone.zone}>
            {zone.name}: ${zone.minimumAmount.toFixed(2)} minimum
          </li>
        ))}
      </ul>
    </div>
  );
}
```

#### Order Validation

```tsx
import { validateMinimumPurchase, determineDeliveryZone } from '@/types/catering';

function CateringOrderForm() {
  const [orderTotal, setOrderTotal] = useState(0);
  const [deliveryZone, setDeliveryZone] = useState<DeliveryZone | null>(null);
  const [validationResult, setValidationResult] = useState<MinimumPurchaseValidation | null>(null);

  useEffect(() => {
    if (deliveryZone && orderTotal > 0) {
      const validation = validateMinimumPurchase(orderTotal, deliveryZone);
      setValidationResult(validation);
    }
  }, [orderTotal, deliveryZone]);

  const handlePostalCodeChange = (postalCode: string) => {
    const zone = determineDeliveryZone(postalCode);
    setDeliveryZone(zone);
  };

  return (
    <form>
      {/* Address fields */}
      <input
        type="text"
        placeholder="Postal Code"
        onChange={e => handlePostalCodeChange(e.target.value)}
      />

      {/* Minimum validation display */}
      {validationResult && !validationResult.isValid && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mt-4">
          <p className="text-red-800 text-sm">{validationResult.message}</p>
        </div>
      )}

      {/* Order summary */}
      <div className="mt-4">
        <p>Subtotal: ${orderTotal.toFixed(2)}</p>
        {deliveryZone && (
          <>
            <p>Delivery Fee: ${getZoneConfig(deliveryZone).deliveryFee?.toFixed(2)}</p>
            <p>Total: ${calculateOrderTotal(orderTotal, deliveryZone).toFixed(2)}</p>
          </>
        )}
      </div>
    </form>
  );
}
```

### 3. Server Actions Integration

```typescript
// In src/actions/catering.ts
import { validateMinimumPurchase, determineDeliveryZone } from '@/types/catering';

export async function submitCateringOrder(orderData: CateringFormData) {
  // Determine delivery zone
  const deliveryZone = determineDeliveryZone(orderData.postalCode, orderData.city);

  if (!deliveryZone) {
    throw new Error('Unable to deliver to this location');
  }

  // Validate minimum purchase
  const validation = validateMinimumPurchase(orderData.totalAmount, deliveryZone);

  if (!validation.isValid) {
    throw new Error(validation.message);
  }

  // Calculate final total with delivery fee
  const finalTotal = calculateOrderTotal(orderData.totalAmount, deliveryZone);

  // Save order with delivery zone information
  const order = await prisma.cateringOrder.create({
    data: {
      ...orderData,
      deliveryZone,
      deliveryFee: getZoneConfig(deliveryZone).deliveryFee,
      totalAmount: finalTotal,
    },
  });

  return order;
}
```

### 4. Admin Panel Implementation

```tsx
// Admin component for managing zone minimums
function AdminZoneManagement() {
  const [zones, setZones] = useState<AdminZoneConfig[]>([]);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);

  const handleUpdateZone = async (zone: DeliveryZone, updates: ZoneUpdateRequest) => {
    const validation = validateZoneConfig(updates);

    if (!validation.isValid) {
      alert('Validation errors: ' + validation.errors.join(', '));
      return;
    }

    // Call admin API to update zone
    await updateZoneConfig(zone, updates);

    // Refresh zones list
    loadZones();
  };

  return (
    <div className="admin-panel">
      <h2>Delivery Zone Management</h2>

      {zones.map(zone => (
        <div key={zone.zone} className="zone-config-card">
          <h3>{zone.name}</h3>

          {editingZone === zone.zone ? (
            <ZoneEditForm
              zone={zone}
              onSave={updates => handleUpdateZone(zone.zone, updates)}
              onCancel={() => setEditingZone(null)}
            />
          ) : (
            <ZoneDisplayCard zone={zone} onEdit={() => setEditingZone(zone.zone)} />
          )}
        </div>
      ))}
    </div>
  );
}
```

## Usage Examples

### Check if Order Meets Minimum

```typescript
import { validateMinimumPurchase, DeliveryZone } from '@/types/catering';

const orderAmount = 225.0;
const zone = DeliveryZone.SAN_FRANCISCO;

const validation = validateMinimumPurchase(orderAmount, zone);

if (!validation.isValid) {
  console.log(validation.message);
  // "Minimum order of $250.00 required for San Francisco. You need $25.00 more."
}
```

### Calculate Order Total with Delivery

```typescript
import { calculateOrderTotal, DeliveryZone } from '@/types/catering';

const subtotal = 300.0;
const zone = DeliveryZone.SOUTH_BAY;

const total = calculateOrderTotal(subtotal, zone);
// Returns 375.00 (300 + 75 delivery fee)
```

### Determine Zone from Address

```typescript
import { determineDeliveryZone } from '@/types/catering';

const zone1 = determineDeliveryZone('94102'); // Returns SAN_FRANCISCO
const zone2 = determineDeliveryZone('95110', 'San Jose'); // Returns SOUTH_BAY
const zone3 = determineDeliveryZone('12345'); // Returns null (unknown area)
```

## Admin Features

### Zone Configuration Management

- **Update Minimums**: Change minimum purchase amounts per zone
- **Adjust Delivery Fees**: Modify delivery charges
- **Set Delivery Times**: Update estimated delivery windows
- **Activate/Deactivate Zones**: Enable or disable delivery to certain areas
- **Audit Trail**: Track all changes with timestamps and admin user info

### Analytics Dashboard

- **Orders by Zone**: See order volume per delivery area
- **Revenue by Zone**: Track revenue per zone
- **Minimum Violations**: Monitor orders that failed minimum requirements
- **Conversion Rates**: Track completion vs. abandonment rates per zone

### Recommended Minimum Calculator

The system includes a utility to calculate recommended minimums based on:

- Delivery costs
- Distance from restaurant
- Operational overhead
- Desired profit margins

```typescript
import { calculateRecommendedMinimum } from '@/types/admin';

const recommended = calculateRecommendedMinimum(
  150, // delivery fee
  25, // miles from base
  50 // preparation cost
);
// Returns recommended minimum (e.g., $275)
```

## Security Considerations

- **Admin Authentication**: Ensure only authorized users can modify zone configurations
- **Input Validation**: Validate all admin inputs before saving
- **Audit Logging**: Track all configuration changes
- **Rate Limiting**: Prevent excessive API calls to update configurations

## Future Enhancements

- **Dynamic Zone Detection**: Integration with Google Maps API for precise zone determination
- **Time-Based Minimums**: Different minimums based on order time (peak vs. off-peak)
- **Seasonal Adjustments**: Temporary minimum adjustments for holidays/events
- **Customer Notifications**: Email alerts about minimum requirements
- **Zone Expansion**: Easy addition of new delivery zones

## Testing

### Unit Tests

```typescript
describe('Minimum Purchase Validation', () => {
  test('validates minimum purchase correctly', () => {
    const result = validateMinimumPurchase(200, DeliveryZone.SAN_FRANCISCO);
    expect(result.isValid).toBe(false);
    expect(result.shortfall).toBe(50);
  });

  test('passes validation when minimum is met', () => {
    const result = validateMinimumPurchase(300, DeliveryZone.SAN_FRANCISCO);
    expect(result.isValid).toBe(true);
  });
});
```

### Integration Tests

- Test order submission with various amounts and zones
- Verify admin panel updates are reflected in order validation
- Test zone detection with various postal codes and cities
- Validate email notifications mention correct minimums

## Deployment Checklist

- [ ] Database migrations applied
- [ ] Zone configurations seeded with initial data
- [ ] Admin panel deployed and tested
- [ ] Frontend components updated to show minimums
- [ ] Order validation integrated
- [ ] Email templates updated with minimum information
- [ ] Analytics dashboard configured
- [ ] Documentation updated for staff training
