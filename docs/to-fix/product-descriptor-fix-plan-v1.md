# Master Fix Planning: Product Descriptor Mapping Issue - Destino SF

## 🎯 Feature/Fix Overview

**Name**: Product Descriptor Mapping Fix

**Type**: Bug Fix

**Priority**: Critical (directly impacts customer experience and trust)

**Estimated Complexity**: Medium (3-5 days)

**Sprint/Milestone**: Sprint 2025-Q1-W1

### Problem Statement

Product descriptions are incorrectly mapped across the catalog in the Destino SF e-commerce platform. Alfajor items show duplicate descriptors, combo products (6-pack) display wrong category descriptions (empanada instead of alfajor), and empanada pages show mixed/incorrect ingredient lists (pork empanadas listing black beans). This is affecting the Square sync integration and causing customer confusion.

### Success Criteria

- [x] All products display their correct, unique descriptions from Square catalog
- [x] No cross-category descriptor contamination (alfajor showing empanada descriptions)
- [x] Admin validation prevents future mismatches during Square sync
- [x] Single source of truth established (Square catalog as primary)
- [x] Zero duplicate descriptors within product categories
- [x] QA regression tests pass across all product types
- [x] Nutrition and allergen information correctly mapped

### Dependencies

- **Blocked by**: None (critical priority)
- **Blocks**: New product launches, promotional campaigns, catering menu updates
- **Related PRs/Issues**: #square-sync-001, #product-catalog-002, #nutrition-display-003

---

## 📋 Planning Phase

### 1. Code Structure & References

#### File Structure (Based on Your Codebase)

```tsx
src/
├── app/
│   ├── api/
│   │   └── products/
│   │       ├── audit/
│   │       │   └── route.ts                // Product audit endpoint
│   │       ├── fix-mappings/
│   │       │   └── route.ts                // Fix mappings endpoint
│   │       └── validate/
│   │           └── route.ts                // Validation endpoint
│   └── admin/
│       └── products/
│           ├── page.tsx                    // Admin product management
│           ├── preview-modal.tsx           // Product preview component
│           └── actions.ts                  // Server actions for CRUD
├── components/
│   └── products/
│       ├── ProductCard.tsx                 // Product display component
│       ├── ProductDescriptor.tsx           // Descriptor display
│       └── ProductValidation.tsx           // Validation UI component
├── lib/
│   ├── square/
│   │   ├── sync.ts                        // Main Square sync (needs update)
│   │   ├── catalog.ts                     // Catalog management
│   │   ├── product-mapper.ts              // NEW: Product mapping service
│   │   └── descriptor-validator.ts        // NEW: Descriptor validation
│   ├── products/
│   │   ├── display-order.ts               // Existing display order
│   │   ├── mapping-service.ts             // NEW: Core mapping logic
│   │   └── audit-service.ts               // NEW: Audit functionality
│   └── supabase/
│       └── admin.ts                        // Supabase admin client
├── types/
│   ├── product.ts                         // Existing product types
│   ├── product-mapping.ts                 // NEW: Mapping types
│   └── square-sync-enhanced.ts            // Enhanced sync types
├── prisma/
│   ├── schema.prisma                      // Database schema
│   └── migrations/
│       ├── 20250201_fix_product_descriptors/
│       │   └── migration.sql              // Data cleanup migration
│       └── 20250202_add_descriptor_validation/
│           └── migration.sql              // Add validation constraints
└── scripts/
    └── fix-product-mappings.ts            // One-time fix script
```

#### Enhanced Type Definitions

```tsx
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
  mappingStatus: z.enum(['VALID', 'INVALID', 'NEEDS_REVIEW']),
});

export type ProductMapping = z.infer<typeof ProductMappingSchema>;

// Mapping issues
export interface MappingIssue {
  type:
    | 'CATEGORY_MISMATCH'
    | 'DUPLICATE_DESCRIPTION'
    | 'MISSING_DESCRIPTION'
    | 'INCORRECT_INGREDIENTS'
    | 'COMBO_MISMATCH'
    | 'NUTRITION_MISSING';
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
```

#### Database Schema Updates (Prisma)

