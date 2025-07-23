import { NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';
import { logger } from '@/utils/logger';

// Interfaz para el producto a enviar a Sanity
interface ProductData {
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  squareId: string;
  images: string[];
  featured: boolean;
}

export async function POST(request: Request) {
  try {
    const productData = (await request.json()) as ProductData;

    // Validar datos requeridos
    if (!productData.name || !productData.price) {
      return NextResponse.json(
        { success: false, error: 'Nombre y precio son requeridos' },
        { status: 400 }
      );
    }

    logger.info(`Sincronizando producto con Sanity: ${productData.name}`);

    // Primero buscar si el producto ya existe en Sanity
    const existingProduct = await client.fetch(
      `*[_type == "product" && (squareId == $squareId || name == $name)][0]`,
      {
        squareId: productData.squareId,
        name: productData.name,
      }
    );

    let sanityProductId;

    if (existingProduct) {
      // Actualizar producto existente
      logger.info(`Actualizando producto existente en Sanity: ${existingProduct._id}`);

      const updatedProduct = await client
        .patch(existingProduct._id)
        .set({
          name: productData.name,
          description: productData.description || '',
          price: productData.price,
          squareId: productData.squareId,
          featured: productData.featured || false,
          images:
            productData.images?.map(url => ({
              _type: 'image',
              url,
            })) || [],
        })
        .commit();

      sanityProductId = updatedProduct._id;
    } else {
      // Crear un nuevo producto
      logger.info(`Creando nuevo producto en Sanity: ${productData.name}`);

      // Crear un slug a partir del nombre
      const slug = productData.name
        .toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, '-');

      const newProduct = await client.create({
        _type: 'product',
        name: productData.name,
        description: productData.description || '',
        price: productData.price,
        slug: {
          current: slug,
        },
        squareId: productData.squareId,
        featured: productData.featured || false,
        images:
          productData.images?.map(url => ({
            _type: 'image',
            url,
          })) || [],
      });

      sanityProductId = newProduct._id;
    }

    return NextResponse.json({
      success: true,
      message: `Producto sincronizado con Sanity: ${productData.name}`,
      sanityId: sanityProductId,
    });
  } catch (error) {
    logger.error('Error sincronizando producto con Sanity:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al sincronizar con Sanity',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

// Solo permitir POST
export const GET = async () => {
  return NextResponse.json({ error: 'Método no permitido' }, { status: 405 });
};
