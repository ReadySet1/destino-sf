import crypto from 'crypto';
import { type NextApiRequest } from 'next';
import { logger } from '@/utils/logger';
import { syncSquareProducts } from './sync';
import { env } from '@/env';

// Square webhook signature verification
export function verifySquareSignature(
  signatureHeader: string | undefined,
  body: string,
): boolean {
  if (!signatureHeader || !env.SQUARE_WEBHOOK_SIGNATURE_KEY) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', env.SQUARE_WEBHOOK_SIGNATURE_KEY);
  const signature = hmac.update(body).digest('base64');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(signatureHeader),
  );
}

// Types for Square webhook events
interface SquareWebhookEvent {
  type: string;
  event_id: string;
  merchant_id: string;
  data: {
    type: string;
    id: string;
    object: {
      type: string;
      id: string;
    };
  };
}

export async function handleSquareWebhook(
  req: Pick<NextApiRequest, 'body' | 'headers'>
): Promise<{ success: boolean; message: string }> {
  try {
    const body = JSON.stringify(req.body);
    const signatureHeader = req.headers['x-square-signature'];

    // Verify webhook signature
    if (!verifySquareSignature(signatureHeader as string, body)) {
      logger.error('Invalid Square webhook signature');
      return { success: false, message: 'Invalid signature' };
    }

    const event = req.body as SquareWebhookEvent;
    logger.info(`Processing Square webhook event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'catalog.version.updated':
      case 'inventory.count.updated':
        // Trigger sync for catalog updates
        await syncSquareProducts();
        break;

      // Add more event types as needed
      default:
        logger.info(`Unhandled event type: ${event.type}`);
        return { success: true, message: 'Event type not handled' };
    }

    return { success: true, message: 'Webhook processed successfully' };
  } catch (error) {
    logger.error('Error processing Square webhook:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
} 