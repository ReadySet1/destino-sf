/**
 * Test data fixtures for Destino SF E2E tests
 * Updated with real product data from the live website
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
  phone: '(555) 123-4567',
};

export const testAdmin: TestCustomer = {
  email: 'admin@destinosf.com',
  password: 'adminpassword123',
  firstName: 'Admin',
  lastName: 'User',
  phone: '(555) 987-6543',
};

// Real product data from the live website
export const testProducts = {
  empanada: {
    slug: 'empanadas-argentine-beef-frozen-4-pack',
    name: 'Empanadas- Argentine Beef (frozen- 4 pack)',
    price: 17.0,
  },
  alfajor: {
    slug: 'alfajores-classic-1-dozen-packet',
    name: 'Alfajores- Classic (1 dozen- packet)',
    price: 14.0,
  },
  vegetarian: {
    slug: 'empanadas-vegetarian-frozen-4-pack',
    name: 'Empanadas- Vegetarian (frozen- 4 pack)',
    price: 17.0,
  },
  chocolate_alfajor: {
    slug: 'alfajores-chocolate-1-dozen-packet',
    name: 'Alfajores- Chocolate (1 dozen- packet)',
    price: 20.0,
  },
  huacatay_chicken: {
    slug: 'empanadas-huacatay-chicken-frozen-4-pack',
    name: 'Empanadas- Huacatay Chicken (frozen- 4 pack)',
    price: 18.0,
  },
  combo_6pack: {
    slug: 'alfajores-6-pack-combo',
    name: 'Alfajores- 6-pack combo',
    price: 10.0,
  },
};

export const testShippingAddress: TestAddress = {
  line1: '123 Test Street',
  city: 'San Francisco',
  state: 'CA',
  zip: '94102',
};

export const testBillingAddress: TestAddress = {
  line1: '456 Billing Ave',
  city: 'San Francisco',
  state: 'CA',
  zip: '94103',
};

export const testPaymentInfo: PaymentInfo = {
  // Square Sandbox test card
  number: '4111 1111 1111 1111',
  expiry: '12/25',
  cvv: '123',
  name: 'Test Customer',
};

export const cateringTestData = {
  event: {
    name: 'Office Lunch Meeting',
    date: '2025-07-15',
    time: '12:00',
    guestCount: 25,
    budget: 500,
    type: 'Corporate Event',
    specialRequests: 'Sample special request - need vegetarian options for 10 guests',
  },
  contact: {
    name: 'Event Organizer',
    email: 'organizer@company.com',
    phone: '(555) 999-0000',
    company: 'Test Company Inc.',
  },
  // Enhanced test scenarios
  scenarios: {
    corporateEvent: {
      contact: {
        name: 'Sarah Wilson',
        email: 'catering@company.com',
        phone: '(555) 246-8135',
        company: 'Tech Startup Inc',
      },
      event: {
        type: 'Corporate Event',
        date: '2025-07-15',
        time: '12:00 PM',
        guestCount: 25,
        location: '123 Business St, San Francisco, CA 94105',
        specialRequests: 'Vegetarian options needed for 15 guests',
      },
    },
    weddingEvent: {
      contact: {
        name: 'Maria Rodriguez',
        email: 'maria@weddingparty.com',
        phone: '(555) 789-0123',
        company: 'Wedding Party',
      },
      event: {
        type: 'Wedding Reception',
        date: '2025-08-20',
        time: '6:00 PM',
        guestCount: 75,
        location: 'Golden Gate Park, San Francisco, CA',
        specialRequests: 'Mix of traditional and vegetarian empanadas for diverse guests',
      },
    },
    birthdayParty: {
      contact: {
        name: 'John Smith',
        email: 'john@familyparty.com',
        phone: '(555) 321-9876',
        company: 'Family Event',
      },
      event: {
        type: 'Birthday Party',
        date: '2025-06-30',
        time: '2:00 PM',
        guestCount: 40,
        location: 'Private residence in Mission District',
        specialRequests: 'Kid-friendly options and some gluten-free alfajores',
      },
    },
  },
};