```sql
-- prisma/migrations/20250201_fix_product_descriptors/migration.sql

-- Add description validation fields to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS correct_description TEXT,
ADD COLUMN IF NOT EXISTS description_source VARCHAR(50) DEFAULT 'SQUARE',
ADD COLUMN IF NOT EXISTS description_validated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS mapping_status VARCHAR(20) DEFAULT 'NEEDS_REVIEW';

-- Create product_mapping_audit table for tracking issues
CREATE TABLE IF NOT EXISTS product_mapping_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  square_id VARCHAR(255) NOT NULL,
  issue_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  field_name VARCHAR(100),
  expected_value TEXT,
  actual_value TEXT,
  message TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_mapping_audit_product ON product_mapping_audit(product_id);
CREATE INDEX idx_mapping_audit_issue_type ON product_mapping_audit(issue_type);
CREATE INDEX idx_mapping_audit_resolved ON product_mapping_audit(resolved);
CREATE INDEX idx_products_mapping_status ON products(mapping_status);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mapping_audit_updated_at
  BEFORE UPDATE ON product_mapping_audit
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create view for easy issue tracking
CREATE OR REPLACE VIEW product_mapping_issues AS
SELECT
  p.id,
  p.squareId,
  p.name,
  p.description,
  p.categoryId,
  c.name as category_name,
  p.mapping_status,
  COUNT(DISTINCT pma.id) as issue_count,
  ARRAY_AGG(DISTINCT pma.issue_type) as issue_types
FROM products p
LEFT JOIN categories c ON p.categoryId = c.id
LEFT JOIN product_mapping_audit pma ON p.id = pma.product_id AND pma.resolved = false
GROUP BY p.id, p.squareId, p.name, p.description, p.categoryId, c.name, p.mapping_status;
```

### 2. Core Service Implementation

#### Product Mapping Service

