import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';

export async function GET(request: NextRequest) {
  try {
    // Get all products with Square IDs
    const products = await prisma.product.findMany({
      where: {
        squareId: {
          not: ''
        }
      },
      select: {
        id: true,
        name: true,
        squareId: true
      }
    });
    
    logger.info(`Found ${products.length} products with Square IDs to reset`);
    
    // Reset each product's Square ID to a unique empty string
    let resetCount = 0;
    let errorCount = 0;
    
    for (const product of products) {
      try {
        // Generate a unique string value for each product to avoid constraint violations
        // Using the product.id as the value ensures uniqueness
        await prisma.product.update({
          where: { id: product.id },
          data: {
            squareId: `reset-${product.id}`,
            updatedAt: new Date()
          }
        });
        
        resetCount++;
      } catch (productError) {
        logger.error(`Error resetting product ${product.id}:`, productError);
        errorCount++;
      }
    }
    
    logger.info(`Reset complete. Successfully reset: ${resetCount}, errors: ${errorCount}`);
    
    return NextResponse.json({
      success: true,
      total: products.length,
      reset: resetCount,
      errors: errorCount
    });
  } catch (error) {
    logger.error('Error in reset process:', error);
    return NextResponse.json(
      { error: 'Failed to reset Square IDs', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 