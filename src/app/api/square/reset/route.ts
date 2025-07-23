import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';

export async function GET(request: NextRequest) {
  try {
    // Use a direct SQL query to clear all Square IDs
    const queryResult = await prisma.$queryRaw`
      UPDATE "Product" 
      SET "squareId" = '', "updatedAt" = NOW() 
      WHERE "squareId" IS NOT NULL
    `;

    logger.info('Successfully reset all Square IDs');

    // Now check how many products still have Square IDs (not empty)
    const productsWithSquareId = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) FROM "Product" WHERE "squareId" <> ''
    `;

    return NextResponse.json({
      success: true,
      message: 'All Square IDs have been reset',
      remainingWithSquareId: Number(productsWithSquareId[0].count),
    });
  } catch (error) {
    logger.error('Error resetting Square IDs:', error);
    return NextResponse.json(
      {
        error: 'Failed to reset Square IDs',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
