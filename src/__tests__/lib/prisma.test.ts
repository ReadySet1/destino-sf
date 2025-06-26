import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

// The global mock is already set up in jest.setup.js, so we just need to get references

describe('prisma.ts', () => {
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

  describe('Prisma Client Initialization', () => {
    test('should create a Prisma client instance', async () => {
      const { prisma } = await import('@/lib/db');
      
      expect(prisma).toBeDefined();
      expect(prisma.$connect).toBeDefined();
      expect(prisma.$disconnect).toBeDefined();
      expect(prisma.$transaction).toBeDefined();
    });

    test('should handle database operations', async () => {
      const { prisma } = await import('@/lib/db');
      
      // Test basic database method availability
      expect(typeof prisma.order.findMany).toBe('function');
      expect(typeof prisma.product.findMany).toBe('function');
      expect(typeof prisma.category.findMany).toBe('function');
    });

    test('should provide transaction capabilities', async () => {
      const { prisma } = await import('@/lib/db');
      
      // Mock transaction result
      const mockResult = { id: 'test-id' };
      (prisma.$transaction as jest.Mock).mockResolvedValue(mockResult);
      
      const transactionCallback = jest.fn().mockResolvedValue(mockResult);
      const result = await prisma.$transaction(transactionCallback);
      
      expect(result).toEqual(mockResult);
      expect(prisma.$transaction).toHaveBeenCalledWith(transactionCallback);
    });
  });

  describe('Connection Management', () => {
    test('should handle connection successfully', async () => {
      const { prisma } = await import('@/lib/db');
      
      await expect(prisma.$connect()).resolves.toBeUndefined();
      expect(prisma.$connect).toHaveBeenCalledTimes(1);
    });

    test('should handle disconnection successfully', async () => {
      const { prisma } = await import('@/lib/db');
      
      await expect(prisma.$disconnect()).resolves.toBeUndefined();
      expect(prisma.$disconnect).toHaveBeenCalledTimes(1);
    });

    test('should handle connection errors gracefully', async () => {
      const { prisma } = await import('@/lib/db');
      
      const connectionError = new Error('Connection failed');
      (prisma.$connect as jest.Mock).mockRejectedValueOnce(connectionError);
      
      await expect(prisma.$connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('Raw Query Execution', () => {
    test('should execute raw queries successfully', async () => {
      const { prisma } = await import('@/lib/db');
      
      const mockQueryResult = [{ count: 5 }];
      (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockQueryResult);
      
      const result = await prisma.$queryRaw`SELECT COUNT(*) as count FROM users`;
      
      expect(result).toEqual(mockQueryResult);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    test('should execute raw commands successfully', async () => {
      const { prisma } = await import('@/lib/db');
      
      const mockExecuteResult = 1;
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(mockExecuteResult);
      
      const result = await prisma.$executeRaw`UPDATE users SET active = true WHERE id = 1`;
      
      expect(result).toEqual(mockExecuteResult);
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    test('should handle raw query errors', async () => {
      const { prisma } = await import('@/lib/db');
      
      const queryError = new Error('Invalid SQL syntax');
      (prisma.$queryRaw as jest.Mock).mockRejectedValueOnce(queryError);
      
      await expect(
        prisma.$queryRaw`SELECT * FROM nonexistent_table`
      ).rejects.toThrow('Invalid SQL syntax');
    });
  });

  describe('Database Model Operations', () => {
    test('should provide all required database models', async () => {
      const { prisma } = await import('@/lib/db');
      
      // Test all major models are available
      expect(prisma.order).toBeDefined();
      expect(prisma.orderItem).toBeDefined();
      expect(prisma.product).toBeDefined();
      expect(prisma.category).toBeDefined();
      expect(prisma.spotlightPick).toBeDefined();
      expect(prisma.user).toBeDefined();
      expect(prisma.profile).toBeDefined();
      expect(prisma.cateringOrder).toBeDefined();
      expect(prisma.cateringOrderItem).toBeDefined();
      expect(prisma.cateringItem).toBeDefined();
      expect(prisma.cateringPackage).toBeDefined();
    });

    test('should handle model findMany operations', async () => {
      const { prisma } = await import('@/lib/db');
      
      const mockProducts = [
        { id: '1', name: 'Product 1', price: 10.99 },
        { id: '2', name: 'Product 2', price: 15.99 }
      ];
      
      (prisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);
      
      const products = await prisma.product.findMany();
      
      expect(products).toEqual(mockProducts);
      expect(prisma.product.findMany).toHaveBeenCalledTimes(1);
    });

    test('should handle model create operations', async () => {
      const { prisma } = await import('@/lib/db');
      
      const mockOrder = {
        id: 'order-123',
        customerName: 'John Doe',
        totalAmount: 25.98,
        status: 'PENDING'
      };
      
      (prisma.order.create as jest.Mock).mockResolvedValue(mockOrder);
      
      const order = await prisma.order.create({
        data: {
          customerName: 'John Doe',
          totalAmount: 25.98,
          status: 'PENDING'
        }
      });
      
      expect(order).toEqual(mockOrder);
      expect(prisma.order.create).toHaveBeenCalledTimes(1);
    });

    test('should handle model findUnique operations', async () => {
      const { prisma } = await import('@/lib/db');
      
      const mockOrder = {
        id: 'order-123',
        customerName: 'John Doe',
        status: 'PAID'
      };
      
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      
      const order = await prisma.order.findUnique({
        where: { id: 'order-123' }
      });
      
      expect(order).toEqual(mockOrder);
      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-123' }
      });
    });
  });

  describe('Environment Handling', () => {
    test('should work in development environment', async () => {
      setNodeEnv('development');
      
      delete require.cache[require.resolve('@/lib/db')];
      const { prisma } = await import('@/lib/db');
      
      expect(prisma).toBeDefined();
    });

    test('should work in production environment', async () => {
      setNodeEnv('production');
      
      delete require.cache[require.resolve('@/lib/db')];
      const { prisma } = await import('@/lib/db');
      
      expect(prisma).toBeDefined();
    });

    test('should work in test environment', async () => {
      setNodeEnv('test');
      
      delete require.cache[require.resolve('@/lib/db')];
      const { prisma } = await import('@/lib/db');
      
      expect(prisma).toBeDefined();
    });
  });
}); 