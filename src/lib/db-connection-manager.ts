/**
 * Database Connection Manager for Public Networks
 * 
 * This utility helps manage database connections when on public networks
 * that may block direct database connections.
 */

type ConnectionType = 'pooler' | 'direct' | 'alternative';

interface ConnectionConfig {
  type: ConnectionType;
  url: string;
  timeout: number;
  retries: number;
}

/**
 * Get optimal database URL based on network conditions
 */
export function getOptimalDatabaseUrl(): string {
  const basePassword = process.env.POSTGRES_PASSWORD || process.env.DATABASE_PASSWORD;
  
  if (!basePassword) {
    throw new Error('Database password not found in environment variables');
  }

  // Detect if we're on a restricted network
  const isPublicNetwork = detectPublicNetwork();
  const connectionConfigs = getConnectionConfigs(basePassword);
  
  if (isPublicNetwork) {
    console.log('🌐 Public network detected - using pooler connection');
    return connectionConfigs.pooler.url;
  }
  
  // For local development, prefer direct connection if available
  return process.env.DIRECT_URL || connectionConfigs.direct.url;
}

/**
 * Get all available connection configurations
 */
function getConnectionConfigs(password: string): Record<ConnectionType, ConnectionConfig> {
  const projectId = 'drrejylrcjbeldnzodjd';
  const region = 'us-west-1';
  
  return {
    pooler: {
      type: 'pooler',
      url: `postgresql://postgres.${projectId}:${password}@aws-0-${region}.pooler.supabase.com:6543/postgres?pgbouncer=true&prepared_statements=false&statement_cache_size=0&pool_timeout=300&connection_timeout=30&statement_timeout=60000&idle_in_transaction_session_timeout=60000&socket_timeout=120`,
      timeout: 30000,
      retries: 3
    },
    direct: {
      type: 'direct',
      url: `postgresql://postgres.${projectId}:${password}@db.${projectId}.supabase.co:5432/postgres`,
      timeout: 15000,
      retries: 2
    },
    alternative: {
      type: 'alternative',
      url: `postgresql://postgres.${projectId}:${password}@aws-0-${region}.pooler.supabase.com:5432/postgres?pgbouncer=true&prepared_statements=false`,
      timeout: 25000,
      retries: 2
    }
  };
}

/**
 * Detect if we're likely on a public/restricted network
 */
function detectPublicNetwork(): boolean {
  // Check environment hints
  if (process.env.FORCE_POOLER_CONNECTION === 'true') return true;
  if (process.env.NODE_ENV === 'production') return true;
  if (process.env.VERCEL) return true;
  
  // Check if we're in a known restricted environment
  const restrictedEnvironments = [
    'coffee shop',
    'public wifi',
    'corporate network',
    'hotel wifi'
  ];
  
  // You could add more sophisticated detection here
  // For now, assume public network if not explicitly local
  return !process.env.LOCAL_DEVELOPMENT;
}

/**
 * Test a specific connection configuration
 */
export async function testConnection(config: ConnectionConfig): Promise<boolean> {
  const { PrismaClient } = await import('@prisma/client');
  
  const client = new PrismaClient({
    datasources: { db: { url: config.url } },
    log: []
  });

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), config.timeout);
    });

    await Promise.race([
      client.$connect(),
      timeoutPromise
    ]);

    // Test with a simple query
    await client.$queryRaw`SELECT 1 as test`;
    await client.$disconnect();
    
    return true;
  } catch (error) {
    try {
      await client.$disconnect();
    } catch {
      // Ignore disconnect errors
    }
    return false;
  }
}

/**
 * Find the best working connection for current network
 */
export async function findBestConnection(): Promise<ConnectionConfig | null> {
  const password = process.env.POSTGRES_PASSWORD || process.env.DATABASE_PASSWORD;
  
  if (!password) {
    throw new Error('Database password not found');
  }

  const configs = getConnectionConfigs(password);
  const testOrder: ConnectionType[] = ['pooler', 'alternative', 'direct'];

  for (const type of testOrder) {
    const config = configs[type];
    console.log(`🔍 Testing ${type} connection...`);
    
    if (await testConnection(config)) {
      console.log(`✅ ${type} connection works!`);
      return config;
    }
    
    console.log(`❌ ${type} connection failed`);
  }

  return null;
}

/**
 * Get connection URL with automatic fallback
 */
export async function getConnectionUrlWithFallback(): Promise<string> {
  // First try the configured URL
  const configuredUrl = process.env.DATABASE_URL;
  if (configuredUrl) {
    const config = {
      type: 'configured' as ConnectionType,
      url: configuredUrl,
      timeout: 15000,
      retries: 1
    };
    
    if (await testConnection(config)) {
      return configuredUrl;
    }
  }

  // If configured URL fails, find the best alternative
  const bestConnection = await findBestConnection();
  if (bestConnection) {
    return bestConnection.url;
  }

  throw new Error('Unable to establish database connection on this network');
}
