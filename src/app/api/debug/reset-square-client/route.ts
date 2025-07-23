import { NextResponse } from 'next/server';
import { resetSquareClient } from '@/lib/square/client';

export async function POST() {
  try {
    console.log('🔄 Force resetting Square client singleton...');
    resetSquareClient();

    // Also clear any require cache for the client module
    delete require.cache[require.resolve('@/lib/square/client')];

    console.log('✅ Square client reset complete');

    return NextResponse.json({
      success: true,
      message: 'Square client singleton has been reset',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error resetting Square client:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
