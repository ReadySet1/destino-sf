import { NextRequest, NextResponse } from 'next/server';
import { uploadCateringImage } from '@/lib/storage/supabase-storage';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const itemId = formData.get('itemId') as string;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided',
        },
        { status: 400 }
      );
    }

    if (!itemId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No item ID provided',
        },
        { status: 400 }
      );
    }

    const result = await uploadCateringImage(file, itemId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Image upload failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
