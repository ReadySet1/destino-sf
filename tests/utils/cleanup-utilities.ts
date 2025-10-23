/**
 * Test Data Cleanup Utilities
 * Provides utilities for cleaning up test data safely
 */

import { PrismaClient } from '@prisma/client';

export interface CleanupOptions {
  /**
   * Clean everything (use with caution!)
   */
  full?: boolean;

  /**
   * Only clean test data (emails containing 'test', orders with TEST prefix, etc.)
   */
  testOnly?: boolean;

  /**
   * Tables to clean (if not full cleanup)
   */
  tables?: string[];

  /**
   * Preserve certain records
   */
  preserve?: {
    userEmails?: string[];
    productSlugs?: string[];
    orderNumbers?: string[];
  };
}

export class CleanupUtilities {
  constructor(private prisma: PrismaClient) {}

  /**
   * Clean all test data
   */
  async cleanAll(options: CleanupOptions = {}): Promise<void> {
    const { testOnly = true } = options;

    console.log('🧹 Starting cleanup...');

    // Always clean in correct order to respect foreign key constraints
    await this.cleanOrderItems(testOnly);
    await this.cleanPayments(testOnly);
    await this.cleanOrders(testOnly);
    await this.cleanProducts(testOnly);
    await this.cleanCategories(testOnly);
    await this.cleanProfiles(testOnly, options.preserve?.userEmails);
    await this.cleanShippingConfigurations(testOnly);

    console.log('✅ Cleanup completed');
  }

  /**
   * Clean specific tables
   */
  async cleanTables(tables: string[]): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('cleanTables can only be used in test environment');
    }

    for (const table of tables) {
      console.log(`  Cleaning ${table}...`);
      await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
    }
  }

  /**
   * Clean order items
   */
  private async cleanOrderItems(testOnly: boolean): Promise<void> {
    if (testOnly) {
      // Clean only test order items (those linked to test orders)
      await this.prisma.orderItem.deleteMany({
        where: {
          order: {
            orderNumber: {
              startsWith: 'TEST-',
            },
          },
        },
      });
    } else {
      await this.prisma.orderItem.deleteMany({});
    }
  }

  /**
   * Clean payments
   */
  private async cleanPayments(testOnly: boolean): Promise<void> {
    if (testOnly) {
      await this.prisma.payment.deleteMany({
        where: {
          order: {
            orderNumber: {
              startsWith: 'TEST-',
            },
          },
        },
      });
    } else {
      await this.prisma.payment.deleteMany({});
    }
  }

  /**
   * Clean orders
   */
  private async cleanOrders(testOnly: boolean): Promise<void> {
    if (testOnly) {
      await this.prisma.order.deleteMany({
        where: {
          OR: [
            {
              orderNumber: {
                startsWith: 'TEST-',
              },
            },
            {
              customerEmail: {
                contains: 'test',
              },
            },
          ],
        },
      });
    } else {
      await this.prisma.order.deleteMany({});
    }
  }

  /**
   * Clean products
   */
  private async cleanProducts(testOnly: boolean): Promise<void> {
    if (testOnly) {
      await this.prisma.product.deleteMany({
        where: {
          OR: [
            {
              slug: {
                startsWith: 'test-',
              },
            },
            {
              squareId: {
                startsWith: 'test-',
              },
            },
          ],
        },
      });
    } else {
      await this.prisma.product.deleteMany({});
    }
  }

  /**
   * Clean categories
   */
  private async cleanCategories(testOnly: boolean): Promise<void> {
    if (testOnly) {
      await this.prisma.category.deleteMany({
        where: {
          OR: [
            {
              slug: {
                startsWith: 'test-',
              },
            },
            {
              squareId: {
                startsWith: 'test-',
              },
            },
          ],
        },
      });
    } else {
      await this.prisma.category.deleteMany({});
    }
  }

  /**
   * Clean user profiles
   */
  private async cleanProfiles(testOnly: boolean, preserve: string[] = []): Promise<void> {
    if (testOnly) {
      await this.prisma.profile.deleteMany({
        where: {
          AND: [
            {
              email: {
                contains: 'test',
              },
            },
            {
              email: {
                notIn: preserve,
              },
            },
          ],
        },
      });
    } else {
      await this.prisma.profile.deleteMany({
        where: {
          email: {
            notIn: preserve,
          },
        },
      });
    }
  }

  /**
   * Clean shipping configurations
   */
  private async cleanShippingConfigurations(testOnly: boolean): Promise<void> {
    // Shipping configurations are usually safe to clean entirely in tests
    if (!testOnly) {
      await this.prisma.shippingConfiguration.deleteMany({});
    }
  }

  /**
   * Clean specific entity by ID
   */
  async cleanEntity(model: string, id: string): Promise<void> {
    const prismaModel = (this.prisma as any)[model];

    if (!prismaModel) {
      throw new Error(`Model ${model} not found in Prisma client`);
    }

    await prismaModel.delete({
      where: { id },
    });
  }

  /**
   * Clean entities matching a condition
   */
  async cleanWhere(model: string, where: any): Promise<void> {
    const prismaModel = (this.prisma as any)[model];

    if (!prismaModel) {
      throw new Error(`Model ${model} not found in Prisma client`);
    }

    await prismaModel.deleteMany({ where });
  }

  /**
   * Reset auto-increment sequences (PostgreSQL specific)
   */
  async resetSequences(tables: string[]): Promise<void> {
    for (const table of tables) {
      await this.prisma.$executeRawUnsafe(
        `ALTER SEQUENCE IF EXISTS "${table}_id_seq" RESTART WITH 1`
      );
    }
  }

  /**
   * Get count of records in a table
   */
  async getRecordCount(model: string): Promise<number> {
    const prismaModel = (this.prisma as any)[model];

    if (!prismaModel) {
      throw new Error(`Model ${model} not found in Prisma client`);
    }

    return await prismaModel.count();
  }

  /**
   * Verify cleanup was successful
   */
  async verifyCleanup(expectedCounts: Record<string, number> = {}): Promise<boolean> {
    const models = Object.keys(expectedCounts);

    for (const model of models) {
      const count = await this.getRecordCount(model);
      const expected = expectedCounts[model];

      if (count !== expected) {
        console.error(`❌ Cleanup verification failed for ${model}: expected ${expected}, got ${count}`);
        return false;
      }
    }

    console.log('✅ Cleanup verification passed');
    return true;
  }
}

/**
 * Helper function to create and run cleanup
 */
export async function cleanupTestData(prisma: PrismaClient, options: CleanupOptions = {}): Promise<void> {
  const cleaner = new CleanupUtilities(prisma);
  await cleaner.cleanAll(options);
}

/**
 * Helper function to clean specific tables
 */
export async function cleanTables(prisma: PrismaClient, tables: string[]): Promise<void> {
  const cleaner = new CleanupUtilities(prisma);
  await cleaner.cleanTables(tables);
}
