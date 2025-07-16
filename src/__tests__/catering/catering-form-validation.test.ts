import { describe, test, expect, beforeEach } from '@jest/globals';
import { z } from 'zod';
import { addDays, subDays, format } from 'date-fns';

// Import form validation schemas and functions (these would be defined in your catering form components)
// For this test, we'll define them here to demonstrate the validation logic

// Phone number validation for catering orders
const cateringPhoneSchema = z.string()
  .min(7, 'Phone number must be at least 7 digits')
  .max(20, 'Phone number is too long')
  .refine((phone) => {
    // Remove all non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 7 && digitsOnly.length <= 15;
  }, {
    message: 'Please enter a valid phone number (7-15 digits)'
  });

// Customer information form schema
const customerInfoSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: cateringPhoneSchema,
  eventDate: z.date({
    required_error: 'Please select an event date',
  }).refine((date) => {
    const minDate = addDays(new Date(), 5);
    minDate.setHours(0, 0, 0, 0);
    return date >= minDate;
  }, {
    message: 'Catering orders must be confirmed 5 days in advance',
  }),
  specialRequests: z.string().optional(),
});

// Delivery address validation schema
const deliveryAddressSchema = z.object({
  street: z.string().min(5, 'Street address must be at least 5 characters'),
  street2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid postal code'),
});

// Fulfillment method validation
const fulfillmentSchema = z.object({
  method: z.enum(['pickup', 'local_delivery'], {
    required_error: 'Please select a fulfillment method',
  }),
  pickupDate: z.string().optional(),
  pickupTime: z.string().optional(),
  deliveryAddress: deliveryAddressSchema.optional(),
  deliveryDate: z.string().optional(),
  deliveryTime: z.string().optional(),
}).refine((data) => {
  // If delivery method is selected, delivery address is required
  if (data.method === 'local_delivery') {
    return data.deliveryAddress && data.deliveryDate && data.deliveryTime;
  }
  // If pickup method is selected, pickup details are required
  if (data.method === 'pickup') {
    return data.pickupDate && data.pickupTime;
  }
  return true;
}, {
  message: 'Please provide all required details for your selected fulfillment method',
});

// Order item validation
const orderItemSchema = z.object({
  itemType: z.enum(['package', 'item']),
  itemId: z.string().optional().nullable(),
  packageId: z.string().optional().nullable(),
  name: z.string().min(1, 'Item name is required'),
  quantity: z.number().int().positive('Quantity must be a positive number'),
  pricePerUnit: z.number().positive('Price must be positive'),
  totalPrice: z.number().positive('Total price must be positive'),
  notes: z.string().optional().nullable(),
}).refine((data) => {
  // Either itemId or packageId should be present based on itemType
  if (data.itemType === 'item') {
    return data.itemId !== null;
  }
  if (data.itemType === 'package') {
    return data.packageId !== null;
  }
  return true;
}, {
  message: 'Item ID is required for items and Package ID is required for packages',
});

// Complete catering order validation
const cateringOrderSchema = z.object({
  customerInfo: customerInfoSchema,
  fulfillment: fulfillmentSchema,
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  totalAmount: z.number().positive('Total amount must be positive'),
  paymentMethod: z.enum(['SQUARE', 'CASH']).default('SQUARE'),
});

// Helper functions for validation
const validateDeliveryZone = (address: { city: string; postalCode: string }) => {
  const supportedZones = [
    { name: 'San Francisco', cities: ['san francisco'], zipRanges: ['94102-94199'] },
    { name: 'South Bay', cities: ['san jose', 'santa clara', 'sunnyvale'], zipRanges: ['95110-95199'] },
    { name: 'Peninsula', cities: ['palo alto', 'mountain view', 'redwood city'], zipRanges: ['94301-94399'] },
  ];

  const cityLower = address.city.toLowerCase();
  const zipCode = parseInt(address.postalCode.replace(/\D/g, '').substring(0, 5));

  return supportedZones.some(zone => 
    zone.cities.some(city => cityLower.includes(city)) ||
    zone.zipRanges.some(range => {
      const [min, max] = range.split('-').map(Number);
      return zipCode >= min && zipCode <= max;
    })
  );
};

