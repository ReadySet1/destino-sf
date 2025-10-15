/**
 * Square Sync Logger
 *
 * Phase 1 of the fix plan: Enhanced logging to track sync flow
 * This class provides detailed logging and reporting capabilities for Square sync operations.
 */

import { logger } from '@/utils/logger';
import type { ItemSyncStatus, SyncReport } from '@/types/square-sync';

/**
 * Comprehensive sync logger that tracks item-by-item sync status
 */
export class SyncLogger {
  private items: Map<string, ItemSyncStatus> = new Map();
  private startTime: Date;
  private categories: Set<string> = new Set();
  private errors: string[] = [];
  private warnings: string[] = [];

  constructor() {
    this.startTime = new Date();
  }

  /**
   * Log that an item was processed successfully
   */
  logItemProcessed(
    squareId: string,
    name: string,
    status: ItemSyncStatus['status'],
    reason?: string
  ): void {
    const itemStatus: ItemSyncStatus = {
      squareId,
      name,
      status,
      reason,
    };

    this.items.set(squareId, itemStatus);

    const emoji = this.getStatusEmoji(status);
    logger.info(`${emoji} Item ${name} (${squareId}): ${status}${reason ? ` - ${reason}` : ''}`);
  }

  /**
   * Log that an item sync was successful
   */
  logItemSynced(squareId: string, name: string, reason?: string): void {
    this.logItemProcessed(squareId, name, 'synced', reason);
  }

  /**
   * Log that an item is missing from local database
   */
  logItemMissing(squareId: string, name: string, reason?: string): void {
    this.logItemProcessed(squareId, name, 'missing', reason);
  }

  /**
   * Log that an item is a duplicate
   */
  logItemDuplicate(squareId: string, name: string, reason?: string): void {
    this.logItemProcessed(squareId, name, 'duplicate', reason);
  }

  /**
   * Log that an item sync encountered an error
   */
  logItemError(squareId: string, name: string, reason?: string): void {
    this.logItemProcessed(squareId, name, 'error', reason);
    if (reason) {
      this.errors.push(`${name} (${squareId}): ${reason}`);
    }
  }

  /**
   * Log a category being processed
   */
  logCategoryStart(categoryName: string, itemCount: number): void {
    this.categories.add(categoryName);
    logger.info(`📂 Starting category: ${categoryName} (${itemCount} items)`);
  }

  /**
   * Log completion of a category
   */
  logCategoryComplete(categoryName: string, synced: number, skipped: number, errors: number): void {
    logger.info(
      `✅ Completed category: ${categoryName} - ${synced} synced, ${skipped} skipped, ${errors} errors`
    );
  }

  /**
   * Log a general error
   */
  logError(message: string, details?: any): void {
    this.errors.push(message);
    logger.error(`❌ ${message}`, details);
  }

  /**
   * Log a warning
   */
  logWarning(message: string, details?: any): void {
    this.warnings.push(message);
    logger.warn(`⚠️  ${message}`, details);
  }

  /**
   * Log general info
   */
  logInfo(message: string, details?: any): void {
    logger.info(`ℹ️  ${message}`, details);
  }

  /**
   * Log the start of sync operation
   */
  logSyncStart(operation: string, details?: any): void {
    logger.info(`🚀 Starting ${operation}...`, details);
  }

  /**
   * Log the completion of sync operation
   */
  logSyncComplete(operation: string, summary: any): void {
    const duration = Date.now() - this.startTime.getTime();
    logger.info(`🎉 Completed ${operation} in ${duration}ms`, summary);
  }

  /**
   * Generate a comprehensive sync report
   */
  generateReport(): SyncReport {
    const endTime = new Date();
    const duration = endTime.getTime() - this.startTime.getTime();

    // Calculate summary statistics
    const summary = {
      total: this.items.size,
      synced: 0,
      missing: 0,
      duplicates: 0,
      errors: 0,
    };

    for (const [, item] of this.items) {
      switch (item.status) {
        case 'synced':
          summary.synced++;
          break;
        case 'missing':
          summary.missing++;
          break;
        case 'duplicate':
          summary.duplicates++;
          break;
        case 'error':
          summary.errors++;
          break;
      }
    }

    const report: SyncReport = {
      items: this.items,
      summary,
      timestamp: this.startTime,
      duration,
    };

    // Log the final summary
    logger.info('📊 Sync Report Summary:');
    logger.info(`   • Total items processed: ${summary.total}`);
    logger.info(`   • Successfully synced: ${summary.synced}`);
    logger.info(`   • Missing items: ${summary.missing}`);
    logger.info(`   • Duplicate items: ${summary.duplicates}`);
    logger.info(`   • Error items: ${summary.errors}`);
    logger.info(`   • Categories processed: ${this.categories.size}`);
    logger.info(`   • Total duration: ${duration}ms`);
    logger.info(`   • General errors: ${this.errors.length}`);
    logger.info(`   • Warnings: ${this.warnings.length}`);

    return report;
  }

