import {
  AvailabilityRuleSchema,
  ViewOnlySettingsSchema,
  AvailabilityState,
  RuleType,
  type AvailabilityRule,
} from '@/types/availability';
import { AvailabilityValidators } from '@/lib/availability/validators';

describe.skip('ViewOnlySettingsSchema', () => {
  describe('message field validation', () => {
    it('should accept null message', () => {
      const input = {
        message: null,
        showPrice: true,
        allowWishlist: false,
        notifyWhenAvailable: true,
      };

      const result = ViewOnlySettingsSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message).toBeNull();
      }
    });

    it('should accept string message', () => {
      const input = {
        message: 'This product is view-only',
        showPrice: true,
        allowWishlist: false,
        notifyWhenAvailable: true,
      };

      const result = ViewOnlySettingsSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message).toBe('This product is view-only');
      }
    });

    it('should accept settings with defaults when only message is provided', () => {
      const input = {
        message: null,
      };

      const result = ViewOnlySettingsSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.showPrice).toBe(true); // default
        expect(result.data.allowWishlist).toBe(false); // default
        expect(result.data.notifyWhenAvailable).toBe(true); // default
      }
    });

    it('should accept empty string message', () => {
      const input = {
        message: '',
        showPrice: true,
        allowWishlist: false,
        notifyWhenAvailable: true,
      };

      const result = ViewOnlySettingsSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message).toBe('');
      }
    });

    it('should accept long message strings', () => {
      const longMessage =
        'This is a very long custom message that explains in detail why this product is currently view-only and when it might become available again.';
      const input = {
        message: longMessage,
        showPrice: false,
        allowWishlist: true,
        notifyWhenAvailable: false,
      };

      const result = ViewOnlySettingsSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message).toBe(longMessage);
      }
    });
  });

  describe('boolean field validation', () => {
    it('should accept all boolean combinations', () => {
      const testCases = [
        { showPrice: true, allowWishlist: true, notifyWhenAvailable: true },
        { showPrice: true, allowWishlist: true, notifyWhenAvailable: false },
        { showPrice: true, allowWishlist: false, notifyWhenAvailable: true },
        { showPrice: true, allowWishlist: false, notifyWhenAvailable: false },
        { showPrice: false, allowWishlist: true, notifyWhenAvailable: true },
        { showPrice: false, allowWishlist: true, notifyWhenAvailable: false },
        { showPrice: false, allowWishlist: false, notifyWhenAvailable: true },
        { showPrice: false, allowWishlist: false, notifyWhenAvailable: false },
      ];

      testCases.forEach(testCase => {
        const input = { message: null, ...testCase };
        const result = ViewOnlySettingsSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });
  });
});

