# Square API Integration

This module provides integration with the Square API for the Destino SF application.

## Background

We encountered challenges with the Square Node.js SDK version 42.0.1, which had issues with initialization and accessing API endpoints. The main problems were:

1. Version 42.0.1 of the SDK doesn't properly expose the API clients when used in an ESM environment
2. The Square documentation didn't clearly match the SDK's implementation
3. Different import and initialization patterns were needed for this version

## Solution

Instead of using the Square SDK directly, we created a custom client implementation that:

1. Makes direct HTTPS requests to the Square API endpoints
2. Uses the correct domain names for production and sandbox environments
3. Handles request/response serialization properly
4. Implements key API methods for locations and catalog management

## Usage

Import the Square client from the client.ts file:

```typescript
import { squareClient } from '@/lib/square/client';
```

### Available Endpoints

The client currently supports:

- **Locations API**: Get all locations for your account

  ```typescript
  const { result } = await squareClient.locationsApi.listLocations();
  const locations = result.locations;
  ```

- **Catalog API**:
  - List catalog items
    ```typescript
    const { result } = await squareClient.catalogApi.listCatalog(cursor, 'ITEM');
    const items = result.objects;
    ```
  - Search catalog items
    ```typescript
    const response = await squareClient.catalogApi.searchCatalogObjects({
      object_types: ['ITEM'],
      include_related_objects: true,
    });
    const items = response.result.objects;
    ```
  - Create catalog items
    ```typescript
    const response = await squareClient.catalogApi.upsertCatalogObject({
      idempotency_key: `item-${Date.now()}`,
      object: {
        type: 'ITEM',
        item_data: {
          name: 'Test Product',
          variations: [
            {
              type: 'ITEM_VARIATION',
              item_variation_data: {
                name: 'Regular',
                price_money: {
                  amount: 1500,
                  currency: 'USD',
                },
              },
            },
          ],
        },
      },
    });
    ```

## Key Files

- **client.ts**: The custom Square API client implementation
- **catalog.ts**: Functions for working with the catalog API
- **quickstart.ts**: Example functions and testing utilities

## Testing

Use the `/api/square/test-all` endpoint to verify that all Square API endpoints are working correctly.

## Important Notes

1. Always use snake_case (not camelCase) for property names in requests to the Square API
2. Use the `idempotency_key` field to prevent duplicate operations
3. The client automatically uses the sandbox environment in development mode

## Troubleshooting

If you encounter issues:

1. Check the server logs for detailed error information
2. Verify your Square access token in environment variables
3. Use the `/api/square/diagnose` endpoint to see details about the client configuration

# Square Tip Percentage Customization

This implementation provides custom tip percentage options (5%, 10%, 15%) for Square checkout instead of the default Square percentages (15%, 20%, 25%).

## Overview

The custom tip settings are implemented using Square's Checkout API `tip_settings` configuration, which allows you to:

- Set custom tip percentages (up to 3 values, 0-100%)
- Enable/disable custom tip input field
- Control tip screen behavior
- Override Square's smart tip amounts

## Implementation

### Files Modified

1. **`src/types/square.d.ts`** - Added TypeScript interfaces for type safety
2. **`src/lib/square/tip-settings.ts`** - Utility functions for tip configuration
3. **`src/app/actions/orders.ts`** - Updated regular order checkout
4. **`src/actions/catering.ts`** - Updated catering order checkout

### Key Features

- **Custom Percentages**: 5%, 10%, 15% instead of Square's default 15%, 20%, 25%
- **Type Safety**: Full TypeScript support with proper interfaces
- **Validation**: Input validation for percentage values and limits
- **Consistency**: Same tip settings across regular and catering orders
- **Flexibility**: Easy to modify percentages in the future

## Usage

### Basic Usage

```typescript
import { createTipSettings } from '@/lib/square/tip-settings';

// Use default percentages (5%, 10%, 15%)
const tipSettings = createTipSettings();

// Use custom percentages
const customTipSettings = createTipSettings([10, 20, 30]);
```

### In Checkout Configuration

```typescript
const squareCheckoutOptions = {
  allow_tipping: true,
  // ... other options
  tip_settings: createRegularOrderTipSettings(),
};
```

## Configuration Options

### SquareTipSettings Interface

```typescript
interface SquareTipSettings {
  allow_tipping: boolean; // Enable/disable tipping
  separate_tip_screen: boolean; // Show tips on separate screen
  custom_tip_field: boolean; // Allow custom tip input
  tip_percentages: number[]; // Array of percentages (max 3)
  smart_tip_amounts: boolean; // Use Square's smart tips (overrides custom)
}
```

### Default Configuration

- **allow_tipping**: `true`
- **separate_tip_screen**: `false` (show on same screen)
- **custom_tip_field**: `true` (allow custom amounts)
- **tip_percentages**: `[5, 10, 15]`
- **smart_tip_amounts**: `false` (use our custom percentages)

## Important Notes

1. **Smart Tip Override**: If `smart_tip_amounts` is `true`, Square ignores `tip_percentages`
2. **Maximum Percentages**: Square allows maximum 3 tip percentage options
3. **Valid Range**: Percentages must be between 0-100 (inclusive)
4. **Testing**: Always test in Square's sandbox environment first

## Testing

Run the test suite to verify functionality:

```bash
pnpm test src/lib/square/__tests__/tip-settings.test.ts
```

## Environment Setup

Ensure your Square environment variables are configured:

```env
SQUARE_ACCESS_TOKEN=your_access_token
SQUARE_LOCATION_ID=your_location_id
SQUARE_ENVIRONMENT=sandbox # or production
```

## Deployment Steps

1. **Test in Sandbox**: Verify tip percentages appear correctly
2. **Check Logs**: Monitor for any Square API errors
3. **Production Deploy**: Update production environment
4. **Verify**: Test a real transaction to confirm tip options

## Troubleshooting

### Common Issues

1. **Tips Not Showing**: Check `allow_tipping` is `true` in checkout options
2. **Wrong Percentages**: Verify `smart_tip_amounts` is `false`
3. **API Errors**: Check Square API version and authentication

### Debug Tips

- Enable console logging in tip-settings.ts for debugging
- Use Square's webhook logs to verify tip data
- Check browser network tab for API request/response details

## Future Enhancements

- Environment-specific tip percentages
- A/B testing for different tip amounts
- Analytics tracking for tip selection rates
- Admin interface for tip percentage management
