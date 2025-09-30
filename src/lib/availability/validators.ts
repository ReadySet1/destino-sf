import { z } from 'zod';
import { 
  AvailabilityRuleSchema, 
  AvailabilityState, 
  RuleType,
  type AvailabilityRule 
} from '@/types/availability';

/**
 * Additional validation functions for availability rules
 */
export class AvailabilityValidators {
  /**
   * Validate date range consistency
   */
  static validateDateRange(rule: Partial<AvailabilityRule>): string[] {
    const errors: string[] = [];

    if (rule.startDate && rule.endDate) {
      const start = new Date(rule.startDate);
      const end = new Date(rule.endDate);

      if (start >= end) {
        errors.push('Start date must be before end date');
      }

      // Don't allow dates too far in the past
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      
      if (start < twoYearsAgo) {
        errors.push('Start date cannot be more than 2 years in the past');
      }

      // Don't allow dates too far in the future
      const fiveYearsFromNow = new Date();
      fiveYearsFromNow.setFullYear(fiveYearsFromNow.getFullYear() + 5);
      
      if (end > fiveYearsFromNow) {
        errors.push('End date cannot be more than 5 years in the future');
      }
    }

    return errors;
  }

  /**
   * Validate seasonal configuration
   */
  static validateSeasonalConfig(rule: Partial<AvailabilityRule>): string[] {
    const errors: string[] = [];

    if (rule.ruleType === RuleType.SEASONAL && rule.seasonalConfig) {
      const config = rule.seasonalConfig;

      // Validate month/day combinations
      if (config.startMonth && config.startDay) {
        if (!this.isValidDatePair(config.startMonth, config.startDay)) {
          errors.push('Invalid start date for seasonal rule');
        }
      }

      if (config.endMonth && config.endDay) {
        if (!this.isValidDatePair(config.endMonth, config.endDay)) {
          errors.push('Invalid end date for seasonal rule');
        }
      }

      // Validate timezone
      if (config.timezone && !this.isValidTimezone(config.timezone)) {
        errors.push('Invalid timezone specified');
      }
    }

    return errors;
  }

  /**
   * Validate time restrictions
   */
  static validateTimeRestrictions(rule: Partial<AvailabilityRule>): string[] {
    const errors: string[] = [];

    if (rule.ruleType === RuleType.TIME_BASED && rule.timeRestrictions) {
      const restrictions = rule.timeRestrictions;

      // Validate days of week
      if (restrictions.daysOfWeek) {
        const invalidDays = restrictions.daysOfWeek.filter(day => day < 0 || day > 6);
        if (invalidDays.length > 0) {
          errors.push('Days of week must be between 0 (Sunday) and 6 (Saturday)');
        }

        if (restrictions.daysOfWeek.length === 0) {
          errors.push('At least one day of the week must be selected');
        }
      }

      // Validate time format and logic
      if (restrictions.startTime && restrictions.endTime) {
        if (!this.isValidTimeFormat(restrictions.startTime)) {
          errors.push('Invalid start time format (use HH:MM)');
        }
        
        if (!this.isValidTimeFormat(restrictions.endTime)) {
          errors.push('Invalid end time format (use HH:MM)');
        }

        // Note: We allow overnight time ranges (22:00 - 06:00)
        // so we don't validate that start < end
      }

      // Validate timezone
      if (restrictions.timezone && !this.isValidTimezone(restrictions.timezone)) {
        errors.push('Invalid timezone specified');
      }
    }

    return errors;
  }

