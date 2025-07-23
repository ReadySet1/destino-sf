import { CartItem } from '@/types/cart';
import { Address } from '@/types/address';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { mockCartItems, mockAddresses } from '../fixtures';

/**
 * Create a mock cart item with optional overrides
 */
export const createMockCartItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  id: `test-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Test Alfajores',
  price: 12.99,
  quantity: 2,
  categoryId: 'alfajores',
  imageUrl: '/images/test-product.jpg',
  ...overrides,
});

/**
 * Create a mock address for different delivery zones
 */
export const createMockAddress = (
  zone: 'nearby' | 'distant' | 'international' = 'nearby'
): Address => {
  const baseAddresses = {
    nearby: {
      recipientName: 'Test Customer',
      street: '123 Mission St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94102',
      country: 'US',
    },
    distant: {
      recipientName: 'Distant Customer',
      street: '456 Broadway',
      city: 'Oakland',
      state: 'CA',
      postalCode: '94612',
      country: 'US',
    },
    international: {
      recipientName: 'International Customer',
      street: '789 International Blvd',
      city: 'Toronto',
      state: 'ON',
      postalCode: 'M5V 3A8',
      country: 'CA',
    },
  };

  return baseAddresses[zone];
};

/**
 * Create a mock order with specified parameters
 */
export const createMockOrder = (overrides: Partial<any> = {}) => ({
  id: `test-order-${Date.now()}`,
  customerName: 'Test Customer',
  email: 'test@example.com',
  phone: '+14155551234',
  total: 31.97,
  status: OrderStatus.PENDING,
  paymentStatus: PaymentStatus.PENDING,
  fulfillmentType: 'delivery',
  notes: 'Test order',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a mock user profile
 */
export const createMockProfile = (
  role: 'CUSTOMER' | 'ADMIN' = 'CUSTOMER',
  overrides: Partial<any> = {}
) => ({
  id: `test-profile-${Date.now()}`,
  email: `test-${role.toLowerCase()}@example.com`,
  name: `Test ${role}`,
  phone: '+14155551234',
  role,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a mock product
 */
export const createMockProduct = (overrides: Partial<any> = {}) => ({
  id: `test-product-${Date.now()}`,
  squareId: `test-square-${Date.now()}`,
  name: 'Test Product',
  description: 'A test product for integration testing',
  price: 12.99,
  images: ['/images/test-product.jpg'],
  categoryId: 'test-category',
  featured: false,
  active: true,
  slug: `test-product-${Date.now()}`,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a mock category
 */
export const createMockCategory = (overrides: Partial<any> = {}) => ({
  id: `test-category-${Date.now()}`,
  name: 'Test Category',
  description: 'A test category for integration testing',
  order: 1,
  isActive: true,
  slug: `test-category-${Date.now()}`,
  squareId: `test-square-cat-${Date.now()}`,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Calculate delivery fee based on zone
 */
export const calculateDeliveryFee = (address: Address): number => {
  const city = address.city.toLowerCase();

  if (city.includes('san francisco')) {
    return 5.99;
  } else if (city.includes('oakland')) {
    return 8.99;
  } else if (address.country !== 'US') {
    return 0; // International orders might not have delivery
  } else {
    return 12.99; // Premium zone
  }
};

/**
 * Calculate minimum order amount based on delivery zone
 */
export const getMinimumOrderAmount = (address: Address): number => {
  const city = address.city.toLowerCase();

  if (city.includes('san francisco')) {
    return 25.0;
  } else if (city.includes('oakland')) {
    return 50.0;
  } else {
    return 75.0; // Premium zone or international
  }
};

/**
 * Calculate cart totals including tax and delivery
 */
export const calculateCartTotals = (items: CartItem[], address?: Address) => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxRate = 0.0825; // 8.25% tax rate
  const taxAmount = subtotal * taxRate;
  const deliveryFee = address ? calculateDeliveryFee(address) : 0;
  const total = subtotal + taxAmount + deliveryFee;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    deliveryFee,
    total: Math.round(total * 100) / 100,
  };
};

/**
 * Check if cart meets minimum order requirements
 */
export const meetsMinimumOrder = (items: CartItem[], address: Address): boolean => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const minimumRequired = getMinimumOrderAmount(address);
  return subtotal >= minimumRequired;
};

/**
 * Wait for an async operation to complete with timeout
 */
export const waitForApiCall = async <T>(
  apiCall: Promise<T>,
  timeoutMs: number = 5000
): Promise<T> => {
  return Promise.race([
    apiCall,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`API call timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
};

