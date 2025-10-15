import { prisma, withRetry } from '@/lib/db';
import { cacheService, CacheInvalidation } from '@/lib/cache-service';
import type { StoreSettings, StoreSettingsUpdate, SettingsResult } from '@/types/store-settings';
import { DEFAULT_STORE_SETTINGS } from '@/types/store-settings';
import { StoreSettingsSchema, StoreSettingsUpdateSchema } from '@/types/store-settings';
import { revalidateTag, revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';

/**
 * Cache configuration for store settings
 */
const SETTINGS_CACHE_KEY = 'store:settings';
const SETTINGS_CACHE_TTL = 300; // 5 minutes - shorter TTL since settings changes should be immediate

/**
 * Store Settings Service
 * Handles all store settings operations with caching and validation
 */
export class StoreSettingsService {
  private static instance: StoreSettingsService;

  private constructor() {}

  static getInstance(): StoreSettingsService {
    if (!StoreSettingsService.instance) {
      StoreSettingsService.instance = new StoreSettingsService();
    }
    return StoreSettingsService.instance;
  }

  /**
   * Get store settings with caching
   */
  async getSettings(): Promise<StoreSettings> {
    try {
      const result = await cacheService.getOrSet(
        SETTINGS_CACHE_KEY,
        async () => {
          return await withRetry(async () => {
            const settings = await prisma.storeSettings.findFirst({
              orderBy: { createdAt: 'desc' },
            });

            if (!settings) {
              // Create default settings if none exist
              return await this.createDefaultSettings();
            }

            // Transform Decimal fields to numbers for consistency
            return {
              ...settings,
              taxRate: Number(settings.taxRate),
              minOrderAmount: Number(settings.minOrderAmount),
              cateringMinimumAmount: Number(settings.cateringMinimumAmount),
            };
          });
        },
        SETTINGS_CACHE_TTL
      );

      // Validate the cached/retrieved data
      const validatedSettings = StoreSettingsSchema.parse(result.value);
      return validatedSettings;
    } catch (error) {
      console.error('Error fetching store settings:', error);

      // Track error in Sentry
      Sentry.withScope(scope => {
        scope.setTag('service', 'store-settings');
        scope.setTag('operation', 'getSettings');
        scope.setContext('store_settings', {
          operation: 'getSettings',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        Sentry.captureException(
          error instanceof Error ? error : new Error('Store settings fetch error')
        );
      });

      // Return default settings as fallback
      return this.getDefaultSettings();
    }
  }

  /**
   * Update store settings
   */
  async updateSettings(updates: StoreSettingsUpdate): Promise<SettingsResult<StoreSettings>> {
    try {
      // Validate input data
      const validatedUpdates = StoreSettingsUpdateSchema.parse(updates);

      const updatedSettings = await withRetry(async () => {
        return await prisma.storeSettings.upsert({
          where: {
            // Since we use a singleton pattern, we'll find the first record
            id: (await prisma.storeSettings.findFirst())?.id || 'never-matches',
          },
          create: {
            ...validatedUpdates,
          },
          update: {
            ...validatedUpdates,
            updatedAt: new Date(),
          },
        });
      });

      // Transform Decimal fields to numbers
      const transformedSettings: StoreSettings = {
        ...updatedSettings,
        taxRate: Number(updatedSettings.taxRate),
        minOrderAmount: Number(updatedSettings.minOrderAmount),
        cateringMinimumAmount: Number(updatedSettings.cateringMinimumAmount),
      };

      // Invalidate cache
      await this.invalidateCache();

      // Log the settings change for audit purposes
      console.log(`Store settings updated:`, {
        timestamp: new Date().toISOString(),
        changes: Object.keys(validatedUpdates),
      });

      return {
        success: true,
        data: transformedSettings,
      };
    } catch (error) {
      console.error('Error updating store settings:', error);

      // Track error in Sentry
      Sentry.withScope(scope => {
        scope.setTag('service', 'store-settings');
        scope.setTag('operation', 'updateSettings');
        scope.setContext('store_settings', {
          operation: 'updateSettings',
          updates: JSON.stringify(updates),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        Sentry.captureException(
          error instanceof Error ? error : new Error('Store settings update error')
        );
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update store settings',
      };
    }
  }

  /**
   * Get specific setting value by key
   */
  async getSetting<K extends keyof StoreSettings>(key: K): Promise<StoreSettings[K]> {
    const settings = await this.getSettings();
    return settings[key];
  }

  /**
   * Check if store is currently open
   */
  async isStoreOpen(): Promise<boolean> {
    try {
      const isOpen = await this.getSetting('isStoreOpen');
      return isOpen;
    } catch (error) {
      console.error('Error checking store status:', error);
      // Default to open if we can't determine status
      return true;
    }
  }

  /**
   * Get store closure message if store is closed
   */
  async getClosureMessage(): Promise<string | null> {
    try {
      const [isOpen, message] = await Promise.all([
        this.getSetting('isStoreOpen'),
        this.getSetting('temporaryClosureMsg'),
      ]);

      return !isOpen ? message : null;
    } catch (error) {
      console.error('Error fetching closure message:', error);
      return null;
    }
  }

  /**
   * Get tax rate as decimal for calculations
   */
  async getTaxRateDecimal(): Promise<number> {
    try {
      const taxRate = await this.getSetting('taxRate');
      return taxRate / 100; // Convert percentage to decimal
    } catch (error) {
      console.error('Error fetching tax rate:', error);
      // Default to San Francisco tax rate
      return 0.0825;
    }
  }

  /**
   * Get minimum order amounts
   */
  async getMinimumAmounts(): Promise<{
    regular: number;
    catering: number;
  }> {
    try {
      const [regular, catering] = await Promise.all([
        this.getSetting('minOrderAmount'),
        this.getSetting('cateringMinimumAmount'),
      ]);

      return { regular, catering };
    } catch (error) {
      console.error('Error fetching minimum amounts:', error);
      return { regular: 0, catering: 0 };
    }
  }

  /**
   * Get advance booking settings
   */
  async getAdvanceBookingSettings(): Promise<{
    minHours: number;
    maxDays: number;
  }> {
    try {
      const [minHours, maxDays] = await Promise.all([
        this.getSetting('minAdvanceHours'),
        this.getSetting('maxDaysInAdvance'),
      ]);

      return { minHours, maxDays };
    } catch (error) {
      console.error('Error fetching advance booking settings:', error);
      return { minHours: 2, maxDays: 30 };
    }
  }

  /**
   * Get store contact information
   */
  async getContactInfo(): Promise<{
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    phone: string | null;
    email: string | null;
  }> {
    try {
      const settings = await this.getSettings();
      return {
        name: settings.name,
        address: settings.address,
        city: settings.city,
        state: settings.state,
        zipCode: settings.zipCode,
        phone: settings.phone,
        email: settings.email,
      };
    } catch (error) {
      console.error('Error fetching contact info:', error);
      return {
        name: 'Destino SF',
        address: null,
        city: null,
        state: null,
        zipCode: null,
        phone: null,
        email: null,
      };
    }
  }

  /**
   * Create default settings record
   */
  private async createDefaultSettings(): Promise<StoreSettings> {
    const defaultSettings = await prisma.storeSettings.create({
      data: {
        name: DEFAULT_STORE_SETTINGS.name,
        address: DEFAULT_STORE_SETTINGS.address,
        city: DEFAULT_STORE_SETTINGS.city,
        state: DEFAULT_STORE_SETTINGS.state,
        zipCode: DEFAULT_STORE_SETTINGS.zipCode,
        phone: DEFAULT_STORE_SETTINGS.phone,
        email: DEFAULT_STORE_SETTINGS.email,
        taxRate: DEFAULT_STORE_SETTINGS.taxRate,
        minOrderAmount: DEFAULT_STORE_SETTINGS.minOrderAmount,
        cateringMinimumAmount: DEFAULT_STORE_SETTINGS.cateringMinimumAmount,
        minAdvanceHours: DEFAULT_STORE_SETTINGS.minAdvanceHours,
        maxDaysInAdvance: DEFAULT_STORE_SETTINGS.maxDaysInAdvance,
        isStoreOpen: DEFAULT_STORE_SETTINGS.isStoreOpen,
        temporaryClosureMsg: DEFAULT_STORE_SETTINGS.temporaryClosureMsg,
      },
    });

    return {
      ...defaultSettings,
      taxRate: Number(defaultSettings.taxRate),
      minOrderAmount: Number(defaultSettings.minOrderAmount),
      cateringMinimumAmount: Number(defaultSettings.cateringMinimumAmount),
    };
  }

  /**
   * Get default settings without database access
   */
  private getDefaultSettings(): StoreSettings {
    const now = new Date();
    return {
      id: 'default',
      ...DEFAULT_STORE_SETTINGS,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Invalidate all settings-related cache
   */
  private async invalidateCache(): Promise<void> {
    try {
      await Promise.all([
        cacheService.delete(SETTINGS_CACHE_KEY),
        // Also invalidate Next.js cache tags
        revalidateTag('store-settings'),
        revalidatePath('/', 'layout'),
      ]);
    } catch (error) {
      console.error('Error invalidating settings cache:', error);
    }
  }

  /**
   * Health check for the settings service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      canReadSettings: boolean;
      cacheWorking: boolean;
      responseTime: number;
    };
  }> {
    const start = Date.now();

    try {
      // Test settings read
      const settings = await this.getSettings();
      const canReadSettings = !!settings.id;

      // Test cache
      const cacheTestKey = 'health-check-settings';
      await cacheService.set(cacheTestKey, 'test', 10);
      const cacheValue = await cacheService.get(cacheTestKey);
      const cacheWorking = cacheValue === 'test';
      await cacheService.delete(cacheTestKey);

      const responseTime = Date.now() - start;
      const status = canReadSettings && cacheWorking ? 'healthy' : 'degraded';

      return {
        status,
        details: {
          canReadSettings,
          cacheWorking,
          responseTime,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          canReadSettings: false,
          cacheWorking: false,
          responseTime: Date.now() - start,
        },
      };
    }
  }
}

/**
 * Global store settings service instance
 */
export const storeSettingsService = StoreSettingsService.getInstance();

/**
 * Convenience functions for common operations
 */

/**
 * Get current store settings
 */
export async function getStoreSettings(): Promise<StoreSettings> {
  return await storeSettingsService.getSettings();
}

/**
 * Check if store is open
 */
export async function isStoreOpen(): Promise<boolean> {
  return await storeSettingsService.isStoreOpen();
}

/**
 * Get tax rate as decimal for calculations
 */
export async function getTaxRate(): Promise<number> {
  return await storeSettingsService.getTaxRateDecimal();
}

/**
 * Get minimum order amounts
 */
export async function getMinimumAmounts(): Promise<{ regular: number; catering: number }> {
  return await storeSettingsService.getMinimumAmounts();
}

/**
 * Update store settings (admin only)
 */
export async function updateStoreSettings(
  updates: StoreSettingsUpdate
): Promise<SettingsResult<StoreSettings>> {
  return await storeSettingsService.updateSettings(updates);
}

/**
 * Get store contact information
 */
export async function getStoreContactInfo(): Promise<{
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  phone: string | null;
  email: string | null;
}> {
  return await storeSettingsService.getContactInfo();
}
