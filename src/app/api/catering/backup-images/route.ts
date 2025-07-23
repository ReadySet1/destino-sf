import { NextRequest, NextResponse } from 'next/server';
import { createCateringImageBackup } from '@/lib/catering-image-protection';

export async function POST(request: NextRequest) {
  try {
    const backup = await createCateringImageBackup();

    return NextResponse.json({
      success: true,
      backup,
      count: Object.keys(backup).length,
    });
  } catch (error) {
    console.error('Error creating catering image backup:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        backup: {},
      },
      { status: 500 }
    );
  }
}
