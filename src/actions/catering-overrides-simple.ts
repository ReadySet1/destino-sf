'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

/**
 * Check if an item is from Square (has squareProductId)
 */
export async function isSquareItem(itemId: string): Promise<boolean> {
  try {
    const item = await db.cateringItem.findUnique({
      where: { id: itemId },
      select: { squareProductId: true }
    });
    
    return !!(item as any)?.squareProductId;
  } catch (error) {
    console.error('Error checking if item is from Square:', error);
    return false;
  }
}

/**
 * Get item with override information
 */
export async function getCateringItemWithOverrides(itemId: string) {
  try {
    const item = await db.cateringItem.findUnique({
      where: { id: itemId },
      include: {
        overrides: true
      }
    });

    if (!item) return null;

    const isFromSquare = !!(item as any).squareProductId;
    
    // Get the first (and only) override since there's a unique constraint on itemId
    const override = Array.isArray(item.overrides) ? item.overrides[0] : undefined;
    
    return {
      ...item,
      price: Number(item.price),
      isSquareItem: isFromSquare,
      // Computed final values
      finalDescription: (override?.overrideDescription && override?.localDescription) 
        ? override.localDescription 
        : item.description || '',
      finalImageUrl: (override?.overrideImage && override?.localImageUrl)
        ? override.localImageUrl
        : item.imageUrl || (item as any).squareImageUrl || undefined,
      finalIsVegetarian: (override?.overrideDietary && override?.localIsVegetarian !== null)
        ? override.localIsVegetarian
        : item.isVegetarian,
      finalIsVegan: (override?.overrideDietary && override?.localIsVegan !== null)
        ? override.localIsVegan
        : item.isVegan,
      finalIsGlutenFree: (override?.overrideDietary && override?.localIsGlutenFree !== null)
        ? override.localIsGlutenFree
        : item.isGlutenFree,
      finalServingSize: (override?.overrideServingSize && override?.localServingSize)
        ? override.localServingSize
        : item.servingSize || undefined
    };
  } catch (error) {
    console.error('Error fetching item with overrides:', error);
    return null;
  }
}

/**
 * Update catering item (simplified version)
 */
export async function updateCateringItemSimple(
  itemId: string,
  data: {
    name?: string;
    description?: string;
    price?: number;
    category?: string;
    isVegetarian?: boolean;
    isVegan?: boolean;
    isGlutenFree?: boolean;
    servingSize?: string;
    imageUrl?: string;
    isActive?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const isFromSquare = await isSquareItem(itemId);
    
    if (isFromSquare) {
      // For Square items, only allow certain direct updates
      const allowedUpdates: any = {};
      if (data.isActive !== undefined) allowedUpdates.isActive = data.isActive;
      
      // Create/update overrides for other fields
      const overrideData: any = {};
      const overrideFlags: any = {};
      
      if (data.description !== undefined) {
        overrideData.localDescription = data.description;
        overrideFlags.overrideDescription = true;
      }
      if (data.imageUrl !== undefined) {
        overrideData.localImageUrl = data.imageUrl;
        overrideFlags.overrideImage = true;
      }
      if (data.isVegetarian !== undefined || data.isVegan !== undefined || data.isGlutenFree !== undefined) {
        if (data.isVegetarian !== undefined) overrideData.localIsVegetarian = data.isVegetarian;
        if (data.isVegan !== undefined) overrideData.localIsVegan = data.isVegan;
        if (data.isGlutenFree !== undefined) overrideData.localIsGlutenFree = data.isGlutenFree;
        overrideFlags.overrideDietary = true;
      }
      if (data.servingSize !== undefined) {
        overrideData.localServingSize = data.servingSize;
        overrideFlags.overrideServingSize = true;
      }
      
      // Update main item if needed
      if (Object.keys(allowedUpdates).length > 0) {
        await db.cateringItem.update({
          where: { id: itemId },
          data: allowedUpdates
        });
      }
      
      // Update or create overrides if needed
      if (Object.keys(overrideData).length > 0) {
        await db.cateringItemOverrides.upsert({
          where: { itemId },
          update: {
            ...overrideData,
            ...overrideFlags,
            updatedAt: new Date()
          },
          create: {
            itemId,
            ...overrideData,
            ...overrideFlags
          }
        });
      }
      
    } else {
      // For local items, update directly
      const updateData: any = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.price !== undefined) updateData.price = data.price;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.isVegetarian !== undefined) updateData.isVegetarian = data.isVegetarian;
      if (data.isVegan !== undefined) updateData.isVegan = data.isVegan;
      if (data.isGlutenFree !== undefined) updateData.isGlutenFree = data.isGlutenFree;
      if (data.servingSize !== undefined) updateData.servingSize = data.servingSize;
      if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      if (Object.keys(updateData).length > 0) {
        await db.cateringItem.update({
          where: { id: itemId },
          data: updateData
        });
      }
    }

    // Revalidate paths
    revalidatePath('/admin/catering');
    revalidatePath('/catering');

    return { success: true };
  } catch (error) {
    console.error(`Error updating catering item ${itemId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update item' 
    };
  }
}

/**
 * Get simple edit capabilities
 */
export async function getSimpleEditCapabilities(itemId: string) {
  try {
    const isFromSquare = await isSquareItem(itemId);
    
    return {
      isSquareItem: isFromSquare,
      canEditName: !isFromSquare,
      canEditPrice: !isFromSquare,
      canEditCategory: !isFromSquare,
      canEditDescription: true, // Both can edit (override for Square)
      canEditDietary: true, // Both can edit (override for Square)
      canEditImage: true, // Both can edit (override for Square)
      canEditServingSize: true, // Both can edit (override for Square)
      canEditActive: true, // Both can edit
      warnings: isFromSquare ? [
        'This item syncs from Square. Name, price, and category will be overwritten during sync.',
        'Changes to description, dietary info, and images are stored as local overrides.'
      ] : []
    };
  } catch (error) {
    console.error('Error getting edit capabilities:', error);
    return {
      isSquareItem: false,
      canEditName: false,
      canEditPrice: false,
      canEditCategory: false,
      canEditDescription: false,
      canEditDietary: false,
      canEditImage: false,
      canEditServingSize: false,
      canEditActive: false,
      warnings: ['Error determining edit capabilities']
    };
  }
} 