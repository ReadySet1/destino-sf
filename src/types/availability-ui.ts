import { AvailabilityState, RuleType } from './availability';

/**
 * Filter state for availability management pages
 */
export interface AvailabilityFilterState {
  search: string;
  ruleType: string;
  state: string;
  status: string; // enabled/disabled/all
  category?: string;
}

/**
 * Product row data for availability tables
 */
export interface AvailabilityProductTableRow {
  id: string;
  name: string;
  price: number;
  category: string;
  categoryId?: string;
  currentState: AvailabilityState;
  rulesCount: number;
}

/**
 * Statistics card data
 */
export interface AvailabilityStatCardData {
  title: string;
  value: number;
  subtitle: string;
  icon: string;
  variant: 'blue' | 'green' | 'purple' | 'amber' | 'indigo';
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
}

/**
 * Recent activity item
 */
export interface AvailabilityActivityItem {
  id: string;
  type: 'rule_created' | 'rule_updated' | 'rule_deleted' | 'bulk_update';
  description: string;
  timestamp: Date;
  userId?: string;
  userName?: string;
  metadata?: {
    ruleId?: string;
    ruleName?: string;
    productIds?: string[];
    affectedCount?: number;
  };
}

/**
 * Bulk action options
 */
export type AvailabilityBulkAction =
  | 'create_rule'
  | 'delete_rules'
  | 'enable_rules'
  | 'disable_rules'
  | 'export';

/**
 * Rule table row data
 */
export interface AvailabilityRuleTableRow {
  id: string;
  name: string;
  productId: string;
  productName: string;
  categoryName?: string;
  ruleType: RuleType;
  state: AvailabilityState;
  priority: number;
  enabled: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}