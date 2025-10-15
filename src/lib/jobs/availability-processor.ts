// src/lib/jobs/availability-processor.ts

import { prisma, withRetry } from '@/lib/db-unified';
import { AvailabilityQueries } from '@/lib/db/availability-queries';
import { AvailabilityEngine } from '@/lib/availability/engine';
import { AvailabilityScheduler } from '@/lib/availability/scheduler';
import { ProductVisibilityService } from '@/lib/services/product-visibility-service';
import { NotificationService } from '@/lib/notifications/notification-service';
import { logger } from '@/utils/logger';
import { AvailabilityState, type AvailabilityRule } from '@/types/availability';

export interface ProcessingResult {
  processed: number;
  updated: number;
  errors: Array<{
    productId: string;
    error: string;
    timestamp: Date;
  }>;
  duration: number;
  summary: {
    rulesProcessed: number;
    stateChanges: number;
    notificationsSent: number;
  };
}

export interface JobStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  result?: ProcessingResult;
  error?: string;
}

/**
 * Background job processor for availability rules and scheduled changes
 */
export class AvailabilityProcessor {
  private static isRunning = false;
  private static lastRun: Date | null = null;
  private static currentJobId: string | null = null;

  /**
   * Process all scheduled availability changes
   */
  async processScheduledChanges(): Promise<ProcessingResult> {
    const startTime = Date.now();
    const jobId = `availability-${Date.now()}`;

    // Prevent concurrent runs
    if (AvailabilityProcessor.isRunning) {
      throw new Error('Availability processing job is already running');
    }

    AvailabilityProcessor.isRunning = true;
    AvailabilityProcessor.currentJobId = jobId;

    logger.info('Starting availability processing job', { jobId });

    const result: ProcessingResult = {
      processed: 0,
      updated: 0,
      errors: [],
      duration: 0,
      summary: {
        rulesProcessed: 0,
        stateChanges: 0,
        notificationsSent: 0,
      },
    };

    try {
      // 1. Process scheduled rule changes
      await this.processScheduledRules(result);

      // 2. Process expired rules
      await this.processExpiredRules(result);

      // 3. Re-evaluate affected products
      await this.reevaluateProducts(result);

      // 4. Send notifications for state changes
      await this.sendNotifications(result);

      // 5. Cleanup old job records
      await this.cleanupOldJobs();

      AvailabilityProcessor.lastRun = new Date();
      result.duration = Date.now() - startTime;

      logger.info('Availability processing job completed successfully', {
        jobId,
        result: {
          processed: result.processed,
          updated: result.updated,
          errors: result.errors.length,
          duration: result.duration,
        },
      });

      return result;
    } catch (error) {
      result.duration = Date.now() - startTime;
      logger.error('Availability processing job failed', {
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: result.duration,
      });
      throw error;
    } finally {
      AvailabilityProcessor.isRunning = false;
      AvailabilityProcessor.currentJobId = null;
    }
  }

