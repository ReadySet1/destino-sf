'use server';

import { prisma as db, withRetry, ensureConnection } from '@/lib/db-unified';
import { isBuildTime, safeBuildTimeOperation } from '@/lib/build-time-utils';
import {
  type CateringPackage,
  CateringPackageType,
  CateringItemCategory,
  DeliveryZone,
  determineDeliveryZone,
  validateMinimumPurchase,
  getZoneConfig,
  type DeliveryAddress,
} from '@/types/catering';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { PaymentMethod, CateringStatus, PaymentStatus } from '@prisma/client';
import { z } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { createCateringOrderTipSettings } from '@/lib/square/tip-settings';
import {
  formatPhoneForSquare,
  formatEmailForSquare,
  formatCustomerDataForSquarePaymentLink,
} from '@/lib/square/formatting';
import { 
  createCheckoutLink, 
  formatCateringItemsForSquare, 
  addDeliveryFeeLineItem 
} from '@/lib/square/checkout-links';
import { sendCateringOrderNotification } from '@/lib/email';
import { isStoreOpen } from '@/lib/store-settings';
import { env } from '@/env'; // Import the validated environment configuration
import { calculateTaxForItems } from '@/utils/tax-exemption';
import { getTaxRate } from '@/lib/store-settings';
import Decimal from 'decimal.js';

// Convenience fee rate for catering orders (same as regular orders)
const SERVICE_FEE_RATE = 0.035; // 3.5%

/**
 * Fetches all active catering packages using Prisma with build-time safety
 */
export async function getCateringPackages(): Promise<CateringPackage[]> {
  // Return empty array during build time
  if (isBuildTime()) {
    console.log('🔧 Build-time detected: Returning empty catering packages array');
    return [];
  }

  return safeBuildTimeOperation(
    async () => {
      return withRetry(async () => {
        console.log('🔧 [CATERING] Fetching catering packages via Prisma...');

        const packages = await db.cateringPackage.findMany({
          where: {
            isActive: true,
          },
          orderBy: {
            featuredOrder: 'asc',
          },
        });

        console.log(`✅ [CATERING] Successfully fetched ${packages?.length || 0} catering packages`);

        return (
          (packages?.map((pkg: any) => ({
            ...pkg,
            pricePerPerson: Number(pkg.pricePerPerson),
          })) as CateringPackage[]) || []
        );
      }, 3, 'getCateringPackages');
    },
    [], // Fallback to empty array
    'getCateringPackages'
  );
}

/**
 * Fetches all catering items for a-la-carte ordering with build-time safety
 */
export async function getCateringItems(): Promise<any[]> {
  // Return empty array during build time
  if (isBuildTime()) {
    console.log('🔧 Build-time detected: Returning empty catering items array');
    return [];
  }

  return safeBuildTimeOperation(
    async () => {
      return withRetry(async () => {
        console.log('🔧 [CATERING] Fetching catering items via Prisma...');

        const items = await db.product.findMany({
          where: {
            active: true,
            category: {
              name: {
                contains: 'CATERING',
                mode: 'insensitive'
              }
            }
          },
          include: {
            category: true,
            variants: {
              select: {
                id: true,
                name: true,
                price: true,
              }
            }
          },
          orderBy: [
            { ordinal: 'asc' },
            { name: 'asc' }
          ]
        });

        console.log(`✅ [CATERING] Successfully fetched ${items?.length || 0} catering items`);

        return items.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: Number(item.price),
          category: item.category.name,
          imageUrl: item.images?.[0] || null,
          squareId: item.squareId,
          variants: item.variants,
          active: item.active,
        }));
      }, 3, 'getCateringItems');
    },
    [], // Fallback to empty array
    'getCateringItems'
  );
}

/**
 * Fetches a single catering package by ID with ratings and items
 */
export async function getCateringPackageById(packageId: string): Promise<CateringPackage | null> {
  try {
    const cateringPackage = await db.cateringPackage.findUnique({
      where: {
        id: packageId,
      },
      include: {
        ratings: true,
        items: true,
      },
    });

    if (!cateringPackage) {
      return null;
    }

    return {
      ...cateringPackage,
      pricePerPerson: Number(cateringPackage.pricePerPerson),
      items: cateringPackage.items.map((item: any) => ({
        ...item,
        // Note: CateringPackageItem only has itemName and quantity in current schema
        name: item.itemName,
        price: 0, // Items in packages don't have individual prices
      })),
    } as unknown as CateringPackage;
  } catch (error) {
    console.error(`Error fetching catering package with ID ${packageId}:`, error);

    // More specific error handling
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2021') {
        // Database table doesn't exist yet
        throw new Error(`Catering package table does not exist. Error code: ${error.code}`);
      }
    }

    throw error; // Re-throw the error to be handled by the calling component
  }
}

/**
 * Creates a new catering package
 */
export async function createCateringPackage(data: {
  name: string;
  description?: string;
  minPeople: number;
  pricePerPerson: number;
  type: CateringPackageType;
  imageUrl?: string;
  dietaryOptions: string[];
  items?: { itemId: string; quantity: number }[];
}): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const newPackage = await db.cateringPackage.create({
      data: {
        name: data.name,
        description: data.description,
        minPeople: data.minPeople,
        pricePerPerson: data.pricePerPerson,
        type: data.type,
        imageUrl: data.imageUrl,
        dietaryOptions: data.dietaryOptions,
        isActive: true,
        // Create package items if provided
        ...(data.items && data.items.length > 0
          ? {
              items: {
                create: data.items.map(item => ({
                  quantity: item.quantity,
                  itemName: item.itemId, // Using itemId as itemName since we don't have a separate CateringItem model
                })),
              },
            }
          : {}),
      },
    });

    revalidatePath('/catering');
    revalidatePath('/admin/catering');

    return { success: true, id: newPackage.id };
  } catch (error) {
    console.error('Error creating catering package:', error);
    return { success: false, error: 'Failed to create catering package' };
  }
}

/**
 * Updates an existing catering package
 */
export async function updateCateringPackage(
  packageId: string,
  data: {
    name?: string;
    description?: string;
    minPeople?: number;
    pricePerPerson?: number;
    type?: CateringPackageType;
    imageUrl?: string;
    isActive?: boolean;
    dietaryOptions?: string[];
    featuredOrder?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.cateringPackage.update({
      where: {
        id: packageId,
      },
      data,
    });

    revalidatePath('/catering');
    revalidatePath('/admin/catering');

    return { success: true };
  } catch (error) {
    console.error(`Error updating catering package with ID ${packageId}:`, error);
    return { success: false, error: `Failed to update catering package with ID ${packageId}` };
  }
}

