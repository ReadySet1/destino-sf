import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { squareClient } from '@/lib/square/client';
import { logger } from '@/utils/logger';
import { Prisma } from '@prisma/client';

// Define interfaces for Square objects
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

export async function GET(request: NextRequest) {
  try {
    // Get product name from query param
    const name = request.nextUrl.searchParams.get('name');
    const id = request.nextUrl.searchParams.get('id');
    
    if (!name && !id) {
      return NextResponse.json({ error: 'Missing name or id parameter' }, { status: 400 });
    }
    
    // Find the product in our database
    let whereClause: Prisma.ProductWhereInput;
    
    if (id) {
      whereClause = { id };
    } else if (name) {
      whereClause = { 
        name: { 
          contains: name,
          mode: 'insensitive' as Prisma.QueryMode
        } 
      };
    } else {
      // This should never happen due to the check above, but TypeScript needs it
      return NextResponse.json({ error: 'Missing name or id parameter' }, { status: 400 });
    }
    
    const product = await prisma.product.findFirst({
      where: whereClause
    });
    
    if (!product) {
      return NextResponse.json({ error: 'Product not found in database' }, { status: 404 });
    }
    
    logger.info(`Found product in database: ${product.name} (${product.id})`);
    
    // Search Square catalog for matching items
    logger.info(`Searching Square catalog for: ${product.name}`);
    
    const searchRequest = {
      object_types: ['ITEM'],
      query: {
        exact_query: {
          attribute_name: 'name',
          attribute_value: product.name
        }
      },
      include_related_objects: true
    };
    
    if (!squareClient.catalogApi) {
      return NextResponse.json({ 
        error: 'Square catalog API not available',
        product
      }, { status: 500 });
    }
    
    const searchResponse = await squareClient.catalogApi.searchCatalogObjects(searchRequest);
    
    const items = (searchResponse.result?.objects || []) as SquareCatalogObject[];
    const relatedObjects = (searchResponse.result?.related_objects || []) as SquareCatalogObject[];
    
    if (items.length === 0) {
      return NextResponse.json({ 
        error: 'No matching items found in Square catalog',
        product
      }, { status: 404 });
    }
    
    logger.info(`Found ${items.length} potential matches in Square catalog`);
    
    // Find the best match by comparing names
    const bestMatch = items.find((item: SquareCatalogObject) => 
      item.item_data?.name?.toLowerCase() === product.name.toLowerCase()
    ) || items[0]; // Default to first result if no exact match
    
    logger.info(`Best match: ${bestMatch.item_data?.name} (${bestMatch.id})`);
    
    // Extract image URLs from the best match
    const imageUrls: string[] = [];
    const imageIds = bestMatch.item_data?.image_ids || [];
    
    if (imageIds.length > 0) {
      logger.info(`Found ${imageIds.length} image IDs for best match`);
      
      // Get images for each ID
      for (const imageId of imageIds) {
        const imageObject = relatedObjects.find((obj: SquareCatalogObject) => 
          obj.id === imageId && obj.type === 'IMAGE'
        );
        
        if (imageObject && imageObject.image_data?.url) {
          const imageUrl = imageObject.image_data.url;
          
          // Add cache busting parameter
          const separator = imageUrl.includes('?') ? '&' : '?';
          const cacheBustedUrl = `${imageUrl}${separator}t=${Date.now()}`;
          
          imageUrls.push(cacheBustedUrl);
          logger.info(`Found image URL: ${cacheBustedUrl}`);
        } else {
          // Try to retrieve image directly
          try {
            logger.info(`Image not found in related objects, retrieving image ${imageId} directly`);
            
            if (!squareClient.catalogApi) {
              logger.error('Square catalog API not available for image retrieval');
              continue;
            }
            
            const imageResponse = await squareClient.catalogApi.retrieveCatalogObject(imageId);
            const imageData = imageResponse.result?.object as SquareCatalogObject;
            
            if (imageData?.image_data?.url) {
              const imageUrl = imageData.image_data.url;
              const separator = imageUrl.includes('?') ? '&' : '?';
              const cacheBustedUrl = `${imageUrl}${separator}t=${Date.now()}`;
              
              imageUrls.push(cacheBustedUrl);
              logger.info(`Retrieved image URL directly: ${cacheBustedUrl}`);
            }
          } catch (error) {
            logger.error(`Error retrieving image ${imageId}:`, error);
          }
        }
      }
    } else {
      logger.info('No image IDs found for best match');
    }
    
    // Update the product in our database with the new Square ID and images
    const updatedProduct = await prisma.product.update({
      where: { id: product.id },
      data: {
        squareId: bestMatch.id,
        images: imageUrls,
        updatedAt: new Date()
      }
    });
    
    logger.info(`Updated product ${product.name} with Square ID ${bestMatch.id} and ${imageUrls.length} images`);
    
    return NextResponse.json({
      success: true,
      product: updatedProduct,
      squareMatch: {
        id: bestMatch.id,
        name: bestMatch.item_data?.name,
        imageIds,
        imageUrls
      }
    });
  } catch (error) {
    logger.error('Error matching product:', error);
    return NextResponse.json({ 
      error: 'Failed to match product',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 