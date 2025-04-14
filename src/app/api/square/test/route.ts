// src/app/api/square/test/route.ts

import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function GET() {
  logger.info('Square client testing has been disabled');
  
  return NextResponse.json({
    success: false,
    message: 'Square client testing has been disabled'
  }, { status: 403 });
}