// Comprehensive User Factory for Phase 4 QA Implementation
import { faker } from '@faker-js/faker';

export interface UserFactoryOptions {
  role?: 'CUSTOMER' | 'ADMIN' | 'STAFF';
  name?: string;
  email?: string;
  phone?: string;
  supabaseUserId?: string;
  isActive?: boolean;
  hasOrders?: boolean;
  preferredFulfillment?: 'pickup' | 'local_delivery' | 'nationwide_shipping';
  address?: Record<string, any>;
}

/**
 * Creates a realistic user object
 */
export function createMockUser(overrides: UserFactoryOptions = {}) {
  const {
    role = 'CUSTOMER',
    name = faker.person.fullName(),
    email = faker.internet.email(),
    phone = faker.phone.number('###-###-####'),
    supabaseUserId = faker.string.uuid(),
    isActive = true,
    hasOrders = faker.datatype.boolean(0.7), // 70% of users have orders
    preferredFulfillment = faker.helpers.arrayElement(['pickup', 'local_delivery', 'nationwide_shipping']),
    address = generateUserAddress(),
    ...customOverrides
  } = overrides;

  return {
    id: faker.string.uuid(),
    supabaseUserId,
    name,
    email: email.toLowerCase(),
    phone,
    role,
    isActive,
    preferredFulfillment,
    address,
    createdAt: faker.date.past({ years: 2 }),
    updatedAt: faker.date.recent({ days: 30 }),
    lastLoginAt: isActive ? faker.date.recent({ days: 7 }) : faker.date.past({ months: 3 }),
    // Customer preferences
    emailNotifications: faker.datatype.boolean(0.8),
    smsNotifications: faker.datatype.boolean(0.6),
    // Marketing preferences
    marketingOptIn: faker.datatype.boolean(0.4),
    birthdayMonth: faker.date.birthdate().getMonth() + 1,
    // Loyalty info
    totalOrdersCount: hasOrders ? faker.number.int({ min: 1, max: 50 }) : 0,
    totalSpent: hasOrders ? faker.number.float({ min: 25, max: 2000, precision: 0.01 }) : 0,
    loyaltyPoints: hasOrders ? faker.number.int({ min: 0, max: 500 }) : 0,
    ...customOverrides,
  };
}

/**
 * Generate realistic user address
 */
function generateUserAddress() {
  return {
    street: faker.location.streetAddress(),
    street2: faker.datatype.boolean(0.3) ? faker.location.secondaryAddress() : null,
    city: faker.helpers.weightedArrayElement([
      { weight: 0.6, value: 'San Francisco' },
      { weight: 0.2, value: 'Oakland' },
      { weight: 0.1, value: 'Berkeley' },
      { weight: 0.1, value: 'Daly City' },
    ]),
    state: 'CA',
    postalCode: faker.location.zipCode('#####'),
    country: 'US',
    isDeliveryAddress: true,
    deliveryInstructions: faker.datatype.boolean(0.4) ? faker.lorem.sentence() : null,
  };
}

/**
 * Create multiple users with realistic distribution
 */
export function createMockUsers(count: number, baseOptions: UserFactoryOptions = {}) {
  return Array.from({ length: count }, () => {
    // Realistic role distribution
    const role = faker.helpers.weightedArrayElement([
      { weight: 0.95, value: 'CUSTOMER' },
      { weight: 0.03, value: 'STAFF' },
      { weight: 0.02, value: 'ADMIN' },
    ]);

    return createMockUser({ ...baseOptions, role });
  });
}

/**
 * User scenarios for specific test cases
 */
