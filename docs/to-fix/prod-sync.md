# Fix Plan: Vercel Runtime Timeout Error in Production Sync

## 🎯 Problem Summary

**Issue**: The unified sync endpoint is timing out after 30 seconds in production, even though it's configured for 300 seconds (5 minutes) in `vercel.json`.

**Root Causes**:

1. The Vercel configuration path pattern might not be matching correctly
2. The sync process is too slow, processing items sequentially
3. Database operations are not optimized for batch processing

**Evidence from Logs**:

- Sync starts at `03:41:47.535Z`
- Timeout occurs at `03:42:17.370Z` (exactly 30 seconds later)
- Only processed 11 items before timeout (22 total in category)
- Each item takes ~2.2 seconds to process

## 🔧 Immediate Fix (Configuration)

### 1. Fix Vercel Configuration Path Pattern

The current configuration uses a specific file path which might not match correctly:

```json
// Current (NOT WORKING)
"src/app/api/square/unified-sync/route.ts": {
  "maxDuration": 300
}
```

**Solution**: Use the API route pattern instead:

```json
// vercel.json
{
  "functions": {
    "app/api/square/unified-sync/route.ts": {
      "maxDuration": 300
    },
    "app/api/square/sync/route.ts": {
      "maxDuration": 300
    },
    "app/api/square/enhanced-sync/route.ts": {
      "maxDuration": 300
    }
  }
}
```

Or use a wildcard pattern:

```json
{
  "functions": {
    "app/api/square/*/route.ts": {
      "maxDuration": 300
    }
  }
}
```

### 2. Add Edge Runtime Configuration (Alternative)

If the function configuration doesn't work, you can try using Edge Runtime with streaming:

```typescript
// At the top of route.ts
export const runtime = 'nodejs'; // Explicitly set runtime
export const maxDuration = 300; // 5 minutes
```

## 🚀 Performance Optimization (Long-term Solution)

### 1. Implement Parallel Processing

Current code processes items sequentially. Change to parallel batch processing:

```typescript
// CURRENT (SLOW - Sequential)
for (const item of items) {
  await processItem(item); // Takes ~2.2 seconds each
}

// OPTIMIZED (FAST - Parallel with controlled concurrency)
import pLimit from 'p-limit';

const limit = pLimit(5); // Process 5 items concurrently

const promises = items.map(item => limit(() => processItem(item)));

await Promise.all(promises);
```

### 2. Optimize Database Operations

**Use Bulk Upserts Instead of Individual Operations**:

```typescript
// CURRENT (SLOW - Individual operations)
for (const item of items) {
  const existingProduct = await prisma.product.findFirst({
    where: { squareId: item.id }
  });

  if (existingProduct) {
    await prisma.product.update(...);
  } else {
    await prisma.product.create(...);
  }
}

// OPTIMIZED (FAST - Bulk operations)
// Step 1: Fetch all existing products in one query
const squareIds = items.map(item => item.id);
const existingProducts = await prisma.product.findMany({
  where: { squareId: { in: squareIds } }
});

// Step 2: Separate creates and updates
const existingMap = new Map(existingProducts.map(p => [p.squareId, p]));
const toCreate = items.filter(item => !existingMap.has(item.id));
const toUpdate = items.filter(item => existingMap.has(item.id));

// Step 3: Bulk create
if (toCreate.length > 0) {
  await prisma.product.createMany({
    data: toCreate.map(item => ({...})),
    skipDuplicates: true
  });
}

// Step 4: Bulk update using transactions
if (toUpdate.length > 0) {
  await prisma.$transaction(
    toUpdate.map(item =>
      prisma.product.update({
        where: { squareId: item.id },
        data: {...}
      })
    )
  );
}
```

### 3. Implement Streaming Response

For very large syncs, implement streaming to avoid timeout:

```typescript
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Process in background
  (async () => {
    try {
      for (const category of categories) {
        const update = JSON.stringify({
          type: 'progress',
          category: category.name,
          status: 'processing',
        });
        await writer.write(encoder.encode(`data: ${update}\n\n`));

        // Process category
        await processCategory(category);

        const complete = JSON.stringify({
          type: 'progress',
          category: category.name,
          status: 'complete',
        });
        await writer.write(encoder.encode(`data: ${complete}\n\n`));
      }

      await writer.close();
    } catch (error) {
      await writer.abort(error);
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

### 4. Implement Queue-Based Processing

For production reliability, use a queue system:

```typescript
// Option A: Vercel Queue (if available on your plan)
import { Queue } from '@vercel/queue';

// Option B: Database-based queue
interface SyncJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  categories: string[];
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}

