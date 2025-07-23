import { NextRequest, NextResponse } from 'next/server';
import { alertService } from '@/lib/alerts';
import { prisma } from '@/lib/db';
import type {
  CustomerOrderConfirmationData,
  CustomerOrderStatusData,
  CustomerPickupReadyData,
  CustomerFeedbackRequestData,
  ContactFormReceivedData,
} from '@/types/alerts';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, orderId, ...data } = body;

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
        if (!data.name || !data.email || !data.message) {
          return NextResponse.json(
            {
              error: 'name, email, and message required for contact form',
            },
            { status: 400 }
          );
        }

        const contactData: ContactFormReceivedData = {
          name: data.name,
          email: data.email,
          subject: data.subject,
          message: data.message,
          type: data.contactType || 'general',
          timestamp: new Date(),
        };

        result = await alertService.sendContactFormReceived(contactData);
        break;

      default:
        return NextResponse.json({ error: 'Invalid alert type' }, { status: 400 });
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: `Customer alert sent successfully`,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
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
