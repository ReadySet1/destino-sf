// src/lib/catering-duplicate-detector.ts
//
// 🔍 UTILIDAD PARA DETECTAR DUPLICADOS EN CATERING ITEMS
// 
// Centraliza la lógica de detección de duplicados para usar en todos los scripts de sync
// Evita que se creen items duplicados desde diferentes fuentes (Square, scripts manuales, etc.)

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
   * Verificar si un item de catering ya existe
   */
  static async checkForDuplicate(itemData: {
    name: string;
    squareProductId?: string | null;
    squareCategory?: string | null;
  }): Promise<DuplicateCheckResult> {
    
    const { name, squareProductId, squareCategory } = itemData;
    
    // 1. Verificación exacta por squareProductId (máxima prioridad)
    if (squareProductId) {
      const existingBySquareId = await prisma.cateringItem.findFirst({
        where: {
          squareProductId: squareProductId,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          squareProductId: true
        }
      });

      if (existingBySquareId) {
        return {
          isDuplicate: true,
          existingItem: {
            id: existingBySquareId.id,
            name: existingBySquareId.name,
            squareProductId: existingBySquareId.squareProductId,
            source: 'square'
          },
          matchType: 'exact_square_id',
          confidence: 1.0
        };
      }
    }

    // 2. Verificación exacta por nombre
    const existingByExactName = await prisma.cateringItem.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive'
        },
        isActive: true,
        // Opcionalmente filtrar por categoría si se proporciona
        ...(squareCategory && { squareCategory })
      },
      select: {
        id: true,
        name: true,
        squareProductId: true
      }
    });

    if (existingByExactName) {
      return {
        isDuplicate: true,
        existingItem: {
          id: existingByExactName.id,
          name: existingByExactName.name,
          squareProductId: existingByExactName.squareProductId,
          source: existingByExactName.squareProductId ? 'square' : 'manual'
        },
        matchType: 'exact_name',
        confidence: 0.95
      };
    }

    // 3. Verificación por nombre normalizado (para detectar variaciones)
    const normalizedName = this.normalizeItemName(name);
    
    const allItems = await prisma.cateringItem.findMany({
      where: {
        isActive: true,
        // Opcionalmente filtrar por categoría si se proporciona
        ...(squareCategory && { squareCategory })
      },
      select: {
        id: true,
        name: true,
        squareProductId: true
      }
    });

    // Buscar coincidencias por nombre normalizado
    const normalizedMatch = allItems.find(item => 
      this.normalizeItemName(item.name) === normalizedName
    );

    if (normalizedMatch) {
      return {
        isDuplicate: true,
        existingItem: {
          id: normalizedMatch.id,
          name: normalizedMatch.name,
          squareProductId: normalizedMatch.squareProductId,
          source: normalizedMatch.squareProductId ? 'square' : 'manual'
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
   * Crear item solo si no es duplicado
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

      // Crear el item si no es duplicado
      const newItem = await prisma.cateringItem.create({
        data: {
          name: itemData.name,
          description: itemData.description || '',
          price: itemData.price,
          category: itemData.category as any,
          squareProductId: itemData.squareProductId || null,
          squareCategory: itemData.squareCategory || null,
          imageUrl: itemData.imageUrl || null,
          isVegetarian: itemData.isVegetarian || false,
          isVegan: itemData.isVegan || false,
          isGlutenFree: itemData.isGlutenFree || false,
          servingSize: itemData.servingSize || null,
          isActive: itemData.isActive !== false, // default true
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
   * Obtener estadísticas de duplicados por categoría
   */
  static async getDuplicateStats(): Promise<{
    totalItems: number;
    byCategory: Record<string, {
      total: number;
      withSquareId: number;
      withoutSquareId: number;
      potentialDuplicates: number;
    }>;
  }> {
    
    const allItems = await prisma.cateringItem.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        squareCategory: true,
        squareProductId: true
      }
    });

    const byCategory: Record<string, {
      total: number;
      withSquareId: number;
      withoutSquareId: number;
      potentialDuplicates: number;
    }> = {};

    // Agrupar por categoría
    allItems.forEach(item => {
      const category = item.squareCategory || 'UNKNOWN';
      
      if (!byCategory[category]) {
        byCategory[category] = {
          total: 0,
          withSquareId: 0,
          withoutSquareId: 0,
          potentialDuplicates: 0
        };
      }

      byCategory[category].total++;
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
