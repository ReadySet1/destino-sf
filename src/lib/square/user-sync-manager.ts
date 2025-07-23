import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';
import { prisma } from '@/lib/db';
import { ProductionSyncManager } from './production-sync';
import { SyncStatus } from '@prisma/client';

// Local type definitions (to avoid import issues)
interface ProductSyncOptions {
  forceImageUpdate?: boolean;
  skipInactiveProducts?: boolean;
  validateImages?: boolean;
  batchSize?: number;
  enableCleanup?: boolean;
}

interface SyncResult {
  success: boolean;
  message: string;
  syncedProducts: number;
  skippedProducts: number;
  errors: string[];
  warnings: string[];
  productDetails?: {
    created: number;
    updated: number;
    withImages: number;
    withoutImages: number;
  };
}

// User-friendly sync options
export interface UserSyncOptions {
  includeImages: boolean;
  batchSize: 'small' | 'medium' | 'large';
  notifyOnComplete: boolean;
  autoRetry?: boolean;
}

// Progress information for users
export interface SyncProgress {
  percentage: number;
  message: string;
  currentStep: string;
  processed?: number;
  total?: number;
  currentProduct?: string;
}

// Result returned to user when starting sync
export interface UserSyncResult {
  syncId: string;
  status: 'started' | 'error';
  estimatedDuration: string;
  message: string;
}

// User-friendly error information
export interface UserFriendlyError {
  title: string;
  message: string;
  action: 'retry' | 'wait' | 'continue' | 'contact_support';
}

export class UserSyncManager {
  private userId: string;
  private userEmail: string;
  private userName: string;

  constructor(userId: string, userEmail: string, userName?: string) {
    this.userId = userId;
    this.userEmail = userEmail;
    this.userName = userName || userEmail;
  }

  /**
   * Start a user-initiated sync operation
   */
  async startUserSync(options: UserSyncOptions): Promise<UserSyncResult> {
    const syncId = uuidv4();

    try {
      logger.info(`User sync started by ${this.userEmail}`, { syncId, options });

      // 1. Check if user already has a running sync
      const existingSync = await this.getActiveSyncForUser();
      if (existingSync) {
        return {
          syncId: existingSync.syncId,
          status: 'error',
          estimatedDuration: 'N/A',
          message:
            'A sync is already running. Please wait for it to complete before starting another.',
        };
      }

      // 2. Create sync log entry
      await this.createUserSyncLog(syncId, options);

      // 3. Start sync in background (non-blocking)
      setImmediate(() => {
        this.executeUserSyncInBackground(syncId, options).catch(error => {
          logger.error('Background sync execution failed:', error);
        });
      });

      // 4. Return immediately to user
      return {
        syncId,
        status: 'started',
        estimatedDuration: this.estimateDuration(options),
        message: 'Sync started successfully! You can monitor progress on this page.',
      };
    } catch (error) {
      logger.error('Failed to start user sync:', error);
      return {
        syncId: '',
        status: 'error',
        estimatedDuration: 'N/A',
        message: 'Failed to start sync. Please try again.',
      };
    }
  }

  /**
   * Get current sync progress
   */
  async getProgress(syncId: string): Promise<SyncProgress | null> {
    try {
      const syncLog = await prisma.userSyncLog.findUnique({
        where: {
          syncId,
          userId: this.userId,
        },
      });

      if (!syncLog) {
        return null;
      }

      return {
        percentage: syncLog.progress,
        message: syncLog.message || 'Processing...',
        currentStep: syncLog.currentStep || 'initializing',
        processed: this.extractFromResults(syncLog.results, 'processed'),
        total: this.extractFromResults(syncLog.results, 'total'),
        currentProduct: this.extractFromResults(syncLog.results, 'currentProduct'),
      };
    } catch (error) {
      logger.error('Failed to get sync progress:', error);
      return null;
    }
  }

  /**
   * Cancel a running sync
   */
  async cancelSync(syncId: string): Promise<void> {
    try {
      await prisma.userSyncLog.updateMany({
        where: {
          syncId,
          userId: this.userId,
          status: SyncStatus.RUNNING,
        },
        data: {
          status: SyncStatus.CANCELLED,
          endTime: new Date(),
          message: 'Sync cancelled by user',
        },
      });

      logger.info(`Sync ${syncId} cancelled by user ${this.userEmail}`);
    } catch (error) {
      logger.error('Failed to cancel sync:', error);
      throw new Error('Failed to cancel sync');
    }
  }