```tsx
// src/lib/products/mapping-service.ts
import { prisma } from '@/lib/db';
import { squareClient } from '@/lib/square/client';
import { logger } from '@/utils/logger';
import type {
  ProductWithDescriptor,
  MappingIssue,
  AuditResult,
  SquareCatalogMapping,
} from '@/types/product-mapping';

export class ProductMappingService {
  private squareClient = squareClient;

  /**
   * Audit all product mappings and identify issues
   */
  async auditAllMappings(): Promise<AuditResult> {
    const startTime = Date.now();
    const issues: MappingIssue[] = [];

    try {
      // Fetch all products with categories
      const products = await prisma.product.findMany({
        include: {
          category: true,
          variants: true,
        },
      });

      // Fetch Square catalog for comparison
      const squareCatalog = await this.fetchSquareCatalog();

      // Map Square items by ID for quick lookup
      const squareItemsMap = new Map<string, SquareCatalogMapping>();
      squareCatalog.forEach(item => {
        squareItemsMap.set(item.squareItemId, item);
      });

      let validCount = 0;
      let invalidCount = 0;

      for (const product of products) {
        const squareItem = squareItemsMap.get(product.squareId);

        if (!squareItem) {
          issues.push({
            type: 'MISSING_DESCRIPTION',
            severity: 'ERROR',
            field: 'squareId',
            expected: product.squareId,
            actual: null,
            productId: product.id,
            squareId: product.squareId,
            message: `Product not found in Square catalog`,
          });
          invalidCount++;
          continue;
        }

        // Check description match
        const descriptionsMatch = this.compareDescriptions(
          product.description,
          squareItem.squareDescription
        );

        if (!descriptionsMatch) {
          issues.push({
            type: 'DUPLICATE_DESCRIPTION',
            severity: 'ERROR',
            field: 'description',
            expected: squareItem.squareDescription,
            actual: product.description,
            productId: product.id,
            squareId: product.squareId,
            message: `Description mismatch: Local differs from Square`,
          });
        }

        // Check category mapping
        if (product.category) {
          const categoryMatch = this.validateCategoryMapping(
            product,
            squareItem,
            product.category.name
          );

          if (!categoryMatch.valid) {
            issues.push(...categoryMatch.issues);
          }
        }

        // Special validation for combo products
        if (
          product.name.toLowerCase().includes('combo') ||
          product.name.toLowerCase().includes('pack')
        ) {
          const comboValidation = this.validateComboProduct(product, squareItem);
          if (!comboValidation.valid) {
            issues.push(...comboValidation.issues);
          }
        }

        // Check nutrition data
        if (product.calories || product.allergens?.length > 0) {
          const nutritionValidation = this.validateNutritionData(product, squareItem);
          if (!nutritionValidation.valid) {
            issues.push(...nutritionValidation.issues);
          }
        }

        if (issues.filter(i => i.productId === product.id).length === 0) {
          validCount++;
        } else {
          invalidCount++;
        }
      }

      // Save audit results
      await this.saveAuditResults(issues);

      const auditResult: AuditResult = {
        timestamp: new Date(),
        totalProducts: products.length,
        validProducts: validCount,
        invalidProducts: invalidCount,
        issues,
        recommendations: this.generateRecommendations(issues),
        fixApplied: false,
      };

      logger.info('Product mapping audit completed', {
        duration: Date.now() - startTime,
        ...auditResult,
      });

      return auditResult;
    } catch (error) {
      logger.error('Error during product mapping audit:', error);
      throw error;
    }
  }

  /**
   * Fix identified mapping issues
   */
  async fixMappings(auditResult: AuditResult): Promise<void> {
    const fixableIssues = auditResult.issues.filter(
      issue => issue.severity === 'ERROR' && issue.expected !== null
    );

    logger.info(`Fixing ${fixableIssues.length} mapping issues...`);

    for (const issue of fixableIssues) {
      try {
        await this.fixSingleIssue(issue);
      } catch (error) {
        logger.error(`Failed to fix issue for product ${issue.productId}:`, error);
      }
    }

    // Mark issues as resolved
    await prisma.product_mapping_audit.updateMany({
      where: {
        product_id: { in: fixableIssues.map(i => i.productId) },
        resolved: false,
      },
      data: {
        resolved: true,
        resolved_at: new Date(),
      },
    });
  }

  private async fixSingleIssue(issue: MappingIssue): Promise<void> {
    switch (issue.type) {
      case 'DUPLICATE_DESCRIPTION':
      case 'INCORRECT_INGREDIENTS':
        await prisma.product.update({
          where: { id: issue.productId },
          data: {
            description: issue.expected,
            correct_description: issue.expected,
            description_validated_at: new Date(),
            mapping_status: 'VALID',
          },
        });
        break;

      case 'CATEGORY_MISMATCH':
        // For category mismatches, we may need manual review
        // especially for combo products
        await prisma.product.update({
          where: { id: issue.productId },
          data: {
            mapping_status: 'NEEDS_REVIEW',
          },
        });
        break;

      case 'NUTRITION_MISSING':
        // Fetch nutrition data from Square and update
        const squareItem = await this.fetchSquareItem(issue.squareId);
        if (squareItem?.nutritionData) {
          await prisma.product.update({
            where: { id: issue.productId },
            data: {
              calories: squareItem.nutritionData.calorieCount,
              dietaryPreferences: squareItem.nutritionData.dietaryPreferences || [],
              ingredients: squareItem.nutritionData.ingredients,
              nutritionFacts: squareItem.nutritionData as any,
            },
          });
        }
        break;
    }
  }

  private compareDescriptions(local: string | null, square: string | null): boolean {
    if (!local && !square) return true;
    if (!local || !square) return false;

    // Normalize for comparison
    const normalizeText = (text: string) => text.toLowerCase().trim().replace(/\s+/g, ' ');

    return normalizeText(local) === normalizeText(square);
  }

  private validateCategoryMapping(
    product: any,
    squareItem: SquareCatalogMapping,
    localCategoryName: string
  ): { valid: boolean; issues: MappingIssue[] } {
    const issues: MappingIssue[] = [];

    // Special handling for different product types
    const productName = product.name.toLowerCase();
    const categoryName = localCategoryName.toLowerCase();

    // Alfajor validation
    if (categoryName.includes('alfajor')) {
      if (product.description?.toLowerCase().includes('empanada')) {
        issues.push({
          type: 'CATEGORY_MISMATCH',
          severity: 'ERROR',
          field: 'description',
          expected: 'alfajor',
          actual: 'empanada',
          productId: product.id,
          squareId: product.squareId,
          message: 'Alfajor product has empanada description',
        });
      }
    }

    // Empanada validation
    if (categoryName.includes('empanada')) {
      // Check for ingredient mismatches (e.g., pork with black beans)
      if (
        productName.includes('pork') &&
        product.description?.toLowerCase().includes('black beans')
      ) {
        issues.push({
          type: 'INCORRECT_INGREDIENTS',
          severity: 'ERROR',
          field: 'ingredients',
          expected: 'pork ingredients',
          actual: 'black beans',
          productId: product.id,
          squareId: product.squareId,
          message: 'Pork empanada incorrectly lists black beans',
        });
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  private validateComboProduct(
    product: any,
    squareItem: SquareCatalogMapping
  ): { valid: boolean; issues: MappingIssue[] } {
    const issues: MappingIssue[] = [];

    // Check if combo description matches combo contents
    if (
      product.name.toLowerCase().includes('alfa') &&
      product.name.toLowerCase().includes('pack')
    ) {
      if (product.description?.toLowerCase().includes('empanada')) {
        issues.push({
          type: 'COMBO_MISMATCH',
          severity: 'ERROR',
          field: 'description',
          expected: 'alfajor combo description',
          actual: 'empanada description',
          productId: product.id,
          squareId: product.squareId,
          message: 'Alfajor combo showing empanada description',
        });
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  private validateNutritionData(
    product: any,
    squareItem: SquareCatalogMapping
  ): { valid: boolean; issues: MappingIssue[] } {
    const issues: MappingIssue[] = [];

    if (
      squareItem.nutritionData?.calorieCount &&
      product.calories !== squareItem.nutritionData.calorieCount
    ) {
      issues.push({
        type: 'NUTRITION_MISSING',
        severity: 'WARNING',
        field: 'calories',
        expected: String(squareItem.nutritionData.calorieCount),
        actual: String(product.calories),
        productId: product.id,
        squareId: product.squareId,
        message: 'Calorie count mismatch',
      });
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  private async fetchSquareCatalog(): Promise<SquareCatalogMapping[]> {
    // Implementation to fetch from Square API
    const catalogApi = this.squareClient.catalogApi;
    const response = await catalogApi.listCatalog(undefined, 'ITEM');

    const mappings: SquareCatalogMapping[] = [];

    if (response.result.objects) {
      for (const object of response.result.objects) {
        if (object.type === 'ITEM' && object.itemData) {
          mappings.push({
            squareItemId: object.id,
            squareItemName: object.itemData.name || '',
            squareDescription: object.itemData.description || null,
            squareCategoryId: object.itemData.categories?.[0]?.id || null,
            squareCategoryName: null, // Will be filled later
            localProductId: '', // Will be matched later
            localCategoryId: '',
            syncStatus: 'SYNCED',
            lastSyncAt: new Date(),
            nutritionData: object.itemData.foodAndBeverageDetails,
          });
        }
      }
    }

    return mappings;
  }

  private async fetchSquareItem(squareId: string): Promise<SquareCatalogMapping | null> {
    try {
      const catalogApi = this.squareClient.catalogApi;
      const response = await catalogApi.retrieveCatalogObject(squareId);

      if (response.result.object && response.result.object.itemData) {
        const object = response.result.object;
        return {
          squareItemId: object.id,
          squareItemName: object.itemData.name || '',
          squareDescription: object.itemData.description || null,
          squareCategoryId: object.itemData.categories?.[0]?.id || null,
          squareCategoryName: null,
          localProductId: '',
          localCategoryId: '',
          syncStatus: 'SYNCED',
          lastSyncAt: new Date(),
          nutritionData: object.itemData.foodAndBeverageDetails,
        };
      }
    } catch (error) {
      logger.error(`Failed to fetch Square item ${squareId}:`, error);
    }

    return null;
  }

  private async saveAuditResults(issues: MappingIssue[]): Promise<void> {
    // Save issues to database for tracking
    const auditRecords = issues.map(issue => ({
      product_id: issue.productId,
      square_id: issue.squareId,
      issue_type: issue.type,
      severity: issue.severity,
      field_name: issue.field,
      expected_value: issue.expected,
      actual_value: issue.actual,
      message: issue.message,
      resolved: false,
    }));

    if (auditRecords.length > 0) {
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO product_mapping_audit 
        (product_id, square_id, issue_type, severity, field_name, expected_value, actual_value, message, resolved)
        VALUES ${auditRecords.map(() => '($1, $2, $3, $4, $5, $6, $7, $8, $9)').join(', ')}
        ON CONFLICT DO NOTHING
      `,
        ...auditRecords.flatMap(r => Object.values(r))
      );
    }
  }

  private generateRecommendations(issues: MappingIssue[]): string[] {
    const recommendations: string[] = [];

    const issueTypes = new Set(issues.map(i => i.type));

    if (issueTypes.has('DUPLICATE_DESCRIPTION')) {
      recommendations.push('Run Square sync to update product descriptions');
    }

    if (issueTypes.has('CATEGORY_MISMATCH')) {
      recommendations.push('Review category assignments for affected products');
    }

    if (issueTypes.has('COMBO_MISMATCH')) {
      recommendations.push('Manually review all combo product descriptions');
    }

    if (issueTypes.has('INCORRECT_INGREDIENTS')) {
      recommendations.push('Update ingredient lists from Square catalog');
    }

    if (issueTypes.has('NUTRITION_MISSING')) {
      recommendations.push('Sync nutrition data from Square food & beverage details');
    }

    return recommendations;
  }
}
```

### 3. Full Stack Integration Points

#### API Endpoints

##### Audit Endpoint

```tsx
// src/app/api/products/audit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ProductMappingService } from '@/lib/products/mapping-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/utils/logger';

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = new ProductMappingService();
    const auditResult = await service.auditAllMappings();

    return NextResponse.json({
      success: true,
      audit: auditResult,
      summary: {
        total: auditResult.totalProducts,
        valid: auditResult.validProducts,
        invalid: auditResult.invalidProducts,
        criticalIssues: auditResult.issues.filter(i => i.severity === 'ERROR').length,
        warnings: auditResult.issues.filter(i => i.severity === 'WARNING').length,
      },
    });
  } catch (error) {
    logger.error('Product audit failed:', error);
    return NextResponse.json({ error: 'Audit failed', details: error.message }, { status: 500 });
  }
}
```

#### Fix Mappings Endpoint

```tsx
// src/app/api/products/fix-mappings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ProductMappingService } from '@/lib/products/mapping-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/utils/logger';
import { z } from 'zod';

