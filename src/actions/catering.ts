'use server';

import { db } from '@/lib/db';
import { type CateringPackage, type CateringItem, CateringPackageType, CateringItemCategory } from '@/types/catering';
import { revalidatePath } from 'next/cache';

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