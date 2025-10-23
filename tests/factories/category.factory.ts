/**
 * Category Test Data Factory
 * Generates realistic category data for testing
 */

import { faker } from '@faker-js/faker';
import { Prisma } from '@prisma/client';

export interface CategoryFactoryOptions {
  name?: string;
  slug?: string;
  description?: string;
  squareId?: string;
  active?: boolean;
  displayOrder?: number;
}

/**
 * Generate category data (does not create in database)
 */
export function buildCategory(options: CategoryFactoryOptions = {}): Prisma.CategoryUncheckedCreateInput {
  const name = options.name || faker.commerce.department();
  const slug = options.slug || faker.helpers.slugify(name).toLowerCase();

  return {
    name,
    slug,
    description: options.description || faker.lorem.sentence(),
    squareId: options.squareId || `sq_cat_${faker.string.alphanumeric(16)}`,
    active: options.active ?? true,
    displayOrder: options.displayOrder || faker.number.int({ min: 1, max: 10 }),
  };
}

/**
 * Generate multiple categories
 */
export function buildCategories(count: number, options: CategoryFactoryOptions = {}): Prisma.CategoryUncheckedCreateInput[] {
  return Array.from({ length: count }, () => buildCategory(options));
}

/**
 * Generate empanadas category
 */
export function buildEmpanadasCategory(options: Omit<CategoryFactoryOptions, 'name' | 'slug'> = {}): Prisma.CategoryUncheckedCreateInput {
  return buildCategory({
    ...options,
    name: 'Empanadas',
    slug: 'empanadas',
    description: 'Authentic Argentine empanadas',
  });
}

/**
 * Generate alfajores category
 */
export function buildAlfajoresCategory(options: Omit<CategoryFactoryOptions, 'name' | 'slug'> = {}): Prisma.CategoryUncheckedCreateInput {
  return buildCategory({
    ...options,
    name: 'Alfajores',
    slug: 'alfajores',
    description: 'Traditional Argentine sandwich cookies',
  });
}

/**
 * Generate catering category
 */
export function buildCateringCategory(options: Omit<CategoryFactoryOptions, 'name' | 'slug'> = {}): Prisma.CategoryUncheckedCreateInput {
  return buildCategory({
    ...options,
    name: 'Catering',
    slug: 'catering',
    description: 'Catering packages and event services',
  });
}

/**
 * Generate test category with predictable data
 */
export function buildTestCategory(suffix: string = ''): Prisma.CategoryUncheckedCreateInput {
  return {
    name: `Test Category${suffix}`,
    slug: `test-category${suffix.toLowerCase().replace(/\s/g, '-')}`,
    description: 'Test category description',
    squareId: `test-square-category-id${suffix}`,
    active: true,
    displayOrder: 1,
  };
}

/**
 * Generate standard Destino SF categories
 */
export function buildDestinoCategories(): Prisma.CategoryUncheckedCreateInput[] {
  return [
    buildEmpanadasCategory({ displayOrder: 1 }),
    buildAlfajoresCategory({ displayOrder: 2 }),
    buildCateringCategory({ displayOrder: 3 }),
    buildCategory({
      name: 'Sauces',
      slug: 'sauces',
      description: 'Authentic Argentine sauces and condiments',
      displayOrder: 4,
    }),
  ];
}
