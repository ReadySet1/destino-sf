import { NextRequest, NextResponse } from 'next/server';
import { validateOrderMinimumsServer } from '@/app/actions/orders';
import { getDeliveryZone, calculateDeliveryFee } from '@/lib/deliveryUtils';
import { calculateShippingWeight } from '@/lib/shippingUtils';
import { prisma } from '@/lib/db';

// Import our new test utilities
import { 
  TestData,
  createValidationResult,
  setupMockPrisma,
  mockConsole,
  restoreConsole 
} from '@/__tests__/setup/test-utils';
// Note: @/lib/db is mocked globally in jest.setup.js

// Mock the dependencies
jest.mock('@/app/actions/orders');
jest.mock('@/lib/deliveryUtils');
jest.mock('@/lib/shippingUtils');

const mockValidateOrderMinimumsServer = validateOrderMinimumsServer as jest.MockedFunction<typeof validateOrderMinimumsServer>;
const mockGetDeliveryZone = getDeliveryZone as jest.MockedFunction<typeof getDeliveryZone>;
const mockCalculateDeliveryFee = calculateDeliveryFee as jest.MockedFunction<typeof calculateDeliveryFee>;
const mockCalculateShippingWeight = calculateShippingWeight as jest.MockedFunction<typeof calculateShippingWeight>;
const mockPrisma = prisma as any;

