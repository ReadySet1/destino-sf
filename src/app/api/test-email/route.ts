import { NextResponse } from 'next/server';
import { sendOrderConfirmationEmail } from '@/lib/email';

/**
 * Test endpoint for sending confirmation emails
 * Should only be enabled in development environment
 */
export async function POST(request: Request) {
  // Only allow in development environment
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Endpoint only available in development mode' }, { status: 403 });
  }
  
  try {
    const { email, paymentMethod = 'SQUARE' } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    // Create a sample order object for testing
    const testOrder = {
      id: 'test-order-' + Date.now(),
      squareOrderId: null,
      status: 'PENDING',
      total: 49.99,
      userId: null,
      customerName: 'Test Customer',
      email: email,
      phone: '555-123-4567',
      paymentMethod: paymentMethod as 'SQUARE' | 'CASH',
      paymentStatus: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Send test email
    await sendOrderConfirmationEmail(testOrder as any);
    
    return NextResponse.json({ 
      success: true, 
      message: `Test email sent to ${email} with payment method ${paymentMethod}` 
    });
    
  } catch (error) {
    console.error('Error sending test email:', error);
    
    return NextResponse.json({
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
} 