/**
 * TypeScript types that match the Prisma schema models
 * Enhanced with proper Decimal.js handling and comprehensive relations
 */

import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import type { DecimalInput, MoneyValue, SerializedDecimal } from './database';

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

export interface Profile {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
  orders?: Order[];
  addresses?: Address[];
}

// Enhanced Product interface with proper Decimal handling
export interface Product {
  id: string;
  squareId: string;
  name: string;
  description?: string | null;
  price: Decimal;
  images: string[];
  categoryId: string;
  featured: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Nutrition fields
  calories?: number | null;
  dietaryPreferences?: string[];
  ingredients?: string | null;
  allergens?: string[];
  nutritionFacts?: Prisma.JsonValue | null;
  
  // Availability fields for pre-order and seasonal items
  visibility?: string | null;
  isAvailable?: boolean;
  isPreorder?: boolean;
  preorderStartDate?: Date | null;
  preorderEndDate?: Date | null;
  availabilityStart?: Date | null;
  availabilityEnd?: Date | null;
  itemState?: string | null;
  availabilityMeta?: Prisma.JsonValue | null;
  customAttributes?: Prisma.JsonValue | null;
  
  // Relations
  orderItems?: OrderItem[];
  category?: Category;
  variants?: Variant[];
}

// Enhanced Product types with Prisma payload types
export type ProductWithCategory = Prisma.ProductGetPayload<{
  include: { category: true };
}>;

export type ProductWithVariants = Prisma.ProductGetPayload<{
  include: { variants: true };
}>;

export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    category: true;
    variants: true;
    orderItems: {
      include: {
        order: true;
      };
    };
  };
}>;

// Product input types with proper Decimal handling
export interface CreateProductInput {
  squareId: string;
  name: string;
  description?: string;
  price: DecimalInput;
  images: string[];
  categoryId: string;
  featured?: boolean;
  active?: boolean;
  calories?: number;
  dietaryPreferences?: string[];
  ingredients?: string;
  allergens?: string[];
  nutritionFacts?: Prisma.JsonValue;
  visibility?: string;
  isAvailable?: boolean;
  isPreorder?: boolean;
  preorderStartDate?: Date;
  preorderEndDate?: Date;
  availabilityStart?: Date;
  availabilityEnd?: Date;
  itemState?: string;
  availabilityMeta?: Prisma.JsonValue;
  customAttributes?: Prisma.JsonValue;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  price?: DecimalInput;
  images?: string[];
  categoryId?: string;
  featured?: boolean;
  active?: boolean;
  calories?: number;
  dietaryPreferences?: string[];
  ingredients?: string;
  allergens?: string[];
  nutritionFacts?: Prisma.JsonValue;
  visibility?: string;
  isAvailable?: boolean;
  isPreorder?: boolean;
  preorderStartDate?: Date;
  preorderEndDate?: Date;
  availabilityStart?: Date;
  availabilityEnd?: Date;
  itemState?: string;
  availabilityMeta?: Prisma.JsonValue;
  customAttributes?: Prisma.JsonValue;
}

// Enhanced Category interface
export interface Category {
  id: string;
  name: string;
  description?: string | null;
  order: number;
  active: boolean;
  slug?: string | null;
  imageUrl?: string | null;
  squareId?: string | null;
  metadata?: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  products?: Product[];
}

// Category types with Prisma payloads
export type CategoryWithProducts = Prisma.CategoryGetPayload<{
  include: { products: true };
}>;

export type CategoryWithProductCount = Category & {
  _count: {
    products: number;
  };
};

// Category input types
export interface CreateCategoryInput {
  name: string;
  description?: string;
  order?: number;
  active?: boolean;
  slug?: string;
  imageUrl?: string;
  squareId?: string;
  metadata?: Prisma.JsonValue;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  order?: number;
  active?: boolean;
  slug?: string;
  imageUrl?: string;
  squareId?: string;
  metadata?: Prisma.JsonValue;
}