/**
 * Wait for multiple async operations to complete
 */
export const waitForMultipleApiCalls = async <T>(
  apiCalls: Promise<T>[],
  timeoutMs: number = 10000
): Promise<T[]> => {
  return waitForApiCall(Promise.all(apiCalls), timeoutMs);
};

/**
 * Retry an operation with exponential backoff
 */
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff with jitter
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};

/**
 * Wait for a condition to be true with polling
 */
export const waitForCondition = async (
  condition: () => boolean | Promise<boolean>,
  timeoutMs: number = 5000,
  pollIntervalMs: number = 100
): Promise<void> => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Condition not met within ${timeoutMs}ms`);
};

/**
 * Mock a delay to simulate real-world API response times
 */
export const mockDelay = (ms: number = 100): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Generate a random email for testing
 */
export const generateTestEmail = (prefix: string = 'test'): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}-${timestamp}-${random}@example.com`;
};

/**
 * Generate a random phone number for testing
 */
export const generateTestPhone = (): string => {
  const areaCode = Math.floor(Math.random() * (999 - 200) + 200);
  const exchange = Math.floor(Math.random() * (999 - 200) + 200);
  const number = Math.floor(Math.random() * (9999 - 1000) + 1000);
  return `+1${areaCode}${exchange}${number}`;
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone format (US phone numbers)
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+1[0-9]{10}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate postal code format (US and CA)
 */
export const isValidPostalCode = (postalCode: string, country: string = 'US'): boolean => {
  if (country === 'US') {
    return /^\d{5}(-\d{4})?$/.test(postalCode);
  } else if (country === 'CA') {
    return /^[A-Z]\d[A-Z] \d[A-Z]\d$/.test(postalCode);
  }
  return true; // Allow other countries for now
};

/**
 * Create a complete test cart with multiple items
 */
export const createTestCart = (itemCount: number = 3): CartItem[] => {
  return Array.from({ length: itemCount }, (_, index) =>
    createMockCartItem({
      id: `cart-item-${index + 1}`,
      name: `Test Product ${index + 1}`,
      price: 10 + index * 2.5,
      quantity: 1 + index,
    })
  );
};

/**
 * Simulate Square payment response
 */
export const createMockSquarePayment = (
  status: 'COMPLETED' | 'PENDING' | 'FAILED' = 'COMPLETED'
) => ({
  id: `sq-payment-${Date.now()}`,
  status,
  amount_money: {
    amount: 3197, // $31.97 in cents
    currency: 'USD',
  },
  source_type: 'CARD',
  card_details: {
    status,
    card: {
      card_brand: 'VISA',
      last_4: '1111',
      exp_month: 12,
      exp_year: 2025,
    },
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

/**
 * Create a test order with items
 */
export const createOrderWithItems = async (
  items: CartItem[],
  address: Address,
  customerInfo: { name: string; email: string; phone: string }
) => {
  const totals = calculateCartTotals(items, address);

  return createMockOrder({
    customerName: customerInfo.name,
    email: customerInfo.email,
    phone: customerInfo.phone,
    total: totals.total,
    // Add items as metadata or separate relation
    metadata: {
      items,
      address,
      totals,
    },
  });
};

/**
 * Cleanup helper for test teardown
 */
export const cleanupTestData = async (testPrefix: string = 'test') => {
  // This would be implemented to clean up any test data
  // from the database, file system, or external services
  console.log(`Cleaning up test data with prefix: ${testPrefix}`);
};

/**
 * Create a deterministic test ID for consistent testing
 */
export const createTestId = (prefix: string = 'test'): string => {
  const timestamp = Date.now();
  return `${prefix}-${timestamp}`;
};

/**
 * Convert cents to dollars for display
 */
export const centsToDollars = (cents: number): number => {
  return Math.round(cents) / 100;
};

/**
 * Convert dollars to cents for API calls
 */
export const dollarsToCents = (dollars: number): number => {
  return Math.round(dollars * 100);
};
