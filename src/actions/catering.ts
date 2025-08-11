'use server';

import { db } from '@/lib/db';
import {
  type CateringPackage,
  type CateringItem,
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
        items: {
          include: {
            cateringItem: true,
          },
        },
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
        cateringItem: item.cateringItem
          ? {
              ...item.cateringItem,
              price: Number(item.cateringItem.price),
            }
          : undefined,
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
 * Fetches a single catering item by ID
 */
export async function getCateringItem(
  itemId: string
): Promise<{ success: boolean; data?: CateringItem; error?: string }> {
  try {
    const item = await db.cateringItem.findUnique({
      where: {
        id: itemId,
      },
    });

    if (!item) {
      return { success: false, error: 'Catering item not found' };
    }

    return {
      success: true,
      data: {
        ...item,
        price: Number(item.price),
      } as unknown as CateringItem,
    };
  } catch (error) {
    console.error(`Error fetching catering item with ID ${itemId}:`, error);

    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2021') {
        return { success: false, error: 'Catering items table does not exist' };
      }
    }

    return { success: false, error: 'Failed to fetch catering item' };
  }
}

/**
 * Fetches all active catering items using Prisma
 * Enhanced to also fetch products from Product table that belong to catering categories
 */
export async function getCateringItems(): Promise<CateringItem[]> {
  try {
    console.log('🔧 [CATERING] Fetching catering items via Prisma...');

    const items = await db.cateringItem.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        category: 'asc',
      },
    });

    console.log(
      `✅ [CATERING] Successfully fetched ${items?.length || 0} catering items from CateringItem table`
    );

    const cateringItems =
      (items?.map((item: any) => ({
        ...item,
        price: Number(item.price),
      })) as CateringItem[]) || [];

    // Also fetch products from Product table that belong to catering categories
    try {
      const cateringProducts = await db.product.findMany({
        where: {
          active: true,
          OR: [
            {
              category: {
                name: {
                  contains: 'CATERING',
                  mode: 'insensitive',
                },
              },
            },
            {
              category: {
                name: {
                  contains: 'SHARE PLATTERS',
                  mode: 'insensitive',
                },
              },
            },
          ],
        },
        include: {
          category: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      console.log(`✅ [CATERING] Found ${cateringProducts.length} products in catering categories`);

      // Create a map of real images from Product table
      const productImageMap = new Map();
      cateringProducts.forEach(product => {
        const imageUrl = product.images && product.images.length > 0 ? product.images[0] : null;
        if (imageUrl && product.squareId) {
          productImageMap.set(product.squareId, imageUrl);
        }
      });

      // Create a map for base platter names to their real images
      const baseItemImageMap = new Map();
      cateringItems.forEach(item => {
        if (item.squareProductId && productImageMap.has(item.squareProductId)) {
          const realImageUrl = productImageMap.get(item.squareProductId);
          const baseName = item.name.toLowerCase();
          baseItemImageMap.set(baseName, realImageUrl);
        }
      });

      // Update existing CateringItems with real images from Product table
      let updatedCount = 0;
      const updatedCateringItems = cateringItems.map(cateringItem => {
        let realImageUrl = null;

        // First try: Direct squareProductId match
        if (cateringItem.squareProductId && productImageMap.has(cateringItem.squareProductId)) {
          realImageUrl = productImageMap.get(cateringItem.squareProductId);
          console.log(`🖼️ [CATERING] Direct image match for "${cateringItem.name}" via Square ID: ${cateringItem.squareProductId}`);
        }
        // Second try: For size variants (Small/Large), match with base item name
        else if (cateringItem.name.includes(' - ')) {
          const baseName = cateringItem.name.split(' - ')[0].toLowerCase();
          if (baseItemImageMap.has(baseName)) {
            realImageUrl = baseItemImageMap.get(baseName);
            console.log(`🖼️ [CATERING] Variant image match for "${cateringItem.name}" via base name: ${baseName}`);
          }
        }
        // Third try: Name-based matching for products that might not have exact Square ID match
        else {
          const normalizedCateringName = cateringItem.name.toLowerCase().trim();
          const matchingProduct = cateringProducts.find(product => 
            product.name.toLowerCase().trim() === normalizedCateringName ||
            product.name.toLowerCase().includes(normalizedCateringName) ||
            normalizedCateringName.includes(product.name.toLowerCase())
          );
          if (matchingProduct && matchingProduct.images && matchingProduct.images.length > 0) {
            realImageUrl = matchingProduct.images[0];
            console.log(`🖼️ [CATERING] Name-based image match for "${cateringItem.name}" via product: ${matchingProduct.name}`);
          }
        }

        if (realImageUrl) {
          const isGenericImage =
            cateringItem.imageUrl?.includes('/images/catering/') &&
            (cateringItem.imageUrl.includes('appetizer-package') ||
              cateringItem.imageUrl.includes('default-item'));

          if (isGenericImage || !cateringItem.imageUrl) {
            updatedCount++;
            return {
              ...cateringItem,
              imageUrl: realImageUrl,
            };
          }
        }

        return cateringItem;
      });

      if (updatedCount > 0) {
        console.log(
          `🔄 [CATERING] Updated ${updatedCount} items with real images from Product table`
        );
      }

      // Convert remaining Product items that don't have CateringItem equivalents
      const productAsCateringItems: CateringItem[] = cateringProducts
        .filter(product => {
          // Skip products that already have CateringItem equivalents
          // Improved deduplication: check both squareProductId and name matching
          const existsInCateringItems = cateringItems.some(
            cateringItem => 
              // Direct Square ID match
              (cateringItem.squareProductId && cateringItem.squareProductId === product.squareId) ||
              // Name-based match (normalized for comparison)
              (cateringItem.name.toLowerCase().trim() === product.name.toLowerCase().trim())
          );

          return !existsInCateringItems;
        })
        .map(product => {
          // Determine category based on the Square category name using SQUARE_CATEGORY_MAPPING
          let category = 'STARTER'; // default
          const categoryName = product.category?.name || '';

          // Use the mapping logic similar to getItemsForTab
          if (categoryName.includes('DESSERT')) {
            category = 'DESSERT';
          } else if (categoryName.includes('ENTREE') || categoryName.includes('BUFFET')) {
            category = 'ENTREE';
          } else if (categoryName.includes('SIDE')) {
            category = 'SIDE';
          } else if (categoryName.includes('SALAD')) {
            category = 'SALAD';
          } else if (categoryName.includes('BEVERAGE')) {
            category = 'BEVERAGE';
          }

          // Same logic as admin: get first image if available
          const firstImage =
            product.images && product.images.length > 0 && product.images[0]
              ? product.images[0]
              : null;

          return {
            id: product.id,
            name: product.name,
            description: product.description || '',
            price: Number(product.price),
            category: category as any,
            isVegetarian: false,
            isVegan: false,
            isGlutenFree: false,
            servingSize: null,
            imageUrl: firstImage,
            isActive: true,
            squareCategory: product.category?.name || '', // Ensure it's never null for tab filtering
            squareProductId: product.squareId,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
          } as CateringItem;
        });

      console.log(
        `✅ [CATERING] Converted ${productAsCateringItems.length} products to catering items`
      );

      // Merge the results - updated catering items first, then new products
      const allItems = [...updatedCateringItems, ...productAsCateringItems];

      console.log(
        `✅ [CATERING] Total items returned: ${allItems.length} (${updatedCateringItems.length} from CateringItem + ${productAsCateringItems.length} from Product)`
      );

      return allItems;
    } catch (productError) {
      console.error('❌ [CATERING] Error fetching products from Product table:', productError);
      // Return just the catering items if product fetch fails
      return cateringItems;
    }
  } catch (error) {
    console.error('❌ [CATERING] Unexpected error fetching catering items:', error);
    return [];
  }
}

/**
 * Fetches catering items by category
 */
export async function getCateringItemsByCategory(
  category: CateringItemCategory
): Promise<CateringItem[]> {
  try {
    const items = await db.cateringItem.findMany({
      where: {
        isActive: true,
        category,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return items.map((item: any) => ({
      ...item,
      price: Number(item.price),
    })) as unknown as CateringItem[];
  } catch (error) {
    console.error(`Error fetching catering items for category ${category}:`, error);
    throw new Error(`Failed to fetch catering items for category ${category}`);
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
                  cateringItem: {
                    connect: {
                      id: item.itemId,
                    },
                  },
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
 * Creates a new catering item
 */
export async function createCateringItem(data: {
  name: string;
  description?: string;
  price: number;
  category: CateringItemCategory;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  servingSize?: string;
  imageUrl?: string;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const newItem = await db.cateringItem.create({
      data: {
        ...data,
        isActive: true,
      },
    });

    revalidatePath('/catering');
    revalidatePath('/admin/catering');

    return { success: true, id: newItem.id };
  } catch (error) {
    console.error('Error creating catering item:', error);
    return { success: false, error: 'Failed to create catering item' };
  }
}

/**
 * Updates an existing catering item
 */
export async function updateCateringItem(
  itemId: string,
  data: {
    name?: string;
    description?: string;
    price?: number;
    category?: CateringItemCategory;
    isVegetarian?: boolean;
    isVegan?: boolean;
    isGlutenFree?: boolean;
    servingSize?: string;
    imageUrl?: string;
    isActive?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.cateringItem.update({
      where: {
        id: itemId,
      },
      data,
    });

    revalidatePath('/catering');
    revalidatePath('/admin/catering');

    return { success: true };
  } catch (error) {
    console.error(`Error updating catering item with ID ${itemId}:`, error);
    return { success: false, error: `Failed to update catering item with ID ${itemId}` };
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
  eventDate: Date;
  numberOfPeople: number;
  notes?: string;
  packageId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Create a new catering order record
    await db.cateringOrder.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        eventDate: data.eventDate,
        numberOfPeople: data.numberOfPeople,
        notes: data.notes,
        totalAmount: 0, // Will be calculated later
        status: 'PENDING',
      },
    });

    revalidatePath('/catering');
    return { success: true };
  } catch (error) {
    console.error('Error submitting catering inquiry:', error);
    return { success: false, error: 'Failed to submit catering inquiry' };
  }
}

/**
 * Fetches products that belong to a specific Square category
 * This is useful for getting products from Square categories like "CATERING-APPETIZERS"
 */
export async function getProductsBySquareCategory(categoryName: string): Promise<any[]> {
  try {
    // First, find the category by name
    const category = await db.category.findFirst({
      where: {
        name: categoryName,
      },
    });

    if (!category) {
      console.warn(`Square category ${categoryName} not found`);
      return [];
    }

    // Get products that belong to this category
    const products = await db.product.findMany({
      where: {
        categoryId: category.id,
        active: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return products.map((product: any) => ({
      ...product,
      price: Number(product.price),
    }));
  } catch (error) {
    console.error(`Error fetching products for Square category ${categoryName}:`, error);
    throw new Error(`Failed to fetch products for Square category ${categoryName}`);
  }
}

/**
 * Fetches all catering categories from the product categories table
 * looking for categories that start with "CATERING-"
 */
export async function getCateringCategories(): Promise<any[]> {
  try {
    const categories = await db.category.findMany({
      where: {
        name: {
          startsWith: 'CATERING-',
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return categories;
  } catch (error) {
    console.error('Error fetching catering categories:', error);
    throw new Error('Failed to fetch catering categories');
  }
}

// Schema for catering order validation
const CateringOrderItemSchema = z
  .object({
    itemType: z.enum(['package', 'item']),
    itemId: z.string().uuid().optional().nullable(),
    packageId: z.string().uuid().optional().nullable(),
    name: z.string(),
    quantity: z.number().int().positive(),
    pricePerUnit: z.number().positive(),
    totalPrice: z.number().positive(),
    notes: z.string().optional().nullable(),
  })
  .refine(
    data => {
      // Either itemId or packageId should be present, or neither for synthetic items
      return data.itemType === 'item'
        ? data.itemId !== null
        : data.itemType === 'package'
          ? data.packageId !== null
          : true;
    },
    {
      message: 'itemId is required for items and packageId is required for packages',
    }
  );

// Phone number validation for catering orders
const cateringPhoneSchema = z
  .string()
  .min(7, 'Phone number must be at least 7 digits')
  .max(20, 'Phone number is too long')
  .refine(
    phone => {
      // Remove all non-digit characters for validation
      const digitsOnly = phone.replace(/\D/g, '');
      return digitsOnly.length >= 7 && digitsOnly.length <= 15;
    },
    {
      message: 'Please enter a valid phone number (7-15 digits)',
    }
  );

const CateringOrderSchema = z.object({
  customerInfo: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: cateringPhoneSchema,
    customerId: z.string().uuid().optional().nullable(),
  }),
  eventDetails: z.object({
    eventDate: z.string().transform(str => new Date(str)),
    numberOfPeople: z.number().int().min(1),
    specialRequests: z.string().optional().nullable(),
  }),
  fulfillment: z.object({
    method: z.enum(['pickup', 'local_delivery']),
    pickupDate: z.string().optional(),
    pickupTime: z.string().optional(),
    deliveryAddress: z
      .object({
        street: z.string(),
        street2: z.string().optional(),
        city: z.string(),
        state: z.string(),
        postalCode: z.string(),
      })
      .optional(),
    deliveryDate: z.string().optional(),
    deliveryTime: z.string().optional(),
  }),
  items: z.array(CateringOrderItemSchema),
  totalAmount: z.number().positive(),
  paymentMethod: z.enum(['SQUARE', 'CASH']).default('SQUARE'),
});

export type ServerActionResult<T = unknown> = Promise<
  { success: true; data: T } | { success: false; error: string }
>;

/**
 * Saves contact information immediately to capture leads
 * Creates or updates a profile with name and phone number
 * Can be used for both catering and regular checkout
 */
export async function saveContactInfo(data: {
  name: string;
  email: string;
  phone: string;
}): Promise<ServerActionResult<{ profileId: string }>> {
  try {
    // Validate input data
    if (!data.name?.trim() || !data.email?.trim() || !data.phone?.trim()) {
      return { success: false, error: 'Name, email, and phone are required' };
    }

    // Check if a profile already exists with this email
    const existingProfile = await db.profile.findUnique({
      where: { email: data.email },
    });

    let profile;

    if (existingProfile) {
      // Update existing profile with new information
      profile = await db.profile.update({
        where: { id: existingProfile.id },
        data: {
          name: data.name.trim(),
          phone: data.phone.trim(),
          updated_at: new Date(),
        },
      });

      console.log(`Updated existing profile for email: ${data.email}`);
    } else {
      // Create new profile
      profile = await db.profile.create({
        data: {
          id: randomUUID(),
          email: data.email.trim(),
          name: data.name.trim(),
          phone: data.phone.trim(),
          role: 'CUSTOMER',
        },
      });

      console.log(`Created new profile for email: ${data.email}`);
    }

    return {
      success: true,
      data: { profileId: profile.id },
    };
  } catch (error) {
    console.error('Error saving contact info:', error);

    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return { success: false, error: 'This email is already registered' };
      }
    }

    return {
      success: false,
      error: 'Failed to save contact information',
    };
  }
}

/**
 * Backwards compatibility alias for catering checkout
 * @deprecated Use saveContactInfo instead
 */
export const saveCateringContactInfo = saveContactInfo;

/**
 * Creates a catering order and generates a Square checkout URL
 */
export async function createCateringOrderAndProcessPayment(
  formData: z.infer<typeof CateringOrderSchema>
): Promise<ServerActionResult<{ orderId: string; checkoutUrl?: string }>> {
  try {
    const { customerInfo, eventDetails, fulfillment, items, totalAmount, paymentMethod } = formData;

    console.log(`Creating catering order with ${paymentMethod} payment method...`);

    // Validate delivery zone if it's a delivery order
    let deliveryZone = null;
    let deliveryFee = 0;

    if (fulfillment.method === 'local_delivery' && fulfillment.deliveryAddress) {
      const validation = await validateCateringOrderWithDeliveryZone(
        items.map(item => ({
          id: item.itemId || item.packageId || `synthetic-${Date.now()}-${Math.random()}`,
          quantity: item.quantity,
          price: item.pricePerUnit,
        })),
        {
          city: fulfillment.deliveryAddress.city,
          postalCode: fulfillment.deliveryAddress.postalCode,
        }
      );

      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errorMessage || 'Delivery validation failed',
        };
      }

      deliveryZone = validation.deliveryZone;
      deliveryFee = validation.deliveryFee || 0;

      // Update total amount to include delivery fee
      const updatedTotalAmount = totalAmount + deliveryFee;
      formData.totalAmount = updatedTotalAmount;
    }

    // 1. Create the catering order in our database
    const cateringOrder = await db.cateringOrder.create({
      data: {
        email: customerInfo.email,
        name: customerInfo.name,
        phone: customerInfo.phone,
        customerId: customerInfo.customerId || undefined,
        eventDate: eventDetails.eventDate,
        numberOfPeople: eventDetails.numberOfPeople,
        specialRequests: eventDetails.specialRequests || undefined,
        totalAmount: formData.totalAmount,
        deliveryZone: deliveryZone || undefined,
        deliveryAddress:
          fulfillment.method === 'local_delivery' && fulfillment.deliveryAddress
            ? `${fulfillment.deliveryAddress.street} ${fulfillment.deliveryAddress.street2 || ''} ${fulfillment.deliveryAddress.city}, ${fulfillment.deliveryAddress.state} ${fulfillment.deliveryAddress.postalCode}`.trim()
            : undefined,
        deliveryFee: deliveryFee > 0 ? deliveryFee : undefined,
        status: paymentMethod === 'CASH' ? CateringStatus.CONFIRMED : CateringStatus.PENDING,
        paymentStatus: paymentMethod === 'CASH' ? PaymentStatus.PENDING : PaymentStatus.PENDING,
        paymentMethod: paymentMethod as PaymentMethod,
        items: {
          create: items.map(item => ({
            itemType: item.itemType,
            itemId: item.itemId || undefined,
            packageId: item.packageId || undefined,
            name: item.name,
            quantity: item.quantity,
            pricePerUnit: item.pricePerUnit,
            totalPrice: item.totalPrice,
            notes: item.notes || undefined,
          })),
        },
      },
    });

    console.log(
      `Catering order created with ID: ${cateringOrder.id} (delivery zone: ${deliveryZone})`
    );

    // For cash payments, don't create a Square payment link
    if (paymentMethod === 'CASH') {
      revalidatePath('/catering');
      revalidatePath('/admin/catering/orders');

      return {
        success: true,
        data: {
          orderId: cateringOrder.id,
        },
      };
    }

    // Only proceed with Square payment processing for SQUARE payment method
    // 2. Get Square configuration
    const squareEnv = process.env.USE_SQUARE_SANDBOX === 'true' ? 'sandbox' : 'production';
    const accessToken =
      squareEnv === 'sandbox' ? process.env.SQUARE_SANDBOX_TOKEN : process.env.SQUARE_ACCESS_TOKEN;
    const locationId = process.env.SQUARE_LOCATION_ID;
    const supportEmail = process.env.SUPPORT_EMAIL || 'info@destinosf.com';

    console.log(`Using Square ${squareEnv} environment with location ID: ${locationId}`);

    if (!locationId || !accessToken) {
      console.error('Server Action Config Error: Missing Square Location ID or Access Token.');

      // Update order status to indicate failure
      await db.cateringOrder.update({
        where: { id: cateringOrder.id },
        data: {
          status: CateringStatus.CANCELLED,
          paymentStatus: PaymentStatus.FAILED,
          notes: 'Square config error (missing credentials)',
        },
      });

      return {
        success: false,
        error: 'Payment provider configuration error.',
      };
    }

    // 3. Set up Square API base URL
    const BASE_URL =
      squareEnv === 'sandbox'
        ? 'https://connect.squareupsandbox.com'
        : 'https://connect.squareup.com';

    // 4. Prepare Square Line Items
    const squareLineItems = items.map(item => ({
      quantity: item.quantity.toString(),
      base_price_money: {
        amount: Math.round(item.pricePerUnit * 100), // Convert to cents
        currency: 'USD',
      },
      name: item.name,
    }));

    // 5. Set up redirect URLs
    const origin = env.NEXT_PUBLIC_APP_URL;
    if (!origin) {
      console.error('Server Action Config Error: NEXT_PUBLIC_APP_URL is not set.');

      await db.cateringOrder.update({
        where: { id: cateringOrder.id },
        data: {
          status: CateringStatus.CANCELLED,
          paymentStatus: PaymentStatus.FAILED,
          notes: 'Missing base URL config',
        },
      });

      return {
        success: false,
        error: 'Server configuration error: Base URL missing.',
      };
    }

    // Build redirect URLs
    const redirectUrl = new URL('/catering/confirmation', origin);
    redirectUrl.searchParams.set('status', 'success');
    redirectUrl.searchParams.set('orderId', cateringOrder.id);

    const cancelUrl = new URL('/catering', origin);
    cancelUrl.searchParams.set('status', 'cancelled');
    cancelUrl.searchParams.set('orderId', cateringOrder.id);

    // 6. Configure Square Checkout Options
    const squareCheckoutOptions = {
      allow_tipping: true,
      redirect_url: redirectUrl.toString(),
      merchant_support_email: supportEmail,
      ask_for_shipping_address: false,
      accepted_payment_methods: {
        apple_pay: true,
        google_pay: true,
        cash_app_pay: false,
        afterpay_clearpay: false,
        venmo: false,
      },
      // Custom tip settings with 5%, 10%, and 15% instead of default 15%, 20%, 25%
      tip_settings: createCateringOrderTipSettings(),
    };

    // 7. Format and validate customer data for Square Payment Link API
    let formattedCustomerData: { buyer_email: string; buyer_phone_number?: string };
    try {
      formattedCustomerData = formatCustomerDataForSquarePaymentLink({
        email: customerInfo.email,
        phone: customerInfo.phone,
        name: customerInfo.name,
      });

      console.log('Formatted customer data for Square Payment Link:', {
        buyer_email: formattedCustomerData.buyer_email,
        buyer_phone_number:
          formattedCustomerData.buyer_phone_number || 'null (optional due to validation)',
        originalPhone: customerInfo.phone,
      });
    } catch (emailError) {
      console.error('Email address formatting error:', emailError);

      await db.cateringOrder.update({
        where: { id: cateringOrder.id },
        data: {
          status: CateringStatus.CANCELLED,
          paymentStatus: PaymentStatus.FAILED,
          notes: `Email address formatting error: ${emailError instanceof Error ? emailError.message : 'Invalid email format'}`,
        },
      });

      return {
        success: false,
        error: `Invalid email address format: ${emailError instanceof Error ? emailError.message : 'Please provide a valid email address'}`,
      };
    }

    // 9. Build full Square request body
    const squareRequestBody = {
      idempotency_key: randomUUID(),
      order: {
        location_id: locationId,
        reference_id: cateringOrder.id, // Link to our DB order
        line_items: squareLineItems,
        metadata: customerInfo.customerId ? { customerId: customerInfo.customerId } : undefined,
      },
      checkout_options: squareCheckoutOptions,
      pre_populated_data: formattedCustomerData,
    };

    // 10. Call Square API to create payment link
    console.log('Calling Square Create Payment Link API for catering order...');
    const fetchResponse = await fetch(`${BASE_URL}/v2/online-checkout/payment-links`, {
      method: 'POST',
      headers: {
        'Square-Version': '2025-05-21',
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(squareRequestBody),
    });

    const responseData = await fetchResponse.json();

    // 11. Handle Square API response
    if (
      !fetchResponse.ok ||
      responseData.errors ||
      !responseData.payment_link?.url ||
      !responseData.payment_link?.order_id
    ) {
      const errorDetail =
        responseData.errors?.[0]?.detail || 'Failed to create Square payment link';
      const squareErrorCode = responseData.errors?.[0]?.code;

      console.error(
        `Square API Error (${fetchResponse.status} - ${squareErrorCode}):`,
        JSON.stringify(responseData, null, 2)
      );

      // Special handling for phone number validation errors
      if (squareErrorCode === 'INVALID_PHONE_NUMBER' && formattedCustomerData.buyer_phone_number) {
        console.log('Retrying Square payment link creation without phone number...');

        // Retry without phone number
        const retryCustomerData = {
          buyer_email: formattedCustomerData.buyer_email,
          // Omit buyer_phone_number entirely
        };

        const retryRequestBody = {
          ...squareRequestBody,
          pre_populated_data: retryCustomerData,
        };

        console.log(
          'Retry request without phone number:',
          JSON.stringify(retryRequestBody, null, 2)
        );

        const retryResponse = await fetch(`${BASE_URL}/v2/online-checkout/payment-links`, {
          method: 'POST',
          headers: {
            'Square-Version': '2025-05-21',
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(retryRequestBody),
        });

        const retryResponseData = await retryResponse.json();

        if (
          retryResponse.ok &&
          retryResponseData.payment_link?.url &&
          retryResponseData.payment_link?.order_id
        ) {
          console.log('Square payment link created successfully after removing phone number');

          // Update the order with Square information
          await db.cateringOrder.update({
            where: { id: cateringOrder.id },
            data: {
              squareOrderId: retryResponseData.payment_link.order_id,
              squareCheckoutUrl: retryResponseData.payment_link.url,
              notes: `Phone number ${customerInfo.phone} was invalid for Square, proceeded without it`,
            },
          });

          // Revalidate paths
          revalidatePath('/catering');
          revalidatePath('/admin/catering/orders');

          return {
            success: true,
            data: {
              orderId: cateringOrder.id,
              checkoutUrl: retryResponseData.payment_link.url,
            },
          };
        } else {
          console.error('Retry also failed:', JSON.stringify(retryResponseData, null, 2));
          const retryErrorDetail =
            retryResponseData.errors?.[0]?.detail ||
            'Failed to create Square payment link after retry';

          await db.cateringOrder.update({
            where: { id: cateringOrder.id },
            data: {
              status: CateringStatus.CANCELLED,
              paymentStatus: PaymentStatus.FAILED,
              notes: `Square API Error (retry failed): ${retryErrorDetail}`,
            },
          });

          return {
            success: false,
            error: `Payment provider error: ${retryErrorDetail}`,
          };
        }
      }

      await db.cateringOrder.update({
        where: { id: cateringOrder.id },
        data: {
          status: CateringStatus.CANCELLED,
          paymentStatus: PaymentStatus.FAILED,
          notes: `Square API Error: ${errorDetail} (Code: ${squareErrorCode})`,
        },
      });

      return {
        success: false,
        error: `Payment provider error: ${errorDetail}`,
      };
    }

    // 12. Store Square checkout info and return success
    const checkoutUrl = responseData.payment_link.url;
    const squareOrderId = responseData.payment_link.order_id;

    console.log(
      `Square Checkout URL for catering order: ${checkoutUrl}, Square Order ID: ${squareOrderId}`
    );

    // Update the order with Square information
    await db.cateringOrder.update({
      where: { id: cateringOrder.id },
      data: {
        squareOrderId,
        squareCheckoutUrl: checkoutUrl,
      },
    });

    // Revalidate paths
    revalidatePath('/catering');
    revalidatePath('/admin/catering/orders');

    return {
      success: true,
      data: {
        orderId: cateringOrder.id,
        checkoutUrl,
      },
    };
  } catch (error) {
    console.error('Error creating catering order with Square payment:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
}

/**
 * Creates boxed lunch packages based on the tier system
 */
export async function createBoxedLunchPackages(): Promise<{
  success: boolean;
  error?: string;
  created?: number;
}> {
  try {
    const { BOXED_LUNCH_TIERS } = await import('@/types/catering');

    let createdCount = 0;

    for (const [tierKey, tierConfig] of Object.entries(BOXED_LUNCH_TIERS)) {
      // Check if this tier package already exists
      const existingPackage = await db.cateringPackage.findFirst({
        where: {
          name: tierConfig.name,
          type: 'BOXED_LUNCH' as any, // Cast to bypass TypeScript check
        },
      });

      if (!existingPackage) {
        await db.cateringPackage.create({
          data: {
            name: tierConfig.name,
            description: tierConfig.description,
            minPeople: 1,
            pricePerPerson: tierConfig.price,
            type: 'BOXED_LUNCH' as any, // Cast to bypass TypeScript check
            isActive: true,
            featuredOrder: Object.keys(BOXED_LUNCH_TIERS).indexOf(tierKey),
            dietaryOptions: [], // You can customize this based on protein options
          },
        });
        createdCount++;
      }
    }

    return { success: true, created: createdCount };
  } catch (error) {
    console.error('Error creating boxed lunch packages:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create boxed lunch packages',
    };
  }
}

/**
 * Creates boxed lunch protein options
 */
export async function createBoxedLunchProteins(): Promise<{
  success: boolean;
  error?: string;
  created?: number;
}> {
  try {
    const { PROTEIN_OPTIONS } = await import('@/types/catering');

    let createdCount = 0;

    for (const [proteinKey, proteinInfo] of Object.entries(PROTEIN_OPTIONS)) {
      // Check if this protein already exists
      const existingItem = await db.cateringItem.findFirst({
        where: {
          name: proteinInfo.name,
          category: 'ENTREE' as any, // Use existing ENTREE category
        },
      });

      if (!existingItem) {
        await db.cateringItem.create({
          data: {
            name: proteinInfo.name,
            description: proteinInfo.description,
            price: 0, // Proteins are included in tier pricing
            category: 'ENTREE' as any, // Use existing ENTREE category
            isVegetarian: proteinInfo.dietary.includes('vegetarian'),
            isVegan: proteinInfo.dietary.includes('vegan'),
            isGlutenFree: proteinInfo.dietary.includes('gluten-free'),
            servingSize: 'Varies by tier',
            isActive: true,
            squareCategory: 'BOXED_LUNCH_PROTEINS',
          },
        });
        createdCount++;
      }
    }

    return { success: true, created: createdCount };
  } catch (error) {
    console.error('Error creating boxed lunch proteins:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create boxed lunch proteins',
    };
  }
}

/**
 * Creates boxed lunch add-on items
 */
export async function createBoxedLunchAddOns(): Promise<{
  success: boolean;
  error?: string;
  created?: number;
}> {
  try {
    const { BOXED_LUNCH_ADD_ONS } = await import('@/types/catering');

    let createdCount = 0;

    for (const addOn of Object.values(BOXED_LUNCH_ADD_ONS)) {
      // Check if this add-on already exists
      const existingItem = await db.cateringItem.findFirst({
        where: {
          name: addOn.name,
          category: 'SIDE' as any, // Use existing SIDE category
        },
      });

      if (!existingItem) {
        await db.cateringItem.create({
          data: {
            name: addOn.name,
            description: addOn.description,
            price: addOn.price,
            category: 'SIDE' as any, // Use existing SIDE category
            isVegetarian: true, // Add-ons are generally neutral
            isVegan: true,
            isGlutenFree: true,
            servingSize: '1 item',
            isActive: true,
            squareCategory: 'BOXED_LUNCH_ADD_ONS',
          },
        });
        createdCount++;
      }
    }

    return { success: true, created: createdCount };
  } catch (error) {
    console.error('Error creating boxed lunch add-ons:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create boxed lunch add-ons',
    };
  }
}

/**
 * Creates boxed lunch salad options
 */
export async function createBoxedLunchSalads(): Promise<{
  success: boolean;
  error?: string;
  created?: number;
}> {
  try {
    const { BOXED_LUNCH_SALADS } = await import('@/types/catering');

    let createdCount = 0;

    for (const [saladKey, salad] of Object.entries(BOXED_LUNCH_SALADS)) {
      // Check if this salad already exists
      const existingItem = await db.cateringItem.findFirst({
        where: {
          name: salad.name,
          category: 'SALAD' as any,
        },
      });

      if (!existingItem) {
        await db.cateringItem.create({
          data: {
            name: salad.name,
            description: salad.description,
            price: salad.price,
            category: 'SALAD' as any,
            isVegetarian: true,
            isVegan: saladKey === 'ARUGULA_JICAMA', // Only arugula-jicama is vegan (honey in dressing)
            isGlutenFree: true,
            servingSize: '3oz salad + 1oz dressing',
            isActive: true,
            squareCategory: 'BOXED_LUNCH_SALADS',
          },
        });
        createdCount++;
      }
    }

    return { success: true, created: createdCount };
  } catch (error) {
    console.error('Error creating boxed lunch salads:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create boxed lunch salads',
    };
  }
}

/**
 * Gets all boxed lunch related items (packages, salads, add-ons, proteins)
 */
export async function getBoxedLunchData(): Promise<{
  packages: CateringPackage[];
  salads: CateringItem[];
  addOns: CateringItem[];
  proteins: CateringItem[];
}> {
  try {
    const [packages, salads, addOns, proteins] = await Promise.all([
      // Use raw string instead of enum that might not exist in DB
      db.cateringPackage.findMany({
        where: {
          type: 'BOXED_LUNCH' as any, // Cast to bypass TypeScript check
          isActive: true,
        },
        orderBy: {
          featuredOrder: 'asc',
        },
      }),
      // Get all salads with the square category
      db.cateringItem.findMany({
        where: {
          category: 'SALAD' as any,
          squareCategory: 'BOXED_LUNCH_SALADS',
          isActive: true,
        },
      }),
      // Get all add-ons with the square category
      db.cateringItem.findMany({
        where: {
          category: 'SIDE' as any, // Use existing SIDE category
          squareCategory: 'BOXED_LUNCH_ADD_ONS',
          isActive: true,
        },
      }),
      // Get all proteins with the square category
      db.cateringItem.findMany({
        where: {
          category: 'ENTREE' as any, // Use existing ENTREE category
          squareCategory: 'BOXED_LUNCH_PROTEINS',
          isActive: true,
        },
      }),
    ]);

    return {
      packages: packages.map((pkg: any) => ({
        ...pkg,
        pricePerPerson: Number(pkg.pricePerPerson),
      })) as unknown as CateringPackage[],
      salads: salads.map((item: any) => ({
        ...item,
        price: Number(item.price),
      })) as unknown as CateringItem[],
      addOns: addOns.map((item: any) => ({
        ...item,
        price: Number(item.price),
      })) as unknown as CateringItem[],
      proteins: proteins.map((item: any) => ({
        ...item,
        price: Number(item.price),
      })) as unknown as CateringItem[],
    };
  } catch (error) {
    console.error('Error fetching boxed lunch data:', error);
    return {
      packages: [],
      salads: [],
      addOns: [],
      proteins: [],
    };
  }
}

/**
 * Initialize all boxed lunch data (packages, salads, add-ons, proteins)
 */
export async function initializeBoxedLunchData(): Promise<{
  success: boolean;
  error?: string;
  summary?: string;
}> {
  try {
    const [packagesResult, saladsResult, addOnsResult, proteinsResult] = await Promise.all([
      createBoxedLunchPackages(),
      createBoxedLunchSalads(),
      createBoxedLunchAddOns(),
      createBoxedLunchProteins(),
    ]);

    if (
      !packagesResult.success ||
      !saladsResult.success ||
      !addOnsResult.success ||
      !proteinsResult.success
    ) {
      const errors = [
        !packagesResult.success && packagesResult.error,
        !saladsResult.success && saladsResult.error,
        !addOnsResult.success && addOnsResult.error,
        !proteinsResult.success && proteinsResult.error,
      ].filter(Boolean);

      return {
        success: false,
        error: `Some items failed to create: ${errors.join(', ')}`,
      };
    }

    const summary = `Created ${packagesResult.created} packages, ${saladsResult.created} salads, ${addOnsResult.created} add-ons, ${proteinsResult.created} proteins`;

    return {
      success: true,
      summary,
    };
  } catch (error) {
    console.error('Error initializing boxed lunch data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize boxed lunch data',
    };
  }
}

/**
 * Validate catering order with delivery zone minimum requirements
 */
export async function validateCateringOrderWithDeliveryZone(
  items: Array<{ id: string; quantity: number; price: number }>,
  deliveryAddress?: { city?: string; postalCode?: string }
): Promise<{
  isValid: boolean;
  errorMessage?: string;
  deliveryZone?: DeliveryZone;
  minimumRequired?: number;
  currentAmount?: number;
  deliveryFee?: number;
}> {
  try {
    if (!items || items.length === 0) {
      return { isValid: false, errorMessage: 'Your cart is empty' };
    }

    // Calculate cart total
    const cartTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // For pickup orders, no delivery zone validation needed
    if (!deliveryAddress) {
      return { isValid: true, currentAmount: cartTotal };
    }

    // Determine delivery zone from address
    const deliveryZone = determineDeliveryZone(
      deliveryAddress.postalCode || '',
      deliveryAddress.city
    );

    if (!deliveryZone) {
      return {
        isValid: false,
        errorMessage:
          'Sorry, we currently do not deliver to this location. Please check our delivery zones or contact us for assistance.',
      };
    }

    // Validate minimum purchase for the zone
    const validation = validateMinimumPurchase(cartTotal, deliveryZone);
    const zoneConfig = getZoneConfig(deliveryZone);

    if (!validation.isValid) {
      return {
        isValid: false,
        errorMessage: validation.message,
        deliveryZone,
        minimumRequired: validation.minimumRequired,
        currentAmount: validation.currentAmount,
        deliveryFee: zoneConfig.deliveryFee,
      };
    }

    return {
      isValid: true,
      deliveryZone,
      minimumRequired: validation.minimumRequired,
      currentAmount: validation.currentAmount,
      deliveryFee: zoneConfig.deliveryFee,
    };
  } catch (error) {
    console.error('Error validating catering order:', error);
    return {
      isValid: false,
      errorMessage: 'An error occurred while validating your order. Please try again.',
    };
  }
}

/**
 * Server action to initialize boxed lunch data from the admin UI
 */
export async function initializeBoxedLunchDataAction(): Promise<{
  success: boolean;
  error?: string;
  summary?: string;
}> {
  'use server';

  try {
    const result = await initializeBoxedLunchData();

    if (result.success) {
      // Revalidate admin catering pages to show updated data
      revalidatePath('/admin/catering');
      revalidatePath('/admin/catering/boxed-lunch');
      revalidatePath('/catering');
    }

    return result;
  } catch (error) {
    console.error('Error in initializeBoxedLunchDataAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize boxed lunch data',
    };
  }
}
