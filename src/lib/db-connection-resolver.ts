/**
 * Database Connection Resolver
 * 
 * Handles connection issues and provides fallback strategies for different environments
 */

import { PrismaClient } from '@prisma/client';

interface ConnectionAttempt {
  url: string;
  description: string;
  timeout: number;
}

/**
 * Create multiple connection strategies for resilience
 */
function getConnectionStrategies(): ConnectionAttempt[] {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const directUrl = process.env.DIRECT_DATABASE_URL;
  const strategies: ConnectionAttempt[] = [];

  // Strategy 1: Direct connection (if available)
  if (directUrl) {
    strategies.push({
      url: directUrl,
      description: 'Direct database connection',
      timeout: 20000
    });
  }

  // Strategy 2: Optimized pooler connection
  try {
    const url = new URL(baseUrl);
    
    // Enhanced pooler configuration
    if (url.hostname.includes('pooler.supabase.com')) {
      url.searchParams.set('pgbouncer', 'true');
      url.searchParams.set('prepared_statements', 'false');
      url.searchParams.set('statement_cache_size', '0');
      url.searchParams.set('pool_timeout', '30');
      url.searchParams.set('connection_timeout', '20');
      url.searchParams.set('statement_timeout', '30000');
      url.searchParams.set('socket_timeout', '60');
      
      strategies.push({
        url: url.toString(),
        description: 'Optimized Supabase pooler connection',
        timeout: 30000
      });
    }

    // Strategy 3: Basic pooler connection (fallback)
    strategies.push({
      url: baseUrl,
      description: 'Basic pooler connection (fallback)',
      timeout: 15000
    });

  } catch (error) {
    console.warn('Error parsing DATABASE_URL:', error);
    strategies.push({
      url: baseUrl,
      description: 'Raw DATABASE_URL (fallback)',
      timeout: 15000
    });
  }

  return strategies;
}

/**
 * Attempt connection with timeout and retry logic
 */
async function attemptConnection(strategy: ConnectionAttempt): Promise<PrismaClient> {
  console.log(`🔗 Trying: ${strategy.description} (timeout: ${strategy.timeout / 1000}s)`);
  
  const client = new PrismaClient({
    datasources: { db: { url: strategy.url } },
    log: ['error'],
    errorFormat: 'minimal'
  });

  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Connection timeout after ${strategy.timeout / 1000} seconds`));
    }, strategy.timeout);
  });

  try {
    // Race connection against timeout
    await Promise.race([client.$connect(), timeoutPromise]);
    
    // Verify with a simple query
    const verifyTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Verification timeout after 10 seconds'));
      }, 10000);
    });
    
    await Promise.race([
      client.$queryRaw`SELECT 1 as test`,
      verifyTimeout
    ]);

    console.log(`✅ Successfully connected via: ${strategy.description}`);
    return client;

  } catch (error) {
    console.warn(`❌ Failed: ${strategy.description} - ${(error as Error).message}`);
    
    try {
      await client.$disconnect();
    } catch (disconnectError) {
      // Ignore disconnect errors
    }
    
    throw error;
  }
}

/**
 * Resilient database client creation with multiple fallback strategies
 */
export async function createResilientClient(): Promise<PrismaClient> {
  const strategies = getConnectionStrategies();
  
  console.log(`🔄 Attempting ${strategies.length} connection strategies...`);
  
  let lastError: Error | null = null;

  for (const strategy of strategies) {
    try {
      const client = await attemptConnection(strategy);
      return client;
    } catch (error) {
      lastError = error as Error;
      // Continue to next strategy
    }
  }

  // All strategies failed
  console.error('❌ All connection strategies failed');
  throw lastError || new Error('Failed to establish database connection');
}

/**
 * Test database connectivity and report issues
 */
export async function diagnoseDatabaseIssues(): Promise<void> {
  console.log('🔍 Diagnosing Database Connection Issues');
  console.log('=========================================');

  // Check environment variables
  console.log('\n1. Environment Variables:');
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`   DIRECT_DATABASE_URL: ${process.env.DIRECT_DATABASE_URL ? '✅ Set' : '⚠️ Not set'}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);

  // Test each strategy
  console.log('\n2. Testing Connection Strategies:');
  const strategies = getConnectionStrategies();
  
  for (let i = 0; i < strategies.length; i++) {
    const strategy = strategies[i];
    console.log(`\n   Strategy ${i + 1}: ${strategy.description}`);
    
    try {
      const client = await attemptConnection(strategy);
      console.log(`   ✅ SUCCESS: Connected successfully`);
      await client.$disconnect();
      console.log(`   ✅ Disconnected cleanly`);
      break; // First working strategy found
    } catch (error) {
      console.log(`   ❌ FAILED: ${(error as Error).message}`);
    }
  }

  console.log('\n=========================================');
}
