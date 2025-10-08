import { prisma } from '@/lib/db';
import { 
  type AvailabilityRule, 
  type BulkAvailabilityRequest,
  AvailabilityState 
} from '@/types/availability';
import { logger } from '@/utils/logger';

/**
 * Database queries for availability system
 */
export class AvailabilityQueries {
  /**
   * Get all rules for a product
   */
  static async getProductRules(productId: string): Promise<AvailabilityRule[]> {
    try {
      const rules = await prisma.availabilityRule.findMany({
        where: {
          productId,
          deletedAt: null
        },
        include: {
          createdByProfile: {
            select: { id: true, name: true, email: true }
          },
          updatedByProfile: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ]
      });

      return rules as AvailabilityRule[];
    } catch (error) {
      logger.error('Error getting product rules', {
        productId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get rules for multiple products
   */
  static async getMultipleProductRules(
    productIds: string[]
  ): Promise<Map<string, AvailabilityRule[]>> {
    try {
      const rules = await prisma.availabilityRule.findMany({
        where: {
          productId: { in: productIds },
          deletedAt: null
        },
        include: {
          createdByProfile: {
            select: { id: true, name: true, email: true }
          },
          updatedByProfile: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ]
      });

      // Group rules by product ID
      const ruleMap = new Map<string, AvailabilityRule[]>();
      
      for (const productId of productIds) {
        ruleMap.set(productId, []);
      }

      for (const rule of rules) {
        const productRules = ruleMap.get(rule.productId) || [];
        productRules.push(rule as AvailabilityRule);
        ruleMap.set(rule.productId, productRules);
      }

      return ruleMap;
    } catch (error) {
      logger.error('Error getting multiple product rules', {
        productCount: productIds.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Create a new availability rule
   */
  static async createRule(
    rule: Omit<AvailabilityRule, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<AvailabilityRule> {
    try {
      // Clean up null values for JSON fields
      const cleanRule = {
        ...rule,
        seasonalConfig: rule.seasonalConfig || undefined,
        preOrderSettings: rule.preOrderSettings || undefined,
        viewOnlySettings: rule.viewOnlySettings || undefined,
        timeRestrictions: rule.timeRestrictions || undefined,
        createdBy: userId,
        updatedBy: userId
      };

      const newRule = await prisma.availabilityRule.create({
        data: cleanRule,
        include: {
          createdByProfile: {
            select: { id: true, name: true, email: true }
          },
          updatedByProfile: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      logger.info('Created availability rule', {
        ruleId: newRule.id,
        productId: newRule.productId,
        ruleType: newRule.ruleType,
        state: newRule.state
      });

      return newRule as AvailabilityRule;
    } catch (error) {
      logger.error('Error creating availability rule', {
        productId: rule.productId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get a single availability rule by ID
   */
  static async getRuleById(ruleId: string): Promise<AvailabilityRule | null> {
    try {
      const rule = await prisma.availabilityRule.findUnique({
        where: { id: ruleId },
        include: {
          createdByProfile: {
            select: { id: true, name: true, email: true }
          },
          updatedByProfile: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      if (rule) {
        logger.info('Retrieved availability rule by ID', { ruleId });
      }

      return rule as AvailabilityRule | null;
    } catch (error) {
      logger.error('Error retrieving availability rule by ID', {
        ruleId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Update an existing availability rule
   */
  static async updateRule(
    ruleId: string,
    updates: Partial<AvailabilityRule>,
    userId: string
  ): Promise<AvailabilityRule> {
    try {
      // Remove fields that cannot be updated via Prisma
      // productId is part of a relation and cannot be updated directly
      // If you need to move a rule to a different product, delete and recreate
      const { productId, productIds, id, createdAt, updatedAt, createdBy, ...allowedUpdates } = updates as any;

      // Clean up null values for JSON fields
      const cleanUpdates = {
        ...allowedUpdates,
        seasonalConfig: allowedUpdates.seasonalConfig === null ? undefined : allowedUpdates.seasonalConfig,
        preOrderSettings: allowedUpdates.preOrderSettings === null ? undefined : allowedUpdates.preOrderSettings,
        viewOnlySettings: allowedUpdates.viewOnlySettings === null ? undefined : allowedUpdates.viewOnlySettings,
        timeRestrictions: allowedUpdates.timeRestrictions === null ? undefined : allowedUpdates.timeRestrictions,
        updatedBy: userId
      };

      const updatedRule = await prisma.availabilityRule.update({
        where: { id: ruleId },
        data: cleanUpdates,
        include: {
          createdByProfile: {
            select: { id: true, name: true, email: true }
          },
          updatedByProfile: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      logger.info('Updated availability rule', {
        ruleId,
        changes: Object.keys(allowedUpdates)
      });

      return updatedRule as AvailabilityRule;
    } catch (error) {
      logger.error('Error updating availability rule', {
        ruleId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Soft delete a rule
   */
  static async deleteRule(ruleId: string, userId?: string): Promise<boolean> {
    try {
      await prisma.availabilityRule.update({
        where: { id: ruleId },
        data: {
          deletedAt: new Date(),
          ...(userId && { updatedBy: userId })
        }
      });

      // Also delete associated schedules
      await prisma.availabilitySchedule.deleteMany({
        where: { ruleId }
      });

      logger.info('Deleted availability rule', { ruleId });
      return true;
    } catch (error) {
      logger.error('Error deleting availability rule', {
        ruleId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get all availability rules (for admin management)
   */
  static async getAllRules(): Promise<AvailabilityRule[]> {
    try {
      const rules = await prisma.availabilityRule.findMany({
        where: {
          deletedAt: null
        },
        include: {
          createdByProfile: {
            select: { id: true, name: true, email: true }
          },
          updatedByProfile: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      logger.info('Retrieved all availability rules', { 
        rulesCount: rules.length 
      });

      return rules as AvailabilityRule[];
    } catch (error) {
      logger.error('Error retrieving all availability rules', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get active rules that should be evaluated now
   */
  static async getActiveRules(currentTime: Date = new Date()): Promise<AvailabilityRule[]> {
    try {
      const rules = await prisma.availabilityRule.findMany({
        where: {
          enabled: true,
          deletedAt: null,
          OR: [
            // Rules with no date restrictions
            {
              AND: [
                { startDate: null },
                { endDate: null }
              ]
            },
            // Rules that are currently active
            {
              AND: [
                {
                  OR: [
                    { startDate: null },
                    { startDate: { lte: currentTime } }
                  ]
                },
                {
                  OR: [
                    { endDate: null },
                    { endDate: { gte: currentTime } }
                  ]
                }
              ]
            }
          ]
        },
        include: {
          product: {
            select: { id: true, name: true, active: true }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ]
      });

      return rules.filter(rule => rule.product.active) as AvailabilityRule[];
    } catch (error) {
      logger.error('Error getting active rules', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Bulk create rules
   */
  static async bulkCreateRules(
    rules: Omit<AvailabilityRule, 'id' | 'createdAt' | 'updatedAt'>[],
    userId: string
  ): Promise<AvailabilityRule[]> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const createdRules: AvailabilityRule[] = [];

        for (const rule of rules) {
          // Clean up null values for JSON fields
          const cleanRule = {
            ...rule,
            seasonalConfig: rule.seasonalConfig || undefined,
            preOrderSettings: rule.preOrderSettings || undefined,
            viewOnlySettings: rule.viewOnlySettings || undefined,
            timeRestrictions: rule.timeRestrictions || undefined,
            createdBy: userId,
            updatedBy: userId
          };

          const newRule = await tx.availabilityRule.create({
            data: cleanRule,
            include: {
              createdByProfile: {
                select: { id: true, name: true, email: true }
              },
              updatedByProfile: {
                select: { id: true, name: true, email: true }
              }
            }
          });
          createdRules.push(newRule as AvailabilityRule);
        }

        return createdRules;
      });

      logger.info('Bulk created availability rules', {
        count: result.length
      });

      return result;
    } catch (error) {
      logger.error('Error bulk creating rules', {
        count: rules.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Bulk update rules
   */
  static async bulkUpdateRules(
    updates: Array<{ id: string; data: Partial<AvailabilityRule> }>,
    userId: string
  ): Promise<AvailabilityRule[]> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const updatedRules: AvailabilityRule[] = [];

        for (const update of updates) {
          // Remove fields that cannot be updated via Prisma
          const { productId, productIds, id, createdAt, updatedAt, createdBy, ...allowedData } = update.data as any;

          // Clean up null values for JSON fields
          const cleanUpdateData = {
            ...allowedData,
            seasonalConfig: allowedData.seasonalConfig === null ? undefined : allowedData.seasonalConfig,
            preOrderSettings: allowedData.preOrderSettings === null ? undefined : allowedData.preOrderSettings,
            viewOnlySettings: allowedData.viewOnlySettings === null ? undefined : allowedData.viewOnlySettings,
            timeRestrictions: allowedData.timeRestrictions === null ? undefined : allowedData.timeRestrictions,
            updatedBy: userId
          };

          const updatedRule = await tx.availabilityRule.update({
            where: { id: update.id },
            data: cleanUpdateData,
            include: {
              createdByProfile: {
                select: { id: true, name: true, email: true }
              },
              updatedByProfile: {
                select: { id: true, name: true, email: true }
              }
            }
          });
          updatedRules.push(updatedRule as AvailabilityRule);
        }

        return updatedRules;
      });

      logger.info('Bulk updated availability rules', {
        count: result.length
      });

      return result;
    } catch (error) {
      logger.error('Error bulk updating rules', {
        count: updates.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Bulk delete rules
   */
  static async bulkDeleteRules(ruleIds: string[], userId: string): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        // Soft delete rules
        await tx.availabilityRule.updateMany({
          where: { id: { in: ruleIds } },
          data: {
            deletedAt: new Date(),
            updatedBy: userId
          }
        });

        // Delete associated schedules
        await tx.availabilitySchedule.deleteMany({
          where: { ruleId: { in: ruleIds } }
        });
      });

      logger.info('Bulk deleted availability rules', {
        count: ruleIds.length
      });
    } catch (error) {
      logger.error('Error bulk deleting rules', {
        count: ruleIds.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get rules with conflicts
   */
  static async getRulesWithConflicts(productId: string): Promise<{
    rules: AvailabilityRule[];
    conflicts: Array<{
      rule1Id: string;
      rule2Id: string;
      conflictType: string;
    }>;
  }> {
    try {
      const rules = await this.getProductRules(productId);
      const conflicts: Array<{
        rule1Id: string;
        rule2Id: string;
        conflictType: string;
      }> = [];

      // Check for priority conflicts
      for (let i = 0; i < rules.length; i++) {
        for (let j = i + 1; j < rules.length; j++) {
          const rule1 = rules[i];
          const rule2 = rules[j];

          if (rule1.priority === rule2.priority && rule1.enabled && rule2.enabled) {
            conflicts.push({
              rule1Id: rule1.id!,
              rule2Id: rule2.id!,
              conflictType: 'priority'
            });
          }

          // Check for date overlaps with different states
          if (this.hasDateOverlap(rule1, rule2) && rule1.state !== rule2.state) {
            conflicts.push({
              rule1Id: rule1.id!,
              rule2Id: rule2.id!,
              conflictType: 'date_overlap'
            });
          }
        }
      }

      return { rules, conflicts };
    } catch (error) {
      logger.error('Error getting rules with conflicts', {
        productId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Helper: Check if two rules have overlapping date ranges
   */
  private static hasDateOverlap(rule1: AvailabilityRule, rule2: AvailabilityRule): boolean {
    if (!rule1.startDate || !rule1.endDate || !rule2.startDate || !rule2.endDate) {
      return false;
    }

    const start1 = new Date(rule1.startDate);
    const end1 = new Date(rule1.endDate);
    const start2 = new Date(rule2.startDate);
    const end2 = new Date(rule2.endDate);

    return start1 <= end2 && start2 <= end1;
  }

  /**
   * Get rule statistics
   */
  static async getRuleStatistics(): Promise<{
    totalRules: number;
    activeRules: number;
    rulesByType: Record<string, number>;
    rulesByState: Record<string, number>;
  }> {
    try {
      const [totalRules, activeRules, rulesByType, rulesByState] = await Promise.all([
        prisma.availabilityRule.count({
          where: { deletedAt: null }
        }),
        prisma.availabilityRule.count({
          where: { enabled: true, deletedAt: null }
        }),
        prisma.availabilityRule.groupBy({
          by: ['ruleType'],
          where: { deletedAt: null },
          _count: true
        }),
        prisma.availabilityRule.groupBy({
          by: ['state'],
          where: { deletedAt: null },
          _count: true
        })
      ]);

      const typeStats = rulesByType.reduce((acc, item) => {
        acc[item.ruleType] = item._count;
        return acc;
      }, {} as Record<string, number>);

      const stateStats = rulesByState.reduce((acc, item) => {
        acc[item.state] = item._count;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalRules,
        activeRules,
        rulesByType: typeStats,
        rulesByState: stateStats
      };
    } catch (error) {
      logger.error('Error getting rule statistics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}

export default AvailabilityQueries;
