/**
 * Test for Manual Order Tax Exemption Logic
 * Verifies that manual orders apply tax only to catering items
 */

import { calculateTaxForItems } from '@/utils/tax-exemption';

describe('Manual Order Tax Exemption', () => {
  const TAX_RATE = 0.0825; // 8.25%

  it('should calculate tax correctly for mixed manual order items', () => {
    // Simulate items that would be added to a manual order
    const mockOrderItems = [
      {
        product: {
          category: { name: 'EMPANADAS' },
          name: 'Argentine Beef Empanadas',
        },
        price: 18.00,
        quantity: 2, // $36 total - should be tax-exempt
      },
      {
        product: {
          category: { name: 'ALFAJORES' },
          name: 'Classic Alfajores',
        },
        price: 14.00,
        quantity: 1, // $14 total - should be tax-exempt
      },
      {
        product: {
          category: { name: 'CATERING- MAIN' },
          name: 'Catering Empanada Package',
        },
        price: 150.00,
        quantity: 1, // $150 total - should be taxable
      },
      {
        product: {
          category: { name: 'SAUCES' },
          name: 'Chimichurri Sauce',
        },
        price: 8.00,
        quantity: 2, // $16 total - should be tax-exempt
      },
    ];

    const taxResult = calculateTaxForItems(mockOrderItems, TAX_RATE);

    expect(taxResult.exemptSubtotal).toBe(66.00); // $36 + $14 + $16
    expect(taxResult.taxableSubtotal).toBe(150.00); // $150
    expect(taxResult.totalSubtotal).toBe(216.00); // $66 + $150
    expect(taxResult.taxAmount).toBe(12.38); // $150 * 0.0825 = $12.375, rounded to $12.38
  });

  it('should handle manual order with only tax-exempt items', () => {
    const exemptOnlyItems = [
      {
        product: {
          category: { name: 'EMPANADAS' },
          name: 'Chicken Empanadas',
        },
        price: 17.00,
        quantity: 3,
      },
      {
        product: {
          category: { name: 'ALFAJORES' },
          name: 'Chocolate Alfajores',
        },
        price: 20.00,
        quantity: 1,
      },
    ];

    const taxResult = calculateTaxForItems(exemptOnlyItems, TAX_RATE);

    expect(taxResult.exemptSubtotal).toBe(71.00); // $51 + $20
    expect(taxResult.taxableSubtotal).toBe(0.00);
    expect(taxResult.totalSubtotal).toBe(71.00);
    expect(taxResult.taxAmount).toBe(0.00);
  });

  it('should handle manual order with only catering items', () => {
    const cateringOnlyItems = [
      {
        product: {
          category: { name: 'CATERING- DESSERTS' },
          name: 'Catering Alfajores Platter',
        },
        price: 75.00,
        quantity: 2,
      },
    ];

    const taxResult = calculateTaxForItems(cateringOnlyItems, TAX_RATE);

    expect(taxResult.exemptSubtotal).toBe(0.00);
    expect(taxResult.taxableSubtotal).toBe(150.00);
    expect(taxResult.totalSubtotal).toBe(150.00);
    expect(taxResult.taxAmount).toBe(12.38); // $150 * 0.0825 = $12.375, rounded to $12.38
  });

  it('should handle delivery fee and shipping cost taxation in manual orders', () => {
    // Simulate the manual order logic where delivery fee and shipping are always taxable
    const items = [
      {
        product: {
          category: { name: 'EMPANADAS' },
          name: 'Beef Empanadas',
        },
        price: 18.00,
        quantity: 1, // $18 - tax-exempt
      },
    ];

    const deliveryFee = 10.00;
    const shippingCost = 5.00;

    // Calculate tax on items using exemption logic
    const itemTaxResult = calculateTaxForItems(items, TAX_RATE);
    
    // Add delivery fee and shipping cost to taxable amount (these are always taxable in manual orders)
    const additionalTaxableAmount = deliveryFee + shippingCost;
    const additionalTax = Math.round(additionalTaxableAmount * TAX_RATE * 100) / 100; // Round to 2 decimal places
    
    const totalTax = itemTaxResult.taxAmount + additionalTax;

    expect(itemTaxResult.taxAmount).toBe(0.00); // No tax on empanadas
    expect(additionalTax).toBe(1.24); // $15 * 0.0825 = $1.2375, rounded to $1.24
    expect(totalTax).toBe(1.24); // Only tax on delivery + shipping
  });
});
