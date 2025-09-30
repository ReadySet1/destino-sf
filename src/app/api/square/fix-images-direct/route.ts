import { NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db-unified';
import { logger } from '@/utils/logger';

interface SquareCatalogObject {
  id: string;
  type: string;
  item_data?: {
    name?: string;
    image_ids?: string[];
    [key: string]: any;
  };
  image_data?: {
    url?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export async function POST() {
  try {
    // Usar directamente las variables de entorno
    const useSandbox = process.env.USE_SQUARE_SANDBOX === 'true';
    const accessToken = useSandbox
      ? process.env.SQUARE_SANDBOX_TOKEN
      : process.env.SQUARE_ACCESS_TOKEN;

    // API host es el mismo para sandbox y production, diferenciado por el token
    const apiHost = 'connect.squareup.com';

    logger.info(`Actualizando imágenes de productos desde Square (${apiHost})`);

    // 1. Obtener todos los productos de la base de datos
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        squareId: true,
        images: true,
      },
    });

    logger.info(`Encontrados ${products.length} productos en base de datos`);

    // 2. Consultar el catálogo de Square para obtener imágenes
    const searchBody = JSON.stringify({
      object_types: ['ITEM', 'IMAGE'],
      include_related_objects: true,
      include_deleted_objects: false,
    });

    const searchResponse = await fetch(`https://${apiHost}/v2/catalog/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Square-Version': '2025-05-21',
        'Content-Type': 'application/json',
      },
      body: searchBody,
    });

    if (!searchResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Error en la API de búsqueda de Square: ${searchResponse.status}`,
          details: await searchResponse.text(),
        },
        { status: 500 }
      );
    }

    const searchData = await searchResponse.json();

    // Extraer items y objetos relacionados
    const items = (searchData.objects || []) as SquareCatalogObject[];
    const relatedObjects = (searchData.related_objects || []) as SquareCatalogObject[];

    // Crear un mapa de IDs de imagen a URLs
    const imageMap = new Map<string, string>();

    for (const obj of relatedObjects) {
      if ((obj as any).type === 'IMAGE' && (obj as any).image_data?.url) {
        imageMap.set(obj.id, (obj as any).image_data.url);
      }
    }

    logger.info(`Encontrados ${items.length} productos y ${imageMap.size} imágenes en Square`);

    // 3. Actualizar productos en la base de datos con imágenes de Square
    const results = {
      total: products.length,
      updated: 0,
      noChange: 0,
      errors: 0,
      details: [] as any[],
    };

    for (const product of products) {
      // Omitir productos sin squareId
      if (!product.squareId) {
        results.noChange++;
        results.details.push({
          id: product.id,
          name: product.name,
          action: 'no_change',
          reason: 'no_square_id',
        });
        continue;
      }

      // Buscar el producto correspondiente en Square
      const squareItem = items.find(item => item.id === product.squareId);

      if (
        !squareItem ||
        !squareItem.item_data?.image_ids ||
        squareItem.item_data.image_ids.length === 0
      ) {
        results.noChange++;
        results.details.push({
          id: product.id,
          name: product.name,
          action: 'no_change',
          reason: 'no_square_images',
        });
        continue;
      }

      // Obtener URLs de imágenes del mapa
      const imageUrls: string[] = [];
      for (const imageId of squareItem.item_data.image_ids) {
        const imageUrl = imageMap.get(imageId);
        if (imageUrl) {
          imageUrls.push(imageUrl);
        }
      }

      if (imageUrls.length === 0) {
        results.noChange++;
        results.details.push({
          id: product.id,
          name: product.name,
          action: 'no_change',
          reason: 'no_image_urls',
        });
        continue;
      }

      // Actualizar el producto con las nuevas imágenes
      try {
        // Si hay cambios en imágenes, actualizarlas
        const currentImages = product.images || [];
        const isChanged = JSON.stringify(currentImages) !== JSON.stringify(imageUrls);

        if (isChanged) {
          await prisma.product.update({
            where: { id: product.id },
            data: {
              images: imageUrls,
              updatedAt: new Date(),
            },
          });

          results.updated++;
          results.details.push({
            id: product.id,
            name: product.name,
            action: 'updated',
            oldImageCount: currentImages.length,
            newImageCount: imageUrls.length,
            imageUrls,
          });
        } else {
          results.noChange++;
          results.details.push({
            id: product.id,
            name: product.name,
            action: 'no_change',
            reason: 'images_already_up_to_date',
          });
        }
      } catch (error) {
        logger.error(`Error al actualizar el producto ${product.id}:`, error);

        results.errors++;
        results.details.push({
          id: product.id,
          name: product.name,
          action: 'error',
          error: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Image refresh process completed',
      results,
    });
  } catch (error) {
    logger.error('Error al actualizar imágenes de productos:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar imágenes de productos',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
