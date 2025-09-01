// src/types/product-mapping.ts
import { z } from 'zod';
import { Product, Category, Variant } from '@prisma/client';

// Branded types for type safety
export type ProductId = string & { readonly brand: unique symbol };
export type SquareId = string & { readonly brand: unique symbol };
export type CategoryId = string & { readonly brand: unique symbol };

// Enhanced Product with proper description mapping
export interface ProductWithDescriptor extends Product {
  correctDescription: string | null;
  mappingIssues: MappingIssue[];
  nutritionData?: NutritionInfo;
  allergenInfo?: string[];
}

// Nutrition information from Square
export interface NutritionInfo {
  calories?: number;
  dietaryPreferences?: string[];
  ingredients?: string;
  allergens?: string[];
  nutritionFacts?: Record<string, any>;
}

// Mapping validation schema
export const ProductMappingSchema = z.object({
  productId: z.string().uuid(),
  squareId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  categoryId: z.string().uuid(),
  categoryName: z.string(),
  expectedCategory: z.string(),
  actualCategory: z.string().nullable(),
  isCombo: z.boolean().default(false),
  comboItems: z.array(z.string()).optional(),
  mappingStatus: z.enum(['VALID', 'INVALID', 'NEEDS_REVIEW'])
});

export type ProductMapping = z.infer<typeof ProductMappingSchema>;

// Mapping issues
export interface MappingIssue {
  type: 'CATEGORY_MISMATCH' | 'DUPLICATE_DESCRIPTION' | 'MISSING_DESCRIPTION' | 
        'INCORRECT_INGREDIENTS' | 'COMBO_MISMATCH' | 'NUTRITION_MISSING';
  severity: 'ERROR' | 'WARNING' | 'INFO';
  field: string;
  expected: string | null;
  actual: string | null;
  productId: string;
  squareId: string;
  message: string;
}

// Audit result
export interface AuditResult {
  timestamp: Date;
  totalProducts: number;
  validProducts: number;
  invalidProducts: number;
  issues: MappingIssue[];
  recommendations: string[];
  fixApplied: boolean;
}

// Square catalog mapping
export interface SquareCatalogMapping {
  squareItemId: string;
  squareItemName: string;
  squareDescription: string | null;
  squareCategoryId: string | null;
  squareCategoryName: string | null;
  localProductId: string;
  localCategoryId: string;
  syncStatus: 'SYNCED' | 'OUT_OF_SYNC' | 'ERROR';
  lastSyncAt: Date;
  nutritionData?: {
    calorieCount?: number;
    dietaryPreferences?: string[];
    ingredients?: string;
  };
}

// Validation result schemas
export const ValidateProductRequestSchema = z.object({
  productId: z.string().uuid()
});

export const ValidateProductResponseSchema = z.object({
  success: z.boolean(),
  issues: z.array(z.object({
    type: z.string(),
    severity: z.string(),
    field: z.string(),
    expected: z.string().nullable(),
    actual: z.string().nullable(),
    productId: z.string(),
    squareId: z.string(),
    message: z.string()
  })),
  isValid: z.boolean()
});

export type ValidateProductRequest = z.infer<typeof ValidateProductRequestSchema>;
export type ValidateProductResponse = z.infer<typeof ValidateProductResponseSchema>;
