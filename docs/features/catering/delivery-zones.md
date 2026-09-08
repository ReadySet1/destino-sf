# Minimum Purchase Requirements System

## Overview

The Minimum Purchase Requirements system implements zone-based minimum order amounts for catering deliveries. Different delivery zones have different minimum purchase requirements based on delivery distance, costs, and operational efficiency.

## Features

- **Zone-Based Minimums**: Different minimum amounts for different geographic areas
- **Consistent Across Pages**: Same minimums apply to lunch, buffet, appetizers, and share plates
- **Admin Configurable**: James can adjust minimums, fees, postal codes and cities without code changes
- **Automatic Zone Detection**: System determines delivery zone from the postal codes and cities stored per zone
- **Real-Time Validation**: Orders are validated against minimums before submission
- **Delivery Fee Integration**: Automatic calculation of delivery fees per zone

## Delivery Zones

Zones, minimums, delivery fees and the postal codes / cities that map to each zone live in the
`catering_delivery_zones` table (Prisma model `CateringDeliveryZone`) and are edited from the admin
panel. See the [Admin Delivery Zones Guide](../../user-guides/admin-delivery-zones-guide.md) for the
UI walkthrough. The values below are the seed defaults (DES-52); the live numbers are whatever the
admin last saved.

### Seed Defaults

| Zone            | Area                                   | Minimum | Delivery Fee | Est. Time |
| --------------- | -------------------------------------- | ------- | ------------ | --------- |
| San Francisco   | SF and surrounding                     | $250.00 | $50.00       | 1-2 hours |
| South Bay       | San José, Santa Clara, Sunnyvale       | $400.00 | $75.00       | 2-3 hours |
| Lower Peninsula | Redwood City, Palo Alto, Mountain View | $350.00 | $65.00       | 2-3 hours |
| East Bay        | Oakland, Berkeley and surrounding      | $400.00 | $75.00       | 2-3 hours |
| Marin County    | Marin County and surrounding           | $400.00 | $65.00       | 2-3 hours |

`PENINSULA` is still a member of the `DeliveryZone` enum so old orders keep deserializing, but it is
inactive: it was replaced by `EAST_BAY` and `MARIN_COUNTY`.

### Zone Configuration

`DELIVERY_ZONE_MINIMUMS` in `src/types/catering.ts` holds seed / reference values only. Nothing at
runtime reads it to resolve a zone, a minimum or a fee. Use the async helpers in
`src/lib/delivery-zones.ts` instead:

| Helper                                     | What it does                                                                                                           |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `getActiveDeliveryZones()`                 | Active zones from the DB, ordered by `displayOrder`. Pass the result to `DeliveryZoneInfo` / `CateringCheckoutClient`. |
| `getZoneConfig(zone)`                      | One zone's config, or `null` when it is missing or inactive.                                                           |
| `determineDeliveryZone(postalCode, city?)` | Resolves a zone from the ZIP first, then the city. `null` when nothing matches or when no zone is active.              |
| `validateMinimumPurchase(amount, zone)`    | Checks the amount against the zone's minimum; on failure carries `shortfall` and a customer-facing `message`.          |
| `calculateOrderTotal(subtotal, zone)`      | Subtotal plus the zone's delivery fee.                                                                                 |
| `getMinimumPurchaseMessage(zone)`          | Display string for the zone's minimum.                                                                                 |
| `clearDeliveryZonesCache()`                | Drops the in-process cache (see below). The admin zones API calls it after every create / update / delete.             |

All of these are `async` because they read Prisma; they only run on the server (server components,
server actions, route handlers). Client components get zones as props or call a server action.

Address matching normalizes the input before comparing: the ZIP is reduced to its first five digits
(`"94110-1234"` and `" 94110"` both match `94110`) and the city is trimmed and compared
case-insensitively, so a stray suffix or space is not reported as "we don't deliver there". Rows store
the zone identifier lowercase (`east_bay`); `determineDeliveryZone` returns it as stored and
`validateCateringOrderWithDeliveryZone` upper-cases it to the `DeliveryZone` enum (`EAST_BAY`) before
it reaches callers or persisted orders.

