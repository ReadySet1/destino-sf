'use client';

import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvailabilityStatCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: ReactNode;
  variant?: 'blue' | 'green' | 'purple' | 'amber' | 'indigo';
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  className?: string;
}

const variantClasses = {
  blue: 'bg-blue-50 border-blue-200',
  green: 'bg-green-50 border-green-200',
  purple: 'bg-purple-50 border-purple-200',
  amber: 'bg-amber-50 border-amber-200',
  indigo: 'bg-indigo-50 border-indigo-200',
};

const iconColorClasses = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  purple: 'text-purple-600',
  amber: 'text-amber-600',
  indigo: 'text-indigo-600',
};

/**
 * Reusable statistics card component for availability dashboard
 * Follows the design system with colored headers and icons
 */
export function AvailabilityStatCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'blue',
  trend,
  className,
}: AvailabilityStatCardProps) {
  const headerClass = variantClasses[variant];
  const iconClass = iconColorClasses[variant];

  return (
    <div
      className={cn('bg-white shadow-sm rounded-xl border overflow-hidden', headerClass, className)}
    >
      <div className={cn('px-6 py-4 border-b', headerClass)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('w-5 h-5', iconClass)}>{icon}</div>
            <h3 className="text-sm font-medium text-gray-700">{title}</h3>
          </div>
          {trend && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs font-medium',
                trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
              )}
            >
              {trend.direction === 'up' ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
      </div>
      <div className="px-6 py-4 bg-white">
        <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
        <p className="text-sm text-gray-600">{subtitle}</p>
      </div>
    </div>
  );
}
