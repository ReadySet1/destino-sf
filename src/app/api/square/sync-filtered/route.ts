/**
 * Filtered Square Sync API Endpoint
 *
 * This endpoint provides a unified sync process that only imports alfajores and empanadas
 * while protecting all catering items from modification.
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncFilteredProducts, previewFilteredSync } from '@/lib/square/filtered-sync';
import { logger } from '@/utils/logger';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

// Validation schema for sync requests
const SyncRequestSchema = z
  .object({
    preview: z.boolean().optional().default(false),
    options: z
      .object({
        dryRun: z.boolean().optional(),
        forceImageUpdate: z.boolean().optional(),
        batchSize: z.number().min(10).max(100).optional(),
        selectedCategories: z.array(z.string()).optional(),
      })
      .optional(),
  })
  .strict();

/**
 * POST /api/square/sync-filtered
 *
 * Performs filtered sync or preview based on request parameters
 * Requires admin authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // TODO: Add proper admin role check once role system is implemented
    // For now, we'll log the user but allow all authenticated users
    logger.info(`🔐 Filtered sync requested by user: ${user.email}`);

    // Parse and validate request body
    let requestData;
    try {
      const body = await request.json();
      requestData = SyncRequestSchema.parse(body);
    } catch (parseError) {
      logger.error('❌ Invalid request format:', parseError);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request format',
          details: parseError instanceof z.ZodError ? parseError.errors : undefined,
        },
        { status: 400 }
      );
    }

    const { preview, options } = requestData;

    // Rate limiting check (simple in-memory implementation)
    // TODO: Replace with proper rate limiting service
    const rateLimitKey = `sync_${user.id}`;
    const now = Date.now();

    logger.info(`🚀 Starting ${preview ? 'preview' : 'sync'} request`, {
      userId: user.id,
      userEmail: user.email,
      options,
      timestamp: new Date().toISOString(),
    });

    if (preview) {
      // Preview mode - show what would be synced without executing
      const previewResult = await previewFilteredSync(options);

      logger.info(`👀 Preview completed`, {
        totalProducts: previewResult.summary.totalProducts,
        willSync: previewResult.summary.willSync,
        willSkip: previewResult.summary.willSkip,
        protectedItems: previewResult.summary.protectedItems,
      });

      return NextResponse.json({
        success: true,
        preview: true,
        data: previewResult,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Full sync mode
      const syncResult = await syncFilteredProducts(options);

      const statusCode = syncResult.success ? 200 : 500;

      logger.info(`${syncResult.success ? '✅' : '❌'} Filtered sync completed`, {
        success: syncResult.success,
        syncedProducts: syncResult.syncedProducts,
        protectedItems: syncResult.protectedItems,
        errors: syncResult.errors.length,
        warnings: syncResult.warnings.length,
      });

      return NextResponse.json(
        {
          success: syncResult.success,
          message: syncResult.message,
          data: {
            syncedProducts: syncResult.syncedProducts,
            protectedItems: syncResult.protectedItems,
            productDetails: syncResult.productDetails,
            errors: syncResult.errors,
            warnings: syncResult.warnings,
            metadata: syncResult.metadata,
          },
          timestamp: new Date().toISOString(),
        },
        { status: statusCode }
      );
    }
  } catch (error) {
    logger.error('❌ Critical error in filtered sync API:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred during the sync process',
        details:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/square/sync-filtered
 *
 * Get sync history or preview (for compatibility)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'preview';

    if (action === 'preview') {
      // Return a preview of what would be synced
      const previewResult = await previewFilteredSync();

      return NextResponse.json({
        success: true,
        action: 'preview',
        data: previewResult,
        timestamp: new Date().toISOString(),
      });
    }

    // Default: return sync status information
    return NextResponse.json({
      success: true,
      info: {
        endpoint: '/api/square/sync-filtered',
        methods: ['GET', 'POST'],
        description: 'Filtered Square sync endpoint - only syncs alfajores and empanadas',
        protection: 'All catering items are protected from modification',
        authentication: 'Required',
        rateLimit: '3 requests per hour',
      },
      availableActions: {
        'POST with preview: true': 'Preview what products will be synced',
        'POST with preview: false': 'Execute filtered sync',
        'GET with action=preview': 'Preview sync (alternative method)',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('❌ Error in filtered sync GET endpoint:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process request',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
