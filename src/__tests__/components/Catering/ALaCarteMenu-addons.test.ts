/**
 * @jest-environment node
 */
import { describe, it, expect } from '@jest/globals';
import { SERVICE_ADD_ONS } from '@/components/Catering/ALaCarteMenu';

describe('SERVICE_ADD_ONS', () => {
  describe('Compostable Serving Spoon', () => {
    it('should exist in SERVICE_ADD_ONS', () => {
      const servingSpoon = SERVICE_ADD_ONS.find(
        addOn => addOn.id === 'compostable-serving-spoon'
      );
      expect(servingSpoon).toBeDefined();
    });

    it('should be available for both buffet and lunch categories', () => {
      const servingSpoon = SERVICE_ADD_ONS.find(
        addOn => addOn.id === 'compostable-serving-spoon'
      );
      expect(servingSpoon?.categories).toContain('buffet');
      expect(servingSpoon?.categories).toContain('lunch');
    });

    it('should have correct properties', () => {
      const servingSpoon = SERVICE_ADD_ONS.find(
        addOn => addOn.id === 'compostable-serving-spoon'
      );
      expect(servingSpoon).toEqual({
        id: 'compostable-serving-spoon',
        name: 'Compostable Serving Spoon',
        price: 1.5,
        description: 'Compostable serving spoon for family style',
        categories: ['buffet', 'lunch'],
      });
    });
  });

  describe('all add-ons structure', () => {
    it('should have all required properties for each add-on', () => {
      SERVICE_ADD_ONS.forEach(addOn => {
        expect(addOn).toHaveProperty('id');
        expect(addOn).toHaveProperty('name');
        expect(addOn).toHaveProperty('price');
        expect(addOn).toHaveProperty('description');
        expect(addOn).toHaveProperty('categories');
        expect(typeof addOn.id).toBe('string');
        expect(typeof addOn.name).toBe('string');
        expect(typeof addOn.price).toBe('number');
        expect(typeof addOn.description).toBe('string');
        expect(Array.isArray(addOn.categories)).toBe(true);
        expect(addOn.categories.length).toBeGreaterThan(0);
      });
    });

    it('should have positive prices for all add-ons', () => {
      SERVICE_ADD_ONS.forEach(addOn => {
        expect(addOn.price).toBeGreaterThan(0);
      });
    });
  });
});
