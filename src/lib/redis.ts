/**
 * Redis client wrapper
 * Placeholder implementation for test compatibility
 */

export const redis = {
  get: async (key: string) => null,
  set: async (key: string, value: any, ttl?: number) => 'OK',
  del: async (key: string) => 1,
  exists: async (key: string) => 0,
  ttl: async (key: string) => -1,
  flushall: async () => 'OK',
};
