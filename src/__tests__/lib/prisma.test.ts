import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  })),
}));

const MockPrismaClient = PrismaClient as jest.MockedClass<typeof PrismaClient>;

describe('prisma.ts', () => {
  let mockPrismaInstance: any;
  let originalEnv: string | undefined;
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    
    // Store original NODE_ENV
    originalEnv = process.env.NODE_ENV;
    
    // Create a mock Prisma instance
    mockPrismaInstance = {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      $transaction: jest.fn(),
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn(),
    };
    
    MockPrismaClient.mockImplementation(() => mockPrismaInstance);
    
    // Clear global Prisma instance
    delete (globalThis as any).prisma;
  });

  afterEach(() => {
    // Restore original NODE_ENV
    if (originalEnv !== undefined) {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
    
    // Clean up global state
    delete (globalThis as any).prisma;
  });

  const setNodeEnv = (value: string) => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  };

  describe('Prisma Client Initialization', () => {
    test('should create a new PrismaClient instance', async () => {
      const { prisma } = await import('@/lib/db');
      
      expect(MockPrismaClient).toHaveBeenCalledTimes(1);
      expect(prisma).toBeDefined();
      expect(prisma).toBe(mockPrismaInstance);
    });

    test('should reuse existing global Prisma instance in development', async () => {
      // Set up NODE_ENV as development
      setNodeEnv('development');
      
      // First import
      delete require.cache[require.resolve('@/lib/db')];
      const { prisma: firstPrisma } = await import('@/lib/db');
      
      // Second import should reuse the same instance
      delete require.cache[require.resolve('@/lib/db')];
      const { prisma: secondPrisma } = await import('@/lib/db');
      
      expect(MockPrismaClient).toHaveBeenCalledTimes(1);
      expect(firstPrisma).toBe(secondPrisma);
    });

    test('should create new instances in production', async () => {
      setNodeEnv('production');
      
      // Clear module cache and global instance
      delete require.cache[require.resolve('@/lib/db')];
      delete (globalThis as any).prisma;
      
      // First import
      const { prisma: firstPrisma } = await import('@/lib/db');
      
      // Clear module cache but not global (simulating production behavior)
      delete require.cache[require.resolve('@/lib/db')];
      
      // Second import
      const { prisma: secondPrisma } = await import('@/lib/db');
      
      expect(MockPrismaClient).toHaveBeenCalledTimes(2);
      expect(firstPrisma).toBe(mockPrismaInstance);
      expect(secondPrisma).toBe(mockPrismaInstance);
    });
  });

  describe('Connection Management', () => {
    test('should handle connection successfully', async () => {
      const { prisma } = await import('@/lib/db');
      
      await expect(prisma.$connect()).resolves.toBeUndefined();
      expect(mockPrismaInstance.$connect).toHaveBeenCalledTimes(1);
    });

    test('should handle disconnection successfully', async () => {
      const { prisma } = await import('@/lib/db');
      
      await expect(prisma.$disconnect()).resolves.toBeUndefined();
      expect(mockPrismaInstance.$disconnect).toHaveBeenCalledTimes(1);
    });

    test('should handle connection errors gracefully', async () => {
      const connectionError = new Error('Connection failed');
      mockPrismaInstance.$connect.mockRejectedValue(connectionError);
      
      const { prisma } = await import('@/lib/db');
      
      await expect(prisma.$connect()).rejects.toThrow('Connection failed');
      expect(mockPrismaInstance.$connect).toHaveBeenCalledTimes(1);
    });

    test('should handle disconnection errors gracefully', async () => {
      const disconnectionError = new Error('Disconnection failed');
      mockPrismaInstance.$disconnect.mockRejectedValue(disconnectionError);
      
      const { prisma } = await import('@/lib/db');
      
      await expect(prisma.$disconnect()).rejects.toThrow('Disconnection failed');
      expect(mockPrismaInstance.$disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Transaction Handling', () => {
    test('should handle transactions successfully', async () => {
      const mockTransactionResult = { id: 'test-result' };
      mockPrismaInstance.$transaction.mockResolvedValue(mockTransactionResult);
      
      const { prisma } = await import('@/lib/db');
      
      const transactionCallback = jest.fn().mockResolvedValue(mockTransactionResult);
      const result = await prisma.$transaction(transactionCallback);
      
      expect(result).toEqual(mockTransactionResult);
      expect(mockPrismaInstance.$transaction).toHaveBeenCalledWith(transactionCallback);
    });

    test('should handle transaction rollbacks', async () => {
      const transactionError = new Error('Transaction failed');
      mockPrismaInstance.$transaction.mockRejectedValue(transactionError);
      
      const { prisma } = await import('@/lib/db');
      
      const transactionCallback = jest.fn().mockRejectedValue(transactionError);
      
      await expect(prisma.$transaction(transactionCallback)).rejects.toThrow('Transaction failed');
      expect(mockPrismaInstance.$transaction).toHaveBeenCalledWith(transactionCallback);
    });

    test('should handle transaction function calls', async () => {
      const { prisma } = await import('@/lib/db');
      
      // Mock a transaction function
      const mockTransactionFunction = jest.fn().mockResolvedValue({ success: true });
      mockPrismaInstance.$transaction.mockResolvedValue({ success: true });
      
      const result = await prisma.$transaction(mockTransactionFunction);
      
      expect(result).toEqual({ success: true });
      expect(mockPrismaInstance.$transaction).toHaveBeenCalledWith(mockTransactionFunction);
    });
  });

  describe('Raw Query Execution', () => {
    test('should execute raw queries successfully', async () => {
      const mockQueryResult = [{ count: 5 }];
      mockPrismaInstance.$queryRaw.mockResolvedValue(mockQueryResult);
      
      const { prisma } = await import('@/lib/db');
      
      const result = await prisma.$queryRaw`SELECT COUNT(*) as count FROM users`;
      
      expect(result).toEqual(mockQueryResult);
      expect(mockPrismaInstance.$queryRaw).toHaveBeenCalledTimes(1);
    });

    test('should execute raw commands successfully', async () => {
      const mockExecuteResult = 1;
      mockPrismaInstance.$executeRaw.mockResolvedValue(mockExecuteResult);
      
      const { prisma } = await import('@/lib/db');
      
      const result = await prisma.$executeRaw`UPDATE users SET active = true WHERE id = 1`;
      
      expect(result).toEqual(mockExecuteResult);
      expect(mockPrismaInstance.$executeRaw).toHaveBeenCalledTimes(1);
    });

    test('should handle raw query errors', async () => {
      const queryError = new Error('Invalid SQL syntax');
      mockPrismaInstance.$queryRaw.mockRejectedValue(queryError);
      
      const { prisma } = await import('@/lib/db');
      
      await expect(
        prisma.$queryRaw`SELECT * FROM nonexistent_table`
      ).rejects.toThrow('Invalid SQL syntax');
    });
  });

  describe('Error Scenarios', () => {
    test('should handle Prisma client initialization errors', () => {
      MockPrismaClient.mockImplementation(() => {
        throw new Error('Failed to initialize Prisma client');
      });
      
      expect(() => {
        delete require.cache[require.resolve('@/lib/db')];
        require('@/lib/db');
      }).toThrow('Failed to initialize Prisma client');
    });

    test('should handle database connection timeout', async () => {
      const timeoutError = new Error('Connection timeout');
      timeoutError.name = 'ConnectTimeoutError';
      mockPrismaInstance.$connect.mockRejectedValue(timeoutError);
      
      const { prisma } = await import('@/lib/db');
      
      await expect(prisma.$connect()).rejects.toThrow('Connection timeout');
    });

    test('should handle database unavailable errors', async () => {
      const unavailableError = new Error('Database unavailable');
      unavailableError.name = 'DatabaseUnavailableError';
      mockPrismaInstance.$connect.mockRejectedValue(unavailableError);
      
      const { prisma } = await import('@/lib/db');
      
      await expect(prisma.$connect()).rejects.toThrow('Database unavailable');
    });
  });

  describe('Global State Management', () => {
    test('should properly set global prisma in development', async () => {
      setNodeEnv('development');
      
      delete require.cache[require.resolve('@/lib/db')];
      delete (globalThis as any).prisma;
      
      const { prisma } = await import('@/lib/db');
      
      expect((globalThis as any).prisma).toBe(prisma);
    });

    test('should not set global prisma in production', async () => {
      setNodeEnv('production');
      
      delete require.cache[require.resolve('@/lib/db')];
      delete (globalThis as any).prisma;
      
      await import('@/lib/db');
      
      expect((globalThis as any).prisma).toBeUndefined();
    });

    test('should handle test environment properly', async () => {
      setNodeEnv('test');
      
      delete require.cache[require.resolve('@/lib/db')];
      delete (globalThis as any).prisma;
      
      const { prisma } = await import('@/lib/db');
      
      expect((globalThis as any).prisma).toBe(prisma);
    });
  });

  describe('Environment-Specific Behavior', () => {
    test('should use development configuration', async () => {
      setNodeEnv('development');
      
      delete require.cache[require.resolve('@/lib/db')];
      const { prisma } = await import('@/lib/db');
      
      expect(prisma).toBeDefined();
      expect(MockPrismaClient).toHaveBeenCalledWith();
    });

    test('should use production configuration', async () => {
      setNodeEnv('production');
      
      delete require.cache[require.resolve('@/lib/db')];
      const { prisma } = await import('@/lib/db');
      
      expect(prisma).toBeDefined();
      expect(MockPrismaClient).toHaveBeenCalledWith();
    });

    test('should handle undefined NODE_ENV', async () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: undefined,
        writable: true,
        enumerable: true,
        configurable: true,
      });
      
      delete require.cache[require.resolve('@/lib/db')];
      const { prisma } = await import('@/lib/db');
      
      expect(prisma).toBeDefined();
      expect(MockPrismaClient).toHaveBeenCalledWith();
    });
  });
}); 