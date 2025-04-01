import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function GET(request: NextRequest) {
  try {
    const path = request.nextUrl.searchParams.get('path');
    const tag = request.nextUrl.searchParams.get('tag');
    
    if (!path && !tag) {
      return NextResponse.json(
        { message: 'Missing path or tag parameter' },
        { status: 400 }
      );
    }

    if (path) {
      // Revalidate the specific path
      revalidatePath(path, 'page');
      
      // If it's a dynamic route, also revalidate the layout
      if (path.includes('[')) {
        const basePath = path.split('/').slice(0, -1).join('/');
        revalidatePath(basePath, 'layout');
      }
    }

    if (tag) {
      // Revalidate by tag
      revalidateTag(tag);
    }
    
    return NextResponse.json(
      { 
        revalidated: true, 
        message: `Revalidated ${path ? `path: ${path}` : ''} ${tag ? `tag: ${tag}` : ''}`.trim() 
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Revalidation error:', err);
    return NextResponse.json(
      { message: 'Error revalidating' },
      { status: 500 }
    );
  }
} 