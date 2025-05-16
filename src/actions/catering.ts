'use server';

import { db } from '@/lib/db';
import { type CateringPackage, type CateringItem, CateringPackageType, CateringItemCategory } from '@/types/catering';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { PaymentMethod, CateringStatus, PaymentStatus } from '@prisma/client';
import { z } from 'zod';

/**
 * Fetches all active catering packages with their ratings
 */
export async function getCateringPackages(): Promise<CateringPackage[]> {
  try {
    const packages = await db.cateringPackage.findMany({
      where: {
        isActive: true,
      },
      include: {
        ratings: true,
      },
      orderBy: {
        featuredOrder: 'asc',
      },
    });
    
    return packages.map(pkg => ({
      ...pkg,
      pricePerPerson: Number(pkg.pricePerPerson)
    })) as unknown as CateringPackage[];
  } catch (error) {
    console.error('Error fetching catering packages:', error);
    throw new Error('Failed to fetch catering packages');
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
      items: cateringPackage.items.map(item => ({
        ...item,
        cateringItem: item.cateringItem ? {
          ...item.cateringItem,
          price: Number(item.cateringItem.price)
        } : undefined
      }))
    } as unknown as CateringPackage;
  } catch (error) {
    console.error(`Error fetching catering package with ID ${packageId}:`, error);
    throw new Error(`Failed to fetch catering package with ID ${packageId}`);
  }
}

/**
 * Fetches all active catering items
 */
export async function getCateringItems(): Promise<CateringItem[]> {
  try {
    const items = await db.cateringItem.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        category: 'asc',
      },
    });
    
    return items.map(item => ({
      ...item,
      price: Number(item.price)
    })) as unknown as CateringItem[];
  } catch (error) {
    console.error('Error fetching catering items:', error);
    throw new Error('Failed to fetch catering items');
  }
}

/**
 * Fetches catering items by category
 */