  /**
   * Validate pre-order settings
   * @param rule - The rule to validate
   * @param skipFutureDateCheck - Skip the future date validation (useful for toggling old rules)
   */
  static validatePreOrderSettings(
    rule: Partial<AvailabilityRule>,
    skipFutureDateCheck: boolean = false
  ): string[] {
    const errors: string[] = [];

    console.log('[Validator] validatePreOrderSettings called', {
      skipFutureDateCheck,
      ruleState: rule.state,
      hasPreOrderSettings: !!rule.preOrderSettings,
    });

    // Skip pre-order validation entirely when skipFutureDateCheck is true (toggling existing rules)
    if (skipFutureDateCheck) {
      console.log('[Validator] Skipping pre-order validation due to skipFutureDateCheck');
      return errors;
    }

    // Only validate pre-order settings if the rule state is PRE_ORDER
    if (rule.state !== AvailabilityState.PRE_ORDER) {
      return errors;
    }

    if (rule.preOrderSettings) {
      const settings = rule.preOrderSettings;

      // Validate expected delivery date
      if (settings.expectedDeliveryDate) {
        const deliveryDate = new Date(settings.expectedDeliveryDate);
        const now = new Date();

        console.log('[Validator] Checking delivery date', {
          deliveryDate: deliveryDate.toISOString(),
          now: now.toISOString(),
          isPast: deliveryDate <= now,
        });

        if (deliveryDate <= now) {
          errors.push('Expected delivery date must be in the future');
        }
      }

      // Validate deposit amount
      if (settings.depositRequired && settings.depositAmount) {
        if (settings.depositAmount <= 0) {
          errors.push('Deposit amount must be greater than 0');
        }
      }

      // Validate max quantity
      if (settings.maxQuantity !== null && settings.maxQuantity !== undefined) {
        if (settings.maxQuantity <= 0) {
          errors.push('Maximum quantity must be greater than 0');
        }
      }
    }

    return errors;
  }

  /**
   * Validate rule consistency with product data
   */
  static validateRuleConsistency(
    rule: Partial<AvailabilityRule>,
    productData?: any
  ): string[] {
    const errors: string[] = [];

    // Validate that pre-order rules have appropriate settings
    if (rule.state === AvailabilityState.PRE_ORDER && !rule.preOrderSettings) {
      errors.push('Pre-order rules must have pre-order settings configured');
    }

    // Validate that view-only rules have appropriate settings
    if (rule.state === AvailabilityState.VIEW_ONLY && !rule.viewOnlySettings) {
      errors.push('View-only rules must have view-only settings configured');
    }

    // Validate rule type matches configuration
    if (rule.ruleType === RuleType.SEASONAL && !rule.seasonalConfig) {
      errors.push('Seasonal rules must have seasonal configuration');
    }

    if (rule.ruleType === RuleType.TIME_BASED && !rule.timeRestrictions) {
      errors.push('Time-based rules must have time restrictions');
    }

    if (rule.ruleType === RuleType.DATE_RANGE && !rule.startDate && !rule.endDate) {
      errors.push('Date range rules must have at least a start or end date');
    }

    // Validate priority range
    if (rule.priority !== undefined && (rule.priority < 0 || rule.priority > 1000)) {
      errors.push('Priority must be between 0 and 1000');
    }

    return errors;
  }

  /**
   * Comprehensive rule validation
   * @param rule - The rule to validate
   * @param productData - Optional product data for additional validation
   * @param skipFutureDateCheck - Skip future date validation (useful for toggling old rules)
   */
  static validateRule(
    rule: Partial<AvailabilityRule>,
    productData?: any,
    skipFutureDateCheck: boolean = false
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Schema validation
    try {
      AvailabilityRuleSchema.parse(rule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
      }
    }

    // Custom validations
    errors.push(...this.validateDateRange(rule));
    errors.push(...this.validateSeasonalConfig(rule));
    errors.push(...this.validateTimeRestrictions(rule));
    errors.push(...this.validatePreOrderSettings(rule, skipFutureDateCheck));
    errors.push(...this.validateRuleConsistency(rule, productData));

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate bulk operation request
   */
  static validateBulkRequest(request: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.productIds || !Array.isArray(request.productIds)) {
      errors.push('Product IDs must be provided as an array');
    } else if (request.productIds.length === 0) {
      errors.push('At least one product ID must be provided');
    } else if (request.productIds.length > 100) {
      errors.push('Cannot process more than 100 products at once');
    }

    if (!request.operation || !['create', 'update', 'delete'].includes(request.operation)) {
      errors.push('Operation must be create, update, or delete');
    }

    if (request.operation !== 'delete' && (!request.rules || !Array.isArray(request.rules))) {
      errors.push('Rules must be provided as an array for create and update operations');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Helper: Check if month/day combination is valid
   */
  private static isValidDatePair(month: number, day: number): boolean {
    try {
      const date = new Date(2024, month - 1, day); // Use leap year
      return date.getMonth() === month - 1 && date.getDate() === day;
    } catch {
      return false;
    }
  }

  /**
   * Helper: Check if time format is valid (HH:MM)
   */
  private static isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Helper: Check if timezone is valid
   */
  private static isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }
}

export default AvailabilityValidators;
