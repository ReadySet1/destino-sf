import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { squareClient } from '@/lib/square/client';
import { logger } from '@/utils/logger';

// Define response types
interface ResetResult {
  total: number;
  reset: number;
  valid: number;
  details: Array<{
    id: string;
    name: string;
    squareId: string | null;
    status: string;
    error?: string;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    // Step 1: Get all products with Square IDs
    const products = await prisma.product.findMany({
      where: {
        squareId: {
          not: undefined
        }
      },
      select: {
        id: true,
        name: true,
        squareId: true
      }
    });

    logger.info(`Found ${products.length} products with Square IDs`);

    const result: ResetResult = {
      total: products.length,
      reset: 0,
      valid: 0,
      details: []
    };

    // Process each product
    for (const product of products) {
      const detail: {
        id: string;
        name: string;
        squareId: string | null;
        status: string;
        error?: string;
      } = {
        id: product.id,
        name: product.name,
        squareId: product.squareId,
        status: 'checking'
      };

      // Skip products with no Square ID (shouldn't happen due to filter, but just in case)
      if (!product.squareId) {
        detail.status = 'skipped: no Square ID';
        result.details.push(detail);
        continue;
      }

      try {
        // Check if the Square ID is valid by attempting to fetch it
        if (!squareClient.catalogApi) {
          detail.status = 'error: Square catalog API not available';
          result.details.push(detail);
          continue;
        }
        
        const itemResponse = await squareClient.catalogApi.retrieveCatalogObject(product.squareId);
        const item = itemResponse.result?.object;
        
        if (item) {
          // Square ID is valid
          detail.status = 'valid';
          result.valid++;
        } else {
          // This shouldn't typically happen - if no error but also no item
          await prisma.product.update({
            where: { id: product.id },
            data: {
              squareId: undefined, // Reset to null/undefined
              updatedAt: new Date()
            }
          });
          
          detail.status = 'reset: no item found';
          result.reset++;
        }
      } catch (error) {
        // If we get an error, the ID is likely invalid
        let errorMessage = '';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else {
          errorMessage = String(error);
        }
        
        // Only reset the ID if this is a 404/NOT_FOUND error
        if (errorMessage.includes('NOT_FOUND') || errorMessage.includes('404')) {
          await prisma.product.update({
            where: { id: product.id },
            data: {
              squareId: "", // Set to empty string
              updatedAt: new Date()
            }
          });
          
          detail.status = 'reset: invalid ID';
          detail.error = errorMessage;
          result.reset++;
        } else {
          // Other types of errors could be temporary API issues, 
          // so we don't reset the ID in those cases
          detail.status = 'error: API issue';
          detail.error = errorMessage;
        }
      }

      result.details.push(detail);
    }

    // Return the results
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error in reset-invalid-ids endpoint:', error);
    return NextResponse.json({ error: 'Failed to reset invalid Square IDs' }, { status: 500 });
  }
} 