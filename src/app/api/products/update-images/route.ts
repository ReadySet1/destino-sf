import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db-unified';
import { revalidateTag } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    const { productId, images } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Try to find the product first
    const existingProduct = await prisma.product.findFirst({
      where: {
        OR: [{ squareId: productId }, { id: productId }],
      },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Update the product's images in Prisma
    const updatedProduct = await prisma.product.update({
      where: {
        id: existingProduct.id,
      },
      data: {
        images: images || [], // Ensure we set an empty array if no images
      },
    });

    // Force revalidation of all product-related pages
    revalidateTag('products');

    return NextResponse.json(
      {
        success: true,
        product: updatedProduct,
        message: 'Product images updated and cache cleared',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating product images:', error);
    return NextResponse.json({ error: 'Failed to update product images' }, { status: 500 });
  }
}