// Create job and return immediately
export async function POST(request: NextRequest) {
  const job = await prisma.syncJob.create({
    data: {
      status: 'pending',
      categories: request.categories,
      progress: 0,
    },
  });

  // Trigger background processing
  fetch('/api/square/process-sync-job', {
    method: 'POST',
    body: JSON.stringify({ jobId: job.id }),
  });

  return NextResponse.json({
    jobId: job.id,
    message: 'Sync job queued',
  });
}
```

## 📝 Implementation Steps

### Step 1: Quick Fix (5 minutes)

1. Update `vercel.json` with correct function paths
2. Deploy to production
3. Test sync again

### Step 2: Add Explicit Configuration (10 minutes)

1. Add `export const maxDuration = 300;` to route.ts
2. Deploy and test

### Step 3: Optimize Database Operations (2 hours)

1. Implement bulk fetch for existing products
2. Implement batch create/update operations
3. Test locally with timing logs

### Step 4: Implement Parallel Processing (1 hour)

1. Add `p-limit` package: `pnpm add p-limit`
2. Implement concurrent processing with limit
3. Test with different concurrency levels

### Step 5: Monitor and Adjust (ongoing)

1. Add performance metrics logging
2. Monitor sync times per category
3. Adjust batch sizes and concurrency based on results

## 🧪 Testing Script

Create a test script to verify the fix locally:

```typescript
// scripts/test-sync-performance.ts
import { performance } from 'perf_hooks';

async function testSyncPerformance() {
  const categories = [
    'CATERING- APPETIZERS',
    'CATERING- SHARE PLATTERS',
    // ... other categories
  ];

  const results = [];

  for (const category of categories) {
    const start = performance.now();

    const response = await fetch('http://localhost:3000/api/square/unified-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add auth headers
      },
      body: JSON.stringify({
        categories: [category],
        dryRun: false,
      }),
    });

    const end = performance.now();
    const duration = (end - start) / 1000;

    results.push({
      category,
      duration,
      status: response.status,
    });

    console.log(`${category}: ${duration.toFixed(2)}s`);
  }

  console.table(results);
}
```

## 🚨 Important Notes

1. **Vercel Plan Limitations**:
   - Hobby plan: 10 second max
   - Pro plan: 300 second max (5 minutes)
   - Enterprise: 900 second max (15 minutes)

2. **Database Connection Pooling**: Ensure Prisma is configured with proper connection pooling for concurrent operations

3. **Square API Rate Limits**: Be careful not to exceed Square's rate limits when implementing parallel processing

4. **Monitoring**: Add proper error tracking (Sentry) to catch and debug timeout issues in production

## 🔍 Verification Checklist

- [x] Vercel configuration path pattern is correct
- [x] maxDuration export is added to route file
- [x] Database queries are optimized for bulk operations
- [x] Parallel processing is implemented with proper concurrency control
- [ ] Error handling covers timeout scenarios
- [ ] Performance metrics are logged for monitoring
- [ ] Test coverage includes timeout scenarios

## ✅ Implementation Status (Updated: $(date))

### Completed Fixes:

1. **Vercel Configuration**: Updated `vercel.json` to use correct path patterns (`app/api/` instead of `src/app/api/`)
2. **Explicit Runtime Configuration**: Added `export const maxDuration = 300` to all sync route files:
   - `src/app/api/square/unified-sync/route.ts`
   - `src/app/api/square/enhanced-sync/route.ts`
   - `src/app/api/square/sync/route.ts`
3. **Bulk Database Operations**: Replaced sequential processing with optimized bulk operations:
   - Single query to fetch all existing products
   - Separate create and update operations
   - Bulk `createMany` for new products
   - Transaction-based bulk updates
   - Optimized variant creation
4. **Controlled Concurrency**: Implemented p-limit with 5 concurrent operations for Square API calls
5. **Performance Optimizations**:
   - Category cache preloading
   - Existing slugs caching
   - Bulk variant operations

### Expected Performance Improvements:

- **Individual operations**: ~2.2 seconds → ~100ms per item
- **Category processing**: 30+ seconds → 2-5 seconds per category
- **Full sync**: Should complete within 5 minutes (Vercel Pro limit)
- **Optimized sync**: 30-60 seconds for full sync

### Ready for Production Deployment

## 📊 Expected Results

After implementing these fixes:

- **Immediate**: Sync should complete within 5 minutes (Vercel Pro limit)
- **Optimized**: Full sync should complete in 30-60 seconds
- **Per category**: ~2-5 seconds (down from 30+ seconds)
- **Per item**: ~100ms (down from 2.2 seconds)
