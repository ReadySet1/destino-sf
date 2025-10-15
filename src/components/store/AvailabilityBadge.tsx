'use client';

import { Badge } from '@/components/ui/badge';
import { Clock, Eye, ShoppingCart, Package, Calendar, AlertTriangle, Star } from 'lucide-react';
import {
  AvailabilityState,
  type AvailabilityEvaluation,
  type PreOrderSettings,
  type ViewOnlySettings,
} from '@/types/availability';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AvailabilityBadgeProps {
  state: AvailabilityState;
  evaluation?: AvailabilityEvaluation;
  preOrderSettings?: PreOrderSettings;
  viewOnlySettings?: ViewOnlySettings;
  nextStateChange?: {
    date: Date;
    newState: AvailabilityState;
    rule: any;
  };
  showIcon?: boolean;
  showMessage?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function AvailabilityBadge({
  state,
  evaluation,
  preOrderSettings,
  viewOnlySettings,
  nextStateChange,
  showIcon = true,
  showMessage = false,
  size = 'default',
  className,
}: AvailabilityBadgeProps) {
  const getBadgeConfig = (state: AvailabilityState) => {
    switch (state) {
      case AvailabilityState.AVAILABLE:
        return {
          variant: 'secondary' as const,
          className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
          icon: ShoppingCart,
          label: 'Available',
          message: 'Ready to order now',
        };

      case AvailabilityState.PRE_ORDER:
        return {
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
          icon: Package,
          label: 'Pre-Order',
          message: preOrderSettings?.message || 'Available for pre-order',
        };

      case AvailabilityState.VIEW_ONLY:
        return {
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
          icon: Eye,
          label: 'View Only',
          message: viewOnlySettings?.message || 'Currently unavailable for purchase',
        };

      case AvailabilityState.HIDDEN:
        return {
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Eye,
          label: 'Hidden',
          message: 'This item is not currently visible',
        };

      case AvailabilityState.COMING_SOON:
        return {
          variant: 'secondary' as const,
          className: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
          icon: Calendar,
          label: 'Coming Soon',
          message: 'This item will be available soon',
        };

      case AvailabilityState.SOLD_OUT:
        return {
          variant: 'secondary' as const,
          className: 'bg-red-100 text-red-800 border-red-200',
          icon: AlertTriangle,
          label: 'Sold Out',
          message: 'This item is currently sold out',
        };

      case AvailabilityState.RESTRICTED:
        return {
          variant: 'secondary' as const,
          className: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: AlertTriangle,
          label: 'Restricted',
          message: 'Limited availability',
        };

      default:
        return {
          variant: 'outline' as const,
          className: 'border-gray-300 text-gray-600',
          icon: AlertTriangle,
          label: state,
          message: 'Status unknown',
        };
    }
  };

  const config = getBadgeConfig(state);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    default: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  // Don't render if hidden (unless specifically requested)
  if (state === AvailabilityState.HIDDEN) {
    return null;
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Badge
        variant={config.variant}
        className={cn(
          config.className,
          sizeClasses[size],
          'flex items-center gap-1.5 w-fit transition-colors'
        )}
      >
        {showIcon && <Icon className={iconSizeClasses[size]} />}
        <span className="font-medium">{config.label}</span>
      </Badge>

      {showMessage && config.message && (
        <p className="text-xs text-muted-foreground max-w-[200px]">{config.message}</p>
      )}

      {/* Show next state change info */}
      {nextStateChange && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>
            {getBadgeConfig(nextStateChange.newState).label} on{' '}
            {format(nextStateChange.date, 'MMM d')}
          </span>
        </div>
      )}

      {/* Pre-order specific info */}
      {state === AvailabilityState.PRE_ORDER && preOrderSettings?.expectedDeliveryDate && (
        <div className="text-xs text-blue-600 flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>Expected: {format(new Date(preOrderSettings.expectedDeliveryDate), 'MMM d')}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for product cards
 */
export function CompactAvailabilityBadge({
  state,
  className,
  ...props
}: Omit<AvailabilityBadgeProps, 'showMessage' | 'size'> & { className?: string }) {
  return (
    <AvailabilityBadge
      state={state}
      size="sm"
      showMessage={false}
      className={className}
      {...props}
    />
  );
}

/**
 * Detailed version for product pages
 */
export function DetailedAvailabilityBadge({
  state,
  className,
  ...props
}: Omit<AvailabilityBadgeProps, 'showMessage' | 'size'> & { className?: string }) {
  return (
    <AvailabilityBadge
      state={state}
      size="default"
      showMessage={true}
      className={className}
      {...props}
    />
  );
}

/**
 * Premium badge for featured/special items
 */
export function PremiumAvailabilityBadge({
  state,
  className,
  ...props
}: Omit<AvailabilityBadgeProps, 'showMessage' | 'size'> & { className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <AvailabilityBadge state={state} size="lg" showMessage={true} {...props} />
      {(state === AvailabilityState.PRE_ORDER || state === AvailabilityState.COMING_SOON) && (
        <Star className="absolute -top-1 -right-1 h-3 w-3 text-yellow-500 fill-current" />
      )}
    </div>
  );
}
