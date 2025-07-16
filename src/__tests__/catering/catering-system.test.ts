import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  getCateringPackages, 
  getCateringItems,
  createCateringOrderAndProcessPayment,
  validateCateringOrderWithDeliveryZone,
  saveContactInfo,
  submitCateringInquiry
} from '@/actions/catering';
import { db } from '@/lib/db';
import { DeliveryZone } from '@/types/catering';
// Import the type guards
import { isProfileSuccess, isProfileError, isOrderSuccess, isOrderError } from '@/lib/type-guards';
// Mock Prisma enums since they may not be available in test environment
const CateringStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
} as const;

const PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;

const PaymentMethod = {
  SQUARE: 'SQUARE',
  CASH: 'CASH',
} as const;

// Mock external dependencies
jest.mock('@/lib/db', () => ({
  db: {
    cateringPackage: {
      findMany: jest.fn(),
    },
    cateringItem: {
      findMany: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    cateringOrder: {
      create: jest.fn(),
      update: jest.fn(),
    },
    profile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-123'),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

// Mock Square API
global.fetch = jest.fn();

const mockDb = db as any;

describe('Catering System Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods to suppress logs during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Set up environment variables for testing
    process.env.USE_SQUARE_SANDBOX = 'true';
    process.env.SQUARE_SANDBOX_TOKEN = 'mock-sandbox-token';
    process.env.SQUARE_LOCATION_ID = 'mock-location-id';
    process.env.NEXT_PUBLIC_APP_URL = 'https://test.destinosf.com';
    process.env.SUPPORT_EMAIL = 'test@destinosf.com';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    
    // Clean up environment variables
    delete process.env.USE_SQUARE_SANDBOX;
    delete process.env.SQUARE_SANDBOX_TOKEN;
    delete process.env.SQUARE_LOCATION_ID;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.SUPPORT_EMAIL;
  });

  describe('Package Management', () => {
    test('should fetch active catering packages successfully', async () => {
      const mockPackages = [
        {
          id: 'pkg-1',
          name: 'Executive Package',
          description: 'Premium catering for corporate events',
          pricePerPerson: 45.00,
          minPeople: 10,
          maxPeople: 50,
          isActive: true,
          featuredOrder: 1,
          imageUrl: '/images/catering/executive.jpg',
        },
        {
          id: 'pkg-2',
          name: 'Family Package',
          description: 'Casual catering for family gatherings',
          pricePerPerson: 25.00,
          minPeople: 5,
          maxPeople: 25,
          isActive: true,
          featuredOrder: 2,
          imageUrl: '/images/catering/family.jpg',
        },
      ];

      mockDb.cateringPackage.findMany.mockResolvedValue(mockPackages);

      const result = await getCateringPackages();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Executive Package');
      expect(result[0].pricePerPerson).toBe(45.00);
      expect(result[1].name).toBe('Family Package');
      expect(result[1].pricePerPerson).toBe(25.00);
      
      expect(mockDb.cateringPackage.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { featuredOrder: 'asc' },
      });
    });

    test('should handle empty package list gracefully', async () => {
      mockDb.cateringPackage.findMany.mockResolvedValue([]);

      const result = await getCateringPackages();

      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });

    test('should handle database errors when fetching packages', async () => {
      mockDb.cateringPackage.findMany.mockRejectedValue(new Error('Database connection failed'));

      const result = await getCateringPackages();

      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Item Management', () => {
    test('should fetch active catering items and products', async () => {
      const mockCateringItems = [
        {
          id: 'item-1',
          name: 'Gourmet Appetizer Tray',
          description: 'Assorted premium appetizers',
          price: 85.00,
          category: 'APPETIZERS',
          isActive: true,
          imageUrl: '/images/catering/appetizers.jpg',
        },
      ];

      const mockCateringProducts = [
        {
          id: 'prod-1',
          name: 'Empanada Party Pack',
          description: '50 assorted empanadas',
          price: 150.00,
          categoryId: 'catering-category-1',
          images: ['/images/catering/empanadas.jpg'],
          active: true,
        },
      ];

      mockDb.cateringItem.findMany.mockResolvedValue(mockCateringItems);
      mockDb.product.findMany.mockResolvedValue(mockCateringProducts);

      const result = await getCateringItems();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].name).toBe('Gourmet Appetizer Tray');
      expect(result[0].price).toBe(85.00);
      
      expect(mockDb.cateringItem.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { category: 'asc' },
      });
    });

    test('should transform price values correctly', async () => {
      const mockItems = [
        {
          id: 'item-1',
          name: 'Test Item',
          price: '45.99', // String price from database
          category: 'ENTREES',
          isActive: true,
        },
      ];

      mockDb.cateringItem.findMany.mockResolvedValue(mockItems);
      mockDb.product.findMany.mockResolvedValue([]);

      const result = await getCateringItems();

      expect(result[0].price).toBe(45.99);
      expect(typeof result[0].price).toBe('number');
    });
  });

  describe('Delivery Zone Validation', () => {
    test('should validate order with valid delivery zone', async () => {
      const orderItems = [
        { id: 'item-1', quantity: 2, price: 150.00 },
        { id: 'item-2', quantity: 1, price: 200.00 },
      ];

      const deliveryAddress = {
        city: 'San Francisco',
        postalCode: '94105',
      };

      const result = await validateCateringOrderWithDeliveryZone(orderItems, deliveryAddress);

      expect(result.isValid).toBe(true);
      expect(result.currentAmount).toBe(500.00); // (150 * 2) + (200 * 1)
      expect(result.deliveryZone).toBeTruthy();
    });

    test('should reject order below zone minimum', async () => {
      const orderItems = [
        { id: 'item-1', quantity: 1, price: 100.00 }, // Below SF minimum of $250
      ];

      const deliveryAddress = {
        city: 'San Francisco',
        postalCode: '94105',
      };

      const result = await validateCateringOrderWithDeliveryZone(orderItems, deliveryAddress);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Minimum order');
      expect(result.currentAmount).toBe(100.00);
      expect(result.minimumRequired).toBeGreaterThan(100);
    });

    test('should reject delivery to unsupported zone', async () => {
      const orderItems = [
        { id: 'item-1', quantity: 1, price: 500.00 },
      ];

      const deliveryAddress = {
        city: 'Los Angeles', // Not in delivery zone
        postalCode: '90210',
      };

      const result = await validateCateringOrderWithDeliveryZone(orderItems, deliveryAddress);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('we currently do not deliver to this location');
    });

    test('should handle pickup orders without delivery validation', async () => {
      const orderItems = [
        { id: 'item-1', quantity: 1, price: 50.00 }, // Below minimums but pickup is allowed
      ];

      const result = await validateCateringOrderWithDeliveryZone(orderItems); // No delivery address

      expect(result.isValid).toBe(true);
      expect(result.currentAmount).toBe(50.00);
    });

    test('should handle empty cart validation', async () => {
      const result = await validateCateringOrderWithDeliveryZone([]);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Your cart is empty');
    });
  });

  describe('Customer Management', () => {
    test('should create new customer profile', async () => {
      const contactData = {
        name: 'John Catering',
        email: 'john@company.com',
        phone: '+1-415-555-0123',
      };

      mockDb.profile.findUnique.mockResolvedValue(null); // No existing profile
      mockDb.profile.create.mockResolvedValue({
        id: 'profile-123',
        email: contactData.email,
        name: contactData.name,
        phone: contactData.phone,
        role: 'CUSTOMER',
      });

      const result = await saveContactInfo(contactData);

      expect(result.success).toBe(true);
      if (isProfileSuccess(result)) {
        expect(result.data.profileId).toBe('profile-123');
      }
      
      expect(mockDb.profile.create).toHaveBeenCalledWith({
        data: {
          id: 'mock-uuid-123',
          email: 'john@company.com',
          name: 'John Catering',
          phone: '+1-415-555-0123',
          role: 'CUSTOMER',
        },
      });
    });

    test('should update existing customer profile', async () => {
      const contactData = {
        name: 'John Updated',
        email: 'john@company.com',
        phone: '+1-415-555-9999',
      };

      mockDb.profile.findUnique.mockResolvedValue({
        id: 'existing-profile',
        email: contactData.email,
        name: 'John Old',
        phone: '+1-415-555-0000',
      });

      mockDb.profile.update.mockResolvedValue({
        id: 'existing-profile',
        email: contactData.email,
        name: contactData.name,
        phone: contactData.phone,
        updated_at: new Date(),
      });

      const result = await saveContactInfo(contactData);

      expect(result.success).toBe(true);
      if (isProfileSuccess(result)) {
        expect(result.data.profileId).toBe('existing-profile');
      }
      
      expect(mockDb.profile.update).toHaveBeenCalledWith({
        where: { id: 'existing-profile' },
        data: {
          name: 'John Updated',
          phone: '+1-415-555-9999',
          updated_at: expect.any(Date),
        },
      });
    });

    test('should validate required contact information', async () => {
      const incompleteData = {
        name: '',
        email: 'john@company.com',
        phone: '+1-415-555-0123',
      };

      const result = await saveContactInfo(incompleteData);

      expect(result.success).toBe(false);
      if (isProfileError(result)) {
        expect(result.error).toContain('Name, email, and phone are required');
      }
    });
  });

  describe('Catering Inquiry Submission', () => {
    test('should submit catering inquiry successfully', async () => {
      const inquiryData = {
        name: 'Corporate Event Planner',
        email: 'events@company.com',
        phone: '+1-415-555-0100',
        eventDate: new Date('2024-12-01'),
        numberOfPeople: 25,
        notes: 'Corporate holiday party',
        packageId: 'pkg-1',
      };

      mockDb.cateringOrder.create.mockResolvedValue({
        id: 'inquiry-123',
        ...inquiryData,
        totalAmount: 0,
        status: 'PENDING',
      });

      const result = await submitCateringInquiry(inquiryData);

      expect(result.success).toBe(true);
      
      expect(mockDb.cateringOrder.create).toHaveBeenCalledWith({
        data: {
          name: inquiryData.name,
          email: inquiryData.email,
          phone: inquiryData.phone,
          eventDate: inquiryData.eventDate,
          numberOfPeople: inquiryData.numberOfPeople,
          notes: inquiryData.notes,
          totalAmount: 0,
          status: 'PENDING',
        },
      });
    });

    test('should handle inquiry submission errors', async () => {
      const inquiryData = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+1-415-555-0100',
        eventDate: new Date('2024-12-01'),
        numberOfPeople: 10,
      };

      mockDb.cateringOrder.create.mockRejectedValue(new Error('Database error'));

      const result = await submitCateringInquiry(inquiryData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to submit catering inquiry');
    });
  });

  describe('Order Processing with Square Integration', () => {
    test('should create catering order with Square payment successfully', async () => {
      const orderData = {
        customerInfo: {
          name: 'Jane Catering',
          email: 'jane@events.com',
          phone: '+1-415-555-0200',
          customerId: null,
        },
        eventDetails: {
          eventDate: new Date('2024-12-15'),
          numberOfPeople: 30,
          specialRequests: 'Vegetarian options needed',
        },
        fulfillment: {
          method: 'pickup' as const,
          pickupDate: '2024-12-15',
          pickupTime: '10:00 AM',
        },
        items: [
          {
            itemType: 'package' as const,
            packageId: 'pkg-1',
            itemId: null,
            name: 'Executive Package',
            quantity: 1,
            pricePerUnit: 1350.00, // 30 people * $45
            totalPrice: 1350.00,
          },
        ],
        totalAmount: 1350.00,
        paymentMethod: 'SQUARE' as const,
      };

      // Mock successful order creation
      mockDb.cateringOrder.create.mockResolvedValue({
        id: 'order-123',
        email: orderData.customerInfo.email,
        name: orderData.customerInfo.name,
        phone: orderData.customerInfo.phone,
        totalAmount: orderData.totalAmount,
        status: CateringStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        paymentMethod: PaymentMethod.SQUARE,
      });

      // Mock successful Square API response
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => ({
          payment_link: {
            url: 'https://sandbox.square.link/u/abc123',
            order_id: 'square-order-123',
          },
        }),
      } as Response);

      // Mock order update for Square info
      mockDb.cateringOrder.update.mockResolvedValue({
        id: 'order-123',
        squareOrderId: 'square-order-123',
        squareCheckoutUrl: 'https://sandbox.square.link/u/abc123',
      });

      const result = await createCateringOrderAndProcessPayment(orderData);

      expect(result.success).toBe(true);
      if (isOrderSuccess(result)) {
        expect(result.data?.orderId).toBe('order-123');
        expect(result.data?.checkoutUrl).toBe('https://sandbox.square.link/u/abc123');
      }
      
      // Verify order creation
      expect(mockDb.cateringOrder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'jane@events.com',
          name: 'Jane Catering',
          phone: '+1-415-555-0200',
          totalAmount: 1350.00,
          paymentMethod: PaymentMethod.SQUARE,
          status: CateringStatus.PENDING,
        }),
      });

      // Verify Square API call
      expect(fetch).toHaveBeenCalledWith(
        'https://connect.squareupsandbox.com/v2/online-checkout/payment-links',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-sandbox-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    test('should handle cash payment orders without Square integration', async () => {
      const cashOrderData = {
        customerInfo: {
          name: 'Cash Customer',
          email: 'cash@customer.com',
          phone: '+1-415-555-0300',
          customerId: null,
        },
        eventDetails: {
          eventDate: new Date('2024-12-20'),
          numberOfPeople: 15,
          specialRequests: null,
        },
        fulfillment: {
          method: 'pickup' as const,
          pickupDate: '2024-12-20',
          pickupTime: '2:00 PM',
        },
        items: [
          {
            itemType: 'item' as const,
            itemId: 'item-1',
            packageId: null,
            name: 'Appetizer Tray',
            quantity: 2,
            pricePerUnit: 85.00,
            totalPrice: 170.00,
          },
        ],
        totalAmount: 170.00,
        paymentMethod: 'CASH' as const,
      };

      mockDb.cateringOrder.create.mockResolvedValue({
        id: 'cash-order-123',
        status: CateringStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PENDING,
        paymentMethod: PaymentMethod.CASH,
      });

      const result = await createCateringOrderAndProcessPayment(cashOrderData);

      expect(result.success).toBe(true);
      expect(result.data.orderId).toBe('cash-order-123');
      expect(result.data.checkoutUrl).toBeUndefined(); // No Square URL for cash orders
      
      // Verify no Square API call for cash orders
      expect(fetch).not.toHaveBeenCalled();
      
      // Verify order created with correct status
      expect(mockDb.cateringOrder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          paymentMethod: PaymentMethod.CASH,
          status: CateringStatus.CONFIRMED, // Cash orders are confirmed immediately
          paymentStatus: PaymentStatus.PENDING,
        }),
      });
    });

    test('should handle delivery orders with zone validation and fees', async () => {
      const deliveryOrderData = {
        customerInfo: {
          name: 'Delivery Customer',
          email: 'delivery@company.com',
          phone: '+1-415-555-0400',
          customerId: null,
        },
        eventDetails: {
          eventDate: new Date('2024-12-25'),
          numberOfPeople: 40,
          specialRequests: 'Please call upon arrival',
        },
        fulfillment: {
          method: 'local_delivery' as const,
          deliveryAddress: {
            street: '123 Business St',
            street2: 'Suite 200',
            city: 'San Francisco',
            state: 'CA',
            postalCode: '94105',
          },
          deliveryDate: '2024-12-25',
          deliveryTime: '11:00 AM',
        },
        items: [
          {
            itemType: 'package' as const,
            packageId: 'pkg-1',
            itemId: null,
            name: 'Executive Package',
            quantity: 1,
            pricePerUnit: 1800.00, // 40 people * $45
            totalPrice: 1800.00,
          },
        ],
        totalAmount: 1850.00, // Including delivery fee
        paymentMethod: 'SQUARE' as const,
      };

      mockDb.cateringOrder.create.mockResolvedValue({
        id: 'delivery-order-123',
        deliveryZone: DeliveryZone.SAN_FRANCISCO,
        deliveryFee: 50.00,
        deliveryAddress: '123 Business St Suite 200 San Francisco, CA 94105',
      });

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => ({
          payment_link: {
            url: 'https://sandbox.square.link/u/delivery123',
            order_id: 'square-delivery-order-123',
          },
        }),
      } as Response);

      mockDb.cateringOrder.update.mockResolvedValue({});

      const result = await createCateringOrderAndProcessPayment(deliveryOrderData);

      expect(result.success).toBe(true);
      expect(result.data.orderId).toBe('delivery-order-123');
      
      // Verify delivery information was stored
      expect(mockDb.cateringOrder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deliveryAddress: '123 Business St Suite 200 San Francisco, CA 94105',
          deliveryZone: expect.any(String),
          deliveryFee: expect.any(Number),
        }),
      });
    });

    test('should handle Square API errors gracefully', async () => {
      const orderData = {
        customerInfo: {
          name: 'Error Test',
          email: 'error@test.com',
          phone: '+1-415-555-0500',
          customerId: null,
        },
        eventDetails: {
          eventDate: new Date('2024-12-30'),
          numberOfPeople: 20,
          specialRequests: null,
        },
        fulfillment: {
          method: 'pickup' as const,
          pickupDate: '2024-12-30',
          pickupTime: '1:00 PM',
        },
        items: [
          {
            itemType: 'item' as const,
            itemId: 'item-1',
            packageId: null,
            name: 'Test Item',
            quantity: 1,
            pricePerUnit: 100.00,
            totalPrice: 100.00,
          },
        ],
        totalAmount: 100.00,
        paymentMethod: 'SQUARE' as const,
      };

      mockDb.cateringOrder.create.mockResolvedValue({
        id: 'error-order-123',
      });

      // Mock Square API error
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          errors: [
            {
              code: 'INVALID_REQUEST_ERROR',
              detail: 'Invalid payment amount',
            },
          ],
        }),
      } as Response);

      mockDb.cateringOrder.update.mockResolvedValue({});

      const result = await createCateringOrderAndProcessPayment(orderData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Payment provider error');
      
      // Verify order was marked as cancelled due to Square error
      expect(mockDb.cateringOrder.update).toHaveBeenCalledWith({
        where: { id: 'error-order-123' },
        data: expect.objectContaining({
          status: CateringStatus.CANCELLED,
          paymentStatus: PaymentStatus.FAILED,
        }),
      });
    });

    test('should handle missing Square configuration', async () => {
      // Remove Square configuration
      delete process.env.SQUARE_LOCATION_ID;

      const orderData = {
        customerInfo: {
          name: 'Config Error',
          email: 'config@error.com',
          phone: '+1-415-555-0600',
          customerId: null,
        },
        eventDetails: {
          eventDate: new Date('2024-12-31'),
          numberOfPeople: 10,
          specialRequests: null,
        },
        fulfillment: {
          method: 'pickup' as const,
          pickupDate: '2024-12-31',
          pickupTime: '10:00 AM',
        },
        items: [
          {
            itemType: 'item' as const,
            itemId: 'item-1',
            packageId: null,
            name: 'Test Item',
            quantity: 1,
            pricePerUnit: 50.00,
            totalPrice: 50.00,
          },
        ],
        totalAmount: 50.00,
        paymentMethod: 'SQUARE' as const,
      };

      mockDb.cateringOrder.create.mockResolvedValue({
        id: 'config-error-order-123',
      });

      mockDb.cateringOrder.update.mockResolvedValue({});

      const result = await createCateringOrderAndProcessPayment(orderData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Payment provider configuration error');
      
      // Verify order was marked as cancelled due to config error
      expect(mockDb.cateringOrder.update).toHaveBeenCalledWith({
        where: { id: 'config-error-order-123' },
        data: expect.objectContaining({
          status: CateringStatus.CANCELLED,
          paymentStatus: PaymentStatus.FAILED,
          notes: 'Square config error (missing credentials)',
        }),
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle database connection errors gracefully', async () => {
      mockDb.cateringPackage.findMany.mockRejectedValue(new Error('Connection timeout'));

      const packages = await getCateringPackages();
      expect(packages).toEqual([]);

      mockDb.cateringItem.findMany.mockRejectedValue(new Error('Connection timeout'));
      
      const items = await getCateringItems();
      expect(items).toEqual([]);
    });

    test('should validate order data integrity', async () => {
      const invalidOrderData = {
        customerInfo: {
          name: '',
          email: 'invalid-email',
          phone: '',
          customerId: null,
        },
        eventDetails: {
          eventDate: new Date('2020-01-01'), // Past date
          numberOfPeople: 0,
          specialRequests: null,
        },
        fulfillment: {
          method: 'pickup' as const,
        },
        items: [], // Empty items
        totalAmount: -100, // Invalid amount
        paymentMethod: 'SQUARE' as const,
      };

      mockDb.cateringOrder.create.mockRejectedValue(new Error('Validation failed'));

      const result = await createCateringOrderAndProcessPayment(invalidOrderData);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });
}); 