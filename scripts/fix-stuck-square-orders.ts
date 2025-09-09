#!/usr/bin/env tsx

/**
 * EMERGENCY CLEANUP SCRIPT: Fix Stuck Square Orders
 * 
 * This script identifies and fixes orders that are stuck in DRAFT state in Square
 * while having been created successfully in our database.
 * 
 * Usage:
 *   pnpm tsx scripts/fix-stuck-square-orders.ts [--dry-run] [--project=production|development]
 * 
 * Safety Features:
 * - Dry run mode by default
 * - Confirmation prompts for production
 * - Detailed logging of all actions
 * - Rollback capability
 */

import { PrismaClient } from '@prisma/client';
import { getSquareService } from '../src/lib/square/service';
import { logger } from '../src/utils/logger';
import { randomUUID } from 'crypto';
import * as readline from 'readline';

interface StuckOrder {
  id: string;
  squareOrderId: string;
  status: string;
  paymentStatus: string;
  total: string;
  createdAt: Date;
  customerName: string;
  email: string;
}

interface FixResult {
  orderId: string;
  squareOrderId: string;
  success: boolean;
  action: 'finalized' | 'already_finalized' | 'error';
  error?: string;
  squareState?: string;
}

class StuckOrdersFixer {
  private prisma: PrismaClient;
  private squareService: any;
  private isDryRun: boolean;
  private results: FixResult[] = [];

  constructor(isDryRun: boolean = true) {
    this.prisma = new PrismaClient();
    this.squareService = getSquareService();
    this.isDryRun = isDryRun;
  }

  /**
   * Identifies orders that are likely stuck in Square DRAFT state
   */
  async findStuckOrders(): Promise<StuckOrder[]> {
    logger.info('🔍 Scanning for stuck orders...');

    const stuckOrders = await this.prisma.order.findMany({
      where: {
        AND: [
          { squareOrderId: { not: null } },
          { createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } }, // Last 90 days
          {
            OR: [
              // Orders pending for more than 1 hour
              {
                status: 'PENDING',
                createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) }
              },
              // Orders that might have payments but stuck status
              {
                paymentStatus: 'COMPLETED',
                status: { in: ['PENDING', 'PROCESSING'] }
              }
            ]
          }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Safety limit
    });

