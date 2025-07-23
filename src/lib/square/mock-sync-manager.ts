import { logger } from '@/utils/logger';
import { prisma } from '@/lib/db';
import { SyncStatus } from '@prisma/client';

interface MockSyncOptions {
  includeImages: boolean;
  batchSize: 'small' | 'medium' | 'large';
  notifyOnComplete: boolean;
  autoRetry?: boolean;
  // Testing options
  simulateError?: boolean;
  customDuration?: number; // seconds
  simulateProgress?: boolean;
}

interface MockSyncResult {
  success: boolean;
  message: string;
  syncedProducts: number;
  skippedProducts: number;
  errors: string[];
  warnings: string[];
  productDetails: {
    created: number;
    updated: number;
    withImages: number;
    withoutImages: number;
  };
}

/**
 * Mock Sync Manager for Testing
 * Simulates the sync process without hitting Square APIs
 */
export class MockSyncManager {
  private userId: string;
  private userEmail: string;
  private userName: string;

  constructor(userId: string, userEmail: string, userName: string) {
    this.userId = userId;
    this.userEmail = userEmail;
    this.userName = userName;
  }

  /**
   * Start a mock sync that simulates the real process
   */
  async startMockSync(options: MockSyncOptions): Promise<{ syncId: string; status: string }> {
    const syncId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    logger.info('🧪 Starting Mock Sync', { syncId, options });

    // Create initial sync log
    await prisma.userSyncLog.create({
      data: {
        syncId,
        userId: this.userId,
        status: 'RUNNING',
        startedBy: `${this.userName} (${this.userEmail})`,
        progress: 0,
        message: 'Mock sync started...',
        currentStep: 'initialization',
        options: options as any,
      },
    });

    // Start mock sync process in background
    this.executeMockSyncInBackground(syncId, options);

    return { syncId, status: 'started' };
  }

  /**
   * Execute mock sync with realistic timing and progress updates
   */
  private async executeMockSyncInBackground(
    syncId: string,
    options: MockSyncOptions
  ): Promise<void> {
    try {
      // Calculate mock duration based on batch size
      const baseDuration = options.customDuration || this.getMockDuration(options.batchSize);
      const steps = 20; // Number of progress updates
      const stepDuration = (baseDuration * 1000) / steps; // Convert to milliseconds

      logger.info(`🧪 Mock sync ${syncId} will take ${baseDuration} seconds`);

      // Simulate error early if requested
      if (options.simulateError && Math.random() < 0.3) {
        // 30% chance early error
        await this.delay(2000); // Wait 2 seconds
        throw new Error('Mock API connection failed');
      }

      // Progress simulation
      for (let i = 0; i <= steps; i++) {
        // Check if sync was cancelled before each step
        const currentSync = await prisma.userSyncLog.findUnique({
          where: { syncId },
          select: { status: true },
        });

        if (!currentSync) {
          logger.warn(`🧪 Mock sync ${syncId} not found in database, stopping`);
          return;
        }

        if (currentSync.status === 'CANCELLED') {
          logger.info(`🧪 Mock sync ${syncId} cancelled by user`);
          return;
        }

        const percentage = Math.min(Math.floor((i / steps) * 100), 100);
        const step = this.getMockStep(percentage);
        const message = this.getMockMessage(percentage, step);

        try {
          await this.updateMockProgress(syncId, {
            percentage,
            message,
            currentStep: step,
            processed: Math.floor((i / steps) * 150), // Mock 150 total products
            total: 150,
          });
        } catch (error) {
          logger.warn(`🧪 Mock sync ${syncId} progress update failed:`, error);
          // Continue even if progress update fails
        }

        // Simulate error mid-process if requested
        if (options.simulateError && i === Math.floor(steps * 0.7) && Math.random() < 0.5) {
          throw new Error('Mock sync failed during processing');
        }

        if (i < steps) {
          // Don't delay after the last step
          await this.delay(stepDuration);
        }
      }

      // Complete mock sync - add small delay to ensure final update is processed
      await this.delay(1000); // Increase delay to 1 second
      await this.completeMockSync(syncId, options);

      logger.info(`🧪 Mock sync ${syncId} completed successfully`);
    } catch (error) {
      logger.error(`🧪 Mock sync ${syncId} failed:`, error);
      await this.failMockSync(syncId, error);
    }
  }

