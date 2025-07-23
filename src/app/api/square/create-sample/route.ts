import { NextResponse } from 'next/server';
import { createSquareProduct } from '@/lib/square/catalog';
import { logger } from '@/utils/logger';

export async function POST(request: Request) {
  try {
    const {
      name = 'Sample Product',
      description = 'Created via API',
      price = 19.99,
    } = await request.json().catch(() => ({}));

    logger.info(`Creating sample Square product: ${name}`);

    const productId = await createSquareProduct({
      name,
      description,
      price,
      variations: [
        { name: 'Small', price: price - 5 },
        { name: 'Medium', price: price },
        { name: 'Large', price: price + 5 },
      ],
    });

    return NextResponse.json({
      success: true,
      message: 'Sample product created in Square',
      productId,
      details: {
        name,
        description,
        price,
        variations: [
          { name: 'Small', price: price - 5 },
          { name: 'Medium', price: price },
          { name: 'Large', price: price + 5 },
        ],
      },
    });
  } catch (error) {
    logger.error('Error creating sample Square product:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create sample product in Square',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
