/**
 * Simple Prisma client for immediate testing and debugging
 * This bypasses the complex proxy logic and provides direct access
 */

import { PrismaClient } from '@prisma/client';

// Create a simple client for debugging purposes
let simpleClient: PrismaClient | null = null;

function getSimpleClient(): PrismaClient {
  if (!simpleClient) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    // Create basic optimized URL for Supabase
    const url = new URL(databaseUrl);
    if (url.hostname.includes('pooler.supabase.com')) {
      url.searchParams.set('pgbouncer', 'true');
      url.searchParams.set('prepared_statements', 'false');
      url.searchParams.set('statement_cache_size', '0');
      url.searchParams.set('pool_timeout', '30');
      url.searchParams.set('connection_timeout', '10');
    }

    simpleClient = new PrismaClient({
      datasources: {
        db: { url: url.toString() },
      },
      log: ['error'],
      errorFormat: 'minimal',
    });

    console.log('✅ Simple Prisma client created');
  }

  return simpleClient;
}

export const simplePrisma = getSimpleClient();

// Health check function
export async function testSimpleConnection(): Promise<boolean> {
  try {
    await simplePrisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Simple connection test passed');
    return true;
  } catch (error) {
    console.error('❌ Simple connection test failed:', error);
    return false;
  }
}

// Cleanup function
export async function disconnectSimple(): Promise<void> {
  if (simpleClient) {
    await simpleClient.$disconnect();
    simpleClient = null;
    console.log('✅ Simple client disconnected');
  }
}
