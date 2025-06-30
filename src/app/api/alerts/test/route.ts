import { NextRequest, NextResponse } from 'next/server';
import { alertService } from '@/lib/alerts';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  try {
    const testTypes = [
      'system_error', 
      'daily_summary', 
      'payment_failure',
      // Phase 3: Customer-facing alerts
      'order_confirmation',
      'order_status_update', 
      'pickup_ready',
      'feedback_request',
      'contact_form',
      // Phase 4: Business operations alerts
      'inventory_low_stock',
      'sales_trend_alert',
      'revenue_milestone',
      'order_volume_alert',
      'payment_gateway_alert',
      'website_performance_alert'
    ];
    
    return NextResponse.json({
      message: 'Email Alerts System - Phase 2, 3 & 4 Testing Endpoints',
      endpoints: {
        test_phase_2: {
          url: '/api/alerts/test',
          method: 'POST',
          description: 'Test Phase 2 system alerts (admin-facing)',
          body: {
            type: 'system_error | daily_summary | payment_failure',
            message: 'string (optional, for system_error)',
            severity: 'string (optional, for system_error)'
          }
        },
        customer_alerts: {
          url: '/api/alerts/customer',
          method: 'POST',
          description: 'Test Phase 3 customer-facing email alerts',
          body: {
            type: 'order_confirmation | order_status_update | pickup_ready | feedback_request | contact_form',
            orderId: 'string (required for order-related alerts)',
            '...': 'additional fields based on alert type'
          }
        },
        business_alerts: {
          url: '/api/alerts/business',
          method: 'POST', 
          description: 'Test Phase 4 business operations alerts',
          body: {
            type: 'inventory_low_stock | sales_trend_alert | revenue_milestone | order_volume_alert | payment_gateway_alert | website_performance_alert',
            '...': 'additional fields based on alert type'
          }
        },
        list_alerts: {
          url: '/api/alerts',
          method: 'GET',
          description: 'List all alerts with filtering options',
          params: {
            type: 'string (optional)',
            status: 'string (optional)',
            page: 'number (optional)',
            limit: 'number (optional)'
          }
        },
        retry_alerts: {
          url: '/api/alerts/retry',
          method: 'POST',
          description: 'Retry failed alerts',
          body: {
            alertId: 'string (optional, specific alert)',
            retryAll: 'boolean (optional, retry all failed)'
          }
        },
      },
      examples: {
        // Phase 2: System alerts
        system_error: `curl -X POST ${baseUrl}/api/alerts/test \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "system_error",
    "message": "Test error message",
    "severity": "HIGH"
  }'`,
        
        payment_failure: `curl -X POST ${baseUrl}/api/alerts/test \\
  -H "Content-Type: application/json" \\
  -d '{"type": "payment_failure"}'`,
        
        daily_summary: `curl -X POST ${baseUrl}/api/alerts/test \\
  -H "Content-Type: application/json" \\
  -d '{"type": "daily_summary"}'`,
        
        // Phase 3: Customer alerts examples
        order_confirmation: `curl -X POST ${baseUrl}/api/alerts/customer \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "order_confirmation",
    "orderId": "ORDER_ID_HERE",
    "estimatedPreparationTime": "30-45 minutes"
  }'`,
        
        order_status_update: `curl -X POST ${baseUrl}/api/alerts/customer \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "order_status_update",
    "orderId": "ORDER_ID_HERE",
    "previousStatus": "PENDING",
    "statusMessage": "Your order is being prepared by our chefs!",
    "nextSteps": "We will notify you when it is ready for pickup."
  }'`,
        
        pickup_ready: `curl -X POST ${baseUrl}/api/alerts/customer \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "pickup_ready",
    "orderId": "ORDER_ID_HERE",
    "shopAddress": "123 Main St, San Francisco, CA 94102",
    "pickupInstructions": "Please come to the front counter and provide your name and order number.",
    "parkingInfo": "Free parking available on the street."
  }'`,
        
        feedback_request: `curl -X POST ${baseUrl}/api/alerts/customer \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "feedback_request",
    "orderId": "ORDER_ID_HERE",
    "reviewPlatforms": {
      "google": "https://g.page/destino-sf/review",
      "yelp": "https://www.yelp.com/biz/destino-sf",
      "facebook": "https://www.facebook.com/destinosf/reviews"
    },
    "incentive": {
      "description": "10% off your next order",
      "details": "Use code FEEDBACK10 on your next order within 30 days"
    }
  }'`,
        
        contact_form: `curl -X POST ${baseUrl}/api/alerts/customer \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "contact_form",
    "name": "John Doe",
    "email": "john@example.com",
    "subject": "Question about catering",
    "message": "I am interested in catering for 50 people. What packages do you offer?",
    "contactType": "catering"
  }'`,
        
        // Phase 4: Business alerts examples
        inventory_low_stock: `curl -X POST ${baseUrl}/api/alerts/business \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "inventory_low_stock",
    "productId": "prod_123",
    "productName": "Carnitas Burrito",
    "currentStock": 5,
    "threshold": 10,
    "category": "Burritos"
  }'`,
        
        sales_trend_alert: `curl -X POST ${baseUrl}/api/alerts/business \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "sales_trend_alert",
    "metric": "daily_revenue",
    "currentValue": 850,
    "previousValue": 1200,
    "changePercentage": -29.2,
    "period": "daily"
  }'`,
        
        order_volume_alert: `curl -X POST ${baseUrl}/api/alerts/business \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "order_volume_alert",
    "threshold": 20
  }'`,
        
        revenue_milestone: `curl -X POST ${baseUrl}/api/alerts/business \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "revenue_milestone",
    "milestone": 1000,
    "currentRevenue": 1250,
    "period": "daily"
  }'`,
        
        payment_gateway_alert: `curl -X POST ${baseUrl}/api/alerts/business \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "payment_gateway_alert",
    "gateway": "Square",
    "issue": "Connection timeout after 30 seconds",
    "severity": "high"
  }'`,
        
        website_performance_alert: `curl -X POST ${baseUrl}/api/alerts/business \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "website_performance_alert",
    "metric": "response_time",
    "value": 5000,
    "unit": "ms",
    "threshold": 3000
  }'`
      },
      note: "Replace ORDER_ID_HERE with an actual order ID from your database. You can find order IDs by querying /api/orders or your admin panel."
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to generate test documentation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, message, severity } = body;

    let result;

    switch (type) {
      case 'system_error':
        const errorMessage = message || 'Test system error alert';
        const errorSeverity = severity || 'MEDIUM';
        
        result = await alertService.sendSystemErrorAlert(
          new Error(errorMessage),
          {
            component: 'alert-test-api',
            action: 'manual_test',
            severity: errorSeverity,
            timestamp: new Date().toISOString(),
            userAgent: request.headers.get('user-agent'),
            ip: request.headers.get('x-forwarded-for') || 'unknown'
          }
        );
        break;

      case 'daily_summary':
        result = await alertService.sendDailySummary();
        break;

      case 'payment_failure':
        // Get a recent order for testing
        const recentOrder = await prisma.order.findFirst({
          include: {
            items: {
              include: {
                product: true,
                variant: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (!recentOrder) {
          return NextResponse.json({ 
            error: 'No orders found to test payment failure alert' 
          }, { status: 400 });
        }

        result = await alertService.sendPaymentFailedAlert(
          recentOrder,
          'Test payment failure: Credit card declined'
        );
        break;

      default:
        return NextResponse.json({ 
          error: 'Invalid test type. Use: system_error, daily_summary, or payment_failure' 
        }, { status: 400 });
    }

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        messageId: result.messageId,
        message: `${type} alert sent successfully` 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in test alert endpoint:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 