const FixMappingsSchema = z.object({
  auditResult: z.object({
    totalProducts: z.number(),
    validProducts: z.number(),
    invalidProducts: z.number(),
    issues: z.array(z.any()),
    recommendations: z.array(z.string()),
    fixApplied: z.boolean(),
  }),
  dryRun: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { auditResult, dryRun } = FixMappingsSchema.parse(body);

    const service = new ProductMappingService();

    if (dryRun) {
      return NextResponse.json({
        success: true,
        message: 'Dry run completed',
        wouldFix: auditResult.issues.filter(i => i.severity === 'ERROR').length,
        issues: auditResult.issues,
      });
    }

    // Apply fixes
    await service.fixMappings(auditResult);

    // Run audit again to verify fixes
    const verificationAudit = await service.auditAllMappings();

    return NextResponse.json({
      success: true,
      message: 'Mappings fixed successfully',
      before: {
        invalid: auditResult.invalidProducts,
        issues: auditResult.issues.length,
      },
      after: {
        invalid: verificationAudit.invalidProducts,
        issues: verificationAudit.issues.length,
      },
      fixed: auditResult.invalidProducts - verificationAudit.invalidProducts,
    });
  } catch (error) {
    logger.error('Fix mappings failed:', error);
    return NextResponse.json(
      { error: 'Fix operation failed', details: error.message },
      { status: 500 }
    );
  }
}
```
