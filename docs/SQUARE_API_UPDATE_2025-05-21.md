# Square API Update - Version 2025-05-21

## Overview

This document outlines the updates made to integrate Square API version 2025-05-21, which includes significant improvements to the Catalog API, new Labor API features, enhanced Payments API error handling, and GraphQL support.

## Major Changes

### 1. Updated Square SDK Version
- **Upgraded**: Square SDK from `42.1.0` to `42.3.0`
- **API Version**: Updated from `2023-12-13` to `2025-05-21` across all implementations

### 2. Enhanced Catalog API - Modifier Customization

#### New Features
- **Improved modifier control**: Better customization and quantity management
- **Online visibility**: Control which modifiers appear in online channels
- **Default selections**: Set modifiers to be selected by default
- **Quantity controls**: Allow customers to specify quantities for modifiers

#### New Fields Added

**CatalogModifier**:
- `hidden_online`: Hide modifier from online channels
- `on_by_default`: Modifier is selected by default

**CatalogModifierList**:
- `allow_quantities`: Enable quantity input for modifiers
- `min_selected_modifiers`: Minimum required modifiers
- `max_selected_modifiers`: Maximum allowed modifiers
- `hidden_from_customer`: Hide entire list from customers

**CatalogModifierOverride**:
- `hidden_online_override`: Override online visibility
- `on_by_default_override`: Override default selection

#### Deprecated Fields
- `CatalogModifierList.selection_type` → Use new quantity controls
- `CatalogModifierList.max_quantity` → Use `max_selected_modifiers`
- `CatalogItemModifierListInfo.hidden_from_customer` → Use `hidden_from_customer_override`

### 3. New Labor API Features (Beta)

#### Scheduled Shifts
New endpoints for managing team schedules:
- `createScheduledShift()`: Create draft/scheduled shifts
- `updateScheduledShift()`: Update existing shifts
- `searchScheduledShifts()`: Find shifts with filters
- `publishScheduledShift()`: Publish draft shifts
- `bulkPublishScheduledShifts()`: Publish multiple shifts

#### Timecards (Replacing Deprecated Shift API)
New endpoints for time tracking:
- `createTimecard()`: Replaces `createShift()`
- `updateTimecard()`: Replaces `updateShift()`
- `deleteTimecard()`: Replaces `deleteShift()`
- `retrieveTimecard()`: Replaces `getShift()`
- `searchTimecards()`: Replaces `searchShifts()`

### 4. Enhanced Payments API

#### Improved Gift Card Error Handling
- **Always returns available amount**: `GIFT_CARD_AVAILABLE_AMOUNT` error now always returned with `INSUFFICIENT_FUNDS`
- **Better error context**: Enhanced error parsing and logging
- **Helper functions**: Added utilities for handling gift card errors

#### New Helper Functions
```typescript
// Handle gift card payment errors
const errorInfo = handleGiftCardPaymentError(errors);

// Format user-friendly error messages
const message = formatGiftCardErrorMessage(availableAmount, requestedAmount);
```

### 5. GraphQL Support
- **New data access**: scheduledShifts and timecards graphs
- **Labor data**: Access to scheduling and time tracking via GraphQL

## Implementation Details

### File Structure
```
src/lib/square/
├── catalog-api.ts      # Updated with 2025-05-21 version
├── client.ts           # Enhanced with new API integrations
├── labor-api.ts        # NEW: Labor API implementation
├── payments-api.ts     # NEW: Enhanced payments with gift card handling
└── client-adapter.js   # Updated API version headers
```

### New Type Definitions
Added comprehensive TypeScript interfaces in `src/types/square.d.ts`:
- `CatalogModifier` (enhanced)
- `CatalogModifierList` (enhanced)
- `ScheduledShift` (new)
- `Timecard` (new)
- `GiftCardError` (new)

### Usage Examples

#### Using Enhanced Catalog API
```typescript
import { squareClient } from '@/lib/square/client';

// Create modifier with new controls
const modifier = {
  name: "Extra Cheese",
  price_money: { amount: 150, currency: "USD" },
  hidden_online: false,
  on_by_default: true
};
```

#### Using New Labor API
```typescript
import { laborApi } from '@/lib/square/client';

// Create a scheduled shift
const shift = await laborApi.createScheduledShift({
  scheduled_shift: {
    team_member_id: "team_member_id",
    location_id: "location_id",
    start_at: "2025-01-20T09:00:00Z",
    end_at: "2025-01-20T17:00:00Z"
  }
});

// Create a timecard (replaces old shift creation)
const timecard = await laborApi.createTimecard({
  timecard: {
    team_member_id: "team_member_id",
    location_id: "location_id",
    clockin_time: "2025-01-20T09:00:00Z"
  }
});
```

#### Using Enhanced Payments API
```typescript
import { directPaymentsApi } from '@/lib/square/payments-api';

// Create payment with enhanced error handling
try {
  const payment = await directPaymentsApi.createPayment({
    source_id: "gift_card_id",
    idempotency_key: "unique_key",
    amount_money: { amount: 1000, currency: "USD" }
  });
} catch (error) {
  if (error.errors) {
    const giftCardInfo = directPaymentsApi.handleGiftCardPaymentError(error.errors);
    if (giftCardInfo.isGiftCardError && giftCardInfo.availableAmount) {
      const message = directPaymentsApi.formatGiftCardErrorMessage(
        giftCardInfo.availableAmount,
        { amount: 1000, currency: "USD" }
      );
      console.log(message); // "Gift card has insufficient funds. Available: $5.00, Requested: $10.00"
    }
  }
}
```

## Migration Checklist

### Immediate Actions Required
- [x] Update Square SDK to version 42.3.0
- [x] Update all API version headers to `2025-05-21`
- [x] Add new TypeScript interface definitions
- [x] Implement new Labor API service
- [x] Implement enhanced Payments API service
- [x] Update main Square client with new API integrations

### Testing Required
- [ ] Test catalog modifier functionality with new fields
- [ ] Test Labor API scheduled shift creation and management
- [ ] Test timecard creation and time tracking
- [ ] Test enhanced gift card error handling
- [ ] Verify backward compatibility with existing code

### Future Considerations
- **Deprecation Timeline**: Plan migration away from deprecated Shift API
- **GraphQL Integration**: Consider implementing GraphQL for labor data access
- **Monitor Performance**: Track any performance impacts from new features

## Breaking Changes

### None for Existing Code
- All existing code remains functional
- Backward compatibility maintained for deprecated fields
- New features are additive

### Recommended Updates
1. **Shift API → Timecard API**: Start migrating from deprecated shift endpoints
2. **Modifier Customization**: Leverage new modifier controls for better UX
3. **Gift Card Handling**: Use enhanced error handling for better customer experience

## Support Resources

- [Square API Documentation](https://developer.squareup.com/docs)
- [Square API Changelog](https://developer.squareup.com/docs/changelog)
- [Labor API Guide](https://developer.squareup.com/docs/labor-api)
- [Catalog API Guide](https://developer.squareup.com/docs/catalog-api)

## Questions & Issues

If you encounter any issues with the Square API update, please:
1. Check the Square API status page
2. Review the error handling documentation
3. Test in sandbox environment first
4. Contact Square Developer Support if needed 