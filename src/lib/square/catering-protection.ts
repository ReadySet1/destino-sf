/**
 * Catering Protection Service
 * 
 * This service ensures that all catering items, packages, and custom implementations
 * are protected from modification during Square sync operations.
 */

import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';
import { CateringProtection, FILTERED_SYNC_CONFIG } from '@/types/square-sync';

export class CateringProtectionService {
  private protection: CateringProtection | null = null;

  /**
   * Initialize catering protection by identifying all items that should be protected
   */
  async initialize(): Promise<CateringProtection> {
    try {
      logger.info('🛡️ Initializing catering protection...');

      // Get all catering items that reference Square product IDs
      const cateringItems = await prisma.cateringItem.findMany({
        where: {
          squareProductId: { not: null }
        },
        select: {
          id: true,
          squareProductId: true,
          name: true,
          imageUrl: true
        }
      });

      // Get all catering packages
      const cateringPackages = await prisma.cateringPackage.findMany({
        select: {
          id: true,
          name: true
        }
      });

      // Get all products in protected categories
      const protectedProducts = await prisma.product.findMany({
        where: {
          category: {
            name: {
              in: FILTERED_SYNC_CONFIG.protectedCategories
            }
          }
        },
        select: {
          id: true,
          name: true,
          squareId: true,
          category: {
            select: {
              name: true
            }
          }
        }
      });

      // Get products with $0.00 price that are NOT in retail categories (likely catering items)
      const zeroPriceProducts = await prisma.product.findMany({
        where: {
          price: 0,
          AND: {
            category: {
              name: {
                notIn: ['ALFAJORES', 'EMPANADAS', 'Products'] // Don't protect retail categories
              }
            }
          }
        },
        select: {
          id: true,
          name: true,
          squareId: true,
          category: {
            select: {
              name: true
            }
          }
        }
      });

      // Filter out any retail products that might have been incorrectly included
      const allProtectedProductIds = [
        ...cateringItems.map(item => item.id),
        ...protectedProducts.map(product => product.id),
        ...zeroPriceProducts.map(product => product.id)
      ];

      // Remove duplicates and ensure we don't protect retail categories
      const filteredProtectedIds = [...new Set(allProtectedProductIds)];

      this.protection = {
        itemIds: filteredProtectedIds,
        packageIds: cateringPackages.map(pkg => pkg.id),
        preserveImages: true,
        protectedCategoryNames: FILTERED_SYNC_CONFIG.protectedCategories
      };

      logger.info(`🛡️ Protection initialized:`, {
        protectedItems: this.protection.itemIds.length,
        protectedPackages: this.protection.packageIds.length,
        cateringItemsWithSquareIds: cateringItems.length,
        zeroPriceProductsInNonRetailCategories: zeroPriceProducts.length,
        protectedCategories: FILTERED_SYNC_CONFIG.protectedCategories.length
      });

      return this.protection;
    } catch (error) {
      logger.error('❌ Failed to initialize catering protection:', error);
      throw new Error(`Catering protection initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a product should be protected from sync operations
   */
  async isProductProtected(productId: string, squareId?: string, categoryName?: string): Promise<boolean> {
    if (!this.protection) {
      await this.initialize();
    }

    // FIRST: Allow retail categories to sync even if they have other protection flags
    if (categoryName && ['ALFAJORES', 'EMPANADAS', 'Products'].includes(categoryName)) {
      logger.debug(`✅ Allowing retail category "${categoryName}" to sync`);
      return false;
    }

    // Check if product ID is in protected list
    if (this.protection!.itemIds.includes(productId)) {
      return true;
    }

    // Check if category is protected (catering categories)
    if (categoryName && this.protection!.protectedCategoryNames.some(cat => 
      categoryName.toUpperCase().startsWith(cat.toUpperCase())
    )) {
      return true;
    }

    // Check if this is a catering item with Square ID
    if (squareId) {
      const cateringItem = await prisma.cateringItem.findFirst({
        where: { squareProductId: squareId }
      });
      
      if (cateringItem) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a package should be protected
   */
  isPackageProtected(packageId: string): boolean {
    if (!this.protection) {
      throw new Error('Catering protection not initialized');
    }
    
    return this.protection.packageIds.includes(packageId);
  }

  /**
   * Validate that a sync operation won't affect protected items
   */
  async validateSyncOperation(productIds: string[]): Promise<{
    isValid: boolean;
    protectedItems: string[];
    errors: string[];
  }> {
    try {
      if (!this.protection) {
        await this.initialize();
      }

      const protectedItems: string[] = [];
      const errors: string[] = [];

      for (const productId of productIds) {
        const product = await prisma.product.findUnique({
          where: { id: productId },
          include: { category: true }
        });

        if (product) {
          const isProtected = await this.isProductProtected(
            productId, 
            product.squareId || undefined, 
            product.category?.name
          );

          if (isProtected) {
            protectedItems.push(productId);
            errors.push(`Product "${product.name}" is protected and cannot be modified`);
          }
        }
      }

      return {
        isValid: protectedItems.length === 0,
        protectedItems,
        errors
      };
    } catch (error) {
      logger.error('❌ Failed to validate sync operation:', error);
      return {
        isValid: false,
        protectedItems: [],
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Backup catering images before sync operation
   */
  async backupCateringImages(): Promise<Record<string, string>> {
    try {
      logger.info('📷 Creating backup of catering images...');

      const cateringItems = await prisma.cateringItem.findMany({
        where: {
          imageUrl: { not: null }
        },
        select: {
          id: true,
          name: true,
          imageUrl: true,
          squareProductId: true
        }
      });

      const backup: Record<string, string> = {};
      
      for (const item of cateringItems) {
        if (item.imageUrl) {
          backup[item.id] = item.imageUrl;
          if (item.squareProductId) {
            backup[`square_${item.squareProductId}`] = item.imageUrl;
          }
        }
      }

      logger.info(`📷 Backed up ${Object.keys(backup).length} catering images`);
      return backup;
    } catch (error) {
      logger.error('❌ Failed to backup catering images:', error);
      throw error;
    }
  }

  /**
   * Restore catering images after sync operation
   */
  async restoreCateringImages(backup: Record<string, string>): Promise<{
    restored: number;
    skipped: number;
    errors: string[];
  }> {
    try {
      logger.info('🔄 Restoring catering images from backup...');

      let restored = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const [itemId, imageUrl] of Object.entries(backup)) {
        try {
          if (itemId.startsWith('square_')) {
            // Handle Square ID based restoration
            const squareProductId = itemId.replace('square_', '');
            const updated = await prisma.cateringItem.updateMany({
              where: { squareProductId },
              data: { imageUrl }
            });
            
            if (updated.count > 0) {
              restored += updated.count;
            } else {
              skipped++;
            }
          } else {
            // Handle direct item ID restoration
            const cateringItem = await prisma.cateringItem.findUnique({
              where: { id: itemId }
            });

            if (cateringItem) {
              await prisma.cateringItem.update({
                where: { id: itemId },
                data: { imageUrl }
              });
              restored++;
            } else {
              skipped++;
            }
          }
        } catch (itemError) {
          const errorMsg = `Failed to restore image for ${itemId}: ${itemError instanceof Error ? itemError.message : 'Unknown error'}`;
          errors.push(errorMsg);
          logger.warn(errorMsg);
        }
      }

      logger.info(`🔄 Image restoration complete: ${restored} restored, ${skipped} skipped, ${errors.length} errors`);

      return {
        restored,
        skipped,
        errors
      };
    } catch (error) {
      logger.error('❌ Failed to restore catering images:', error);
      throw error;
    }
  }

  /**
   * Get current protection status
   */
  getProtectionStatus(): CateringProtection | null {
    return this.protection;
  }

  /**
   * Reset protection cache (useful for testing)
   */
  reset(): void {
    this.protection = null;
  }
}

// Export singleton instance
export const cateringProtection = new CateringProtectionService();