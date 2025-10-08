'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { 
  AvailabilityRuleSchema, 
  type AvailabilityRule, 
  type BulkAvailabilityRequest,
  type AvailabilityEvaluation
} from '@/types/availability';
import { AvailabilityQueries } from '@/lib/db/availability-queries';
import { AvailabilityValidators } from '@/lib/availability/validators';
import { AvailabilityScheduler } from '@/lib/availability/scheduler';
import { AvailabilityEngine } from '@/lib/availability/engine';
import { logger } from '@/utils/logger';
import { withDatabaseConnection } from '@/lib/db-utils';
import { verifyAdminAccess } from '@/lib/auth/admin-guard';

/**
 * Server actions for availability management
 */

/**
 * Create a new availability rule
 */
export async function createAvailabilityRule(
  productId: string,
  data: Partial<AvailabilityRule>
): Promise<{ success: boolean; data?: AvailabilityRule; error?: string }> {
  try {
    const authResult = await verifyAdminAccess();
    if (!authResult.authorized) {
      return { success: false, error: authResult.error };
    }

    // Validate the rule data
    const ruleData = { ...data, productId };
    const validation = AvailabilityValidators.validateRule(ruleData);
    
    if (!validation.isValid) {
      return { 
        success: false, 
        error: `Validation failed: ${validation.errors.join(', ')}` 
      };
    }

    const validated = AvailabilityRuleSchema.parse(ruleData);

    const result = await withDatabaseConnection(async () => {
      return await AvailabilityQueries.createRule(
        validated as Omit<AvailabilityRule, 'id' | 'createdAt' | 'updatedAt'>,
        authResult.user!.id
      );
    });

    // Schedule any automated state changes
    if (result.id) {
      await AvailabilityScheduler.scheduleRuleChanges(result);
    }

    // Revalidate relevant pages
    revalidatePath('/admin/products'); // Main product list
    revalidatePath('/admin/products/availability');
    revalidatePath(`/admin/products/availability/${productId}`);
    revalidatePath(`/products/${productId}`);

    logger.info('Created availability rule via server action', {
      ruleId: result.id,
      productId,
      userId: authResult.user!.id
    });

    return { success: true, data: result };
  } catch (error) {
    logger.error('Error in createAvailabilityRule action', {
      productId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create rule' 
    };
  }
}

/**
 * Update an existing availability rule
 */
export async function updateAvailabilityRule(
  ruleId: string,
  updates: Partial<AvailabilityRule>
): Promise<{ success: boolean; data?: AvailabilityRule; error?: string }> {
  try {
    const authResult = await verifyAdminAccess();
    if (!authResult.authorized) {
      return { success: false, error: authResult.error };
    }

    // Validate the updates - skip future date check for updates (allow editing old rules)
    const validation = AvailabilityValidators.validateRule(updates, undefined, true);
    if (!validation.isValid) {
      logger.error('Validation failed for rule update', {
        ruleId,
        errors: validation.errors
      });
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`
      };
    }

    const result = await withDatabaseConnection(async () => {
      return await AvailabilityQueries.updateRule(ruleId, updates, authResult.user!.id);
    });

    // Reschedule automated state changes
    await AvailabilityScheduler.scheduleRuleChanges(result);

    // Revalidate relevant pages
    revalidatePath('/admin/products'); // Main product list
    revalidatePath('/admin/products/availability');
    revalidatePath(`/admin/products/availability/${result.productId}`);
    revalidatePath(`/products/${result.productId}`);

    logger.info('Updated availability rule via server action', {
      ruleId,
      userId: authResult.user!.id,
      changes: Object.keys(updates)
    });

    return { success: true, data: result };
  } catch (error) {
    logger.error('Error in updateAvailabilityRule action', {
      ruleId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update rule' 
    };
  }
}

/**
 * Delete an availability rule
 */
export async function deleteAvailabilityRule(
  ruleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authResult = await verifyAdminAccess();
    if (!authResult.authorized) {
      return { success: false, error: authResult.error };
    }

    // Get the rule to find the product ID for revalidation
    const rules = await AvailabilityQueries.getProductRules('dummy'); // We need the product ID
    const rule = rules.find(r => r.id === ruleId);
    
    await withDatabaseConnection(async () => {
      await AvailabilityQueries.deleteRule(ruleId, authResult.user!.id);
    });

    // Revalidate relevant pages
    revalidatePath('/admin/products'); // Main product list
    revalidatePath('/admin/products/availability');
    if (rule?.productId) {
      revalidatePath(`/admin/products/availability/${rule.productId}`);
      revalidatePath(`/products/${rule.productId}`);
    }

    logger.info('Deleted availability rule via server action', {
      ruleId,
      userId: authResult.user!.id
    });

    return { success: true };
  } catch (error) {
    logger.error('Error in deleteAvailabilityRule action', {
      ruleId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete rule' 
    };
  }
}

/**
 * Bulk operations on availability rules
 */
export async function bulkUpdateAvailability(
  request: BulkAvailabilityRequest
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const authResult = await verifyAdminAccess();
    if (!authResult.authorized) {
      return { success: false, error: authResult.error };
    }

    // Validate the bulk request
    const validation = AvailabilityValidators.validateBulkRequest(request);
    if (!validation.isValid) {
      return { 
        success: false, 
        error: `Validation failed: ${validation.errors.join(', ')}` 
      };
    }

    let result: any;

    await withDatabaseConnection(async () => {
      switch (request.operation) {
        case 'create':
          const createRules = request.productIds.flatMap(productId =>
            request.rules.map(rule => ({ ...rule, productId }))
          );
          result = await AvailabilityQueries.bulkCreateRules(
            createRules as Omit<AvailabilityRule, 'id' | 'createdAt' | 'updatedAt'>[],
            authResult.user!.id
          );
          break;

        case 'update':
          const updateData = request.rules.map(rule => ({
            id: rule.id!,
            data: rule
          }));
          result = await AvailabilityQueries.bulkUpdateRules(updateData, authResult.user!.id);
          break;

        case 'delete':
          const ruleIds = request.rules.map(rule => rule.id!).filter(Boolean);
          await AvailabilityQueries.bulkDeleteRules(ruleIds, authResult.user!.id);
          result = { deletedCount: ruleIds.length };
          break;

        default:
          throw new Error('Invalid operation');
      }
    });

    // Schedule changes for created/updated rules
    if (request.operation !== 'delete' && Array.isArray(result)) {
      for (const rule of result) {
        await AvailabilityScheduler.scheduleRuleChanges(rule);
      }
    }

    // Revalidate relevant pages
    revalidatePath('/admin/products'); // Main product list
    revalidatePath('/admin/products/availability');
    for (const productId of request.productIds) {
      revalidatePath(`/admin/products/availability/${productId}`);
      revalidatePath(`/products/${productId}`);
    }

    logger.info('Bulk availability operation completed', {
      operation: request.operation,
      productCount: request.productIds.length,
      rulesCount: request.rules.length,
      userId: authResult.user!.id
    });

    return { success: true, data: result };
  } catch (error) {
    logger.error('Error in bulkUpdateAvailability action', {
      operation: request.operation,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Bulk operation failed' 
    };
  }
}

/**
 * Get availability evaluation for a product
 */
export async function getProductAvailability(
  productId: string
): Promise<{ success: boolean; data?: AvailabilityEvaluation; error?: string }> {
  try {
    const rules = await AvailabilityQueries.getProductRules(productId);
    const evaluation = await AvailabilityEngine.evaluateProduct(productId, rules);
    
    return { success: true, data: evaluation };
  } catch (error) {
    logger.error('Error in getProductAvailability action', {
      productId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get availability' 
    };
  }
}

/**
 * Preview availability changes
 */
export async function previewAvailabilityChanges(
  productId: string,
  draftRules: AvailabilityRule[]
): Promise<{ success: boolean; data?: AvailabilityEvaluation; error?: string }> {
  try {
    // Validate all draft rules
    for (const rule of draftRules) {
      const validation = AvailabilityValidators.validateRule(rule);
      if (!validation.isValid) {
        return { 
          success: false, 
          error: `Rule validation failed: ${validation.errors.join(', ')}` 
        };
      }
    }

    // Run evaluation with draft rules
    const evaluation = await AvailabilityEngine.evaluateProduct(productId, draftRules);
    
    return { success: true, data: evaluation };
  } catch (error) {
    logger.error('Error in previewAvailabilityChanges action', {
      productId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Preview failed' 
    };
  }
}

/**
 * Migrate product from Square-based availability
 */
export async function migrateFromSquareAvailability(
  productIds?: string[]
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const authResult = await verifyAdminAccess();
    if (!authResult.authorized) {
      return { success: false, error: authResult.error };
    }

    // Implementation would involve:
    // 1. Get current Square-based availability data
    // 2. Convert to new rule format
    // 3. Create rules via AvailabilityQueries
    // 4. Update product flags to use new system

    // For now, return success with placeholder data
    logger.info('Migration from Square availability requested', {
      productIds: productIds?.length || 'all',
      userId: authResult.user!.id
    });

    return { 
      success: true, 
      data: { 
        message: 'Migration functionality will be implemented in the migration script',
        productIds: productIds || []
      } 
    };
  } catch (error) {
    logger.error('Error in migrateFromSquareAvailability action', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Migration failed' 
    };
  }
}

/**
 * Process pending scheduled changes manually
 */
export async function processPendingChanges(): Promise<{ success: boolean; error?: string }> {
  try {
    const authResult = await verifyAdminAccess();
    if (!authResult.authorized) {
      return { success: false, error: authResult.error };
    }

    await AvailabilityScheduler.processPendingChanges();

    // Revalidate all availability-related pages
    revalidatePath('/admin/products'); // Main product list
    revalidatePath('/admin/products/availability');

    logger.info('Processed pending availability changes', {
      userId: authResult.user!.id
    });

    return { success: true };
  } catch (error) {
    logger.error('Error in processPendingChanges action', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to process changes' 
    };
  }
}

/**
 * Get rule conflicts for a product
 */
export async function getProductRuleConflicts(
  productId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const result = await AvailabilityQueries.getRulesWithConflicts(productId);
    
    return { success: true, data: result };
  } catch (error) {
    logger.error('Error in getProductRuleConflicts action', {
      productId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get conflicts' 
    };
  }
}

/**
 * Get availability statistics
 */
export async function getAvailabilityStatistics(): Promise<{ 
  success: boolean; 
  data?: any; 
  error?: string 
}> {
  try {
    const stats = await AvailabilityQueries.getRuleStatistics();
    
    return { success: true, data: stats };
  } catch (error) {
    logger.error('Error in getAvailabilityStatistics action', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get statistics' 
    };
  }
}
