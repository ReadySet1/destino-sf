/**
 * Database Integration Tests
 * Tests database operations with transaction isolation
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import {
  initTestDb,
  startTransaction,
  rollbackTransaction,
  cleanupTestDb,
  countRecords,
  recordExists,
} from '../setup/db-test-utils';
import {
  userFactory,
  productFactory,
  orderFactory,
  createCompleteOrder,
  createUserWithOrders,
  createAdminUser,
} from '../factories';

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    initTestDb();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  // Each test runs in its own transaction and rolls back
  beforeEach(async () => {
    await startTransaction();
  });

  afterEach(async () => {
    await rollbackTransaction();
  });

  describe('User Factory', () => {
    test('should create a user with default values', async () => {
      const user = await userFactory.create();

      expect(user.id).toBeDefined();
      expect(user.email).toMatch(/@/);
      expect(user.firstName).toBeTruthy();
      expect(user.lastName).toBeTruthy();
      expect(user.role).toBe('CUSTOMER');
    });

    test('should create a user with overrides', async () => {
      const user = await userFactory.create({
        email: 'custom@example.com',
        firstName: 'Custom',
        role: 'ADMIN',
      });

      expect(user.email).toBe('custom@example.com');
      expect(user.firstName).toBe('Custom');
      expect(user.role).toBe('ADMIN');
    });

    test('should create multiple users', async () => {
      const users = await userFactory.createMany(3);

      expect(users).toHaveLength(3);
      expect(users[0].id).not.toBe(users[1].id);
    });

    test('should create admin user', async () => {
      const admin = await createAdminUser();

      expect(admin.role).toBe('ADMIN');
    });
  });

  describe('Product Factory', () => {
    test('should create a product', async () => {
      const product = await productFactory.create();

      expect(product.id).toBeDefined();
      expect(product.name).toBeTruthy();
      expect(product.price).toBeGreaterThan(0);
      expect(product.category).toMatch(/EMPANADAS|ALFAJORES|CATERING/);
    });

    test('should create product with specific category', async () => {
      const empanada = await productFactory.create({ category: 'EMPANADAS' });
      const alfajor = await productFactory.create({ category: 'ALFAJORES' });

      expect(empanada.category).toBe('EMPANADAS');
      expect(alfajor.category).toBe('ALFAJORES');
    });

    test('should create unavailable product', async () => {
      const product = await productFactory.create({ isAvailable: false });

      expect(product.isAvailable).toBe(false);
    });
  });

  describe('Order Factory', () => {
    test('should create an order', async () => {
      const order = await orderFactory.create();

      expect(order.id).toBeDefined();
      expect(order.email).toMatch(/@/);
      expect(order.total).toBeGreaterThan(0);
      expect(order.status).toBe('PENDING');
    });

    test('should create order with user association', async () => {
      const user = await userFactory.create();
      const order = await orderFactory.create({ userId: user.id });

      expect(order.userId).toBe(user.id);
    });

    test('should calculate tax correctly', async () => {
      const subtotal = 100;
      const expectedTax = 8.25; // SF tax rate 8.25%
      const expectedTotal = 108.25;

      const order = await orderFactory.create({
        subtotal,
        tax: expectedTax,
        total: expectedTotal,
      });

      expect(order.subtotal).toBe(subtotal);
      expect(order.tax).toBe(expectedTax);
      expect(order.total).toBe(expectedTotal);
    });
  });

  describe('Complete Order Creation', () => {
    test('should create complete order with products', async () => {
      const result = await createCompleteOrder({ productCount: 3 });

      expect(result.order).toBeDefined();
      expect(result.products).toHaveLength(3);
      expect(result.orderItems).toHaveLength(3);

      // Verify totals match
      const expectedSubtotal = result.products.reduce((sum, p) => sum + p.price, 0);
      expect(result.order.subtotal).toBeCloseTo(expectedSubtotal, 2);
    });

    test('should create order with specific user', async () => {
      const user = await userFactory.create();
      const result = await createCompleteOrder({ userId: user.id });

      expect(result.order.userId).toBe(user.id);
    });
  });

  describe('User with Orders', () => {
    test('should create user with multiple orders', async () => {
      const result = await createUserWithOrders(3);

      expect(result.user).toBeDefined();
      expect(result.orders).toHaveLength(3);
      expect(result.orders[0].userId).toBe(result.user.id);
    });
  });

  describe('Transaction Isolation', () => {
    test('should rollback changes after test', async () => {
      // Create a user in this test
      const user = await userFactory.create({ email: 'will-be-rolled-back@example.com' });
      expect(user.id).toBeDefined();

      // The user exists within this transaction
      const exists = await recordExists('profile', { email: 'will-be-rolled-back@example.com' });
      expect(exists).toBe(true);

      // After this test completes, the transaction will rollback
      // and the user will not exist in the database
    });

    test('should not see data from previous test', async () => {
      // This test should not see the user created in the previous test
      const exists = await recordExists('profile', { email: 'will-be-rolled-back@example.com' });
      expect(exists).toBe(false);
    });
  });

  describe('Database Queries', () => {
    test('should count records', async () => {
      await userFactory.createMany(5);

      const count = await countRecords('profile');
      expect(count).toBeGreaterThanOrEqual(5);
    });

    test('should check record existence', async () => {
      const product = await productFactory.create({ name: 'Unique Product Name' });

      const exists = await recordExists('product', { name: 'Unique Product Name' });
      expect(exists).toBe(true);

      const notExists = await recordExists('product', { name: 'Non-existent Product' });
      expect(notExists).toBe(false);
    });
  });

  describe('Complex Scenarios', () => {
    test('should handle complete purchase flow', async () => {
      // 1. Create products
      const empanadas = await productFactory.createMany(3, { category: 'EMPANADAS' });
      const alfajores = await productFactory.createMany(2, { category: 'ALFAJORES' });

      // 2. Create customer
      const customer = await userFactory.create();

      // 3. Create order with items
      const orderResult = await createCompleteOrder({
        userId: customer.id,
        productCount: 2,
      });

      // 4. Verify order was created correctly
      expect(orderResult.order.userId).toBe(customer.id);
      expect(orderResult.order.status).toBe('PENDING');
      expect(orderResult.orderItems.length).toBeGreaterThan(0);

      // 5. Update order status (simulating payment)
      const db = initTestDb();
      const updatedOrder = await db.order.update({
        where: { id: orderResult.order.id },
        data: {
          status: 'PROCESSING',
          paymentStatus: 'PAID',
        },
      });

      expect(updatedOrder.status).toBe('PROCESSING');
      expect(updatedOrder.paymentStatus).toBe('PAID');
    });

    test('should handle order cancellation', async () => {
      const orderResult = await createCompleteOrder();

      const db = initTestDb();
      const cancelledOrder = await db.order.update({
        where: { id: orderResult.order.id },
        data: {
          status: 'CANCELLED',
        },
      });

      expect(cancelledOrder.status).toBe('CANCELLED');
    });

    test('should handle refund scenario', async () => {
      const orderResult = await createCompleteOrder();

      const db = initTestDb();

      // First mark as paid
      await db.order.update({
        where: { id: orderResult.order.id },
        data: {
          paymentStatus: 'PAID',
        },
      });

      // Then refund
      const refundedOrder = await db.order.update({
        where: { id: orderResult.order.id },
        data: {
          paymentStatus: 'REFUNDED',
          status: 'CANCELLED',
        },
      });

      expect(refundedOrder.paymentStatus).toBe('REFUNDED');
      expect(refundedOrder.status).toBe('CANCELLED');
    });
  });

  describe('Data Validation', () => {
    test('should enforce unique email constraint', async () => {
      const user1 = await userFactory.create({ email: 'unique@example.com' });

      // Attempting to create another user with the same email should fail
      await expect(userFactory.create({ email: 'unique@example.com' })).rejects.toThrow();
    });

    test('should handle product price validation', async () => {
      const product = await productFactory.create({ price: 0.01 });
      expect(product.price).toBeGreaterThan(0);

      // Negative prices should be rejected by business logic
      // (This would typically be validated at the application level)
    });

    test('should validate order totals', async () => {
      const order = await orderFactory.create({
        subtotal: 100,
        tax: 8.25,
        total: 108.25,
      });

      // Verify the math is correct
      expect(order.subtotal + order.tax).toBeCloseTo(order.total, 2);
    });
  });

  describe('Edge Cases', () => {
    test('should handle orders without user association', async () => {
      const order = await orderFactory.create({ userId: undefined });
      expect(order.userId).toBeNull();
    });

    test('should handle empty order items', async () => {
      const order = await orderFactory.create();

      const db = initTestDb();
      const orderWithItems = await db.order.findUnique({
        where: { id: order.id },
        include: { items: true },
      });

      expect(orderWithItems?.items).toHaveLength(0);
    });

    test('should handle large quantity orders', async () => {
      const result = await createCompleteOrder({ productCount: 10 });
      expect(result.orderItems).toHaveLength(10);
    });
  });
});