  /**
   * Generate a detailed text report
   */
  generateTextReport(): string {
    const report = this.generateReport();
    const lines: string[] = [];

    lines.push('=== SQUARE SYNC REPORT ===');
    lines.push(`Timestamp: ${report.timestamp.toISOString()}`);
    lines.push(`Duration: ${report.duration}ms`);
    lines.push('');

    lines.push('SUMMARY:');
    lines.push(`  Total items: ${report.summary.total}`);
    lines.push(`  Synced: ${report.summary.synced}`);
    lines.push(`  Missing: ${report.summary.missing}`);
    lines.push(`  Duplicates: ${report.summary.duplicates}`);
    lines.push(`  Errors: ${report.summary.errors}`);
    lines.push(`  Categories: ${this.categories.size}`);
    lines.push('');

    if (this.errors.length > 0) {
      lines.push('ERRORS:');
      this.errors.forEach(error => lines.push(`  - ${error}`));
      lines.push('');
    }

    if (this.warnings.length > 0) {
      lines.push('WARNINGS:');
      this.warnings.forEach(warning => lines.push(`  - ${warning}`));
      lines.push('');
    }

    lines.push('ITEM DETAILS:');
    for (const [, item] of report.items) {
      const emoji = this.getStatusEmoji(item.status);
      lines.push(
        `  ${emoji} ${item.name} (${item.squareId}) - ${item.status}${item.reason ? `: ${item.reason}` : ''}`
      );
    }

    return lines.join('\n');
  }

  /**
   * Get items by status
   */
  getItemsByStatus(status: ItemSyncStatus['status']): ItemSyncStatus[] {
    return Array.from(this.items.values()).filter(item => item.status === status);
  }

  /**
   * Get items that had errors
   */
  getErrorItems(): ItemSyncStatus[] {
    return this.getItemsByStatus('error');
  }

  /**
   * Get items that were missing
   */
  getMissingItems(): ItemSyncStatus[] {
    return this.getItemsByStatus('missing');
  }

  /**
   * Get items that were duplicates
   */
  getDuplicateItems(): ItemSyncStatus[] {
    return this.getItemsByStatus('duplicate');
  }

  /**
   * Get items that were successfully synced
   */
  getSyncedItems(): ItemSyncStatus[] {
    return this.getItemsByStatus('synced');
  }

  /**
   * Clear the logger state
   */
  clear(): void {
    this.items.clear();
    this.categories.clear();
    this.errors = [];
    this.warnings = [];
    this.startTime = new Date();
  }

  /**
   * Get status emoji for logging
   */
  private getStatusEmoji(status: ItemSyncStatus['status']): string {
    switch (status) {
      case 'synced':
        return '✅';
      case 'missing':
        return '❌';
      case 'duplicate':
        return '🔄';
      case 'error':
        return '💥';
      default:
        return '❓';
    }
  }

  /**
   * Export report as JSON
   */
  exportJson(): string {
    const report = this.generateReport();
    return JSON.stringify(
      {
        ...report,
        items: Array.from(report.items.entries()).map(([id, item]) => ({ id, ...item })),
        categories: Array.from(this.categories),
        errors: this.errors,
        warnings: this.warnings,
      },
      null,
      2
    );
  }

  /**
   * Get current statistics without generating full report
   */
  getCurrentStats(): {
    itemsProcessed: number;
    categoriesProcessed: number;
    errors: number;
    warnings: number;
    elapsedTime: number;
  } {
    return {
      itemsProcessed: this.items.size,
      categoriesProcessed: this.categories.size,
      errors: this.errors.length,
      warnings: this.warnings.length,
      elapsedTime: Date.now() - this.startTime.getTime(),
    };
  }
}

/**
 * Create a new sync logger instance
 */
export function createSyncLogger(): SyncLogger {
  return new SyncLogger();
}

/**
 * Default export for convenience
 */
export default SyncLogger;