  /**
   * Update mock progress
   */
  private async updateMockProgress(
    syncId: string,
    progress: {
      percentage: number;
      message: string;
      currentStep: string;
      processed?: number;
      total?: number;
    }
  ): Promise<void> {
    await prisma.userSyncLog.update({
      where: { syncId },
      data: {
        progress: progress.percentage,
        message: progress.message,
        currentStep: progress.currentStep,
      },
    });

    logger.debug(`🧪 Mock progress: ${progress.percentage}% - ${progress.message}`);
  }

  /**
   * Complete mock sync with realistic results
   */
  private async completeMockSync(syncId: string, options: MockSyncOptions): Promise<void> {
    const mockResults: MockSyncResult = {
      success: true,
      message: 'Mock sync completed successfully',
      syncedProducts: this.getMockProductCount(options.batchSize),
      skippedProducts: 3,
      errors: [],
      warnings: options.includeImages ? [] : ['Image updates skipped as requested'],
      productDetails: {
        created: 5,
        updated: this.getMockProductCount(options.batchSize) - 5,
        withImages: options.includeImages ? 85 : 0,
        withoutImages: options.includeImages ? 15 : this.getMockProductCount(options.batchSize),
      },
    };

    await prisma.userSyncLog.update({
      where: { syncId },
      data: {
        status: 'COMPLETED',
        endTime: new Date(),
        progress: 100,
        message: 'Mock sync completed successfully! 🎉',
        currentStep: 'completed',
        results: mockResults as any,
      },
    });

    logger.info('🧪 Mock sync completed', { syncId, results: mockResults });
  }

  /**
   * Fail mock sync with realistic error
   */
  private async failMockSync(syncId: string, error: any): Promise<void> {
    const userFriendlyError = {
      title: 'Mock Sync Failed',
      message: error.message || 'Mock sync encountered an error',
      action: 'This is a simulated error for testing',
    };

    await prisma.userSyncLog.update({
      where: { syncId },
      data: {
        status: 'FAILED',
        endTime: new Date(),
        message: userFriendlyError.message,
        currentStep: 'failed',
        errors: [userFriendlyError],
      },
    });

    logger.error('🧪 Mock sync failed', { syncId, error: error.message });
  }

  /**
   * Cancel mock sync
   */
  async cancelMockSync(syncId: string): Promise<void> {
    await prisma.userSyncLog.update({
      where: { syncId },
      data: {
        status: 'CANCELLED',
        endTime: new Date(),
        message: 'Mock sync cancelled by user',
        currentStep: 'cancelled',
      },
    });

    logger.info('🧪 Mock sync cancelled', { syncId });
  }

  // Helper methods for mock behavior
  private getMockDuration(batchSize: string): number {
    switch (batchSize) {
      case 'small':
        return 15; // 15 seconds
      case 'medium':
        return 25; // 25 seconds
      case 'large':
        return 40; // 40 seconds
      default:
        return 25;
    }
  }

  private getMockProductCount(batchSize: string): number {
    switch (batchSize) {
      case 'small':
        return 25;
      case 'medium':
        return 50;
      case 'large':
        return 100;
      default:
        return 50;
    }
  }

  private getMockStep(percentage: number): string {
    if (percentage < 10) return 'initialization';
    if (percentage < 20) return 'fetching';
    if (percentage < 80) return 'processing';
    if (percentage < 95) return 'images';
    return 'completing';
  }

  private getMockMessage(percentage: number, step: string): string {
    switch (step) {
      case 'initialization':
        return 'Setting up mock sync...';
      case 'fetching':
        return 'Fetching mock product data...';
      case 'processing':
        return `Processing mock products... (${percentage}%)`;
      case 'images':
        return 'Updating mock product images...';
      case 'completing':
        return 'Finalizing mock sync...';
      default:
        return `Mock sync in progress... (${percentage}%)`;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