export const UserScenarios = {
  // Regular customer with order history
  regularCustomer: () => createMockUser({
    role: 'CUSTOMER',
    hasOrders: true,
    isActive: true,
    totalOrdersCount: faker.number.int({ min: 5, max: 20 }),
    totalSpent: faker.number.float({ min: 150, max: 800, precision: 0.01 }),
    loyaltyPoints: faker.number.int({ min: 50, max: 200 }),
    emailNotifications: true,
    marketingOptIn: true,
  }),

  // New customer (no orders yet)
  newCustomer: () => createMockUser({
    role: 'CUSTOMER',
    hasOrders: false,
    totalOrdersCount: 0,
    totalSpent: 0,
    loyaltyPoints: 0,
    createdAt: faker.date.recent({ days: 7 }),
    lastLoginAt: faker.date.recent({ days: 1 }),
  }),

  // VIP customer (high-value)
  vipCustomer: () => createMockUser({
    role: 'CUSTOMER',
    hasOrders: true,
    totalOrdersCount: faker.number.int({ min: 25, max: 100 }),
    totalSpent: faker.number.float({ min: 1000, max: 5000, precision: 0.01 }),
    loyaltyPoints: faker.number.int({ min: 300, max: 1000 }),
    preferredFulfillment: 'local_delivery', // VIPs often prefer delivery
    emailNotifications: true,
    smsNotifications: true,
    marketingOptIn: true,
  }),

  // Inactive customer
  inactiveCustomer: () => createMockUser({
    role: 'CUSTOMER',
    isActive: false,
    hasOrders: true,
    lastLoginAt: faker.date.past({ months: 6 }),
    emailNotifications: false,
    smsNotifications: false,
    marketingOptIn: false,
  }),

  // Admin user
  adminUser: () => createMockUser({
    role: 'ADMIN',
    name: 'Admin User',
    email: 'admin@destinosf.com',
    isActive: true,
    hasOrders: false,
    emailNotifications: true,
    lastLoginAt: faker.date.recent({ hours: 24 }),
  }),

  // Staff member
  staffUser: () => createMockUser({
    role: 'STAFF',
    name: 'Staff Member',
    email: 'staff@destinosf.com',
    isActive: true,
    hasOrders: false,
    emailNotifications: true,
    lastLoginAt: faker.date.recent({ hours: 8 }),
  }),

  // Customer with delivery preference
  deliveryCustomer: () => createMockUser({
    role: 'CUSTOMER',
    preferredFulfillment: 'local_delivery',
    hasOrders: true,
    address: {
      ...generateUserAddress(),
      deliveryInstructions: 'Ring doorbell twice, leave at door if no answer',
    },
  }),

  // Customer with pickup preference
  pickupCustomer: () => createMockUser({
    role: 'CUSTOMER',
    preferredFulfillment: 'pickup',
    hasOrders: true,
    phone: '415-555-0123', // Reliable phone for pickup notifications
  }),

  // Corporate customer (catering orders)
  corporateCustomer: () => createMockUser({
    role: 'CUSTOMER',
    name: 'Corporate Account Manager',
    email: 'orders@acmecorp.com',
    hasOrders: true,
    totalOrdersCount: faker.number.int({ min: 10, max: 50 }),
    totalSpent: faker.number.float({ min: 500, max: 3000, precision: 0.01 }),
    preferredFulfillment: 'pickup',
    emailNotifications: true,
    smsNotifications: false,
  }),

  // Customer with incomplete profile
  incompleteProfileCustomer: () => createMockUser({
    role: 'CUSTOMER',
    phone: '', // Missing phone
    address: {}, // Missing address
    hasOrders: false,
    emailNotifications: false,
    smsNotifications: false,
  }),
};

/**
 * Create a customer with realistic order history
 */
export function createCustomerWithOrderHistory(orderCount: number = 5) {
  const customer = UserScenarios.regularCustomer();
  
  // Calculate realistic totals based on order count
  const avgOrderValue = faker.number.float({ min: 25, max: 75, precision: 0.01 });
  const totalSpent = orderCount * avgOrderValue;
  const loyaltyPoints = Math.floor(totalSpent / 10); // 1 point per $10 spent
  
  return {
    ...customer,
    totalOrdersCount: orderCount,
    totalSpent,
    loyaltyPoints,
  };
}

/**
 * Create a complete user profile with associated data
 */
export function createCompleteUserProfile(options: UserFactoryOptions = {}) {
  const user = createMockUser(options);
  
  // Add associated data that might be useful for testing
  const profile = {
    user,
    preferences: {
      favoriteItems: Array.from({ length: 3 }, () => faker.string.uuid()),
      allergyInfo: faker.datatype.boolean(0.2) ? faker.helpers.arrayElements(['nuts', 'dairy', 'gluten'], 2) : [],
      spicePreference: faker.helpers.arrayElement(['mild', 'medium', 'spicy']),
      communicationPreference: faker.helpers.arrayElement(['email', 'sms', 'both']),
    },
    paymentMethods: Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => ({
      id: faker.string.uuid(),
      type: faker.helpers.arrayElement(['credit_card', 'debit_card']),
      last4: faker.finance.creditCardNumber('####'),
      brand: faker.helpers.arrayElement(['visa', 'mastercard', 'amex']),
      isDefault: faker.datatype.boolean(0.3),
    })),
    addresses: [
      user.address,
      ...(faker.datatype.boolean(0.3) ? [generateUserAddress()] : []), // Some users have multiple addresses
    ],
  };

  return profile;
}
