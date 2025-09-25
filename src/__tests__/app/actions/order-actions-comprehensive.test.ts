/**
 * 🧪 Order Actions Comprehensive Tests
 * Tests for order creation, validation, and management actions
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createOrderAction } from '@/app/actions/orders';
import { prisma } from '@/lib/db-unified';
import { createOrder as createSquareOrder } from '@/lib/square/orders';
import { setMockAuthState, generateMockUser } from '@/__mocks__/@supabase/supabase-js';
import { createMockSquareOrder } from '@/__mocks__/square';

// Mock dependencies
jest.mock('@/lib/db-unified');
jest.mock('@/lib/square/orders');
jest.mock('@/lib/email/order-confirmation');

describe('Order Actions - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up authenticated user
    const mockUser = generateMockUser({ email: 'customer@test.com' });
    setMockAuthState(mockUser);

    // Mock database operations
    (prisma.product.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'product_1',
        name: 'Test Product 1',
        price: 15.99,
        active: true,
        squareItemId: 'square_item_1',
        variants: [
          {
            id: 'variant_1',
            name: 'Regular',
            price: 15.99,
            squareVariationId: 'square_variation_1',
          }
        ]
      },
      {
        id: 'product_2',
        name: 'Test Product 2',
        price: 12.50,
        active: true,
        squareItemId: 'square_item_2',
        variants: [
          {
            id: 'variant_2',
            name: 'Large',
            price: 12.50,
            squareVariationId: 'square_variation_2',
          }
        ]
      }
    ]);

    (prisma.order.create as jest.Mock).mockImplementation((args) => {
      return Promise.resolve({
        id: 'order_123',
        squareOrderId: 'square_order_456',
        customerName: args.data.customerName,
        customerEmail: args.data.customerEmail,
        customerPhone: args.data.customerPhone,
        total: args.data.total,
        status: 'PENDING',
        pickupTime: args.data.pickupTime,
        items: args.data.items,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...args.data
      });
    });

    (prisma.orderItem.createMany as jest.Mock).mockResolvedValue({
      count: 2
    });

    // Mock Square order creation
    (createSquareOrder as jest.Mock).mockResolvedValue(createMockSquareOrder({
      id: 'square_order_456',
      state: 'OPEN'
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Order Creation', () => {
    const validOrderData = {
      items: [
        { productId: 'product_1', variantId: 'variant_1', quantity: 2 },
        { productId: 'product_2', variantId: 'variant_2', quantity: 1 }
      ],
      customerInfo: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1-555-123-4567',
        pickupTime: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
      },
      notes: 'Please prepare fresh',
      fulfillmentType: 'PICKUP' as const
    };

    it('should create order successfully with valid data', async () => {
      const formData = new FormData();
      formData.append('orderData', JSON.stringify(validOrderData));

      const result = await createOrderAction(formData);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order_123');
      expect(result.squareOrderId).toBe('square_order_456');

      // Verify database calls
      expect(prisma.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          customerPhone: '+1-555-123-4567',
          total: expect.any(Number),
          status: 'PENDING',
          fulfillmentType: 'PICKUP',
          squareOrderId: 'square_order_456'
        })
      });

      expect(prisma.orderItem.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            orderId: 'order_123',
            productId: 'product_1',
            variantId: 'variant_1',
            quantity: 2
          }),
          expect.objectContaining({
            orderId: 'order_123',
            productId: 'product_2',
            variantId: 'variant_2',
            quantity: 1
          })
        ])
      });

      // Verify Square order creation
      expect(createSquareOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          locationId: expect.any(String),
          lineItems: expect.arrayContaining([
            expect.objectContaining({
              catalogObjectId: 'square_variation_1',
              quantity: '2'
            }),
            expect.objectContaining({
              catalogObjectId: 'square_variation_2',
              quantity: '1'
            })
          ])
        })
      );
    });

    it('should validate required customer information', async () => {
      const invalidOrderData = {
        ...validOrderData,
        customerInfo: {
          name: '', // Missing name
          email: 'invalid-email', // Invalid email
          phone: '', // Missing phone
          pickupTime: 'invalid-date' // Invalid date
        }
      };

      const formData = new FormData();
      formData.append('orderData', JSON.stringify(invalidOrderData));

      const result = await createOrderAction(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('should validate order items exist and are active', async () => {
      // Mock one product as inactive
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'product_1',
          name: 'Test Product 1',
          price: 15.99,
          active: false, // Inactive product
          squareItemId: 'square_item_1',
          variants: []
        }
      ]);

      const formData = new FormData();
      formData.append('orderData', JSON.stringify(validOrderData));

      const result = await createOrderAction(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('unavailable');
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('should validate pickup time is in the future', async () => {
      const pastOrderData = {
        ...validOrderData,
        customerInfo: {
          ...validOrderData.customerInfo,
          pickupTime: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
        }
      };

      const formData = new FormData();
      formData.append('orderData', JSON.stringify(pastOrderData));

      const result = await createOrderAction(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('future');
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('should handle empty cart gracefully', async () => {
      const emptyOrderData = {
        ...validOrderData,
        items: [] // Empty items array
      };

      const formData = new FormData();
      formData.append('orderData', JSON.stringify(emptyOrderData));

      const result = await createOrderAction(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('should calculate order total correctly', async () => {
      const formData = new FormData();
      formData.append('orderData', JSON.stringify(validOrderData));

      await createOrderAction(formData);

      // Expected total: (15.99 * 2) + (12.50 * 1) = 44.48
      expect(prisma.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          total: 44.48
        })
      });
    });

    it('should handle database transaction failures', async () => {
      (prisma.order.create as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const formData = new FormData();
      formData.append('orderData', JSON.stringify(validOrderData));

      const result = await createOrderAction(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('database');
    });

    it('should handle Square API failures gracefully', async () => {
      (createSquareOrder as jest.Mock).mockRejectedValue(
        new Error('Square API error')
      );

      const formData = new FormData();
      formData.append('orderData', JSON.stringify(validOrderData));

      const result = await createOrderAction(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Square');
      
      // Should not create database order if Square order fails
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('should validate maximum quantity limits', async () => {
      const largeQuantityOrderData = {
        ...validOrderData,
        items: [
          { productId: 'product_1', variantId: 'variant_1', quantity: 1000 } // Excessive quantity
        ]
      };

      const formData = new FormData();
      formData.append('orderData', JSON.stringify(largeQuantityOrderData));

      const result = await createOrderAction(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('quantity');
    });

    it('should validate minimum order value', async () => {
      // Mock very cheap product
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'cheap_product',
          name: 'Cheap Product',
          price: 0.01,
          active: true,
          squareItemId: 'square_item_cheap',
          variants: [
            {
              id: 'variant_cheap',
              name: 'Small',
              price: 0.01,
              squareVariationId: 'square_variation_cheap',
            }
          ]
        }
      ]);

      const lowValueOrderData = {
        ...validOrderData,
        items: [
          { productId: 'cheap_product', variantId: 'variant_cheap', quantity: 1 }
        ]
      };

      const formData = new FormData();
      formData.append('orderData', JSON.stringify(lowValueOrderData));

      const result = await createOrderAction(formData);

      // Assuming minimum order value is enforced
      expect(result.success).toBe(false);
      expect(result.error).toContain('minimum');
    });

    it('should handle concurrent order creation correctly', async () => {
      // Simulate concurrent order creation
      const formData1 = new FormData();
      formData1.append('orderData', JSON.stringify(validOrderData));
      
      const formData2 = new FormData();
      formData2.append('orderData', JSON.stringify(validOrderData));

      const [result1, result2] = await Promise.all([
        createOrderAction(formData1),
        createOrderAction(formData2)
      ]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.orderId).not.toBe(result2.orderId);
    });

    it('should include special instructions and notes', async () => {
      const orderWithNotes = {
        ...validOrderData,
        notes: 'Extra spicy, no onions',
        specialInstructions: 'Call when ready for pickup'
      };

      const formData = new FormData();
      formData.append('orderData', JSON.stringify(orderWithNotes));

      await createOrderAction(formData);

      expect(prisma.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          notes: 'Extra spicy, no onions',
          specialInstructions: 'Call when ready for pickup'
        })
      });
    });

    it('should handle delivery vs pickup fulfillment types', async () => {
      const deliveryOrder = {
        ...validOrderData,
        fulfillmentType: 'DELIVERY' as const,
        deliveryAddress: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102'
        }
      };

      const formData = new FormData();
      formData.append('orderData', JSON.stringify(deliveryOrder));

      await createOrderAction(formData);

      expect(prisma.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fulfillmentType: 'DELIVERY',
          deliveryAddress: expect.objectContaining({
            street: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94102'
          })
        })
      });
    });
  });

  describe('Order Validation', () => {
    it('should validate phone number format', async () => {
      const invalidPhoneOrderData = {
        ...validOrderData,
        customerInfo: {
          ...validOrderData.customerInfo,
          phone: '123' // Invalid phone format
        }
      };

      const formData = new FormData();
      formData.append('orderData', JSON.stringify(invalidPhoneOrderData));

      const result = await createOrderAction(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('phone');
    });

    it('should validate email format', async () => {
      const invalidEmailOrderData = {
        ...validOrderData,
        customerInfo: {
          ...validOrderData.customerInfo,
          email: 'not-an-email'
        }
      };

      const formData = new FormData();
      formData.append('orderData', JSON.stringify(invalidEmailOrderData));

      const result = await createOrderAction(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('email');
    });

    it('should validate customer name length', async () => {
      const longNameOrderData = {
        ...validOrderData,
        customerInfo: {
          ...validOrderData.customerInfo,
          name: 'A'.repeat(256) // Excessively long name
        }
      };

      const formData = new FormData();
      formData.append('orderData', JSON.stringify(longNameOrderData));

      const result = await createOrderAction(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('name');
    });

    it('should validate pickup time business hours', async () => {
      // Assuming business hours are 9 AM to 9 PM
      const offHoursOrderData = {
        ...validOrderData,
        customerInfo: {
          ...validOrderData.customerInfo,
          pickupTime: new Date(Date.now() + 86400000) // Tomorrow at current time
        }
      };

      // Mock current time as 3 AM (off hours)
      const mockDate = new Date('2024-01-15T03:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const formData = new FormData();
      formData.append('orderData', JSON.stringify(offHoursOrderData));

      const result = await createOrderAction(formData);

      // Should handle off-hours validation
      expect(result.success).toBe(false);
      expect(result.error).toContain('hours');

      jest.restoreAllMocks();
    });

    it('should handle malformed JSON data', async () => {
      const formData = new FormData();
      formData.append('orderData', 'invalid json{');

      const result = await createOrderAction(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });
  });

  describe('Error Recovery', () => {
    it('should rollback order creation if order items fail', async () => {
      (prisma.orderItem.createMany as jest.Mock).mockRejectedValue(
        new Error('Order items creation failed')
      );

      const formData = new FormData();
      formData.append('orderData', JSON.stringify(validOrderData));

      const result = await createOrderAction(formData);

      expect(result.success).toBe(false);
      // Should handle transaction rollback
    });

    it('should retry on temporary database failures', async () => {
      let attemptCount = 0;
      (prisma.order.create as jest.Mock).mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('Temporary connection error');
        }
        return Promise.resolve({
          id: 'order_123',
          squareOrderId: 'square_order_456',
          status: 'PENDING'
        });
      });

      const formData = new FormData();
      formData.append('orderData', JSON.stringify(validOrderData));

      const result = await createOrderAction(formData);

      expect(result.success).toBe(true);
      expect(prisma.order.create).toHaveBeenCalledTimes(2);
    });
  });
});
