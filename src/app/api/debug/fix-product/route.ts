import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { squareClient } from '@/lib/square/client';
import { logger } from '@/utils/logger';

export async function GET(request: NextRequest) {
  // Get product ID from query param
  const searchParams = request.nextUrl.searchParams;
  const productId = searchParams.get('id');
  const squareId = searchParams.get('squareId');
  
  if (!productId && !squareId) {
    return NextResponse.json({ error: 'Missing id or squareId parameter' }, { status: 400 });
  }
  
  try {
    // Find the product
    const product = await prisma.product.findFirst({
      where: productId 
        ? { id: productId } 
        : squareId ? { squareId } : undefined
    });
    
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    logger.info(`Found product: ${product.name} (${product.id})`);
    
    // Fetch the Square catalog item
    if (!squareClient.catalogApi) {
      return NextResponse.json({ 
        error: 'Square catalog API not available',
        product
      }, { status: 500 });
    }
    
    const catalogResponse = await squareClient.catalogApi.retrieveCatalogObject(product.squareId);
    const item = catalogResponse.result?.object;
    
    if (!item || !item.item_data) {
      return NextResponse.json({ 
        error: 'Failed to retrieve catalog item',
        product
      }, { status: 500 });
    }
    
    // Get image IDs
    const imageIds = item.item_data.image_ids || [];
    if (imageIds.length === 0) {
      return NextResponse.json({ 
        product,
        message: 'No image IDs found for this product',
        catalogItem: item
      });
    }
    
    // Fetch images
    const imageUrls: string[] = [];
    
    for (const imageId of imageIds) {
      try {
        if (!squareClient.catalogApi) {
          logger.error('Square catalog API not available for image fetch');
          continue;
        }
        
        const imageResponse = await squareClient.catalogApi.retrieveCatalogObject(imageId);
        const imageObject = imageResponse.result?.object;
        
        if (imageObject && imageObject.image_data && imageObject.image_data.url) {
          const imageUrl = imageObject.image_data.url;
          // Add cache busting
          const cacheBuster = `t=${Date.now()}`;
          const cacheBustedUrl = `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}${cacheBuster}`;
          imageUrls.push(cacheBustedUrl);
        }
      } catch (error) {
        logger.error(`Error fetching image ${imageId}:`, error);
      }
    }
    
    // Update the product
    const updatedProduct = await prisma.product.update({
      where: { id: product.id },
      data: { 
        images: imageUrls,
        slug: product.slug || createSlug(product.name)
      }
    });
    
    return NextResponse.json({
      success: true,
      product: updatedProduct,
      imageIds,
      imageUrls,
      catalogItem: item
    });
  } catch (error) {
    logger.error('Error fixing product:', error);
    return NextResponse.json({ 
      error: 'Failed to fix product',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Helper function to create a slug
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove consecutive hyphens
    .trim();
} 