  /**
   * Process rules that are scheduled to start or change
   */
  private async processScheduledRules(result: ProcessingResult): Promise<void> {
    try {
      const now = new Date();

      // Find rules with scheduled changes in the next 5 minutes
      const scheduledRules = await withRetry(
        () =>
          prisma.availabilityRule.findMany({
            where: {
              enabled: true,
              OR: [
                {
                  startDate: {
                    lte: now,
                    gte: new Date(now.getTime() - 5 * 60 * 1000), // Last 5 minutes
                  },
                },
                {
                  endDate: {
                    lte: now,
                    gte: new Date(now.getTime() - 5 * 60 * 1000), // Last 5 minutes
                  },
                },
              ],
            },
            include: {
              product: true,
            },
          }),
        3,
        'scheduled-rules-fetch'
      );

      result.summary.rulesProcessed = scheduledRules.length;

      for (const rule of scheduledRules) {
        try {
          await this.processRuleChange(rule, result);
          result.processed++;
        } catch (error) {
          result.errors.push({
            productId: rule.productId,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      logger.error('Error processing scheduled rules', { error });
      throw error;
    }
  }

  /**
   * Process rules that have expired
   */
  private async processExpiredRules(result: ProcessingResult): Promise<void> {
    try {
      const now = new Date();

      // Find rules that have expired in the last 5 minutes
      const expiredRules = await withRetry(
        () =>
          prisma.availabilityRule.findMany({
            where: {
              enabled: true,
              endDate: {
                lte: now,
                gte: new Date(now.getTime() - 5 * 60 * 1000), // Last 5 minutes
              },
            },
            include: {
              product: true,
            },
          }),
        3,
        'expired-rules-fetch'
      );

      for (const rule of expiredRules) {
        try {
          await this.processRuleExpiration(rule, result);
        } catch (error) {
          result.errors.push({
            productId: rule.productId,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      logger.error('Error processing expired rules', { error });
      throw error;
    }
  }

  /**
   * Re-evaluate product availability for affected products
   */
  private async reevaluateProducts(result: ProcessingResult): Promise<void> {
    try {
      // Get unique product IDs that need re-evaluation
      const affectedProductIds = new Set<string>();

      // Add products from errors (they need re-evaluation)
      result.errors.forEach(error => affectedProductIds.add(error.productId));

      if (affectedProductIds.size === 0) {
        return;
      }

      const productIds = Array.from(affectedProductIds);

      // Fetch and re-evaluate availability for affected products
      const availabilityRules = await AvailabilityQueries.getMultipleProductRules(productIds);
      const evaluations = await AvailabilityEngine.evaluateMultipleProducts(availabilityRules);

      for (const [productId, evaluation] of evaluations) {
        try {
          // Update product state if needed
          const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { id: true, name: true, isAvailable: true, visibility: true },
          });

          if (product) {
            const newState = evaluation.currentState;
            let shouldUpdate = false;
            const updates: any = {};

            // Determine if we need to update the product
            if (newState === AvailabilityState.AVAILABLE && !product.isAvailable) {
              updates.isAvailable = true;
              shouldUpdate = true;
            } else if (newState === AvailabilityState.HIDDEN && product.visibility !== 'PRIVATE') {
              updates.visibility = 'PRIVATE';
              shouldUpdate = true;
            } else if (newState === AvailabilityState.PRE_ORDER) {
              updates.isPreorder = true;
              shouldUpdate = true;
            }

            if (shouldUpdate) {
              await prisma.product.update({
                where: { id: productId },
                data: updates,
              });

              result.updated++;
              result.summary.stateChanges++;

              logger.info('Product state updated', {
                productId,
                productName: product.name,
                newState,
                updates,
              });
            }
          }
        } catch (error) {
          result.errors.push({
            productId,
            error: error instanceof Error ? error.message : 'Failed to update product state',
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      logger.error('Error re-evaluating products', { error });
      throw error;
    }
  }

  /**
   * Process a specific rule change
   */
  private async processRuleChange(rule: any, result: ProcessingResult): Promise<void> {
    const now = new Date();

    // Check if rule is starting
    if (
      rule.startDate &&
      rule.startDate <= now &&
      rule.startDate > new Date(now.getTime() - 5 * 60 * 1000)
    ) {
      logger.info('Processing rule activation', {
        ruleId: rule.id,
        ruleName: rule.name,
        productId: rule.productId,
        state: rule.state,
      });

      // Rule is starting - apply its state
      await this.applyRuleState(rule, result);
    }

    // Check if rule is ending
    if (
      rule.endDate &&
      rule.endDate <= now &&
      rule.endDate > new Date(now.getTime() - 5 * 60 * 1000)
    ) {
      logger.info('Processing rule deactivation', {
        ruleId: rule.id,
        ruleName: rule.name,
        productId: rule.productId,
      });

      // Rule is ending - revert to default or next highest priority rule
      await this.revertRuleState(rule, result);
    }
  }

  /**
   * Process rule expiration
   */
  private async processRuleExpiration(rule: any, result: ProcessingResult): Promise<void> {
    logger.info('Processing rule expiration', {
      ruleId: rule.id,
      ruleName: rule.name,
      productId: rule.productId,
    });

    await this.revertRuleState(rule, result);
  }

  /**
   * Apply rule state to product
   */
  private async applyRuleState(rule: any, result: ProcessingResult): Promise<void> {
    // Get current product state
    const currentProduct = await prisma.product.findUnique({
      where: { id: rule.productId },
      select: {
        id: true,
        name: true,
        isAvailable: true,
        visibility: true,
        isPreorder: true,
      },
    });

    if (!currentProduct) {
      throw new Error(`Product ${rule.productId} not found`);
    }

    const updates: any = {};
    let oldState = '';
    let newState = rule.state;

    // Determine current state
    if (!currentProduct.isAvailable || currentProduct.visibility === 'PRIVATE') {
      oldState = currentProduct.visibility === 'PRIVATE' ? 'HIDDEN' : 'UNAVAILABLE';
    } else if (currentProduct.isPreorder) {
      oldState = 'PRE_ORDER';
    } else {
      oldState = 'AVAILABLE';
    }

    switch (rule.state) {
      case AvailabilityState.AVAILABLE:
        updates.isAvailable = true;
        updates.visibility = 'PUBLIC';
        updates.isPreorder = false;
        break;
      case AvailabilityState.HIDDEN:
        updates.visibility = 'PRIVATE';
        break;
      case AvailabilityState.PRE_ORDER:
        updates.isPreorder = true;
        updates.isAvailable = true;
        updates.visibility = 'PUBLIC';
        break;
      case AvailabilityState.VIEW_ONLY:
        updates.isAvailable = false;
        updates.visibility = 'PUBLIC';
        updates.isPreorder = false;
        break;
    }

    if (Object.keys(updates).length > 0 && oldState !== newState) {
      await prisma.product.update({
        where: { id: rule.productId },
        data: updates,
      });

      result.summary.stateChanges++;

      // Send availability change notification
      try {
        const notificationService = NotificationService.getInstance();
        await notificationService.sendNotification({
          type: 'availability_change',
          productId: rule.productId,
          data: {
            oldState,
            newState,
            ruleName: rule.name,
            productName: currentProduct.name,
          },
        });
      } catch (error) {
        logger.error('Error sending availability change notification', {
          productId: rule.productId,
          error,
        });
      }
    }
  }

  /**
   * Revert rule state (find next applicable rule or default state)
   */
  private async revertRuleState(rule: any, result: ProcessingResult): Promise<void> {
    // Get all other active rules for this product
    const otherRules = await prisma.availabilityRule.findMany({
      where: {
        productId: rule.productId,
        enabled: true,
        id: { not: rule.id },
        OR: [{ startDate: null }, { startDate: { lte: new Date() } }],
        AND: [
          {
            OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
          },
        ],
      },
      orderBy: {
        priority: 'desc',
      },
    });

    // Apply highest priority rule, or revert to default
    if (otherRules.length > 0) {
      await this.applyRuleState(otherRules[0], result);
    } else {
      // Revert to default state
      await prisma.product.update({
        where: { id: rule.productId },
        data: {
          isAvailable: true,
          visibility: 'PUBLIC',
          isPreorder: false,
        },
      });

      result.summary.stateChanges++;
    }
  }

  /**
   * Send notifications for state changes
   */
  private async sendNotifications(result: ProcessingResult): Promise<void> {
    try {
      const notificationService = NotificationService.getInstance();

      // Send system alert if there were errors
      if (result.errors.length > 0) {
        await notificationService.sendNotification({
          type: 'system_alert',
          data: {
            title: 'Availability Processing Errors',
            message: `${result.errors.length} errors occurred during availability processing`,
            priority: result.errors.length > 5 ? 'high' : 'medium',
            alertData: {
              totalErrors: result.errors.length,
              processed: result.processed,
              updated: result.updated,
              duration: result.duration,
              errors: result.errors.slice(0, 5), // Include first 5 errors
            },
          },
        });
      }

      // Send success notification if significant changes were made
      if (result.summary.stateChanges > 10) {
        await notificationService.sendNotification({
          type: 'system_alert',
          data: {
            title: 'Bulk Availability Changes',
            message: `${result.summary.stateChanges} product availability states were updated`,
            priority: 'medium',
            alertData: {
              stateChanges: result.summary.stateChanges,
              processed: result.processed,
              updated: result.updated,
              duration: result.duration,
            },
          },
        });
      }

      result.summary.notificationsSent = result.errors.length > 0 ? 1 : 0;
      if (result.summary.stateChanges > 10) {
        result.summary.notificationsSent++;
      }

      logger.info('Notifications sent for availability processing', {
        stateChanges: result.summary.stateChanges,
        notificationsSent: result.summary.notificationsSent,
      });
    } catch (error) {
      logger.error('Error sending notifications', { error });
      // Don't throw - notifications are not critical to the main process
    }
  }

  /**
   * Cleanup old job records
   */
  private async cleanupOldJobs(): Promise<void> {
    // TODO: Implement job history cleanup
    // Remove job records older than 30 days
    logger.info('Job cleanup not implemented yet');
  }

  /**
   * Get current job status
   */
  static getStatus(): { isRunning: boolean; lastRun: Date | null; currentJobId: string | null } {
    return {
      isRunning: AvailabilityProcessor.isRunning,
      lastRun: AvailabilityProcessor.lastRun,
      currentJobId: AvailabilityProcessor.currentJobId,
    };
  }

  /**
   * Force stop current job (emergency use only)
   */
  static forceStop(): void {
    logger.warn('Force stopping availability processor');
    AvailabilityProcessor.isRunning = false;
    AvailabilityProcessor.currentJobId = null;
  }
}