// Enhanced Variant interface
export interface Variant {
  id: string;
  name: string;
  price?: Decimal | null;
  squareVariantId?: string | null;
  productId: string;
  sku?: string | null;
  inventory?: number | null;
  weight?: Decimal | null;
  dimensions?: Prisma.JsonValue | null;
  metadata?: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  orderItems?: OrderItem[];
  product?: Product;
}

// Variant types with Prisma payloads
export type VariantWithProduct = Prisma.VariantGetPayload<{
  include: { 
    product: {
      include: {
        category: true;
      };
    };
  };
}>;

// Variant input types
export interface CreateVariantInput {
  name: string;
  price?: DecimalInput;
  squareVariantId?: string;
  productId: string;
  sku?: string;
  inventory?: number;
  weight?: DecimalInput;
  dimensions?: Prisma.JsonValue;
  metadata?: Prisma.JsonValue;
}

export interface UpdateVariantInput {
  name?: string;
  price?: DecimalInput;
  squareVariantId?: string;
  sku?: string;
  inventory?: number;
  weight?: DecimalInput;
  dimensions?: Prisma.JsonValue;
  metadata?: Prisma.JsonValue;
}

// Enhanced Order interface with comprehensive typing
export interface Order {
  id: string;
  squareOrderId?: string | null;
  status: OrderStatus;
  total: Decimal;
  subtotal?: Decimal | null;
  tax?: Decimal | null;
  tip?: Decimal | null;
  discount?: Decimal | null;
  shippingCost?: Decimal | null;
  userId?: string | null;
  customerName: string;
  email: string;
  phone: string;
  addressId?: string | null;
  pickupTime: Date;
  notes?: string | null;
  cancelReason?: string | null;
  paymentStatus: PaymentStatus;
  paymentMethod?: string | null;
  fulfillmentType?: string | null;
  metadata?: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  profile?: Profile | null;
  address?: Address | null;
  items?: OrderItem[];
  payments?: Payment[];
}

// Enhanced OrderItem interface with proper Decimal handling
export interface OrderItem {
  id: string;
  quantity: number;
  price: Decimal;
  unitPrice?: Decimal | null;
  totalPrice?: Decimal | null;
  productId: string;
  variantId?: string | null;
  orderId: string;
  squareLineItemId?: string | null;
  customizations?: Prisma.JsonValue | null;
  modifiers?: Prisma.JsonValue | null;
  specialInstructions?: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  order?: Order;
  product?: Product;
  variant?: Variant | null;
}

// Payment interface
export interface Payment {
  id: string;
  orderId: string;
  amount: Decimal;
  currency: string;
  paymentMethod: string;
  status: PaymentStatus;
  squarePaymentId?: string | null;
  transactionReference?: string | null;
  metadata?: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  order?: Order;
}

// Enhanced Order types with Prisma payload types
export type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    items: {
      include: {
        product: true;
        variant: true;
      };
    };
  };
}>;

export type OrderWithFullRelations = Prisma.OrderGetPayload<{
  include: {
    items: {
      include: {
        product: {
          include: {
            category: true;
            variants: true;
          };
        };
        variant: true;
      };
    };
    profile: true;
    address: true;
    payments: true;
  };
}>;

export type OrderItemWithProduct = Prisma.OrderItemGetPayload<{
  include: {
    product: {
      include: {
        category: true;
      };
    };
    variant: true;
  };
}>;

// Order creation and update input types
export interface CreateOrderInput {
  squareOrderId?: string;
  status?: OrderStatus;
  total: DecimalInput;
  subtotal?: DecimalInput;
  tax?: DecimalInput;
  tip?: DecimalInput;
  discount?: DecimalInput;
  shippingCost?: DecimalInput;
  userId?: string;
  customerName: string;
  email: string;
  phone: string;
  addressId?: string;
  pickupTime: Date;
  notes?: string;
  paymentStatus?: PaymentStatus;
  paymentMethod?: string;
  fulfillmentType?: string;
  metadata?: Prisma.JsonValue;
  items: CreateOrderItemInput[];
}