const validateMinimumOrder = (items: any[], deliveryZone?: string) => {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  
  const minimums: Record<string, number> = {
    'San Francisco': 250,
    'South Bay': 350,
    'Peninsula': 400,
    'pickup': 0, // No minimum for pickup
  };

  const requiredMinimum = minimums[deliveryZone || 'pickup'] || 0;
  
  return {
    isValid: subtotal >= requiredMinimum,
    currentAmount: subtotal,
    minimumRequired: requiredMinimum,
    shortfall: Math.max(0, requiredMinimum - subtotal),
  };
};

describe('Catering Form Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Customer Information Validation', () => {
    test('should validate complete customer information', () => {
      const validCustomerInfo = {
        name: 'John Catering',
        email: 'john@company.com',
        phone: '+1-415-555-0123',
        eventDate: addDays(new Date(), 7),
        specialRequests: 'Vegetarian options needed',
      };

      const result = customerInfoSchema.safeParse(validCustomerInfo);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('John Catering');
        expect(result.data.email).toBe('john@company.com');
        expect(result.data.phone).toBe('+1-415-555-0123');
      }
    });

    test('should reject invalid names', () => {
      const invalidNames = ['', 'A', ' ', '  '];

      invalidNames.forEach(name => {
        const customerInfo = {
          name,
          email: 'test@example.com',
          phone: '+1-415-555-0123',
          eventDate: addDays(new Date(), 7),
        };

        const result = customerInfoSchema.safeParse(customerInfo);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(issue => 
            issue.path.includes('name') && issue.message.includes('at least 2 characters')
          )).toBe(true);
        }
      });
    });

    test('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user space@domain.com',
        '',
      ];

      invalidEmails.forEach(email => {
        const customerInfo = {
          name: 'Valid Name',
          email,
          phone: '+1-415-555-0123',
          eventDate: addDays(new Date(), 7),
        };

        const result = customerInfoSchema.safeParse(customerInfo);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(issue => 
            issue.path.includes('email') && issue.message.includes('valid email')
          )).toBe(true);
        }
      });
    });

    test('should validate various phone number formats', () => {
      const validPhones = [
        '+1-415-555-0123',
        '(415) 555-0123',
        '415.555.0123',
        '4155550123',
        '+14155550123',
        '415-555-0123',
      ];

      validPhones.forEach(phone => {
        const customerInfo = {
          name: 'Valid Name',
          email: 'test@example.com',
          phone,
          eventDate: addDays(new Date(), 7),
        };

        const result = customerInfoSchema.safeParse(customerInfo);
        expect(result.success).toBe(true);
      });
    });

    test('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '123',           // Too short
        '',              // Empty
        'not-a-number',  // No digits
        '12345678901234567890', // Too long
        '123-45',        // Too few digits
      ];

      invalidPhones.forEach(phone => {
        const customerInfo = {
          name: 'Valid Name',
          email: 'test@example.com',
          phone,
          eventDate: addDays(new Date(), 7),
        };

        const result = customerInfoSchema.safeParse(customerInfo);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(issue => 
            issue.path.includes('phone')
          )).toBe(true);
        }
      });
    });

    test('should enforce 5-day advance notice for event dates', () => {
      const invalidDates = [
        new Date(), // Today
        addDays(new Date(), 1), // Tomorrow
        addDays(new Date(), 4), // 4 days (less than 5)
        subDays(new Date(), 1), // Past date
      ];

      invalidDates.forEach(eventDate => {
        const customerInfo = {
          name: 'Valid Name',
          email: 'test@example.com',
          phone: '+1-415-555-0123',
          eventDate,
        };

        const result = customerInfoSchema.safeParse(customerInfo);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(issue => 
            issue.path.includes('eventDate') && issue.message.includes('5 days in advance')
          )).toBe(true);
        }
      });
    });

    test('should accept valid future event dates', () => {
      const validDates = [
        addDays(new Date(), 5), // Exactly 5 days
        addDays(new Date(), 7), // 1 week
        addDays(new Date(), 30), // 1 month
        addDays(new Date(), 365), // 1 year
      ];

      validDates.forEach(eventDate => {
        const customerInfo = {
          name: 'Valid Name',
          email: 'test@example.com',
          phone: '+1-415-555-0123',
          eventDate,
        };

        const result = customerInfoSchema.safeParse(customerInfo);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Delivery Address Validation', () => {
    test('should validate complete delivery address', () => {
      const validAddress = {
        street: '123 Business Street',
        street2: 'Suite 200',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
      };

      const result = deliveryAddressSchema.safeParse(validAddress);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.street).toBe('123 Business Street');
        expect(result.data.city).toBe('San Francisco');
        expect(result.data.postalCode).toBe('94105');
      }
    });

    test('should reject short street addresses', () => {
      const invalidAddresses = [
        { street: '123', city: 'San Francisco', state: 'CA', postalCode: '94105' },
        { street: 'St', city: 'San Francisco', state: 'CA', postalCode: '94105' },
        { street: '', city: 'San Francisco', state: 'CA', postalCode: '94105' },
      ];

      invalidAddresses.forEach(address => {
        const result = deliveryAddressSchema.safeParse(address);
        expect(result.success).toBe(false);
      });
    });

    test('should validate postal code formats', () => {
      const validPostalCodes = ['94105', '94105-1234', '12345', '90210-0000'];
      const invalidPostalCodes = ['9410', '941055', 'ABCDE', '94105-12345', ''];

      validPostalCodes.forEach(postalCode => {
        const address = {
          street: '123 Valid Street',
          city: 'San Francisco',
          state: 'CA',
          postalCode,
        };

        const result = deliveryAddressSchema.safeParse(address);
        expect(result.success).toBe(true);
      });

      invalidPostalCodes.forEach(postalCode => {
        const address = {
          street: '123 Valid Street',
          city: 'San Francisco',
          state: 'CA',
          postalCode,
        };

        const result = deliveryAddressSchema.safeParse(address);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Fulfillment Method Validation', () => {
    test('should validate pickup fulfillment', () => {
      const pickupData = {
        method: 'pickup' as const,
        pickupDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
        pickupTime: '10:00 AM',
      };

      const result = fulfillmentSchema.safeParse(pickupData);
      expect(result.success).toBe(true);
    });

    test('should validate delivery fulfillment', () => {
      const deliveryData = {
        method: 'local_delivery' as const,
        deliveryAddress: {
          street: '123 Business Street',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94105',
        },
        deliveryDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
        deliveryTime: '2:00 PM',
      };

      const result = fulfillmentSchema.safeParse(deliveryData);
      expect(result.success).toBe(true);
    });

    test('should require pickup details for pickup method', () => {
      const incompletePickupData = {
        method: 'pickup' as const,
        // Missing pickupDate and pickupTime
      };

      const result = fulfillmentSchema.safeParse(incompletePickupData);
      expect(result.success).toBe(false);
    });

    test('should require delivery details for delivery method', () => {
      const incompleteDeliveryData = {
        method: 'local_delivery' as const,
        deliveryAddress: {
          street: '123 Business Street',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94105',
        },
        // Missing deliveryDate and deliveryTime
      };

      const result = fulfillmentSchema.safeParse(incompleteDeliveryData);
      expect(result.success).toBe(false);
    });
  });

  describe('Order Items Validation', () => {
    test('should validate catering package items', () => {
      const packageItem = {
        itemType: 'package' as const,
        packageId: 'pkg-123',
        itemId: null,
        name: 'Executive Package',
        quantity: 25,
        pricePerUnit: 45.00,
        totalPrice: 1125.00,
        notes: null,
      };

      const result = orderItemSchema.safeParse(packageItem);
      expect(result.success).toBe(true);
    });

    test('should validate individual catering items', () => {
      const individualItem = {
        itemType: 'item' as const,
        itemId: 'item-456',
        packageId: null,
        name: 'Gourmet Appetizer Tray',
        quantity: 3,
        pricePerUnit: 85.00,
        totalPrice: 255.00,
        notes: 'Extra vegetarian options',
      };

      const result = orderItemSchema.safeParse(individualItem);
      expect(result.success).toBe(true);
    });

    test('should reject items with missing IDs', () => {
      const itemWithoutId = {
        itemType: 'item' as const,
        itemId: null, // Should have itemId for item type
        packageId: null,
        name: 'Invalid Item',
        quantity: 1,
        pricePerUnit: 50.00,
        totalPrice: 50.00,
      };

      const result = orderItemSchema.safeParse(itemWithoutId);
      expect(result.success).toBe(false);
    });

    test('should reject items with invalid quantities', () => {
      const invalidQuantities = [0, -1, -10, 0.5]; // Zero, negative, or decimal

      invalidQuantities.forEach(quantity => {
        const item = {
          itemType: 'item' as const,
          itemId: 'item-123',
          packageId: null,
          name: 'Test Item',
          quantity,
          pricePerUnit: 50.00,
          totalPrice: 50.00 * quantity,
        };

        const result = orderItemSchema.safeParse(item);
        expect(result.success).toBe(false);
      });
    });

    test('should reject items with invalid pricing', () => {
      const invalidPrices = [0, -10, -0.01]; // Zero or negative prices

      invalidPrices.forEach(price => {
        const item = {
          itemType: 'item' as const,
          itemId: 'item-123',
          packageId: null,
          name: 'Test Item',
          quantity: 1,
          pricePerUnit: price,
          totalPrice: price,
        };

        const result = orderItemSchema.safeParse(item);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Complete Order Validation', () => {
    test('should validate complete catering order', () => {
      const completeOrder = {
        customerInfo: {
          name: 'Complete Order Test',
          email: 'complete@test.com',
          phone: '+1-415-555-9999',
          eventDate: addDays(new Date(), 10),
          specialRequests: 'Complete order test',
        },
        fulfillment: {
          method: 'local_delivery' as const,
          deliveryAddress: {
            street: '456 Complete Street',
            city: 'San Francisco',
            state: 'CA',
            postalCode: '94107',
          },
          deliveryDate: format(addDays(new Date(), 10), 'yyyy-MM-dd'),
          deliveryTime: '12:00 PM',
        },
        items: [
          {
            itemType: 'package' as const,
            packageId: 'pkg-executive',
            itemId: null,
            name: 'Executive Package',
            quantity: 30,
            pricePerUnit: 45.00,
            totalPrice: 1350.00,
          },
          {
            itemType: 'item' as const,
            itemId: 'wine-service',
            packageId: null,
            name: 'Wine Service',
            quantity: 30,
            pricePerUnit: 25.00,
            totalPrice: 750.00,
          },
        ],
        totalAmount: 2100.00,
        paymentMethod: 'SQUARE' as const,
      };

      const result = cateringOrderSchema.safeParse(completeOrder);
      expect(result.success).toBe(true);
    });

    test('should reject orders with empty items', () => {
      const orderWithoutItems = {
        customerInfo: {
          name: 'No Items Test',
          email: 'noitems@test.com',
          phone: '+1-415-555-8888',
          eventDate: addDays(new Date(), 10),
        },
        fulfillment: {
          method: 'pickup' as const,
          pickupDate: format(addDays(new Date(), 10), 'yyyy-MM-dd'),
          pickupTime: '10:00 AM',
        },
        items: [], // Empty items array
        totalAmount: 0,
        paymentMethod: 'SQUARE' as const,
      };

      const result = cateringOrderSchema.safeParse(orderWithoutItems);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.path.includes('items') && issue.message.includes('At least one item')
        )).toBe(true);
      }
    });

    test('should reject orders with invalid total amounts', () => {
      const invalidTotals = [0, -100, -0.01];

      invalidTotals.forEach(totalAmount => {
        const order = {
          customerInfo: {
            name: 'Invalid Total Test',
            email: 'invalid@test.com',
            phone: '+1-415-555-7777',
            eventDate: addDays(new Date(), 10),
          },
          fulfillment: {
            method: 'pickup' as const,
            pickupDate: format(addDays(new Date(), 10), 'yyyy-MM-dd'),
            pickupTime: '10:00 AM',
          },
          items: [
            {
              itemType: 'item' as const,
              itemId: 'test-item',
              packageId: null,
              name: 'Test Item',
              quantity: 1,
              pricePerUnit: 50.00,
              totalPrice: 50.00,
            },
          ],
          totalAmount,
          paymentMethod: 'SQUARE' as const,
        };

        const result = cateringOrderSchema.safeParse(order);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Business Logic Validation', () => {
    test('should validate delivery zones correctly', () => {
      const validZones = [
        { city: 'San Francisco', postalCode: '94105' },
        { city: 'San Jose', postalCode: '95110' },
        { city: 'Palo Alto', postalCode: '94301' },
        { city: 'Mountain View', postalCode: '94043' },
      ];

      validZones.forEach(address => {
        const isValid = validateDeliveryZone(address);
        expect(isValid).toBe(true);
      });
    });

    test('should reject unsupported delivery zones', () => {
      const unsupportedZones = [
        { city: 'Los Angeles', postalCode: '90210' },
        { city: 'Sacramento', postalCode: '95814' },
        { city: 'Las Vegas', postalCode: '89101' },
      ];

      unsupportedZones.forEach(address => {
        const isValid = validateDeliveryZone(address);
        expect(isValid).toBe(false);
      });
    });

    test('should validate minimum order requirements by zone', () => {
      const items = [
        {
          itemType: 'package',
          name: 'Test Package',
          quantity: 10,
          pricePerUnit: 30.00,
          totalPrice: 300.00,
        },
      ];

      // San Francisco minimum: $250 - should pass
      const sfValidation = validateMinimumOrder(items, 'San Francisco');
      expect(sfValidation.isValid).toBe(true);
      expect(sfValidation.currentAmount).toBe(300.00);
      expect(sfValidation.minimumRequired).toBe(250);

      // South Bay minimum: $350 - should fail
      const southBayValidation = validateMinimumOrder(items, 'South Bay');
      expect(southBayValidation.isValid).toBe(false);
      expect(southBayValidation.currentAmount).toBe(300.00);
      expect(southBayValidation.minimumRequired).toBe(350);
      expect(southBayValidation.shortfall).toBe(50);

      // Pickup - no minimum, should pass
      const pickupValidation = validateMinimumOrder(items, 'pickup');
      expect(pickupValidation.isValid).toBe(true);
      expect(pickupValidation.minimumRequired).toBe(0);
    });

    test('should calculate order shortfalls correctly', () => {
      const smallOrder = [
        {
          itemType: 'item',
          name: 'Small Item',
          quantity: 1,
          pricePerUnit: 100.00,
          totalPrice: 100.00,
        },
      ];

      const peninsulaValidation = validateMinimumOrder(smallOrder, 'Peninsula');
      expect(peninsulaValidation.isValid).toBe(false);
      expect(peninsulaValidation.currentAmount).toBe(100.00);
      expect(peninsulaValidation.minimumRequired).toBe(400);
      expect(peninsulaValidation.shortfall).toBe(300);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle malformed data gracefully', () => {
      const malformedData = {
        customerInfo: {
          name: null, // Should be string
          email: 123, // Should be string
          phone: [], // Should be string
          eventDate: 'not-a-date', // Should be Date
        },
        fulfillment: 'invalid', // Should be object
        items: 'not-an-array', // Should be array
        totalAmount: 'not-a-number', // Should be number
      };

      const result = cateringOrderSchema.safeParse(malformedData);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    test('should provide helpful error messages', () => {
      const invalidOrder = {
        customerInfo: {
          name: 'A', // Too short
          email: 'invalid-email', // Invalid format
          phone: '123', // Too short
          eventDate: subDays(new Date(), 1), // Past date
        },
        fulfillment: {
          method: 'pickup' as const,
          // Missing pickup details
        },
        items: [], // Empty items
        totalAmount: -100, // Negative amount
        paymentMethod: 'INVALID' as any, // Invalid payment method
      };

      const result = cateringOrderSchema.safeParse(invalidOrder);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const errorMessages = result.error.issues.map(issue => issue.message);
        
        expect(errorMessages.some(msg => msg.includes('at least 2 characters'))).toBe(true);
        expect(errorMessages.some(msg => msg.includes('valid email'))).toBe(true);
        expect(errorMessages.some(msg => msg.includes('5 days in advance'))).toBe(true);
        expect(errorMessages.some(msg => msg.includes('At least one item'))).toBe(true);
      }
    });

    test('should validate concurrent form submissions', () => {
      const validOrder = {
        customerInfo: {
          name: 'Concurrent Test',
          email: 'concurrent@test.com',
          phone: '+1-415-555-6666',
          eventDate: addDays(new Date(), 15),
        },
        fulfillment: {
          method: 'pickup' as const,
          pickupDate: format(addDays(new Date(), 15), 'yyyy-MM-dd'),
          pickupTime: '3:00 PM',
        },
        items: [
          {
            itemType: 'item' as const,
            itemId: 'concurrent-item',
            packageId: null,
            name: 'Concurrent Test Item',
            quantity: 5,
            pricePerUnit: 60.00,
            totalPrice: 300.00,
          },
        ],
        totalAmount: 300.00,
        paymentMethod: 'SQUARE' as const,
      };

      // Simulate multiple rapid validations
      const results = Array.from({ length: 10 }, () => 
        cateringOrderSchema.safeParse(validOrder)
      );

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
}); 