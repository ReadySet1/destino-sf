/**
 * Catering API Contract Tests
 *
 * Tests to ensure the Catering API endpoints conform to their defined schemas
 */

import { describe, it, expect } from '@jest/globals';
import {
  CateringStatusSchema,
  DeliveryZoneSchema,
  CateringItemTypeSchema,
  CateringCategorySchema,
  CateringItemSchema,
  CateringOrderItemSchema,
  CateringOrderSchema,
  BoxedLunchEntreeSchema,
  BoxedLunchTierSchema,
  LegacyBoxedLunchItemSchema,
  GetCateringOrderByIdParamsSchema,
  GetCateringOrderByIdResponseSchema,
  GetAppetizerMenuResponseSchema,
  GetBoxedLunchesQuerySchema,
  GetBoxedLunchesBuildYourOwnResponseSchema,
  GetBoxedLunchesLegacyResponseSchema,
  CreateCateringOrderRequestSchema,
  CreateCateringOrderResponseSchema,
} from '@/lib/api/schemas/catering';
import { matchesSchema, getValidationErrors, contractAssert, mockData } from './setup';

describe('Catering API Contract Tests', () => {
  // ============================================================
  // Enum Schema Tests
  // ============================================================

  describe('CateringStatusSchema', () => {
    it('should validate valid catering statuses', () => {
      const statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED'];
      statuses.forEach(status => {
        expect(matchesSchema(CateringStatusSchema, status)).toBe(true);
      });
    });

    it('should reject invalid catering status', () => {
      expect(matchesSchema(CateringStatusSchema, 'INVALID_STATUS')).toBe(false);
    });
  });

  describe('DeliveryZoneSchema', () => {
    it('should validate valid delivery zones', () => {
      const zones = ['SF', 'SOUTH_BAY', 'PENINSULA', 'EAST_BAY', 'NORTH_BAY'];
      zones.forEach(zone => {
        expect(matchesSchema(DeliveryZoneSchema, zone)).toBe(true);
      });
    });

    it('should reject invalid delivery zone', () => {
      expect(matchesSchema(DeliveryZoneSchema, 'MARS')).toBe(false);
    });
  });

  describe('CateringItemTypeSchema', () => {
    it('should validate valid item types', () => {
      const types = ['PACKAGE', 'APPETIZER', 'ENTREE', 'SIDE', 'DESSERT', 'BEVERAGE', 'A_LA_CARTE'];
      types.forEach(type => {
        expect(matchesSchema(CateringItemTypeSchema, type)).toBe(true);
      });
    });
  });

  describe('CateringCategorySchema', () => {
    it('should validate valid categories', () => {
      const categories = [
        'APPETIZER',
        'SHARE PLATTER',
        'DESSERT',
        'BUFFET',
        'BOXED_LUNCH',
        'LUNCH_PACKAGE',
      ];
      categories.forEach(category => {
        expect(matchesSchema(CateringCategorySchema, category)).toBe(true);
      });
    });
  });

  // ============================================================
  // Catering Item Schema Tests
  // ============================================================

  describe('CateringItemSchema', () => {
    const mockCateringItem = () => ({
      id: mockData.uuid(),
      name: 'Empanadas Platter',
      description: 'Assorted empanadas platter',
      price: 45.0,
      category: 'APPETIZER',
      servingSize: 'serves 10',
      imageUrl: 'https://example.com/empanadas.jpg',
      isActive: true,
      squareCategory: 'CATERING- APPETIZERS',
      squareProductId: 'SQUARE-123',
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: false,
      createdAt: mockData.timestamp(),
      updatedAt: mockData.timestamp(),
    });

    it('should validate a complete catering item', () => {
      const item = mockCateringItem();
      expect(matchesSchema(CateringItemSchema, item)).toBe(true);
    });

    it('should validate item with variations', () => {
      const item = {
        ...mockCateringItem(),
        variations: [
          {
            id: mockData.uuid(),
            name: 'Small (20 pieces)',
            price: 35.0,
          },
          {
            id: mockData.uuid(),
            name: 'Large (40 pieces)',
            price: 65.0,
          },
        ],
      };

      expect(matchesSchema(CateringItemSchema, item)).toBe(true);
    });

    it('should reject item with negative price', () => {
      const item = {
        ...mockCateringItem(),
        price: -10.0,
      };

      expect(matchesSchema(CateringItemSchema, item)).toBe(false);
    });

    it('should validate item with dietary preferences', () => {
      const item = {
        ...mockCateringItem(),
        isVegetarian: true,
        isVegan: true,
        isGlutenFree: true,
        dietaryPreferences: ['vegan', 'gluten-free'],
      };

      expect(matchesSchema(CateringItemSchema, item)).toBe(true);
    });
  });

  describe('CateringOrderItemSchema', () => {
    it('should validate a catering order item', () => {
      const orderItem = {
        id: mockData.uuid(),
        itemName: 'Empanadas Platter',
        itemType: 'APPETIZER',
        quantity: 2,
        pricePerUnit: 45.0,
        totalPrice: 90.0,
        notes: 'Extra napkins please',
      };

      expect(matchesSchema(CateringOrderItemSchema, orderItem)).toBe(true);
    });

    it('should reject item with negative quantity', () => {
      const orderItem = {
        id: mockData.uuid(),
        itemName: 'Test Item',
        itemType: 'APPETIZER',
        quantity: -1,
        pricePerUnit: 45.0,
        totalPrice: -45.0,
      };

      expect(matchesSchema(CateringOrderItemSchema, orderItem)).toBe(false);
    });
  });

  // ============================================================
  // Catering Order Schema Tests
  // ============================================================

  describe('CateringOrderSchema', () => {
    const mockCateringOrder = () => ({
      id: mockData.uuid(),
      customerId: mockData.uuid(),
      email: mockData.email(),
      name: 'John Doe',
      phone: mockData.phone(),
      eventDate: mockData.timestamp(),
      numberOfPeople: 50,
      totalAmount: 500.0,
      status: 'CONFIRMED',
      notes: 'Corporate event',
      specialRequests: 'Please include extra serving utensils',
      deliveryZone: 'SF',
      deliveryAddress: '123 Main St, San Francisco, CA 94102',
      deliveryAddressJson: { street: '123 Main St', city: 'San Francisco' },
      deliveryFee: 50.0,
      paymentMethod: 'SQUARE',
      paymentStatus: 'COMPLETED',
      squareOrderId: 'SQUARE-ORDER-123',
      squareCheckoutUrl: 'https://square.link/checkout/abc123',
      squareCheckoutId: 'checkout-123',
      metadata: { notes: 'VIP client' },
      createdAt: mockData.timestamp(),
      updatedAt: mockData.timestamp(),
      isArchived: false,
      archiveReason: null,
      archivedAt: null,
      retryCount: 0,
      lastRetryAt: null,
      paymentUrl: null,
      paymentUrlExpiresAt: null,
      items: [
        {
          id: mockData.uuid(),
          itemName: 'Empanadas Buffet',
          itemType: 'PACKAGE',
          quantity: 1,
          pricePerUnit: 450.0,
          totalPrice: 450.0,
          notes: null,
        },
      ],
    });

    it('should validate a complete catering order', () => {
      const order = mockCateringOrder();
      expect(matchesSchema(CateringOrderSchema, order)).toBe(true);
    });

    it('should validate order with minimal fields', () => {
      const order = {
        id: mockData.uuid(),
        customerId: null,
        email: mockData.email(),
        name: 'Jane Doe',
        phone: mockData.phone(),
        eventDate: mockData.timestamp(),
        numberOfPeople: 20,
        totalAmount: 200.0,
        status: 'PENDING',
        notes: null,
        specialRequests: null,
        deliveryZone: null,
        deliveryAddress: null,
        deliveryAddressJson: null,
        deliveryFee: null,
        paymentMethod: 'CASH',
        paymentStatus: 'PENDING',
        squareOrderId: null,
        squareCheckoutUrl: null,
        squareCheckoutId: null,
        metadata: null,
        createdAt: mockData.timestamp(),
        updatedAt: mockData.timestamp(),
        isArchived: false,
        archiveReason: null,
        archivedAt: null,
        retryCount: 0,
        lastRetryAt: null,
        paymentUrl: null,
        paymentUrlExpiresAt: null,
        items: [],
      };

      expect(matchesSchema(CateringOrderSchema, order)).toBe(true);
    });

    it('should reject order with invalid email', () => {
      const order = {
        ...mockCateringOrder(),
        email: 'not-an-email',
      };

      expect(matchesSchema(CateringOrderSchema, order)).toBe(false);
    });

    it('should reject order with negative numberOfPeople', () => {
      const order = {
        ...mockCateringOrder(),
        numberOfPeople: -10,
      };

      expect(matchesSchema(CateringOrderSchema, order)).toBe(false);
    });
  });

  // ============================================================
  // Boxed Lunch Schemas Tests
  // ============================================================

  describe('BoxedLunchEntreeSchema', () => {
    it('should validate a boxed lunch entree', () => {
      const entree = {
        id: mockData.uuid(),
        squareId: 'SQUARE-ENTREE-123',
        name: 'Grilled Chicken',
        description: 'Marinated grilled chicken breast',
        imageUrl: 'https://example.com/chicken.jpg',
        category: 'BOXED_LUNCH_ENTREE',
        available: true,
        sortOrder: 1,
        calories: 350,
        ingredients: ['chicken', 'marinade', 'spices'],
        allergens: ['soy'],
        isVegetarian: false,
        isVegan: false,
        isGlutenFree: true,
        dietaryPreferences: ['gluten-free'],
      };

      expect(matchesSchema(BoxedLunchEntreeSchema, entree)).toBe(true);
    });

    it('should validate entree without optional fields', () => {
      const entree = {
        id: mockData.uuid(),
        squareId: null,
        name: 'Vegetable Wrap',
        category: 'BOXED_LUNCH_ENTREE',
        available: true,
        sortOrder: 2,
      };

      expect(matchesSchema(BoxedLunchEntreeSchema, entree)).toBe(true);
    });
  });

  describe('BoxedLunchTierSchema', () => {
    it('should validate a boxed lunch tier', () => {
      const tier = {
        tier: 'TIER_1',
        name: 'Basic Box',
        price: 12.99,
        proteinAmount: '4oz',
        sides: ['Rice', 'Beans', 'Salad'],
        availableEntrees: [
          {
            id: mockData.uuid(),
            squareId: null,
            name: 'Chicken',
            category: 'BOXED_LUNCH_ENTREE',
            available: true,
            sortOrder: 1,
          },
        ],
      };

      expect(matchesSchema(BoxedLunchTierSchema, tier)).toBe(true);
    });
  });

  describe('LegacyBoxedLunchItemSchema', () => {
    it('should validate legacy boxed lunch item', () => {
      const item = {
        id: mockData.uuid(),
        name: 'Chicken Caesar Salad Box',
        description: 'Fresh romaine with grilled chicken',
        price: 14.99,
        squareId: 'SQUARE-BOX-123',
        imageUrl: 'https://example.com/box.jpg',
        isVegetarian: false,
        isVegan: false,
        isGlutenFree: false,
        dietaryPreferences: [],
      };

      expect(matchesSchema(LegacyBoxedLunchItemSchema, item)).toBe(true);
    });

    it('should validate item with modifiers', () => {
      const item = {
        id: mockData.uuid(),
        name: 'Tropical Salad',
        description: 'Fresh tropical salad',
        price: 12.99,
        squareId: 'SQUARE-SALAD-123',
        imageUrl: null,
        isVegetarian: true,
        isVegan: true,
        isGlutenFree: true,
        modifiers: [
          {
            id: 'add_protein',
            name: 'Add Chicken',
            price: 3.0,
            dietaryInfo: 'gf',
          },
        ],
      };

      expect(matchesSchema(LegacyBoxedLunchItemSchema, item)).toBe(true);
    });
  });

  // ============================================================
  // GET /api/catering/order/[orderId] - Get Catering Order
  // ============================================================

  describe('GetCateringOrderByIdParamsSchema', () => {
    it('should validate valid UUID parameter', () => {
      const params = {
        orderId: mockData.uuid(),
      };

      expect(matchesSchema(GetCateringOrderByIdParamsSchema, params)).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const params = {
        orderId: 'not-a-uuid',
      };

      expect(matchesSchema(GetCateringOrderByIdParamsSchema, params)).toBe(false);
    });
  });

  describe('GetCateringOrderByIdResponseSchema', () => {
    it('should validate response with order', () => {
      const response = {
        order: {
          id: mockData.uuid(),
          customerId: mockData.uuid(),
          email: mockData.email(),
          name: 'John Doe',
          phone: mockData.phone(),
          eventDate: mockData.timestamp(),
          numberOfPeople: 50,
          totalAmount: 500.0,
          status: 'CONFIRMED',
          notes: null,
          specialRequests: null,
          deliveryZone: 'SF',
          deliveryAddress: '123 Main St',
          deliveryAddressJson: null,
          deliveryFee: 50.0,
          paymentMethod: 'SQUARE',
          paymentStatus: 'COMPLETED',
          squareOrderId: 'SQUARE-123',
          squareCheckoutUrl: null,
          squareCheckoutId: null,
          metadata: null,
          createdAt: mockData.timestamp(),
          updatedAt: mockData.timestamp(),
          isArchived: false,
          archiveReason: null,
          archivedAt: null,
          retryCount: 0,
          lastRetryAt: null,
          paymentUrl: null,
          paymentUrlExpiresAt: null,
          items: [],
        },
        status: 'success',
      };

      expect(matchesSchema(GetCateringOrderByIdResponseSchema, response)).toBe(true);
    });
  });

  // ============================================================
  // GET /api/catering/appetizers - Get Appetizers Menu
  // ============================================================

  describe('GetAppetizerMenuResponseSchema', () => {
    it('should validate appetizers array', () => {
      const response = [
        {
          id: mockData.uuid(),
          name: 'Empanadas',
          description: 'Argentine pastries',
          price: 3.5,
          category: 'APPETIZER',
          servingSize: 'per piece',
          imageUrl: 'https://example.com/empanadas.jpg',
          isActive: true,
          squareCategory: 'CATERING- APPETIZERS',
          squareProductId: 'SQUARE-123',
          isVegetarian: false,
          isVegan: false,
          isGlutenFree: false,
          createdAt: mockData.timestamp(),
          updatedAt: mockData.timestamp(),
        },
      ];

      expect(matchesSchema(GetAppetizerMenuResponseSchema, response)).toBe(true);
    });

    it('should validate empty appetizers array', () => {
      const response: any[] = [];
      expect(matchesSchema(GetAppetizerMenuResponseSchema, response)).toBe(true);
    });
  });

  // ============================================================
  // GET /api/catering/boxed-lunches - Get Boxed Lunches
  // ============================================================

  describe('GetBoxedLunchesQuerySchema', () => {
    it('should validate empty query', () => {
      const query = {};
      expect(matchesSchema(GetBoxedLunchesQuerySchema, query)).toBe(true);
    });

    it('should validate legacy mode', () => {
      const query = { mode: 'legacy' };
      expect(matchesSchema(GetBoxedLunchesQuerySchema, query)).toBe(true);
    });

    it('should validate build-your-own mode', () => {
      const query = { mode: 'build-your-own' };
      expect(matchesSchema(GetBoxedLunchesQuerySchema, query)).toBe(true);
    });

    it('should reject invalid mode', () => {
      const query = { mode: 'invalid-mode' };
      expect(matchesSchema(GetBoxedLunchesQuerySchema, query)).toBe(false);
    });
  });

  describe('GetBoxedLunchesBuildYourOwnResponseSchema', () => {
    it('should validate build-your-own response', () => {
      const response = {
        success: true,
        tiers: [
          {
            tier: 'TIER_1',
            name: 'Basic',
            price: 12.99,
            proteinAmount: '4oz',
            sides: ['Rice', 'Beans'],
            availableEntrees: [
              {
                id: mockData.uuid(),
                squareId: null,
                name: 'Chicken',
                category: 'BOXED_LUNCH_ENTREE',
                available: true,
                sortOrder: 1,
              },
            ],
          },
        ],
        entrees: [
          {
            id: mockData.uuid(),
            squareId: null,
            name: 'Grilled Chicken',
            category: 'BOXED_LUNCH_ENTREE',
            available: true,
            sortOrder: 1,
          },
        ],
        mode: 'build-your-own',
      };

      expect(matchesSchema(GetBoxedLunchesBuildYourOwnResponseSchema, response)).toBe(true);
    });
  });

  describe('GetBoxedLunchesLegacyResponseSchema', () => {
    it('should validate legacy response array', () => {
      const response = [
        {
          id: mockData.uuid(),
          name: 'Caesar Salad Box',
          description: 'Fresh romaine',
          price: 14.99,
          squareId: 'SQUARE-123',
          imageUrl: null,
          isVegetarian: true,
          isVegan: false,
          isGlutenFree: false,
        },
      ];

      expect(matchesSchema(GetBoxedLunchesLegacyResponseSchema, response)).toBe(true);
    });
  });

  // ============================================================
  // POST /api/catering/order - Create Catering Order
  // ============================================================

  describe('CreateCateringOrderRequestSchema', () => {
    it('should validate complete order request', () => {
      const request = {
        email: mockData.email(),
        name: 'John Doe',
        phone: mockData.phone(),
        eventDate: mockData.timestamp(),
        numberOfPeople: 50,
        deliveryZone: 'SF',
        deliveryAddress: '123 Main St',
        notes: 'Corporate event',
        specialRequests: 'Extra napkins',
        paymentMethod: 'SQUARE',
        items: [
          {
            itemName: 'Empanadas Buffet',
            itemType: 'PACKAGE',
            quantity: 1,
            pricePerUnit: 450.0,
          },
        ],
      };

      expect(matchesSchema(CreateCateringOrderRequestSchema, request)).toBe(true);
    });

    it('should validate minimal order request', () => {
      const request = {
        email: mockData.email(),
        name: 'Jane Doe',
        phone: mockData.phone(),
        eventDate: mockData.timestamp(),
        numberOfPeople: 20,
        items: [
          {
            itemName: 'Appetizer Platter',
            itemType: 'APPETIZER',
            quantity: 2,
            pricePerUnit: 35.0,
          },
        ],
      };

      expect(matchesSchema(CreateCateringOrderRequestSchema, request)).toBe(true);
    });

    it('should reject request with empty items', () => {
      const request = {
        email: mockData.email(),
        name: 'John Doe',
        phone: mockData.phone(),
        eventDate: mockData.timestamp(),
        numberOfPeople: 50,
        items: [],
      };

      expect(matchesSchema(CreateCateringOrderRequestSchema, request)).toBe(false);
    });
  });

  describe('CreateCateringOrderResponseSchema', () => {
    it('should validate success response', () => {
      const response = {
        success: true,
        order: {
          id: mockData.uuid(),
          customerId: null,
          email: mockData.email(),
          name: 'John Doe',
          phone: mockData.phone(),
          eventDate: mockData.timestamp(),
          numberOfPeople: 50,
          totalAmount: 500.0,
          status: 'PENDING',
          notes: null,
          specialRequests: null,
          deliveryZone: null,
          deliveryAddress: null,
          deliveryAddressJson: null,
          deliveryFee: null,
          paymentMethod: 'SQUARE',
          paymentStatus: 'PENDING',
          squareOrderId: null,
          squareCheckoutUrl: null,
          squareCheckoutId: null,
          metadata: null,
          createdAt: mockData.timestamp(),
          updatedAt: mockData.timestamp(),
          isArchived: false,
          archiveReason: null,
          archivedAt: null,
          retryCount: 0,
          lastRetryAt: null,
          paymentUrl: null,
          paymentUrlExpiresAt: null,
          items: [],
        },
        orderId: mockData.uuid(),
        checkoutUrl: 'https://square.link/checkout/abc123',
      };

      expect(matchesSchema(CreateCateringOrderResponseSchema, response)).toBe(true);
    });

    it('should validate error response', () => {
      const response = {
        success: false,
        error: 'Failed to create order',
      };

      expect(matchesSchema(CreateCateringOrderResponseSchema, response)).toBe(true);
    });
  });
});
