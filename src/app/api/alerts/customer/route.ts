import { NextRequest, NextResponse } from 'next/server';
import { alertService } from '@/lib/alerts';
import { prisma, withRetry } from '@/lib/db-unified';
import { contactFormRateLimiter } from '@/lib/security/rate-limiter';
import type {
  CustomerOrderConfirmationData,
  CustomerOrderStatusData,
  CustomerPickupReadyData,
  CustomerFeedbackRequestData,
  ContactFormReceivedData,
} from '@/types/alerts';

// Maximum message length to prevent abuse
const MAX_MESSAGE_LENGTH = 5000;

export async function POST(request: NextRequest) {
  try {
    console.log('POST request received to /api/alerts/customer');

    const body = await request.json();
    const { type, orderId, ...data } = body;

    console.log('Request body:', { type, orderId, ...data });

    let result;

    switch (type) {
      case 'order_confirmation':
        if (!orderId) {
          return NextResponse.json(
            { error: 'orderId required for order confirmation' },
            { status: 400 }
          );
        }

        const orderForConfirmation = await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            items: {
              include: {
                product: true,
                variant: true,
              },
            },
          },
        });

        if (!orderForConfirmation) {
          return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const confirmationData: CustomerOrderConfirmationData = {
          order: orderForConfirmation,
          estimatedPreparationTime: data.estimatedPreparationTime,
        };

        result = await alertService.sendCustomerOrderConfirmation(
          confirmationData,
          data.customerEmail
        );
        break;

      case 'order_status_update':
        if (!orderId) {
          return NextResponse.json(
            { error: 'orderId required for status update' },
            { status: 400 }
          );
        }

        const orderForUpdate = await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            items: {
              include: {
                product: true,
                variant: true,
              },
            },
          },
        });

        if (!orderForUpdate) {
          return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const statusData: CustomerOrderStatusData = {
          order: orderForUpdate,
          previousStatus: data.previousStatus || 'PENDING',
          statusMessage: data.statusMessage,
          nextSteps: data.nextSteps,
        };

        result = await alertService.sendCustomerOrderStatusUpdate(statusData, data.customerEmail);
        break;

      case 'pickup_ready':
        if (!orderId) {
          return NextResponse.json({ error: 'orderId required for pickup ready' }, { status: 400 });
        }

        const orderForPickup = await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            items: {
              include: {
                product: true,
                variant: true,
              },
            },
          },
        });

        if (!orderForPickup) {
          return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const pickupData: CustomerPickupReadyData = {
          order: orderForPickup,
          shopAddress: data.shopAddress,
          pickupInstructions: data.pickupInstructions,
          parkingInfo: data.parkingInfo,
        };

        result = await alertService.sendCustomerPickupReady(pickupData, data.customerEmail);
        break;

      case 'feedback_request':
        if (!orderId) {
          return NextResponse.json(
            { error: 'orderId required for feedback request' },
            { status: 400 }
          );
        }

        const orderForFeedback = await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            items: {
              include: {
                product: true,
                variant: true,
              },
            },
          },
        });

        if (!orderForFeedback) {
          return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const feedbackData: CustomerFeedbackRequestData = {
          order: orderForFeedback,
          reviewPlatforms: data.reviewPlatforms,
          incentive: data.incentive,
        };

        result = await alertService.sendCustomerFeedbackRequest(
          feedbackData,
          data.customerEmail,
          data.delayHours
        );
        break;

      case 'contact_form':
        console.log('Processing contact form submission:', data);

        // Honeypot check - if filled, it's a bot
        if (data.website) {
          console.log('[SPAM] Honeypot triggered:', {
            email: data.email,
            name: data.name,
            honeypotValue: data.website,
            timestamp: new Date().toISOString(),
          });
          // Return success to not alert bots, but don't process
          return NextResponse.json({ success: true, messageId: 'filtered' });
        }

        // Rate limiting check
        const clientIp =
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          request.headers.get('x-real-ip') ||
          'unknown';
        const rateLimitResult = await contactFormRateLimiter.check(clientIp);
        if (!rateLimitResult.allowed) {
          console.log('[RATE_LIMIT] Contact form rate limit exceeded:', {
            ip: clientIp,
            remaining: rateLimitResult.remaining,
          });
          return NextResponse.json(
            { error: rateLimitResult.message },
            { status: 429 }
          );
        }

        if (!data.name || !data.email || !data.message) {
          console.log('Missing required fields:', {
            name: !!data.name,
            email: !!data.email,
            message: !!data.message,
          });
          return NextResponse.json(
            {
              error: 'name, email, and message required for contact form',
            },
            { status: 400 }
          );
        }

        // Message length validation
        if (data.message.length > MAX_MESSAGE_LENGTH) {
          console.log('[VALIDATION] Message too long:', {
            length: data.message.length,
            maxLength: MAX_MESSAGE_LENGTH,
          });
          return NextResponse.json(
            { error: `Message must be less than ${MAX_MESSAGE_LENGTH} characters` },
            { status: 400 }
          );
        }

        // Monitor for undefined subjects (as per production fix plan)
        if (!data.subject) {
          console.warn('Contact form submitted without subject', {
            name: data.name,
            email: data.email,
            contactType: data.contactType,
            timestamp: new Date().toISOString(),
          });
        }

        // Sanitize name and subject to prevent newlines in email subjects
        // This prevents Resend API validation errors: "The `\n` is not allowed in the `subject` field"
        const sanitizedName = (data.name || '').replace(/[\r\n]+/g, ' ').trim();
        const sanitizedInputSubject = data.subject
          ? data.subject.replace(/[\r\n]+/g, ' ').trim()
          : null;

        const contactData: ContactFormReceivedData = {
          name: sanitizedName,
          email: data.email,
          subject:
            sanitizedInputSubject ||
            `${data.contactType || 'general'} inquiry from ${sanitizedName}`,
          message: data.message,
          type: data.contactType || 'general',
          timestamp: new Date(),
        };

        console.log('Sending contact form data:', contactData);
        result = await alertService.sendContactFormReceived(contactData);
        console.log('Contact form result:', result);
        break;

      default:
        console.log('Invalid alert type:', type);
        return NextResponse.json({ error: 'Invalid alert type' }, { status: 400 });
    }

    if (result.success) {
      console.log('Alert sent successfully:', { type, messageId: result.messageId });
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: `Customer alert sent successfully`,
      });
    } else {
      console.error('Alert failed:', result.error || 'Unknown error');
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Unknown alert error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in customer alerts API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId');
  const customerEmail = searchParams.get('email');
  const type = searchParams.get('type');

  try {
    // Get customer alert history
    const whereClause: any = {};

    if (orderId) {
      whereClause.relatedOrderId = orderId;
    }

    if (customerEmail) {
      whereClause.recipientEmail = customerEmail;
    }

    if (type) {
      const customerTypes = [
        'CUSTOMER_ORDER_CONFIRMATION',
        'CUSTOMER_ORDER_STATUS',
        'CUSTOMER_PICKUP_READY',
        'CUSTOMER_DELIVERY_UPDATE',
        'CUSTOMER_SHIPPING_UPDATE',
        'CUSTOMER_ORDER_COMPLETE',
        'CUSTOMER_FEEDBACK_REQUEST',
        'CONTACT_FORM_RECEIVED',
      ];

      if (customerTypes.includes(type.toUpperCase())) {
        whereClause.type = type.toUpperCase();
      }
    }

    const alerts = await prisma.emailAlert.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to recent 50 alerts
      select: {
        id: true,
        type: true,
        status: true,
        recipientEmail: true,
        subject: true,
        sentAt: true,
        failedAt: true,
        retryCount: true,
        createdAt: true,
        relatedOrderId: true,
        metadata: true,
      },
    });

    return NextResponse.json({
      success: true,
      alerts,
      total: alerts.length,
    });
  } catch (error) {
    console.error('Error fetching customer alerts:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch customer alerts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
