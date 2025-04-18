import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { SquareClient } from 'square';

// Initialize Square client
const square = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN || '',
  environment: process.env.NODE_ENV === 'development' ? 'sandbox' : 'production'
});

// Verify Square webhook signature
function verifySquareSignature(
  signatureHeader: string,
  webhookUrl: string,
  requestBody: string
): boolean {
  try {
    const signatureParts = signatureHeader.split(',');
    const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

    if (!signatureKey) {
      console.error('Square webhook signature key not configured');
      return false;
    }

    // Get the timestamp and signature from the header
    const timestamp = signatureParts[0].split('t=')[1];
    const signature = signatureParts[1].split('v1=')[1];

    // Generate the expected signature
    const signatureString = `${timestamp},${webhookUrl},${requestBody}`;
    const hmac = crypto.createHmac('sha256', signatureKey);
    const expectedSignature = hmac.update(signatureString).digest('hex');

    return signature === expectedSignature;
  } catch (error) {
    console.error('Error verifying Square webhook signature:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('square-signature');
    const webhookUrl = new URL(request.url).toString();

    // Verify webhook signature
    if (!signature || !verifySquareSignature(signature, webhookUrl, body)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const event = JSON.parse(body);
    const { type, data } = event;

    // Handle different webhook event types
    switch (type) {
      case 'payment.created':
        await handlePaymentCreated(data);
        break;
      case 'payment.updated':
        await handlePaymentUpdated(data);
        break;
      case 'order.created':
        await handleOrderCreated(data);
        break;
      case 'order.updated':
        await handleOrderUpdated(data);
        break;
      default:
        console.log('Unhandled webhook event type:', type);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Webhook event handlers
async function handlePaymentCreated(data: any) {
  const { payment } = data.object;
  try {
    // Get the order details
    const response = await square.orders.get({
      orderId: payment.orderId
    });
    
    if (!response.order) {
      throw new Error('Order not found');
    }
    
    // Update order status in your database
    // TODO: Implement your database update logic here
    
    console.log('Payment created:', {
      orderId: response.order.id,
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amountMoney,
    });
  } catch (error) {
    console.error('Error handling payment.created:', error);
  }
}

async function handlePaymentUpdated(data: any) {
  const { payment } = data.object;
  try {
    // Handle payment status updates
    switch (payment.status) {
      case 'COMPLETED':
        // Payment was successful
        // TODO: Update order status in your database
        // TODO: Send confirmation email to customer
        break;
      case 'FAILED':
        // Payment failed
        // TODO: Update order status and notify customer
        break;
      default:
        console.log('Unhandled payment status:', payment.status);
    }
  } catch (error) {
    console.error('Error handling payment.updated:', error);
  }
}

async function handleOrderCreated(data: any) {
  const { order } = data.object;
  try {
    // Process new order
    // TODO: Implement your order processing logic
    console.log('Order created:', {
      orderId: order.id,
      status: order.status,
      totalMoney: order.totalMoney,
    });
  } catch (error) {
    console.error('Error handling order.created:', error);
  }
}

async function handleOrderUpdated(data: any) {
  const { order } = data.object;
  try {
    // Handle order status updates
    // TODO: Implement your order update logic
    console.log('Order updated:', {
      orderId: order.id,
      status: order.status,
      totalMoney: order.totalMoney,
    });
  } catch (error) {
    console.error('Error handling order.updated:', error);
  }
} 