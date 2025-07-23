import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function POST() {
  logger.info('Test product creation has been disabled');

  return NextResponse.json(
    {
      success: false,
      message: 'Test product creation has been disabled',
    },
    { status: 403 }
  );
}