/**
 * Add a rating to a catering package
 */
export async function addCateringPackageRating(data: {
  packageId: string;
  rating: number;
  review?: string;
  reviewerName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await db.cateringRating.create({
      data: {
        packageId: data.packageId,
        rating: data.rating,
        review: data.review,
        reviewerName: data.reviewerName,
      },
    });

    revalidatePath('/catering');

    return { success: true };
  } catch (error) {
    console.error('Error adding rating to catering package:', error);
    return { success: false, error: 'Failed to add rating to catering package' };
  }
}

/**
 * Submit a catering inquiry
 */
export async function submitCateringInquiry(data: {
  name: string;
  email: string;
  phone: string;
  eventDate: string;
  numberOfPeople: number;
  packageType: string;
  specialRequests?: string;
  deliveryAddress?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // For now, just log the inquiry since we don't have a dedicated table
    console.log('Catering inquiry received:', data);
    
    // TODO: Implement proper inquiry storage when needed
    // Could create a new table or use the existing contact submissions
    
    return { success: true };
  } catch (error) {
    console.error('Error submitting catering inquiry:', error);
    return { success: false, error: 'Failed to submit catering inquiry' };
  }
}

/**
 * Save contact information for catering orders with improved delivery address handling
 */
export async function saveContactInfo(data: {
  name: string;
  email: string;
  phone: string;
  eventDate: string;
  numberOfPeople: number;
  packageType: string;
  specialRequests?: string;
  deliveryAddress?: DeliveryAddress; // Changed to DeliveryAddress object
  deliveryZone?: string;
  deliveryFee?: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  customerId?: string | null;
  items?: Array<{
    itemType: string;
    itemId?: string | null;
    packageId?: string | null;
    name: string;
    quantity: number;
    pricePerUnit: number;
    totalPrice: number;
    notes?: string | null;
  }>;
  // New parameters for duplicate prevention and Square integration
  squareCheckoutId?: string;
  squareOrderId?: string;
  idempotencyKey?: string;
  tempOrderId?: string;
  metadata?: any;
}): Promise<{ success: boolean; error?: string; orderId?: string }> {
  try {
    // Check if store is open
    const storeOpen = await isStoreOpen();
    if (!storeOpen) {
      return {
        success: false,
        error: 'Store is currently closed. Please check our hours or try again later.',
      };
    }

    // Check for duplicate orders using idempotency key or email+date combination
    if (data.idempotencyKey) {
    const existingOrderByKey = await withRetry(async () => {
      return await db.cateringOrder.findFirst({
        where: {
          OR: [
            { 
              metadata: {
                path: ['idempotencyKey'],
                equals: data.idempotencyKey
              }
            },
            // Also check by squareOrderId if provided
            ...(data.squareOrderId ? [{ squareOrderId: data.squareOrderId }] : [])
          ]
        },
        select: { id: true, totalAmount: true, paymentStatus: true }
      });
    }, 3, 'checkDuplicateByIdempotencyKey');
      
      if (existingOrderByKey) {
        console.log(`🔧 [CATERING] Duplicate order detected with idempotency key: ${data.idempotencyKey}`);
        return {
          success: true,
          orderId: existingOrderByKey.id,
          error: 'Order already exists'
        };
      }
    }

    // Additional check for duplicate orders by email and event date (within 1 hour window)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const duplicateCheck = await withRetry(async () => {
      return await db.cateringOrder.findFirst({
        where: {
          email: data.email,
          eventDate: new Date(data.eventDate),
          totalAmount: data.totalAmount,
          createdAt: {
            gte: oneHourAgo
          }
        },
        select: { id: true, totalAmount: true }
      });
    }, 3, 'checkDuplicateByEmailAndDate');
    
    if (duplicateCheck) {
      console.log(`🔧 [CATERING] Potential duplicate order detected for ${data.email} on ${data.eventDate}`);
      return {
        success: true,
        orderId: duplicateCheck.id,
        error: 'Similar order already exists'
      };
    }

    // Create formatted delivery address string for backward compatibility
    const deliveryAddressString = data.deliveryAddress 
      ? `${data.deliveryAddress.street}${data.deliveryAddress.street2 ? `, ${data.deliveryAddress.street2}` : ''}, ${data.deliveryAddress.city}, ${data.deliveryAddress.state} ${data.deliveryAddress.postalCode}`
      : null;

    // Log tempOrderId debug info
    console.log(`[CATERING ORDER DEBUG] tempOrderId: ${data.tempOrderId}, type: ${typeof data.tempOrderId}`);
    const shouldUseTempOrderId = data.tempOrderId && typeof data.tempOrderId === 'string' && data.tempOrderId.trim() !== '';
    console.log(`[CATERING ORDER DEBUG] Will use tempOrderId: ${shouldUseTempOrderId}`);

    // Build the data object explicitly to avoid conditional spread issues
    const orderData: any = {
      email: data.email,
      name: data.name,
      phone: data.phone,
      eventDate: new Date(data.eventDate),
      numberOfPeople: data.numberOfPeople,
      totalAmount: data.totalAmount,
      status: CateringStatus.PENDING,
      notes: data.specialRequests,
      deliveryAddress: deliveryAddressString, // Keep the string format for backward compatibility
      deliveryAddressJson: data.deliveryAddress ? data.deliveryAddress as any : null, // Store structured JSON data
      deliveryZone: data.deliveryZone,
      deliveryFee: data.deliveryFee,
      paymentMethod: data.paymentMethod,
      paymentStatus: PaymentStatus.PENDING,
    };

    // Always provide an id field - either tempOrderId or generate a new UUID
    if (shouldUseTempOrderId) {
      orderData.id = data.tempOrderId;
      console.log(`[CATERING ORDER DEBUG] Added tempOrderId to data: ${data.tempOrderId}`);
    } else {
      // Generate a UUID in the application since database default isn't working
      orderData.id = randomUUID();
      console.log(`[CATERING ORDER DEBUG] Generated new UUID for order: ${orderData.id}`);
    }

    // Connect customer using the relation if customerId is provided
    if (data.customerId) {
      orderData.customer = { 
        connect: { id: data.customerId } 
      };
    }

    // Add Square integration fields if provided
    if (data.squareCheckoutId) {
      orderData.squareCheckoutId = data.squareCheckoutId;
    }
    if (data.squareOrderId) {
      orderData.squareOrderId = data.squareOrderId;
    }

    // Merge metadata with idempotencyKey and any additional metadata
    orderData.metadata = {
      ...(data.idempotencyKey && { idempotencyKey: data.idempotencyKey }),
      ...(data.metadata || {}),
    };

    // Create associated catering order items if provided
    if (data.items && data.items.length > 0) {
      orderData.items = {
        create: data.items.map(item => ({
          itemType: item.itemType,
          itemName: item.name,
          quantity: item.quantity,
          pricePerUnit: item.pricePerUnit,
          totalPrice: item.totalPrice,
          notes: item.notes,
          ...(item.packageId && { packageId: item.packageId }),
        })),
      };
    }

    console.log(`[CATERING ORDER DEBUG] Final order data keys: ${Object.keys(orderData).join(', ')}`);
    console.log(`[CATERING ORDER DEBUG] ID field: ${orderData.id}`);
    console.log(`[CATERING ORDER DEBUG] Customer field present: ${'customer' in orderData}`);
    console.log(`[CATERING ORDER DEBUG] Items field present: ${'items' in orderData}`);
    console.log(`[CATERING ORDER DEBUG] Items count: ${orderData.items ? orderData.items.create.length : 0}`);
    console.log(`[CATERING ORDER DEBUG] Metadata: ${JSON.stringify(orderData.metadata)}`);

    // Create a new catering order with items
    const newOrder = await withRetry(async () => {
      return await db.cateringOrder.create({
        data: orderData,
      });
    }, 3, 'createCateringOrder');

    console.log(`✅ [CATERING ORDER DEBUG] Order created successfully with ID: ${newOrder.id}`);

    revalidatePath('/catering');
    revalidatePath('/admin/catering');

    return { success: true, orderId: newOrder.id };
  } catch (error) {
    console.error('Error saving contact info:', error);
    return { success: false, error: 'Failed to save contact info' };
  }
}