**Caching.** The zone list (`getDeliveryZones()`, and everything built on it: `getActiveDeliveryZones`,
`getZoneConfig`, `validateMinimumPurchase`, `calculateOrderTotal`) is cached in-process for 5 minutes.
`determineDeliveryZone` queries the table directly. `POST`, `PUT` and `DELETE` on
`/api/admin/delivery-zones` call `clearDeliveryZonesCache()`, so an admin edit is visible on the next
checkout load rather than up to 5 minutes later. If the database is unreachable the list falls back to
the seed defaults.

## Implementation Guide

### 1. Database Schema

The zone table is `catering_delivery_zones` (`model CateringDeliveryZone` in `prisma/schema.prisma`):

| Column                  | Type       | Notes                                                 |
| ----------------------- | ---------- | ----------------------------------------------------- |
| `zone`                  | `String`   | Unique identifier, stored lowercase (`san_francisco`) |
| `name`                  | `String`   | Customer-facing label                                 |
| `description`           | `String?`  |                                                       |
| `minimumAmount`         | `Decimal`  | Minimum order value                                   |
| `deliveryFee`           | `Decimal`  | Flat fee for the zone                                 |
| `estimatedDeliveryTime` | `String?`  | Shown to customers                                    |
| `postalCodes`           | `String[]` | Bare 5-digit ZIPs                                     |
| `cities`                | `String[]` | Plain city names, matched case-insensitively          |
| `displayOrder`          | `Int`      | Sort order in the checkout panel                      |
| `active`                | `Boolean`  | Inactive zones are ignored by every helper            |

Catering orders persist the resolved zone in `catering_orders.deliveryZone` plus `deliveryFee` and
the structured `deliveryAddressJson`.

### 2. Frontend Integration

#### Display Minimums on Catering Pages

Fetch zones once in a server component and pass them down. This is what
`src/app/catering/checkout/page.tsx` does for the "Delivery Zones & Minimums" panel:

```tsx
// src/app/catering/checkout/page.tsx (server component)
import { getActiveDeliveryZones } from '@/lib/delivery-zones';
import { CateringCheckoutClient } from '@/components/Catering/CateringCheckoutClient';

export default async function CateringCheckoutPage() {
  const deliveryZones = await getActiveDeliveryZones();

  return (
    <CateringCheckoutClient
      userData={userData}
      isLoggedIn={isLoggedIn}
      deliveryZones={deliveryZones}
    />
  );
}
```

`DeliveryZoneInfo` is presentational and takes the same list through its `zones` prop:

```tsx
import { getActiveDeliveryZones } from '@/lib/delivery-zones';
import { DeliveryZoneInfo } from '@/components/Catering/DeliveryZoneInfo';

export default async function CateringPage() {
  const zones = await getActiveDeliveryZones();
  return <DeliveryZoneInfo zones={zones} compact />;
}
```

#### Order Validation

Client components cannot resolve zones themselves (the helpers read Prisma). Call the
`validateCateringOrderWithDeliveryZone` server action with the structured address, as
`CateringCheckoutClient` does:

```tsx
'use client';
import { validateCateringOrderWithDeliveryZone } from '@/actions/catering';

const validation = await validateCateringOrderWithDeliveryZone(
  { city: deliveryAddress.city, postalCode: deliveryAddress.postalCode },
  totalAmount
);

if (!validation.success) {
  // validation.error: 'Delivery zone not supported' | the minimum-purchase message | ...
  // validation.minimumPurchase / validation.deliveryFee are present when the zone resolved
  setError(validation.error);
} else {
  setDeliveryZone(validation.deliveryZone); // e.g. DeliveryZone.SAN_FRANCISCO
  setDeliveryFee(validation.deliveryFee);
}
```

### 3. Server Actions Integration

`validateCateringOrderWithDeliveryZone` in `src/actions/catering.ts` is the server-side entry point.
It takes `{ city, postalCode }` (not a free-form address string) and composes the lib helpers:

