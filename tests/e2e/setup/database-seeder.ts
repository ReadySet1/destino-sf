/**
 * Database Seeder for E2E Tests
 * Comprehensive seeding system using test data factories
 */

import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
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

    // Create Supabase client with service role key for testing (bypasses RLS and email confirmation)
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key for admin privileges
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Test password for all E2E test users
    const testPassword = 'password123';

    // Clean up existing test users from previous runs
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const customerEmail = 'test.user@example.com';
    const adminEmail = 'admin@destinosf.com';

    const existingCustomer = existingUsers?.users?.find((u) => u.email === customerEmail);
    const existingAdmin = existingUsers?.users?.find((u) => u.email === adminEmail);

    if (existingCustomer) {
      await supabase.auth.admin.deleteUser(existingCustomer.id);
      console.log(`  🗑️  Deleted existing customer auth user`);
    }
    if (existingAdmin) {
      await supabase.auth.admin.deleteUser(existingAdmin.id);
      console.log(`  🗑️  Deleted existing admin auth user`);
    }

    // Create test customer with Supabase Auth
    try {

      // Use admin API to create user with email auto-confirmed (service role key required)
      const { data: customerAuth, error: customerAuthError } = await supabase.auth.admin.createUser({
        email: customerEmail,
        password: testPassword,
        email_confirm: true, // Auto-confirm email for testing
      });

      if (customerAuthError && !customerAuthError.message.includes('already registered')) {
        console.warn(`⚠️ Customer auth creation warning: ${customerAuthError.message}`);
      }

      // Create or update profile using the auth user ID if available
      const customerId = customerAuth?.user?.id;
      if (!customerId) {
        throw new Error('Failed to get customer auth user ID from Supabase');
      }

      console.log(`  🔑 Customer Auth ID: ${customerId}`);

      const testCustomer = buildTestUser();
      await this.prisma.profile.upsert({
        where: { email: customerEmail },
        update: { id: customerId }, // Update ID to match Auth user if profile already exists
        create: {
          ...testCustomer,
          id: customerId,
          email: customerEmail,
        },
      });

      console.log(`  ✅ Created Profile for customer with ID: ${customerId}`);
    } catch (error) {
      console.warn(`⚠️ Error creating customer: ${error}. Using database-only profile.`);
      // Fallback: create database profile only
      const testCustomer = buildTestUser();
      await this.prisma.profile.upsert({
        where: { email: customerEmail },
        update: {},
        create: testCustomer,
      });
    }

    // Create test admin with Supabase Auth
    try {
      // Use admin API to create user with email auto-confirmed (service role key required)
      const { data: adminAuth, error: adminAuthError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: testPassword,
        email_confirm: true, // Auto-confirm email for testing
      });

      if (adminAuthError && !adminAuthError.message.includes('already registered')) {
        console.warn(`⚠️ Admin auth creation warning: ${adminAuthError.message}`);
      }

      // Create or update profile using the auth user ID if available
      const adminId = adminAuth?.user?.id;
      if (!adminId) {
        throw new Error('Failed to get admin auth user ID from Supabase');
      }

      console.log(`  🔑 Admin Auth ID: ${adminId}`);

      const testAdmin = buildAdminUser({
        email: adminEmail,
        firstName: 'Admin',
        lastName: 'User',
      });
      await this.prisma.profile.upsert({
        where: { email: adminEmail },
        update: { id: adminId }, // Update ID to match Auth user if profile already exists
        create: {
          ...testAdmin,
          id: adminId,
          email: adminEmail,
        },
      });

      console.log(`  ✅ Created Profile for admin with ID: ${adminId}`);
    } catch (error) {
      console.warn(`⚠️ Error creating admin: ${error}. Using database-only profile.`);
      // Fallback: create database profile only
      const testAdmin = buildAdminUser({
        email: adminEmail,
        firstName: 'Admin',
        lastName: 'User',
      });
      await this.prisma.profile.upsert({
        where: { email: adminEmail },
        update: {},
        create: testAdmin,
      });
    }

    console.log('  ✅ Seeded 2 test users (customer + admin) with Supabase Auth');
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
   * Seed admin test orders in various states
   * For comprehensive admin order management testing
   */
  async seedAdminTestOrders(): Promise<void> {
    console.log('  📝 Seeding admin test orders...');

    // Get test user and products
    const testUser = await this.prisma.profile.findUnique({
      where: { email: 'test.user@example.com' },
    });

    const products = await this.prisma.product.findMany({ take: 3 });

    if (!testUser || products.length === 0) {
      console.log('  ⏭️  Skipping admin test orders (users or products not found)');
      return;
    }

    const timestamp = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const orderConfigs = [
      // PENDING orders with different payment statuses
      {
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: 'SQUARE',
        fulfillmentType: 'PICKUP',
        customerName: 'Pending Customer',
        customerEmail: 'pending@test.com',
        notes: 'Test order in PENDING status',
      },
      {
        status: 'PENDING',
        paymentStatus: 'PAID',
        paymentMethod: 'SQUARE',
        fulfillmentType: 'PICKUP',
        customerName: 'Paid Pending Customer',
        customerEmail: 'paid-pending@test.com',
        squareOrderId: `sq-order-paid-${timestamp}`,
        squarePaymentId: `sq-payment-paid-${timestamp}`,
        notes: 'Test order PENDING with PAID payment',
      },
      {
        status: 'PENDING',
        paymentStatus: 'FAILED',
        paymentMethod: 'SQUARE',
        fulfillmentType: 'PICKUP',
        customerName: 'Failed Payment Customer',
        customerEmail: 'failed@test.com',
        notes: 'Test order with failed payment',
      },

      // PROCESSING orders
      {
        status: 'PROCESSING',
        paymentStatus: 'PAID',
        paymentMethod: 'SQUARE',
        fulfillmentType: 'PICKUP',
        customerName: 'Processing Customer',
        customerEmail: 'processing@test.com',
        squareOrderId: `sq-order-processing-${timestamp}`,
        squarePaymentId: `sq-payment-processing-${timestamp}`,
        notes: 'Test order in PROCESSING status',
      },

      // READY orders
      {
        status: 'READY',
        paymentStatus: 'PAID',
        paymentMethod: 'SQUARE',
        fulfillmentType: 'PICKUP',
        customerName: 'Ready Customer',
        customerEmail: 'ready@test.com',
        squareOrderId: `sq-order-ready-${timestamp}`,
        squarePaymentId: `sq-payment-ready-${timestamp}`,
        notes: 'Test order in READY status',
      },

      // COMPLETED orders
      {
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        paymentMethod: 'SQUARE',
        fulfillmentType: 'DELIVERY',
        customerName: 'Completed Customer',
        customerEmail: 'completed@test.com',
        squareOrderId: `sq-order-completed-${timestamp}`,
        squarePaymentId: `sq-payment-completed-${timestamp}`,
        notes: 'Test order in COMPLETED status',
      },

      // CANCELLED orders
      {
        status: 'CANCELLED',
        paymentStatus: 'PENDING',
        paymentMethod: 'SQUARE',
        fulfillmentType: 'PICKUP',
        customerName: 'Cancelled Customer',
        customerEmail: 'cancelled@test.com',
        notes: 'Test order in CANCELLED status',
      },

      // CASH payment order
      {
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: 'CASH',
        fulfillmentType: 'PICKUP',
        customerName: 'Cash Customer',
        customerEmail: 'cash@test.com',
        notes: 'Test CASH payment order',
      },

      // NATIONWIDE_SHIPPING order
      {
        status: 'PROCESSING',
        paymentStatus: 'PAID',
        paymentMethod: 'SQUARE',
        fulfillmentType: 'NATIONWIDE_SHIPPING',
        customerName: 'Shipping Customer',
        customerEmail: 'shipping@test.com',
        shippingCost: 1595, // $15.95
        shippingStreet: '123 Main St',
        shippingCity: 'New York',
        shippingState: 'NY',
        shippingZip: '10001',
        squareOrderId: `sq-order-shipping-${timestamp}`,
        squarePaymentId: `sq-payment-shipping-${timestamp}`,
        notes: 'Test nationwide shipping order',
      },

      // ARCHIVED order
      {
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        paymentMethod: 'SQUARE',
        fulfillmentType: 'PICKUP',
        customerName: 'Archived Customer',
        customerEmail: 'archived@test.com',
        squareOrderId: `sq-order-archived-${timestamp}`,
        squarePaymentId: `sq-payment-archived-${timestamp}`,
        isArchived: true,
        archiveReason: 'Test archived order',
        notes: 'Test order in archived state',
      },
    ];

    let orderCount = 0;
    for (const [index, config] of orderConfigs.entries()) {
      const subtotal = 5000;
      const shippingCost = config.shippingCost || 0;
      const taxAmount = Math.round(subtotal * 0.0825); // 8.25% tax
      const totalAmount = subtotal + taxAmount + shippingCost;

      const order = await this.prisma.order.create({
        data: {
          userId: testUser.id,
          squareOrderId: config.squareOrderId || `ADMIN-TEST-${timestamp}-${index}`,
          status: config.status as any,
          paymentStatus: config.paymentStatus as any,
          fulfillmentType: config.fulfillmentType as any,
          paymentMethod: config.paymentMethod as any,
          customerName: config.customerName,
          email: config.customerEmail,
          phone: '(555) 123-4567',
          total: totalAmount / 100, // Convert cents to dollars (Decimal)
          taxAmount: taxAmount / 100, // Convert to Decimal
          shippingCostCents: shippingCost,
          notes: config.notes,
          isArchived: config.isArchived || false,
          archiveReason: config.archiveReason,
        },
      });

      // Add 2 order items
      for (const product of products.slice(0, 2)) {
        await this.prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: product.id,
            quantity: 2,
            price: product.price,
          },
        });
      }

      orderCount++;
    }

    console.log(`  ✅ Seeded ${orderCount} admin test orders in various states`);
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
