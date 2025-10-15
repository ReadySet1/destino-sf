import {
  AvailabilityState,
  RuleType,
  type AvailabilityRule,
  type AvailabilityEvaluation,
  type SeasonalConfig,
  type TimeRestrictions,
} from '@/types/availability';
import { logger } from '@/utils/logger';

/**
 * Availability Rule Evaluation Engine
 * Processes availability rules and determines current product state
 */
export class AvailabilityEngine {
  /**
   * Evaluate all rules for a product and return current availability state
   */
  static async evaluateProduct(
    productId: string,
    rules: AvailabilityRule[],
    currentTime: Date = new Date()
  ): Promise<AvailabilityEvaluation> {
    try {
      // Filter enabled rules and sort by priority (highest first)
      const activeRules = rules
        .filter(rule => rule.enabled)
        .sort((a, b) => b.priority - a.priority);

      // Find the highest priority rule that matches current conditions
      const applicableRules: AvailabilityRule[] = [];
      let currentState = AvailabilityState.AVAILABLE;

      for (const rule of activeRules) {
        if (this.isRuleApplicable(rule, currentTime)) {
          applicableRules.push(rule);

          // First applicable rule wins (highest priority)
          if (applicableRules.length === 1) {
            currentState = rule.state as AvailabilityState;
          }
        }
      }

      // Calculate next state change
      const nextStateChange = this.calculateNextStateChange(activeRules, currentTime);

      const evaluation: AvailabilityEvaluation = {
        productId,
        currentState,
        appliedRules: applicableRules,
        computedAt: currentTime,
        nextStateChange,
      };

      logger.info('Product availability evaluated', {
        productId,
        currentState,
        rulesApplied: applicableRules.length,
        nextChange: nextStateChange?.date,
      });

      return evaluation;
    } catch (error) {
      logger.error('Error evaluating product availability', {
        productId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Fallback to available state on error
      return {
        productId,
        currentState: AvailabilityState.AVAILABLE,
        appliedRules: [],
        computedAt: currentTime,
      };
    }
  }

  /**
   * Check if a rule is applicable at the given time
   */
  private static isRuleApplicable(rule: AvailabilityRule, currentTime: Date): boolean {
    switch (rule.ruleType) {
      case RuleType.DATE_RANGE:
        return this.isDateRangeApplicable(rule, currentTime);

      case RuleType.SEASONAL:
        return this.isSeasonalRuleApplicable(rule, currentTime);

      case RuleType.TIME_BASED:
        return this.isTimeBasedRuleApplicable(rule, currentTime);

      case RuleType.CUSTOM:
        // Custom rules are always applicable (handled by business logic)
        return true;

      case RuleType.INVENTORY:
        // Inventory rules need additional inventory data (not implemented here)
        return true;

      default:
        return false;
    }
  }

  /**
   * Check if date range rule is applicable
   */
  private static isDateRangeApplicable(rule: AvailabilityRule, currentTime: Date): boolean {
    const { startDate, endDate } = rule;

    if (!startDate && !endDate) {
      return true; // No date restrictions
    }

    if (startDate && currentTime < new Date(startDate)) {
      return false; // Before start date
    }

    if (endDate && currentTime > new Date(endDate)) {
      return false; // After end date
    }

    return true;
  }

  /**
   * Check if seasonal rule is applicable
   */
  private static isSeasonalRuleApplicable(rule: AvailabilityRule, currentTime: Date): boolean {
    if (!rule.seasonalConfig) {
      return false;
    }

    const config = rule.seasonalConfig as SeasonalConfig;
    const now = new Date(currentTime);

    // Convert to specified timezone
    const timeZone = config.timezone || 'America/Los_Angeles';
    const localTime = new Date(now.toLocaleString('en-US', { timeZone }));

    const currentYear = localTime.getFullYear();
    const currentMonth = localTime.getMonth() + 1; // 0-based to 1-based
    const currentDay = localTime.getDate();

    // Create start and end dates for current year
    const startDate = new Date(currentYear, config.startMonth - 1, config.startDay);
    const endDate = new Date(currentYear, config.endMonth - 1, config.endDay);

    // Handle cross-year seasonal rules (e.g., Nov 15 - Feb 15)
    if (startDate > endDate) {
      // Rule spans across years
      return localTime >= startDate || localTime <= endDate;
    } else {
      // Rule within same year
      return localTime >= startDate && localTime <= endDate;
    }
  }

  /**
   * Check if time-based rule is applicable
   */
  private static isTimeBasedRuleApplicable(rule: AvailabilityRule, currentTime: Date): boolean {
    if (!rule.timeRestrictions) {
      return true;
    }

    const restrictions = rule.timeRestrictions as TimeRestrictions;
    const timeZone = restrictions.timezone || 'America/Los_Angeles';
    const localTime = new Date(currentTime.toLocaleString('en-US', { timeZone }));

    // Check day of week (0 = Sunday, 6 = Saturday)
    const currentDayOfWeek = localTime.getDay();
    if (!restrictions.daysOfWeek.includes(currentDayOfWeek)) {
      return false;
    }

    // Check time range
    const currentHour = localTime.getHours();
    const currentMinute = localTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = restrictions.startTime.split(':').map(Number);
    const [endHour, endMinute] = restrictions.endTime.split(':').map(Number);

    const startTimeMinutes = startHour * 60 + startMinute;
    const endTimeMinutes = endHour * 60 + endMinute;

    // Handle overnight time ranges (e.g., 22:00 - 06:00)
    if (startTimeMinutes > endTimeMinutes) {
      return currentTimeMinutes >= startTimeMinutes || currentTimeMinutes <= endTimeMinutes;
    } else {
      return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes;
    }
  }

  /**
   * Calculate when the next state change will occur
   */
  private static calculateNextStateChange(
    rules: AvailabilityRule[],
    currentTime: Date
  ): { date: Date; newState: AvailabilityState; rule: AvailabilityRule } | undefined {
    const upcomingChanges: Array<{
      date: Date;
      state: AvailabilityState;
      rule: AvailabilityRule;
    }> = [];

    for (const rule of rules) {
      // Calculate upcoming start dates
      if (rule.startDate && new Date(rule.startDate) > currentTime) {
        upcomingChanges.push({
          date: new Date(rule.startDate),
          state: rule.state as AvailabilityState,
          rule,
        });
      }

      // Calculate upcoming end dates (state becomes available)
      if (rule.endDate && new Date(rule.endDate) > currentTime) {
        upcomingChanges.push({
          date: new Date(rule.endDate),
          state: AvailabilityState.AVAILABLE,
          rule,
        });
      }

      // Calculate seasonal rule changes
      if (rule.ruleType === RuleType.SEASONAL && rule.seasonalConfig) {
        const seasonalChanges = this.calculateSeasonalChanges(rule, currentTime);
        upcomingChanges.push(...seasonalChanges);
      }
    }

    // Sort by date and return the earliest change
    upcomingChanges.sort((a, b) => a.date.getTime() - b.date.getTime());

    const nextChange = upcomingChanges[0];
    return nextChange
      ? {
          date: nextChange.date,
          newState: nextChange.state,
          rule: nextChange.rule,
        }
      : undefined;
  }

  /**
   * Calculate upcoming seasonal rule changes
   */
  private static calculateSeasonalChanges(
    rule: AvailabilityRule,
    currentTime: Date
  ): Array<{ date: Date; state: AvailabilityState; rule: AvailabilityRule }> {
    if (!rule.seasonalConfig) return [];

    const config = rule.seasonalConfig as SeasonalConfig;
    const changes: Array<{ date: Date; state: AvailabilityState; rule: AvailabilityRule }> = [];

    const currentYear = currentTime.getFullYear();

    // Calculate start and end dates for current and next year
    for (let year = currentYear; year <= currentYear + 1; year++) {
      const startDate = new Date(year, config.startMonth - 1, config.startDay);
      const endDate = new Date(year, config.endMonth - 1, config.endDay);

      if (startDate > currentTime) {
        changes.push({
          date: startDate,
          state: rule.state as AvailabilityState,
          rule,
        });
      }

      if (endDate > currentTime) {
        changes.push({
          date: endDate,
          state: AvailabilityState.AVAILABLE,
          rule,
        });
      }
    }

    return changes;
  }

  /**
   * Batch evaluate multiple products
   */
  static async evaluateMultipleProducts(
    productRules: Map<string, AvailabilityRule[]>,
    currentTime: Date = new Date()
  ): Promise<Map<string, AvailabilityEvaluation>> {
    const evaluations = new Map<string, AvailabilityEvaluation>();

    const promises = Array.from(productRules.entries()).map(async ([productId, rules]) => {
      const evaluation = await this.evaluateProduct(productId, rules, currentTime);
      evaluations.set(productId, evaluation);
    });

    await Promise.all(promises);
    return evaluations;
  }

  /**
   * Check for rule conflicts
   */
  static detectRuleConflicts(rules: AvailabilityRule[]): Array<{
    rule1: AvailabilityRule;
    rule2: AvailabilityRule;
    conflictType: 'priority' | 'date_overlap' | 'state_mismatch';
  }> {
    const conflicts: Array<{
      rule1: AvailabilityRule;
      rule2: AvailabilityRule;
      conflictType: 'priority' | 'date_overlap' | 'state_mismatch';
    }> = [];

    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const rule1 = rules[i];
        const rule2 = rules[j];

        // Check for same priority conflict
        if (rule1.priority === rule2.priority && rule1.enabled && rule2.enabled) {
          conflicts.push({
            rule1,
            rule2,
            conflictType: 'priority',
          });
        }

        // Check for date overlaps with different states
        if (this.hasDateOverlap(rule1, rule2) && rule1.state !== rule2.state) {
          conflicts.push({
            rule1,
            rule2,
            conflictType: 'date_overlap',
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if two rules have overlapping date ranges
   */
  private static hasDateOverlap(rule1: AvailabilityRule, rule2: AvailabilityRule): boolean {
    // Simple date range overlap check
    if (!rule1.startDate || !rule1.endDate || !rule2.startDate || !rule2.endDate) {
      return false; // Can't determine overlap without complete date ranges
    }

    const start1 = new Date(rule1.startDate);
    const end1 = new Date(rule1.endDate);
    const start2 = new Date(rule2.startDate);
    const end2 = new Date(rule2.endDate);

    return start1 <= end2 && start2 <= end1;
  }
}

export default AvailabilityEngine;
