import { SpotlightPick, SpotlightPickFormData, SpotlightPicksManagerProps } from '@/types/spotlight';

describe('Spotlight Types', () => {
  describe('SpotlightPick Interface', () => {
    it('should accept valid product-based spotlight pick', () => {
      const validProductPick: SpotlightPick = {
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
          price: 12.99,
          slug: 'alfajores-dulce-de-leche',
          category: {
            name: 'ALFAJORES',
            slug: 'alfajores',
          },
        },
      };

      expect(validProductPick.isCustom).toBe(false);
      expect(validProductPick.productId).toBe('product-123');
      expect(validProductPick.product).toBeDefined();
      expect(validProductPick.personalizeText).toBe('Perfect for your special occasion');
    });

    it('should accept valid custom spotlight pick', () => {
      const validCustomPick: SpotlightPick = {
        id: 'pick-456',
        position: 2,
        productId: null,
        customTitle: 'Custom Empanadas Special',
        customDescription: 'Hand-made empanadas with premium fillings',
        customImageUrl: 'https://example.com/custom-empanadas.jpg',
        customPrice: 18.99,
        personalizeText: 'Made fresh daily just for you!',
        customLink: 'https://example.com/special-page',
        showNewFeatureModal: true,
        newFeatureTitle: 'New Feature: Premium Fillings',
        newFeatureDescription: 'Discover our new premium empanada fillings made with organic ingredients',
        newFeatureBadgeText: 'FEATURED',
        isCustom: true,
        isActive: true,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        product: null,
      };

      expect(validCustomPick.isCustom).toBe(true);
      expect(validCustomPick.productId).toBeNull();
      expect(validCustomPick.product).toBeNull();
      expect(validCustomPick.customTitle).toBe('Custom Empanadas Special');
      expect(validCustomPick.personalizeText).toBe('Made fresh daily just for you!');
      expect(validCustomPick.customLink).toBe('https://example.com/special-page');
      expect(validCustomPick.showNewFeatureModal).toBe(true);
      expect(validCustomPick.newFeatureTitle).toBe('New Feature: Premium Fillings');
      expect(validCustomPick.newFeatureDescription).toBe('Discover our new premium empanada fillings made with organic ingredients');
      expect(validCustomPick.newFeatureBadgeText).toBe('FEATURED');
    });

    it('should accept minimal spotlight pick with optional fields as null', () => {
      const minimalPick: SpotlightPick = {
        position: 3,
        isCustom: false,
        isActive: false,
      };

      expect(minimalPick.position).toBe(3);
      expect(minimalPick.isCustom).toBe(false);
      expect(minimalPick.isActive).toBe(false);
      expect(minimalPick.id).toBeUndefined();
      expect(minimalPick.productId).toBeUndefined();
      expect(minimalPick.personalizeText).toBeUndefined();
    });

    it('should allow position values 1-4', () => {
      const positions: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];
      
      positions.forEach(position => {
        const pick: SpotlightPick = {
          position,
          isCustom: false,
          isActive: true,
        };
        
        expect(pick.position).toBe(position);
      });
    });

    it('should accept product with category information', () => {
      const pickWithCategory: SpotlightPick = {
        position: 1,
        isCustom: false,
        isActive: true,
        product: {
          id: 'product-123',
          name: 'Test Product',
          images: ['test.jpg'],
          price: 10.99,
          category: {
            name: 'Test Category',
            slug: 'test-category',
          },
        },
      };

      expect(pickWithCategory.product?.category?.name).toBe('Test Category');
      expect(pickWithCategory.product?.category?.slug).toBe('test-category');
    });

    it('should accept product without category information', () => {
      const pickWithoutCategory: SpotlightPick = {
        position: 1,
        isCustom: false,
        isActive: true,
        product: {
          id: 'product-123',
          name: 'Test Product',
          images: ['test.jpg'],
          price: 10.99,
        },
      };

      expect(pickWithoutCategory.product?.category).toBeUndefined();
    });

    it('should accept spotlight pick with custom link only', () => {
      const pickWithCustomLink: SpotlightPick = {
        position: 3,
        customLink: '/products/category/alfajores',
        showNewFeatureModal: false,
        isCustom: false,
        isActive: true,
      };

      expect(pickWithCustomLink.customLink).toBe('/products/category/alfajores');
      expect(pickWithCustomLink.showNewFeatureModal).toBe(false);
      expect(pickWithCustomLink.newFeatureTitle).toBeUndefined();
    });

    it('should accept spotlight pick with new feature modal only', () => {
      const pickWithNewFeatureModal: SpotlightPick = {
        position: 4,
        showNewFeatureModal: true,
        newFeatureTitle: 'Amazing New Feature',
        newFeatureDescription: 'Check out this incredible new functionality',
        newFeatureBadgeText: 'NEW',
        isCustom: false,
        isActive: true,
      };

      expect(pickWithNewFeatureModal.showNewFeatureModal).toBe(true);
      expect(pickWithNewFeatureModal.newFeatureTitle).toBe('Amazing New Feature');
             expect(pickWithNewFeatureModal.newFeatureDescription).toBe('Check out this incredible new functionality');
       expect(pickWithNewFeatureModal.newFeatureBadgeText).toBe('NEW');
      expect(pickWithNewFeatureModal.customLink).toBeUndefined();
    });

    it('should accept spotlight pick with external custom link', () => {
      const pickWithExternalLink: SpotlightPick = {
        position: 1,
        customLink: 'https://external-website.com/special-offer',
        isCustom: true,
        isActive: true,
        customTitle: 'Special External Offer',
      };

      expect(pickWithExternalLink.customLink).toBe('https://external-website.com/special-offer');
      expect(pickWithExternalLink.customTitle).toBe('Special External Offer');
    });
  });

  describe('SpotlightPickFormData Interface', () => {
    it('should accept valid product-based form data', () => {
      const productFormData: SpotlightPickFormData = {
        position: 1,
        isCustom: false,
        productId: 'product-123',
        isActive: true,
      };

      expect(productFormData.isCustom).toBe(false);
      expect(productFormData.productId).toBe('product-123');
      expect(productFormData.customTitle).toBeUndefined();
      expect(productFormData.personalizeText).toBeUndefined();
    });

    it('should accept valid custom form data', () => {
      const customFormData: SpotlightPickFormData = {
        position: 2,
        isCustom: true,
        customTitle: 'Custom Title',
        customDescription: 'Custom Description',
        customImageUrl: 'https://example.com/image.jpg',
        customPrice: 25.99,
        personalizeText: 'Personalized message',
        isActive: true,
      };

      expect(customFormData.isCustom).toBe(true);
      expect(customFormData.customTitle).toBe('Custom Title');
      expect(customFormData.personalizeText).toBe('Personalized message');
      expect(customFormData.productId).toBeUndefined();
    });

    it('should accept form data with personalize text for product-based picks', () => {
      const formDataWithPersonalize: SpotlightPickFormData = {
        position: 1,
        isCustom: false,
        productId: 'product-123',
        personalizeText: 'Great for special occasions',
        isActive: true,
      };

      expect(formDataWithPersonalize.personalizeText).toBe('Great for special occasions');
      expect(formDataWithPersonalize.isCustom).toBe(false);
    });

    it('should accept partial custom form data', () => {
      const partialCustomData: SpotlightPickFormData = {
        position: 3,
        isCustom: true,
        customTitle: 'Title Only',
        isActive: true,
      };

      expect(partialCustomData.customTitle).toBe('Title Only');
      expect(partialCustomData.customDescription).toBeUndefined();
      expect(partialCustomData.customPrice).toBeUndefined();
      expect(partialCustomData.personalizeText).toBeUndefined();
    });

    it('should accept form data with custom link', () => {
      const formDataWithCustomLink: SpotlightPickFormData = {
        position: 1,
        isCustom: false,
        productId: 'product-123',
        customLink: '/products/special-category',
        isActive: true,
      };

      expect(formDataWithCustomLink.customLink).toBe('/products/special-category');
      expect(formDataWithCustomLink.isCustom).toBe(false);
      expect(formDataWithCustomLink.showNewFeatureModal).toBeUndefined();
    });

    it('should accept form data with new feature modal settings', () => {
      const formDataWithNewFeature: SpotlightPickFormData = {
        position: 2,
        isCustom: true,
        customTitle: 'Feature Showcase',
        showNewFeatureModal: true,
        newFeatureTitle: 'Brand New Product Line',
        newFeatureDescription: 'Introducing our latest and greatest products',
        newFeatureBadgeText: 'BETA',
        isActive: true,
      };

      expect(formDataWithNewFeature.showNewFeatureModal).toBe(true);
      expect(formDataWithNewFeature.newFeatureTitle).toBe('Brand New Product Line');
      expect(formDataWithNewFeature.newFeatureDescription).toBe('Introducing our latest and greatest products');
      expect(formDataWithNewFeature.newFeatureBadgeText).toBe('BETA');
    });

    it('should accept form data with both custom link and new feature modal', () => {
      const formDataWithBothFeatures: SpotlightPickFormData = {
        position: 3,
        isCustom: true,
        customTitle: 'Ultimate Feature',
        customLink: 'https://special-landing-page.com',
        showNewFeatureModal: true,
        newFeatureTitle: 'Revolutionary Feature',
        newFeatureDescription: 'This feature will change everything!',
        newFeatureBadgeText: 'REVOLUTIONARY',
        isActive: true,
      };

      expect(formDataWithBothFeatures.customLink).toBe('https://special-landing-page.com');
      expect(formDataWithBothFeatures.showNewFeatureModal).toBe(true);
      expect(formDataWithBothFeatures.newFeatureTitle).toBe('Revolutionary Feature');
      expect(formDataWithBothFeatures.newFeatureBadgeText).toBe('REVOLUTIONARY');
    });
  });

  describe('SpotlightPicksManagerProps Interface', () => {
    it('should accept array of spotlight picks', () => {
      const mockPicks: SpotlightPick[] = [
        {
          id: 'pick-1',
          position: 1,
          isCustom: false,
          isActive: true,
        },
        {
          id: 'pick-2',
          position: 2,
          isCustom: true,
          isActive: false,
        },
      ];

      const managerProps: SpotlightPicksManagerProps = {
        initialPicks: mockPicks,
      };

      expect(managerProps.initialPicks).toHaveLength(2);
      expect(managerProps.initialPicks[0].position).toBe(1);
      expect(managerProps.initialPicks[1].position).toBe(2);
    });

    it('should accept empty array of spotlight picks', () => {
      const managerProps: SpotlightPicksManagerProps = {
        initialPicks: [],
      };

      expect(managerProps.initialPicks).toEqual([]);
      expect(managerProps.initialPicks).toHaveLength(0);
    });
  });

  describe('Type Safety Checks', () => {
    it('should enforce position type constraints', () => {
      // TypeScript should enforce that position is 1, 2, 3, or 4
      const validPositions: Array<SpotlightPick['position']> = [1, 2, 3, 4];
      
      validPositions.forEach(position => {
        const pick: SpotlightPick = {
          position,
          isCustom: false,
          isActive: true,
        };
        
        expect([1, 2, 3, 4]).toContain(pick.position);
      });
    });

    it('should enforce boolean types for flags', () => {
      const pick: SpotlightPick = {
        position: 1,
        isCustom: true,
        isActive: false,
      };

      expect(typeof pick.isCustom).toBe('boolean');
      expect(typeof pick.isActive).toBe('boolean');
    });

    it('should allow null values for optional fields', () => {
      const pickWithNulls: SpotlightPick = {
        position: 1,
        productId: null,
        customTitle: null,
        customDescription: null,
        customImageUrl: null,
        customPrice: null,
        personalizeText: null,
        customLink: null,
        showNewFeatureModal: false,
        newFeatureTitle: null,
        newFeatureDescription: null,
        newFeatureBadgeText: null,
        isCustom: false,
        isActive: true,
        product: null,
      };

      expect(pickWithNulls.productId).toBeNull();
      expect(pickWithNulls.customTitle).toBeNull();
      expect(pickWithNulls.personalizeText).toBeNull();
      expect(pickWithNulls.customLink).toBeNull();
      expect(pickWithNulls.newFeatureTitle).toBeNull();
      expect(pickWithNulls.newFeatureDescription).toBeNull();
      expect(pickWithNulls.newFeatureBadgeText).toBeNull();
      expect(pickWithNulls.product).toBeNull();
    });

    it('should enforce boolean type for showNewFeatureModal', () => {
      const pickWithNewFeatureModal: SpotlightPick = {
        position: 1,
        showNewFeatureModal: true,
        isCustom: false,
        isActive: true,
      };

      expect(typeof pickWithNewFeatureModal.showNewFeatureModal).toBe('boolean');
      expect(pickWithNewFeatureModal.showNewFeatureModal).toBe(true);
    });

    it('should enforce string type for custom link', () => {
      const pickWithCustomLink: SpotlightPick = {
        position: 1,
        customLink: 'https://example.com',
        isCustom: false,
        isActive: true,
      };

      expect(typeof pickWithCustomLink.customLink).toBe('string');
      expect(pickWithCustomLink.customLink).toMatch(/^https?:\/\//);
    });

    it('should enforce number type for custom price', () => {
      const customPick: SpotlightPick = {
        position: 1,
        customPrice: 19.99,
        isCustom: true,
        isActive: true,
      };

      expect(typeof customPick.customPrice).toBe('number');
      expect(customPick.customPrice).toBeGreaterThan(0);
    });

    it('should enforce Date type for timestamps', () => {
      const pickWithDates: SpotlightPick = {
        position: 1,
        isCustom: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(pickWithDates.createdAt).toBeInstanceOf(Date);
      expect(pickWithDates.updatedAt).toBeInstanceOf(Date);
    });
  });
}); 