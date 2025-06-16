import { CartItem } from '@/types/cart';
import { Address } from '@/types/address';
import { OrderStatus, PaymentStatus } from '@prisma/client';

/**
 * Mock cart items for testing
 */
export const mockCartItems: CartItem[] = [
  {
    id: 'alfajores-dulce-001',
    name: 'Dulce de Leche Alfajores',
    price: 12.99,
    quantity: 2,
    categoryId: 'alfajores',
    imageUrl: '/images/alfajores-dulce.jpg',
  },
  {
    id: 'alfajores-chocolate-001',
    name: 'Chocolate Alfajores',
    price: 14.99,
    quantity: 1,
    categoryId: 'alfajores',
    imageUrl: '/images/alfajores-chocolate.jpg',
  },
  {
    id: 'empanadas-beef-001',
    name: 'Beef Empanadas (6 pack)',
    price: 18.99,
    quantity: 1,
    categoryId: 'empanadas',
    imageUrl: '/images/empanadas-beef.jpg',
  },
];

/**
 * Mock addresses for delivery zone testing
 */
export const mockAddresses = {
  nearbyAddress: {
    recipientName: 'John Doe',
    street: '123 Mission St',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94102',
    country: 'US',
  } as Address,
  
  distantAddress: {
    recipientName: 'Jane Smith',
    street: '456 Broadway',
    city: 'Oakland',
    state: 'CA',
    postalCode: '94612',
    country: 'US',
  } as Address,

  invalidAddress: {
    recipientName: 'Bob Johnson',
    street: '789 Invalid St',
    city: 'Invalid City',
    state: 'XX',
    postalCode: '00000',
    country: 'US',
  } as Address,

  internationalAddress: {
    recipientName: 'Maria Garcia',
    street: '123 International Blvd',
    city: 'Toronto',
    state: 'ON',
    postalCode: 'M5V 3A8',
    country: 'CA',
  } as Address,
};

/**
 * Mock orders for testing different scenarios
 */
export const mockOrders = {
  pendingOrder: {
    id: 'order-pending-001',
    customerName: 'Test Customer',
    email: 'test@example.com',
    phone: '+14155551234',
    total: 31.97,
    status: OrderStatus.PENDING,
    paymentStatus: PaymentStatus.PENDING,
    fulfillmentType: 'delivery',
    notes: 'Test order - please handle carefully',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  },

  completedOrder: {
    id: 'order-completed-001',
    customerName: 'Satisfied Customer',
    email: 'satisfied@example.com',
    phone: '+14155551235',
    total: 45.50,
    status: OrderStatus.COMPLETED,
    paymentStatus: PaymentStatus.PAID,
    fulfillmentType: 'pickup',
    notes: 'Completed successfully',
    createdAt: new Date('2024-01-14T14:30:00Z'),
    updatedAt: new Date('2024-01-14T16:00:00Z'),
  },

  cancelledOrder: {
    id: 'order-cancelled-001',
    customerName: 'Cancelled Customer',
    email: 'cancelled@example.com',
    phone: '+14155551236',
    total: 25.98,
    status: OrderStatus.CANCELLED,
    paymentStatus: PaymentStatus.REFUNDED,
    fulfillmentType: 'delivery',
    cancelReason: 'Customer requested cancellation',
    notes: 'Cancelled due to address issues',
    createdAt: new Date('2024-01-13T09:00:00Z'),
    updatedAt: new Date('2024-01-13T11:00:00Z'),
  },
};

/**
 * Mock products for testing
 */
export const mockProducts = {
  alfajoresDulce: {
    id: 'prod-alfajores-dulce',
    squareId: 'sq-alfajores-dulce-001',
    name: 'Dulce de Leche Alfajores',
    description: 'Traditional Argentine cookies filled with creamy dulce de leche',
    price: 12.99,
    images: ['/images/menu/alfajores.png'],
    categoryId: 'cat-alfajores',
    featured: true,
    active: true,
    slug: 'dulce-de-leche-alfajores',
  },

  alfajoresChocolate: {
    id: 'prod-alfajores-chocolate',
    squareId: 'sq-alfajores-chocolate-001',
    name: 'Chocolate Alfajores',
    description: 'Rich chocolate alfajores with chocolate ganache filling',
    price: 14.99,
    images: ['/images/menu/alfajores.png'],
    categoryId: 'cat-alfajores',
    featured: false,
    active: true,
    slug: 'chocolate-alfajores',
  },

  empanadasBeef: {
    id: 'prod-empanadas-beef',
    squareId: 'sq-empanadas-beef-001',
    name: 'Beef Empanadas (6 pack)',
    description: 'Traditional Argentine beef empanadas, pack of 6',
    price: 18.99,
    images: ['/images/empanadas-beef.jpg'],
    categoryId: 'cat-empanadas',
    featured: true,
    active: true,
    slug: 'beef-empanadas-6-pack',
  },

  inactiveProduct: {
    id: 'prod-inactive',
    squareId: 'sq-inactive-001',
    name: 'Inactive Product',
    description: 'This product is not active',
    price: 9.99,
    images: ['/images/inactive.jpg'],
    categoryId: 'cat-other',
    featured: false,
    active: false,
    slug: 'inactive-product',
  },
};