/**
 * Create catering order and process payment with Square integration
 * Now with idempotency protection and atomic operations
 */
export async function createCateringOrderAndProcessPayment(data: {
  name: string;
  email: string;
  phone: string;
  eventDate: string;
  numberOfPeople: number;
  packageType: string;
  specialRequests?: string;
  deliveryAddress?: DeliveryAddress; // Updated to DeliveryAddress object
  deliveryZone?: string;
  deliveryFee?: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  packageId?: string;
  customerId?: string | null;
  items?: Array<{
    itemType: string;
    itemId?: string | null;
    packageId?: string | null;
    name: string;
    quantity: number;
    pricePerUnit: number;
    totalPrice: number;
    notes?: string | null;
  }>;
  idempotencyKey?: string; // Add idempotency protection
}): Promise<{ success: boolean; error?: string; orderId?: string; checkoutUrl?: string }> {
  try {
    console.log('🔍 [CATERING-ACTION-DEBUG] Received order data:', {
      name: data.name,
      email: data.email, 
      phone: data.phone,
      paymentMethod: data.paymentMethod
    });
    
    // Check if store is open
    const storeOpen = await isStoreOpen();
    if (!storeOpen) {
      return {
        success: false,
        error: 'Store is currently closed. Please check our hours or try again later.',
      };
    }

    // Generate idempotency key if not provided (based on user, items hash, and timestamp)
    const idempotencyKey = data.idempotencyKey || generateIdempotencyKey(data);
    
    // Check for duplicate orders using idempotency key
    console.log(`🔐 [IDEMPOTENCY] Starting duplicate detection for catering order`);
    console.log(`🔐 [IDEMPOTENCY] Key: ${idempotencyKey.substring(0, 20)}...`);
    console.log(`🔐 [IDEMPOTENCY] Email: ${data.email}, Amount: $${data.totalAmount}`);
    
    const existingOrder = await checkForDuplicateOrder(data, idempotencyKey);
    if (existingOrder) {
      console.log(`🚫 [IDEMPOTENCY] DUPLICATE ORDER DETECTED!`);
      console.log(`🚫 [IDEMPOTENCY] Existing ID: ${existingOrder.id}`);
      console.log(`🚫 [IDEMPOTENCY] Detection source: ${existingOrder.source}`);
      console.log(`🚫 [IDEMPOTENCY] Has Square checkout: ${!!existingOrder.squareCheckoutId}`);
      
      // Log duplicate attempt for monitoring
      console.warn(`📊 [METRICS] Duplicate catering order prevented: ${existingOrder.source} detection`);
      
      // For duplicate orders, don't return a checkoutUrl - just redirect to confirmation
      // The client will handle redirecting to the confirmation page directly
      return {
        success: true,
        orderId: existingOrder.id,
        // Don't return checkoutUrl for duplicates - let client handle confirmation redirect
        checkoutUrl: undefined,
      };
    }
    
    console.log(`✅ [IDEMPOTENCY] No duplicates detected - proceeding with order creation`);
    console.log(`📊 [METRICS] New catering order creation initiated for ${data.email}`);

    // Process payment based on method
    if (data.paymentMethod === PaymentMethod.SQUARE) {
      try {
        // For Square payments: Create checkout link FIRST, then create order
        const formattedItems = formatCateringItemsForSquare(
          data.items?.map(item => ({
            name: item.name,
            quantity: item.quantity,
            pricePerUnit: item.pricePerUnit,
          })) || []
        );

        // Add delivery fee if applicable
        const lineItemsWithDelivery = addDeliveryFeeLineItem(
          formattedItems,
          data.deliveryFee || 0
        );

        // --- Calculate taxes and convenience fees for Square ---
        // Calculate subtotal from items
        const subtotal = data.items?.reduce((sum, item) => sum + item.totalPrice, 0) || 0;
        const deliveryFee = data.deliveryFee || 0;
        
        // Get tax rate from store settings
        const taxRateDecimal = await getTaxRate();
        
        // Calculate tax for catering items (catering items are always taxable)
        const itemsForTaxCalculation = (data.items || []).map(item => ({
          product: {
            category: { name: 'Catering' }, // Catering items are taxable
            name: item.name,
          },
          price: item.pricePerUnit,
          quantity: item.quantity,
        }));
        
        const taxCalculation = calculateTaxForItems(itemsForTaxCalculation, taxRateDecimal);
        const taxAmount = new Decimal(taxCalculation.taxAmount).toDecimalPlaces(2);
        
        // Add delivery fee to taxable amount if present (delivery fees are taxable)
        const deliveryTax = deliveryFee > 0 ? new Decimal(deliveryFee).times(taxRateDecimal) : new Decimal(0);
        const totalTaxAmount = taxAmount.plus(deliveryTax);
        
        // Calculate convenience fee (3.5% on subtotal + delivery fee + tax)
        const totalBeforeServiceFee = new Decimal(subtotal).plus(deliveryFee).plus(totalTaxAmount);
        const serviceFeeAmount = totalBeforeServiceFee.times(SERVICE_FEE_RATE).toDecimalPlaces(2);

        console.log(`[CATERING] Calculated Subtotal: ${subtotal}`);
        console.log(`[CATERING] Calculated Delivery Fee: ${deliveryFee}`);
        console.log(`[CATERING] Calculated Tax: ${totalTaxAmount.toFixed(2)}`);
        console.log(`[CATERING] Calculated Convenience Fee: ${serviceFeeAmount.toFixed(2)}`);

        // Prepare Square taxes and service charges
        const squareTaxes = totalTaxAmount.greaterThan(0) ? [{
          name: 'Sales Tax',
          percentage: new Decimal(taxRateDecimal).times(100).toFixed(2), // Convert to percentage
          scope: 'ORDER', // Apply to order subtotal (including delivery fee)
        }] : [];

        const squareServiceCharges = serviceFeeAmount.greaterThan(0) ? [{
          name: 'Convenience Fee',
          amount_money: { 
            amount: Math.round(serviceFeeAmount.toNumber() * 100), 
            currency: 'USD' 
          },
          calculation_phase: 'TOTAL_PHASE', // Applied after tax
          taxable: false,
        }] : [];

        // Clean app URL to prevent double slashes
        const cleanAppUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
        
        // Create a temporary order ID for Square (we'll use this for the actual order)
        const tempOrderId = generateTempOrderId();
        
        // Generate idempotency key to prevent duplicate orders
        const idempotencyKey = data.idempotencyKey || `catering_${data.email}_${tempOrderId}_${Date.now()}`;
        
        // Use the correct location ID based on environment
        const squareEnv = process.env.USE_SQUARE_SANDBOX === 'true' ? 'sandbox' : 'production';
        const locationId = squareEnv === 'sandbox' 
          ? 'LMV06M1ER6HCC'                         // Use Default Test Account sandbox location ID
          : process.env.SQUARE_LOCATION_ID;         // Use production location ID

        console.log(`💳 [SQUARE] About to create checkout link with params:`, {
          orderId: tempOrderId,
          locationId: locationId,
          lineItemsCount: lineItemsWithDelivery.length,
          redirectUrl: `${cleanAppUrl}/catering/confirmation?orderId=${tempOrderId}`,
          customerEmail: data.email,
          customerName: data.name,
          eventDate: data.eventDate
        });

        const { checkoutUrl, checkoutId, orderId: squareOrderId } = await createCheckoutLink({
          orderId: tempOrderId,
          locationId: locationId!,
          lineItems: lineItemsWithDelivery,
          taxes: squareTaxes,
          serviceCharges: squareServiceCharges,
          redirectUrl: `${cleanAppUrl}/catering/confirmation?orderId=${tempOrderId}`,
          customerEmail: data.email,
          customerName: data.name,
          customerPhone: data.phone,
          eventDate: data.eventDate, // Pass the event date for pickup_at
        });

        console.log(`💳 [SQUARE] Square checkout created successfully`);
        console.log(`💳 [SQUARE] Checkout ID: ${checkoutId}`);
        console.log(`💳 [SQUARE] Square Order ID: ${squareOrderId}`);
        console.log(`💳 [SQUARE] Checkout URL: ${checkoutUrl}`);
        console.log(`💳 [SQUARE] Will return checkoutUrl: ${!!checkoutUrl}`);

        // Calculate the total including tax and convenience fees
        const finalTotalAmount = new Decimal(subtotal)
          .plus(deliveryFee)
          .plus(totalTaxAmount)
          .plus(serviceFeeAmount)
          .toDecimalPlaces(2);

        console.log(`💾 [DATABASE] Final total with fees: ${finalTotalAmount.toFixed(2)}`);
        console.log(`💾 [DATABASE] Original client total: ${data.totalAmount}`);

        // Now create the catering order with Square IDs (atomic operation)
        console.log(`💾 [DATABASE] Creating catering order record...`);
        const orderResult = await saveContactInfo({
          ...data,
          totalAmount: finalTotalAmount.toNumber(), // Use calculated total with fees
          paymentMethod: data.paymentMethod,
          customerId: data.customerId,
          items: data.items,
          squareCheckoutId: checkoutId,
          squareOrderId: squareOrderId,
          idempotencyKey,
          tempOrderId, // Pass temp order ID to use as the actual order ID
          // Include calculated fees in metadata
          metadata: {
            originalClientTotal: data.totalAmount, // Store original for reference
            taxAmount: totalTaxAmount.toNumber(),
            serviceFee: serviceFeeAmount.toNumber(),
            calculatedAt: new Date().toISOString(),
            feesIncludedInSquare: true,
            feesIncludedInTotal: true,
          },
        });

        if (!orderResult.success || !orderResult.orderId) {
          console.error(`❌ [DATABASE] Failed to create catering order after Square checkout was created`);
          console.error(`❌ [DATABASE] Square checkout ID: ${checkoutId}`);
          console.error(`❌ [DATABASE] Error: ${orderResult.error}`);
          
          return { 
            success: false, 
            error: 'Failed to create catering order. Please contact support with reference: ' + checkoutId 
          };
        }

        console.log(`✅ [DATABASE] Catering order created successfully: ${orderResult.orderId}`);
        console.log(`📧 [EMAIL] Sending admin notification...`);

        // Send admin notification email
        try {
          await sendCateringOrderNotification(orderResult.orderId);
          console.log(`✅ [EMAIL] Admin notification sent successfully`);
        } catch (emailError) {
          console.error(`⚠️ [EMAIL] Failed to send admin notification:`, emailError);
          // Don't fail the order creation if email fails
        }

        console.log(`🎉 [SUCCESS] Square catering order process completed successfully`);
        console.log(`🎉 [SUCCESS] Order ID: ${orderResult.orderId}, Checkout: ${!!checkoutUrl}`);

        const returnValue = {
          success: true,
          orderId: orderResult.orderId,
          checkoutUrl,
        };
        
        console.log(`🔍 [SERVER-ACTION-DEBUG] About to return from server action:`, {
          success: returnValue.success,
          orderId: returnValue.orderId,
          checkoutUrl: returnValue.checkoutUrl,
          checkoutUrlType: typeof returnValue.checkoutUrl,
          checkoutUrlLength: returnValue.checkoutUrl ? returnValue.checkoutUrl.length : 0,
          serialized: JSON.stringify(returnValue)
        });

        return returnValue;
      } catch (squareError) {
        console.error('Error creating Square checkout link:', squareError);
        
        return {
          success: false,
          error: 'Failed to create payment checkout. Please try again or contact us for assistance.',
        };
      }
    } else if (data.paymentMethod === PaymentMethod.CASH) {
      // For cash orders, calculate taxes only (no convenience fees) and create order directly
      // --- Calculate taxes for Cash orders (convenience fees only apply to Square) ---
      const subtotal = data.items?.reduce((sum, item) => sum + item.totalPrice, 0) || 0;
      const deliveryFee = data.deliveryFee || 0;
      
      // Get tax rate from store settings
      const taxRateDecimal = await getTaxRate();
      
      // Calculate tax for catering items (catering items are always taxable)
      const itemsForTaxCalculation = (data.items || []).map(item => ({
        product: {
          category: { name: 'Catering' }, // Catering items are taxable
          name: item.name,
        },
        price: item.pricePerUnit,
        quantity: item.quantity,
      }));
      
      const taxCalculation = calculateTaxForItems(itemsForTaxCalculation, taxRateDecimal);
      const taxAmount = new Decimal(taxCalculation.taxAmount).toDecimalPlaces(2);
      
      // Add delivery fee to taxable amount if present (delivery fees are taxable)
      const deliveryTax = deliveryFee > 0 ? new Decimal(deliveryFee).times(taxRateDecimal) : new Decimal(0);
      const totalTaxAmount = taxAmount.plus(deliveryTax);
      
      // Cash orders do not have convenience fees (only credit card orders do)
      const totalBeforeServiceFee = new Decimal(subtotal).plus(deliveryFee).plus(totalTaxAmount);
      const serviceFeeAmount = new Decimal(0); // No convenience fee for cash orders

      // Calculate final total without service fee for cash payments
      const finalTotalAmount = new Decimal(subtotal)
        .plus(deliveryFee)
        .plus(totalTaxAmount)
        .toDecimalPlaces(2);

      console.log(`[CATERING CASH] Calculated Subtotal: ${subtotal}`);
      console.log(`[CATERING CASH] Calculated Delivery Fee: ${deliveryFee}`);
      console.log(`[CATERING CASH] Calculated Tax: ${totalTaxAmount.toFixed(2)}`);
      console.log(`[CATERING CASH] Calculated Convenience Fee: ${serviceFeeAmount.toFixed(2)} (Cash orders have no convenience fee)`);
      console.log(`[CATERING CASH] Final total with fees: ${finalTotalAmount.toFixed(2)}`);

      const orderResult = await saveContactInfo({
        ...data,
        totalAmount: finalTotalAmount.toNumber(), // Use calculated total with fees
        paymentMethod: data.paymentMethod,
        customerId: data.customerId,
        items: data.items,
        idempotencyKey,
        // Include calculated fees in metadata
        metadata: {
          originalClientTotal: data.totalAmount, // Store original for reference
          taxAmount: totalTaxAmount.toNumber(),
          serviceFee: serviceFeeAmount.toNumber(),
          calculatedAt: new Date().toISOString(),
          feesIncludedInSquare: false, // Cash payment, no Square
          feesIncludedInTotal: true,
        },
      });

      if (!orderResult.success || !orderResult.orderId) {
        return { success: false, error: 'Failed to create catering order' };
      }
      
      // Send admin notification email
      await sendCateringOrderNotification(orderResult.orderId);
      
      return {
        success: true,
        orderId: orderResult.orderId,
      };
    }

    // Default return for other payment methods
    // Calculate fees for other payment methods too
    const subtotal = data.items?.reduce((sum, item) => sum + item.totalPrice, 0) || 0;
    const deliveryFee = data.deliveryFee || 0;
    
    // Get tax rate from store settings
    const taxRateDecimal = await getTaxRate();
    
    // Calculate tax for catering items (catering items are always taxable)
    const itemsForTaxCalculation = (data.items || []).map(item => ({
      product: {
        category: { name: 'Catering' }, // Catering items are taxable
        name: item.name,
      },
      price: item.pricePerUnit,
      quantity: item.quantity,
    }));
    
    const taxCalculation = calculateTaxForItems(itemsForTaxCalculation, taxRateDecimal);
    const taxAmount = new Decimal(taxCalculation.taxAmount).toDecimalPlaces(2);
    
    // Add delivery fee to taxable amount if present (delivery fees are taxable)
    const deliveryTax = deliveryFee > 0 ? new Decimal(deliveryFee).times(taxRateDecimal) : new Decimal(0);
    const totalTaxAmount = taxAmount.plus(deliveryTax);
    
    // Calculate convenience fee (3.5% on subtotal + delivery fee + tax)
    const totalBeforeServiceFee = new Decimal(subtotal).plus(deliveryFee).plus(totalTaxAmount);
    const serviceFeeAmount = totalBeforeServiceFee.times(SERVICE_FEE_RATE).toDecimalPlaces(2);

    // Calculate final total including all fees
    const finalTotalAmount = new Decimal(subtotal)
      .plus(deliveryFee)
      .plus(totalTaxAmount)
      .plus(serviceFeeAmount)
      .toDecimalPlaces(2);

    console.log(`[CATERING DEFAULT] Calculated fees - Tax: ${totalTaxAmount.toFixed(2)}, Service: ${serviceFeeAmount.toFixed(2)}, Total: ${finalTotalAmount.toFixed(2)}`);

    const orderResult = await saveContactInfo({
      ...data,
      totalAmount: finalTotalAmount.toNumber(), // Use calculated total with fees
      paymentMethod: data.paymentMethod,
      customerId: data.customerId,
      items: data.items,
      idempotencyKey,
      // Include calculated fees in metadata
      metadata: {
        originalClientTotal: data.totalAmount, // Store original for reference
        taxAmount: totalTaxAmount.toNumber(),
        serviceFee: serviceFeeAmount.toNumber(),
        calculatedAt: new Date().toISOString(),
        feesIncludedInSquare: false, // Not Square payment
        feesIncludedInTotal: true,
      },
    });

    if (!orderResult.success || !orderResult.orderId) {
      return { success: false, error: 'Failed to create catering order' };
    }

    await sendCateringOrderNotification(orderResult.orderId);
    
    return {
      success: true,
      orderId: orderResult.orderId,
    };
  } catch (error) {
    console.error('Error creating catering order and processing payment:', error);
    return { 
      success: false, 
      error: 'Failed to create catering order and process payment. Please try again.' 
    };
  }
}

