// Comprehensive Product Factory for Phase 4 QA Implementation
import { faker } from '@faker-js/faker';
import type { Product } from '@prisma/client';
import { Decimal } from 'decimal.js';

export interface ProductFactoryOptions {
  category?: string;
  available?: boolean;
  price?: number;
  name?: string;
  squareItemId?: string;
  imageUrl?: string;
  description?: string;
  tags?: string[];
  isFeatured?: boolean;
  isSpotlightPick?: boolean;
}

/**
 * Creates a realistic product object
 */
export function createMockProduct(overrides: ProductFactoryOptions = {}): Partial<Product> {
  const {
    category = faker.helpers.arrayElement(['EMPANADAS', 'CATERING', 'BEVERAGES', 'DESSERTS', 'SIDES']),
    available = faker.datatype.boolean(0.9), // 90% chance of being available
    price = faker.number.float({ min: 5.99, max: 89.99, precision: 0.01 }),
    name = generateProductName(category),
    squareItemId = `sq-item-${faker.string.uuid()}`,
    imageUrl = `https://images.example.com/${faker.string.uuid()}.jpg`,
    description = faker.lorem.sentences(2),
    tags = generateProductTags(category),
    isFeatured = faker.datatype.boolean(0.2), // 20% chance of being featured
    isSpotlightPick = faker.datatype.boolean(0.15), // 15% chance of being spotlight pick
    ...customOverrides
  } = overrides;

  return {
    id: faker.string.uuid(),
    name,
    description,
    price: new Decimal(price),
    category,
    available,
    squareItemId,
    imageUrl,
    tags,
    isFeatured,
    isSpotlightPick,
    createdAt: faker.date.past({ years: 1 }),
    updatedAt: faker.date.recent({ days: 30 }),
    // Nutrition facts (optional)
    calories: category !== 'BEVERAGES' ? faker.number.int({ min: 150, max: 450 }) : faker.number.int({ min: 0, max: 200 }),
    protein: category === 'EMPANADAS' ? faker.number.float({ min: 8, max: 15, precision: 0.1 }) : undefined,
    carbs: faker.number.float({ min: 15, max: 35, precision: 0.1 }),
    fat: faker.number.float({ min: 5, max: 20, precision: 0.1 }),
    // Meta fields
    slug: faker.helpers.slugify(name).toLowerCase(),
    sortOrder: faker.number.int({ min: 1, max: 100 }),
    ...customOverrides,
  };
}

/**
 * Generate category-appropriate product names
 */
function generateProductName(category: string): string {
  const names = {
    EMPANADAS: [
      'Classic Beef Empanadas',
      'Chicken & Cheese Empanadas', 
      'Spinach & Ricotta Empanadas',
      'Spicy Chorizo Empanadas',
      'Sweet Corn & Black Bean Empanadas',
      'Argentine Beef Empanadas',
      'Mushroom & Gruyere Empanadas',
      'Shrimp & Cilantro Empanadas',
    ],
    CATERING: [
      'Empanada Party Tray (24 pieces)',
      'Mixed Empanada Platter (36 pieces)',
      'Corporate Lunch Package',
      'Wedding Reception Tray',
      'Holiday Party Package',
      'Office Meeting Package',
      'Family Feast Bundle',
      'Graduation Party Platter',
    ],
    BEVERAGES: [
      'Horchata',
      'Agua Fresca',
      'Argentinian Mate',
      'Fresh Lemonade',
      'Iced Coffee',
      'Hot Chocolate',
      'Sparkling Water',
      'Fresh Orange Juice',
    ],
    DESSERTS: [
      'Dulce de Leche Empanadas',
      'Apple Cinnamon Empanadas',
      'Tres Leches Cake',
      'Alfajores',
      'Flan',
      'Churros',
      'Chocolate Empanadas',
      'Banana Foster Empanadas',
    ],
    SIDES: [
      'Chimichurri Sauce',
      'Spicy Salsa Verde',
      'Cilantro Lime Rice',
      'Black Bean Salad',
      'Mixed Green Salad',
      'Plantain Chips',
      'Yuca Fries',
      'Garlic Aioli',
    ],
  };

  const categoryNames = names[category as keyof typeof names] || names.EMPANADAS;
  return faker.helpers.arrayElement(categoryNames);
}

/**
 * Generate appropriate tags for products
 */
