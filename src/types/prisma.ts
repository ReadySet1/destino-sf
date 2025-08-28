/**
 * TypeScript types that match the Prisma schema models
 */

import { Decimal } from '@prisma/client/runtime/library';

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
  
  // Availability fields for pre-order and seasonal items
  visibility?: string | null;
  isAvailable?: boolean;
  isPreorder?: boolean;
  preorderStartDate?: Date | null;
  preorderEndDate?: Date | null;
  availabilityStart?: Date | null;
  availabilityEnd?: Date | null;
  itemState?: string | null;
  availabilityMeta?: Record<string, any> | null;
  customAttributes?: Record<string, any> | null;
  
  orderItems?: OrderItem[];
  category?: Category;
  variants?: Variant[];
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  order: number;
  active: boolean;
  slug?: string | null;
  imageUrl?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  products?: Product[];
}

export interface Variant {
  id: string;
  name: string;
  price?: Decimal | null;
  squareVariantId?: string | null;
  productId: string;
  createdAt: Date;
  updatedAt: Date;
  orderItems?: OrderItem[];
  product?: Product;
}

export interface Order {
  id: string;
  squareOrderId?: string | null;
  status: OrderStatus;
  total: Decimal;
  userId?: string | null;
  customerName: string;
  email: string;
  phone: string;
  addressId?: string | null;
  pickupTime: Date;
  notes?: string | null;
  cancelReason?: string | null;
  paymentStatus: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
  profile?: Profile | null;
  address?: Address | null;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  quantity: number;
  price: Decimal;
  productId: string;
  variantId?: string | null;
  orderId: string;
  createdAt: Date;
  updatedAt: Date;
  order?: Order;
  product?: Product;
  variant?: Variant | null;
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

export interface Address {
  id: string;
  userId: string;
  name?: string | null;
  street: string;
  street2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: Profile;
  orders?: Order[];
}