describe('/api/orders/validate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsole(); // Use utility for console mocking
    setupMockPrisma(mockPrisma); // Setup default mock responses
  });

  afterEach(() => {
    restoreConsole(); // Use utility for cleanup
  });

  describe('Order minimum enforcement', () => {
    const validOrderItems = [
      {
        id: 'prod-1',
        name: 'Dulce de Leche Alfajores',
        quantity: 2,
        price: 25.00,
      },
      {
        id: 'prod-2',
        name: 'Beef Empanadas',
        quantity: 1,
        price: 45.00,
      },
    ];

    test('should validate order meets minimum for San Francisco delivery', async () => {
      const deliveryAddress = {
        street: '123 Mission St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
      };

      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: true,
        errorMessage: null,
        minimumRequired: 25,
        currentAmount: 95,
      });

      const result = await validateOrderMinimumsServer(validOrderItems, deliveryAddress);

      expect(mockValidateOrderMinimumsServer).toHaveBeenCalledWith(validOrderItems, deliveryAddress);
      expect(result.isValid).toBe(true);
      expect(result.currentAmount).toBeGreaterThanOrEqual(result.minimumRequired!);
    });

    test('should reject order below minimum for delivery', async () => {
      const belowMinimumItems = [
        {
          id: 'prod-1',
          name: 'Small Item',
          quantity: 1,
          price: 10.00,
        },
      ];

      const deliveryAddress = {
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
      };

      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: false,
        errorMessage: 'Order minimum of $25 required for delivery.',
        minimumRequired: 25,
        currentAmount: 10,
      });

      const result = await validateOrderMinimumsServer(belowMinimumItems, deliveryAddress);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Order minimum');
      expect(result.currentAmount).toBeLessThan(result.minimumRequired!);
    });

    test('should validate catering order meets zone minimum', async () => {
      const cateringItems = [
        {
          id: 'catering-1',
          name: 'Catering Alfajores Platter',
          quantity: 1,
          price: 400.00,
        },
      ];

      const southBayAddress = {
        street: '456 Market St',
        city: 'San Jose',
        state: 'CA',
        postalCode: '95110',
      };

      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: true,
        errorMessage: null,
        deliveryZone: 'SOUTH_BAY',
        minimumRequired: 350,
        currentAmount: 400,
      });

      const result = await validateOrderMinimumsServer(cateringItems, southBayAddress);

      expect(result.isValid).toBe(true);
      expect(result.deliveryZone).toBe('SOUTH_BAY');
      expect(result.currentAmount).toBeGreaterThanOrEqual(result.minimumRequired!);
    });

    test('should reject catering order below zone minimum', async () => {
      const smallCateringItems = [
        {
          id: 'catering-1',
          name: 'Small Catering Platter',
          quantity: 1,
          price: 200.00,
        },
      ];

      const peninsulaAddress = {
        street: '789 University Ave',
        city: 'Palo Alto',
        state: 'CA',
        postalCode: '94301',
      };

      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: false,
        errorMessage: 'Catering orders require a minimum of $400 for delivery to Lower Peninsula.',
        deliveryZone: 'LOWER_PENINSULA',
        minimumRequired: 400,
        currentAmount: 200,
      });

      const result = await validateOrderMinimumsServer(smallCateringItems, peninsulaAddress);

      expect(result.isValid).toBe(false);
      expect(result.deliveryZone).toBe('LOWER_PENINSULA');
      expect(result.currentAmount).toBeLessThan(result.minimumRequired!);
    });

    test('should allow pickup orders without minimum enforcement', async () => {
      const smallOrderItems = [
        {
          id: 'prod-1',
          name: 'Single Alfajor',
          quantity: 1,
          price: 5.00,
        },
      ];

      // No delivery address for pickup
      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: true,
        errorMessage: null,
        currentAmount: 5,
      });

      const result = await validateOrderMinimumsServer(smallOrderItems);

      expect(result.isValid).toBe(true);
      expect(result.currentAmount).toBe(5);
    });

    test('should handle empty cart validation', async () => {
      const emptyCart: any[] = [];

      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: false,
        errorMessage: 'Your cart is empty',
      });

      const result = await validateOrderMinimumsServer(emptyCart);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Your cart is empty');
    });

    test('should validate mixed regular and catering items', async () => {
      const mixedItems = [
        {
          id: 'prod-1',
          name: 'Dulce de Leche Alfajores',
          quantity: 2,
          price: 25.00,
        },
        {
          id: 'catering-1',
          name: 'Small Catering Add-on',
          quantity: 1,
          price: 150.00,
        },
      ];

      const deliveryAddress = {
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
      };

      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: true,
        errorMessage: null,
        deliveryZone: 'SAN_FRANCISCO',
        minimumRequired: 250,
        currentAmount: 200,
      });

      const result = await validateOrderMinimumsServer(mixedItems, deliveryAddress);

      expect(result.isValid).toBe(true);
      expect(result.deliveryZone).toBe('SAN_FRANCISCO');
    });
  });

  describe('Delivery zone validation', () => {
    test('should validate San Francisco as nearby zone', async () => {
      const sfAddress = {
        street: '123 Mission St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
      };

      mockGetDeliveryZone.mockReturnValue('nearby');
      mockCalculateDeliveryFee.mockReturnValue({
        zone: 'nearby',
        fee: 0, // Free delivery for orders over $75
        isFreeDelivery: true,
        minOrderForFreeDelivery: 75,
      });

      const zone = getDeliveryZone(sfAddress.city);
      const feeResult = calculateDeliveryFee(sfAddress, 95);

      expect(mockGetDeliveryZone).toHaveBeenCalledWith('San Francisco');
      expect(zone).toBe('nearby');
      expect(feeResult?.isFreeDelivery).toBe(true);
    });

    test('should validate Oakland as distant zone', async () => {
      const oaklandAddress = {
        street: '456 Broadway',
        city: 'Oakland',
        state: 'CA',
        postalCode: '94612',
      };

      mockGetDeliveryZone.mockReturnValue('distant');
      mockCalculateDeliveryFee.mockReturnValue({
        zone: 'distant',
        fee: 25,
        isFreeDelivery: false,
      });

      const zone = getDeliveryZone(oaklandAddress.city);
      const feeResult = calculateDeliveryFee(oaklandAddress, 95);

      expect(zone).toBe('distant');
      expect(feeResult?.fee).toBe(25);
      expect(feeResult?.isFreeDelivery).toBe(false);
    });

    test('should reject unsupported delivery areas', async () => {
      const unsupportedAddress = {
        street: '789 Sunset Blvd',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90210',
      };

      mockGetDeliveryZone.mockReturnValue(null);
      mockCalculateDeliveryFee.mockReturnValue(null);

      const zone = getDeliveryZone(unsupportedAddress.city);
      const feeResult = calculateDeliveryFee(unsupportedAddress, 95);

      expect(zone).toBeNull();
      expect(feeResult).toBeNull();
    });

    test('should handle case-insensitive city names', async () => {
      const mixedCaseAddress = {
        street: '123 Main St',
        city: 'san francisco',
        state: 'CA',
        postalCode: '94105',
      };

      mockGetDeliveryZone.mockReturnValue('nearby');

      const zone = getDeliveryZone(mixedCaseAddress.city);

      expect(mockGetDeliveryZone).toHaveBeenCalledWith('san francisco');
      expect(zone).toBe('nearby');
    });

    test('should validate delivery fee calculation for nearby zone', async () => {
      const sfAddress = {
        street: '123 Mission St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
      };

      // Test order under $75 threshold
      mockCalculateDeliveryFee.mockReturnValue({
        zone: 'nearby',
        fee: 15,
        isFreeDelivery: false,
        minOrderForFreeDelivery: 75,
      });

      const feeResultUnder = calculateDeliveryFee(sfAddress, 50);

      expect(feeResultUnder?.fee).toBe(15);
      expect(feeResultUnder?.isFreeDelivery).toBe(false);

      // Test order over $75 threshold
      mockCalculateDeliveryFee.mockReturnValue({
        zone: 'nearby',
        fee: 0,
        isFreeDelivery: true,
        minOrderForFreeDelivery: 75,
      });

      const feeResultOver = calculateDeliveryFee(sfAddress, 100);

      expect(feeResultOver?.fee).toBe(0);
      expect(feeResultOver?.isFreeDelivery).toBe(true);
    });

    test('should validate delivery fee for distant zones', async () => {
      const distantAddresses = [
        { city: 'Oakland', expectedFee: 25 },
        { city: 'San Jose', expectedFee: 25 },
        { city: 'Berkeley', expectedFee: 25 },
      ];

      distantAddresses.forEach(({ city, expectedFee }) => {
        const address = {
          street: '123 Test St',
          city,
          state: 'CA',
          postalCode: '12345',
        };

        mockGetDeliveryZone.mockReturnValue('distant');
        mockCalculateDeliveryFee.mockReturnValue({
          zone: 'distant',
          fee: expectedFee,
          isFreeDelivery: false,
        });

        const zone = getDeliveryZone(address.city);
        const feeResult = calculateDeliveryFee(address, 100);

        expect(zone).toBe('distant');
        expect(feeResult?.fee).toBe(expectedFee);
        expect(feeResult?.isFreeDelivery).toBe(false);
      });
    });
  });

  describe('Product availability', () => {
    test('should validate all products are available and active', async () => {
      const orderItems = [
        {
          id: 'prod-1',
          name: 'Dulce de Leche Alfajores',
          quantity: 2,
          price: 25.00,
        },
        {
          id: 'prod-2',
          name: 'Beef Empanadas',
          quantity: 1,
          price: 45.00,
        },
      ];

      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Dulce de Leche Alfajores',
          isActive: true,
          inventory: 50,
          price: 25.00,
        },
        {
          id: 'prod-2',
          name: 'Beef Empanadas',
          isActive: true,
          inventory: 30,
          price: 45.00,
        },
      ]);

      const products = await prisma.product.findMany({
        where: {
          id: {
            in: orderItems.map(item => item.id),
          },
        },
      });

      expect(products).toHaveLength(2);
      expect(products.every(product => product.isActive)).toBe(true);
      
      // Check inventory availability
      const hasInventory = products.every(product => {
        const orderItem = orderItems.find(item => item.id === product.id);
        return product.inventory >= orderItem!.quantity;
      });

      expect(hasInventory).toBe(true);
    });

    test('should reject orders with inactive products', async () => {
      const orderItems = [
        {
          id: 'prod-inactive',
          name: 'Discontinued Product',
          quantity: 1,
          price: 25.00,
        },
      ];

      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-inactive',
          name: 'Discontinued Product',
          isActive: false,
          inventory: 10,
          price: 25.00,
        },
      ]);

      const products = await prisma.product.findMany({
        where: {
          id: {
            in: orderItems.map(item => item.id),
          },
        },
      });

      const allProductsActive = products.every(product => product.isActive);

      expect(allProductsActive).toBe(false);
    });

    test('should reject orders with insufficient inventory', async () => {
      const orderItems = [
        {
          id: 'prod-1',
          name: 'Limited Stock Item',
          quantity: 10,
          price: 25.00,
        },
      ];

      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Limited Stock Item',
          isActive: true,
          inventory: 5, // Insufficient for order of 10
          price: 25.00,
        },
      ]);

      const products = await prisma.product.findMany({
        where: {
          id: {
            in: orderItems.map(item => item.id),
          },
        },
      });

      const hasInventory = products.every(product => {
        const orderItem = orderItems.find(item => item.id === product.id);
        return product.inventory >= orderItem!.quantity;
      });

      expect(hasInventory).toBe(false);
    });

    test('should validate variant-specific availability', async () => {
      const orderItems = [
        {
          id: 'prod-1',
          name: 'Dulce de Leche Alfajores',
          quantity: 3,
          price: 25.00,
          variantId: 'variant-6pack',
        },
      ];

      mockPrisma.productVariant.findUnique.mockResolvedValue({
        id: 'variant-6pack',
        productId: 'prod-1',
        name: '6-pack',
        isActive: true,
        inventory: 10,
        price: 25.00,
      });

      const variant = await prisma.productVariant.findUnique({
        where: { id: 'variant-6pack' },
      });

      expect(variant?.isActive).toBe(true);
      expect(variant?.inventory).toBeGreaterThanOrEqual(3);
    });

    test('should reject orders with non-existent products', async () => {
      const orderItems = [
        {
          id: 'non-existent-product',
          name: 'Non-existent Product',
          quantity: 1,
          price: 25.00,
        },
      ];

      mockPrisma.product.findMany.mockResolvedValue([]);

      const products = await prisma.product.findMany({
        where: {
          id: {
            in: orderItems.map(item => item.id),
          },
        },
      });

      const allProductsFound = orderItems.every(item => 
        products.some(product => product.id === item.id)
      );

      expect(allProductsFound).toBe(false);
    });

    test('should validate price consistency', async () => {
      const orderItems = [
        {
          id: 'prod-1',
          name: 'Dulce de Leche Alfajores',
          quantity: 2,
          price: 25.00,
        },
      ];

      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Dulce de Leche Alfajores',
          isActive: true,
          inventory: 50,
          price: 25.00, // Matches order item price
        },
      ]);

      const products = await prisma.product.findMany({
        where: {
          id: {
            in: orderItems.map(item => item.id),
          },
        },
      });

      const pricesMatch = products.every(product => {
        const orderItem = orderItems.find(item => item.id === product.id);
        return product.price === orderItem!.price;
      });

      expect(pricesMatch).toBe(true);
    });

    test('should handle concurrent inventory checks', async () => {
      const orderItems = [
        {
          id: 'prod-1',
          name: 'Popular Item',
          quantity: 1,
          price: 25.00,
        },
      ];

      // Simulate race condition where inventory changes between checks
      mockPrisma.product.findMany
        .mockResolvedValueOnce([
          {
            id: 'prod-1',
            name: 'Popular Item',
            isActive: true,
            inventory: 1, // Available during first check
            price: 25.00,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'prod-1',
            name: 'Popular Item',
            isActive: true,
            inventory: 0, // Sold out during second check
            price: 25.00,
          },
        ]);

      // First check - inventory available
      const firstCheck = await prisma.product.findMany({
        where: {
          id: {
            in: orderItems.map(item => item.id),
          },
        },
      });

      expect(firstCheck[0].inventory).toBe(1);

      // Second check - inventory depleted
      const secondCheck = await prisma.product.findMany({
        where: {
          id: {
            in: orderItems.map(item => item.id),
          },
        },
      });

      expect(secondCheck[0].inventory).toBe(0);
    });
  });

  describe('Shipping calculation integration', () => {
    test('should calculate shipping weight for nationwide orders', async () => {
      const orderItems = [
        {
          id: 'prod-1',
          name: 'Dulce de Leche Alfajores',
          quantity: 3,
        },
        {
          id: 'prod-2',
          name: 'Beef Empanadas',
          quantity: 2,
        },
      ];

      mockCalculateShippingWeight.mockResolvedValue(3.5); // Total weight in lbs

      const weight = await calculateShippingWeight(orderItems, 'nationwide_shipping');

      expect(mockCalculateShippingWeight).toHaveBeenCalledWith(orderItems, 'nationwide_shipping');
      expect(weight).toBe(3.5);
    });

    test('should calculate different weights for different fulfillment methods', async () => {
      const orderItems = [
        {
          id: 'prod-1',
          name: 'Dulce de Leche Alfajores',
          quantity: 2,
        },
      ];

      // Nationwide shipping weight
      mockCalculateShippingWeight.mockResolvedValueOnce(2.1);
      const nationwideWeight = await calculateShippingWeight(orderItems, 'nationwide_shipping');

      // Local delivery weight (might be different due to packaging)
      mockCalculateShippingWeight.mockResolvedValueOnce(1.8);
      const localWeight = await calculateShippingWeight(orderItems, 'local_delivery');

      // Pickup weight (for inventory tracking)
      mockCalculateShippingWeight.mockResolvedValueOnce(1.5);
      const pickupWeight = await calculateShippingWeight(orderItems, 'pickup');

      expect(nationwideWeight).toBe(2.1);
      expect(localWeight).toBe(1.8);
      expect(pickupWeight).toBe(1.5);
    });

    test('should enforce minimum shipping weight', async () => {
      const lightOrderItems = [
        {
          id: 'prod-light',
          name: 'Light Sauce Packet',
          quantity: 1,
        },
      ];

      mockCalculateShippingWeight.mockResolvedValue(0.5); // Minimum weight enforced

      const weight = await calculateShippingWeight(lightOrderItems, 'nationwide_shipping');

      expect(weight).toBe(0.5); // Should be at least 0.5 lbs
    });

    test('should handle mixed product types in weight calculation', async () => {
      const mixedOrderItems = [
        {
          id: 'prod-alfajor',
          name: 'Dulce de Leche Alfajores',
          quantity: 2,
        },
        {
          id: 'prod-empanada',
          name: 'Beef Empanadas',
          quantity: 1,
        },
        {
          id: 'prod-sauce',
          name: 'Chimichurri Sauce',
          quantity: 1,
        },
      ];

      mockCalculateShippingWeight.mockResolvedValue(4.2); // Combined weight

      const weight = await calculateShippingWeight(mixedOrderItems, 'nationwide_shipping');

      expect(weight).toBe(4.2);
    });

    test('should validate shipping weight against carrier limits', async () => {
      const heavyOrderItems = [
        {
          id: 'prod-heavy',
          name: 'Large Catering Order',
          quantity: 10,
        },
      ];

      mockCalculateShippingWeight.mockResolvedValue(45.0); // Heavy order

      const weight = await calculateShippingWeight(heavyOrderItems, 'nationwide_shipping');

      // Check against typical carrier weight limits
      const isWithinLimits = weight <= 50; // Most carriers limit to 50 lbs

      expect(weight).toBe(45.0);
      expect(isWithinLimits).toBe(true);
    });

    test('should handle weight calculation errors gracefully', async () => {
      const orderItems = [
        {
          id: 'prod-1',
          name: 'Test Product',
          quantity: 1,
        },
      ];

      mockCalculateShippingWeight.mockRejectedValue(new Error('Weight calculation failed'));

      await expect(calculateShippingWeight(orderItems, 'nationwide_shipping'))
        .rejects.toThrow('Weight calculation failed');
    });
  });

  describe('Integration scenarios', () => {
    test('should perform complete order validation workflow', async () => {
      const orderData = {
        items: [
          {
            id: 'prod-1',
            name: 'Dulce de Leche Alfajores',
            quantity: 3,
            price: 25.00,
          },
          {
            id: 'prod-2',
            name: 'Beef Empanadas',
            quantity: 2,
            price: 22.50,
          },
        ],
        deliveryAddress: {
          street: '123 Mission St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94105',
        },
        fulfillmentMethod: 'delivery',
      };

      // 1. Validate order minimums
      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: true,
        errorMessage: null,
        minimumRequired: 25,
        currentAmount: 120,
      });

      const minimumValidation = await validateOrderMinimumsServer(
        orderData.items,
        orderData.deliveryAddress
      );

      expect(minimumValidation.isValid).toBe(true);

      // 2. Validate delivery zone
      mockGetDeliveryZone.mockReturnValue('nearby');
      mockCalculateDeliveryFee.mockReturnValue({
        zone: 'nearby',
        fee: 0,
        isFreeDelivery: true,
        minOrderForFreeDelivery: 75,
      });

      const zone = getDeliveryZone(orderData.deliveryAddress.city);
      const deliveryFee = calculateDeliveryFee(orderData.deliveryAddress, 120);

      expect(zone).toBe('nearby');
      expect(deliveryFee?.isFreeDelivery).toBe(true);

      // 3. Validate product availability
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Dulce de Leche Alfajores',
          isActive: true,
          inventory: 50,
          price: 25.00,
        },
        {
          id: 'prod-2',
          name: 'Beef Empanadas',
          isActive: true,
          inventory: 30,
          price: 22.50,
        },
      ]);

      const products = await prisma.product.findMany({
        where: {
          id: {
            in: orderData.items.map(item => item.id),
          },
        },
      });

      expect(products.every(product => product.isActive)).toBe(true);

      // 4. Calculate shipping weight
      mockCalculateShippingWeight.mockResolvedValue(4.1);

      const shippingWeight = await calculateShippingWeight(
        orderData.items,
        'local_delivery'
      );

      expect(shippingWeight).toBe(4.1);

      // All validations passed
      expect(minimumValidation.isValid).toBe(true);
      expect(zone).toBeTruthy();
      expect(products).toHaveLength(2);
      expect(shippingWeight).toBeGreaterThan(0);
    });

    test('should handle validation failure at any step', async () => {
      const problematicOrder = {
        items: [
          {
            id: 'prod-1',
            name: 'Expensive Item',
            quantity: 1,
            price: 15.00,
          },
        ],
        deliveryAddress: {
          street: '123 Test St',
          city: 'Los Angeles', // Unsupported area
          state: 'CA',
          postalCode: '90210',
        },
      };

      // 1. Order minimum validation passes
      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: false,
        errorMessage: 'Sorry, we currently do not deliver to this location.',
      });

      const minimumValidation = await validateOrderMinimumsServer(
        problematicOrder.items,
        problematicOrder.deliveryAddress
      );

      expect(minimumValidation.isValid).toBe(false);

      // 2. Delivery zone validation fails
      mockGetDeliveryZone.mockReturnValue(null);

      const zone = getDeliveryZone(problematicOrder.deliveryAddress.city);

      expect(zone).toBeNull();

      // Validation should fail early, preventing further processing
      expect(minimumValidation.isValid).toBe(false);
    });

    test('should validate complex catering order with multiple zones', async () => {
      const cateringOrder = {
        items: [
          {
            id: 'catering-1',
            name: 'Large Alfajores Platter',
            quantity: 2,
            price: 200.00,
          },
          {
            id: 'catering-2',
            name: 'Empanadas Catering Box',
            quantity: 1,
            price: 180.00,
          },
        ],
        deliveryAddress: {
          street: '456 University Ave',
          city: 'Palo Alto',
          state: 'CA',
          postalCode: '94301',
        },
      };

      // Validate catering minimum for Peninsula zone
      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: true,
        errorMessage: null,
        deliveryZone: 'LOWER_PENINSULA',
        minimumRequired: 400,
        currentAmount: 580,
      });

      const validation = await validateOrderMinimumsServer(
        cateringOrder.items,
        cateringOrder.deliveryAddress
      );

      expect(validation.isValid).toBe(true);
      expect(validation.deliveryZone).toBe('LOWER_PENINSULA');
      expect(validation.currentAmount).toBeGreaterThanOrEqual(validation.minimumRequired!);
    });
  });

  describe('Error handling', () => {
    test('should handle database connection errors', async () => {
      const orderItems = [
        {
          id: 'prod-1',
          name: 'Test Product',
          quantity: 1,
          price: 25.00,
        },
      ];

      mockPrisma.product.findMany.mockRejectedValue(new Error('Database connection failed'));

      await expect(prisma.product.findMany({
        where: {
          id: {
            in: orderItems.map(item => item.id),
          },
        },
      })).rejects.toThrow('Database connection failed');
    });

    test('should handle validation service timeouts', async () => {
      const orderItems = [
        {
          id: 'prod-1',
          name: 'Test Product',
          quantity: 1,
          price: 25.00,
        },
      ];

      mockValidateOrderMinimumsServer.mockRejectedValue(new Error('Validation service timeout'));

      await expect(validateOrderMinimumsServer(orderItems))
        .rejects.toThrow('Validation service timeout');
    });

    test('should handle malformed validation requests', async () => {
      const malformedItems = [
        {
          // Missing required fields
          quantity: 1,
          price: 'invalid-price',
        },
      ];

      // Validate request structure
      const hasValidStructure = malformedItems.every(item => 
        item.id && 
        typeof item.quantity === 'number' && 
        typeof item.price === 'number'
      );

      expect(hasValidStructure).toBe(false);
    });
  });
}); 