  /**
   * Get sync history for the user
   */
  async getSyncHistory(limit: number = 10): Promise<any[]> {
    try {
      const history = await prisma.userSyncLog.findMany({
        where: { userId: this.userId },
        orderBy: { startTime: 'desc' },
        take: limit,
        select: {
          id: true,
          syncId: true,
          status: true,
          startTime: true,
          endTime: true,
          progress: true,
          message: true,
          results: true,
          errors: true,
        },
      });

      return history;
    } catch (error) {
      logger.error('Failed to get sync history:', error);
      return [];
    }
  }

  /**
   * Execute sync in background with progress tracking
   */
  private async executeUserSyncInBackground(
    syncId: string,
    options: UserSyncOptions
  ): Promise<void> {
    let progressInterval: NodeJS.Timeout | null = null;
    let updateCount = 0;
    const MAX_UPDATES = 180; // 180 updates * 3 seconds = 9 minutes maximum

    const clearProgressInterval = () => {
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
    };

    try {
      // Update status to running
      await this.updateProgress(
        syncId,
        {
          percentage: 0,
          message: 'Initializing sync...',
          currentStep: 'setup',
        },
        SyncStatus.RUNNING
      );

      // Convert user options to production options
      const productionOptions = this.convertToProductionOptions(options);

      // Create production manager
      const productionManager = new ProductionSyncManager(productionOptions);

      // Set up periodic progress updates with proper cleanup
      progressInterval = setInterval(async () => {
        try {
          updateCount++;

          // Safety: Stop after maximum updates to prevent infinite intervals
          if (updateCount >= MAX_UPDATES) {
            logger.warn(`Sync ${syncId}: Progress interval reached maximum updates, stopping`);
            clearProgressInterval();
            return;
          }

          // Check if sync is still running before updating progress
          const currentSync = await prisma.userSyncLog.findUnique({
            where: { syncId },
            select: { status: true, progress: true },
          });

          // If sync doesn't exist or is completed, clear interval immediately
          if (!currentSync) {
            logger.info(`Sync ${syncId}: Record not found, stopping progress updates`);
            clearProgressInterval();
            return;
          }

          // If sync is completed, failed, or cancelled, clear interval and stop
          if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(currentSync.status)) {
            logger.info(
              `Sync ${syncId}: Status is ${currentSync.status}, stopping progress updates`
            );
            clearProgressInterval();
            return;
          }

          // If progress is already at 100%, clear interval to prevent infinite loop
          if (currentSync.progress >= 100) {
            logger.info(`Sync ${syncId}: Progress at 100%, stopping updates`);
            clearProgressInterval();
            return;
          }

          // Update progress incrementally based on time elapsed
          const currentTime = new Date();
          const startTime = await this.getSyncStartTime(syncId);
          if (startTime) {
            const elapsedSeconds = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);

            // Estimate progress based on typical sync duration
            const estimatedDuration = this.getEstimatedDurationSeconds(productionOptions);
            const estimatedProgress = Math.min(
              Math.floor((elapsedSeconds / estimatedDuration) * 90),
              90
            ); // Cap at 90% until completion

            await this.updateProgress(syncId, {
              percentage: estimatedProgress,
              message: this.createProgressMessage(elapsedSeconds),
              currentStep: this.getCurrentStep(elapsedSeconds),
            }).catch(error => {
              logger.debug(`Sync ${syncId}: Progress update failed:`, error);
            });
          }
        } catch (error) {
          logger.warn(`Sync ${syncId}: Progress interval error:`, error);
          // On repeated errors, stop the interval
          if (updateCount > 10 && updateCount % 10 === 0) {
            logger.warn(`Sync ${syncId}: Too many progress errors, stopping interval`);
            clearProgressInterval();
          }
        }
      }, 3000); // Update every 3 seconds

