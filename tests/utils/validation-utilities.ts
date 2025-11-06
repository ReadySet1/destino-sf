/**
 * Test Data Validation Utilities
 * Provides utilities for validating test data integrity
 */

import { PrismaClient } from '@prisma/client';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ValidationUtilities {
  constructor(private prisma: PrismaClient) {}

  /**
   * Validate all test data
   */
  async validateAll(): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    // Run all validations
    await this.validateProfiles(result);
    await this.validateProducts(result);
    await this.validateOrders(result);
    await this.validateOrderItems(result);
    await this.validatePayments(result);
    await this.validateCategories(result);

    // Check for orphaned records
    await this.checkOrphanedRecords(result);

    // Set overall validity
    result.valid = result.errors.length === 0;

    return result;
  }

  /**
   * Validate user profiles
   */
  private async validateProfiles(result: ValidationResult): Promise<void> {
    // Check for duplicate emails
    const duplicateEmails = await this.prisma.$queryRaw<Array<{ email: string; count: number }>>`
      SELECT email, COUNT(*) as count
      FROM "Profile"
      GROUP BY email
      HAVING COUNT(*) > 1
    `;

    if (duplicateEmails.length > 0) {
      result.errors.push(`Duplicate emails found: ${duplicateEmails.map(d => d.email).join(', ')}`);
    }

    // Check for profiles without names
    const profilesWithoutNames = await this.prisma.profile.count({
      where: {
        OR: [{ firstName: null }, { lastName: null }, { firstName: '' }, { lastName: '' }],
      },
    });

    if (profilesWithoutNames > 0) {
      result.warnings.push(`${profilesWithoutNames} profile(s) without complete names`);
    }
  }

  /**
   * Validate products
   */
  private async validateProducts(result: ValidationResult): Promise<void> {
    // Check for duplicate slugs
    const duplicateSlugs = await this.prisma.$queryRaw<Array<{ slug: string; count: number }>>`
      SELECT slug, COUNT(*) as count
      FROM "Product"
      GROUP BY slug
      HAVING COUNT(*) > 1
    `;

    if (duplicateSlugs.length > 0) {
      result.errors.push(
        `Duplicate product slugs found: ${duplicateSlugs.map(d => d.slug).join(', ')}`
      );
    }

    // Check for products with zero or negative prices
    const invalidPrices = await this.prisma.product.count({
      where: {
        price: {
          lte: 0,
        },
      },
    });

    if (invalidPrices > 0) {
      result.errors.push(`${invalidPrices} product(s) with invalid prices (≤ 0)`);
    }

    // Check for products without categories
    const productsWithoutCategories = await this.prisma.product.count({
      where: {
        categoryId: null,
      },
    });

    if (productsWithoutCategories > 0) {
      result.warnings.push(`${productsWithoutCategories} product(s) without categories`);
    }

    // Check for products with invalid category references
    const productsWithInvalidCategories = await this.prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count
      FROM "Product" p
      LEFT JOIN "Category" c ON p."categoryId" = c.id
      WHERE p."categoryId" IS NOT NULL AND c.id IS NULL
    `;

    if (productsWithInvalidCategories[0]?.count > 0) {
      result.errors.push(
        `${productsWithInvalidCategories[0].count} product(s) with invalid category references`
      );
    }
  }

  /**
   * Validate orders
   */
  private async validateOrders(result: ValidationResult): Promise<void> {
    // Check for duplicate order numbers
    const duplicateOrderNumbers = await this.prisma.$queryRaw<
      Array<{ orderNumber: string; count: number }>
    >`
      SELECT "orderNumber", COUNT(*) as count
      FROM "Order"
      GROUP BY "orderNumber"
      HAVING COUNT(*) > 1
    `;

    if (duplicateOrderNumbers.length > 0) {
      result.errors.push(
        `Duplicate order numbers found: ${duplicateOrderNumbers.map(d => d.orderNumber).join(', ')}`
      );
    }

    // Check for orders with invalid totals
    const ordersWithInvalidTotals = await this.prisma.order.count({
      where: {
        OR: [{ totalAmount: { lte: 0 } }, { subtotal: { lte: 0 } }],
      },
    });

    if (ordersWithInvalidTotals > 0) {
      result.errors.push(`${ordersWithInvalidTotals} order(s) with invalid totals`);
    }

    // Check for orders where totalAmount doesn't match subtotal + tax + shipping
    const ordersWithMismatchedTotals = await this.prisma.$queryRaw<
      Array<{ id: string; orderNumber: string }>
    >`
      SELECT id, "orderNumber"
      FROM "Order"
      WHERE "totalAmount" != ("subtotal" + "taxAmount" + "shippingCost")
    `;

    if (ordersWithMismatchedTotals.length > 0) {
      result.errors.push(
        `${ordersWithMismatchedTotals.length} order(s) with mismatched totals: ${ordersWithMismatchedTotals.map(o => o.orderNumber).join(', ')}`
      );
    }
  }

  /**
   * Validate order items
   */
  private async validateOrderItems(result: ValidationResult): Promise<void> {
    // Check for order items with invalid quantities
    const itemsWithInvalidQuantities = await this.prisma.orderItem.count({
      where: {
        quantity: {
          lte: 0,
        },
      },
    });

    if (itemsWithInvalidQuantities > 0) {
      result.errors.push(`${itemsWithInvalidQuantities} order item(s) with invalid quantities`);
    }

    // Check for order items where totalPrice doesn't match unitPrice * quantity
    const itemsWithMismatchedPrices = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "OrderItem"
      WHERE "totalPrice" != ("unitPrice" * quantity)
    `;

    if (itemsWithMismatchedPrices.length > 0) {
      result.errors.push(
        `${itemsWithMismatchedPrices.length} order item(s) with mismatched prices`
      );
    }

    // Check for order items with invalid order references
    const itemsWithInvalidOrders = await this.prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count
      FROM "OrderItem" oi
      LEFT JOIN "Order" o ON oi."orderId" = o.id
      WHERE o.id IS NULL
    `;

    if (itemsWithInvalidOrders[0]?.count > 0) {
      result.errors.push(
        `${itemsWithInvalidOrders[0].count} order item(s) with invalid order references`
      );
    }
  }

  /**
   * Validate payments
   */
  private async validatePayments(result: ValidationResult): Promise<void> {
    // Check for payments with invalid amounts
    const paymentsWithInvalidAmounts = await this.prisma.payment.count({
      where: {
        amount: {
          lte: 0,
        },
      },
    });

    if (paymentsWithInvalidAmounts > 0) {
      result.errors.push(`${paymentsWithInvalidAmounts} payment(s) with invalid amounts`);
    }

    // Check for payments with invalid order references
    const paymentsWithInvalidOrders = await this.prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count
      FROM "Payment" p
      LEFT JOIN "Order" o ON p."orderId" = o.id
      WHERE o.id IS NULL
    `;

    if (paymentsWithInvalidOrders[0]?.count > 0) {
      result.errors.push(
        `${paymentsWithInvalidOrders[0].count} payment(s) with invalid order references`
      );
    }

    // Check for orders with PAID status but no payment record
    const paidOrdersWithoutPayments = await this.prisma.$queryRaw<Array<{ orderNumber: string }>>`
      SELECT o."orderNumber"
      FROM "Order" o
      LEFT JOIN "Payment" p ON o.id = p."orderId"
      WHERE o."paymentStatus" = 'PAID' AND p.id IS NULL
    `;

    if (paidOrdersWithoutPayments.length > 0) {
      result.warnings.push(
        `${paidOrdersWithoutPayments.length} PAID order(s) without payment records: ${paidOrdersWithoutPayments.map(o => o.orderNumber).join(', ')}`
      );
    }
  }

  /**
   * Validate categories
   */
  private async validateCategories(result: ValidationResult): Promise<void> {
    // Check for duplicate category slugs
    const duplicateSlugs = await this.prisma.$queryRaw<Array<{ slug: string; count: number }>>`
      SELECT slug, COUNT(*) as count
      FROM "Category"
      GROUP BY slug
      HAVING COUNT(*) > 1
    `;

    if (duplicateSlugs.length > 0) {
      result.errors.push(
        `Duplicate category slugs found: ${duplicateSlugs.map(d => d.slug).join(', ')}`
      );
    }
  }

  /**
   * Check for orphaned records
   */
  private async checkOrphanedRecords(result: ValidationResult): Promise<void> {
    // Check for products without a valid category
    const orphanedProducts = await this.prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count
      FROM "Product" p
      LEFT JOIN "Category" c ON p."categoryId" = c.id
      WHERE p."categoryId" IS NOT NULL AND c.id IS NULL
    `;

    if (orphanedProducts[0]?.count > 0) {
      result.errors.push(`${orphanedProducts[0].count} orphaned product(s) (category deleted)`);
    }

    // Check for order items without a valid order
    const orphanedOrderItems = await this.prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count
      FROM "OrderItem" oi
      LEFT JOIN "Order" o ON oi."orderId" = o.id
      WHERE o.id IS NULL
    `;

    if (orphanedOrderItems[0]?.count > 0) {
      result.errors.push(`${orphanedOrderItems[0].count} orphaned order item(s) (order deleted)`);
    }
  }

  /**
   * Validate specific entity
   */
  async validateEntity(model: string, id: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    const prismaModel = (this.prisma as any)[model];

    if (!prismaModel) {
      result.errors.push(`Model ${model} not found`);
      result.valid = false;
      return result;
    }

    const entity = await prismaModel.findUnique({ where: { id } });

    if (!entity) {
      result.errors.push(`Entity ${model}:${id} not found`);
      result.valid = false;
      return result;
    }

    // Model-specific validation
    switch (model) {
      case 'product':
        if (entity.price <= 0) {
          result.errors.push('Invalid price');
        }
        break;

      case 'order':
        if (entity.totalAmount !== entity.subtotal + entity.taxAmount + entity.shippingCost) {
          result.errors.push('Total amount mismatch');
        }
        break;

      case 'orderItem':
        if (entity.totalPrice !== entity.unitPrice * entity.quantity) {
          result.errors.push('Total price mismatch');
        }
        break;
    }

    result.valid = result.errors.length === 0;
    return result;
  }

  /**
   * Print validation report
   */
  printReport(result: ValidationResult): void {
    console.log('\n📊 Validation Report');
    console.log('='.repeat(50));

    if (result.valid) {
      console.log('✅ All validations passed!');
    } else {
      console.log('❌ Validation failed!');
    }

    if (result.errors.length > 0) {
      console.log('\n🚨 Errors:');
      result.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach((warning, i) => {
        console.log(`  ${i + 1}. ${warning}`);
      });
    }

    console.log('='.repeat(50) + '\n');
  }
}

/**
 * Helper function to validate test data
 */
export async function validateTestData(prisma: PrismaClient): Promise<ValidationResult> {
  const validator = new ValidationUtilities(prisma);
  return await validator.validateAll();
}
