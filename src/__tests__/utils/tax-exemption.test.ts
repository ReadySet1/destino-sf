import {
  isProductTaxExempt,
  isCategoryTaxExempt,
  calculateTaxForItems,
} from '@/utils/tax-exemption';

describe('Tax Exemption Logic', () => {
  const TAX_RATE = 0.0825; // 8.25%

  describe('isProductTaxExempt', () => {
    it('should make empanada products tax-exempt', () => {
      const empanada = {
        category: { name: 'EMPANADAS' },
        name: 'Argentine Beef Empanada',
      };
      expect(isProductTaxExempt(empanada)).toBe(true);
    });

    it('should make alfajores products tax-exempt', () => {
      const alfajor = {
        category: { name: 'ALFAJORES' },
        name: 'Classic Alfajores',
      };
      expect(isProductTaxExempt(alfajor)).toBe(true);
    });

    it('should make sauce products tax-exempt', () => {
      const sauce = {
        category: { name: 'SAUCES' },
        name: 'Chimichurri Sauce',
      };
      expect(isProductTaxExempt(sauce)).toBe(true);
    });

    it('should make catering items taxable (not exempt)', () => {
      const cateringItem = {
        category: { name: 'CATERING- DESSERTS' },
        name: 'Catering Alfajores',
      };
      expect(isProductTaxExempt(cateringItem)).toBe(false);
    });

    it('should handle products with empanada in the name', () => {
      const empanada = {
        category: { name: 'OTHER' },
        name: 'empanada special',
      };
      expect(isProductTaxExempt(empanada)).toBe(true);
    });

    it('should handle products with alfajor in the name', () => {
      const alfajor = {
        category: { name: 'OTHER' },
        name: 'Chocolate alfajor',
      };
      expect(isProductTaxExempt(alfajor)).toBe(true);
    });
  });

  describe('isCategoryTaxExempt', () => {
    it('should make catering categories taxable (not exempt)', () => {
      expect(isCategoryTaxExempt('CATERING- DESSERTS')).toBe(false);
      expect(isCategoryTaxExempt('CATERING- MAIN')).toBe(false);
    });

    it('should make non-catering categories tax-exempt', () => {
      expect(isCategoryTaxExempt('EMPANADAS')).toBe(true);
      expect(isCategoryTaxExempt('ALFAJORES')).toBe(true);
      expect(isCategoryTaxExempt('SAUCES')).toBe(true);
    });
  });

  describe('calculateTaxForItems', () => {
    it('should calculate tax only on catering items', () => {
      const items = [
        {
          product: { category: { name: 'EMPANADAS' }, name: 'Beef Empanada' },
          price: 18.0,
          quantity: 2, // $36 total - should be tax-exempt
        },
        {
          product: { category: { name: 'ALFAJORES' }, name: 'Classic Alfajores' },
          price: 14.0,
          quantity: 1, // $14 total - should be tax-exempt
        },
        {
          product: { category: { name: 'CATERING- DESSERTS' }, name: 'Catering Alfajores' },
          price: 50.0,
          quantity: 1, // $50 total - should be taxable
        },
      ];

      const result = calculateTaxForItems(items, TAX_RATE);

      expect(result.exemptSubtotal).toBe(50.0); // $36 + $14
      expect(result.taxableSubtotal).toBe(50.0); // $50
      expect(result.totalSubtotal).toBe(100.0); // $50 + $50
      expect(result.taxAmount).toBe(4.13); // $50 * 0.0825 = $4.125, rounded to $4.13
    });

    it('should handle all tax-exempt items', () => {
      const items = [
        {
          product: { category: { name: 'EMPANADAS' }, name: 'Beef Empanada' },
          price: 18.0,
          quantity: 2,
        },
        {
          product: { category: { name: 'ALFAJORES' }, name: 'Classic Alfajores' },
          price: 14.0,
          quantity: 1,
        },
      ];

      const result = calculateTaxForItems(items, TAX_RATE);

      expect(result.exemptSubtotal).toBe(50.0);
      expect(result.taxableSubtotal).toBe(0.0);
      expect(result.totalSubtotal).toBe(50.0);
      expect(result.taxAmount).toBe(0.0);
    });

    it('should handle all taxable items', () => {
      const items = [
        {
          product: { category: { name: 'CATERING- MAIN' }, name: 'Catering Package' },
          price: 100.0,
          quantity: 1,
        },
      ];

      const result = calculateTaxForItems(items, TAX_RATE);

      expect(result.exemptSubtotal).toBe(0.0);
      expect(result.taxableSubtotal).toBe(100.0);
      expect(result.totalSubtotal).toBe(100.0);
      expect(result.taxAmount).toBe(8.25); // $100 * 0.0825
    });
  });
});
