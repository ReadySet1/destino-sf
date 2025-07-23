# Square API Integration Migration Guide

## Overview

This guide explains changes made to fix Square API initialization issues that were causing build-time performance problems and warnings about the Square locations API.

## Key Changes Made

1. **Square Client Singleton Pattern**
   - Implemented proper singleton design to prevent multiple initializations
   - Added build-time detection to avoid API client initialization during builds
   - Improved error handling and logging

2. **New Service Layer**
   - Created a dedicated `SquareService` class in `src/lib/square/service.ts`
   - Provides cleaner interface for Square API operations
   - Ensures API calls happen at runtime, not build time

3. **Centralized Configuration**
   - Added `src/lib/config.ts` for environment-specific settings
   - Provides type-safe access to configuration values
   - Includes validation to catch configuration issues early

4. **Middleware Optimization**
   - Optimized middleware for edge runtime
   - Added early returns for static assets
   - Improved error handling

## How to Migrate Existing Code

### 1. Replace Direct Client Import

**Before**:

```typescript
import { squareClient } from '@/lib/square/client';

export async function myFunction() {
  const response = await squareClient.catalogApi.listCatalog();
  // ...
}
```

**After**:

```typescript
import { getSquareService } from '@/lib/square/service';

export async function myFunction() {
  const squareService = getSquareService();
  const catalogItems = await squareService.getCatalogItems();
  // ...
}
```

### 2. API Routes

**Before**:

```typescript
import { NextResponse } from 'next/server';
import { squareClient } from '@/lib/square/client';

export async function GET() {
  try {
    const response = await squareClient.catalogApi.listCatalog();
    return NextResponse.json({
      success: true,
      items: response.result.objects,
    });
  } catch (error) {
    // Error handling
  }
}
```

**After**:

```typescript
import { NextResponse } from 'next/server';
import { getSquareService } from '@/lib/square/service';

export async function GET() {
  try {
    const squareService = getSquareService();
    const items = await squareService.getCatalogItems();
    return NextResponse.json({
      success: true,
      items,
    });
  } catch (error) {
    // Error handling
  }
}
```

### 3. Server Actions / Components

**Before**:

```typescript
import { squareClient } from '@/lib/square/client';

export async function createOrder(data: any) {
  const response = await squareClient.ordersApi.createOrder(data);
  return response.result;
}
```

**After**:

```typescript
import { getSquareService } from '@/lib/square/service';

export async function createOrder(data: any) {
  const squareService = getSquareService();
  return await squareService.createOrder(data);
}
```

## Important Note on Edge Runtime

If your component or route uses the edge runtime directive:

```typescript
export const runtime = 'edge';
```

Consider if this is actually needed, as it disables static generation. For most cases, it's better to let Next.js infer the runtime automatically.

## Testing and Validation

To verify your migration:

1. Make sure your build completes without Square API warnings
2. Verify API functionality in development
3. Test the production build to ensure Square operations work as expected

## Need to Add More Service Methods?

Extend the `SquareService` class in `src/lib/square/service.ts` with new methods for any Square API operations you need.