describe.skip('AvailabilityRuleSchema', () => {
  const baseRule = {
    productId: '27d495c5-e08d-4327-a7b8-c5bd7c69e770',
    name: 'Test Rule',
    ruleType: RuleType.CUSTOM,
  };

  describe('View-Only Rules', () => {
    it('should accept view-only rule with null message', () => {
      const input = {
        ...baseRule,
        name: 'Lucuma Pride View-Only Rule',
        state: AvailabilityState.VIEW_ONLY,
        viewOnlySettings: {
          message: null,
          showPrice: true,
        },
      };

      const result = AvailabilityRuleSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept view-only rule with custom message', () => {
      const input = {
        ...baseRule,
        name: 'Seasonal Item',
        state: AvailabilityState.VIEW_ONLY,
        viewOnlySettings: {
          message: 'Available next season',
          showPrice: false,
        },
      };

      const result = AvailabilityRuleSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept view-only rule with all settings', () => {
      const input = {
        ...baseRule,
        name: 'Complete View-Only Rule',
        state: AvailabilityState.VIEW_ONLY,
        viewOnlySettings: {
          message: 'Custom message',
          showPrice: true,
          allowWishlist: true,
          notifyWhenAvailable: false,
        },
      };

      const result = AvailabilityRuleSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept view-only rule with minimal settings', () => {
      const input = {
        ...baseRule,
        name: 'Minimal View-Only Rule',
        state: AvailabilityState.VIEW_ONLY,
        viewOnlySettings: {
          message: null,
        },
      };

      const result = AvailabilityRuleSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('Pre-Order Rules', () => {
    it('should accept pre-order rule with valid settings', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const input = {
        ...baseRule,
        name: 'Pre-Order Rule',
        state: AvailabilityState.PRE_ORDER,
        preOrderSettings: {
          message: 'Available for pre-order',
          expectedDeliveryDate: futureDate,
        },
      };

      const result = AvailabilityRuleSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('Other Availability States', () => {
    it('should accept available state', () => {
      const input = {
        ...baseRule,
        name: 'Available Rule',
        state: AvailabilityState.AVAILABLE,
      };

      const result = AvailabilityRuleSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept hidden state', () => {
      const input = {
        ...baseRule,
        name: 'Hidden Rule',
        state: AvailabilityState.HIDDEN,
      };

      const result = AvailabilityRuleSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept coming soon state', () => {
      const input = {
        ...baseRule,
        name: 'Coming Soon Rule',
        state: AvailabilityState.COMING_SOON,
      };

      const result = AvailabilityRuleSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept sold out state', () => {
      const input = {
        ...baseRule,
        name: 'Sold Out Rule',
        state: AvailabilityState.SOLD_OUT,
      };

      const result = AvailabilityRuleSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe.skip('AvailabilityValidators.validateRule', () => {
  const baseRule: Partial<AvailabilityRule> = {
    productId: '27d495c5-e08d-4327-a7b8-c5bd7c69e770',
    name: 'Test Rule',
    ruleType: RuleType.CUSTOM,
  };

  describe('with skipFutureDateCheck flag', () => {
    it('should allow updating old rules when skipFutureDateCheck is true', () => {
      const pastDate = new Date('2023-01-01');
      const rule: Partial<AvailabilityRule> = {
        ...baseRule,
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Old Pre-Order Rule',
        state: AvailabilityState.PRE_ORDER,
        enabled: false,
        preOrderSettings: {
          message: 'Pre-order from last year',
          expectedDeliveryDate: pastDate,
          depositRequired: false,
        },
      };

      const result = AvailabilityValidators.validateRule(rule, undefined, true);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate view-only rules with null message', () => {
      const rule: Partial<AvailabilityRule> = {
        ...baseRule,
        name: 'Lucuma Pride View-Only',
        state: AvailabilityState.VIEW_ONLY,
        viewOnlySettings: {
          message: null,
          showPrice: true,
          allowWishlist: false,
          notifyWhenAvailable: true,
        },
      };

      const result = AvailabilityValidators.validateRule(rule);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate view-only rules with custom message', () => {
      const rule: Partial<AvailabilityRule> = {
        ...baseRule,
        name: 'Custom Message Rule',
        state: AvailabilityState.VIEW_ONLY,
        viewOnlySettings: {
          message: 'This is a custom view-only message',
          showPrice: false,
          allowWishlist: true,
          notifyWhenAvailable: false,
        },
      };

      const result = AvailabilityValidators.validateRule(rule);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('rule consistency validation', () => {
    it('should require viewOnlySettings for view-only state', () => {
      const rule: Partial<AvailabilityRule> = {
        ...baseRule,
        name: 'Invalid View-Only Rule',
        state: AvailabilityState.VIEW_ONLY,
        // Missing viewOnlySettings
      };

      const result = AvailabilityValidators.validateRule(rule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('View-only rules must have view-only settings configured');
    });

    it('should require preOrderSettings for pre-order state', () => {
      const rule: Partial<AvailabilityRule> = {
        ...baseRule,
        name: 'Invalid Pre-Order Rule',
        state: AvailabilityState.PRE_ORDER,
        // Missing preOrderSettings
      };

      const result = AvailabilityValidators.validateRule(rule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Pre-order rules must have pre-order settings configured');
    });

    it('should validate complete view-only rule successfully', () => {
      const rule: Partial<AvailabilityRule> = {
        ...baseRule,
        name: 'Complete View-Only Rule',
        state: AvailabilityState.VIEW_ONLY,
        priority: 100,
        enabled: true,
        viewOnlySettings: {
          message: null,
          showPrice: true,
          allowWishlist: false,
          notifyWhenAvailable: true,
        },
      };

      const result = AvailabilityValidators.validateRule(rule);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string message for view-only', () => {
      const rule: Partial<AvailabilityRule> = {
        ...baseRule,
        name: 'Empty Message Rule',
        state: AvailabilityState.VIEW_ONLY,
        viewOnlySettings: {
          message: '',
          showPrice: true,
          allowWishlist: false,
          notifyWhenAvailable: true,
        },
      };

      const result = AvailabilityValidators.validateRule(rule);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(1000);
      const rule: Partial<AvailabilityRule> = {
        ...baseRule,
        name: 'Long Message Rule',
        state: AvailabilityState.VIEW_ONLY,
        viewOnlySettings: {
          message: longMessage,
          showPrice: true,
          allowWishlist: false,
          notifyWhenAvailable: true,
        },
      };

      const result = AvailabilityValidators.validateRule(rule);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle toggling enabled state on existing view-only rule', () => {
      const rule: Partial<AvailabilityRule> = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        productId: '27d495c5-e08d-4327-a7b8-c5bd7c69e770',
        name: 'Existing Rule',
        state: AvailabilityState.VIEW_ONLY,
        ruleType: RuleType.CUSTOM,
        enabled: false, // Toggling to disabled
        viewOnlySettings: {
          message: null,
          showPrice: true,
          allowWishlist: false,
          notifyWhenAvailable: true,
        },
      };

      const result = AvailabilityValidators.validateRule(rule, undefined, true);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe.skip('Integration: The exact error scenario from the bug report', () => {
  it('should handle the Lucuma Pride product update scenario', () => {
    // This is the exact scenario that was failing:
    // User tries to change availability settings on Lucuma Pride product
    const updates: Partial<AvailabilityRule> = {
      id: '27d495c5-e08d-4327-a7b8-c5bd7c69e770',
      productId: '27d495c5-e08d-4327-a7b8-c5bd7c69e770',
      name: 'Lucuma Pride Availability Rule',
      ruleType: RuleType.CUSTOM,
      state: AvailabilityState.VIEW_ONLY,
      enabled: false,
      viewOnlySettings: {
        message: null, // This was causing the error
        showPrice: true,
        allowWishlist: false,
        notifyWhenAvailable: true,
      },
    };

    // Validator is called with skipFutureDateCheck: true (for toggling existing rules)
    const result = AvailabilityValidators.validateRule(updates, undefined, true);

    // Should now pass without errors
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should handle schema parsing directly', () => {
    const viewOnlySettings = {
      message: null,
      showPrice: true,
      allowWishlist: false,
      notifyWhenAvailable: true,
    };

    // This was failing before the fix
    const schemaResult = ViewOnlySettingsSchema.safeParse(viewOnlySettings);
    expect(schemaResult.success).toBe(true);

    const ruleData = {
      productId: '27d495c5-e08d-4327-a7b8-c5bd7c69e770',
      name: 'Test Rule',
      ruleType: RuleType.CUSTOM,
      state: AvailabilityState.VIEW_ONLY,
      viewOnlySettings,
    };

    const ruleResult = AvailabilityRuleSchema.safeParse(ruleData);
    expect(ruleResult.success).toBe(true);
  });
});
