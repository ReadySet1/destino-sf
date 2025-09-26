/**
 * Database Fallback Manager
 * Automatically switches between Prisma and HTTP methods when networks block database connections
 */

import { supabaseHttpAdapter } from './supabase-client';

type ConnectionMethod = 'prisma' | 'supabase-http' | 'fallback-data';

interface ConnectionStatus {
  method: ConnectionMethod;
  connected: boolean;
  latency: number;
  lastTested: Date;
  error?: string;
}

class DatabaseFallbackManager {
  private connectionStatus: ConnectionStatus = {
    method: 'prisma',
    connected: false,
    latency: 0,
    lastTested: new Date(),
  };

  private fallbackData = {
    cateringPackages: [],
    appetizerProducts: [],
    lunchProducts: [],
    buffetProducts: [],
    categories: []
  };

  async testPrismaConnection(): Promise<boolean> {
    try {
      // Dynamic import to avoid initialization issues
      const { prisma } = await import('./db-unified');
      await prisma.$queryRaw`SELECT 1 as test`;
      return true;
    } catch (error) {
      console.log('❌ Prisma connection failed:', (error as Error).message);
      return false;
    }
  }

  async findWorkingConnection(): Promise<ConnectionMethod> {
    console.log('🔍 Testing database connection methods...');

    // Test Prisma first (fastest when working)
    const start = Date.now();
    if (await this.testPrismaConnection()) {
      const latency = Date.now() - start;
      this.connectionStatus = {
        method: 'prisma',
        connected: true,
        latency,
        lastTested: new Date()
      };
      console.log(`✅ Prisma connection works (${latency}ms)`);
      return 'prisma';
    }

    // Test Supabase HTTP client
    const httpStart = Date.now();
    if (await supabaseHttpAdapter.testConnection()) {
      const latency = Date.now() - httpStart;
      this.connectionStatus = {
        method: 'supabase-http',
        connected: true,
        latency,
        lastTested: new Date()
      };
      console.log(`✅ Supabase HTTP connection works (${latency}ms)`);
      return 'supabase-http';
    }

    // Fallback to static data
    this.connectionStatus = {
      method: 'fallback-data',
      connected: false,
      latency: 0,
      lastTested: new Date(),
      error: 'No database connections available'
    };
    console.log('⚠️ Using fallback data - no database connections available');
    return 'fallback-data';
  }

  async executeWithFallback<T>(
    operation: string,
    prismaOperation: () => Promise<T>,
    httpOperation: () => Promise<T>,
    fallbackData: T
  ): Promise<T> {
    const method = await this.findWorkingConnection();

    try {
      switch (method) {
        case 'prisma':
          return await prismaOperation();
        
        case 'supabase-http':
          console.log(`🌐 Using HTTP API for ${operation}`);
          return await httpOperation();
        
        case 'fallback-data':
        default:
          console.log(`📦 Using fallback data for ${operation}`);
          return fallbackData;
      }
    } catch (error) {
      console.error(`❌ ${operation} failed with ${method}:`, error);
      
      // Try next fallback method
      if (method === 'prisma') {
        try {
          console.log(`🔄 Retrying ${operation} with HTTP API...`);
          return await httpOperation();
        } catch (httpError) {
          console.log(`📦 Falling back to static data for ${operation}`);
          return fallbackData;
        }
      }
      
      console.log(`📦 Using fallback data for ${operation}`);
      return fallbackData;
    }
  }

  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  // Specific operations with fallbacks
  async getCateringPackages() {
    return this.executeWithFallback(
      'getCateringPackages',
      async () => {
        const { prisma } = await import('./db-unified');
        return await prisma.cateringPackage.findMany({
          where: { isActive: true },
          include: { items: true },
          orderBy: { featuredOrder: 'asc' }
        });
      },
      () => supabaseHttpAdapter.getCateringPackages(),
      this.fallbackData.cateringPackages
    );
  }

  async getAppetizerProducts() {
    return this.executeWithFallback(
      'getAppetizerProducts',
      async () => {
        const { prisma } = await import('./db-unified');
        return await prisma.product.findMany({
          where: {
            active: true,
            category: { name: 'Appetizers' }
          },
          include: {
            category: true,
            variants: true
          },
          orderBy: { ordinal: 'asc' }
        });
      },
      () => supabaseHttpAdapter.getAppetizerProducts(),
      this.fallbackData.appetizerProducts
    );
  }

  async getLunchProducts() {
    return this.executeWithFallback(
      'getLunchProducts',
      async () => {
        const { prisma } = await import('./db-unified');
        return await prisma.product.findMany({
          where: {
            active: true,
            category: { name: 'Lunch' }
          },
          include: {
            category: true,
            variants: true
          },
          orderBy: { ordinal: 'asc' }
        });
      },
      () => supabaseHttpAdapter.getLunchProducts(),
      this.fallbackData.lunchProducts
    );
  }

  async getBuffetProducts() {
    return this.executeWithFallback(
      'getBuffetProducts',
      async () => {
        const { prisma } = await import('./db-unified');
        return await prisma.product.findMany({
          where: {
            active: true,
            category: { name: 'Buffet' }
          },
          include: {
            category: true,
            variants: true
          },
          orderBy: { ordinal: 'asc' }
        });
      },
      () => supabaseHttpAdapter.getBuffetProducts(),
      this.fallbackData.buffetProducts
    );
  }
}

export const dbFallbackManager = new DatabaseFallbackManager();
