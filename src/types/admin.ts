import { DeliveryZone, ZoneMinimumConfig } from './catering';

/**
 * Admin interface types for managing delivery zones and minimum purchase requirements
 */

// Admin Zone Management
export interface AdminZoneConfig extends ZoneMinimumConfig {
  id?: string; // Database ID for persistence
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string; // Admin user who created/updated
}

// Zone Update Request
export interface ZoneUpdateRequest {
  zone: DeliveryZone;
  minimumAmount?: number;
  deliveryFee?: number;
  estimatedDeliveryTime?: string;
  description?: string;
  isActive?: boolean;
}

// Bulk Zone Update
export interface BulkZoneUpdate {
  zones: ZoneUpdateRequest[];
  updatedBy: string;
}

// Admin Dashboard Data
export interface AdminDeliveryDashboard {
  zones: AdminZoneConfig[];
  totalOrders: number;
  ordersByZone: Record<DeliveryZone, number>;
  revenueByZone: Record<DeliveryZone, number>;
  averageOrderValueByZone: Record<DeliveryZone, number>;
  minimumViolations: number; // Orders that failed minimum requirements
}

// Zone Analytics
export interface ZoneAnalytics {
  zone: DeliveryZone;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  minimumViolations: number;
  conversionRate: number; // Orders completed vs. abandoned due to minimums
  lastOrderDate?: Date;
}

// Admin Action Results
export interface AdminActionResult<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: Date;
}

// Zone Configuration Validation
export interface ZoneConfigValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  zone: DeliveryZone;
}

/**
 * Admin utility functions for zone management
 */

/**
 * Validate zone configuration before saving
 */
export function validateZoneConfig(config: ZoneUpdateRequest): ZoneConfigValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate minimum amount
  if (config.minimumAmount !== undefined) {
    if (config.minimumAmount < 0) {
      errors.push('Minimum amount cannot be negative');
    }
    if (config.minimumAmount < 100) {
      warnings.push('Minimum amount is quite low, consider operational costs');
    }
    if (config.minimumAmount > 1000) {
      warnings.push('High minimum amount may reduce order conversion');
    }
  }

  // Validate delivery fee
  if (config.deliveryFee !== undefined) {
    if (config.deliveryFee < 0) {
      errors.push('Delivery fee cannot be negative');
    }
    if (config.deliveryFee > 200) {
      warnings.push('High delivery fee may discourage orders');
    }
  }

  // Validate estimated delivery time
  if (config.estimatedDeliveryTime !== undefined && config.estimatedDeliveryTime.trim() === '') {
    errors.push('Estimated delivery time cannot be empty');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    zone: config.zone
  };
}

/**
 * Generate default zone configuration for new zones
 */
export function generateDefaultZoneConfig(zone: DeliveryZone): AdminZoneConfig {
  const baseConfig = {
    zone,
    name: zone.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
    minimumAmount: 250.00, // Default minimum
    deliveryFee: 50.00, // Default delivery fee
    estimatedDeliveryTime: '2-3 hours',
    description: `Delivery to ${zone.replace('_', ' ').toLowerCase()}`,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return baseConfig;
}

/**
 * Calculate recommended minimum based on delivery costs and zone distance
 */
export function calculateRecommendedMinimum(
  deliveryFee: number,
  distanceFromBase: number, // in miles
  averagePreparationCost: number = 50 // estimated cost to prepare order
): number {
  // Formula: (delivery fee + preparation cost) * profit margin
  const baseCost = deliveryFee + averagePreparationCost;
  const profitMargin = 1.5; // 50% markup
  const distanceMultiplier = Math.max(1, distanceFromBase / 10); // Increase minimum for far distances
  
  return Math.round((baseCost * profitMargin * distanceMultiplier) / 25) * 25; // Round to nearest $25
}

// Export types for common admin operations
export type AdminOperation = 'create' | 'update' | 'delete' | 'activate' | 'deactivate';

export interface AdminAuditLog {
  id: string;
  operation: AdminOperation;
  resource: 'zone_config' | 'minimum_requirement';
  resourceId: string;
  adminUserId: string;
  adminUserEmail: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
} 