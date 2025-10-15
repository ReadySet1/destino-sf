// src/lib/catering-duplicate-detector.ts
//
// 🔍 UTILIDAD PARA DETECTAR DUPLICADOS EN CATERING ITEMS
//
// Centraliza la lógica de detección de duplicados para usar en todos los scripts de sync
// Evita que se creen items duplicados desde diferentes fuentes (Square, scripts manuales, etc.)
//
// PRODUCTS_ONLY IMPLEMENTATION: Uses only products table as single source of truth
// This addresses the dual storage problem by using a unified data model with
// products table only, eliminating discrepancies and duplicate detection issues.

import { prisma } from './db';
import { VariationGrouper } from './square/variation-grouper';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingItem?: {
    id: string;
    name: string;
    squareProductId: string | null;
    source: 'square' | 'manual';
  };
  matchType?:
    | 'exact_square_id'
    | 'exact_name'
    | 'normalized_name'
    | 'base_product_exists'
    | 'exact_variation'
    | 'none';
  confidence: number; // 0-1, where 1 is exact match
  isVariation?: boolean;
  baseProduct?: any;
}

export class CateringDuplicateDetector {
  /**
   * Normalizar nombre para comparación
   */
  static normalizeItemName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s*-\s*/g, ' ') // "Alfajores - Classic" -> "alfajores classic"
      .replace(/[^\w\s]/g, '') // remover puntuación
      .replace(/\s+/g, ' ') // normalizar espacios múltiples
      .trim();
  }

  /**
   * Verificar si un item de catering ya existe (usando solo tabla products)
   * FIXED VERSION: Prevents false positives from cross-category name matches
   */
  static async checkForDuplicate(itemData: {
    name: string;
    squareProductId?: string | null;
    squareCategory?: string | null;
  }): Promise<DuplicateCheckResult> {
    const { name, squareProductId, squareCategory } = itemData;

    // 1. Verificación exacta por squareProductId (máxima prioridad y más confiable)
    // First check by Square ID (this is authoritative and prevents legitimate updates from being skipped)
    if (squareProductId) {
      const existingInProducts = await prisma.product.findFirst({
        where: {
          squareId: squareProductId,
          active: true,
        },
        select: {
          id: true,
          name: true,
          squareId: true,
          category: {
            select: {
              name: true,
            },
          },
        },
      });

      if (existingInProducts) {
        return {
          isDuplicate: true,
          existingItem: {
            id: existingInProducts.id,
            name: existingInProducts.name,
            squareProductId: existingInProducts.squareId,
            source: 'square',
          },
          matchType: 'exact_square_id',
          confidence: 1.0,
        };
      }
    }

    // 2. ONLY check by Square ID for sync operations
    // Name checking removed because legitimate items can have same names in different categories
    // Square ID is the authoritative unique identifier
    // Skip name-based duplicate detection for Square sync operations

    // 3. Skip all name-based duplicate detection for Square sync operations
    // Items with the same name can legitimately exist in different categories
    // Square ID is the authoritative unique identifier

    // 4. No se encontraron duplicados
    return {
      isDuplicate: false,
      matchType: 'none',
      confidence: 0,
    };
  }

  /**
   * Check for variation-aware duplicates (handles size variations)
   */
  static async checkForVariationDuplicate(itemData: {
    name: string;
    squareProductId?: string | null;
    squareCategory?: string | null;
  }): Promise<DuplicateCheckResult> {
    const { baseName, size } = VariationGrouper.detectSizePattern(itemData.name);

    // First check if this exact item exists (by Square ID)
    if (itemData.squareProductId) {
      const exactMatch = await this.checkForDuplicate(itemData);
      if (exactMatch.isDuplicate) {
        return exactMatch;
      }
    }

    // Check if base product exists (for variation detection)
    const existingBaseProduct = await prisma.product.findFirst({
      where: {
        OR: [
          // Exact base name match
          { name: { equals: baseName, mode: 'insensitive' } },
          // Base name with any size suffix (for existing non-variation products)
          { name: { startsWith: baseName, mode: 'insensitive' } },
        ],
        active: true,
        category: {
          name: { contains: 'CATERING' },
        },
      },
      include: {
        variants: true,
        category: true,
      },
    });

    if (existingBaseProduct) {
      // Check if this specific size variation already exists
      if (existingBaseProduct.variants && existingBaseProduct.variants.length > 0) {
        const existingVariation = existingBaseProduct.variants.find(
          v => v.name && size && v.name.toLowerCase().includes(size.toLowerCase())
        );

        if (existingVariation) {
          return {
            isDuplicate: true,
            isVariation: true,
            baseProduct: existingBaseProduct,
            existingItem: {
              id: existingVariation.id,
              name: existingVariation.name || `${baseName} - ${size}`,
              squareProductId: existingBaseProduct.squareId,
              source: existingBaseProduct.squareId ? 'square' : 'manual',
            },
            matchType: 'exact_variation',
            confidence: 1.0,
          };
        }
      }

      // Base product exists but this size variation doesn't
      return {
        isDuplicate: false, // Not a duplicate, can add as variation
        isVariation: true,
        baseProduct: existingBaseProduct,
        matchType: 'base_product_exists',
        confidence: 0.8,
      };
    }

    // Fall back to original duplicate detection for non-variation cases
    return await this.checkForDuplicate(itemData);
  }

  /**
   * Verificar duplicados para múltiples items (batch)
   */
  static async checkForDuplicatesBatch(
    itemsData: Array<{
      name: string;
      squareProductId?: string | null;
      squareCategory?: string | null;
    }>
  ): Promise<DuplicateCheckResult[]> {
    const results: DuplicateCheckResult[] = [];

    for (const itemData of itemsData) {
      const result = await this.checkForVariationDuplicate(itemData);
      results.push(result);
    }

    return results;
  }

  /**
   * Crear item solo si no es duplicado (crea productos en lugar de catering items)
   */
  static async createIfNotDuplicate(itemData: {
    name: string;
    description?: string | null;
    price: number;
    category: string;
    squareProductId?: string | null;
    squareCategory?: string | null;
    imageUrl?: string | null;
    isVegetarian?: boolean;
    isVegan?: boolean;
    isGlutenFree?: boolean;
    servingSize?: string | null;
    isActive?: boolean;
  }): Promise<{
    created: boolean;
    item?: any;
    duplicate?: DuplicateCheckResult;
    error?: string;
  }> {
    try {
      // Verificar duplicados
      const duplicateCheck = await this.checkForDuplicate({
        name: itemData.name,
        squareProductId: itemData.squareProductId,
        squareCategory: itemData.squareCategory,
      });

      if (duplicateCheck.isDuplicate) {
        return {
          created: false,
          duplicate: duplicateCheck,
        };
      }

      // Get or create category for products table
      const categoryName = itemData.squareCategory || itemData.category;
      let category = await prisma.category.findFirst({
        where: {
          name: {
            equals: categoryName,
            mode: 'insensitive',
          },
        },
      });

      if (!category) {
        category = await prisma.category.create({
          data: {
            name: categoryName,
            description: `Category for ${categoryName} products`,
            slug: categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            order: 0,
            active: true,
          },
        });
      }

      // Create slug
      const baseSlug = itemData.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const existingSlug = await prisma.product.findFirst({
        where: { slug: baseSlug },
      });
      const slug = existingSlug ? `${baseSlug}-${Date.now()}` : baseSlug;

      // Crear el item como producto si no es duplicado
      const newItem = await prisma.product.create({
        data: {
          name: itemData.name,
          slug,
          description: itemData.description || '',
          price: itemData.price,
          squareId: itemData.squareProductId || `manual-${Date.now()}`,
          images: itemData.imageUrl ? [itemData.imageUrl] : [],
          categoryId: category.id,
          featured: false,
          active: itemData.isActive !== false, // default true
        },
      });

      return {
        created: true,
        item: newItem,
      };
    } catch (error) {
      return {
        created: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Obtener estadísticas de duplicados por categoría (solo tabla products)
   */
  static async getDuplicateStats(): Promise<{
    totalItems: number;
    byCategory: Record<
      string,
      {
        total: number;
        withSquareId: number;
        withoutSquareId: number;
        potentialDuplicates: number;
        inProductsTable: number;
        inCateringTable: number; // Always 0 - catering_items table removed
      }
    >;
  }> {
    const allProducts = await prisma.product.findMany({
      where: {
        active: true,
        category: {
          name: {
            contains: 'CATERING',
          },
        },
      },
      select: {
        id: true,
        name: true,
        squareId: true,
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    // Usar solo productos para análisis unificado
    const allItems = allProducts.map(item => ({
      id: item.id,
      name: item.name,
      squareCategory: item.category.name,
      squareProductId: item.squareId,
      source: 'products' as const,
    }));

    const byCategory: Record<
      string,
      {
        total: number;
        withSquareId: number;
        withoutSquareId: number;
        potentialDuplicates: number;
        inProductsTable: number;
        inCateringTable: number;
      }
    > = {};

    // Agrupar por categoría
    allItems.forEach(item => {
      const category = item.squareCategory || 'UNKNOWN';

      if (!byCategory[category]) {
        byCategory[category] = {
          total: 0,
          withSquareId: 0,
          withoutSquareId: 0,
          potentialDuplicates: 0,
          inProductsTable: 0,
          inCateringTable: 0, // Always 0 - products-only mode
        };
      }

      byCategory[category].total++;
      byCategory[category].inProductsTable++;

      if (item.squareProductId) {
        byCategory[category].withSquareId++;
      } else {
        byCategory[category].withoutSquareId++;
      }
    });

    // Detectar potenciales duplicados por nombre normalizado
    const normalizedNames = new Map<string, string[]>();
    allItems.forEach(item => {
      const normalized = this.normalizeItemName(item.name);
      if (!normalizedNames.has(normalized)) {
        normalizedNames.set(normalized, []);
      }
      normalizedNames.get(normalized)!.push(item.squareCategory || 'UNKNOWN');
    });

    // Contar duplicados por categoría
    normalizedNames.forEach((categories, normalizedName) => {
      if (categories.length > 1) {
        categories.forEach(category => {
          if (byCategory[category]) {
            byCategory[category].potentialDuplicates++;
          }
        });
      }
    });

    return {
      totalItems: allItems.length,
      byCategory,
    };
  }
}

export default CateringDuplicateDetector;
