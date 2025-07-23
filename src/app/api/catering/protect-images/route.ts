import { NextRequest, NextResponse } from 'next/server';
import {
  protectCateringImages,
  restoreCateringImagesFromBackup,
} from '@/lib/catering-image-protection';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { backup } = body;

    let result;

    if (backup && Object.keys(backup).length > 0) {
      // If we have a backup, restore from it
      result = await restoreCateringImagesFromBackup(backup);
    } else {
      // Otherwise, use the general protection function
      result = await protectCateringImages();
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error protecting catering images:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        protected: 0,
        skipped: 0,
        errors: 1,
      },
      { status: 500 }
    );
  }
}