export async function getCateringItemsByCategory(category: CateringItemCategory): Promise<CateringItem[]> {
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
    
    return items.map(item => ({
      ...item,
      price: Number(item.price)
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
                create: data.items.map((item) => ({
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
        name: categoryName
      }
    });
    
    if (!category) {
      console.warn(`Square category ${categoryName} not found`);
      return [];
    }
    
    // Get products that belong to this category
    const products = await db.product.findMany({
      where: {
        categoryId: category.id,
        active: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    return products.map(product => ({
      ...product,
      price: Number(product.price)
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
          startsWith: 'CATERING-'
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    return categories;
  } catch (error) {
    console.error('Error fetching catering categories:', error);
    throw new Error('Failed to fetch catering categories');
  }
}

// Schema for catering order validation
const CateringOrderItemSchema = z.object({
  itemType: z.enum(['package', 'item']),
  itemId: z.string().uuid(),
  name: z.string(),
  quantity: z.number().int().positive(),
  pricePerUnit: z.number().positive(),
  totalPrice: z.number().positive(),
  notes: z.string().optional().nullable(),
});

const CateringOrderSchema = z.object({
  customerInfo: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(7),
    customerId: z.string().uuid().optional().nullable(),
  }),
  eventDetails: z.object({
    eventDate: z.string().transform(str => new Date(str)),
    numberOfPeople: z.number().int().min(1),
    specialRequests: z.string().optional().nullable(),
  }),
  items: z.array(CateringOrderItemSchema),
  totalAmount: z.number().positive(),
});

export type ServerActionResult<T = unknown> = Promise<
  | { success: true; data: T }
  | { success: false; error: string }
>;

/**
 * Creates a catering order and generates a Square checkout URL
 */
export async function createCateringOrderAndProcessPayment(
  formData: z.infer<typeof CateringOrderSchema>
): Promise<ServerActionResult<{ orderId: string; checkoutUrl?: string }>> {
  try {
    const { customerInfo, eventDetails, items, totalAmount } = formData;
    
    console.log('Creating catering order with Square payment processing...');
    
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
        totalAmount: totalAmount,
        status: CateringStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        paymentMethod: PaymentMethod.SQUARE,
        items: {
          create: items.map(item => ({
            itemType: item.itemType,
            itemId: item.itemId,
            name: item.name,
            quantity: item.quantity,
            pricePerUnit: item.pricePerUnit,
            totalPrice: item.totalPrice,
            notes: item.notes || undefined,
          })),
        },
      },
    });
    
    console.log(`Catering order created with ID: ${cateringOrder.id}`);
    
    // 2. Get Square configuration
    const squareEnv = process.env.USE_SQUARE_SANDBOX === 'true' ? 'sandbox' : 'production';
    const accessToken = squareEnv === 'sandbox' 
      ? process.env.SQUARE_SANDBOX_TOKEN 
      : process.env.SQUARE_ACCESS_TOKEN;
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
          notes: 'Square config error (missing credentials)'
        }
      });
      
      return { 
        success: false, 
        error: 'Payment provider configuration error.'
      };
    }
    
    // 3. Set up Square API base URL
    const BASE_URL = squareEnv === 'sandbox'
      ? 'https://connect.squareupsandbox.com'
      : 'https://connect.squareup.com';
      
    // 4. Prepare Square Line Items
    const squareLineItems = items.map(item => ({
      quantity: item.quantity.toString(),
      base_price_money: {
        amount: Math.round(item.pricePerUnit * 100), // Convert to cents
        currency: "USD"
      },
      name: item.name,
    }));
    
    // 5. Set up redirect URLs
    const origin = process.env.NEXT_PUBLIC_APP_URL;
    if (!origin) {
      console.error('Server Action Config Error: NEXT_PUBLIC_APP_URL is not set.');
      
      await db.cateringOrder.update({
        where: { id: cateringOrder.id },
        data: { 
          status: CateringStatus.CANCELLED,
          paymentStatus: PaymentStatus.FAILED,
          notes: 'Missing base URL config'
        }
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
        venmo: true
      },
    };
    
    // 7. Build full Square request body
    const squareRequestBody = {
      idempotency_key: randomUUID(),
      order: {
        location_id: locationId,
        reference_id: cateringOrder.id, // Link to our DB order
        line_items: squareLineItems,
        metadata: customerInfo.customerId 
          ? { customerId: customerInfo.customerId } 
          : undefined,
      },
      checkout_options: squareCheckoutOptions,
      pre_populated_data: { 
        buyer_email: customerInfo.email,
        buyer_phone_number: customerInfo.phone,
      }
    };
    
    // 8. Call Square API to create payment link
    console.log("Calling Square Create Payment Link API for catering order...");
    const fetchResponse = await fetch(`${BASE_URL}/v2/online-checkout/payment-links`, {
      method: 'POST',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(squareRequestBody),
    });
    
    const responseData = await fetchResponse.json();
    
    // 9. Handle Square API response
    if (!fetchResponse.ok || responseData.errors || !responseData.payment_link?.url || !responseData.payment_link?.order_id) {
      const errorDetail = responseData.errors?.[0]?.detail || 'Failed to create Square payment link';
      const squareErrorCode = responseData.errors?.[0]?.code;
      
      console.error(`Square API Error (${fetchResponse.status} - ${squareErrorCode}):`, JSON.stringify(responseData, null, 2));
      
      await db.cateringOrder.update({
        where: { id: cateringOrder.id },
        data: { 
          status: CateringStatus.CANCELLED,
          paymentStatus: PaymentStatus.FAILED,
          notes: `Square API Error: ${errorDetail} (Code: ${squareErrorCode})`
        }
      });
      
      return { 
        success: false, 
        error: `Payment provider error: ${errorDetail}`,
      };
    }
    
    // 10. Store Square checkout info and return success
    const checkoutUrl = responseData.payment_link.url;
    const squareOrderId = responseData.payment_link.order_id;
    
    console.log(`Square Checkout URL for catering order: ${checkoutUrl}, Square Order ID: ${squareOrderId}`);
    
    // Update the order with Square information
    await db.cateringOrder.update({
      where: { id: cateringOrder.id },
      data: {
        squareOrderId,
        squareCheckoutUrl: checkoutUrl,
      }
    });
    
    // Revalidate paths
    revalidatePath('/catering');
    revalidatePath('/admin/catering/orders');
    
    return {
      success: true,
      data: {
        orderId: cateringOrder.id,
        checkoutUrl,
      }
    };
  } catch (error) {
    console.error('Error creating catering order with Square payment:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
} 