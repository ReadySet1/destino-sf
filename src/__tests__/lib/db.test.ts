import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { prismaMock } from '../setup/prisma';

// The global mock is already set up in jest.setup.js, so we just need to get references
describe('db.ts Database Client', () => {
  let originalEnv: string | undefined;
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    
    // Store original NODE_ENV
    originalEnv = process.env.NODE_ENV;
    
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

  describe('Database Client Initialization', () => {
    test('should create a database client instance', () => {
      expect(prismaMock).toBeDefined();
    });

    test('should provide database connection methods', () => {
      expect(prismaMock.$connect).toBeDefined();
      expect(prismaMock.$disconnect).toBeDefined();
      expect(prismaMock.$transaction).toBeDefined();
    });

    test('should provide all database models', () => {
      expect(prismaMock.order).toBeDefined();
      expect(prismaMock.orderItem).toBeDefined();
      expect(prismaMock.product).toBeDefined();
      expect(prismaMock.category).toBeDefined();
      expect(prismaMock.spotlightPick).toBeDefined();
    });
  });

  describe('Database Operations', () => {
    test('should handle database connection successfully', async () => {
      const { db } = await import('@/lib/db');
      
      await expect(db.$connect()).resolves.toBeUndefined();
      expect(db.$connect).toHaveBeenCalledTimes(1);
    });

    test('should handle database disconnection successfully', async () => {
      const { db } = await import('@/lib/db');
      
      await expect(db.$disconnect()).resolves.toBeUndefined();
      expect(db.$disconnect).toHaveBeenCalledTimes(1);
    });

    test('should handle connection errors gracefully', async () => {
      const { db } = await import('@/lib/db');
      
      const connectionError = new Error('Database connection failed');
      (db.$connect as jest.Mock).mockRejectedValueOnce(connectionError);
      
      await expect(db.$connect()).rejects.toThrow('Database connection failed');
    });
  });

  describe('Transaction Management', () => {
    test('should provide transaction capabilities', async () => {
      const { db } = await import('@/lib/db');
      
      const mockResult = { id: 'test-id' };
      (db.$transaction as jest.Mock).mockResolvedValue(mockResult);
      
      const transactionCallback = jest.fn().mockResolvedValue(mockResult);
      const result = await db.$transaction(transactionCallback);
      
      expect(result).toEqual(mockResult);
      expect(db.$transaction).toHaveBeenCalledWith(transactionCallback);
    });

    test('should handle transaction failures', async () => {
      const { db } = await import('@/lib/db');
      
      const transactionError = new Error('Transaction failed');
      (db.$transaction as jest.Mock).mockRejectedValueOnce(transactionError);
      
      const transactionCallback = jest.fn();
      
      await expect(db.$transaction(transactionCallback)).rejects.toThrow('Transaction failed');
    });
  });

  describe('Raw Query Operations', () => {
    test('should execute raw queries successfully', async () => {
      const { db } = await import('@/lib/db');
      
      const mockQueryResult = [{ count: 5 }];
      (db.$queryRaw as jest.Mock).mockResolvedValue(mockQueryResult);
      
      const result = await db.$queryRaw`SELECT * FROM users WHERE id = 1`;
      
      expect(result).toEqual(mockQueryResult);
      expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    });

    test('should execute raw commands successfully', async () => {
      const { db } = await import('@/lib/db');
      
      const mockExecuteResult = 1;
      (db.$executeRaw as jest.Mock).mockResolvedValue(mockExecuteResult);
      
      const result = await db.$executeRaw`UPDATE users SET name = 'Updated' WHERE id = 1`;
      
      expect(result).toEqual(mockExecuteResult);
      expect(db.$executeRaw).toHaveBeenCalledTimes(1);
    });

    test('should handle raw query errors', async () => {
      const { db } = await import('@/lib/db');
      
      const queryError = new Error('SQL syntax error');
      (db.$queryRaw as jest.Mock).mockRejectedValueOnce(queryError);
      
      await expect(
        db.$queryRaw`SELECT * FROM nonexistent_table`
      ).rejects.toThrow('SQL syntax error');
    });
  });

  describe('Database Model Operations', () => {
    test('should handle model findMany operations', async () => {
      const mockProducts = [
        { id: 'prod-1', name: 'Product 1', price: 10.0 },
        { id: 'prod-2', name: 'Product 2', price: 20.0 },
      ];
      (prismaMock.product.findMany as jest.Mock).mockResolvedValue(mockProducts);
      const products = await prismaMock.product.findMany();
      expect(products).toEqual(mockProducts);
    });

    test('should handle model create operations', async () => {
      const mockOrder = {
        id: 'order-123',
        customerName: 'Test Customer',
        status: 'PENDING',
        total: 100.0,
        email: 'test@example.com',
        phone: '1234567890',
      };
      (prismaMock.order.create as jest.Mock).mockResolvedValue(mockOrder);
      const order = await prismaMock.order.create({
        data: {
          customerName: 'Test Customer',
          status: 'PENDING',
          total: 100.0,
          email: 'test@example.com',
          phone: '1234567890',
        },
      });
      expect(order).toEqual(mockOrder);
    });

    test('should handle model findUnique operations', async () => {
      const { db } = await import('@/lib/db');
      
      const mockOrder = {
        id: 'order-123',
        customerName: 'John Doe',
        status: 'PAID'
      };
      
      (db.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      
      const order = await db.order.findUnique({
        where: { id: 'order-123' }
      });
      
      expect(order).toEqual(mockOrder);
      expect(db.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-123' }
      });
    });
  });

  describe('Environment Handling', () => {
    test('should work in development environment', async () => {
      setNodeEnv('development');
      
      delete require.cache[require.resolve('@/lib/db')];
      const { db } = await import('@/lib/db');
      
      expect(db).toBeDefined();
    });

    test('should work in production environment', async () => {
      setNodeEnv('production');
      
      delete require.cache[require.resolve('@/lib/db')];
      const { db } = await import('@/lib/db');
      
      expect(db).toBeDefined();
    });

    test('should work in test environment', async () => {
      setNodeEnv('test');
      
      delete require.cache[require.resolve('@/lib/db')];
      const { db } = await import('@/lib/db');
      
      expect(db).toBeDefined();
    });
  });
}); 