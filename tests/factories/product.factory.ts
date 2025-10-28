/**
 * Product Test Data Factory
 * Generates realistic product data for testing
 */

import { faker } from '@faker-js/faker';
import { Prisma } from '@prisma/client';

export interface ProductFactoryOptions {
  name?: string;
  slug?: string;
  description?: string;
  price?: number;
  categoryId?: string;
  squareId?: string;
  active?: boolean;
  images?: string[];
  isAvailable?: boolean;
}

/**
 * Generate product data (does not create in database)
 */
export function buildProduct(options: ProductFactoryOptions = {}): Prisma.ProductUncheckedCreateInput {
  const name = options.name || faker.commerce.productName();
  const slug = options.slug || faker.helpers.slugify(name).toLowerCase();
  const price = options.price || parseFloat(faker.commerce.price({ min: 10, max: 100, dec: 2 }));

  return {
    name,
    slug,
    description: options.description || faker.commerce.productDescription(),
    price: Math.round(price * 100), // Convert to cents
    categoryId: options.categoryId || faker.string.uuid(),
    squareId: options.squareId || `sq_${faker.string.alphanumeric(16)}`,
    active: options.active ?? true,
    images: options.images || ['/placeholder-product.jpg'],
    isAvailable: options.isAvailable ?? true,
  };
}

/**
 * Generate multiple products
 */
export function buildProducts(count: number, options: ProductFactoryOptions = {}): Prisma.ProductUncheckedCreateInput[] {
  return Array.from({ length: count }, () => buildProduct(options));
}

/**
 * Generate empanada product
 */
export function buildEmpanada(options: ProductFactoryOptions = {}): Prisma.ProductUncheckedCreateInput {
  const flavors = ['Beef', 'Chicken', 'Vegetarian', 'Spinach & Cheese', 'Ham & Cheese'];
  const flavor = faker.helpers.arrayElement(flavors);

  return buildProduct({
    ...options,
    name: options.name || `Empanadas - ${flavor} (frozen - 4 pack)`,
    price: options.price || faker.helpers.arrayElement([1700, 1800, 1900]), // $17-19
  });
}

/**
 * Generate alfajor product
 */
export function buildAlfajor(options: ProductFactoryOptions = {}): Prisma.ProductUncheckedCreateInput {
  const types = ['Classic', 'Chocolate', 'Dulce de Leche', 'Mixed'];
  const type = faker.helpers.arrayElement(types);
  const count = faker.helpers.arrayElement([6, 12]);

  return buildProduct({
    ...options,
    name: options.name || `Alfajores - ${type} (${count === 6 ? '6-pack' : '1 dozen'})`,
    price: options.price || (count === 6 ? 1000 : 1400), // $10 or $14
  });
}

/**
 * Generate catering package product
 */
export function buildCateringPackage(options: ProductFactoryOptions = {}): Prisma.ProductUncheckedCreateInput {
  const sizes = ['Small (10-15 people)', 'Medium (20-30 people)', 'Large (40-50 people)'];
  const size = faker.helpers.arrayElement(sizes);
  const peopleCount = size.includes('10-15') ? 12 : size.includes('20-30') ? 25 : 45;

  return buildProduct({
    ...options,
    name: options.name || `Catering Package - ${size}`,
    price: options.price || peopleCount * 20 * 100, // $20 per person in cents
  });
}

/**
 * Generate sauce product
 */
export function buildSauce(options: ProductFactoryOptions = {}): Prisma.ProductUncheckedCreateInput {
  const sauces = ['Chimichurri', 'Spicy Mayo', 'Salsa Criolla', 'Aji Verde'];
  const sauce = faker.helpers.arrayElement(sauces);

  return buildProduct({
    ...options,
    name: options.name || `${sauce} Sauce`,
    price: options.price || 500, // $5
  });
}

/**
 * Generate test product with predictable data
 */
export function buildTestProduct(suffix: string = ''): Prisma.ProductUncheckedCreateInput {
  return {
    name: `Test Product${suffix}`,
    slug: `test-product${suffix.toLowerCase().replace(/\s/g, '-')}`,
    description: 'Test product description',
    price: 1000, // $10.00 in cents
    categoryId: 'test-category-id',
    squareId: `test-square-id${suffix}`,
    active: true,
    images: ['https://example.com/test-image.jpg'],
    isAvailable: true,
  };
}

/**
 * Generate product variants for a base product
 */
export function buildProductVariants(baseProduct: Prisma.ProductUncheckedCreateInput, count: number): Prisma.ProductUncheckedCreateInput[] {
  const variants = ['4-pack', '6-pack', '12-pack', 'Single'];

  return Array.from({ length: count }, (_, i) => ({
    ...baseProduct,
    name: `${baseProduct.name} - ${variants[i % variants.length]}`,
    slug: `${baseProduct.slug}-${variants[i % variants.length].toLowerCase()}`,
    squareId: `${baseProduct.squareId}-variant-${i}`,
    price: baseProduct.price + (i * 500), // Each variant costs $5 more
  }));
}