```typescript
// src/actions/catering.ts
import {
  determineDeliveryZone,
  getZoneConfig,
  validateMinimumPurchase,
} from '@/lib/delivery-zones';

export async function validateCateringOrderWithDeliveryZone(
  address: { city: string; postalCode: string },
  totalAmount: number
) {
  const resolved = await determineDeliveryZone(address.postalCode, address.city);
  if (!resolved) return { success: false, error: 'Delivery zone not supported' };

  const zone = resolved.toUpperCase() as DeliveryZone; // rows store `east_bay`
  const zoneConfig = await getZoneConfig(zone);
  if (!zoneConfig) return { success: false, error: 'Delivery zone configuration not found' };

  const minimum = await validateMinimumPurchase(totalAmount, zone);
  if (!minimum.isValid) {
    return {
      success: false,
      error: minimum.message,
      deliveryZone: zone,
      deliveryFee: zoneConfig.deliveryFee,
      minimumPurchase: zoneConfig.minimumAmount,
    };
  }

  return {
    success: true,
    deliveryZone: zone,
    deliveryFee: zoneConfig.deliveryFee,
    minimumPurchase: zoneConfig.minimumAmount,
  };
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

All helpers are async and server-only. Results depend on what the admin has saved in
`catering_delivery_zones`; the numbers below assume the seed defaults.

### Check if Order Meets Minimum

```typescript
import { validateMinimumPurchase } from '@/lib/delivery-zones';
import { DeliveryZone } from '@/types/catering';

const validation = await validateMinimumPurchase(225.0, DeliveryZone.SAN_FRANCISCO);

if (!validation.isValid) {
  console.log(validation.message);
  // "Minimum order of $250.00 required for San Francisco. You need $25.00 more."
  // validation.shortfall === 25
}
```

### Calculate Order Total with Delivery

```typescript
import { calculateOrderTotal } from '@/lib/delivery-zones';
import { DeliveryZone } from '@/types/catering';

const total = await calculateOrderTotal(300.0, DeliveryZone.SOUTH_BAY);
// 375.00 with the seed defaults (300 + 75 delivery fee)
```

### Determine Zone from Address

```typescript
import { determineDeliveryZone } from '@/lib/delivery-zones';

// Matches against the postalCodes / cities arrays of the active zones.
const zone1 = await determineDeliveryZone('94102'); // 'san_francisco' when 94102 is in the SF zone
const zone2 = await determineDeliveryZone('94110-1234'); // ZIP+4 is trimmed to '94110' first
const zone3 = await determineDeliveryZone('00000', ' Oakland '); // falls back to the city match
const zone4 = await determineDeliveryZone('12345'); // null: no zone lists it
```

### Bust the Cache After Changing Zones

```typescript
import { clearDeliveryZonesCache } from '@/lib/delivery-zones';

// Already done by POST / PUT / DELETE /api/admin/delivery-zones. Call it yourself only if you
// write to catering_delivery_zones through another path (a script, a seed, a test).
clearDeliveryZonesCache();
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

Existing coverage (mock `prisma.cateringDeliveryZone.findMany` and call `clearDeliveryZonesCache()`
in `beforeEach` so the 5-minute cache does not leak between cases):

- `src/__tests__/lib/delivery-zones.test.ts`: ZIP / city normalization, no-active-rows handling, cache
  reuse across lookups, minimum validation against DB values, seed fallback when the DB is down
- `src/__tests__/actions/catering-delivery-zone.test.ts`: `validateCateringOrderWithDeliveryZone` with
  the `{ city, postalCode }` shape and the lowercase-to-enum zone normalization
- `src/__tests__/components/Catering/DeliveryZoneInfo.test.tsx`: renders whatever `zones` it is given

```typescript
import { clearDeliveryZonesCache, validateMinimumPurchase } from '@/lib/delivery-zones';
import { DeliveryZone } from '@/types/catering';

beforeEach(() => clearDeliveryZonesCache());

test('reports the shortfall against the DB minimum', async () => {
  const result = await validateMinimumPurchase(200, DeliveryZone.SAN_FRANCISCO);
  expect(result.isValid).toBe(false);
  expect(result.shortfall).toBe(50);
});
```

### Integration Tests

- Test order submission with various amounts and zones
- Verify admin panel updates are reflected in order validation on the next checkout load
- Test zone detection with ZIP+4, padded ZIPs, and mixed-case / padded city names
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
