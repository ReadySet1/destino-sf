// src/types/product.ts

import { Decimal } from "@prisma/client/runtime/library";

export interface Product {
  id: string;
  squareId: string;
  name: string;
  description?: string | null;
  price: number | Decimal;
  images: string[];
  categoryId: string;
  category?: Category;
  variants?: Variant[];
  featured: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  order: number;
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
} 