/**
 * Mock categories for testing
 */
export const mockCategories = {
  alfajores: {
    id: 'cat-alfajores',
    name: 'Alfajores',
    description: 'Traditional Argentine sandwich cookies',
    order: 1,
    isActive: true,
    slug: 'alfajores',
    squareId: 'sq-cat-alfajores',
  },

  empanadas: {
    id: 'cat-empanadas',
    name: 'Empanadas',
    description: 'Savory pastries with various fillings',
    order: 2,
    isActive: true,
    slug: 'empanadas',
    squareId: 'sq-cat-empanadas',
  },

  beverages: {
    id: 'cat-beverages',
    name: 'Beverages',
    description: 'Argentine drinks and teas',
    order: 3,
    isActive: true,
    slug: 'beverages',
    squareId: 'sq-cat-beverages',
  },
};

/**
 * Mock user profiles for testing
 */
export const mockProfiles = {
  customer: {
    id: 'profile-customer-001',
    email: 'customer@example.com',
    name: 'Regular Customer',
    phone: '+14155551234',
    role: 'CUSTOMER' as const,
  },

  admin: {
    id: 'profile-admin-001',
    email: 'admin@destino-sf.com',
    name: 'Admin User',
    phone: '+14155559999',
    role: 'ADMIN' as const,
  },

  vipCustomer: {
    id: 'profile-vip-001',
    email: 'vip@example.com',
    name: 'VIP Customer',
    phone: '+14155558888',
    role: 'CUSTOMER' as const,
  },
};

/**
 * Mock payment data for testing
 */
export const mockPayments = {
  completedPayment: {
    id: 'payment-completed-001',
    squarePaymentId: 'sq-payment-completed-001',
    amount: 31.97,
    status: PaymentStatus.PAID,
    rawData: {
      squareResponse: {
        id: 'sq-payment-completed-001',
        status: 'COMPLETED',
        amount_money: {
          amount: 3197,
          currency: 'USD',
        },
      },
    },
  },

  pendingPayment: {
    id: 'payment-pending-001',
    squarePaymentId: 'sq-payment-pending-001',
    amount: 45.50,
    status: PaymentStatus.PENDING,
    rawData: {
      squareResponse: {
        id: 'sq-payment-pending-001',
        status: 'PENDING',
        amount_money: {
          amount: 4550,
          currency: 'USD',
        },
      },
    },
  },

  failedPayment: {
    id: 'payment-failed-001',
    squarePaymentId: 'sq-payment-failed-001',
    amount: 25.98,
    status: PaymentStatus.FAILED,
    rawData: {
      squareResponse: {
        id: 'sq-payment-failed-001',
        status: 'FAILED',
        amount_money: {
          amount: 2598,
          currency: 'USD',
        },
      },
    },
  },
};

/**
 * Mock delivery zones and fees for testing
 */
export const mockDeliveryZones = {
  nearby: {
    name: 'San Francisco',
    fee: 5.99,
    minOrder: 25.00,
    estimatedTime: '30-45 minutes',
  },

  distant: {
    name: 'Oakland',
    fee: 8.99,
    minOrder: 50.00,
    estimatedTime: '45-60 minutes',
  },

  premium: {
    name: 'Peninsula',
    fee: 12.99,
    minOrder: 75.00,
    estimatedTime: '60-90 minutes',
  },
};

/**
 * Complete test scenarios combining multiple fixtures
 */
export const mockScenarios = {
  // Successful order flow
  successfulOrder: {
    customer: mockProfiles.customer,
    items: [mockCartItems[0], mockCartItems[1]],
    address: mockAddresses.nearbyAddress,
    deliveryZone: mockDeliveryZones.nearby,
    payment: mockPayments.completedPayment,
  },

  // Order with minimum enforcement
  minimumOrderTest: {
    customer: mockProfiles.customer,
    items: [mockCartItems[0]], // Only one item, might not meet minimum
    address: mockAddresses.distantAddress,
    deliveryZone: mockDeliveryZones.distant, // Higher minimum
  },

  // Admin workflow test
  adminWorkflow: {
    admin: mockProfiles.admin,
    orders: [mockOrders.pendingOrder, mockOrders.completedOrder],
    products: [mockProducts.alfajoresDulce, mockProducts.empanadasBeef],
  },

  // Edge case scenarios
  edgeCases: {
    emptyCart: {
      customer: mockProfiles.customer,
      items: [],
      address: mockAddresses.nearbyAddress,
    },
    invalidAddress: {
      customer: mockProfiles.customer,
      items: mockCartItems,
      address: mockAddresses.invalidAddress,
    },
    internationalOrder: {
      customer: mockProfiles.customer,
      items: mockCartItems,
      address: mockAddresses.internationalAddress,
    },
  },
}; 