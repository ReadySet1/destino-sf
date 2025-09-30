import { AvailabilityState, RuleType } from '@/types/availability';

/**
 * Get semantic color classes for availability states
 */
export function getAvailabilityStateColor(state: AvailabilityState): string {
  const colorMap: Record<AvailabilityState, string> = {
    [AvailabilityState.AVAILABLE]: 'bg-green-100 text-green-800',
    [AvailabilityState.PRE_ORDER]: 'bg-blue-100 text-blue-800',
    [AvailabilityState.VIEW_ONLY]: 'bg-yellow-100 text-yellow-800',
    [AvailabilityState.HIDDEN]: 'bg-gray-100 text-gray-800',
    [AvailabilityState.COMING_SOON]: 'bg-purple-100 text-purple-800',
    [AvailabilityState.SOLD_OUT]: 'bg-red-100 text-red-800',
    [AvailabilityState.RESTRICTED]: 'bg-orange-100 text-orange-800',
  };

  return colorMap[state] || 'bg-gray-100 text-gray-800';
}

/**
 * Get display label for availability state
 */
export function getAvailabilityStateLabel(state: AvailabilityState): string {
  const labelMap: Record<AvailabilityState, string> = {
    [AvailabilityState.AVAILABLE]: 'Available',
    [AvailabilityState.PRE_ORDER]: 'Pre-Order',
    [AvailabilityState.VIEW_ONLY]: 'View Only',
    [AvailabilityState.HIDDEN]: 'Hidden',
    [AvailabilityState.COMING_SOON]: 'Coming Soon',
    [AvailabilityState.SOLD_OUT]: 'Sold Out',
    [AvailabilityState.RESTRICTED]: 'Restricted',
  };

  return labelMap[state] || state;
}

/**
 * Get display label for rule type
 */
export function getRuleTypeLabel(type: RuleType): string {
  const labelMap: Record<RuleType, string> = {
    [RuleType.DATE_RANGE]: 'Date Range',
    [RuleType.SEASONAL]: 'Seasonal',
    [RuleType.TIME_BASED]: 'Time Based',
    [RuleType.INVENTORY]: 'Inventory',
    [RuleType.CUSTOM]: 'Custom',
  };

  return labelMap[type] || type;
}

/**
 * Get priority badge color
 */
export function getPriorityColor(priority: number): string {
  if (priority >= 90) return 'bg-red-100 text-red-800';
  if (priority >= 70) return 'bg-orange-100 text-orange-800';
  if (priority >= 50) return 'bg-yellow-100 text-yellow-800';
  return 'bg-green-100 text-green-800';
}

/**
 * Format rule type with icon
 */
export function getRuleTypeIcon(type: RuleType): string {
  const iconMap: Record<RuleType, string> = {
    [RuleType.DATE_RANGE]: 'Calendar',
    [RuleType.SEASONAL]: 'Calendar',
    [RuleType.TIME_BASED]: 'Clock',
    [RuleType.INVENTORY]: 'Package',
    [RuleType.CUSTOM]: 'Settings',
  };

  return iconMap[type] || 'Circle';
}

/**
 * Check if date range is active
 */
export function isRuleDateRangeActive(
  startDate: Date | null | undefined,
  endDate: Date | null | undefined
): boolean {
  const now = new Date();
  const isAfterStart = !startDate || now >= startDate;
  const isBeforeEnd = !endDate || now <= endDate;
  return isAfterStart && isBeforeEnd;
}

/**
 * Get relative time string
 */
export function getRelativeTimeString(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}