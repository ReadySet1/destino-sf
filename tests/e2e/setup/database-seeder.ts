/**
 * Database Seeder for E2E Tests
 * Comprehensive seeding system using test data factories
 */

import { PrismaClient } from '@prisma/client';
import {
  buildDestinoCategories,
  buildEmpanada,
  buildAlfajor,
  buildCateringPackage,
  buildSauce,
  buildTestUser,
  buildAdminUser,
} from '../../factories';

export interface SeedOptions {
  includeUsers?: boolean;
  includeProducts?: boolean;
  includeOrders?: boolean;
  minimal?: boolean;
}

export class DatabaseSeeder {
  constructor(private prisma: PrismaClient) {}

  /**
   * Seed the database with test data
   */
  async seed(options: SeedOptions = {}): Promise<void> {
    const {
      includeUsers = true,
      includeProducts = true,
      includeOrders = false,
      minimal = false,
    } = options;

    console.log('🌱 Starting database seeding...');

    try {
      // Seed categories first (required for products)
      if (includeProducts) {
        await this.seedCategories();
      }

      // Seed users
      if (includeUsers) {
        await this.seedUsers();
      }

      // Seed products
      if (includeProducts) {
        if (minimal) {
          await this.seedMinimalProducts();
        } else {
          await this.seedFullProducts();
        }
      }

      // Seed orders (optional)
      if (includeOrders) {
        await this.seedOrders();
      }

      // Seed shipping configurations
      await this.seedShippingConfigurations();

      console.log('✅ Database seeding completed successfully');
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }

  /**
   * Seed categories
   */
  private async seedCategories(): Promise<void> {
    console.log('  📁 Seeding categories...');

    const categories = buildDestinoCategories();

    for (const category of categories) {
      await this.prisma.category.upsert({
        where: { slug: category.slug },
        update: {},
        create: category,
      });
    }

    console.log(`  ✅ Seeded ${categories.length} categories`);
  }

  /**
   * Seed users
   */
  private async seedUsers(): Promise<void> {
    console.log('  👤 Seeding users...');

    // Create test customer
    const testCustomer = buildTestUser();
    await this.prisma.profile.upsert({
      where: { email: testCustomer.email },
      update: {},
      create: testCustomer,
    });

    // Create test admin
    const testAdmin = buildAdminUser({
      email: 'admin@destinosf.com',
      firstName: 'Admin',
      lastName: 'User',
    });
    await this.prisma.profile.upsert({
      where: { email: testAdmin.email },
      update: {},
      create: testAdmin,
    });

    console.log('  ✅ Seeded 2 test users (customer + admin)');
  }

  /**
   * Seed minimal products (just what's needed for basic tests)
   */
  private async seedMinimalProducts(): Promise<void> {
    console.log('  📦 Seeding minimal products...');

    const categories = await this.prisma.category.findMany();
    const empanadasCategory = categories.find(c => c.slug === 'empanadas');
    const alfajoresCategory = categories.find(c => c.slug === 'alfajores');

    if (!empanadasCategory || !alfajoresCategory) {
      throw new Error('Categories not found - seed categories first');
    }

    // Create test empanada
    const beefEmpanada = buildEmpanada({
      slug: 'empanadas-argentine-beef-frozen-4-pack',
      name: 'Empanadas- Argentine Beef (frozen- 4 pack)',
      categoryId: empanadasCategory.id,
      price: 1700, // $17.00
    });

    await this.prisma.product.upsert({
      where: { slug: beefEmpanada.slug },
      update: {},
      create: beefEmpanada,
    });

    // Create test alfajor
    const classicAlfajor = buildAlfajor({
      slug: 'alfajores-classic-1-dozen-packet',
      name: 'Alfajores- Classic (1 dozen- packet)',
      categoryId: alfajoresCategory.id,
      price: 1400, // $14.00
    });

    await this.prisma.product.upsert({
      where: { slug: classicAlfajor.slug },
      update: {},
      create: classicAlfajor,
    });

    console.log('  ✅ Seeded 2 minimal test products');
  }

  /**
   * Seed full product catalog
   */
  private async seedFullProducts(): Promise<void> {
    console.log('  📦 Seeding full product catalog...');

    const categories = await this.prisma.category.findMany();
    const empanadasCategory = categories.find(c => c.slug === 'empanadas');
    const alfajoresCategory = categories.find(c => c.slug === 'alfajores');
    const cateringCategory = categories.find(c => c.slug === 'catering');
    const saucesCategory = categories.find(c => c.slug === 'sauces');

    if (!empanadasCategory || !alfajoresCategory) {
      throw new Error('Required categories not found');
    }

    const products = [
      // Empanadas
      buildEmpanada({
        slug: 'empanadas-argentine-beef-frozen-4-pack',
        name: 'Empanadas- Argentine Beef (frozen- 4 pack)',
        categoryId: empanadasCategory.id,
        price: 1700,
      }),
      buildEmpanada({
        slug: 'empanadas-vegetarian-frozen-4-pack',
        name: 'Empanadas- Vegetarian (frozen- 4 pack)',
        categoryId: empanadasCategory.id,
        price: 1700,
      }),
      buildEmpanada({
        slug: 'empanadas-huacatay-chicken-frozen-4-pack',
        name: 'Empanadas- Huacatay Chicken (frozen- 4 pack)',
        categoryId: empanadasCategory.id,
        price: 1800,
      }),

      // Alfajores
      buildAlfajor({
        slug: 'alfajores-classic-1-dozen-packet',
        name: 'Alfajores- Classic (1 dozen- packet)',
        categoryId: alfajoresCategory.id,
        price: 1400,
      }),
      buildAlfajor({
        slug: 'alfajores-chocolate-1-dozen-packet',
        name: 'Alfajores- Chocolate (1 dozen- packet)',
        categoryId: alfajoresCategory.id,
        price: 2000,
      }),
      buildAlfajor({
        slug: 'alfajores-6-pack-combo',
        name: 'Alfajores- 6-pack combo',
        categoryId: alfajoresCategory.id,
        price: 1000,
      }),
    ];

    // Add catering packages if category exists
    if (cateringCategory) {
      products.push(
        buildCateringPackage({
          slug: 'catering-package-small',
          name: 'Catering Package - Small (10-15 people)',
          categoryId: cateringCategory.id,
          price: 24000, // $240
        }),
        buildCateringPackage({
          slug: 'catering-package-medium',
          name: 'Catering Package - Medium (20-30 people)',
          categoryId: cateringCategory.id,
          price: 50000, // $500
        })
      );
    }

    // Add sauces if category exists
    if (saucesCategory) {
      products.push(
        buildSauce({
          slug: 'chimichurri-sauce',
          name: 'Chimichurri Sauce',
          categoryId: saucesCategory.id,
          price: 500,
        })
      );
    }

    for (const product of products) {
      await this.prisma.product.upsert({
        where: { slug: product.slug },
        update: {},
        create: product,
      });
    }

    console.log(`  ✅ Seeded ${products.length} products`);
  }

  /**
   * Seed sample orders
   */
  private async seedOrders(): Promise<void> {
    console.log('  📝 Seeding sample orders...');

    // Get test users and products
    const testUser = await this.prisma.profile.findUnique({
      where: { email: 'test.user@example.com' },
    });

    const products = await this.prisma.product.findMany({ take: 3 });

    if (!testUser || products.length === 0) {
      console.log('  ⏭️  Skipping orders (users or products not found)');
      return;
    }

    // Create a sample pending order
    const order = await this.prisma.order.create({
      data: {
        profileId: testUser.id,
        orderNumber: `TEST-${Date.now()}`,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        fulfillmentType: 'PICKUP',
        paymentMethod: 'CARD',
        customerName: `${testUser.firstName} ${testUser.lastName}`,
        customerEmail: testUser.email,
        customerPhone: testUser.phone || '(555) 123-4567',
        subtotal: 5000,
        taxAmount: 413,
        shippingCost: 0,
        totalAmount: 5413,
      },
    });

    // Add order items
    for (const product of products.slice(0, 2)) {
      await this.prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          quantity: 1,
          unitPrice: product.price,
          totalPrice: product.price,
          productName: product.name,
        },
      });
    }

    console.log('  ✅ Seeded 1 sample order with 2 items');
  }

  /**
   * Seed shipping configurations
   */
  private async seedShippingConfigurations(): Promise<void> {
    console.log('  🚚 Seeding shipping configurations...');

    const configurations = [
      {
        productName: 'alfajores',
        baseWeightLb: 0.5,
        weightPerUnitLb: 0.4,
        isActive: true,
        applicableForNationwideOnly: true,
      },
      {
        productName: 'empanadas',
        baseWeightLb: 1.0,
        weightPerUnitLb: 0.8,
        isActive: true,
        applicableForNationwideOnly: true,
      },
      {
        productName: 'sauces',
        baseWeightLb: 0.2,
        weightPerUnitLb: 0.1,
        isActive: true,
        applicableForNationwideOnly: false,
      },
    ];

    for (const config of configurations) {
      await this.prisma.shippingConfiguration.upsert({
        where: { productName: config.productName },
        update: {},
        create: config,
      });
    }

    console.log(`  ✅ Seeded ${configurations.length} shipping configurations`);
  }

  /**
   * Clean all test data from the database
   */
  async clean(): Promise<void> {
    console.log('🧹 Cleaning test data...');

    try {
      // Delete in correct order to respect foreign key constraints
      await this.prisma.orderItem.deleteMany({});
      await this.prisma.payment.deleteMany({});
      await this.prisma.order.deleteMany({});
      await this.prisma.product.deleteMany({});
      await this.prisma.category.deleteMany({});
      await this.prisma.profile.deleteMany({
        where: {
          email: {
            contains: 'test',
          },
        },
      });
      await this.prisma.shippingConfiguration.deleteMany({});

      console.log('✅ Test data cleaned successfully');
    } catch (error) {
      console.error('❌ Failed to clean test data:', error);
      throw error;
    }
  }
}

/**
 * Helper function to create and run seeder
 */
export async function seedTestDatabase(prisma: PrismaClient, options: SeedOptions = {}): Promise<void> {
  const seeder = new DatabaseSeeder(prisma);
  await seeder.seed(options);
}

/**
 * Helper function to clean test database
 */
export async function cleanTestDatabase(prisma: PrismaClient): Promise<void> {
  const seeder = new DatabaseSeeder(prisma);
  await seeder.clean();
}
