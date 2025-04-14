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
      include_related_objects: true
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
                  currency: 'USD'
                }
              }
            }
          ]
        }
      }
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