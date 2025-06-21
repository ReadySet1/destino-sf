'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { 
  type EnhancedCateringItem, 
  type CateringItemOverrides,
  type ItemEditCapabilities,
  ItemSource,
  CateringItemCategory
} from '@/types/catering';

/**
 * Get enhanced catering item with override data and computed final values
 */
export async function getEnhancedCateringItem(itemId: string): Promise<EnhancedCateringItem | null> {
  try {
    const item = await db.cateringItem.findUnique({
      where: { id: itemId },
      include: {
        overrides: true
      }
    });

    if (!item) return null;

    const isSquareItem = !!item.squareProductId;
    // Get the first (and only) override since there's a unique constraint on itemId
    const overrides = item.overrides?.[0];

    // Compute final values based on overrides
    const enhanced: EnhancedCateringItem = {
      ...item,
      price: Number(item.price),
      category: item.category as CateringItemCategory, // Type assertion for enum compatibility
      squareCategory: item.squareCategory || undefined, // Convert null to undefined
      isSquareItem,
      squareData: isSquareItem ? {
        originalDescription: item.description || undefined,
        originalImageUrl: (item as any).squareImageUrl || undefined,
        originalPrice: Number(item.price),
        lastSyncedAt: (item as any).lastSyncedAt || new Date()
      } : undefined,
      overrides: overrides,
      // Computed final values
      finalDescription: (overrides?.overrideDescription && overrides?.localDescription) 
        ? overrides.localDescription 
        : item.description || '',
      finalImageUrl: (overrides?.overrideImage && overrides?.localImageUrl)
        ? overrides.localImageUrl
        : item.imageUrl || (item as any).squareImageUrl || undefined,
      finalIsVegetarian: (overrides?.overrideDietary && overrides?.localIsVegetarian !== null)
        ? overrides.localIsVegetarian
        : item.isVegetarian,
      finalIsVegan: (overrides?.overrideDietary && overrides?.localIsVegan !== null)
        ? overrides.localIsVegan
        : item.isVegan,
      finalIsGlutenFree: (overrides?.overrideDietary && overrides?.localIsGlutenFree !== null)
        ? overrides.localIsGlutenFree
        : item.isGlutenFree,
      finalServingSize: (overrides?.overrideServingSize && overrides?.localServingSize)
        ? overrides.localServingSize
        : item.servingSize || undefined
    };

    return enhanced;
  } catch (error) {
    console.error(`Error fetching enhanced catering item ${itemId}:`, error);
    return null;
  }
}

/**
 * Get edit capabilities for a catering item based on its source
 */
export async function getItemEditCapabilities(itemId: string): Promise<ItemEditCapabilities> {
  try {
    const item = await db.cateringItem.findUnique({
      where: { id: itemId },
      select: { squareProductId: true, squareCategory: true }
    });

    if (!item) {
      throw new Error('Item not found');
    }

    const isSquareItem = !!item.squareProductId;
    const source = isSquareItem ? ItemSource.SQUARE : ItemSource.LOCAL;

    if (isSquareItem) {
      // Square items: Limited editing with override system
      return {
        canEditName: false, // Name syncs from Square
        canEditDescription: true, // Can override locally
        canEditPrice: false, // Price syncs from Square
        canEditCategory: false, // Category syncs from Square
        canEditDietary: true, // Can override locally
        canEditImage: true, // Can override locally
        canEditServingSize: true, // Can override locally
        canEditActive: true, // Can deactivate locally
        source,
        warnings: [
          'This item syncs from Square. Name, price, and category will be overwritten during sync.',
          'Use local overrides for description, dietary info, and images.'
        ]
      };
    } else {
      // Local items: Full editing capabilities
      return {
        canEditName: true,
        canEditDescription: true,
        canEditPrice: true,
        canEditCategory: true,
        canEditDietary: true,
        canEditImage: true,
        canEditServingSize: true,
        canEditActive: true,
        source,
        warnings: []
      };
    }
  } catch (error) {
    console.error(`Error getting edit capabilities for item ${itemId}:`, error);
    return {
      canEditName: false,
      canEditDescription: false,
      canEditPrice: false,
      canEditCategory: false,
      canEditDietary: false,
      canEditImage: false,
      canEditServingSize: false,
      canEditActive: false,
      source: ItemSource.LOCAL,
      warnings: ['Error determining edit capabilities']
    };
  }
}

/**
 * Update catering item with Smart Override System
 */
