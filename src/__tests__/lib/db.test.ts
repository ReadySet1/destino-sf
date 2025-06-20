import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(),
}));

const MockPrismaClient = PrismaClient as jest.MockedClass<typeof PrismaClient>;

describe('db.ts', () => {
  let mockPrismaInstance: any;
  let originalEnv: string | undefined;
  let originalConsoleLog: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    
    // Store original values
    originalEnv = process.env.NODE_ENV;
    originalConsoleLog = console.log;
    
    // Mock console.log to capture logging calls
    console.log = jest.fn();
    
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
    // Restore original values
    if (originalEnv !== undefined) {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
    
    console.log = originalConsoleLog;
    
    // Clean up global state
    delete (globalThis as any).prisma;
  });

  const setNodeEnv = (value: string | undefined) => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  };

  describe('Database Client Initialization', () => {
    test('should create a new PrismaClient instance', async () => {
      const { db } = await import('@/lib/db');
      
      expect(MockPrismaClient).toHaveBeenCalledTimes(1);
      expect(db).toBeDefined();
      expect(db).toBe(mockPrismaInstance);
    });

    test('should configure logging for development environment', async () => {
      setNodeEnv('development');
      
      delete require.cache[require.resolve('@/lib/db')];
      const { db } = await import('@/lib/db');
      
      expect(MockPrismaClient).toHaveBeenCalledWith({
        log: ['query', 'error', 'warn'],
      });
      expect(db).toBeDefined();
    });

    test('should configure logging for production environment', async () => {
      setNodeEnv('production');
      
      delete require.cache[require.resolve('@/lib/db')];
      const { db } = await import('@/lib/db');
      
      expect(MockPrismaClient).toHaveBeenCalledWith({
        log: ['error'],
      });
      expect(db).toBeDefined();
    });

    test('should configure logging for test environment', async () => {
      setNodeEnv('test');
      
      delete require.cache[require.resolve('@/lib/db')];
      const { db } = await import('@/lib/db');
      
      expect(MockPrismaClient).toHaveBeenCalledWith({
        log: ['error'],
      });
      expect(db).toBeDefined();
    });

    test('should default to error-only logging for unknown environments', async () => {
      setNodeEnv('staging');
      
      delete require.cache[require.resolve('@/lib/db')];
      const { db } = await import('@/lib/db');
      
      expect(MockPrismaClient).toHaveBeenCalledWith({
        log: ['error'],
      });
      expect(db).toBeDefined();
    });

    test('should handle undefined NODE_ENV', async () => {
      setNodeEnv(undefined);
      
      delete require.cache[require.resolve('@/lib/db')];
      const { db } = await import('@/lib/db');
      
      expect(MockPrismaClient).toHaveBeenCalledWith({
        log: ['error'],
      });
      expect(db).toBeDefined();
    });
  });

  describe('Global State Management', () => {
    test('should reuse existing global Prisma instance in development', async () => {
      setNodeEnv('development');
      
      // First import
      delete require.cache[require.resolve('@/lib/db')];
      const { db: firstDb } = await import('@/lib/db');
      
      // Second import should reuse the same instance
      delete require.cache[require.resolve('@/lib/db')];
      const { db: secondDb } = await import('@/lib/db');
      
      expect(MockPrismaClient).toHaveBeenCalledTimes(1);
      expect(firstDb).toBe(secondDb);
      expect((globalThis as any).prisma).toBe(firstDb);
    });

    test('should reuse existing global Prisma instance in test', async () => {
      setNodeEnv('test');
      
      // First import
      delete require.cache[require.resolve('@/lib/db')];
      const { db: firstDb } = await import('@/lib/db');
      
      // Second import should reuse the same instance
      delete require.cache[require.resolve('@/lib/db')];
      const { db: secondDb } = await import('@/lib/db');
      
      expect(MockPrismaClient).toHaveBeenCalledTimes(1);
      expect(firstDb).toBe(secondDb);
      expect((globalThis as any).prisma).toBe(firstDb);
    });

    test('should not set global state in production', async () => {
      setNodeEnv('production');
      
      delete require.cache[require.resolve('@/lib/db')];
      delete (globalThis as any).prisma;
      
      const { db } = await import('@/lib/db');
      
      expect(db).toBeDefined();
      expect((globalThis as any).prisma).toBeUndefined();
    });

    test('should use existing global instance when available', async () => {
      setNodeEnv('development');
      
      // Set up an existing global instance
      const existingInstance = { mockInstance: 'existing' };
      (globalThis as any).prisma = existingInstance;
      
      delete require.cache[require.resolve('@/lib/db')];
      const { db } = await import('@/lib/db');
      
      expect(db).toBe(existingInstance);
      expect(MockPrismaClient).not.toHaveBeenCalled();
    });
  });

  describe('Database Operations', () => {
    test('should handle successful database connection', async () => {
      const { db } = await import('@/lib/db');
      
      await expect(db.$connect()).resolves.toBeUndefined();
      expect(mockPrismaInstance.$connect).toHaveBeenCalledTimes(1);
    });

    test('should handle database connection errors', async () => {
      const connectionError = new Error('Database connection failed');
      mockPrismaInstance.$connect.mockRejectedValue(connectionError);
      
      const { db } = await import('@/lib/db');
      
      await expect(db.$connect()).rejects.toThrow('Database connection failed');
      expect(mockPrismaInstance.$connect).toHaveBeenCalledTimes(1);
    });

    test('should handle successful database disconnection', async () => {
      const { db } = await import('@/lib/db');
      
      await expect(db.$disconnect()).resolves.toBeUndefined();
      expect(mockPrismaInstance.$disconnect).toHaveBeenCalledTimes(1);
    });

    test('should handle database disconnection errors', async () => {
      const disconnectionError = new Error('Database disconnection failed');
      mockPrismaInstance.$disconnect.mockRejectedValue(disconnectionError);
      
      const { db } = await import('@/lib/db');
      
      await expect(db.$disconnect()).rejects.toThrow('Database disconnection failed');
      expect(mockPrismaInstance.$disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Transaction Management', () => {
    test('should handle successful transactions', async () => {
      const mockTransactionResult = { success: true, data: 'test' };
      mockPrismaInstance.$transaction.mockResolvedValue(mockTransactionResult);
      
      const { db } = await import('@/lib/db');
      
      const transactionCallback = jest.fn().mockResolvedValue(mockTransactionResult);
      const result = await db.$transaction(transactionCallback);
      
      expect(result).toEqual(mockTransactionResult);
      expect(mockPrismaInstance.$transaction).toHaveBeenCalledWith(transactionCallback);
    });

    test('should handle transaction failures and rollbacks', async () => {
      const transactionError = new Error('Transaction failed');
      mockPrismaInstance.$transaction.mockRejectedValue(transactionError);
      
      const { db } = await import('@/lib/db');
      
      const transactionCallback = jest.fn().mockRejectedValue(transactionError);
      
      await expect(db.$transaction(transactionCallback)).rejects.toThrow('Transaction failed');
      expect(mockPrismaInstance.$transaction).toHaveBeenCalledWith(transactionCallback);
    });

    test('should handle transaction timeout errors', async () => {
      const timeoutError = new Error('Transaction timeout');
      timeoutError.name = 'TransactionTimeoutError';
      mockPrismaInstance.$transaction.mockRejectedValue(timeoutError);
      
      const { db } = await import('@/lib/db');
      
      const transactionCallback = jest.fn();
      
      await expect(db.$transaction(transactionCallback)).rejects.toThrow('Transaction timeout');
    });
  });

  describe('Raw Query Operations', () => {
    test('should execute raw queries successfully', async () => {
      const mockQueryResult = [{ id: 1, name: 'Test User' }];
      mockPrismaInstance.$queryRaw.mockResolvedValue(mockQueryResult);
      
      const { db } = await import('@/lib/db');
      
      const result = await db.$queryRaw`SELECT * FROM users WHERE id = 1`;
      
      expect(result).toEqual(mockQueryResult);
      expect(mockPrismaInstance.$queryRaw).toHaveBeenCalledTimes(1);
    });

    test('should execute raw commands successfully', async () => {
      const mockExecuteResult = 1;
      mockPrismaInstance.$executeRaw.mockResolvedValue(mockExecuteResult);
      
      const { db } = await import('@/lib/db');
      
      const result = await db.$executeRaw`UPDATE users SET name = 'Updated' WHERE id = 1`;
      
      expect(result).toEqual(mockExecuteResult);
      expect(mockPrismaInstance.$executeRaw).toHaveBeenCalledTimes(1);
    });

    test('should handle raw query errors', async () => {
      const queryError = new Error('SQL syntax error');
      mockPrismaInstance.$queryRaw.mockRejectedValue(queryError);
      
      const { db } = await import('@/lib/db');
      
      await expect(
        db.$queryRaw`SELECT * FROM nonexistent_table`
      ).rejects.toThrow('SQL syntax error');
    });

    test('should handle raw command errors', async () => {
      const commandError = new Error('Permission denied');
      mockPrismaInstance.$executeRaw.mockRejectedValue(commandError);
      
      const { db } = await import('@/lib/db');
      
      await expect(
        db.$executeRaw`DROP TABLE restricted_table`
      ).rejects.toThrow('Permission denied');
    });
  });

  describe('Error Scenarios', () => {
    test('should handle Prisma client initialization errors', () => {
      MockPrismaClient.mockImplementation(() => {
        throw new Error('Failed to initialize database client');
      });
      
      expect(() => {
        delete require.cache[require.resolve('@/lib/db')];
        require('@/lib/db');
      }).toThrow('Failed to initialize database client');
    });

    test('should handle database connection pool errors', async () => {
      const poolError = new Error('Connection pool exhausted');
      poolError.name = 'ConnectionPoolError';
      mockPrismaInstance.$connect.mockRejectedValue(poolError);
      
      const { db } = await import('@/lib/db');
      
      await expect(db.$connect()).rejects.toThrow('Connection pool exhausted');
    });

    test('should handle schema validation errors', async () => {
      const schemaError = new Error('Schema validation failed');
      schemaError.name = 'SchemaValidationError';
      mockPrismaInstance.$queryRaw.mockRejectedValue(schemaError);
      
      const { db } = await import('@/lib/db');
      
      await expect(
        db.$queryRaw`SELECT invalid_column FROM users`
      ).rejects.toThrow('Schema validation failed');
    });
  });

  describe('Logging Configuration', () => {
    test('should include query logging in development', async () => {
      setNodeEnv('development');
      
      delete require.cache[require.resolve('@/lib/db')];
      await import('@/lib/db');
      
      const logConfig = MockPrismaClient.mock.calls[0]?.[0];
      expect(logConfig).toBeDefined();
      expect(logConfig?.log).toContain('query');
      expect(logConfig?.log).toContain('error');
      expect(logConfig?.log).toContain('warn');
    });

    test('should only include error logging in production', async () => {
      setNodeEnv('production');
      
      delete require.cache[require.resolve('@/lib/db')];
      await import('@/lib/db');
      
      const logConfig = MockPrismaClient.mock.calls[0]?.[0];
      expect(logConfig).toBeDefined();
      expect(logConfig?.log).toEqual(['error']);
      expect(logConfig?.log).not.toContain('query');
      expect(logConfig?.log).not.toContain('warn');
    });

    test('should handle custom environment configurations', async () => {
      setNodeEnv('custom');
      
      delete require.cache[require.resolve('@/lib/db')];
      await import('@/lib/db');
      
      const logConfig = MockPrismaClient.mock.calls[0]?.[0];
      expect(logConfig).toBeDefined();
      expect(logConfig?.log).toEqual(['error']);
    });
  });
}); 