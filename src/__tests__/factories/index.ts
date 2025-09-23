/**
 * 🏭 Test Data Factories
 * Provides consistent test data generation across test suites
 */

import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

export interface CreateMockUserOptions {
  id?: string;
  email?: string;
  name?: string;
  role?: 'CUSTOMER' | 'ADMIN';
}

export interface CreateMockProductOptions {
  id?: string;
  squareId?: string;
  name?: string;
  price?: number;
  categoryId?: string;
  active?: boolean;
  featured?: boolean;
}

export interface CreateMockOrderOptions {
  id?: string;
  userId?: string;
  status?: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  total?: number;
}

/**
 * Create a mock user profile
 */
export async function createMockUser(
  prisma: PrismaClient,
  options: CreateMockUserOptions = {}
) {
  const userData = {
    id: options.id || faker.string.uuid(),
    email: options.email || faker.internet.email(),
    name: options.name || faker.person.fullName(),
    role: options.role || 'CUSTOMER' as const,
  };

  return await prisma.profile.create({
    data: userData,
  });
}

/**
 * Create a mock category
 */
export async function createMockCategory(
  prisma: PrismaClient,
  options: { id?: string; name?: string; slug?: string } = {}
) {
  const name = options.name || faker.commerce.department();
  const slug = options.slug || name.toLowerCase().replace(/\s+/g, '-');

  return await prisma.category.create({
    data: {
      id: options.id || faker.string.uuid(),
      name,
      slug,
      active: true,
      ordinal: BigInt(faker.number.int({ min: 1, max: 100 })),
    },
  });
}

/**
 * Create a mock product
 */
export async function createMockProduct(
  prisma: PrismaClient,
  options: CreateMockProductOptions = {}
) {
  // Create category if categoryId not provided
  let categoryId = options.categoryId;
  if (!categoryId) {
    const category = await createMockCategory(prisma);
    categoryId = category.id;
  }

  const name = options.name || faker.commerce.productName();
  const slug = name.toLowerCase().replace(/\s+/g, '-');

  return await prisma.product.create({
    data: {
      id: options.id || faker.string.uuid(),
      squareId: options.squareId || faker.string.uuid(),
      name,
      description: faker.commerce.productDescription(),
      price: options.price || faker.number.float({ min: 5, max: 100, fractionDigits: 2 }),
      images: [faker.image.url()],
      categoryId,
      featured: options.featured || false,
      active: options.active !== false, // Default to true unless explicitly false
      slug,
    },
    include: {
      category: true,
    },
  });
}

/**
 * Create a mock order
 */
export async function createMockOrder(
  prisma: PrismaClient,
  options: CreateMockOrderOptions = {}
) {
  // Create user if userId not provided
  let userId = options.userId;
  if (!userId) {
    const user = await createMockUser(prisma);
    userId = user.id;
  }

  return await prisma.order.create({
    data: {
      id: options.id || faker.string.uuid(),
      squareOrderId: faker.string.uuid(),
      status: options.status || 'PENDING',
      total: options.total || faker.number.float({ min: 10, max: 500, fractionDigits: 2 }),
      userId,
      customerName: faker.person.fullName(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      fulfillment_type: 'PICKUP',
      paymentStatus: 'PENDING',
      paymentMethod: 'CREDIT_CARD',
    },
    include: {
      user: true,
    },
  });
}

/**
 * Create mock order items
 */
export async function createMockOrderItems(
  prisma: PrismaClient,
  orderId: string,
  productIds: string[],
  options: { quantity?: number; price?: number } = {}
) {
  const items = [];
  
  for (const productId of productIds) {
    const item = await prisma.orderItem.create({
      data: {
        orderId,
        productId,
        quantity: options.quantity || faker.number.int({ min: 1, max: 5 }),
        price: options.price || faker.number.float({ min: 5, max: 50, fractionDigits: 2 }),
      },
      include: {
        product: true,
      },
    });
    items.push(item);
  }
  
  return items;
}

/**
 * Create a complete order with items
 */
export async function createMockOrderWithItems(
  prisma: PrismaClient,
  options: {
    order?: CreateMockOrderOptions;
    products?: CreateMockProductOptions[];
    itemCount?: number;
  } = {}
) {
  // Create products if not provided
  const products = [];
  const itemCount = options.itemCount || 2;
  
  if (options.products) {
    for (const productOptions of options.products) {
      const product = await createMockProduct(prisma, productOptions);
      products.push(product);
    }
  } else {
    for (let i = 0; i < itemCount; i++) {
      const product = await createMockProduct(prisma);
      products.push(product);
    }
  }

  // Create order
  const order = await createMockOrder(prisma, options.order);

  // Create order items
  const items = await createMockOrderItems(
    prisma,
    order.id,
    products.map(p => p.id)
  );

  return {
    order,
    items,
    products,
  };
}

/**
 * Create mock spotlight picks
 */
export async function createMockSpotlightPicks(
  prisma: PrismaClient,
  productIds: string[],
  options: { isActive?: boolean } = {}
) {
  const picks = [];
  
  for (let i = 0; i < productIds.length; i++) {
    const pick = await prisma.spotlightPick.create({
      data: {
        productId: productIds[i],
        position: i + 1,
        isActive: options.isActive !== false, // Default to true
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });
    picks.push(pick);
  }
  
  return picks;
}
