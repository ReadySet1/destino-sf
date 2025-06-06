import { 
  createTipSettings, 
  createRegularOrderTipSettings, 
  createCateringOrderTipSettings,
  validateTipSettings,
  DEFAULT_TIP_PERCENTAGES 
} from '../tip-settings';

describe('Square Tip Settings', () => {
  describe('createTipSettings', () => {
    it('should create default tip settings with 5%, 10%, 15%', () => {
      const settings = createTipSettings();
      
      expect(settings).toEqual({
        allow_tipping: true,
        separate_tip_screen: false,
        custom_tip_field: true,
        tip_percentages: [5, 10, 15],
        smart_tip_amounts: false
      });
    });

    it('should create tip settings with custom percentages', () => {
      const customPercentages = [10, 20, 30];
      const settings = createTipSettings(customPercentages);
      
      expect(settings.tip_percentages).toEqual(customPercentages);
    });

    it('should allow overriding other options', () => {
      const settings = createTipSettings([5, 10, 15], {
        separate_tip_screen: true,
        custom_tip_field: false
      });
      
      expect(settings.separate_tip_screen).toBe(true);
      expect(settings.custom_tip_field).toBe(false);
    });

    it('should throw error for more than 3 percentages', () => {
      expect(() => {
        createTipSettings([5, 10, 15, 20]);
      }).toThrow('Square allows maximum 3 tip percentages');
    });

    it('should throw error for invalid percentages', () => {
      expect(() => {
        createTipSettings([-5, 10, 15]);
      }).toThrow('Tip percentages must be between 0 and 100');
      
      expect(() => {
        createTipSettings([5, 10, 150]);
      }).toThrow('Tip percentages must be between 0 and 100');
    });
  });

  describe('createRegularOrderTipSettings', () => {
    it('should create settings with default percentages', () => {
      const settings = createRegularOrderTipSettings();
      
      expect(settings.tip_percentages).toEqual([5, 10, 15]);
      expect(settings.allow_tipping).toBe(true);
      expect(settings.smart_tip_amounts).toBe(false);
    });
  });

  describe('createCateringOrderTipSettings', () => {
    it('should create settings with default percentages', () => {
      const settings = createCateringOrderTipSettings();
      
      expect(settings.tip_percentages).toEqual([5, 10, 15]);
      expect(settings.allow_tipping).toBe(true);
      expect(settings.smart_tip_amounts).toBe(false);
    });
  });

  describe('validateTipSettings', () => {
    it('should validate correct settings without throwing', () => {
      const settings = createTipSettings();
      
      expect(() => {
        validateTipSettings(settings);
      }).not.toThrow();
    });

    it('should warn when smart_tip_amounts overrides custom percentages', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const settings = {
        allow_tipping: true,
        separate_tip_screen: false,
        custom_tip_field: true,
        tip_percentages: [5, 10, 15],
        smart_tip_amounts: true // This will override tip_percentages
      };
      
      validateTipSettings(settings);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Warning: smart_tip_amounts is enabled, which will override custom tip_percentages'
      );
      
      consoleSpy.mockRestore();
    });

    it('should throw error for too many percentages', () => {
      const settings = {
        allow_tipping: true,
        separate_tip_screen: false,
        custom_tip_field: true,
        tip_percentages: [5, 10, 15, 20],
        smart_tip_amounts: false
      };
      
      expect(() => {
        validateTipSettings(settings);
      }).toThrow('Square allows maximum 3 tip percentages');
    });

    it('should throw error for invalid percentage values', () => {
      const settings = {
        allow_tipping: true,
        separate_tip_screen: false,
        custom_tip_field: true,
        tip_percentages: [5, 10, 150],
        smart_tip_amounts: false
      };
      
      expect(() => {
        validateTipSettings(settings);
      }).toThrow('All tip percentages must be between 0 and 100');
    });
  });

  describe('DEFAULT_TIP_PERCENTAGES', () => {
    it('should export the correct default percentages', () => {
      expect(DEFAULT_TIP_PERCENTAGES).toEqual([5, 10, 15]);
    });
  });
}); 