import { NextRequest, NextResponse } from 'next/server';
import { initializeStorage } from '@/scripts/init-supabase-storage';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting storage initialization...');
    
    await initializeStorage();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Storage initialized successfully'
    });
  } catch (error) {
    console.error('❌ Storage initialization failed:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 