export interface CreateOrderItemInput {
  quantity: number;
  price: DecimalInput;
  unitPrice?: DecimalInput;
  productId: string;
  variantId?: string;
  squareLineItemId?: string;
  customizations?: Prisma.JsonValue;
  modifiers?: Prisma.JsonValue;
  specialInstructions?: string;
}

export interface UpdateOrderInput {
  status?: OrderStatus;
  total?: DecimalInput;
  subtotal?: DecimalInput;
  tax?: DecimalInput;
  tip?: DecimalInput;
  discount?: DecimalInput;
  shippingCost?: DecimalInput;
  customerName?: string;
  email?: string;
  phone?: string;
  addressId?: string;
  pickupTime?: Date;
  notes?: string;
  cancelReason?: string;
  paymentStatus?: PaymentStatus;
  paymentMethod?: string;
  fulfillmentType?: string;
  metadata?: Prisma.JsonValue;
}

export interface BusinessHours {
  id: string;
  day: number;
  openTime?: string | null;
  closeTime?: string | null;
  isClosed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreSettings {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  phone?: string | null;
  email?: string | null;
  taxRate: Decimal;
  minAdvanceHours: number;
  minOrderAmount: Decimal;
  cateringMinimumAmount: Decimal;
  maxDaysInAdvance: number;
  isStoreOpen: boolean;
  temporaryClosureMsg?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscriber {
  id: string;
  email: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromoCode {
  id: string;
  code: string;
  discountType: DiscountType;
  discountAmount: Decimal;
  minOrderAmount?: Decimal | null;
  maxUses?: number | null;
  timesUsed: number;
  validFrom: Date;
  validUntil?: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Enhanced Address interface
export interface Address {
  id: string;
  userId: string;
  name?: string | null;
  company?: string | null;
  street: string;
  street2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string | null;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
  isResidential?: boolean | null;
  deliveryInstructions?: string | null;
  latitude?: Decimal | null;
  longitude?: Decimal | null;
  validated?: boolean | null;
  metadata?: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  user?: Profile;
  orders?: Order[];
}

// Address input types
export interface CreateAddressInput {
  userId: string;
  name?: string;
  company?: string;
  street: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
  isResidential?: boolean;
  deliveryInstructions?: string;
  latitude?: DecimalInput;
  longitude?: DecimalInput;
  validated?: boolean;
  metadata?: Prisma.JsonValue;
}

// Utility types for better type inference
export type ModelWithId<T> = T & { id: string };
export type ModelWithTimestamps<T> = T & { 
  createdAt: Date; 
  updatedAt: Date; 
};
export type ModelWithSoftDelete<T> = T & { 
  deletedAt?: Date | null; 
};

// Pagination types
export interface PaginationInput {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Search and filtering types
export interface SearchFilters {
  query?: string;
  category?: string;
  priceMin?: DecimalInput;
  priceMax?: DecimalInput;
  featured?: boolean;
  active?: boolean;
  availability?: 'available' | 'preorder' | 'unavailable';
}

// Bulk operation types
export interface BulkUpdateResult {
  updated: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}

// Type-safe select and include builders
export type SelectBuilder<T> = {
  [K in keyof T]?: boolean;
};

export type IncludeBuilder<T> = {
  [K in keyof T]?: boolean | object;
};

// Decimal utility types for JSON serialization
export interface SerializableDecimal {
  value: string;
  precision: number;
}

export type DecimalJSON<T> = {
  [K in keyof T]: T[K] extends Decimal 
    ? SerializableDecimal 
    : T[K] extends Decimal | null
    ? SerializableDecimal | null
    : T[K] extends Decimal | undefined
    ? SerializableDecimal | undefined
    : T[K];
};

// Enhanced repository pattern types
export interface Repository<T> {
  findById: (id: string) => Promise<T | null>;
  findMany: (filters?: Partial<T>) => Promise<T[]>;
  create: (data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  delete: (id: string) => Promise<boolean>;
  count: (filters?: Partial<T>) => Promise<number>;
}
