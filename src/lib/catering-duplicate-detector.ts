// src/lib/catering-duplicate-detector.ts
//
// 🔍 UTILIDAD PARA DETECTAR DUPLICADOS EN CATERING ITEMS
// 
// Centraliza la lógica de detección de duplicados para usar en todos los scripts de sync
// Evita que se creen items duplicados desde diferentes fuentes (Square, scripts manuales, etc.)
//
// PHASE 2 ENHANCEMENT: Now checks BOTH products and catering_items tables
// This addresses the dual storage problem identified in the fix plan where items
// are stored in both tables, causing discrepancies and duplicate detection issues.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingItem?: {
    id: string;
    name: string;
    squareProductId: string | null;
    source: 'square' | 'manual';
  };
  matchType?: 'exact_square_id' | 'exact_name' | 'normalized_name' | 'none';
  confidence: number; // 0-1, where 1 is exact match
}

export class CateringDuplicateDetector {
  
  /**
   * Normalizar nombre para comparación
   */
  static normalizeItemName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s*-\s*/g, ' ')    // "Alfajores - Classic" -> "alfajores classic"
      .replace(/[^\w\s]/g, '')     // remover puntuación
      .replace(/\s+/g, ' ')        // normalizar espacios múltiples
      .trim();
  }

  /**
   * Verificar si un item de catering ya existe (PRODUCTS_ONLY - single source of truth)
   */
  static async checkForDuplicate(itemData: {
    name: string;
    squareProductId?: string | null;
    squareCategory?: string | null;
  }): Promise<DuplicateCheckResult> {
    
    const { name, squareProductId, squareCategory } = itemData;
    
    // 1. Verificación exacta por squareProductId (máxima prioridad)
    // Check ONLY products table (single source of truth)
    if (squareProductId) {
      const existingInProducts = await prisma.product.findFirst({
        where: {
          squareId: squareProductId,
          active: true
        },
        select: {
          id: true,
          name: true,
          squareId: true
        }
      });

      if (existingInProducts) {
        return {
          isDuplicate: true,
          existingItem: {
            id: existingInProducts.id,
            name: existingInProducts.name,
            squareProductId: existingInProducts.squareId,
            source: 'square'
          },
          matchType: 'exact_square_id',
          confidence: 1.0
        };
      }
    }

    // 2. Verificación exacta por nombre (check ONLY products table)
    const existingProductByName = await prisma.product.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive'
        },
        active: true,
        // Check if it's in a catering category
        category: {
          name: {
            contains: 'CATERING'
          }
        }
      },
      select: {
        id: true,
        name: true,
        squareId: true,
        category: {
          select: {
            name: true
          }
        }
      }
    });

    if (existingProductByName) {
      return {
        isDuplicate: true,
        existingItem: {
          id: existingProductByName.id,
          name: existingProductByName.name,
          squareProductId: existingProductByName.squareId,
          source: existingProductByName.squareId ? 'square' : 'manual'
        },
        matchType: 'exact_name',
        confidence: 0.95
      };
    }

    // 3. Verificación por nombre normalizado (para detectar variaciones)
    // Check ONLY products table for normalized name matches
    const normalizedName = this.normalizeItemName(name);
    
    const allProducts = await prisma.product.findMany({
      where: {
        active: true,
        category: {
          name: {
            contains: 'CATERING'
          }
        }
      },
      select: {
        id: true,
        name: true,
        squareId: true,
        category: {
          select: {
            name: true
          }
        }
      }
    });

    // Check products table for normalized matches
    const normalizedProductMatch = allProducts.find(item => 
      this.normalizeItemName(item.name) === normalizedName
    );

    if (normalizedProductMatch) {
      return {
        isDuplicate: true,
        existingItem: {
          id: normalizedProductMatch.id,
          name: normalizedProductMatch.name,
          squareProductId: normalizedProductMatch.squareId,
          source: normalizedProductMatch.squareId ? 'square' : 'manual'
        },
        matchType: 'normalized_name',
        confidence: 0.85
      };
    }

    // 4. No se encontraron duplicados
    return {
      isDuplicate: false,
      matchType: 'none',
      confidence: 0
    };
  }

  /**
   * Verificar duplicados para múltiples items (batch)
   */
  static async checkForDuplicatesBatch(itemsData: Array<{
    name: string;
    squareProductId?: string | null;
    squareCategory?: string | null;
  }>): Promise<DuplicateCheckResult[]> {
    
    const results: DuplicateCheckResult[] = [];
    
    for (const itemData of itemsData) {
      const result = await this.checkForDuplicate(itemData);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Crear item solo si no es duplicado (PRODUCTS_ONLY - creates products instead of catering items)
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
        squareCategory: itemData.squareCategory
      });

      if (duplicateCheck.isDuplicate) {
        return {
          created: false,
          duplicate: duplicateCheck
        };
      }

      // Get or create category for products table
      const categoryName = itemData.squareCategory || itemData.category;
      let category = await prisma.category.findFirst({
        where: {
          name: {
            equals: categoryName,
            mode: 'insensitive'
          }
        }
      });

      if (!category) {
        category = await prisma.category.create({
          data: {
            name: categoryName,
            description: `Category for ${categoryName} products`,
            slug: categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            order: 0,
            active: true
          }
        });
      }

      // Create slug
      const baseSlug = itemData.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const existingSlug = await prisma.product.findFirst({
        where: { slug: baseSlug }
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
        }
      });

      return {
        created: true,
        item: newItem
      };

    } catch (error) {
      return {
        created: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Obtener estadísticas de duplicados por categoría (PRODUCTS_ONLY - single source of truth)
   */
  static async getDuplicateStats(): Promise<{
    totalItems: number;
    byCategory: Record<string, {
      total: number;
      withSquareId: number;
      withoutSquareId: number;
      potentialDuplicates: number;
      inProductsTable: number;
      inCateringTable: number; // kept for compatibility, always 0
    }>;
  }> {
    
    const allProducts = await prisma.product.findMany({
      where: { 
        active: true,
        category: {
          name: {
            contains: 'CATERING'
          }
        }
      },
      select: {
        id: true,
        name: true,
        squareId: true,
        category: {
          select: {
            name: true
          }
        }
      }
    });

    // Use only products for unified analysis
    const allItems = allProducts.map(item => ({
      id: item.id,
      name: item.name,
      squareCategory: item.category.name,
      squareProductId: item.squareId,
      source: 'products' as const
    }));

    const byCategory: Record<string, {
      total: number;
      withSquareId: number;
      withoutSquareId: number;
      potentialDuplicates: number;
      inProductsTable: number;
      inCateringTable: number;
    }> = {};

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
          inCateringTable: 0 // Always 0 in products-only mode
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
      byCategory
    };
  }
}

export default CateringDuplicateDetector;
