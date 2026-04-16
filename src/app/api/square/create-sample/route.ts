import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createSquareItem, SquareWriteError } from '@/lib/square/catalog-write';
import { isWritebackEnabled } from '@/lib/square/write-queue';
import { logger } from '@/utils/logger';

export async function POST(request: Request) {
  if (!isWritebackEnabled()) {
    return NextResponse.json(
      { success: false, error: 'Square writeback is disabled (set ENABLE_SQUARE_WRITEBACK=true)' },
      { status: 409 }
    );
  }

  try {
    const {
      name = 'Sample Product',
      description = 'Created via API',
      price = 19.99,
    } = await request.json().catch(() => ({}));

    logger.info(`Creating sample Square product: ${name}`);

    const result = await createSquareItem({
      idempotencyKey: randomUUID(),
      name,
      description,
      priceDollars: price,
    });

    return NextResponse.json({
      success: true,
      message: 'Sample product created in Square',
      squareId: result.squareId,
      squareVariationId: result.squareVariationId,
      version: result.version.toString(),
    });
  } catch (error) {
    logger.error('Error creating sample Square product:', error);
    const status = error instanceof SquareWriteError && error.status ? error.status : 500;
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create sample product in Square',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status }
    );
  }
}
