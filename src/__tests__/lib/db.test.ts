import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

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
    test('should create a database client instance', async () => {
      const { db, prisma } = await import('@/lib/db');
      
      expect(db).toBeDefined();
      expect(prisma).toBeDefined();
      expect(db).toBe(prisma); // They should be the same instance
    });

    test('should provide database connection methods', async () => {
      const { db } = await import('@/lib/db');
      
      expect(db.$connect).toBeDefined();
      expect(db.$disconnect).toBeDefined();
      expect(db.$transaction).toBeDefined();
      expect(typeof db.$connect).toBe('function');
      expect(typeof db.$disconnect).toBe('function');
      expect(typeof db.$transaction).toBe('function');
    });

    test('should provide all database models', async () => {
      const { db } = await import('@/lib/db');
      
      // Test all major models are available
      expect(db.order).toBeDefined();
      expect(db.orderItem).toBeDefined();
      expect(db.product).toBeDefined();
      expect(db.category).toBeDefined();
      expect(db.spotlightPick).toBeDefined();
      expect(db.user).toBeDefined();
      expect(db.cateringOrder).toBeDefined();
      expect(db.cateringOrderItem).toBeDefined();
      expect(db.cateringItem).toBeDefined();
      expect(db.cateringPackage).toBeDefined();
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
      const { db } = await import('@/lib/db');
      
      const mockProducts = [
        { id: '1', name: 'Product 1', price: 10.99 },
        { id: '2', name: 'Product 2', price: 15.99 }
      ];
      
      (db.product.findMany as jest.Mock).mockResolvedValue(mockProducts);
      
      const products = await db.product.findMany();
      
      expect(products).toEqual(mockProducts);
      expect(db.product.findMany).toHaveBeenCalledTimes(1);
    });

    test('should handle model create operations', async () => {
      const { db } = await import('@/lib/db');
      
      const mockOrder = {
        id: 'order-123',
        customerName: 'John Doe',
        status: 'PENDING'
      };
      
      (db.order.create as jest.Mock).mockResolvedValue(mockOrder);
      
      const order = await db.order.create({
        data: {
          customerName: 'John Doe',
          status: 'PENDING'
        }
      });
      
      expect(order).toEqual(mockOrder);
      expect(db.order.create).toHaveBeenCalledTimes(1);
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