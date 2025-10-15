import crypto from 'crypto';
import { type NextApiRequest } from 'next';
import { logger } from '@/utils/logger';
import { syncSquareProducts } from './sync';
import { env } from '@/env';
import { prisma } from '@/lib/db-unified';
import { squareClient } from './client';

// Map Square order state to Prisma OrderStatus
function mapSquareOrderStatus(
  state: string
): 'PENDING' | 'PROCESSING' | 'READY' | 'COMPLETED' | 'CANCELLED' {
  switch (state?.toUpperCase()) {
    case 'OPEN':
      return 'PENDING'; // FIXED: OPEN means "awaiting payment", not "processing"
    case 'COMPLETED':
      return 'COMPLETED';
    case 'CANCELED':
      return 'CANCELLED';
    case 'DRAFT':
      return 'PENDING';
    default:
      return 'PENDING';
  }
}

// Map Square payment status to Prisma PaymentStatus
function mapSquarePaymentStatus(status: string): 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' {
  switch (status) {
    case 'APPROVED':
    case 'COMPLETED':
    case 'CAPTURED':
      return 'PAID';
    case 'FAILED':
      return 'FAILED';
    case 'REFUNDED':
      return 'REFUNDED';
    default:
      return 'PENDING';
  }
}

// --- Add mapping for fulfillment type and state to status ---
function mapSquareFulfillmentToStatus(
  fulfillmentType: string,
  squareState: string
):
  | 'PENDING'
  | 'PROCESSING'
  | 'READY'
  | 'SHIPPING'
  | 'OUT FOR DELIVERY'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED' {
  switch (fulfillmentType) {
    case 'pickup':
      if (squareState === 'PROPOSED' || squareState === 'RESERVED' || squareState === 'PREPARED')
        return 'READY';
      if (squareState === 'COMPLETED') return 'COMPLETED';
      if (squareState === 'CANCELED') return 'CANCELLED';
      return 'PROCESSING';
    case 'delivery':
    case 'local_delivery':
      if (squareState === 'PROPOSED' || squareState === 'RESERVED') return 'OUT FOR DELIVERY';
      if (squareState === 'COMPLETED') return 'DELIVERED';
      if (squareState === 'CANCELED') return 'CANCELLED';
      return 'PROCESSING';
    case 'shipping':
    case 'nationwide_shipping':
      if (squareState === 'PROPOSED' || squareState === 'RESERVED') return 'SHIPPING';
      if (squareState === 'COMPLETED') return 'DELIVERED';
      if (squareState === 'CANCELED') return 'CANCELLED';
      return 'PROCESSING';
    default:
      return 'PROCESSING';
  }
}

// ❌ DEPRECATED: Square webhook signature verification moved to webhook-validator.ts
// Use validateWebhookSignature from @/lib/square/webhook-validator instead
// This function had issues with URL construction and environment variable handling
//
// @deprecated Use validateWebhookSignature from @/lib/square/webhook-validator
export function verifySquareSignature(signatureHeader: string | undefined, body: string): boolean {
  throw new Error(
    '❌ DEPRECATED: Use validateWebhookSignature from @/lib/square/webhook-validator instead. This function had signature validation issues.'
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

// ❌ DEPRECATED: Square webhook handling moved to /src/app/api/webhooks/square/route.ts
// @deprecated Use the webhook endpoint at /api/webhooks/square instead
export async function handleSquareWebhook(
  req: Pick<NextApiRequest, 'body' | 'headers'>
): Promise<{ success: boolean; message: string }> {
  throw new Error(
    '❌ DEPRECATED: Use the webhook endpoint at /api/webhooks/square instead. This function used broken signature validation.'
  );
}
