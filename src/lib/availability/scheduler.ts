import { 
  type AvailabilityRule, 
  type AvailabilitySchedule,
  AvailabilityState 
} from '@/types/availability';
import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';
import AvailabilityEngine from './engine';

/**
 * Availability Scheduler Service
 * Handles automated scheduling and processing of availability state changes
 */
export class AvailabilityScheduler {
  /**
   * Schedule all upcoming state changes for a rule
   */
  static async scheduleRuleChanges(rule: AvailabilityRule): Promise<void> {
    try {
      // Clear existing schedules for this rule
      await prisma.availabilitySchedule.deleteMany({
        where: { ruleId: rule.id }
      });

      const schedules: Omit<AvailabilitySchedule, 'id'>[] = [];

      // Schedule start date change
      if (rule.startDate) {
        schedules.push({
          ruleId: rule.id!,
          scheduledAt: new Date(rule.startDate),
          stateChange: `activate_${rule.state}`,
          processed: false,
          processedAt: null,
          errorMessage: null
        });
      }

      // Schedule end date change
      if (rule.endDate) {
        schedules.push({
          ruleId: rule.id!,
          scheduledAt: new Date(rule.endDate),
          stateChange: `deactivate_${rule.state}`,
          processed: false,
          processedAt: null,
          errorMessage: null
        });
      }

      // Schedule seasonal changes
      if (rule.ruleType === 'seasonal' && rule.seasonalConfig) {
        const seasonalSchedules = this.generateSeasonalSchedules(rule);
        schedules.push(...seasonalSchedules);
      }

      // Create all schedules
      if (schedules.length > 0) {
        await prisma.availabilitySchedule.createMany({
          data: schedules
        });

        logger.info('Scheduled availability changes', {
          ruleId: rule.id,
          schedulesCreated: schedules.length
        });
      }
    } catch (error) {
      logger.error('Error scheduling rule changes', {
        ruleId: rule.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Generate seasonal schedule entries for the next 2 years
   */
  private static generateSeasonalSchedules(rule: AvailabilityRule): Omit<AvailabilitySchedule, 'id'>[] {
    if (!rule.seasonalConfig) return [];

    const schedules: Omit<AvailabilitySchedule, 'id'>[] = [];
    const config = rule.seasonalConfig as any;
    const currentYear = new Date().getFullYear();

    // Generate schedules for current and next year
    for (let year = currentYear; year <= currentYear + 1; year++) {
      // Start of season
      const startDate = new Date(year, config.startMonth - 1, config.startDay);
      if (startDate > new Date()) {
        schedules.push({
          ruleId: rule.id!,
          scheduledAt: startDate,
          stateChange: `seasonal_start_${rule.state}`,
          processed: false,
          processedAt: null,
          errorMessage: null
        });
      }

      // End of season
      const endDate = new Date(year, config.endMonth - 1, config.endDay);
      if (endDate > new Date()) {
        schedules.push({
          ruleId: rule.id!,
          scheduledAt: endDate,
          stateChange: `seasonal_end_${rule.state}`,
          processed: false,
          processedAt: null,
          errorMessage: null
        });
      }
    }

    return schedules;
  }

  /**
   * Process pending scheduled changes
   */
  static async processPendingChanges(): Promise<void> {
    try {
      const now = new Date();
      
      // Get all pending schedules that are due
      const pendingSchedules = await prisma.availabilitySchedule.findMany({
        where: {
          processed: false,
          scheduledAt: {
            lte: now
          }
        },
        include: {
          rule: {
            include: {
              product: true
            }
          }
        },
        orderBy: {
          scheduledAt: 'asc'
        }
      });

      logger.info('Processing pending availability changes', {
        count: pendingSchedules.length
      });

      // Process each schedule
      for (const schedule of pendingSchedules) {
        try {
          await this.processScheduleChange(schedule as any);
          
          // Mark as processed
          await prisma.availabilitySchedule.update({
            where: { id: schedule.id },
            data: {
              processed: true,
              processedAt: now
            }
          });

        } catch (error) {
          // Mark as failed with error message
          await prisma.availabilitySchedule.update({
            where: { id: schedule.id },
            data: {
              processed: true,
              processedAt: now,
              errorMessage: error instanceof Error ? error.message : 'Unknown error'
            }
          });

          logger.error('Error processing schedule change', {
            scheduleId: schedule.id,
            ruleId: schedule.ruleId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

    } catch (error) {
      logger.error('Error processing pending changes', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Process a single schedule change
   */
  private static async processScheduleChange(
    schedule: AvailabilitySchedule & {
      rule: AvailabilityRule & { product: any }
    }
  ): Promise<void> {
    const { stateChange, rule } = schedule;
    
    logger.info('Processing availability change', {
      scheduleId: schedule.id,
      ruleId: rule.id,
      productId: rule.productId,
      stateChange
    });

    // The actual state change is handled by the evaluation engine
    // This just triggers a re-evaluation for the product
    // You could also implement caching invalidation here

    // Optionally send notifications or trigger webhooks
    await this.notifyStateChange(rule.productId, stateChange);
  }

  /**
   * Send notifications for state changes
   */
  private static async notifyStateChange(
    productId: string, 
    stateChange: string
  ): Promise<void> {
    // Implementation for notifications
    // Could send emails, webhooks, or update other systems
    logger.info('Availability state change notification', {
      productId,
      stateChange
    });
  }

  /**
   * Clean up old processed schedules
   */
  static async cleanupOldSchedules(daysOld: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await prisma.availabilitySchedule.deleteMany({
        where: {
          processed: true,
          processedAt: {
            lt: cutoffDate
          }
        }
      });

      logger.info('Cleaned up old availability schedules', {
        deletedCount: result.count,
        cutoffDate
      });
    } catch (error) {
      logger.error('Error cleaning up old schedules', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Reschedule all rules (useful after system changes)
   */
  static async rescheduleAllRules(): Promise<void> {
    try {
      const rules = await prisma.availabilityRule.findMany({
        where: {
          enabled: true,
          deletedAt: null
        }
      });

      logger.info('Rescheduling all availability rules', {
        rulesCount: rules.length
      });

      for (const rule of rules) {
        await this.scheduleRuleChanges(rule as AvailabilityRule);
      }

      logger.info('Completed rescheduling all rules');
    } catch (error) {
      logger.error('Error rescheduling all rules', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get upcoming scheduled changes for a product
   */
  static async getUpcomingChanges(
    productId: string,
    limitDays: number = 30
  ): Promise<AvailabilitySchedule[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + limitDays);

    return prisma.availabilitySchedule.findMany({
      where: {
        rule: {
          productId
        },
        processed: false,
        scheduledAt: {
          gte: new Date(),
          lte: futureDate
        }
      },
      include: {
        rule: true
      },
      orderBy: {
        scheduledAt: 'asc'
      }
    }) as Promise<AvailabilitySchedule[]>;
  }
}

export default AvailabilityScheduler;
