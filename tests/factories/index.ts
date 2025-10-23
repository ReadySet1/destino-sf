/**
 * Test Data Factories
 * Centralized exports for all test data factories
 *
 * Usage:
 * import { buildUser, buildProduct, buildOrder } from 'tests/factories';
 */

// User factories
export * from './user.factory';

// Address factories
export * from './address.factory';

// Product factories
export * from './product.factory';

// Category factories
export * from './category.factory';

// Order factories
export * from './order.factory';

// Payment factories
export * from './payment.factory';

/**
 * Re-export faker for convenience in tests
 */
export { faker } from '@faker-js/faker';
