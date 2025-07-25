import { prisma } from '@/lib/db';
import { CartItem } from '@/types/cart';

export interface PendingOrderCheck {
  hasPendingOrder: boolean;
  existingOrderId?: string;
  existingOrder?: {
    id: string;
    total: number;
    createdAt: Date;
    paymentUrl?: string;
    paymentUrlExpiresAt?: Date;
    retryCount: number;
  };
}

/**
 * Check if user has a pending order with similar items
 * @param userId - User ID to check for
 * @param cartItems - Current cart items
 * @param email - User email (fallback if no userId)
 * @returns Information about existing pending orders
 */
export async function checkForDuplicateOrder(
  userId: string | null,
  cartItems: CartItem[],
  email?: string
): Promise<PendingOrderCheck> {
  try {
    // Build the where clause based on available identifiers
    const whereClause: any = {
      status: { in: ['PENDING'] },
      paymentStatus: { in: ['PENDING', 'FAILED'] },
      createdAt: {
        // Only check orders from the last 24 hours
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    };

    // Add user identification
    if (userId) {
      whereClause.userId = userId;
    } else if (email) {
      whereClause.email = email;
    } else {
      return { hasPendingOrder: false };
    }

    // Find pending orders
    const pendingOrders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5, // Limit to recent orders
    });

    if (pendingOrders.length === 0) {
      return { hasPendingOrder: false };
    }

    // Check if any pending order has similar items
    for (const order of pendingOrders) {
      if (hasSimilarItems(order.items, cartItems)) {
        return {
          hasPendingOrder: true,
          existingOrderId: order.id,
          existingOrder: {
            id: order.id,
            total: Number(order.total),
            createdAt: order.createdAt,
            paymentUrl: order.paymentUrl || undefined,
            paymentUrlExpiresAt: order.paymentUrlExpiresAt || undefined,
            retryCount: order.retryCount || 0,
          },
        };
      }
    }

    return { hasPendingOrder: false };
  } catch (error) {
    console.error('Error checking for duplicate orders:', error);
    return { hasPendingOrder: false };
  }
}

/**
 * Compare cart items with order items to detect similarity
 * @param orderItems - Items from existing order
 * @param cartItems - Current cart items
 * @returns true if items are similar (same products and quantities)
 */
function hasSimilarItems(orderItems: any[], cartItems: CartItem[]): boolean {
  if (orderItems.length !== cartItems.length) {
    return false;
  }

  // Create maps for comparison
  const orderItemsMap = new Map<string, number>();
  const cartItemsMap = new Map<string, number>();

  // Build order items map
  orderItems.forEach(item => {
    const key = `${item.product.id}:${item.variant?.id || 'default'}`;
    orderItemsMap.set(key, item.quantity);
  });

  // Build cart items map
  cartItems.forEach(item => {
    const key = `${item.id}:${item.variantId || 'default'}`;
    cartItemsMap.set(key, item.quantity);
  });

  // Compare maps
  if (orderItemsMap.size !== cartItemsMap.size) {
    return false;
  }

  for (const [key, quantity] of orderItemsMap.entries()) {
    if (cartItemsMap.get(key) !== quantity) {
      return false;
    }
  }

  return true;
}

/**
 * Clean up old pending orders that are unlikely to be completed
 * @param userId - User ID to clean up for
 * @param email - User email (fallback)
 * @returns Number of orders cleaned up
 */
export async function cleanupOldPendingOrders(
  userId: string | null,
  email?: string
): Promise<number> {
  try {
    // Build the where clause
    const whereClause: any = {
      status: { in: ['PENDING'] },
      paymentStatus: { in: ['PENDING', 'FAILED'] },
      createdAt: {
        // Clean up orders older than 7 days
        lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    };

    // Add user identification
    if (userId) {
      whereClause.userId = userId;
    } else if (email) {
      whereClause.email = email;
    } else {
      return 0;
    }

    // Mark old orders as cancelled
    const result = await prisma.order.updateMany({
      where: whereClause,
      data: {
        status: 'CANCELLED',
        cancelReason: 'Auto-cancelled: Payment not completed after 7 days',
        updatedAt: new Date(),
      },
    });

    console.log(`Cleaned up ${result.count} old pending orders`);
    return result.count;
  } catch (error) {
    console.error('Error cleaning up old pending orders:', error);
    return 0;
  }
}

/**
 * Server action to handle duplicate order detection and cleanup
 * @param userId - User ID
 * @param cartItems - Current cart items
 * @param email - User email
 */
export async function handleDuplicateOrderPrevention(
  userId: string | null,
  cartItems: CartItem[],
  email?: string
) {
  // First, clean up old orders
  await cleanupOldPendingOrders(userId, email);

  // Then check for recent duplicates
  return await checkForDuplicateOrder(userId, cartItems, email);
} 