'use client';

import { Badge } from '@/components/ui/badge';
import { AvailabilityState } from '@/types/availability';
import { getAvailabilityStateColor, getAvailabilityStateLabel } from '@/lib/availability-helpers';
import { cn } from '@/lib/utils';

interface AvailabilityStatusBadgeProps {
  state: AvailabilityState;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Standardized status badge for availability states
 * Follows the design system color conventions
 */
export function AvailabilityStatusBadge({
  state,
  size = 'md',
  className,
}: AvailabilityStatusBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <Badge
      variant="secondary"
      className={cn(
        'inline-flex font-semibold rounded-full',
        getAvailabilityStateColor(state),
        sizeClasses[size],
        className
      )}
    >
      {getAvailabilityStateLabel(state)}
    </Badge>
  );
}