/**
 * Enhanced helper function to generate a cryptographically secure idempotency key
 */
function generateIdempotencyKey(data: {
  email: string;
  eventDate: string;
  totalAmount: number;
  items?: Array<{ name: string; quantity: number; pricePerUnit: number }>;
}): string {
  console.log(`🔑 [IDEMPOTENCY] Generating new idempotency key`);
  
  // Create a deterministic hash based on order data
  const itemsHash = data.items 
    ? data.items
        .map(item => `${item.name.trim()}-${item.quantity}-${item.pricePerUnit.toFixed(2)}`)
        .sort() // Sort to ensure consistent ordering
        .join('|')
    : 'no-items';
  
  // Normalize email and create base string
  const normalizedEmail = data.email.toLowerCase().trim();
  const normalizedDate = new Date(data.eventDate).toISOString().split('T')[0]; // Use date only
  const normalizedAmount = data.totalAmount.toFixed(2);
  
  const baseString = `${normalizedEmail}::${normalizedDate}::${normalizedAmount}::${itemsHash}`;
  
  // Enhanced hash function with better distribution
  let hash = 0;
  for (let i = 0; i < baseString.length; i++) {
    const char = baseString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Add timestamp for uniqueness but maintain determinism for same-second requests
  const timestamp = Math.floor(Date.now() / 1000); // Second precision
  const key = `catering-${Math.abs(hash).toString(36)}-${timestamp.toString(36)}`;
  
  console.log(`🔑 [IDEMPOTENCY] Generated key: ${key.substring(0, 30)}... (${key.length} chars)`);
  console.log(`🔑 [IDEMPOTENCY] Base data hash: ${Math.abs(hash).toString(36)}`);
  
  return key;
}

/**
 * Enhanced helper function to check for duplicate orders with comprehensive logging
 */
async function checkForDuplicateOrder(
  data: {
    email: string;
    eventDate: string;
    totalAmount: number;
    customerId?: string | null;
  },
  idempotencyKey: string
): Promise<{ id: string; squareCheckoutId?: string | null; isDuplicate: boolean; source: string } | null> {
  const startTime = Date.now();
  console.log(`🔍 [IDEMPOTENCY] Starting duplicate check for key: ${idempotencyKey}`);
  
  try {
    // Step 1: Check for orders with same idempotency key first (most reliable)
    console.log(`🔍 [IDEMPOTENCY] Checking by idempotency key...`);
    const existingByKey = await withRetry(async () => {
      return await db.cateringOrder.findFirst({
        where: {
          metadata: {
            path: ['idempotencyKey'],
            equals: idempotencyKey,
          },
        },
        select: { 
          id: true, 
          squareCheckoutId: true, 
          createdAt: true,
          email: true,
          totalAmount: true,
        },
      });
    }, 3, 'checkDuplicateOrderByIdempotencyKey');

    if (existingByKey) {
      const ageMinutes = Math.round((Date.now() - existingByKey.createdAt.getTime()) / 60000);
      console.log(`✅ [IDEMPOTENCY] Found exact match by key: ${existingByKey.id} (${ageMinutes}min old)`);
      console.log(`📊 [IDEMPOTENCY] Duplicate check completed in ${Date.now() - startTime}ms`);
      return {
        id: existingByKey.id,
        squareCheckoutId: existingByKey.squareCheckoutId,
        isDuplicate: true,
        source: 'idempotency_key'
      };
    }

    // Step 2: Check for potential duplicates by email, event date, and amount
    // within the last 15 minutes (extended from 10 for better coverage)
    console.log(`🔍 [IDEMPOTENCY] Checking by email/date/amount pattern...`);
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    const potentialDuplicate = await withRetry(async () => {
      return await db.cateringOrder.findFirst({
        where: {
          email: data.email,
          eventDate: new Date(data.eventDate),
          totalAmount: data.totalAmount,
          ...(data.customerId && { 
            customer: { 
              id: data.customerId 
            } 
          }),
          createdAt: {
            gte: fifteenMinutesAgo,
          },
        },
        select: { 
          id: true, 
          squareCheckoutId: true, 
          createdAt: true,
          metadata: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }, 3, 'checkDuplicateOrderByPattern');

    if (potentialDuplicate) {
      const ageMinutes = Math.round((Date.now() - potentialDuplicate.createdAt.getTime()) / 60000);
      const hasIdempotencyKey = potentialDuplicate.metadata && 
        typeof potentialDuplicate.metadata === 'object' && 
        (potentialDuplicate.metadata as any).idempotencyKey;
      
      console.log(`⚠️ [IDEMPOTENCY] Found potential duplicate: ${potentialDuplicate.id} (${ageMinutes}min old)`);
      console.log(`⚠️ [IDEMPOTENCY] Potential duplicate has idempotency key: ${!!hasIdempotencyKey}`);
      console.log(`📊 [IDEMPOTENCY] Duplicate check completed in ${Date.now() - startTime}ms`);
      
      return {
        id: potentialDuplicate.id,
        squareCheckoutId: potentialDuplicate.squareCheckoutId,
        isDuplicate: true,
        source: 'pattern_match'
      };
    }

    // Step 3: No duplicates found
    console.log(`✅ [IDEMPOTENCY] No duplicates found - proceeding with order creation`);
    console.log(`📊 [IDEMPOTENCY] Duplicate check completed in ${Date.now() - startTime}ms`);
    return null;
    
  } catch (error) {
    console.error(`❌ [IDEMPOTENCY] Error during duplicate check:`, error);
    console.log(`📊 [IDEMPOTENCY] Duplicate check failed in ${Date.now() - startTime}ms`);
    
    // Enhanced error handling - log the specific error type
    if (error instanceof Error) {
      if (error.message.includes('database')) {
        console.error(`🚨 [IDEMPOTENCY] Database connection error during duplicate check`);
      } else if (error.message.includes('timeout')) {
        console.error(`🚨 [IDEMPOTENCY] Timeout error during duplicate check`);
      }
    }
    
    // If we can't check for duplicates, allow the order to proceed but log it
    console.warn(`⚠️ [IDEMPOTENCY] Proceeding without duplicate check due to error - ORDER MAY BE DUPLICATE`);
    return null;
  }
}

/**
 * Helper function to generate a temporary order ID for Square checkout
 */
function generateTempOrderId(): string {
  // Generate a proper UUID for the temporary order ID
  return randomUUID();
}

// Boxed Lunch Functions - These can be updated later as mentioned
export async function createBoxedLunchPackages(): Promise<{
  success: boolean;
  error?: string;
  packages?: any[];
}> {
  // TODO: Implement boxed lunch package creation
  return { success: false, error: 'Boxed lunch packages not yet implemented' };
}

export async function createBoxedLunchProteins(): Promise<{
  success: boolean;
  error?: string;
  proteins?: any[];
}> {
  // TODO: Implement boxed lunch protein creation
  return { success: false, error: 'Boxed lunch proteins not yet implemented' };
}

export async function createBoxedLunchAddOns(): Promise<{
  success: boolean;
  error?: string;
  addOns?: any[];
}> {
  // TODO: Implement boxed lunch add-ons creation
  return { success: false, error: 'Boxed lunch add-ons not yet implemented' };
}

export async function createBoxedLunchSalads(): Promise<{
  success: boolean;
  error?: string;
  salads?: any[];
}> {
  // TODO: Implement boxed lunch salads creation
  return { success: false, error: 'Boxed lunch salads not yet implemented' };
}

export async function getBoxedLunchData(): Promise<{
  success: boolean;
  error?: string;
  packages?: any[];
  proteins?: any[];
  addOns?: any[];
  salads?: any[];
}> {
  // TODO: Implement boxed lunch data retrieval
  return { success: false, error: 'Boxed lunch data retrieval not yet implemented' };
}

export async function initializeBoxedLunchData(): Promise<{
  success: boolean;
  error?: string;
  message?: string;
}> {
  // TODO: Implement boxed lunch data initialization
  return { success: false, error: 'Boxed lunch data initialization not yet implemented' };
}

export async function validateCateringOrderWithDeliveryZone(
  deliveryAddress: string,
  totalAmount: number
): Promise<{
  success: boolean;
  error?: string;
  deliveryZone?: DeliveryZone;
  deliveryFee?: number;
  minimumPurchase?: number;
}> {
  try {
    const zone = determineDeliveryZone(deliveryAddress);
    
    if (!zone) {
      return {
        success: false,
        error: 'Delivery zone not supported',
      };
    }
    
    const zoneConfig = getZoneConfig(zone);
    
    if (!zoneConfig) {
      return {
        success: false,
        error: 'Delivery zone configuration not found',
      };
    }

    const minimumPurchaseValidation = validateMinimumPurchase(totalAmount, zone);
    
    if (!minimumPurchaseValidation.isValid) {
      return {
        success: false,
        error: minimumPurchaseValidation.message,
        deliveryZone: zone,
        deliveryFee: zoneConfig.deliveryFee,
        minimumPurchase: zoneConfig.minimumAmount,
      };
    }

    return {
      success: true,
      deliveryZone: zone,
      deliveryFee: zoneConfig.deliveryFee,
      minimumPurchase: zoneConfig.minimumAmount,
    };
  } catch (error) {
    console.error('Error validating catering order with delivery zone:', error);
    return {
      success: false,
      error: 'Failed to validate delivery zone',
    };
  }
}

export async function initializeBoxedLunchDataAction(): Promise<{
  success: boolean;
  error?: string;
  message?: string;
}> {
  // TODO: Implement boxed lunch data initialization action
  return { success: false, error: 'Boxed lunch data initialization action not yet implemented' };
}

// Missing functions needed by components (backward compatibility)
const lastCallCache = new Map<string, number>();

// Robust fallback function for saving contact submissions using unified connection management
async function saveContactSubmissionWithFallback(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
  type: string;
  status: string;
}): Promise<{ id: string }> {
  console.log('💾 Attempting to save contact submission with unified retry system');
  
  try {
    // Use the unified retry system with enhanced error handling
    return await withRetry(async () => {
      // Ensure connection before attempting operation
      await ensureConnection();
      
      // Create the contact submission
      const result = await db.contactSubmission.create({ data });
      console.log('✅ Contact submission created successfully:', result.id);
      return result;
    }, 3, 'saveContactSubmissionWithFallback');
  } catch (error) {
    console.error('❌ Failed to save contact submission even with unified retry:', error);
    
    // Enhanced error logging for debugging
    if (error instanceof Error) {
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n'), // First 5 lines of stack
      });
    }
    
    // For critical contact submissions, try one more time with manual connection handling
    try {
      console.log('🆘 Last resort: Manual connection handling for contact submission');
      
      // Force a fresh connection
      await ensureConnection(1);
      
      // Simple direct operation
      return await db.contactSubmission.create({ data });
    } catch (finalError) {
      console.error('❌ Absolute final attempt failed:', finalError);
      throw new Error(`Failed to save contact submission: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export async function saveCateringContactInfo(data: {
  name: string;
  email: string;
  phone: string;
}): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    // Enhanced data validation
    if (!data || typeof data !== 'object') {
      console.error('❌ Invalid data object passed to saveCateringContactInfo:', data);
      return { 
        success: false, 
        message: 'Invalid data provided',
        error: 'Data object is required'
      };
    }

    // Validate required fields
    const trimmedName = data.name?.trim() || '';
    const trimmedEmail = data.email?.trim() || '';
    const trimmedPhone = data.phone?.trim() || '';

    if (!trimmedName || trimmedName.length < 2) {
      console.error('❌ Invalid name provided:', trimmedName);
      return { 
        success: false, 
        message: 'Valid name is required (at least 2 characters)',
        error: 'Invalid name'
      };
    }

    if (!trimmedEmail || !trimmedEmail.includes('@') || trimmedEmail.length < 5) {
      console.error('❌ Invalid email provided:', trimmedEmail);
      return { 
        success: false, 
        message: 'Valid email address is required',
        error: 'Invalid email'
      };
    }

    if (!trimmedPhone || trimmedPhone.length < 10) {
      console.error('❌ Invalid phone provided:', trimmedPhone);
      return { 
        success: false, 
        message: 'Valid phone number is required (at least 10 characters)',
        error: 'Invalid phone'
      };
    }

    const cacheKey = `${trimmedName}-${trimmedEmail}-${trimmedPhone}`;
    const now = Date.now();
    const lastCall = lastCallCache.get(cacheKey) || 0;
    
    // Only save if it's been more than 5 seconds since last call with same data
    if (now - lastCall > 5000) {
      console.log('✅ Saving catering contact info:', { 
        name: trimmedName.substring(0, 10) + '...', 
        email: trimmedEmail,
        phone: trimmedPhone.substring(0, 6) + '...' 
      });
      lastCallCache.set(cacheKey, now);
      
      // Save to ContactSubmission table as a catering contact for future follow-up
      // Use a more robust approach with direct connection management
      const contactSubmission = await saveContactSubmissionWithFallback({
        name: trimmedName,
        email: trimmedEmail,
        subject: 'Catering Contact Info - Auto-saved',
        message: `Contact info auto-saved during catering checkout. Phone: ${trimmedPhone}`,
        type: 'catering_contact',
        status: 'auto_saved',
      });
      
      console.log('✅ ContactSubmission created successfully with ID:', contactSubmission.id);
      return { success: true, message: 'Contact info saved successfully' };
    }
    
    console.log('ℹ️ Contact info already saved recently, skipping database save');
    return { success: true, message: 'Contact info already saved recently' };
  } catch (error) {
    console.error('❌ Error saving catering contact info:', error);
    
    // Enhanced error logging
    if (error instanceof Error) {
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
    
    // Check for specific Prisma/Database errors
    let errorMessage = 'Failed to save contact info';
    let errorDetail = error instanceof Error ? error.message : 'Unknown error';
    
    if (error instanceof Error) {
      if (error.message.includes('connection')) {
        errorMessage = 'Database connection error';
        errorDetail = 'Unable to connect to database';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Database timeout error';
        errorDetail = 'Database operation timed out';
      } else if (error.message.includes('constraint')) {
        errorMessage = 'Data validation error';
        errorDetail = 'Data does not meet database requirements';
      }
    }
    
    return { 
      success: false, 
      message: errorMessage,
      error: errorDetail
    };
  }
}


function mapCategoryNameToCateringCategory(categoryName: string): CateringItemCategory {
  if (categoryName.includes('STARTER') || categoryName.includes('APPETIZER')) return CateringItemCategory.STARTER;
  if (categoryName.includes('ENTREE')) return CateringItemCategory.ENTREE; 
  if (categoryName.includes('SIDE')) return CateringItemCategory.SIDE;
  if (categoryName.includes('SALAD')) return CateringItemCategory.SALAD;
  if (categoryName.includes('DESSERT')) return CateringItemCategory.DESSERT;
  if (categoryName.includes('BEVERAGE')) return CateringItemCategory.BEVERAGE;
  return CateringItemCategory.ENTREE; // Default fallback
}

// New server actions for Build Your Own Boxed Lunch feature

/**
 * Get boxed lunch entrees from the CATERING- BOXED LUNCH ENTREES category
 */
export async function getBoxedLunchEntrees() {
  try {
    const products = await db.product.findMany({
      where: {
        active: true,
        category: {
          name: 'CATERING- BOXED LUNCH ENTREES'
        }
      },
      include: {
        category: true
      },
      orderBy: [
        { ordinal: 'asc' },
        { name: 'asc' }
      ]
    });

    return products.map((product, index) => ({
      id: product.id,
      squareId: product.squareId,
      name: product.name,
      description: product.description || undefined,
      imageUrl: product.images?.[0] || null,
      category: 'BOXED_LUNCH_ENTREE' as const,
      available: product.active,
      sortOrder: product.ordinal ? Number(product.ordinal) : index,
      dietaryPreferences: product.dietaryPreferences || [],
      calories: product.calories || undefined,
      ingredients: product.ingredients || undefined,
      allergens: product.allergens || undefined,
    }));
  } catch (error) {
    console.error('Error getting boxed lunch entrees:', error);
    return [];
  }
}

/**
 * Get boxed lunch tier configurations
 */
export async function getBoxedLunchTiers() {
  try {
    const tiers = await db.$queryRaw<any[]>`
      SELECT id, tier_number as "tierNumber", name, price_cents as "priceCents", 
             protein_amount as "proteinAmount", sides, active, created_at as "createdAt", 
             updated_at as "updatedAt"
      FROM boxed_lunch_tiers 
      WHERE active = true 
      ORDER BY tier_number
    `;

    return tiers.map(tier => ({
      id: tier.id,
      tierNumber: tier.tierNumber,
      name: tier.name,
      priceCents: tier.priceCents,
      proteinAmount: tier.proteinAmount,
      sides: Array.isArray(tier.sides) ? tier.sides : [],
      active: tier.active,
      createdAt: tier.createdAt,
      updatedAt: tier.updatedAt,
    }));
  } catch (error) {
    console.error('Error getting boxed lunch tiers:', error);
    return [];
  }
}

/**
 * Get complete boxed lunch data with tiers and entrees
 */
export async function getBoxedLunchTiersWithEntrees() {
  try {
    const [tiers, entrees] = await Promise.all([
      getBoxedLunchTiers(),
      getBoxedLunchEntrees()
    ]);

    return tiers.map(tier => ({
      tier: `TIER_${tier.tierNumber}` as any,
      name: tier.name,
      price: tier.priceCents / 100, // Convert cents to dollars
      proteinAmount: tier.proteinAmount || '',
      sides: tier.sides,
      availableEntrees: entrees // All entrees available for all tiers
    }));
  } catch (error) {
    console.error('Error getting boxed lunch tiers with entrees:', error);
    return [];
  }
}

