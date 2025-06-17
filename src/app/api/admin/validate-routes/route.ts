import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

interface RouteValidation {
  path: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  issues?: string[];
  recommendations?: string[];
}

interface ValidationReport {
  summary: {
    total: number;
    healthy: number;
    warnings: number;
    errors: number;
  };
  routes: RouteValidation[];
  criticalIssues: string[];
  productionReadiness: 'ready' | 'needs_attention' | 'not_ready';
}

export async function GET() {
  try {
    logger.info('🔍 Starting comprehensive route validation...');
    
    const validations: RouteValidation[] = [];
    const criticalIssues: string[] = [];

    // Validate core API routes
    await validateSquareRoutes(validations, criticalIssues);
    await validateProductRoutes(validations, criticalIssues);
    await validateWebhookRoutes(validations, criticalIssues);
    await validateOrderRoutes(validations, criticalIssues);
    await validateCateringRoutes(validations, criticalIssues);
    await validateAdminRoutes(validations, criticalIssues);

    // Calculate summary
    const summary = {
      total: validations.length,
      healthy: validations.filter(v => v.status === 'healthy').length,
      warnings: validations.filter(v => v.status === 'warning').length,
      errors: validations.filter(v => v.status === 'error').length
    };

    // Determine production readiness
    let productionReadiness: 'ready' | 'needs_attention' | 'not_ready' = 'ready';
    if (summary.errors > 0 || criticalIssues.length > 0) {
      productionReadiness = 'not_ready';
    } else if (summary.warnings > 0) {
      productionReadiness = 'needs_attention';
    }

    const report: ValidationReport = {
      summary,
      routes: validations,
      criticalIssues,
      productionReadiness
    };

    logger.info('✅ Route validation completed', {
      productionReadiness,
      totalRoutes: summary.total,
      errors: summary.errors,
      warnings: summary.warnings
    });

    return NextResponse.json(report);

  } catch (error) {
    logger.error('❌ Route validation failed:', error);
    
    return NextResponse.json({
      error: 'Route validation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function validateSquareRoutes(validations: RouteValidation[], criticalIssues: string[]) {
  // Validate Square sync route
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/square/sync`, {
      method: 'HEAD'
    });
    
    if (response.ok) {
      validations.push({
        path: '/api/square/sync',
        status: 'healthy',
        message: 'Square sync endpoint accessible'
      });
    } else {
      validations.push({
        path: '/api/square/sync',
        status: 'error',
        message: `Square sync endpoint returned ${response.status}`
      });
      criticalIssues.push('Square sync endpoint not accessible');
    }
  } catch (error) {
    validations.push({
      path: '/api/square/sync',
      status: 'error',
      message: 'Square sync endpoint not reachable',
      issues: [error instanceof Error ? error.message : 'Unknown error']
    });
    criticalIssues.push('Square sync endpoint not reachable');
  }

  // Validate Square client configuration
  const squareConfigIssues: string[] = [];
  
  if (!process.env.SQUARE_ACCESS_TOKEN) {
    squareConfigIssues.push('SQUARE_ACCESS_TOKEN not configured');
  }
  
  if (!process.env.SQUARE_ENVIRONMENT) {
    squareConfigIssues.push('SQUARE_ENVIRONMENT not configured');
  }

  if (squareConfigIssues.length > 0) {
    validations.push({
      path: '/api/square/*',
      status: 'error',
      message: 'Square configuration incomplete',
      issues: squareConfigIssues
    });
    criticalIssues.push('Square API configuration incomplete');
  } else {
    validations.push({
      path: '/api/square/*',
      status: 'healthy',
      message: 'Square configuration complete'
    });
  }
}

async function validateProductRoutes(validations: RouteValidation[], criticalIssues: string[]) {
  // Validate products API
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/products?limit=1`, {
      method: 'GET'
    });
    
    if (response.ok) {
      const data = await response.json();
      validations.push({
        path: '/api/products',
        status: 'healthy',
        message: `Products API working - ${Array.isArray(data) ? data.length : 0} products accessible`
      });
    } else {
      validations.push({
        path: '/api/products',
        status: 'error',
        message: `Products API returned ${response.status}`
      });
      criticalIssues.push('Products API not working');
    }
  } catch (error) {
    validations.push({
      path: '/api/products',
      status: 'error',
      message: 'Products API not reachable',
      issues: [error instanceof Error ? error.message : 'Unknown error']
    });
    criticalIssues.push('Products API not reachable');
  }
}

async function validateWebhookRoutes(validations: RouteValidation[], criticalIssues: string[]) {
  const webhookIssues: string[] = [];
  const webhookRecommendations: string[] = [];

  // Check webhook signature configuration
  if (!process.env.SQUARE_WEBHOOK_SECRET) {
    webhookIssues.push('SQUARE_WEBHOOK_SECRET not configured - webhooks vulnerable');
    criticalIssues.push('Webhook signature verification not configured');
  }

  // Validate webhook endpoint accessibility
  validations.push({
    path: '/api/webhooks/square',
    status: webhookIssues.length > 0 ? 'error' : 'warning',
    message: webhookIssues.length > 0 
      ? 'Webhook configuration has critical issues'
      : 'Webhook endpoint configured but needs verification',
    issues: webhookIssues,
    recommendations: [
      'Test webhook endpoint with Square webhook simulator',
      'Verify webhook signature validation',
      'Monitor webhook processing logs'
    ]
  });

  // Check Shippo webhook
  validations.push({
    path: '/api/webhooks/shippo',
    status: 'warning',
    message: 'Shippo webhook configured but signature verification needed',
    recommendations: [
      'Implement Shippo webhook signature verification',
      'Test tracking updates with real shipments'
    ]
  });
}

async function validateOrderRoutes(validations: RouteValidation[], criticalIssues: string[]) {
  // Check if orders can be fetched
  try {
    // This is a simple check - in production you'd want more comprehensive testing
    validations.push({
      path: '/api/orders',
      status: 'warning',
      message: 'Order routes need comprehensive testing',
      recommendations: [
        'Implement order creation endpoint validation',
        'Test order status updates',
        'Verify payment integration'
      ]
    });
  } catch (error) {
    validations.push({
      path: '/api/orders',
      status: 'error',
      message: 'Order routes have issues',
      issues: [error instanceof Error ? error.message : 'Unknown error']
    });
  }
}

async function validateCateringRoutes(validations: RouteValidation[], criticalIssues: string[]) {
  validations.push({
    path: '/api/catering/*',
    status: 'warning',
    message: 'Catering routes need validation',
    recommendations: [
      'Test catering order creation',
      'Verify catering item sync',
      'Validate catering pricing calculations'
    ]
  });
}

async function validateAdminRoutes(validations: RouteValidation[], criticalIssues: string[]) {
  // Check admin authentication
  const adminIssues: string[] = [];
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    adminIssues.push('Supabase configuration incomplete');
  }

  validations.push({
    path: '/api/admin/*',
    status: adminIssues.length > 0 ? 'error' : 'healthy',
    message: adminIssues.length > 0 
      ? 'Admin routes have configuration issues'
      : 'Admin routes configured',
    issues: adminIssues
  });
} 