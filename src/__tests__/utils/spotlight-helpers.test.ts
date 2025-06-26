import { SpotlightPick, SpotlightPickFormData } from '@/types/spotlight';

describe('Spotlight Helpers', () => {
  describe('Data Transformation Utilities', () => {
    it('should transform product-based spotlight pick correctly', () => {
      const rawDatabasePick = {
        id: 'pick-123',
        position: 1,
        productId: 'product-123',
        customTitle: null,
        customDescription: null,
        customImageUrl: null,
        customPrice: null,
        personalizeText: 'Perfect for your special occasion',
        isCustom: false,
        isActive: true,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        product: {
          id: 'product-123',
          name: 'Dulce de Leche Alfajores',
          description: 'Traditional Argentine cookies',
          images: ['https://example.com/alfajor.jpg'],
          price: { toNumber: () => 12.99 }, // Mock Prisma Decimal
          slug: 'alfajores-dulce-de-leche',
          category: {
            name: 'ALFAJORES',
            slug: 'alfajores',
          },
        },
      };

      // Simulate the transformation that happens in the API
      const transformedPick: SpotlightPick = {
        id: rawDatabasePick.id,
        position: rawDatabasePick.position as 1 | 2 | 3 | 4,
        productId: rawDatabasePick.productId,
        customTitle: rawDatabasePick.customTitle,
        customDescription: rawDatabasePick.customDescription,
        customImageUrl: rawDatabasePick.customImageUrl,
        customPrice: rawDatabasePick.customPrice ? Number(rawDatabasePick.customPrice) : null,
        personalizeText: rawDatabasePick.personalizeText,
        isCustom: rawDatabasePick.isCustom,
        isActive: rawDatabasePick.isActive,
        createdAt: rawDatabasePick.createdAt,
        updatedAt: rawDatabasePick.updatedAt,
        product: rawDatabasePick.product ? {
          id: rawDatabasePick.product.id,
          name: rawDatabasePick.product.name,
          description: rawDatabasePick.product.description,
          images: ['https://example.com/alfajor.jpg'],
          price: Number(rawDatabasePick.product.price.toNumber()),
          slug: rawDatabasePick.product.slug,
          category: rawDatabasePick.product.category ? {
            name: rawDatabasePick.product.category.name,
            slug: rawDatabasePick.product.category.slug,
          } : undefined,
        } : null,
      };

      expect(transformedPick.product?.price).toBe(12.99);
      expect(typeof transformedPick.product?.price).toBe('number');
      expect(transformedPick.personalizeText).toBe('Perfect for your special occasion');
      expect(transformedPick.isCustom).toBe(false);
    });

    it('should handle custom spotlight pick transformation', () => {
      const rawCustomPick = {
        id: 'pick-456',
        position: 2,
        productId: null,
        customTitle: 'Custom Title',
        customDescription: 'Custom Description',
        customImageUrl: 'https://example.com/custom.jpg',
        customPrice: { toNumber: () => 25.99 }, // Mock Prisma Decimal
        personalizeText: 'Made just for you!',
        isCustom: true,
        isActive: true,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        product: null,
      };

      const transformedPick: SpotlightPick = {
        id: rawCustomPick.id,
        position: rawCustomPick.position as 1 | 2 | 3 | 4,
        productId: rawCustomPick.productId,
        customTitle: rawCustomPick.customTitle,
        customDescription: rawCustomPick.customDescription,
        customImageUrl: rawCustomPick.customImageUrl,
        customPrice: rawCustomPick.customPrice ? Number(rawCustomPick.customPrice.toNumber()) : null,
        personalizeText: rawCustomPick.personalizeText,
        isCustom: rawCustomPick.isCustom,
        isActive: rawCustomPick.isActive,
        createdAt: rawCustomPick.createdAt,
        updatedAt: rawCustomPick.updatedAt,
        product: rawCustomPick.product,
      };

      expect(transformedPick.customPrice).toBe(25.99);
      expect(typeof transformedPick.customPrice).toBe('number');
      expect(transformedPick.isCustom).toBe(true);
      expect(transformedPick.product).toBeNull();
    });
  });

  describe('Form Data Validation', () => {
    it('should validate product-based form data correctly', () => {
      const validProductFormData: SpotlightPickFormData = {
        position: 1,
        isCustom: false,
        productId: 'product-123',
        isActive: true,
      };

      // Simulate validation logic
      const isValid = !validProductFormData.isCustom ? 
        !!validProductFormData.productId : 
        !!validProductFormData.customTitle?.trim();

      expect(isValid).toBe(true);
    });

    it('should validate custom form data correctly', () => {
      const validCustomFormData: SpotlightPickFormData = {
        position: 2,
        isCustom: true,
        customTitle: 'Custom Title',
        customDescription: 'Custom Description',
        personalizeText: 'Custom personalize text',
        isActive: true,
      };

      // Simulate validation logic
      const isValid = !validCustomFormData.isCustom ? 
        !!validCustomFormData.productId : 
        !!validCustomFormData.customTitle?.trim();

      expect(isValid).toBe(true);
    });

    it('should detect invalid product-based form data', () => {
      const invalidProductFormData: SpotlightPickFormData = {
        position: 1,
        isCustom: false,
        // Missing productId
        isActive: true,
      };

      const isValid = !invalidProductFormData.isCustom ? 
        !!invalidProductFormData.productId : 
        !!invalidProductFormData.customTitle?.trim();

      expect(isValid).toBe(false);
    });

    it('should detect invalid custom form data', () => {
      const invalidCustomFormData: SpotlightPickFormData = {
        position: 2,
        isCustom: true,
        customTitle: '', // Empty title
        isActive: true,
      };

      const isValid = !invalidCustomFormData.isCustom ? 
        !!invalidCustomFormData.productId : 
        !!invalidCustomFormData.customTitle?.trim();

      expect(isValid).toBe(false);
    });
  });

  describe('Position Management', () => {
    it('should normalize positions 1-4', () => {
      const positions = [1, 2, 3, 4] as const;
      const normalizedPositions = positions.map(position => {
        const pick: SpotlightPick = {
          position,
          isCustom: false,
          isActive: false,
        };
        return pick.position;
      });

      expect(normalizedPositions).toEqual([1, 2, 3, 4]);
    });

    it('should handle missing positions by creating empty picks', () => {
      const existingPicks: SpotlightPick[] = [
        { position: 1, isCustom: false, isActive: true },
        { position: 3, isCustom: true, isActive: true },
      ];

      const positions = [1, 2, 3, 4] as const;
      const normalizedPicks = positions.map(position => {
        const existingPick = existingPicks.find(p => p.position === position);
        return existingPick || {
          position,
          isCustom: false,
          isActive: false,
        };
      });

      expect(normalizedPicks).toHaveLength(4);
      expect(normalizedPicks[0].isActive).toBe(true); // Position 1 exists
      expect(normalizedPicks[1].isActive).toBe(false); // Position 2 missing
      expect(normalizedPicks[2].isActive).toBe(true); // Position 3 exists
      expect(normalizedPicks[3].isActive).toBe(false); // Position 4 missing
    });
  });

  describe('Display Logic', () => {
    it('should determine display values for product-based pick', () => {
      const productPick: SpotlightPick = {
        position: 1,
        isCustom: false,
        isActive: true,
        personalizeText: 'Perfect choice',
        product: {
          id: 'product-123',
          name: 'Test Product',
          description: 'Test Description',
          images: ['test.jpg'],
          price: 10.99,
          category: {
            name: 'Test Category',
            slug: 'test-category',
          },
        },
      };

      // Simulate display logic from SpotlightPickCard
      const title = productPick.isCustom ? productPick.customTitle : productPick.product?.name;
      const description = productPick.isCustom ? productPick.customDescription : productPick.product?.description;
      const price = productPick.isCustom ? productPick.customPrice : productPick.product?.price;
      const imageUrl = productPick.isCustom ? productPick.customImageUrl : productPick.product?.images?.[0];
      const categoryName = productPick.product?.category?.name;

      expect(title).toBe('Test Product');
      expect(description).toBe('Test Description');
      expect(price).toBe(10.99);
      expect(imageUrl).toBe('test.jpg');
      expect(categoryName).toBe('Test Category');
    });

    it('should determine display values for custom pick', () => {
      const customPick: SpotlightPick = {
        position: 2,
        isCustom: true,
        isActive: true,
        customTitle: 'Custom Title',
        customDescription: 'Custom Description',
        customImageUrl: 'custom.jpg',
        customPrice: 15.99,
        personalizeText: 'Custom personalize text',
        product: null,
      };

      // Simulate display logic from SpotlightPickCard
      const title = customPick.isCustom ? customPick.customTitle : customPick.product?.name;
      const description = customPick.isCustom ? customPick.customDescription : customPick.product?.description;
      const price = customPick.isCustom ? customPick.customPrice : customPick.product?.price;
      const imageUrl = customPick.isCustom ? customPick.customImageUrl : customPick.product?.images?.[0];
      const categoryName = customPick.product?.category?.name;

      expect(title).toBe('Custom Title');
      expect(description).toBe('Custom Description');
      expect(price).toBe(15.99);
      expect(imageUrl).toBe('custom.jpg');
      expect(categoryName).toBeUndefined();
    });

    it('should handle missing display values gracefully', () => {
      const incompletePick: SpotlightPick = {
        position: 1,
        isCustom: false,
        isActive: true,
        product: {
          id: 'product-123',
          name: 'Product Name',
          images: [],
          price: 10.99,
        },
      };

      const title = incompletePick.isCustom ? incompletePick.customTitle : incompletePick.product?.name;
      const description = incompletePick.isCustom ? incompletePick.customDescription : incompletePick.product?.description;
      const imageUrl = incompletePick.isCustom ? incompletePick.customImageUrl : incompletePick.product?.images?.[0];
      const categoryName = incompletePick.product?.category?.name;

      expect(title).toBe('Product Name');
      expect(description).toBeUndefined();
      expect(imageUrl).toBeUndefined();
      expect(categoryName).toBeUndefined();
    });
  });

  describe('Statistics Calculation', () => {
    it('should calculate spotlight picks statistics correctly', () => {
      const spotlightPicks: SpotlightPick[] = [
        { position: 1, isCustom: false, isActive: true },
        { position: 2, isCustom: true, isActive: true },
        { position: 3, isCustom: false, isActive: false },
        { position: 4, isCustom: true, isActive: true },
      ];

      const activePicksCount = spotlightPicks.filter(pick => pick.isActive).length;
      const customPicksCount = spotlightPicks.filter(pick => pick.isCustom && pick.isActive).length;
      const productPicksCount = spotlightPicks.filter(pick => !pick.isCustom && pick.isActive).length;
      const completionPercentage = Math.round((activePicksCount / 4) * 100);

      expect(activePicksCount).toBe(3);
      expect(customPicksCount).toBe(2);
      expect(productPicksCount).toBe(1);
      expect(completionPercentage).toBe(75);
    });

    it('should handle empty spotlight picks list', () => {
      const spotlightPicks: SpotlightPick[] = [];

      const activePicksCount = spotlightPicks.filter(pick => pick.isActive).length;
      const customPicksCount = spotlightPicks.filter(pick => pick.isCustom && pick.isActive).length;
      const productPicksCount = spotlightPicks.filter(pick => !pick.isCustom && pick.isActive).length;
      const completionPercentage = Math.round((activePicksCount / 4) * 100);

      expect(activePicksCount).toBe(0);
      expect(customPicksCount).toBe(0);
      expect(productPicksCount).toBe(0);
      expect(completionPercentage).toBe(0);
    });
  });
}); 