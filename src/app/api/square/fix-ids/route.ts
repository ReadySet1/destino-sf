import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { squareClient } from '@/lib/square/client';
import { logger } from '@/utils/logger';

// Comparar dos strings, ignorando diferencias de mayúsculas/minúsculas y acentos
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Calcular la similitud entre dos strings (0-1)
function stringSimilarity(a: string, b: string): number {
  const normalizedA = normalizeString(a);
  const normalizedB = normalizeString(b);
  
  if (normalizedA === normalizedB) return 1;
  if (normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA)) return 0.9;
  
  // Implementación básica de distancia de Levenshtein
  const m = normalizedA.length;
  const n = normalizedB.length;
  
  // Matriz para cálculo de distancia
  const d: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  
  for (let j = 1; j <= n; j++) {
    for (let i = 1; i <= m; i++) {
      const cost = normalizedA[i - 1] === normalizedB[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,          // eliminación
        d[i][j - 1] + 1,          // inserción
        d[i - 1][j - 1] + cost    // sustitución
      );
    }
  }
  
  // Calcular la similitud como 1 - (distancia / longitud máxima)
  const maxLength = Math.max(m, n);
  return maxLength > 0 ? 1 - d[m][n] / maxLength : 1;
}

interface SquareCatalogObject {
  id: string;
  type: string;
  item_data?: {
    name?: string;
    description?: string;
    image_ids?: string[];
    [key: string]: any;
  };
  image_data?: {
    url?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export async function GET(request: NextRequest) {
  try {
    // Umbral de similitud (0.7 = 70% similar)
    const threshold = Number(request.nextUrl.searchParams.get('threshold') || '0.7');
    // Si se debe actualizar la base de datos o solo mostrar resultados
    const dryRun = request.nextUrl.searchParams.get('dryRun') === 'true';
    
    logger.info(`Iniciando corrección de IDs de Square con umbral ${threshold}, dryRun: ${dryRun}`);
    
    // Paso 1: Obtener todos los productos de la base de datos
    const dbProducts = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        squareId: true,
        images: true
      }
    });
    
    logger.info(`Encontrados ${dbProducts.length} productos en la base de datos`);
    
    // Paso 2: Obtener todos los productos de Square
    logger.info('Obteniendo productos de Square...');
    
    const requestBody = {
      object_types: ['ITEM'],
      include_related_objects: true,
      include_deleted_objects: false
    };
    
    const catalogResponse = await squareClient.catalogApi.searchCatalogObjects(requestBody);
    const squareItems = (catalogResponse.result?.objects || []) as SquareCatalogObject[];
    const relatedObjects = (catalogResponse.result?.related_objects || []) as SquareCatalogObject[];
    
    logger.info(`Encontrados ${squareItems.length} productos en Square`);
    
    if (squareItems.length === 0) {
      return NextResponse.json({
        error: 'No se encontraron productos en Square',
        squareEndpoint: catalogResponse.result
      }, { status: 500 });
    }
    
    // Resultados
    const results = {
      total: dbProducts.length,
      matched: 0,
      updated: 0,
      noMatch: 0,
      alreadyCorrect: 0,
      details: [] as any[]
    };
    
    // Paso 3: Comparar productos y actualizar IDs
    for (const dbProduct of dbProducts) {
      let bestMatch: { item: SquareCatalogObject, similarity: number } | null = null;
      
      // Buscar la mejor coincidencia
      for (const squareItem of squareItems) {
        const squareName = squareItem.item_data?.name || '';
        if (!squareName) continue;
        
        const similarity = stringSimilarity(dbProduct.name, squareName);
        
        if (similarity >= threshold && (!bestMatch || similarity > bestMatch.similarity)) {
          bestMatch = { item: squareItem, similarity };
        }
      }
      
      // Procesar el resultado
      if (bestMatch) {
        results.matched++;
        const newId = bestMatch.item.id;
        const oldId = dbProduct.squareId;
        
        // Verificar si el ID ya es correcto
        if (oldId === newId) {
          results.alreadyCorrect++;
          results.details.push({
            id: dbProduct.id,
            name: dbProduct.name,
            squareId: oldId,
            status: 'already_correct',
            squareName: bestMatch.item.item_data?.name,
            similarity: bestMatch.similarity
          });
        } 
        // Si es diferente, actualizar
        else {
          // Obtener información de imágenes
          const imageIds = bestMatch.item.item_data?.image_ids || [];
          const hasImages = imageIds.length > 0;
          
          if (!dryRun) {
            try {
              await prisma.product.update({
                where: { id: dbProduct.id },
                data: { 
                  squareId: newId,
                  updatedAt: new Date()
                }
              });
              results.updated++;
            } catch (error) {
              logger.error(`Error al actualizar producto ${dbProduct.id}:`, error);
            }
          } else {
            // En modo dryRun solo contamos como si se hubiera actualizado
            results.updated++;
          }
          
          results.details.push({
            id: dbProduct.id,
            name: dbProduct.name,
            oldSquareId: oldId,
            newSquareId: newId,
            status: 'updated',
            squareName: bestMatch.item.item_data?.name,
            similarity: bestMatch.similarity,
            hasImages,
            imageCount: imageIds.length
          });
        }
      } else {
        results.noMatch++;
        results.details.push({
          id: dbProduct.id,
          name: dbProduct.name,
          squareId: dbProduct.squareId,
          status: 'no_match'
        });
      }
    }
    
    // Paso 4: Devolver resultados
    return NextResponse.json({
      dryRun,
      threshold,
      results
    });
    
  } catch (error) {
    logger.error('Error al corregir IDs de Square:', error);
    return NextResponse.json(
      { 
        error: 'Error al corregir IDs de Square', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 