/**
 * Test data fixtures for Destino SF E2E tests
 */

export interface TestCustomer {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface TestAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
}

export interface PaymentInfo {
  number: string;
  expiry: string;
  cvv: string;
  name: string;
}

export const testCustomer: TestCustomer = {
  email: 'test.customer@example.com',
  password: 'testpassword123',
  firstName: 'Test',
  lastName: 'Customer',
  phone: '(555) 123-4567'
};

export const testAdmin: TestCustomer = {
  email: 'admin@destinosf.com',
  password: 'adminpassword123',
  firstName: 'Admin',
  lastName: 'User',
  phone: '(555) 987-6543'
};export const testProducts = {
  empanada: {
    slug: 'beef-empanada',
    name: 'Beef Empanada',
    price: 4.50
  },
  alfajor: {
    slug: 'dulce-de-leche-alfajor',
    name: 'Dulce de Leche Alfajor',
    price: 3.75
  },
  vegetarian: {
    slug: 'spinach-empanada',
    name: 'Spinach & Cheese Empanada',
    price: 4.25
  }
};

export const testShippingAddress: TestAddress = {
  line1: '123 Test Street',
  city: 'San Francisco',
  state: 'CA',
  zip: '94102'
};

export const testBillingAddress: TestAddress = {
  line1: '456 Billing Ave',
  city: 'San Francisco',
  state: 'CA',
  zip: '94103'
};

export const testPaymentInfo: PaymentInfo = {
  // Square Sandbox test card
  number: '4111 1111 1111 1111',
  expiry: '12/25',
  cvv: '123',
  name: 'Test Customer'
};

export const cateringTestData = {
  event: {
    name: 'Office Lunch Meeting',
    date: '2025-07-15',
    time: '12:00',
    guestCount: 25,
    budget: 500
  },
  contact: {
    name: 'Event Organizer',
    email: 'organizer@company.com',
    phone: '(555) 999-0000',
    company: 'Test Company Inc.'
  }
};