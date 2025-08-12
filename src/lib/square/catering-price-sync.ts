// src/lib/square/catering-price-sync.ts

import { squareClient } from '@/lib/square/client';
import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';

export interface CateringImageSyncResult {
  updated: number;
  errors: string[];
}

export class CateringImageSyncService {
  private client: any;
  
  constructor() {
    this.client = squareClient;
  }
  
  /**
   * Sync images and availability from Square for catering appetizers
   * This only updates images and availability - pricing is package-based, not individual
   */
  async syncImagesAndAvailability(): Promise<CateringImageSyncResult> {
    const result: CateringImageSyncResult = {
      updated: 0,
      errors: []
    };
    
    try {
      logger.info('🚀 Starting catering image sync...');
      
      // Fetch all catalog items and filter by category (similar to working sync examples)
      const response = await this.client.catalogApi.searchCatalogObjects({
        object_types: ['ITEM', 'CATEGORY'],
        include_related_objects: true,
        include_deleted_objects: false,
        limit: 1000
      });
      
      const allObjects = response?.result?.objects || [];
      const relatedObjects = response?.result?.related_objects || [];
      
      // Filter only ITEM objects 
      const allItems = allObjects.filter((obj: any) => obj.type === 'ITEM');
      
      // Find the CATERING- APPETIZERS category ID (try multiple variations)
      const allCategories = [...allObjects, ...relatedObjects].filter((obj: any) => obj.type === 'CATEGORY');
      const possibleCategoryNames = [
        'CATERING- APPETIZERS',
        'CATERING-APPETIZERS', 
        'CATERING APPETIZERS',
        'Catering - Appetizers',
        'Catering Appetizers'
      ];
      
      const cateringCategory = allCategories.find(cat => 
        possibleCategoryNames.some(name => 
          cat.category_data?.name?.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(cat.category_data?.name?.toLowerCase() || '')
        )
      );
      
      let squareItems = allItems;
      
      // If we found the catering category, filter items by that category
      if (cateringCategory) {
        logger.info(`📂 Found CATERING- APPETIZERS category: ${cateringCategory.id}`);
        squareItems = allItems.filter((item: any) => {
          // Check if item belongs to the catering category using categories array
          const itemCategories = item.item_data?.categories || [];
          return itemCategories.some((cat: any) => cat.id === cateringCategory.id);
        });
      } else {
        logger.warn('⚠️  CATERING- APPETIZERS category not found, processing all items');
        // Log available categories for debugging
        logger.info(`📂 Available categories (${allCategories.length}):`, 
          allCategories.map(cat => ({
            id: cat.id,
            name: cat.category_data?.name
          }))
        );
        logger.info('🔍 Will attempt to match items by name instead of category');
      }
      
      logger.info(`📦 Found ${squareItems.length} items in CATERING- APPETIZERS category`);
      
      // Update images and availability for matched items
      for (const squareItem of squareItems) {
        try {
          const itemName = squareItem.item_data?.name;
          if (!itemName) {
            logger.warn('Square item missing name, skipping');
            continue;
          }
          
          // Find matching catering item by Square ID or name
          const cateringItem = await prisma.cateringItem.findFirst({
            where: {
              OR: [
                { squareItemId: squareItem.id },
                { squareProductId: itemName },
                { name: { equals: itemName, mode: 'insensitive' } }
              ],
              category: 'APPETIZER'
            }
          });
          
          if (!cateringItem) {
            const errorMsg = `No match found for Square item: ${itemName}`;
            logger.warn(errorMsg);
            result.errors.push(errorMsg);
            continue;
          }
          
          // Extract image URL and availability from Square
          const imageUrl = this.extractImageUrl(squareItem, relatedObjects);
          const isAvailable = !squareItem.item_data?.is_deleted;
          
          // Prepare update data - no price updates for package-based items
          const updateData: any = {
            isActive: isAvailable,
            squareItemId: squareItem.id, // Store Square ID for future syncs
            lastSquareSync: new Date(),
            sourceType: 'MERGED', // Static data + Square images
            updatedAt: new Date()
          };
          
          // Update image URL if available
          if (imageUrl) {
            updateData.imageUrl = imageUrl;
          }
          
          // Update the catering item
          await prisma.cateringItem.update({
            where: { id: cateringItem.id },
            data: updateData
          });
          
          result.updated++;
          const imageStatus = imageUrl ? 'image updated' : 'no image';
          logger.info(`✅ Updated ${itemName}: ${imageStatus} (${isAvailable ? 'available' : 'unavailable'})`);
          
        } catch (error) {
          const errorMsg = `Failed to update ${squareItem.item_data?.name}: ${error}`;
          logger.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }
      
      logger.info(`✅ Image sync completed: ${result.updated} items updated, ${result.errors.length} errors`);
      return result;
      
    } catch (error) {
      logger.error('❌ Image sync failed:', error);
      throw error;
    }
  }
  
  /**
   * Get summary of catering items and their Square sync status
   */
  async getSyncStatus(): Promise<{
    totalItems: number;
    matchedItems: number;
    unmatchedItems: number;
    lastSyncTimes: Date[];
  }> {
    try {
      const items = await prisma.cateringItem.findMany({
        where: { category: 'APPETIZER' },
        select: {
          id: true,
          name: true,
          squareItemId: true,
          squareProductId: true,
          lastSquareSync: true
        }
      });
      
      const matchedItems = items.filter(item => 
        item.squareItemId || item.squareProductId
      ).length;
      
      const lastSyncTimes = items
        .map(item => item.lastSquareSync)
        .filter((date): date is Date => date !== null);
      
      return {
        totalItems: items.length,
        matchedItems,
        unmatchedItems: items.length - matchedItems,
        lastSyncTimes
      };
      
    } catch (error) {
      logger.error('Failed to get sync status:', error);
      throw error;
    }
  }
  
  /**
   * Extract price information from Square item data
   */
  private extractPriceInfo(itemData: any): { price: number; hasFixedPrice: boolean } {
    const variations = itemData?.variations || [];
    if (variations.length > 0) {
      const variation = variations[0].item_variation_data;
      
      // Handle FIXED_PRICING items
      if (variation?.pricing_type === 'FIXED_PRICING' && variation?.price_money?.amount) {
        const price = parseInt(variation.price_money.amount.toString()) / 100;
        return { price, hasFixedPrice: true };
      }
      
      // Handle VARIABLE_PRICING items - these don't have fixed prices
      if (variation?.pricing_type === 'VARIABLE_PRICING') {
        logger.info(`Item has variable pricing, keeping existing price: ${itemData?.name}`);
        return { price: 0, hasFixedPrice: false };
      }
      
      // Fallback for legacy format
      const priceData = variation?.price_money;
      if (priceData?.amount) {
        const price = parseInt(priceData.amount.toString()) / 100;
        return { price, hasFixedPrice: true };
      }
    }
    return { price: 0, hasFixedPrice: false };
  }
  
  /**
   * Extract image URL from Square item and related objects
   */
  private extractImageUrl(squareItem: any, relatedObjects: any[]): string | undefined {
    // First, check if the item has image_ids
    const imageIds = squareItem.item_data?.image_ids || [];
    
    if (imageIds.length > 0) {
      // Find the first matching image in related objects
      const imageObject = relatedObjects.find((obj: any) => 
        obj.type === 'IMAGE' && imageIds.includes(obj.id)
      );
      
      if (imageObject?.image_data?.url) {
        return imageObject.image_data.url;
      }
    }
    
    // Fallback: check ecom_image_uris if available
    const ecomImageUris = squareItem.item_data?.ecom_image_uris || [];
    if (ecomImageUris.length > 0) {
      return ecomImageUris[0];
    }
    
    return undefined;
  }
}
