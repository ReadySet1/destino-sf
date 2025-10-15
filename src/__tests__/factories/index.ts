/**
 * Test Data Factories
 * Centralized factory functions for creating test data
 *
 * Usage:
 *   const user = await createTestUser();
 *   const order = await createTestOrder({ userId: user.id });
 */

import { faker } from '@faker-js/faker';
import { getTestDb } from '../setup/db-test-utils';

/**
 * Factory options for creating test data
 */
export interface FactoryOptions<T = any> {
  /**
   * Override default values
   */
  overrides?: Partial<T>;

  /**
   * If true, create the record in the database
   * If false, just return the data object
   */
  persist?: boolean;
}

/**
 * Base factory class for creating test data
 */
abstract class Factory<T> {
  /**
   * Generate default data for this factory
   */
  abstract defaults(): Partial<T>;

  /**
   * Build an instance without persisting to database
   */
  build(overrides: Partial<T> = {}): T {
    return {
      ...this.defaults(),
      ...overrides,
    } as T;
  }

  /**
   * Create an instance and persist to database
   */
  abstract create(overrides?: Partial<T>): Promise<T>;

  /**
   * Create multiple instances
   */
  async createMany(count: number, overrides: Partial<T> = {}): Promise<T[]> {
    const instances: T[] = [];
    for (let i = 0; i < count; i++) {
      instances.push(await this.create(overrides));
    }
    return instances;
  }
}

// ============================================================================
// User Factory
// ============================================================================

export interface TestUser {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: 'CUSTOMER' | 'ADMIN';
}

export class UserFactory extends Factory<TestUser> {
  defaults(): Partial<TestUser> {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    return {
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      firstName,
      lastName,
      phone: faker.phone.number(),
      role: 'CUSTOMER',
    };
  }

  async create(overrides: Partial<TestUser> = {}): Promise<TestUser> {
    const db = getTestDb();
    const data = this.build(overrides);

    const user = await db.profile.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        role: data.role || 'CUSTOMER',
      },
    });

    return user as TestUser;
  }
}

// ============================================================================
// Product Factory
// ============================================================================

export interface TestProduct {
  id?: string;
  name: string;
  description: string;
  price: number;
  category: 'EMPANADAS' | 'ALFAJORES' | 'CATERING';
  isAvailable?: boolean;
  stock?: number;
  imageUrl?: string;
}

export class ProductFactory extends Factory<TestProduct> {
  defaults(): Partial<TestProduct> {
    const categories = ['EMPANADAS', 'ALFAJORES', 'CATERING'] as const;
    const category = faker.helpers.arrayElement(categories);

    return {
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      price: parseFloat(faker.commerce.price({ min: 10, max: 50 })),
      category,
      isAvailable: true,
      stock: faker.number.int({ min: 0, max: 100 }),
      imageUrl: faker.image.url(),
    };
  }

  async create(overrides: Partial<TestProduct> = {}): Promise<TestProduct> {
    const db = getTestDb();
    const data = this.build(overrides);

    const product = await db.product.create({
      data: {
        name: data.name,
        description: data.description || '',
        price: data.price,
        category: data.category,
        isAvailable: data.isAvailable ?? true,
        imageUrl: data.imageUrl || null,
      },
    });

    return product as TestProduct;
  }
}

// ============================================================================
// Order Factory
// ============================================================================

export interface TestOrder {
  id?: string;
  userId?: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  fulfillmentType?: 'PICKUP' | 'DELIVERY' | 'SHIPPING';
  subtotal: number;
  tax: number;
  total: number;
}

export class OrderFactory extends Factory<TestOrder> {
  defaults(): Partial<TestOrder> {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const subtotal = parseFloat(faker.commerce.price({ min: 20, max: 200 }));
    const tax = subtotal * 0.0825; // SF tax rate
    const total = subtotal + tax;

    return {
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      firstName,
      lastName,
      phone: faker.phone.number(),
      status: 'PENDING',
      paymentStatus: 'PENDING',
      fulfillmentType: 'PICKUP',
      subtotal,
      tax,
      total,
    };
  }

  async create(overrides: Partial<TestOrder> = {}): Promise<TestOrder> {
    const db = getTestDb();
    const data = this.build(overrides);

    const order = await db.order.create({
      data: {
        userId: data.userId || null,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        status: data.status || 'PENDING',
        paymentStatus: data.paymentStatus || 'PENDING',
        fulfillmentType: data.fulfillmentType || 'PICKUP',
        subtotal: data.subtotal,
        tax: data.tax,
        total: data.total,
      },
    });

    return order as TestOrder;
  }
}

// ============================================================================
// Order Item Factory
// ============================================================================

export interface TestOrderItem {
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  total: number;
}

export class OrderItemFactory extends Factory<TestOrderItem> {
  defaults(): Partial<TestOrderItem> {
    const quantity = faker.number.int({ min: 1, max: 5 });
    const price = parseFloat(faker.commerce.price({ min: 10, max: 50 }));
    const total = quantity * price;

    return {
      quantity,
      price,
      total,
    };
  }

