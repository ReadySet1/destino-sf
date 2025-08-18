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
 * Save contact information for catering orders
 */
export async function saveContactInfo(data: {
  name: string;
  email: string;
  phone: string;
  eventDate: string;
  numberOfPeople: number;
  packageType: string;
  specialRequests?: string;
  deliveryAddress?: string;
  deliveryZone?: string;
  deliveryFee?: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
}): Promise<{ success: boolean; error?: string; orderId?: string }> {
  try {
    // Create a new catering order
    const newOrder = await db.cateringOrder.create({
      data: {
        customerId: null, // Will be set when user is authenticated
        email: data.email,
        name: data.name,
        phone: data.phone,
        eventDate: new Date(data.eventDate),
        numberOfPeople: data.numberOfPeople,
        totalAmount: data.totalAmount,
        status: CateringStatus.PENDING,
        notes: data.specialRequests,
        deliveryAddress: data.deliveryAddress,
        deliveryZone: data.deliveryZone,
        deliveryFee: data.deliveryFee,
        paymentMethod: data.paymentMethod,
        paymentStatus: PaymentStatus.PENDING,
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
 * Create catering order and process payment
 */
export async function createCateringOrderAndProcessPayment(data: {
  name: string;
  email: string;
  phone: string;
  eventDate: string;
  numberOfPeople: number;
  packageType: string;
  specialRequests?: string;
  deliveryAddress?: string;
  deliveryZone?: string;
  deliveryFee?: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  packageId?: string;
}): Promise<{ success: boolean; error?: string; orderId?: string; checkoutUrl?: string }> {
  try {
    // Create the catering order
    const orderResult = await saveContactInfo({
      ...data,
      totalAmount: data.totalAmount,
      paymentMethod: data.paymentMethod,
    });

    if (!orderResult.success || !orderResult.orderId) {
      return { success: false, error: 'Failed to create catering order' };
    }

    // TODO: Implement Square payment processing for catering orders
    // For now, just return success without payment processing
    
    return { 
      success: true, 
      orderId: orderResult.orderId,
      checkoutUrl: undefined // Will be implemented when Square integration is ready
    };
  } catch (error) {
    console.error('Error creating catering order and processing payment:', error);
    return { success: false, error: 'Failed to create catering order and process payment' };
  }
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
export async function saveCateringContactInfo(data: any) {
  // Stub implementation - replaced by new catering order system
  console.log('saveCateringContactInfo called with:', data);
  return { success: true, message: 'Using new catering order system' };
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