      try {
        // Execute sync
        const result = await productionManager.syncProducts();

        // Final completion update - ensure we stop the interval first
        clearProgressInterval();
        await this.completeUserSync(syncId, result);
      } catch (error) {
        // Clear progress interval on error
        clearProgressInterval();
        throw error;
      }
    } catch (error) {
      // Ensure interval is cleared in all error cases
      clearProgressInterval();
      await this.failUserSync(syncId, error);
    }
  }

  /**
   * Create initial sync log entry
   */
  private async createUserSyncLog(syncId: string, options: UserSyncOptions): Promise<void> {
    await prisma.userSyncLog.create({
      data: {
        userId: this.userId,
        syncId,
        status: SyncStatus.PENDING,
        startedBy: this.userName,
        progress: 0,
        message: 'Sync queued',
        currentStep: 'queued',
        options: options as any,
      },
    });
  }

  /**
   * Update sync progress
   */
  private async updateProgress(
    syncId: string,
    progress: SyncProgress,
    status?: SyncStatus
  ): Promise<void> {
    const updateData: any = {
      progress: progress.percentage,
      message: progress.message,
      currentStep: progress.currentStep,
    };

    if (status) {
      updateData.status = status;
    }

    if (progress.processed && progress.total) {
      updateData.results = {
        processed: progress.processed,
        total: progress.total,
        currentProduct: progress.currentProduct,
      };
    }

    await prisma.userSyncLog.update({
      where: { syncId },
      data: updateData,
    });
  }

  /**
   * Complete sync successfully
   */
  private async completeUserSync(syncId: string, result: SyncResult): Promise<void> {
    try {
      await prisma.userSyncLog.update({
        where: { syncId },
        data: {
          status: SyncStatus.COMPLETED,
          endTime: new Date(),
          progress: 100,
          currentStep: 'completed',
          message: result.success
            ? `Sync completed! ${result.syncedProducts} products processed.`
            : 'Sync completed with some issues.',
          results: {
            success: result.success,
            syncedProducts: result.syncedProducts,
            skippedProducts: result.skippedProducts,
            productDetails: result.productDetails,
            warnings: result.warnings?.length || 0,
            errors: result.errors?.length || 0,
          },
          errors: result.errors?.length > 0 ? result.errors : undefined,
        },
      });

      logger.info(`User sync ${syncId} completed successfully`, { result });
    } catch (error) {
      logger.error(`Failed to complete user sync ${syncId}:`, error);
      // Ensure sync is marked as completed even if update fails partially
      try {
        await prisma.userSyncLog.updateMany({
          where: {
            syncId,
            status: { not: 'COMPLETED' },
          },
          data: {
            status: SyncStatus.COMPLETED,
            endTime: new Date(),
            progress: 100,
            message: 'Sync completed successfully',
          },
        });
      } catch (finalError) {
        logger.error(`Critical: Failed final completion update for sync ${syncId}:`, finalError);
      }
    }
  }

  /**
   * Mark sync as failed
   */
  private async failUserSync(syncId: string, error: any): Promise<void> {
    const userFriendlyError = this.handleSyncError(error);

    try {
      await prisma.userSyncLog.update({
        where: { syncId },
        data: {
          status: SyncStatus.FAILED,
          endTime: new Date(),
          currentStep: 'failed',
          message: userFriendlyError.message,
          errors: [
            {
              title: userFriendlyError.title,
              message: userFriendlyError.message,
              action: userFriendlyError.action,
            },
          ],
        },
      });

      logger.error(`User sync ${syncId} failed:`, error);
    } catch (updateError) {
      logger.error(`Failed to update sync failure status for ${syncId}:`, updateError);
      // Ensure sync is marked as failed even if update fails partially
      try {
        await prisma.userSyncLog.updateMany({
          where: {
            syncId,
            status: { not: 'FAILED' },
          },
          data: {
            status: SyncStatus.FAILED,
            endTime: new Date(),
            message: 'Sync failed due to an error',
          },
        });
      } catch (finalError) {
        logger.error(`Critical: Failed final failure update for sync ${syncId}:`, finalError);
      }
    }
  }

  /**
   * Check if user has an active sync running
   */
  private async getActiveSyncForUser(): Promise<{ syncId: string } | null> {
    const activeSync = await prisma.userSyncLog.findFirst({
      where: {
        userId: this.userId,
        status: {
          in: [SyncStatus.PENDING, SyncStatus.RUNNING],
        },
      },
      select: { syncId: true },
    });

    return activeSync;
  }

  /**
   * Convert user-friendly options to production options
   */
  private convertToProductionOptions(userOptions: UserSyncOptions): ProductSyncOptions {
    return {
      forceImageUpdate: userOptions.includeImages,
      batchSize: this.getBatchSize(userOptions.batchSize),
      validateImages: true,
      skipInactiveProducts: true,
      enableCleanup: false, // Keep this false for user-triggered syncs
    };
  }

  /**
   * Convert user-friendly batch size to actual numbers
   */
  private getBatchSize(size: 'small' | 'medium' | 'large'): number {
    switch (size) {
      case 'small':
        return 25; // Slow & careful
      case 'medium':
        return 50; // Normal speed
      case 'large':
        return 100; // Fast
      default:
        return 50;
    }
  }

  /**
   * Estimate sync duration based on options
   */
  private estimateDuration(options: UserSyncOptions): string {
    const baseMinutes = options.batchSize === 'small' ? 5 : options.batchSize === 'medium' ? 3 : 2;
    const imageMinutes = options.includeImages ? 2 : 0;

    const totalMinutes = baseMinutes + imageMinutes;

    if (totalMinutes < 2) return 'Less than 2 minutes';
    if (totalMinutes < 5) return `About ${totalMinutes} minutes`;
    return `${totalMinutes}-${totalMinutes + 2} minutes`;
  }

  /**
   * Create user-friendly progress messages
   */
  private createUserFriendlyMessage(progress: any): string {
    const step = progress.currentStep || '';
    const product = progress.currentProduct || '';

    switch (step) {
      case 'fetching':
        return 'Getting latest product data from Square...';
      case 'processing':
        return product ? `Processing: ${product}` : 'Processing products...';
      case 'images':
        return 'Updating product images...';
      case 'completing':
        return 'Almost done! Finishing up...';
      case 'cleanup':
        return 'Cleaning up and finalizing...';
      default:
        return 'Working on your products...';
    }
  }

  /**
   * Convert sync errors to user-friendly messages
   */
  private handleSyncError(error: any): UserFriendlyError {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('Square') && errorMessage.includes('401')) {
      return {
        title: 'Authentication Issue',
        message: 'Having trouble connecting to Square. This usually resolves automatically.',
        action: 'retry',
      };
    }

    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return {
        title: 'Sync Throttled',
        message: 'Square is rate-limiting requests. Your sync will continue automatically.',
        action: 'wait',
      };
    }

    if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      return {
        title: 'Connection Issue',
        message: 'Network connection interrupted. You can retry the sync in a few minutes.',
        action: 'retry',
      };
    }

    if (errorMessage.includes('database') || errorMessage.includes('prisma')) {
      return {
        title: 'Database Busy',
        message: 'Database is temporarily busy. The sync will retry automatically.',
        action: 'wait',
      };
    }

    return {
      title: 'Sync Issue',
      message: 'Something unexpected happened during the sync. Our team has been notified.',
      action: 'contact_support',
    };
  }

  /**
   * Extract values from JSON results safely
   */
  private extractFromResults(results: any, key: string): any {
    if (!results || typeof results !== 'object') return undefined;
    return results[key];
  }

  /**
   * Get sync start time from database
   */
  private async getSyncStartTime(syncId: string): Promise<Date | null> {
    try {
      const sync = await prisma.userSyncLog.findUnique({
        where: { syncId },
        select: { startTime: true },
      });
      return sync?.startTime || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get estimated duration in seconds based on options
   */
  private getEstimatedDurationSeconds(options: ProductSyncOptions): number {
    const baseSeconds =
      options.batchSize === 25
        ? 300 // 5 minutes for small
        : options.batchSize === 50
          ? 180 // 3 minutes for medium
          : 120; // 2 minutes for large
    const imageSeconds = options.forceImageUpdate ? 120 : 0; // 2 minutes for images
    return baseSeconds + imageSeconds;
  }

  /**
   * Create progress message based on elapsed time
   */
  private createProgressMessage(elapsedSeconds: number): string {
    if (elapsedSeconds < 30) {
      return 'Getting latest product data from Square...';
    } else if (elapsedSeconds < 120) {
      return 'Processing products and categories...';
    } else if (elapsedSeconds < 240) {
      return 'Updating product images and details...';
    } else {
      return 'Almost done! Finishing up...';
    }
  }

  /**
   * Get current step based on elapsed time
   */
  private getCurrentStep(elapsedSeconds: number): string {
    if (elapsedSeconds < 30) {
      return 'fetching';
    } else if (elapsedSeconds < 120) {
      return 'processing';
    } else if (elapsedSeconds < 240) {
      return 'images';
    } else {
      return 'completing';
    }
  }
}
