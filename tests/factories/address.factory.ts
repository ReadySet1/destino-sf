/**
 * Address Test Data Factory
 * Generates realistic address data for testing
 */

import { faker } from '@faker-js/faker';

export interface AddressFactoryOptions {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  isDefault?: boolean;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

/**
 * Generate address data
 */
export function buildAddress(options: AddressFactoryOptions = {}): Address {
  return {
    street: options.street || faker.location.streetAddress(),
    city: options.city || faker.location.city(),
    state: options.state || faker.location.state({ abbreviated: true }),
    zipCode: options.zipCode || faker.location.zipCode(),
    country: options.country || 'US',
  };
}

/**
 * Generate multiple addresses
 */
export function buildAddresses(count: number, options: AddressFactoryOptions = {}): Address[] {
  return Array.from({ length: count }, () => buildAddress(options));
}

/**
 * Generate San Francisco address
 */
export function buildSanFranciscoAddress(
  options: Omit<AddressFactoryOptions, 'city' | 'state' | 'zipCode'> = {}
): Address {
  const zipCodes = [
    '94102',
    '94103',
    '94104',
    '94105',
    '94107',
    '94108',
    '94109',
    '94110',
    '94111',
  ];

  return buildAddress({
    ...options,
    city: 'San Francisco',
    state: 'CA',
    zipCode: faker.helpers.arrayElement(zipCodes),
  });
}

/**
 * Generate California address
 */
export function buildCaliforniaAddress(
  options: Omit<AddressFactoryOptions, 'state'> = {}
): Address {
  const cities = ['San Francisco', 'Los Angeles', 'San Diego', 'San Jose', 'Oakland', 'Sacramento'];

  return buildAddress({
    ...options,
    city: options.city || faker.helpers.arrayElement(cities),
    state: 'CA',
  });
}

/**
 * Generate address for specific delivery zone
 */
export function buildAddressForZone(
  zone: 'sf' | 'south_bay' | 'peninsula' | 'nationwide'
): Address {
  switch (zone) {
    case 'sf':
      return buildSanFranciscoAddress();

    case 'south_bay':
      return buildAddress({
        city: faker.helpers.arrayElement(['San Jose', 'Sunnyvale', 'Mountain View', 'Palo Alto']),
        state: 'CA',
        zipCode: faker.helpers.arrayElement(['95110', '95111', '94085', '94043', '94301']),
      });

    case 'peninsula':
      return buildAddress({
        city: faker.helpers.arrayElement(['Redwood City', 'San Mateo', 'Burlingame', 'Millbrae']),
        state: 'CA',
        zipCode: faker.helpers.arrayElement(['94061', '94402', '94010', '94030']),
      });

    case 'nationwide':
      return buildAddress();
  }
}

/**
 * Generate test address with predictable data
 */
export function buildTestAddress(suffix: string = ''): Address {
  return {
    street: `123 Test Street${suffix}`,
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    country: 'US',
  };
}
