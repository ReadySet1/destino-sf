import { PrismaClient } from '@prisma/client';

// Test environment configuration
export class TestEnvironment {
  private static instance: TestEnvironment;
  private prismaClient: PrismaClient | null = null;

  private constructor() {}

  static getInstance(): TestEnvironment {
    if (!TestEnvironment.instance) {
      TestEnvironment.instance = new TestEnvironment();
    }
    return TestEnvironment.instance;
  }

  async setupPrisma(): Promise<PrismaClient> {
    if (this.prismaClient) {
      return this.prismaClient;
    }

    // Create a fresh Prisma client for testing with minimal configuration
    this.prismaClient = new PrismaClient({
      log: ['error'], // Only log errors during tests
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    try {
      await this.prismaClient.$connect();
      console.log('✅ Test Prisma client connected');
    } catch (error) {
      console.error('❌ Failed to connect test Prisma client:', error);
      throw error;
    }

    return this.prismaClient;
  }

  async cleanup(): Promise<void> {
    if (this.prismaClient) {
      try {
        await this.prismaClient.$disconnect();
        console.log('✅ Test Prisma client disconnected');
      } catch (error) {
        console.error('❌ Error disconnecting test Prisma client:', error);
      } finally {
        this.prismaClient = null;
      }
    }
  }

  async resetPrismaConnection(): Promise<void> {
    await this.cleanup();
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    // Small delay to ensure cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  getPrismaClient(): PrismaClient | null {
    return this.prismaClient;
  }
}

// Environment setup utilities
export async function setupTestEnvironment(): Promise<void> {
  console.log('🔧 Setting up test environment...');
  
  // Set test environment variables using Object.assign to avoid readonly issues
  Object.assign(process.env, {
    NODE_ENV: 'test',
    NEXT_TELEMETRY_DISABLED: '1'
  });
  
  // Disable external services during testing
  process.env.DISABLE_SQUARE_WEBHOOKS = 'true';
  process.env.DISABLE_EMAIL_SENDING = 'true';
  process.env.SKIP_EXTERNAL_VALIDATIONS = 'true';

  const testEnv = TestEnvironment.getInstance();
  await testEnv.setupPrisma();
  
  console.log('✅ Test environment setup completed');
}

export async function cleanupTestEnvironment(): Promise<void> {
  console.log('🧹 Cleaning up test environment...');
  
  const testEnv = TestEnvironment.getInstance();
  await testEnv.cleanup();
  
  console.log('✅ Test environment cleanup completed');
} 