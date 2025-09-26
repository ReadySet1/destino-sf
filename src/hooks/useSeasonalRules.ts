'use client';

import { useState, useCallback, useMemo } from 'react';
import { 
  type AvailabilityRule,
  type SeasonalConfig,
  RuleType,
  AvailabilityState
} from '@/types/availability';

interface SeasonalTemplate {
  name: string;
  description: string;
  config: SeasonalConfig;
  suggestedState: AvailabilityState;
}

interface UseSeasonalRulesReturn {
  templates: SeasonalTemplate[];
  generateSeasonalRule: (
    productId: string,
    template: SeasonalTemplate,
    customizations?: Partial<AvailabilityRule>
  ) => AvailabilityRule;
  validateSeasonalConfig: (config: SeasonalConfig) => { isValid: boolean; errors: string[] };
  isDateInSeason: (date: Date, config: SeasonalConfig) => boolean;
  getNextSeasonDates: (config: SeasonalConfig, fromDate?: Date) => { start: Date; end: Date };
}

/**
 * Hook for managing seasonal availability rules
 */
export function useSeasonalRules(): UseSeasonalRulesReturn {
  const templates: SeasonalTemplate[] = useMemo(() => [
    {
      name: 'Holiday Season',
      description: 'Available during winter holiday season (Nov 15 - Jan 15)',
      config: {
        startMonth: 11,
        startDay: 15,
        endMonth: 1,
        endDay: 15,
        yearly: true,
        timezone: 'America/Los_Angeles'
      },
      suggestedState: AvailabilityState.AVAILABLE
    },
    {
      name: 'Summer Menu',
      description: 'Special summer items (June 1 - August 31)',
      config: {
        startMonth: 6,
        startDay: 1,
        endMonth: 8,
        endDay: 31,
        yearly: true,
        timezone: 'America/Los_Angeles'
      },
      suggestedState: AvailabilityState.AVAILABLE
    },
    {
      name: 'Spring Limited',
      description: 'Spring seasonal offerings (March 20 - June 20)',
      config: {
        startMonth: 3,
        startDay: 20,
        endMonth: 6,
        endDay: 20,
        yearly: true,
        timezone: 'America/Los_Angeles'
      },
      suggestedState: AvailabilityState.AVAILABLE
    },
    {
      name: 'Fall Harvest',
      description: 'Fall seasonal items (September 1 - November 30)',
      config: {
        startMonth: 9,
        startDay: 1,
        endMonth: 11,
        endDay: 30,
        yearly: true,
        timezone: 'America/Los_Angeles'
      },
      suggestedState: AvailabilityState.AVAILABLE
    },
    {
      name: 'Weekend Special',
      description: 'Weekend-only availability with seasonal timing',
      config: {
        startMonth: 1,
        startDay: 1,
        endMonth: 12,
        endDay: 31,
        yearly: true,
        timezone: 'America/Los_Angeles'
      },
      suggestedState: AvailabilityState.AVAILABLE
    }
  ], []);

  const generateSeasonalRule = useCallback((
    productId: string,
    template: SeasonalTemplate,
    customizations?: Partial<AvailabilityRule>
  ): AvailabilityRule => {
    return {
      id: undefined,
      productId,
      name: customizations?.name || `${template.name} Rule`,
      enabled: true,
      priority: customizations?.priority || 50,
      ruleType: RuleType.SEASONAL,
      state: customizations?.state || template.suggestedState,
      startDate: null,
      endDate: null,
      seasonalConfig: { ...template.config, ...customizations?.seasonalConfig },
      timeRestrictions: customizations?.timeRestrictions || null,
      preOrderSettings: customizations?.preOrderSettings || null,
      viewOnlySettings: customizations?.viewOnlySettings || null,
      overrideSquare: customizations?.overrideSquare ?? true,
      ...customizations
    } as AvailabilityRule;
  }, []);

  const validateSeasonalConfig = useCallback((config: SeasonalConfig): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Validate months
    if (config.startMonth < 1 || config.startMonth > 12) {
      errors.push('Start month must be between 1 and 12');
    }
    if (config.endMonth < 1 || config.endMonth > 12) {
      errors.push('End month must be between 1 and 12');
    }

    // Validate days (basic check - doesn't account for different month lengths)
    if (config.startDay < 1 || config.startDay > 31) {
      errors.push('Start day must be between 1 and 31');
    }
    if (config.endDay < 1 || config.endDay > 31) {
      errors.push('End day must be between 1 and 31');
    }

    // Validate specific date combinations
    try {
      // Test with a leap year to catch February 29th cases
      const testYear = 2024;
      const startDate = new Date(testYear, config.startMonth - 1, config.startDay);
      const endDate = new Date(testYear, config.endMonth - 1, config.endDay);

      if (startDate.getDate() !== config.startDay || startDate.getMonth() !== config.startMonth - 1) {
        errors.push('Invalid start date combination');
      }
      if (endDate.getDate() !== config.endDay || endDate.getMonth() !== config.endMonth - 1) {
        errors.push('Invalid end date combination');
      }
    } catch {
      errors.push('Invalid date configuration');
    }

    // Validate timezone
    try {
      Intl.DateTimeFormat(undefined, { timeZone: config.timezone });
    } catch {
      errors.push('Invalid timezone');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  const isDateInSeason = useCallback((date: Date, config: SeasonalConfig): boolean => {
    const timeZone = config.timezone || 'America/Los_Angeles';
    const localDate = new Date(date.toLocaleString('en-US', { timeZone }));
    
    const currentYear = localDate.getFullYear();
    const currentMonth = localDate.getMonth() + 1;
    const currentDay = localDate.getDate();
    
    // Create start and end dates for current year
    const startDate = new Date(currentYear, config.startMonth - 1, config.startDay);
    const endDate = new Date(currentYear, config.endMonth - 1, config.endDay);
    
    // Handle cross-year seasonal rules (e.g., Nov 15 - Feb 15)
    if (startDate > endDate) {
      // Rule spans across years
      return localDate >= startDate || localDate <= endDate;
    } else {
      // Rule within same year
      return localDate >= startDate && localDate <= endDate;
    }
  }, []);

  const getNextSeasonDates = useCallback((
    config: SeasonalConfig, 
    fromDate: Date = new Date()
  ): { start: Date; end: Date } => {
    const currentYear = fromDate.getFullYear();
    let startDate = new Date(currentYear, config.startMonth - 1, config.startDay);
    let endDate = new Date(currentYear, config.endMonth - 1, config.endDay);
    
    // If we're past this year's season, get next year's dates
    if (fromDate > endDate) {
      startDate = new Date(currentYear + 1, config.startMonth - 1, config.startDay);
      endDate = new Date(currentYear + 1, config.endMonth - 1, config.endDay);
    }
    
    // Handle cross-year seasons
    if (startDate > endDate) {
      // If we haven't reached the start date, the end date is in the next year
      if (fromDate < startDate) {
        endDate = new Date(currentYear + 1, config.endMonth - 1, config.endDay);
      } else {
        // We're in the season that started last year
        startDate = new Date(currentYear, config.startMonth - 1, config.startDay);
        endDate = new Date(currentYear + 1, config.endMonth - 1, config.endDay);
      }
    }
    
    return { start: startDate, end: endDate };
  }, []);

  return {
    templates,
    generateSeasonalRule,
    validateSeasonalConfig,
    isDateInSeason,
    getNextSeasonDates
  };
}