function generateProductTags(category: string): string[] {
  const baseTags = ['handmade', 'fresh', 'authentic'];
  
  const categoryTags = {
    EMPANADAS: ['savory', 'protein-rich', 'popular'],
    CATERING: ['bulk', 'party', 'corporate', 'large-order'],
    BEVERAGES: ['refreshing', 'traditional', 'cold'],
    DESSERTS: ['sweet', 'dessert', 'indulgent'],
    SIDES: ['complementary', 'sauce', 'appetizer'],
  };

  const specificTags = categoryTags[category as keyof typeof categoryTags] || [];
  
  // Randomly select some tags
  const selectedBaseTags = faker.helpers.arrayElements(baseTags, faker.number.int({ min: 1, max: 2 }));
  const selectedSpecificTags = faker.helpers.arrayElements(specificTags, faker.number.int({ min: 1, max: 3 }));
  
  return [...selectedBaseTags, ...selectedSpecificTags];
}

/**
 * Create multiple products with realistic distribution
 */
export function createMockProducts(count: number, baseOptions: ProductFactoryOptions = {}): Partial<Product>[] {
  return Array.from({ length: count }, () => {
    // Realistic category distribution
    const category = faker.helpers.weightedArrayElement([
      { weight: 0.5, value: 'EMPANADAS' },
      { weight: 0.2, value: 'CATERING' },
      { weight: 0.1, value: 'BEVERAGES' },
      { weight: 0.1, value: 'DESSERTS' },
      { weight: 0.1, value: 'SIDES' },
    ]);

    return createMockProduct({ ...baseOptions, category });
  });
}

/**
 * Product scenarios for specific test cases
 */
export const ProductScenarios = {
  // Popular empanada
  popularEmpanada: (): Partial<Product> => createMockProduct({
    category: 'EMPANADAS',
    name: 'Classic Beef Empanadas',
    price: 12.99,
    available: true,
    isFeatured: true,
    tags: ['popular', 'beef', 'classic', 'handmade'],
  }),

  // Out of stock item
  outOfStockItem: (): Partial<Product> => createMockProduct({
    available: false,
    name: 'Sold Out Special Empanadas',
    price: 15.99,
  }),

  // High-end catering item
  cateringTray: (): Partial<Product> => createMockProduct({
    category: 'CATERING',
    name: 'Premium Empanada Party Tray (48 pieces)',
    price: 189.99,
    available: true,
    description: 'Perfect for large gatherings with an assortment of our most popular empanadas',
    tags: ['catering', 'bulk', 'premium', 'party'],
  }),

  // Budget-friendly item
  budgetItem: (): Partial<Product> => createMockProduct({
    name: 'Simple Cheese Empanadas',
    price: 8.99,
    available: true,
    category: 'EMPANADAS',
    tags: ['affordable', 'cheese', 'simple'],
  }),

  // Spotlight pick
  spotlightPick: (): Partial<Product> => createMockProduct({
    isSpotlightPick: true,
    isFeatured: true,
    name: 'Chef\'s Special Empanadas',
    price: 16.99,
    available: true,
    description: 'Our chef\'s weekly special creation',
    tags: ['special', 'chef-choice', 'limited'],
  }),

  // Beverage
  beverage: (): Partial<Product> => createMockProduct({
    category: 'BEVERAGES',
    name: 'Traditional Horchata',
    price: 4.99,
    available: true,
    description: 'Creamy rice and cinnamon drink',
    tags: ['traditional', 'creamy', 'refreshing'],
  }),

  // Vegan option
  veganOption: (): Partial<Product> => createMockProduct({
    name: 'Vegan Spinach Empanadas',
    price: 11.99,
    available: true,
    description: 'Plant-based empanadas with fresh spinach and dairy-free cheese',
    tags: ['vegan', 'plant-based', 'spinach', 'healthy'],
  }),

  // Dessert
  dessert: (): Partial<Product> => createMockProduct({
    category: 'DESSERTS',
    name: 'Dulce de Leche Empanadas',
    price: 9.99,
    available: true,
    description: 'Sweet empanadas filled with rich dulce de leche',
    tags: ['sweet', 'dessert', 'dulce-de-leche', 'indulgent'],
  }),
};

/**
 * Create a product with variants (for complex testing)
 */
export function createProductWithVariants(baseProduct: ProductFactoryOptions = {}) {
  const product = createMockProduct(baseProduct);
  
  const variants = [
    {
      id: faker.string.uuid(),
      productId: product.id!,
      name: 'Regular',
      price: product.price,
      available: true,
      isDefault: true,
    },
    {
      id: faker.string.uuid(),
      productId: product.id!,
      name: 'Spicy',
      price: new Decimal(product.price!).plus(1.00),
      available: true,
      isDefault: false,
    },
    {
      id: faker.string.uuid(),
      productId: product.id!,
      name: 'Extra Large',
      price: new Decimal(product.price!).plus(3.00),
      available: faker.datatype.boolean(0.8),
      isDefault: false,
    },
  ];

  return { product, variants };
}
