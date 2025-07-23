import {
  createManualOrder,
  updateOrderStatus,
} from '@/app/(dashboard)/admin/orders/manual/actions';
import { prisma } from '@/lib/db';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { logger } from '@/utils/logger';
import { revalidatePath } from 'next/cache';

// Define PaymentMethod enum to match the actions file
enum PaymentMethod {
  SQUARE = 'SQUARE',
  CASH = 'CASH',
}

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    order: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    orderItem: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

// Properly type the mocked prisma with Jest mock methods
const mockPrisma = {
  order: {
    findUnique: jest.fn() as jest.MockedFunction<any>,
    create: jest.fn() as jest.MockedFunction<any>,
    update: jest.fn() as jest.MockedFunction<any>,
  },
  orderItem: {
    deleteMany: jest.fn() as jest.MockedFunction<any>,
    create: jest.fn() as jest.MockedFunction<any>,
  },
} as any;

// Override the imported prisma with our properly typed mock
(prisma as any).order = mockPrisma.order;
(prisma as any).orderItem = mockPrisma.orderItem;

const mockLogger = logger as jest.Mocked<typeof logger>;
const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

describe('Admin Manual Order Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validOrderData = {
    customerName: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    total: 75.5,
    fulfillmentType: 'pickup',
    pickupTime: '2024-01-15T10:00:00Z',
    notes: 'Special instructions',
    paymentMethod: PaymentMethod.CASH,
    paymentStatus: PaymentStatus.PENDING,
    status: OrderStatus.PENDING,
    items: [
      {
        productId: 'prod-1',
        variantId: 'variant-1',
        quantity: 2,
        price: 25.0,
      },
      {
        productId: 'prod-2',
        variantId: null,
        quantity: 1,
        price: 25.5,
      },
    ],
  };

  describe('createManualOrder', () => {
    describe('Input Validation', () => {
      test('should reject order with missing customer name', async () => {
        const invalidData = { ...validOrderData, customerName: '' };

        const result = await createManualOrder(invalidData);

        expect(result).toEqual({ error: 'Customer information is required' });
        expect(mockPrisma.order.create).not.toHaveBeenCalled();
      });

      test('should reject order with missing email', async () => {
        const invalidData = { ...validOrderData, email: '' };

        const result = await createManualOrder(invalidData);

        expect(result).toEqual({ error: 'Customer information is required' });
        expect(mockPrisma.order.create).not.toHaveBeenCalled();
      });

      test('should reject order with missing phone', async () => {
        const invalidData = { ...validOrderData, phone: '' };

        const result = await createManualOrder(invalidData);

        expect(result).toEqual({ error: 'Customer information is required' });
        expect(mockPrisma.order.create).not.toHaveBeenCalled();
      });

      test('should reject order with no items', async () => {
        const invalidData = { ...validOrderData, items: [] };

        const result = await createManualOrder(invalidData);

        expect(result).toEqual({ error: 'At least one item is required' });
        expect(mockPrisma.order.create).not.toHaveBeenCalled();
      });

      test('should reject order with missing items array', async () => {
        const invalidData = { ...validOrderData };
        delete (invalidData as any).items;

        const result = await createManualOrder(invalidData);

        expect(result).toEqual({ error: 'At least one item is required' });
        expect(mockPrisma.order.create).not.toHaveBeenCalled();
      });
    });

    describe('New Order Creation', () => {
      test('should create new order successfully', async () => {
        const mockCreatedOrder = {
          id: 'order-123',
          ...validOrderData,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockPrisma.order.create.mockResolvedValue(mockCreatedOrder as any);

        const result = await createManualOrder(validOrderData);

        expect(result).toEqual({ orderId: 'order-123' });
        expect(mockPrisma.order.create).toHaveBeenCalledWith({
          data: {
            customerName: 'John Doe',
            email: 'john@example.com',
            phone: '+1234567890',
            total: 75.5,
            fulfillmentType: 'pickup',
            pickupTime: new Date('2024-01-15T10:00:00Z'),
            notes: 'Special instructions',
            paymentMethod: 'CASH',
            paymentStatus: PaymentStatus.PENDING,
            status: OrderStatus.PENDING,
            items: {
              create: validOrderData.items,
            },
          },
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Order order-123 created successfully');
        expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/orders');
      });

      test('should create order without pickup time', async () => {
        const orderDataWithoutPickupTime = { ...validOrderData, pickupTime: '' };
        const mockCreatedOrder = {
          id: 'order-124',
          ...orderDataWithoutPickupTime,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockPrisma.order.create.mockResolvedValue(mockCreatedOrder as any);

        const result = await createManualOrder(orderDataWithoutPickupTime);

        expect(result).toEqual({ orderId: 'order-124' });
        expect(mockPrisma.order.create).toHaveBeenCalledWith({
          data: {
            customerName: 'John Doe',
            email: 'john@example.com',
            phone: '+1234567890',
            total: 75.5,
            fulfillmentType: 'pickup',
            pickupTime: undefined,
            notes: 'Special instructions',
            paymentMethod: 'CASH',
            paymentStatus: PaymentStatus.PENDING,
            status: OrderStatus.PENDING,
            items: {
              create: validOrderData.items,
            },
          },
        });
      });

      test('should handle database errors during creation', async () => {
        const dbError = new Error('Database connection failed');
        mockPrisma.order.create.mockRejectedValue(dbError);

        const result = await createManualOrder(validOrderData);

        expect(result).toEqual({ error: 'Failed to create order. Please try again.' });
        expect(mockLogger.error).toHaveBeenCalledWith('Error creating manual order:', dbError);
      });
    });

    describe('Order Updates', () => {
      const updateOrderData = {
        ...validOrderData,
        existingOrderId: 'existing-order-123',
        customerName: 'Jane Smith',
        total: 100.0,
      };

      test('should update existing order successfully', async () => {
        const mockExistingOrder = {
          id: 'existing-order-123',
          customerName: 'John Doe',
          items: [{ id: 'item-1' }, { id: 'item-2' }],
        };

        const mockUpdatedOrder = {
          id: 'existing-order-123',
          ...updateOrderData,
          updatedAt: new Date(),
        };

        mockPrisma.order.findUnique.mockResolvedValue(mockExistingOrder as any);
        mockPrisma.order.update.mockResolvedValue(mockUpdatedOrder as any);
        mockPrisma.orderItem.deleteMany.mockResolvedValue({ count: 2 } as any);
        mockPrisma.orderItem.create.mockResolvedValue({} as any);

        const result = await createManualOrder(updateOrderData);

        expect(result).toEqual({ orderId: 'existing-order-123' });
        expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
          where: { id: 'existing-order-123' },
          include: { items: true },
        });
        expect(mockPrisma.order.update).toHaveBeenCalledWith({
          where: { id: 'existing-order-123' },
          data: {
            customerName: 'Jane Smith',
            email: 'john@example.com',
            phone: '+1234567890',
            total: 100.0,
            fulfillmentType: 'pickup',
            pickupTime: new Date('2024-01-15T10:00:00Z'),
            notes: 'Special instructions',
            paymentMethod: 'CASH',
            paymentStatus: PaymentStatus.PENDING,
            status: OrderStatus.PENDING,
          },
        });
        expect(mockPrisma.orderItem.deleteMany).toHaveBeenCalledWith({
          where: { orderId: 'existing-order-123' },
        });
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Order existing-order-123 updated successfully'
        );
        expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/orders');
      });

      test('should handle order not found during update', async () => {
        mockPrisma.order.findUnique.mockResolvedValue(null);

        const result = await createManualOrder(updateOrderData);

        expect(result).toEqual({ error: 'Order not found' });
        expect(mockPrisma.order.update).not.toHaveBeenCalled();
        expect(mockPrisma.orderItem.deleteMany).not.toHaveBeenCalled();
      });

      test('should handle database errors during update', async () => {
        const mockExistingOrder = {
          id: 'existing-order-123',
          customerName: 'John Doe',
          items: [{ id: 'item-1' }],
        };

        const dbError = new Error('Update failed');
        mockPrisma.order.findUnique.mockResolvedValue(mockExistingOrder as any);
        mockPrisma.order.update.mockRejectedValue(dbError);

        const result = await createManualOrder(updateOrderData);

        expect(result).toEqual({ error: 'Failed to create order. Please try again.' });
        expect(mockLogger.error).toHaveBeenCalledWith('Error creating manual order:', dbError);
      });

      test('should create new order items after deletion', async () => {
        const mockExistingOrder = {
          id: 'existing-order-123',
          customerName: 'John Doe',
          items: [{ id: 'item-1' }],
        };

        const mockUpdatedOrder = {
          id: 'existing-order-123',
          ...updateOrderData,
        };

        mockPrisma.order.findUnique.mockResolvedValue(mockExistingOrder as any);
        mockPrisma.order.update.mockResolvedValue(mockUpdatedOrder as any);
        mockPrisma.orderItem.deleteMany.mockResolvedValue({ count: 1 } as any);
        mockPrisma.orderItem.create.mockResolvedValue({} as any);

        const result = await createManualOrder(updateOrderData);

        expect(result).toEqual({ orderId: 'existing-order-123' });
        expect(mockPrisma.orderItem.create).toHaveBeenCalledTimes(2);
        updateOrderData.items.forEach((item, index) => {
          expect(mockPrisma.orderItem.create).toHaveBeenNthCalledWith(index + 1, {
            data: {
              orderId: 'existing-order-123',
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              price: item.price,
            },
          });
        });
      });
    });

    describe('Payment Method Handling', () => {
      test('should handle SQUARE payment method', async () => {
        const squareOrderData = { ...validOrderData, paymentMethod: PaymentMethod.SQUARE };
        const mockCreatedOrder = {
          id: 'order-square',
          ...squareOrderData,
        };

        mockPrisma.order.create.mockResolvedValue(mockCreatedOrder as any);

        const result = await createManualOrder(squareOrderData);

        expect(result).toEqual({ orderId: 'order-square' });
        expect(mockPrisma.order.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            paymentMethod: 'SQUARE',
          }),
        });
      });

      test('should handle CASH payment method', async () => {
        const cashOrderData = { ...validOrderData, paymentMethod: PaymentMethod.CASH };
        const mockCreatedOrder = {
          id: 'order-cash',
          ...cashOrderData,
        };

        mockPrisma.order.create.mockResolvedValue(mockCreatedOrder as any);

        const result = await createManualOrder(cashOrderData);

        expect(result).toEqual({ orderId: 'order-cash' });
        expect(mockPrisma.order.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            paymentMethod: 'CASH',
          }),
        });
      });
    });

    describe('Order Status Combinations', () => {
      test('should handle COMPLETED order with PAID status', async () => {
        const completedOrderData = {
          ...validOrderData,
          status: OrderStatus.COMPLETED,
          paymentStatus: PaymentStatus.PAID,
        };
        const mockCreatedOrder = {
          id: 'order-completed',
          ...completedOrderData,
        };

        mockPrisma.order.create.mockResolvedValue(mockCreatedOrder as any);

        const result = await createManualOrder(completedOrderData);

        expect(result).toEqual({ orderId: 'order-completed' });
        expect(mockPrisma.order.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            status: OrderStatus.COMPLETED,
            paymentStatus: PaymentStatus.PAID,
          }),
        });
      });

      test('should handle CANCELLED order with REFUNDED status', async () => {
        const cancelledOrderData = {
          ...validOrderData,
          status: OrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.REFUNDED,
        };
        const mockCreatedOrder = {
          id: 'order-cancelled',
          ...cancelledOrderData,
        };

        mockPrisma.order.create.mockResolvedValue(mockCreatedOrder as any);

        const result = await createManualOrder(cancelledOrderData);

        expect(result).toEqual({ orderId: 'order-cancelled' });
        expect(mockPrisma.order.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            status: OrderStatus.CANCELLED,
            paymentStatus: PaymentStatus.REFUNDED,
          }),
        });
      });
    });
  });

  describe('updateOrderStatus', () => {
    test('should update order status successfully', async () => {
      const mockUpdatedOrder = {
        id: 'order-123',
        status: OrderStatus.COMPLETED,
        paymentStatus: PaymentStatus.PAID,
      };

      mockPrisma.order.update.mockResolvedValue(mockUpdatedOrder as any);

      const result = await updateOrderStatus(
        'order-123',
        OrderStatus.COMPLETED,
        PaymentStatus.PAID
      );

      expect(result).toEqual({ success: true, orderId: 'order-123' });
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: {
          status: OrderStatus.COMPLETED,
          paymentStatus: PaymentStatus.PAID,
        },
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Order order-123 status updated to COMPLETED');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/orders');
    });

    test('should update only order status when payment status not provided', async () => {
      const mockUpdatedOrder = {
        id: 'order-123',
        status: OrderStatus.PROCESSING,
      };

      mockPrisma.order.update.mockResolvedValue(mockUpdatedOrder as any);

      const result = await updateOrderStatus('order-123', OrderStatus.PROCESSING);

      expect(result).toEqual({ success: true, orderId: 'order-123' });
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: {
          status: OrderStatus.PROCESSING,
        },
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Order order-123 status updated to PROCESSING');
    });

    test('should handle database errors during status update', async () => {
      const dbError = new Error('Update failed');
      mockPrisma.order.update.mockRejectedValue(dbError);

      const result = await updateOrderStatus('order-123', OrderStatus.COMPLETED);

      expect(result).toEqual({ error: 'Failed to update order status' });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error updating order order-123 status:',
        dbError
      );
    });

    test('should handle all order statuses', async () => {
      const statuses = [
        OrderStatus.PENDING,
        OrderStatus.PROCESSING,
        OrderStatus.COMPLETED,
        OrderStatus.CANCELLED,
      ];

      for (const status of statuses) {
        jest.clearAllMocks();
        const mockUpdatedOrder = { id: 'order-test', status };
        mockPrisma.order.update.mockResolvedValue(mockUpdatedOrder as any);

        const result = await updateOrderStatus('order-test', status);

        expect(result).toEqual({ success: true, orderId: 'order-test' });
        expect(mockPrisma.order.update).toHaveBeenCalledWith({
          where: { id: 'order-test' },
          data: { status },
        });
      }
    });

    test('should handle all payment statuses', async () => {
      const paymentStatuses = [
        PaymentStatus.PENDING,
        PaymentStatus.PAID,
        PaymentStatus.FAILED,
        PaymentStatus.REFUNDED,
      ];

      for (const paymentStatus of paymentStatuses) {
        jest.clearAllMocks();
        const mockUpdatedOrder = { id: 'order-test', paymentStatus };
        mockPrisma.order.update.mockResolvedValue(mockUpdatedOrder as any);

        const result = await updateOrderStatus('order-test', OrderStatus.COMPLETED, paymentStatus);

        expect(result).toEqual({ success: true, orderId: 'order-test' });
        expect(mockPrisma.order.update).toHaveBeenCalledWith({
          where: { id: 'order-test' },
          data: {
            status: OrderStatus.COMPLETED,
            paymentStatus,
          },
        });
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle Prisma client errors gracefully', async () => {
      const prismaError = new Error('Prisma connection lost');
      prismaError.name = 'PrismaClientKnownRequestError';
      mockPrisma.order.create.mockRejectedValue(prismaError);

      const result = await createManualOrder(validOrderData);

      expect(result).toEqual({ error: 'Failed to create order. Please try again.' });
      expect(mockLogger.error).toHaveBeenCalledWith('Error creating manual order:', prismaError);
    });

    test('should handle constraint violation errors', async () => {
      const constraintError = new Error('Unique constraint failed');
      constraintError.name = 'PrismaClientKnownRequestError';
      mockPrisma.order.create.mockRejectedValue(constraintError);

      const result = await createManualOrder(validOrderData);

      expect(result).toEqual({ error: 'Failed to create order. Please try again.' });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error creating manual order:',
        constraintError
      );
    });

    test('should handle network timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'NetworkError';
      mockPrisma.order.update.mockRejectedValue(timeoutError);

      const result = await updateOrderStatus('order-123', OrderStatus.COMPLETED);

      expect(result).toEqual({ error: 'Failed to update order status' });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error updating order order-123 status:',
        timeoutError
      );
    });
  });
});
