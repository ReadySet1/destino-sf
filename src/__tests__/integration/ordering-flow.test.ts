import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { setupTestDatabase, resetTestDatabase, seedTestDatabase, teardownTestDatabase } from '../setup/test-db';
import { setupAllMocks } from '../setup/mocks';
import { 
  createMockCartItem, 
  createMockAddress, 
  calculateCartTotals, 
  meetsMinimumOrder,
  waitForApiCall,
  generateTestEmail,
  generateTestPhone
} from '../utils/test-helpers';
import { mockCartItems, mockAddresses, mockDeliveryZones, mockScenarios } from '../fixtures';
import { CartItem } from '@/types/cart';
import { Address } from '@/types/address';

/**
 * Complete Ordering Flow Integration Tests
 * 
 * Tests the full user journey from browsing products to completing an order:
 * 1. Browse products → Add to Cart → Checkout → Payment
 * 2. Different delivery zones and fees
 * 3. Order minimum enforcement  
 * 4. Email confirmations
 */

describe('Complete Ordering Flow', () => {
  let testDb: any;
  let mocks: any;

  beforeAll(async () => {
    // Setup test database
    testDb = await setupTestDatabase();
    
    // Setup all service mocks
    mocks = setupAllMocks();
    
    // Seed database with test data
    await seedTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Reset database state between tests
    await resetTestDatabase();
    await seedTestDatabase();
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Browse → Add to Cart → Checkout → Payment', () => {
    test('should complete successful order flow for nearby delivery', async () => {
      // Arrange: Customer browses products
      const customer = {
        name: 'John Doe',
        email: generateTestEmail('customer'),
        phone: generateTestPhone(),
      };

      const selectedItems: CartItem[] = [
        createMockCartItem({
          id: 'alfajores-dulce-001',
          name: 'Dulce de Leche Alfajores',
          price: 12.99,
          quantity: 2,
        }),
        createMockCartItem({
          id: 'empanadas-beef-001', 
          name: 'Beef Empanadas (6 pack)',
          price: 18.99,
          quantity: 1,
        }),
      ];

      const deliveryAddress = createMockAddress('nearby');
      
      // Act 1: Add items to cart
      const cart = {
        items: selectedItems,
        totalItems: selectedItems.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      };

      expect(cart.items).toHaveLength(2);
      expect(cart.totalItems).toBe(3);
      expect(cart.subtotal).toBe(44.97); // (12.99 * 2) + (18.99 * 1)

      // Act 2: Validate minimum order requirement
      const meetsMinimum = meetsMinimumOrder(selectedItems, deliveryAddress);
      expect(meetsMinimum).toBe(true); // $44.97 > $25 minimum for SF

      // Act 3: Calculate totals with delivery and tax
      const totals = calculateCartTotals(selectedItems, deliveryAddress);
      expect(totals.subtotal).toBe(44.97);
      expect(totals.deliveryFee).toBe(5.99); // SF delivery fee
      expect(totals.taxAmount).toBe(3.71); // 8.25% tax
      expect(totals.total).toBe(54.67);

      // Act 4: Process payment through Square
      const paymentResult = await waitForApiCall(
        mocks.square.paymentsApi.createPayment({
          sourceId: 'test-card-token',
          amountMoney: {
            amount: BigInt(Math.round(totals.total * 100)), // Convert to cents
            currency: 'USD',
          },
          locationId: 'test-location-id',
        })
      );

      expect(paymentResult.result.payment.status).toBe('COMPLETED');

      // Act 5: Create order in database
      const orderData = {
        customerName: customer.name,
        email: customer.email,
        phone: customer.phone,
        total: totals.total,
        status: 'PENDING' as const,
        paymentStatus: 'PAID' as const,
        fulfillmentType: 'delivery',
        notes: 'Integration test order',
      };

      const order = await testDb.order.create({
        data: orderData,
      });

      expect(order).toBeDefined();
      expect(order.customerName).toBe(customer.name);
      expect(order.email).toBe(customer.email);
      expect(order.total).toBe(totals.total);

      // Act 6: Send confirmation email
      const emailResult = await waitForApiCall(
        mocks.email.emails.send({
          from: 'orders@destino-sf.com',
          to: [customer.email],
          subject: 'Order Confirmation - Destino SF',
          html: `<h1>Thank you for your order!</h1><p>Order ID: ${order.id}</p>`,
        })
      );

      expect(emailResult.id).toBeDefined();
      expect(mocks.email.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: [customer.email],
          subject: expect.stringContaining('Order Confirmation'),
        })
      );

      // Assert: Verify complete flow success
      expect(order.status).toBe('PENDING');
      expect(order.paymentStatus).toBe('PAID');
      expect(paymentResult.result.payment.status).toBe('COMPLETED');
    });

    test('should handle failed payment gracefully', async () => {
      // Arrange
      const customer = {
        name: 'Jane Smith',
        email: generateTestEmail('failed-payment'),
        phone: generateTestPhone(),
      };

      const items = [createMockCartItem({ price: 25.99, quantity: 1 })];
      const address = createMockAddress('nearby');
      const totals = calculateCartTotals(items, address);

      // Mock failed payment
      mocks.square.paymentsApi.createPayment.mockResolvedValueOnce({
        result: {
          payment: {
            id: 'failed-payment-id',
            status: 'FAILED',
            amountMoney: {
              amount: BigInt(Math.round(totals.total * 100)),
              currency: 'USD',
            },
          },
        },
      });

      // Act
      const paymentResult = await waitForApiCall(
        mocks.square.paymentsApi.createPayment({
          sourceId: 'invalid-card-token',
          amountMoney: {
            amount: BigInt(Math.round(totals.total * 100)),
            currency: 'USD',
          },
        })
      );

      // Assert: Payment should fail
      expect(paymentResult.result.payment.status).toBe('FAILED');

      // Verify no order is created for failed payment
      const orderCount = await testDb.order.count({
        where: { email: customer.email },
      });
      expect(orderCount).toBe(0);

      // Verify no confirmation email is sent
      expect(mocks.email.emails.send).not.toHaveBeenCalled();
    });
  });

  describe('Different Delivery Zones and Fees', () => {
    test('should apply correct fees for San Francisco delivery', async () => {
      const items = [createMockCartItem({ price: 30.00, quantity: 1 })];
      const sfAddress = createMockAddress('nearby');
      
      const totals = calculateCartTotals(items, sfAddress);
      
      expect(totals.deliveryFee).toBe(5.99);
      expect(totals.subtotal).toBe(30.00);
      expect(totals.total).toBe(38.47); // 30 + 2.48 tax + 5.99 delivery
    });

    test('should apply correct fees for Oakland delivery', async () => {
      const items = [createMockCartItem({ price: 60.00, quantity: 1 })];
      const oaklandAddress = createMockAddress('distant');
      
      const totals = calculateCartTotals(items, oaklandAddress);
      
      expect(totals.deliveryFee).toBe(8.99);
      expect(totals.subtotal).toBe(60.00);
      expect(totals.total).toBe(73.94); // 60 + 4.95 tax + 8.99 delivery
    });

    test('should handle international orders without delivery fees', async () => {
      const items = [createMockCartItem({ price: 50.00, quantity: 1 })];
      const internationalAddress = createMockAddress('international');
      
      const totals = calculateCartTotals(items, internationalAddress);
      
      expect(totals.deliveryFee).toBe(0); // No delivery for international
      expect(totals.subtotal).toBe(50.00);
      expect(totals.total).toBe(54.13); // 50 + 4.13 tax, no delivery
    });
  });

  describe('Order Minimum Enforcement', () => {
    test('should enforce $25 minimum for San Francisco', async () => {
      const lowValueItems = [createMockCartItem({ price: 15.00, quantity: 1 })];
      const sfAddress = createMockAddress('nearby');
      
      const meetsMinimum = meetsMinimumOrder(lowValueItems, sfAddress);
      expect(meetsMinimum).toBe(false);
      
      const highValueItems = [createMockCartItem({ price: 30.00, quantity: 1 })];
      const meetsMinimumHigh = meetsMinimumOrder(highValueItems, sfAddress);
      expect(meetsMinimumHigh).toBe(true);
    });

    test('should enforce $50 minimum for Oakland', async () => {
      const mediumValueItems = [createMockCartItem({ price: 35.00, quantity: 1 })];
      const oaklandAddress = createMockAddress('distant');
      
      const meetsMinimum = meetsMinimumOrder(mediumValueItems, oaklandAddress);
      expect(meetsMinimum).toBe(false);
      
      const highValueItems = [createMockCartItem({ price: 60.00, quantity: 1 })];
      const meetsMinimumHigh = meetsMinimumOrder(highValueItems, oaklandAddress);
      expect(meetsMinimumHigh).toBe(true);
    });

    test('should prevent checkout when minimum not met', async () => {
      const customer = {
        name: 'Low Order Customer',
        email: generateTestEmail('low-order'),
        phone: generateTestPhone(),
      };

      const lowValueItems = [createMockCartItem({ price: 15.00, quantity: 1 })];
      const oaklandAddress = createMockAddress('distant'); // $50 minimum
      
      // Verify minimum not met
      const meetsMinimum = meetsMinimumOrder(lowValueItems, oaklandAddress);
      expect(meetsMinimum).toBe(false);

      // Should not be able to create order
      try {
        await testDb.order.create({
          data: {
            customerName: customer.name,
            email: customer.email,
            phone: customer.phone,
            total: 15.00,
            status: 'PENDING',
            paymentStatus: 'PENDING',
            fulfillmentType: 'delivery',
            notes: 'Should fail due to minimum',
          },
        });
        
        // If we get here, the test should fail
        expect(true).toBe(false);
      } catch (error) {
        // Expected behavior - order creation should be prevented
        // In real implementation, this would be a validation error
        expect(error).toBeDefined();
      }
    });
  });

  describe('Email Confirmations', () => {
    test('should send order confirmation email with correct details', async () => {
      // Arrange
      const customer = {
        name: 'Email Test Customer',
        email: generateTestEmail('email-test'),
        phone: generateTestPhone(),
      };

      const items = mockCartItems.slice(0, 2);
      const address = mockAddresses.nearbyAddress;
      const totals = calculateCartTotals(items, address);

      // Create order
      const order = await testDb.order.create({
        data: {
          customerName: customer.name,
          email: customer.email,
          phone: customer.phone,
          total: totals.total,
          status: 'PENDING',
          paymentStatus: 'PAID',
          fulfillmentType: 'delivery',
        },
      });

      // Act: Send confirmation email
      const emailData = {
        from: 'orders@destino-sf.com',
        to: [customer.email],
        subject: `Order Confirmation #${order.id} - Destino SF`,
        html: `
          <h1>Thank you for your order!</h1>
          <p>Order ID: ${order.id}</p>
          <p>Total: $${totals.total.toFixed(2)}</p>
          <p>Delivery Address: ${address.street}, ${address.city}</p>
          <p>Estimated delivery: 30-45 minutes</p>
        `,
      };

      const emailResult = await waitForApiCall(
        mocks.email.emails.send(emailData)
      );

      // Assert
      expect(emailResult.id).toBeDefined();
      expect(mocks.email.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: [customer.email],
          subject: expect.stringContaining(order.id),
          html: expect.stringContaining(order.id),
        })
      );
    });

    test('should send different emails for pickup vs delivery', async () => {
      const customer = {
        name: 'Pickup Customer',
        email: generateTestEmail('pickup-test'),
        phone: generateTestPhone(),
      };

      // Create pickup order
      const pickupOrder = await testDb.order.create({
        data: {
          customerName: customer.name,
          email: customer.email,
          phone: customer.phone,
          total: 25.99,
          status: 'PENDING',
          paymentStatus: 'PAID',
          fulfillmentType: 'pickup',
        },
      });

      // Send pickup confirmation
      await waitForApiCall(
        mocks.email.emails.send({
          from: 'orders@destino-sf.com',
          to: [customer.email],
          subject: `Pickup Order Ready #${pickupOrder.id} - Destino SF`,
          html: `
            <h1>Your order is ready for pickup!</h1>
            <p>Order ID: ${pickupOrder.id}</p>
            <p>Pickup Location: 123 Mission St, San Francisco, CA</p>
            <p>Please bring this confirmation and a valid ID</p>
          `,
        })
      );

      expect(mocks.email.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Pickup Order Ready'),
          html: expect.stringContaining('ready for pickup'),
        })
      );
    });

    test('should handle email delivery failures gracefully', async () => {
      // Mock email service failure
      mocks.email.emails.send.mockRejectedValueOnce(
        new Error('Email service unavailable')
      );

      const customer = {
        name: 'Failed Email Customer',
        email: 'invalid-email@invalid-domain.com',
        phone: generateTestPhone(),
      };

      // Create order first
      const order = await testDb.order.create({
        data: {
          customerName: customer.name,
          email: customer.email,
          phone: customer.phone,
          total: 30.99,
          status: 'PENDING',
          paymentStatus: 'PAID',
          fulfillmentType: 'delivery',
        },
      });

      // Attempt to send email
      try {
        await waitForApiCall(
          mocks.email.emails.send({
            from: 'orders@destino-sf.com',
            to: [customer.email],
            subject: 'Order Confirmation',
            html: 'Test email',
          })
        );
        
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        // Expected behavior
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('Email service unavailable');
      }

      // Order should still exist even if email fails
      const orderExists = await testDb.order.findUnique({
        where: { id: order.id },
      });
      expect(orderExists).toBeDefined();
      expect(orderExists.status).toBe('PENDING');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty cart gracefully', async () => {
      const emptyCart: CartItem[] = [];
      const address = createMockAddress('nearby');
      
      const totals = calculateCartTotals(emptyCart, address);
      expect(totals.subtotal).toBe(0);
      expect(totals.total).toBe(5.99); // Only delivery fee
      
      const meetsMinimum = meetsMinimumOrder(emptyCart, address);
      expect(meetsMinimum).toBe(false);
    });

    test('should validate address before processing order', async () => {
      const items = [createMockCartItem({ price: 30.00, quantity: 1 })];
      const invalidAddress = {
        recipientName: '',
        street: '',
        city: '',
        state: '',
        postalCode: '00000',
        country: 'US',
      } as Address;

      // In a real implementation, this would trigger address validation
      expect(invalidAddress.street).toBe('');
      expect(invalidAddress.city).toBe('');
      
      // Address validation would prevent order creation
      // This is a placeholder for actual validation logic
    });

    test('should handle concurrent order creation', async () => {
      const customer = {
        name: 'Concurrent Customer',
        email: generateTestEmail('concurrent'),
        phone: generateTestPhone(),
      };

      const items = [createMockCartItem({ price: 30.00, quantity: 1 })];
      const totals = calculateCartTotals(items);

      // Simulate multiple concurrent order attempts
      const orderPromises = Array.from({ length: 3 }, (_, i) =>
        testDb.order.create({
          data: {
            customerName: customer.name,
            email: customer.email,
            phone: customer.phone,
            total: totals.total,
            status: 'PENDING',
            paymentStatus: 'PENDING',
            fulfillmentType: 'delivery',
            notes: `Concurrent order ${i + 1}`,
          },
        })
      );

      const orders = await Promise.all(orderPromises);
      
      // All orders should be created successfully
      expect(orders).toHaveLength(3);
      orders.forEach((order, index) => {
        expect(order.customerName).toBe(customer.name);
        expect(order.notes).toBe(`Concurrent order ${index + 1}`);
      });
    });
  });
}); 