export async function updateCateringItemWithOverrides(
  itemId: string,
  data: {
    // Direct fields (only allowed for local items)
    name?: string;
    price?: number;
    category?: string;
    isActive?: boolean;
    // Override fields (for Square items)
    localDescription?: string;
    localImageUrl?: string;
    localIsVegetarian?: boolean;
    localIsVegan?: boolean;
    localIsGlutenFree?: boolean;
    localServingSize?: string;
    // Control what gets overridden
    overrideDescription?: boolean;
    overrideImage?: boolean;
    overrideDietary?: boolean;
    overrideServingSize?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const capabilities = await getItemEditCapabilities(itemId);
    
    // Get current item
    const item = await db.cateringItem.findUnique({
      where: { id: itemId },
      include: { overrides: true }
    });

    if (!item) {
      return { success: false, error: 'Item not found' };
    }

    const isSquareItem = capabilities.source === ItemSource.SQUARE;

    if (isSquareItem) {
      // Handle Square item with overrides
      const overrideData: any = {};
      const overrideFlags: any = {};

      // Handle description override
      if (data.localDescription !== undefined) {
        overrideData.localDescription = data.localDescription;
        overrideFlags.overrideDescription = data.overrideDescription ?? true;
      }

      // Handle image override
      if (data.localImageUrl !== undefined) {
        overrideData.localImageUrl = data.localImageUrl;
        overrideFlags.overrideImage = data.overrideImage ?? true;
      }

      // Handle dietary overrides
      if (data.localIsVegetarian !== undefined || 
          data.localIsVegan !== undefined || 
          data.localIsGlutenFree !== undefined) {
        if (data.localIsVegetarian !== undefined) overrideData.localIsVegetarian = data.localIsVegetarian;
        if (data.localIsVegan !== undefined) overrideData.localIsVegan = data.localIsVegan;
        if (data.localIsGlutenFree !== undefined) overrideData.localIsGlutenFree = data.localIsGlutenFree;
        overrideFlags.overrideDietary = data.overrideDietary ?? true;
      }

      // Handle serving size override
      if (data.localServingSize !== undefined) {
        overrideData.localServingSize = data.localServingSize;
        overrideFlags.overrideServingSize = data.overrideServingSize ?? true;
      }

      // Update or create overrides
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

      // Update allowed direct fields for Square items
      const allowedUpdates: any = {};
      if (data.isActive !== undefined && capabilities.canEditActive) {
        allowedUpdates.isActive = data.isActive;
      }

      if (Object.keys(allowedUpdates).length > 0) {
        await db.cateringItem.update({
          where: { id: itemId },
          data: allowedUpdates
        });
      }

    } else {
      // Handle local item - direct updates
      const updateData: any = {};
      
      if (data.name !== undefined && capabilities.canEditName) updateData.name = data.name;
      if (data.price !== undefined && capabilities.canEditPrice) updateData.price = data.price;
      if (data.category !== undefined && capabilities.canEditCategory) updateData.category = data.category;
      if (data.isActive !== undefined && capabilities.canEditActive) updateData.isActive = data.isActive;
      
      // For local items, use override fields as direct updates
      if (data.localDescription !== undefined && capabilities.canEditDescription) {
        updateData.description = data.localDescription;
      }
      if (data.localImageUrl !== undefined && capabilities.canEditImage) {
        updateData.imageUrl = data.localImageUrl;
      }
      if (data.localIsVegetarian !== undefined && capabilities.canEditDietary) {
        updateData.isVegetarian = data.localIsVegetarian;
      }
      if (data.localIsVegan !== undefined && capabilities.canEditDietary) {
        updateData.isVegan = data.localIsVegan;
      }
      if (data.localIsGlutenFree !== undefined && capabilities.canEditDietary) {
        updateData.isGlutenFree = data.localIsGlutenFree;
      }
      if (data.localServingSize !== undefined && capabilities.canEditServingSize) {
        updateData.servingSize = data.localServingSize;
      }

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
 * Remove specific overrides from a Square item
 */
export async function removeItemOverrides(
  itemId: string,
  overridesToRemove: Array<'description' | 'image' | 'dietary' | 'servingSize'>
): Promise<{ success: boolean; error?: string }> {
  try {
    const overrides = await db.cateringItemOverrides.findUnique({
      where: { itemId }
    });

    if (!overrides) {
      return { success: true }; // Nothing to remove
    }

    const updates: any = {};
    
    for (const override of overridesToRemove) {
      switch (override) {
        case 'description':
          updates.overrideDescription = false;
          updates.localDescription = null;
          break;
        case 'image':
          updates.overrideImage = false;
          updates.localImageUrl = null;
          break;
        case 'dietary':
          updates.overrideDietary = false;
          updates.localIsVegetarian = null;
          updates.localIsVegan = null;
          updates.localIsGlutenFree = null;
          break;
        case 'servingSize':
          updates.overrideServingSize = false;
          updates.localServingSize = null;
          break;
      }
    }

    await db.cateringItemOverrides.update({
      where: { itemId },
      data: updates
    });

    // Revalidate paths
    revalidatePath('/admin/catering');
    revalidatePath('/catering');

    return { success: true };
  } catch (error) {
    console.error(`Error removing overrides for item ${itemId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to remove overrides' 
    };
  }
}

/**
 * Convert a Square item to a local item (detach from Square)
 */
export async function convertSquareItemToLocal(itemId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const item = await db.cateringItem.findUnique({
      where: { id: itemId },
      include: { overrides: true }
    });

    if (!item) {
      return { success: false, error: 'Item not found' };
    }

    if (!item.squareProductId) {
      return { success: false, error: 'Item is already local' };
    }

    // Get the first (and only) override since there's a unique constraint on itemId
    const override = item.overrides?.[0];

    // Apply all current overrides as permanent values
    const updates: any = {
      squareProductId: null,
      squareCategory: null,
      squareImageUrl: null,
      lastSyncedAt: null
    };

    if (override) {
      if (override.overrideDescription && override.localDescription) {
        updates.description = override.localDescription;
      }
      if (override.overrideImage && override.localImageUrl) {
        updates.imageUrl = override.localImageUrl;
      }
      if (override.overrideDietary) {
        if (override.localIsVegetarian !== null) updates.isVegetarian = override.localIsVegetarian;
        if (override.localIsVegan !== null) updates.isVegan = override.localIsVegan;
        if (override.localIsGlutenFree !== null) updates.isGlutenFree = override.localIsGlutenFree;
      }
      if (override.overrideServingSize && override.localServingSize) {
        updates.servingSize = override.localServingSize;
      }
    }

    // Update item and remove overrides
    await db.$transaction([
      db.cateringItem.update({
        where: { id: itemId },
        data: updates
      }),
      db.cateringItemOverrides.deleteMany({
        where: { itemId }
      })
    ]);

    // Revalidate paths
    revalidatePath('/admin/catering');
    revalidatePath('/catering');

    return { success: true };
  } catch (error) {
    console.error(`Error converting Square item ${itemId} to local:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to convert item to local' 
    };
  }
} 