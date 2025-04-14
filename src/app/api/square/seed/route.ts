// src/app/api/square/seed/route.ts

import { NextResponse } from 'next/server';
import { createTestProducts } from '@/lib/square/seed';
import { logger } from '@/utils/logger';

export async function POST() {
  try {
    logger.info('Starting Square seed process');
    const result = await createTestProducts();
    
    return NextResponse.json({
      success: true,
      message: 'Successfully created test products in Square',
      result
    });
  } catch (error) {
    logger.error('Error in Square seed API route:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create test products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      message: 'Use POST method to create test products',
      instructions: 'Send a POST request to this endpoint to create sample products in Square Sandbox'
    }
  );
}