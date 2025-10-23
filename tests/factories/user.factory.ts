/**
 * User Test Data Factory
 * Generates realistic user data for testing using Faker
 */

import { faker } from '@faker-js/faker';
import { Prisma, UserRole } from '@prisma/client';

export interface UserFactoryOptions {
  email?: string;
  role?: UserRole;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive?: boolean;
}

/**
 * Generate user data (does not create in database)
 */
export function buildUser(options: UserFactoryOptions = {}): Prisma.ProfileCreateInput {
  const firstName = options.firstName || faker.person.firstName();
  const lastName = options.lastName || faker.person.lastName();

  return {
    email: options.email || faker.internet.email({ firstName, lastName }).toLowerCase(),
    role: options.role || UserRole.CUSTOMER,
    firstName,
    lastName,
    phone: options.phone || faker.phone.number('(###) ###-####'),
    isActive: options.isActive ?? true,
  };
}

/**
 * Generate multiple users
 */
export function buildUsers(count: number, options: UserFactoryOptions = {}): Prisma.ProfileCreateInput[] {
  return Array.from({ length: count }, () => buildUser(options));
}

/**
 * Generate admin user
 */
export function buildAdminUser(options: Omit<UserFactoryOptions, 'role'> = {}): Prisma.ProfileCreateInput {
  return buildUser({ ...options, role: UserRole.ADMIN });
}

/**
 * Generate customer user
 */
export function buildCustomerUser(options: Omit<UserFactoryOptions, 'role'> = {}): Prisma.ProfileCreateInput {
  return buildUser({ ...options, role: UserRole.CUSTOMER });
}

/**
 * Generate user with specific email domain
 */
export function buildUserWithDomain(domain: string, options: Omit<UserFactoryOptions, 'email'> = {}): Prisma.ProfileCreateInput {
  const firstName = options.firstName || faker.person.firstName();
  const lastName = options.lastName || faker.person.lastName();
  const username = faker.internet.username({ firstName, lastName }).toLowerCase();

  return buildUser({
    ...options,
    email: `${username}@${domain}`,
    firstName,
    lastName,
  });
}

/**
 * Generate test user with predictable data (useful for debugging)
 */
export function buildTestUser(suffix: string = ''): Prisma.ProfileCreateInput {
  return {
    email: `test.user${suffix}@example.com`,
    role: UserRole.CUSTOMER,
    firstName: 'Test',
    lastName: `User${suffix}`,
    phone: '(555) 123-4567',
    isActive: true,
  };
}
