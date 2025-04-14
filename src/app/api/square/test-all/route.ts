import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function GET() {
  logger.info('Square API testing has been disabled');
  
  return NextResponse.json({
    success: false,
    message: 'Square API testing has been disabled'
  }, { status: 403 });
} 