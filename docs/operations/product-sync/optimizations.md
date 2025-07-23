# Square Sync Optimizations

## Overview

This document outlines the key optimizations made to the Square product synchronization process to address performance issues and eliminate redundant operations.

## Issues Fixed

### 1. Circular Dependency Issue

**Problem**: `ReferenceError: Cannot access 'getSquareConfig' before initialization`
**Solution**: Removed circular dependency in `catalog-api.ts` by using direct environment variable access instead of requiring the main client configuration.

**Changes Made**:

- Modified `src/lib/square/catalog-api.ts` to use direct environment variable access
- Eliminated the `require('./client')` call that was causing the circular dependency

### 2. Performance Issues

**Problem**: Sync operations taking 4+ minutes due to inefficient processing
**Solutions**:

#### Batch Processing

- Added batch processing constants: `BATCH_SIZE = 10`, `IMAGE_BATCH_SIZE = 5`
- Process products in batches instead of one by one
- Process images in smaller batches to avoid overwhelming the API
- Added small delays between batches to prevent database overload

#### Parallel Processing

- Use `Promise.allSettled()` for parallel processing within batches
- Process multiple items concurrently while maintaining control over batch sizes

#### Optimized Image Handling

- Batch image URL validation instead of individual requests
- Added timeout handling for image URL tests (5 second timeout)
- Improved error handling for failed image processing

### 3. Redundant Operations

**Problem**: Catering sync was running multiple times
**Solution**:

- Modified `syncCateringItemsWithSquare()` to accept pre-fetched data
- Eliminated duplicate API calls by reusing already fetched Square data
- Only run catering sync once when catering categories are detected

### 4. Improved Logging

**Problem**: Too much verbose logging slowing down operations
**Solutions**:

- Changed many `logger.info()` calls to `logger.debug()` for less critical information
- Kept important status updates as info level
- Better structured log messages for easier debugging

### 5. Error Handling Improvements

- Added comprehensive error handling with `Promise.allSettled()`
- Prevent single item failures from stopping entire batches
- Better error reporting and recovery

## Key Functions Added/Modified

### `processSquareItem()`

- Extracted item processing logic into a dedicated function
- Handles individual product processing with proper error isolation

### `handleUniqueConstraintViolation()`

- Dedicated function for handling Prisma unique constraint violations
- Cleaner error recovery logic

### `processImageUrl()` and `testImageUrl()`

- Optimized image URL processing and validation
- Added timeout handling and better error recovery

### `chunkArray()`

- Utility function for splitting arrays into batches
- Used throughout the sync process for better performance

## Performance Improvements

### Before Optimizations:

- Single-threaded processing
- Individual API calls for each item/image
- Redundant catering sync operations
- Verbose logging on every operation
- 4+ minute sync times

### After Optimizations:

- Batch processing with configurable batch sizes
- Parallel processing within batches
- Reuse of fetched data to eliminate redundant API calls
- Optimized logging levels
- Expected sync times: 30-60 seconds (significant reduction)

## Configuration Options

### Environment Variables

- `BATCH_SIZE`: Number of products to process in each batch (default: 10)
- `IMAGE_BATCH_SIZE`: Number of images to process in each batch (default: 5)
- `AUTO_CLEANUP_INVALID_PRODUCTS`: Whether to clean up invalid products (currently disabled due to schema constraints)

## Usage

The optimized sync maintains the same external API:

```typescript
import { syncSquareProducts } from '@/lib/square/sync';

const result = await syncSquareProducts();
console.log(`Synced ${result.syncedProducts} products`);
```

## Future Improvements

1. **Database Optimization**: Consider using batch inserts/updates for even better performance
2. **Caching**: Implement caching for frequently accessed Square data
3. **Background Jobs**: Move long-running syncs to background job queues
4. **Incremental Sync**: Only sync changed items instead of full sync every time
5. **Monitoring**: Add performance metrics and monitoring for sync operations

## Testing

To test the optimizations:

1. Run the sync operation from the admin panel
2. Monitor the logs for batch processing messages
3. Verify sync completion time is significantly reduced
4. Check that all products and images are correctly synchronized

## Notes

- The cleanup function for invalid products was removed due to Prisma schema constraints
- Image processing now includes proper timeout handling
- All database operations use proper error handling to prevent cascading failures
