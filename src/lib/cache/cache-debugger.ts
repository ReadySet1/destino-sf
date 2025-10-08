/**
 * Cache Debugging Utilities
 *
 * Use these utilities to diagnose cache-related issues in Next.js 15
 */

import { headers } from 'next/headers';

export interface CacheDebugInfo {
  timestamp: number;
  route: string;
  method: string;
  cacheStatus: 'HIT' | 'MISS' | 'REVALIDATED' | 'UNKNOWN';
  headers: Record<string, string>;
  env: {
    nodeEnv: string;
    isDev: boolean;
    isProd: boolean;
  };
}

/**
 * Get cache debug information for the current request
 * Add this to your page.tsx to see cache behavior
 *
 * @example
 * ```tsx
 * export default async function Page() {
 *   const cacheInfo = await getCacheDebugInfo();
 *   console.log('Cache Debug:', cacheInfo);
 *   // ... rest of component
 * }
 * ```
 */
export async function getCacheDebugInfo(): Promise<CacheDebugInfo> {
  const headersList = await headers();
  const cacheStatus = (headersList.get('x-vercel-cache') ||
                       headersList.get('x-nextjs-cache') ||
                       'UNKNOWN') as CacheDebugInfo['cacheStatus'];

  return {
    timestamp: Date.now(),
    route: headersList.get('x-pathname') || 'unknown',
    method: headersList.get('x-method') || 'unknown',
    cacheStatus,
    headers: {
      'x-vercel-cache': headersList.get('x-vercel-cache') || 'none',
      'x-nextjs-cache': headersList.get('x-nextjs-cache') || 'none',
      'cache-control': headersList.get('cache-control') || 'none',
    },
    env: {
      nodeEnv: process.env.NODE_ENV || 'unknown',
      isDev: process.env.NODE_ENV === 'development',
      isProd: process.env.NODE_ENV === 'production',
    }
  };
}

/**
 * Add cache debugging to console in development
 *
 * @example
 * ```tsx
 * export default async function Page() {
 *   if (process.env.NODE_ENV === 'development') {
 *     await logCacheDebug('products-list');
 *   }
 *   // ... rest of component
 * }
 * ```
 */
export async function logCacheDebug(label: string): Promise<void> {
  if (process.env.NODE_ENV !== 'development') return;

  const debugInfo = await getCacheDebugInfo();
  console.log(`[Cache Debug: ${label}]`, {
    ...debugInfo,
    timestamp: new Date(debugInfo.timestamp).toISOString(),
  });
}

/**
 * Generate cache-busting timestamp for URLs
 * Use this if router.refresh() doesn't work
 *
 * @example
 * ```tsx
 * const url = `/admin/products?${getCacheBustParam()}`;
 * router.push(url);
 * ```
 */
export function getCacheBustParam(): string {
  return `_t=${Date.now()}`;
}

/**
 * Create a cache key with timestamp
 * Use for React.cache() or unstable_cache()
 *
 * @example
 * ```tsx
 * const cacheKey = getCacheKey('products', productId);
 * ```
 */
export function getCacheKey(...parts: string[]): string {
  return parts.join(':');
}

/**
 * Check if data is stale based on timestamp
 *
 * @param cachedAt - When the data was cached
 * @param maxAgeMs - Maximum age in milliseconds (default: 5 minutes)
 */
export function isStale(cachedAt: number, maxAgeMs: number = 5 * 60 * 1000): boolean {
  return Date.now() - cachedAt > maxAgeMs;
}

/**
 * Force browser cache clear via headers
 * Add this to route.ts or page.tsx
 *
 * @example
 * ```tsx
 * export const dynamic = 'force-dynamic';
 * export const revalidate = 0;
 *
 * export async function GET() {
 *   return new Response(JSON.stringify(data), {
 *     headers: getNoCacheHeaders(),
 *   });
 * }
 * ```
 */
export function getNoCacheHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store',
  };
}

/**
 * Debug object to expose in development
 */
export const CacheDebugger = {
  getInfo: getCacheDebugInfo,
  log: logCacheDebug,
  bustParam: getCacheBustParam,
  cacheKey: getCacheKey,
  isStale,
  noCacheHeaders: getNoCacheHeaders,
} as const;