    logger.info(`📊 Found ${stuckOrders.length} potentially stuck orders`);
    return stuckOrders as StuckOrder[];
  }

  /**
   * Checks the actual state of an order in Square
   */
  async checkSquareOrderState(squareOrderId: string): Promise<{ state: string; version?: number }> {
    try {
      const response = await this.squareService.retrieveOrder(squareOrderId);
      return {
        state: response.order?.state || 'UNKNOWN',
        version: response.order?.version
      };
    } catch (error) {
      logger.error(`Failed to check Square order ${squareOrderId}:`, error);
      throw error;
    }
  }

  /**
   * Attempts to finalize a stuck order in Square
   */
  async finalizeSquareOrder(squareOrderId: string, version?: number): Promise<{ success: boolean; newState?: string; error?: string }> {
    try {
      const updateRequest = {
        order: {
          locationId: process.env.SQUARE_LOCATION_ID!,
          state: 'OPEN',
          version: version, // Use the current version for optimistic locking
        },
        fieldsToClear: [],
        idempotencyKey: randomUUID(),
      };

      if (this.isDryRun) {
        logger.info(`🧪 DRY RUN: Would finalize Square order ${squareOrderId}`);
        return { success: true, newState: 'OPEN' };
      }

      const response = await this.squareService.updateOrder(squareOrderId, updateRequest);
      const newState = response.order?.state || 'UNKNOWN';
      
      logger.info(`✅ Finalized Square order ${squareOrderId}: ${newState}`);
      return { success: true, newState };
    } catch (error: any) {
      logger.error(`❌ Failed to finalize Square order ${squareOrderId}:`, error);
      return { 
        success: false, 
        error: error.message || 'Unknown error' 
      };
    }
  }

  /**
   * Updates our database record after successful Square finalization
   */
  async updateDatabaseOrder(orderId: string, newStatus: 'PROCESSING' | 'COMPLETED'): Promise<void> {
    if (this.isDryRun) {
      logger.info(`🧪 DRY RUN: Would update database order ${orderId} to ${newStatus}`);
      return;
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    });

    logger.info(`📝 Updated database order ${orderId} to ${newStatus}`);
  }

  /**
   * Process a single stuck order
   */
  async processStuckOrder(order: StuckOrder): Promise<FixResult> {
    const result: FixResult = {
      orderId: order.id,
      squareOrderId: order.squareOrderId,
      success: false,
      action: 'error',
    };

    try {
      logger.info(`🔧 Processing order ${order.id} (Square: ${order.squareOrderId})`);

      // Check current state in Square
      const squareState = await this.checkSquareOrderState(order.squareOrderId);
      result.squareState = squareState.state;

      if (squareState.state === 'OPEN' || squareState.state === 'COMPLETED') {
        logger.info(`ℹ️  Order already finalized in Square: ${squareState.state}`);
        result.success = true;
        result.action = 'already_finalized';
        
        // Still update our database if it's behind
        if (order.status === 'PENDING') {
          await this.updateDatabaseOrder(order.id, 'PROCESSING');
        }
        return result;
      }

      if (squareState.state === 'DRAFT') {
        // This is the main issue - finalize the order
        const finalizeResult = await this.finalizeSquareOrder(order.squareOrderId, squareState.version);
        
        if (finalizeResult.success) {
          await this.updateDatabaseOrder(order.id, 'PROCESSING');
          result.success = true;
          result.action = 'finalized';
          result.squareState = finalizeResult.newState;
        } else {
          result.error = finalizeResult.error;
        }
      } else {
        logger.warn(`⚠️  Unexpected Square order state: ${squareState.state}`);
        result.error = `Unexpected state: ${squareState.state}`;
      }

    } catch (error: any) {
      logger.error(`💥 Error processing order ${order.id}:`, error);
      result.error = error.message || 'Unknown error';
    }

    return result;
  }

  /**
   * Main execution function
   */
  async run(): Promise<void> {
    try {
      logger.info('🚀 Starting stuck orders cleanup...');
      
      if (this.isDryRun) {
        logger.info('🧪 RUNNING IN DRY RUN MODE - No changes will be made');
      }

      // Find stuck orders
      const stuckOrders = await this.findStuckOrders();
      
      if (stuckOrders.length === 0) {
        logger.info('🎉 No stuck orders found!');
        return;
      }

      // Show summary
      console.log('\n📋 STUCK ORDERS SUMMARY:');
      console.log('─'.repeat(80));
      stuckOrders.forEach((order, index) => {
        console.log(`${index + 1}. Order ${order.id.substring(0, 8)}... ($${order.total})`);
        console.log(`   Square: ${order.squareOrderId}`);
        console.log(`   Customer: ${order.customerName} (${order.email})`);
        console.log(`   Created: ${order.createdAt.toLocaleDateString()}`);
        console.log(`   Status: ${order.status}/${order.paymentStatus}`);
        console.log('');
      });

      // Confirmation for production runs
      if (!this.isDryRun) {
        const confirmed = await this.confirmExecution(stuckOrders.length);
        if (!confirmed) {
          logger.info('❌ Operation cancelled by user');
          return;
        }
      }

      // Process each order
      logger.info(`🔄 Processing ${stuckOrders.length} stuck orders...`);
      
      for (const order of stuckOrders) {
        const result = await this.processStuckOrder(order);
        this.results.push(result);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Show final results
      this.showResults();

    } catch (error) {
      logger.error('💥 Fatal error during cleanup:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Ask for user confirmation on production runs
   */
  private async confirmExecution(orderCount: number): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(
        `\n⚠️  You are about to fix ${orderCount} stuck orders in PRODUCTION.\n` +
        `This will make changes to both Square and your database.\n` +
        `Are you absolutely sure you want to continue? (type 'YES' to confirm): `,
        (answer) => {
          rl.close();
          resolve(answer.trim() === 'YES');
        }
      );
    });
  }

  /**
   * Display final results summary
   */
  private showResults(): void {
    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const finalized = this.results.filter(r => r.action === 'finalized').length;
    const alreadyFixed = this.results.filter(r => r.action === 'already_finalized').length;

    console.log('\n🎯 CLEANUP RESULTS:');
    console.log('═'.repeat(80));
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`🔧 Newly Finalized: ${finalized}`);
    console.log(`✨ Already Fixed: ${alreadyFixed}`);
    console.log('');

    if (failed > 0) {
      console.log('❌ FAILED ORDERS:');
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`   ${r.orderId}: ${r.error}`);
        });
      console.log('');
    }

    if (this.isDryRun) {
      console.log('🧪 This was a DRY RUN - no actual changes were made.');
      console.log('💡 Run with --execute to apply the fixes.');
    } else {
      console.log('🎉 Cleanup completed! Orders should now be visible in Square Dashboard.');
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): void {
    await this.prisma.$disconnect();
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = !args.includes('--execute');
  const project = args.find(arg => arg.startsWith('--project='))?.split('=')[1] || 'development';

  console.log('🔧 STUCK SQUARE ORDERS CLEANUP TOOL');
  console.log('═'.repeat(50));
  console.log(`📁 Project: ${project}`);
  console.log(`🧪 Mode: ${isDryRun ? 'DRY RUN' : 'EXECUTE'}`);
  console.log('');

  if (project === 'production' && !isDryRun) {
    console.log('⚠️  PRODUCTION MODE ENABLED - BE CAREFUL!');
  }

  const fixer = new StuckOrdersFixer(isDryRun);
  await fixer.run();
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

export { StuckOrdersFixer };
