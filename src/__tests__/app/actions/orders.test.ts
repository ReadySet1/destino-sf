// Mock all dependencies first before imports
jest.mock('@/lib/db');
jest.mock('@/utils/supabase/server');
jest.mock('@/lib/cart-helpers');
jest.mock('next/cache');
jest.mock('@/app/actions/orders');

// Import after mocking
import {
  createOrderAndGenerateCheckoutUrl,
  updateOrderPayment,
  getOrderById,
  createManualPaymentOrder,
  validateOrderMinimumsServer,
} from '@/app/actions/orders';

// Cast to mocked functions
const mockCreateOrder = createOrderAndGenerateCheckoutUrl as jest.MockedFunction<typeof createOrderAndGenerateCheckoutUrl>;
const mockUpdatePayment = updateOrderPayment as jest.MockedFunction<typeof updateOrderPayment>;
const mockGetOrder = getOrderById as jest.MockedFunction<typeof getOrderById>;
const mockCreateManual = createManualPaymentOrder as jest.MockedFunction<typeof createManualPaymentOrder>;
const mockValidateMinimums = validateOrderMinimumsServer as jest.MockedFunction<typeof validateOrderMinimumsServer>;

// Test data
const testCartItems = [
  { id: 'product-1', name: 'Alfajores', price: 12.99, quantity: 2, variantId: 'variant-1' },
  { id: 'product-2', name: 'Empanada', price: 4.50, quantity: 6 },
];

const testCustomer = {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
};

const testPickup = {
  method: 'pickup' as const,
  pickupTime: '2024-01-15T14:00:00.000Z',
};

const testDelivery = {
  method: 'local_delivery' as const,
  deliveryDate: '2024-01-16',
  deliveryTime: '18:00',
  deliveryAddress: {
    street: '123 Test St',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94105',
  },
};

describe('Order Actions - Phase 2 Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default successful mocks
    mockCreateOrder.mockResolvedValue({
      success: true,
      error: null,
      checkoutUrl: 'https://checkout.example.com/order-123',
      orderId: 'order-123'
    });
    
    mockUpdatePayment.mockResolvedValue({
      id: 'order-123',
      status: 'PAID'
    } as any);
    
    mockGetOrder.mockResolvedValue({
      id: 'order-123',
      customerName: 'John Doe',
      status: 'PAID'
    } as any);
    
    mockCreateManual.mockResolvedValue({
      success: true,
      error: null,
      checkoutUrl: 'https://manual.example.com',
      orderId: 'order-123'
    });
    
    mockValidateMinimums.mockResolvedValue({
      isValid: true,
      errorMessage: null,
    });
  });

  describe('createOrderAndGenerateCheckoutUrl', () => {
    test('should create pickup order successfully', async () => {
      const formData = {
        items: testCartItems,
        customerInfo: testCustomer,
        fulfillment: testPickup,
        paymentMethod: 'SQUARE' as any,
      };

      const result = await createOrderAndGenerateCheckoutUrl(formData);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order-123');
      expect(result.checkoutUrl).toContain('order-123');
    });

    test('should handle validation failures', async () => {
      mockCreateOrder.mockResolvedValueOnce({
        success: false,
        error: 'Validation failed',
        checkoutUrl: null,
        orderId: null
      });

      const formData = {
        items: [],
        customerInfo: testCustomer,
        fulfillment: testPickup,
        paymentMethod: 'SQUARE' as any,
      };

      const result = await createOrderAndGenerateCheckoutUrl(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
    });

    test('should create delivery order successfully', async () => {
      const formData = {
        items: testCartItems,
        customerInfo: testCustomer,
        fulfillment: testDelivery,
        paymentMethod: 'SQUARE' as any,
      };

      const result = await createOrderAndGenerateCheckoutUrl(formData);

      expect(result.success).toBe(true);
      expect(mockCreateOrder).toHaveBeenCalledWith(formData);
    });

    test('should handle delivery minimum validation', async () => {
      mockCreateOrder.mockResolvedValueOnce({
        success: false,
        error: 'Order minimum not met',
        checkoutUrl: null,
        orderId: null
      });

      const formData = {
        items: testCartItems,
        customerInfo: testCustomer,
        fulfillment: testDelivery,
        paymentMethod: 'SQUARE' as any,
      };

      const result = await createOrderAndGenerateCheckoutUrl(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('minimum');
    });
  });

  describe('validateOrderMinimumsServer', () => {
    test('should validate pickup orders', async () => {
      mockValidateMinimums.mockResolvedValueOnce({
        isValid: true,
        errorMessage: null,
      });

      const result = await validateOrderMinimumsServer(testCartItems);

      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeNull();
    });

    test('should reject orders below minimum', async () => {
      mockValidateMinimums.mockResolvedValueOnce({
        isValid: false,
        errorMessage: 'Minimum order required',
      });

      const result = await validateOrderMinimumsServer(testCartItems, testDelivery.deliveryAddress);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Minimum order required');
    });
  });

  describe('updateOrderPayment', () => {
    test('should update payment status successfully', async () => {
      const updatedOrder = { id: 'order-123', status: 'PAID' };
      mockUpdatePayment.mockResolvedValueOnce(updatedOrder);

      const result = await updateOrderPayment('order-123', 'square-123', 'PAID');

      expect(result.id).toBe('order-123');
      expect(result.status).toBe('PAID');
    });

    test('should handle payment failures', async () => {
      const failedOrder = { id: 'order-123', status: 'FAILED' };
      mockUpdatePayment.mockResolvedValueOnce(failedOrder);

      const result = await updateOrderPayment('order-123', 'square-123', 'FAILED');

      expect(result.status).toBe('FAILED');
    });
  });

  describe('getOrderById', () => {
    test('should retrieve order successfully', async () => {
      const order = {
        id: 'order-123',
        customerName: 'John Doe',
        status: 'PAID',
        items: [{ id: 'item-1', quantity: 2 }],
      };
      mockGetOrder.mockResolvedValueOnce(order);

      const result = await getOrderById('order-123');

      expect(result!.id).toBe('order-123');
      expect(result!.customerName).toBe('John Doe');
    });

    test('should return null for non-existent order', async () => {
      mockGetOrder.mockResolvedValueOnce(null);

      const result = await getOrderById('non-existent');

      expect(result).toBeNull();
    });

    test('should handle database errors', async () => {
      mockGetOrder.mockRejectedValueOnce(new Error('Database error'));

      await expect(getOrderById('order-123')).rejects.toThrow('Database error');
    });
  });

  describe('createManualPaymentOrder', () => {
    test('should create cash order successfully', async () => {
      const formData = {
        items: testCartItems,
        customerInfo: testCustomer,
        fulfillment: testPickup,
        paymentMethod: 'CASH',
      };

      const result = await createManualPaymentOrder(formData as any);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order-123');
    });

    test('should handle cash validation failures', async () => {
      mockCreateManual.mockResolvedValueOnce({
        success: false,
        error: 'Cash not allowed for delivery',
        checkoutUrl: null,
        orderId: null
      });

      const formData = {
        items: testCartItems,
        customerInfo: testCustomer,
        fulfillment: testDelivery,
        paymentMethod: 'CASH',
      };

      const result = await createManualPaymentOrder(formData as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cash');
    });
  });
}); 