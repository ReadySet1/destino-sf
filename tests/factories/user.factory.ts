/**
 * User Test Data Factory
 * Generates realistic user data for testing using Faker
 */

import { faker } from '@faker-js/faker';
import { Prisma, UserRole } from '@prisma/client';

export interface UserFactoryOptions {
  id?: string;
  email?: string;
  role?: UserRole;
  name?: string;
  phone?: string;
}

/**
 * Generate user data (does not create in database)
 */
export function buildUser(options: UserFactoryOptions = {}): Prisma.ProfileUncheckedCreateInput {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const name = options.name || `${firstName} ${lastName}`;

  return {
    id: options.id || faker.string.uuid(),
    email: options.email || faker.internet.email({ firstName, lastName }).toLowerCase(),
    role: options.role || UserRole.CUSTOMER,
    name,
    phone: options.phone || faker.phone.number('(###) ###-####'),
  };
}

/**
 * Generate multiple users
 */
export function buildUsers(count: number, options: UserFactoryOptions = {}): Prisma.ProfileUncheckedCreateInput[] {
  return Array.from({ length: count }, () => buildUser(options));
}

/**
 * Generate admin user
 */
export function buildAdminUser(options: Omit<UserFactoryOptions, 'role'> = {}): Prisma.ProfileUncheckedCreateInput {
  return buildUser({ ...options, role: UserRole.ADMIN });
}

/**
 * Generate customer user
 */
export function buildCustomerUser(options: Omit<UserFactoryOptions, 'role'> = {}): Prisma.ProfileUncheckedCreateInput {
  return buildUser({ ...options, role: UserRole.CUSTOMER });
}

/**
 * Generate user with specific email domain
 */
export function buildUserWithDomain(domain: string, options: Omit<UserFactoryOptions, 'email'> = {}): Prisma.ProfileUncheckedCreateInput {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const username = faker.internet.username({ firstName, lastName }).toLowerCase();

  return buildUser({
    ...options,
    email: `${username}@${domain}`,
    name: options.name || `${firstName} ${lastName}`,
  });
}

/**
 * Generate test user with predictable data (useful for debugging)
 */
export function buildTestUser(suffix: string = ''): Prisma.ProfileUncheckedCreateInput {
  return {
    id: faker.string.uuid(),
    email: `test.user${suffix}@example.com`,
    role: UserRole.CUSTOMER,
    name: `Test User${suffix}`,
    phone: '(555) 123-4567',
  };
}
