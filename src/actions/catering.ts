'use server';

import { db, withPreparedStatementHandling } from '@/lib/db';
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

/**
 * Fetches all active catering packages using Prisma
 */
export async function getCateringPackages(): Promise<CateringPackage[]> {
  return withPreparedStatementHandling(async () => {
    try {
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
    } catch (error) {
      console.error('❌ [CATERING] Error fetching catering packages:', error);
      return [];
    }
  }, 'getCateringPackages');
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

    // Create formatted delivery address string for backward compatibility
    const deliveryAddressString = data.deliveryAddress 
      ? `${data.deliveryAddress.street}${data.deliveryAddress.street2 ? `, ${data.deliveryAddress.street2}` : ''}, ${data.deliveryAddress.city}, ${data.deliveryAddress.state} ${data.deliveryAddress.postalCode}`
      : null;

    // Create a new catering order with items
    const newOrder = await db.cateringOrder.create({
      data: {
        // Use tempOrderId if provided (for Square orders), otherwise let DB generate
        ...(data.tempOrderId && { id: data.tempOrderId }),
        // Connect customer using the relation if customerId is provided
        ...(data.customerId && { 
          customer: { 
            connect: { id: data.customerId } 
          } 
        }),
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
        // Add Square integration fields
        ...(data.squareCheckoutId && { squareCheckoutId: data.squareCheckoutId }),
        ...(data.squareOrderId && { squareOrderId: data.squareOrderId }),
        ...(data.idempotencyKey && { 
          metadata: { idempotencyKey: data.idempotencyKey } as any 
        }),
        // Create associated catering order items if provided
        ...(data.items && data.items.length > 0 && {
          items: {
            create: data.items.map(item => ({
              itemType: item.itemType,
              itemName: item.name,
              quantity: item.quantity,
              pricePerUnit: item.pricePerUnit,
              totalPrice: item.totalPrice,
              notes: item.notes,
              ...(item.packageId && { packageId: item.packageId }),
            })),
          },
        }),
      },
    });

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
    const existingOrder = await checkForDuplicateOrder(data, idempotencyKey);
    if (existingOrder) {
      console.log(`Duplicate order detected, returning existing order: ${existingOrder.id}`);
      return {
        success: true,
        orderId: existingOrder.id,
        checkoutUrl: existingOrder.squareCheckoutId ? 
          `${process.env.NEXT_PUBLIC_APP_URL}/catering/confirmation?orderId=${existingOrder.id}` : 
          undefined,
      };
    }

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

        // Clean app URL to prevent double slashes
        const cleanAppUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
        
        // Create a temporary order ID for Square (we'll use this for the actual order)
        const tempOrderId = generateTempOrderId();
        
        const { checkoutUrl, checkoutId, orderId: squareOrderId } = await createCheckoutLink({
          orderId: tempOrderId,
          locationId: process.env.SQUARE_LOCATION_ID!,
          lineItems: lineItemsWithDelivery,
          redirectUrl: `${cleanAppUrl}/catering/confirmation?orderId=${tempOrderId}`,
          customerEmail: data.email,
          customerName: data.name,
          customerPhone: data.phone,
        });

        // Now create the catering order with Square IDs (atomic operation)
        const orderResult = await saveContactInfo({
          ...data,
          totalAmount: data.totalAmount,
          paymentMethod: data.paymentMethod,
          customerId: data.customerId,
          items: data.items,
          squareCheckoutId: checkoutId,
          squareOrderId: squareOrderId,
          idempotencyKey,
          tempOrderId, // Pass temp order ID to use as the actual order ID
        });

        if (!orderResult.success || !orderResult.orderId) {
          console.error('Failed to create catering order after Square checkout was created');
          return { 
            success: false, 
            error: 'Failed to create catering order. Please contact support with reference: ' + checkoutId 
          };
        }

        // Send admin notification email
        await sendCateringOrderNotification(orderResult.orderId);

        return {
          success: true,
          orderId: orderResult.orderId,
          checkoutUrl,
        };
      } catch (squareError) {
        console.error('Error creating Square checkout link:', squareError);
        
        return {
          success: false,
          error: 'Failed to create payment checkout. Please try again or contact us for assistance.',
        };
      }
    } else if (data.paymentMethod === PaymentMethod.CASH) {
      // For cash orders, create order directly
      const orderResult = await saveContactInfo({
        ...data,
        totalAmount: data.totalAmount,
        paymentMethod: data.paymentMethod,
        customerId: data.customerId,
        items: data.items,
        idempotencyKey,
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
    const orderResult = await saveContactInfo({
      ...data,
      totalAmount: data.totalAmount,
      paymentMethod: data.paymentMethod,
      customerId: data.customerId,
      items: data.items,
      idempotencyKey,
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
 * Helper function to generate an idempotency key for duplicate prevention
 */
function generateIdempotencyKey(data: {
  email: string;
  eventDate: string;
  totalAmount: number;
  items?: Array<{ name: string; quantity: number; pricePerUnit: number }>;
}): string {
  // Create a hash based on user email, event date, total amount, and items
  const itemsHash = data.items 
    ? data.items.map(item => `${item.name}-${item.quantity}-${item.pricePerUnit}`).join('|')
    : '';
  
  const baseString = `${data.email}-${data.eventDate}-${data.totalAmount}-${itemsHash}`;
  
  // Simple hash function (in production, you might want to use crypto)
  let hash = 0;
  for (let i = 0; i < baseString.length; i++) {
    const char = baseString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `catering-${Math.abs(hash)}-${Date.now()}`;
}

/**
 * Helper function to check for duplicate orders within a reasonable time window
 */
async function checkForDuplicateOrder(
  data: {
    email: string;
    eventDate: string;
    totalAmount: number;
    customerId?: string | null;
  },
  idempotencyKey: string
): Promise<{ id: string; squareCheckoutId?: string | null } | null> {
  try {
    // Check for orders with same idempotency key first
    const existingByKey = await db.cateringOrder.findFirst({
      where: {
        metadata: {
          path: ['idempotencyKey'],
          equals: idempotencyKey,
        },
      },
      select: { id: true, squareCheckoutId: true },
    });

    if (existingByKey) {
      return existingByKey;
    }

    // Fallback: check for potential duplicates by email, event date, and amount
    // within the last 10 minutes (to catch rapid double-clicks)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    const potentialDuplicate = await db.cateringOrder.findFirst({
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
          gte: tenMinutesAgo,
        },
      },
      select: { id: true, squareCheckoutId: true },
      orderBy: { createdAt: 'desc' },
    });

    return potentialDuplicate || null;
  } catch (error) {
    console.error('Error checking for duplicate orders:', error);
    // If we can't check for duplicates, allow the order to proceed
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

export async function saveCateringContactInfo(data: {
  name: string;
  email: string;
  phone: string;
}): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const cacheKey = `${data.name}-${data.email}-${data.phone}`;
    const now = Date.now();
    const lastCall = lastCallCache.get(cacheKey) || 0;
    
    // Only save if it's been more than 5 seconds since last call with same data
    if (now - lastCall > 5000) {
      console.log('✅ Saving catering contact info:', data);
      lastCallCache.set(cacheKey, now);
      
      // Save to ContactSubmission table as a catering contact for future follow-up
      await db.contactSubmission.create({
        data: {
          name: data.name.trim(),
          email: data.email.trim(),
          subject: 'Catering Contact Info - Auto-saved',
          message: `Contact info auto-saved during catering checkout. Phone: ${data.phone}`,
          type: 'catering_contact',
          status: 'auto_saved',
        },
      });
      
      return { success: true, message: 'Contact info saved successfully' };
    }
    
    return { success: true, message: 'Contact info already saved recently' };
  } catch (error) {
    console.error('❌ Error saving catering contact info:', error);
    return { 
      success: false, 
      message: 'Failed to save contact info',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getCateringItems() {
  // Get catering items from products table instead of removed catering_items table
  try {
    const products = await db.product.findMany({
      where: {
        active: true,
        category: {
          name: {
            contains: 'CATERING'
          }
        }
      },
      include: {
        category: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Transform to CateringItem format for backward compatibility
    return products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description || null,
      price: parseFloat(product.price.toString()),
      category: mapCategoryNameToCateringCategory(product.category.name),
      isVegetarian: false, // Default values - these could be stored in product metadata
      isVegan: false,
      isGlutenFree: false,
      servingSize: null,
      imageUrl: product.images[0] || null,
      isActive: product.active,
      squareCategory: product.category.name,
      squareProductId: product.squareId,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }));
  } catch (error) {
    console.error('Error getting catering items:', error);
    return [];
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
