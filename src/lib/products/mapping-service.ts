// src/lib/products/mapping-service.ts
import { prisma } from '@/lib/db';
import { getCatalogClient } from '@/lib/square/client';
import { logger } from '@/utils/logger';
import type {
  ProductWithDescriptor,
  MappingIssue,
  AuditResult,
  SquareCatalogMapping,
} from '@/types/product-mapping';

export class ProductMappingService {
  private catalogClient = getCatalogClient();

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
    await prisma.productMappingAudit.updateMany({
      where: {
        productId: { in: fixableIssues.map(i => i.productId) },
        resolved: false,
      },
      data: {
        resolved: true,
        resolvedAt: new Date(),
      },
    });
  }

  /**
   * Validate a single product and return issues
   */
  async validateSingleProduct(productId: string): Promise<MappingIssue[]> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        variants: true,
      },
    });

    if (!product) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    const squareItem = await this.fetchSquareItem(product.squareId);
    const issues: MappingIssue[] = [];

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
      return issues;
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

    return issues;
  }

  private async fixSingleIssue(issue: MappingIssue): Promise<void> {
    switch (issue.type) {
      case 'DUPLICATE_DESCRIPTION':
      case 'INCORRECT_INGREDIENTS':
        await prisma.product.update({
          where: { id: issue.productId },
          data: {
            description: issue.expected,
            correctDescription: issue.expected,
            descriptionValidatedAt: new Date(),
            mappingStatus: 'VALID',
          },
        });
        break;

      case 'CATEGORY_MISMATCH':
        // For category mismatches, we may need manual review
        // especially for combo products
        await prisma.product.update({
          where: { id: issue.productId },
          data: {
            mappingStatus: 'NEEDS_REVIEW',
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
    const catalogApi = this.catalogClient?.catalogApi;
    if (!catalogApi) {
      throw new Error('Square catalog API not available');
    }

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
      const catalogApi = this.catalogClient?.catalogApi;
      if (!catalogApi) {
        throw new Error('Square catalog API not available');
      }

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
      productId: issue.productId,
      squareId: issue.squareId,
      issueType: issue.type,
      severity: issue.severity,
      fieldName: issue.field,
      expectedValue: issue.expected,
      actualValue: issue.actual,
      message: issue.message,
      resolved: false,
    }));

    if (auditRecords.length > 0) {
      // Clear existing unresolved issues for these products first
      await prisma.productMappingAudit.deleteMany({
        where: {
          productId: { in: auditRecords.map(r => r.productId) },
          resolved: false,
        },
      });

      // Insert new audit records
      await prisma.productMappingAudit.createMany({
        data: auditRecords,
      });
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
