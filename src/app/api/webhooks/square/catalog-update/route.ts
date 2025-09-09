import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma, withRetry } from '@/lib/db-unified';
import { z } from 'zod';

const WebhookSchema = z.object({
  merchant_id: z.string(),
  type: z.enum(['catalog.version.updated']),
  event_id: z.string(),
  created_at: z.string(),
  data: z.object({
    type: z.string(),
    id: z.string(),
    object: z.object({
      catalog_object: z.any(),
    }),
  }),
});

function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  const expectedSignature = hmac.digest('base64');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-square-signature');
  
  // Verify webhook signature
  if (!verifyWebhookSignature(
    body,
    signature,
    process.env.SQUARE_WEBHOOK_SECRET!
  )) {
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 401 }
    );
  }
  
  try {
    const event = WebhookSchema.parse(JSON.parse(body));
    
    // Check if the item belongs to our target categories
    const catalogObject = event.data.object.catalog_object;
    if (catalogObject?.type !== 'ITEM') {
      return NextResponse.json({ message: 'Not an item update' });
    }
    
    const categories = catalogObject.item_data?.categories || [];
    const isRelevant = categories.some((cat: any) => 
      ['EMPANADAS', 'ALFAJORES'].includes(cat.name?.toUpperCase())
    );
    
    if (!isRelevant) {
      return NextResponse.json({ message: 'Item not in target categories' });
    }
    
    // Trigger a partial sync for just this item
    console.log(`Webhook received for item: ${catalogObject.id}`);
    
    // You could implement a partial sync here or queue it for processing
    // For now, we'll just log it
    await prisma.syncLog.create({
      data: {
        syncType: 'WEBHOOK_UPDATE',
        status: 'COMPLETED',
        itemsSynced: 1,
        metadata: {
          itemId: catalogObject.id,
          itemName: catalogObject.item_data?.name,
          eventId: event.event_id,
        },
      },
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
