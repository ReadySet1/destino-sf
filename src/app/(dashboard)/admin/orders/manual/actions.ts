'use server';

import { prisma } from '@/lib/prisma';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { logger } from '@/utils/logger';
import { revalidatePath } from 'next/cache';

// Define our own PaymentMethod enum to match the Prisma schema
enum PaymentMethod {
  SQUARE = "SQUARE",
  CASH = "CASH"
}

interface OrderItemInput {
  productId: string;
  variantId: string | null;
  quantity: number;
  price: number;
}

interface ManualOrderInput {
  customerName: string;
  email: string;
  phone: string;
  total: number;
  fulfillmentType: string; // Maps to fulfillment_type in the database via Prisma mapping
  pickupTime: string;
  notes: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  items: OrderItemInput[];
  existingOrderId?: string;
}

export async function createManualOrder(data: ManualOrderInput) {
  try {
    // Validate input
    if (!data.customerName || !data.email || !data.phone) {
      return { error: 'Customer information is required' };
    }

    if (!data.items || data.items.length === 0) {
      return { error: 'At least one item is required' };
    }

    // Convert pickup time from string to Date if provided
    const pickupTime = data.pickupTime ? new Date(data.pickupTime) : undefined;

    // If updating an existing order
    if (data.existingOrderId) {
      const existingOrder = await prisma.order.findUnique({
        where: { id: data.existingOrderId },
        include: { items: true },
      });

      if (!existingOrder) {
        return { error: 'Order not found' };
      }

      // Update the order
      const updatedOrder = await prisma.order.update({
        where: { id: data.existingOrderId },
        data: {
          customerName: data.customerName,
          email: data.email,
          phone: data.phone,
          total: data.total,
          // The schema uses @map("fulfillment_type") so we use the Prisma field name
          fulfillmentType: data.fulfillmentType,
          pickupTime: pickupTime,
          notes: data.notes,
          paymentMethod: data.paymentMethod,
          paymentStatus: data.paymentStatus,
          status: data.status,
          // We'll handle items separately
        },
      });

      // Delete all existing items to replace with new ones
      await prisma.orderItem.deleteMany({
        where: { orderId: data.existingOrderId },
      });

      // Create new items
      await Promise.all(
        data.items.map(item =>
          prisma.orderItem.create({
            data: {
              orderId: data.existingOrderId!,
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              price: item.price,
            },
          })
        )
      );

      logger.info(`Order ${updatedOrder.id} updated successfully`);
      revalidatePath('/admin/orders');
      return { orderId: updatedOrder.id };
    }
    
    // Creating a new order
    const newOrder = await prisma.order.create({
      data: {
        customerName: data.customerName,
        email: data.email,
        phone: data.phone,
        total: data.total,
        // The schema uses @map("fulfillment_type") so we use the Prisma field name
        fulfillmentType: data.fulfillmentType,
        pickupTime: pickupTime,
        notes: data.notes,
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentStatus,
        status: data.status,
        // Create items as nested operation
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
    });

    logger.info(`Order ${newOrder.id} created successfully`);
    revalidatePath('/admin/orders');
    return { orderId: newOrder.id };
  } catch (error) {
    logger.error('Error creating manual order:', error);
    return { error: 'Failed to create order. Please try again.' };
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  paymentStatus?: PaymentStatus
) {
  try {
    const updateData: {
      status: OrderStatus;
      paymentStatus?: PaymentStatus;
    } = { status };

    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    logger.info(`Order ${orderId} status updated to ${status}`);
    revalidatePath('/admin/orders');
    return { success: true, orderId };
  } catch (error) {
    logger.error(`Error updating order ${orderId} status:`, error);
    return { error: 'Failed to update order status' };
  }
} 