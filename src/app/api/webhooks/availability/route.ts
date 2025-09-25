// src/app/api/webhooks/availability/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { AvailabilityProcessor } from '@/lib/jobs/availability-processor';
import { AvailabilityQueries } from '@/lib/db/availability-queries';
import { AvailabilityEngine } from '@/lib/availability/engine';
import { prisma } from '@/lib/db-unified';
import { logger } from '@/utils/logger';
import { env } from '@/env';
import crypto from 'crypto';

interface AvailabilityWebhookPayload {
  event: 'rule.created' | 'rule.updated' | 'rule.deleted' | 'product.updated' | 'schedule.triggered';
  productId?: string;
  ruleId?: string;
  timestamp: string;
  data?: any;
}

/**
 * Webhook handler for real-time availability updates
 * Triggered by:
 * - Rule creation/modification
 * - Product updates that affect availability
 * - External systems (Square, inventory systems)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-webhook-signature');
    
    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      logger.warn('Invalid webhook signature', {
        signature,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      });
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const payload: AvailabilityWebhookPayload = JSON.parse(body);
    
    logger.info('Availability webhook received', {
      event: payload.event,
      productId: payload.productId,
      ruleId: payload.ruleId,
      timestamp: payload.timestamp
    });

    // Process webhook based on event type
    let result;
    switch (payload.event) {
      case 'rule.created':
      case 'rule.updated':
        result = await handleRuleChange(payload);
        break;
      
      case 'rule.deleted':
        result = await handleRuleDeleted(payload);
        break;
      
      case 'product.updated':
        result = await handleProductUpdated(payload);
        break;
      
      case 'schedule.triggered':
        result = await handleScheduleTriggered(payload);
        break;
      
      default:
        logger.warn('Unknown webhook event', { event: payload.event });
        return NextResponse.json(
          { error: 'Unknown event type' },
          { status: 400 }
        );
    }

    logger.info('Webhook processed successfully', {
      event: payload.event,
      result
    });

    return NextResponse.json({
      success: true,
      processed: true,
      timestamp: new Date().toISOString(),
      result
    });

  } catch (error) {
    logger.error('Webhook processing failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Verify webhook signature for security
 */
function verifyWebhookSignature(body: string, signature: string | null): boolean {
  if (!signature || !env.WEBHOOK_SECRET) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', env.WEBHOOK_SECRET)
      .update(body)
      .digest('hex');
    
    const receivedSignature = signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );
  } catch (error) {
    logger.error('Signature verification failed', { error });
    return false;
  }
}

/**
 * Handle rule creation or update
 */
async function handleRuleChange(payload: AvailabilityWebhookPayload) {
  if (!payload.productId) {
    throw new Error('Product ID is required for rule events');
  }

  try {
    // Re-evaluate the product immediately
    const rules = await AvailabilityQueries.getProductRules(payload.productId);
    const evaluation = await AvailabilityEngine.evaluateProduct(payload.productId, rules);

    // Check if product state needs to be updated
    const product = await prisma.product.findUnique({
      where: { id: payload.productId },
      select: { 
        id: true, 
        name: true, 
        isAvailable: true, 
        visibility: true, 
        isPreorder: true 
      }
    });

    if (!product) {
      throw new Error(`Product ${payload.productId} not found`);
    }

    const updates: any = {};
    let hasChanges = false;

    // Apply state changes based on evaluation
    switch (evaluation.currentState) {
      case 'AVAILABLE':
        if (!product.isAvailable || product.visibility === 'PRIVATE') {
          updates.isAvailable = true;
          updates.visibility = 'PUBLIC';
          updates.isPreorder = false;
          hasChanges = true;
        }
        break;
      
      case 'HIDDEN':
        if (product.visibility !== 'PRIVATE') {
          updates.visibility = 'PRIVATE';
          hasChanges = true;
        }
        break;
      
      case 'PRE_ORDER':
        if (!product.isPreorder) {
          updates.isPreorder = true;
          updates.isAvailable = true;
          hasChanges = true;
        }
        break;
      
      case 'VIEW_ONLY':
        if (product.isAvailable) {
          updates.isAvailable = false;
          updates.visibility = 'PUBLIC';
          hasChanges = true;
        }
        break;
    }

    if (hasChanges) {
      await prisma.product.update({
        where: { id: payload.productId },
        data: updates
      });

      logger.info('Product updated via webhook', {
        productId: payload.productId,
        productName: product.name,
        newState: evaluation.currentState,
        updates
      });
    }

    // Clear cache for this product
    await clearProductCache(payload.productId);

    return {
      productId: payload.productId,
      evaluated: true,
      updated: hasChanges,
      newState: evaluation.currentState,
      appliedRules: evaluation.appliedRules.length
    };

  } catch (error) {
    logger.error('Error handling rule change webhook', {
      productId: payload.productId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Handle rule deletion
 */
async function handleRuleDeleted(payload: AvailabilityWebhookPayload) {
  if (!payload.productId) {
    throw new Error('Product ID is required for rule deletion events');
  }

  // Re-evaluate product without the deleted rule
  return await handleRuleChange(payload);
}

/**
 * Handle product updates from external systems
 */
async function handleProductUpdated(payload: AvailabilityWebhookPayload) {
  if (!payload.productId) {
    throw new Error('Product ID is required for product update events');
  }

  try {
    // Check if the product update affects availability
    const data = payload.data || {};
    
    if (data.inventory !== undefined || data.active !== undefined || data.visibility !== undefined) {
      // Product properties that affect availability have changed
      // Re-evaluate the product
      return await handleRuleChange(payload);
    }

    // Clear cache regardless
    await clearProductCache(payload.productId);

    return {
      productId: payload.productId,
      cacheCleared: true,
      reevaluated: false
    };

  } catch (error) {
    logger.error('Error handling product update webhook', {
      productId: payload.productId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Handle scheduled triggers (from external cron systems)
 */
async function handleScheduleTriggered(payload: AvailabilityWebhookPayload) {
  try {
    // Trigger the availability processor
    const processor = new AvailabilityProcessor();
    const result = await processor.processScheduledChanges();

    return {
      triggered: true,
      processed: result.processed,
      updated: result.updated,
      errors: result.errors.length,
      duration: result.duration
    };

  } catch (error) {
    logger.error('Error handling schedule trigger webhook', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Clear product cache (placeholder for future caching implementation)
 */
async function clearProductCache(productId: string) {
  // TODO: Implement cache clearing when caching is added
  logger.info('Product cache cleared', { productId });
}

/**
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    processor: AvailabilityProcessor.getStatus()
  });
}

// Explicitly handle unsupported methods
export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