  async create(overrides: Partial<TestOrderItem> = {}): Promise<TestOrderItem> {
    const db = getTestDb();

    if (!overrides.orderId || !overrides.productId) {
      throw new Error('OrderItemFactory requires orderId and productId');
    }

    const data = this.build(overrides);

    const orderItem = await db.orderItem.create({
      data: {
        orderId: data.orderId!,
        productId: data.productId!,
        quantity: data.quantity,
        price: data.price,
        total: data.total,
      },
    });

    return orderItem as TestOrderItem;
  }
}

// ============================================================================
// Catering Order Factory
// ============================================================================

export interface TestCateringOrder {
  id?: string;
  userId?: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  eventDate: Date;
  eventTime: string;
  numberOfPeople: number;
  deliveryZone?: string;
  status?: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  subtotal: number;
  tax: number;
  total: number;
}

export class CateringOrderFactory extends Factory<TestCateringOrder> {
  defaults(): Partial<TestCateringOrder> {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const numberOfPeople = faker.number.int({ min: 10, max: 100 });
    const subtotal = numberOfPeople * 15; // $15 per person estimate
    const tax = subtotal * 0.0825;
    const total = subtotal + tax;

    return {
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      firstName,
      lastName,
      phone: faker.phone.number(),
      eventDate: faker.date.future(),
      eventTime: '12:00 PM',
      numberOfPeople,
      deliveryZone: faker.helpers.arrayElement(['SF', 'PENINSULA', 'SOUTH_BAY']),
      status: 'PENDING',
      subtotal,
      tax,
      total,
    };
  }

  async create(overrides: Partial<TestCateringOrder> = {}): Promise<TestCateringOrder> {
    const db = getTestDb();
    const data = this.build(overrides);

    const cateringOrder = await db.cateringOrder.create({
      data: {
        userId: data.userId || null,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        eventDate: data.eventDate!,
        eventTime: data.eventTime!,
        numberOfPeople: data.numberOfPeople!,
        deliveryZone: data.deliveryZone || null,
        status: data.status || 'PENDING',
        subtotal: data.subtotal!,
        tax: data.tax!,
        total: data.total!,
      },
    });

    return cateringOrder as TestCateringOrder;
  }
}

// ============================================================================
// Factory Exports (Singleton Instances)
// ============================================================================

export const userFactory = new UserFactory();
export const productFactory = new ProductFactory();
export const orderFactory = new OrderFactory();
export const orderItemFactory = new OrderItemFactory();
export const cateringOrderFactory = new CateringOrderFactory();

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create a complete order with items
 */
export async function createCompleteOrder(
  options: {
    userId?: string;
    productCount?: number;
    orderOverrides?: Partial<TestOrder>;
    productOverrides?: Partial<TestProduct>;
  } = {}
) {
  const { userId, productCount = 2, orderOverrides = {}, productOverrides = {} } = options;

  // Create products
  const products = await productFactory.createMany(productCount, productOverrides);

  // Calculate order totals
  const subtotal = products.reduce((sum, p) => sum + p.price, 0);
  const tax = subtotal * 0.0825;
  const total = subtotal + tax;

  // Create order
  const order = await orderFactory.create({
    userId,
    subtotal,
    tax,
    total,
    ...orderOverrides,
  });

  // Create order items
  const orderItems = await Promise.all(
    products.map(product =>
      orderItemFactory.create({
        orderId: order.id!,
        productId: product.id!,
        quantity: 1,
        price: product.price,
        total: product.price,
      })
    )
  );

  return {
    order,
    products,
    orderItems,
  };
}

/**
 * Create a test user with orders
 */
export async function createUserWithOrders(orderCount = 2) {
  const user = await userFactory.create();

  const orders = await Promise.all(
    Array.from({ length: orderCount }, () => orderFactory.create({ userId: user.id }))
  );

  return {
    user,
    orders,
  };
}

/**
 * Create admin user
 */
export async function createAdminUser(overrides: Partial<TestUser> = {}) {
  return userFactory.create({
    role: 'ADMIN',
    ...overrides,
  });
}

/**
 * Seed database with realistic test data
 */
export async function seedTestDatabase() {
  // Create admin user
  const admin = await createAdminUser({
    email: 'admin@test.com',
    firstName: 'Admin',
    lastName: 'User',
  });

  // Create regular users
  const users = await userFactory.createMany(5);

  // Create products
  const empanadas = await productFactory.createMany(5, { category: 'EMPANADAS' });
  const alfajores = await productFactory.createMany(5, { category: 'ALFAJORES' });
  const catering = await productFactory.createMany(3, { category: 'CATERING' });

  // Create orders for some users
  const orders = await Promise.all(
    users.slice(0, 3).map(user => createCompleteOrder({ userId: user.id }))
  );

  // Create catering orders
  const cateringOrders = await cateringOrderFactory.createMany(3);

  return {
    admin,
    users,
    products: {
      empanadas,
      alfajores,
      catering,
    },
    orders,
    cateringOrders,
  };
}
