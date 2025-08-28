// src/types/product.ts

import { Decimal } from '@prisma/client/runtime/library';

export interface Product {
  id: string;
  squareId: string;
  name: string;
  description?: string | null;
  price: number | Decimal;
  images: string[];
  slug: string;
  categoryId: string;
  category?: Category;
  variants?: Variant[];
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
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  order: number;
  active: boolean;
  slug?: string | null;
  imageUrl?: string | null;
  metadata?: any;
  squareId?: string | null;
  products?: Product[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Variant {
  id: string;
  name: string;
  price?: number | Decimal | null;
  squareVariantId?: string | null;
  productId: string;
  product?: Product;
  createdAt: Date;
  updatedAt: Date;
}

// Input types for creating/updating
export interface CreateProductInput {
  name: string;
  squareId: string;
  description?: string;
  price: number;
  images: string[];
  categoryId: string;
  featured?: boolean;
  active?: boolean;
  variants?: CreateVariantInput[];
}

export interface CreateVariantInput {
  name: string;
  price?: number;
  squareVariantId?: string;
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
  order?: number;
  active?: boolean;
  slug?: string;
  imageUrl?: string;
  metadata?: any;
  squareId?: string;
}
