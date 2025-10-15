'use client';

import { ReactNode } from 'react';

interface FormSectionProps {
  title: string;
  description: string;
  children: ReactNode;
  icon?: ReactNode;
  variant?: 'default' | 'blue' | 'green' | 'purple' | 'amber' | 'indigo';
  className?: string;
  action?: ReactNode;
}

const variantClasses = {
  default: 'bg-gray-50',
  blue: 'bg-blue-50',
  green: 'bg-green-50',
  purple: 'bg-purple-50',
  amber: 'bg-amber-50 border-amber-200',
  indigo: 'bg-indigo-50',
};

const iconColorClasses = {
  default: 'text-gray-600',
  blue: 'text-blue-600',
  green: 'text-green-600',
  purple: 'text-purple-600',
  amber: 'text-amber-600',
  indigo: 'text-indigo-600',
};

/**
 * Standard section container for forms
 * Provides consistent styling with colored headers and icons
 */
export function FormSection({
  title,
  description,
  children,
  icon,
  variant = 'default',
  className = '',
  action,
}: FormSectionProps) {
  const headerClass = variantClasses[variant];
  const iconClass = iconColorClasses[variant];
  const borderClass = variant === 'amber' ? 'border-amber-200' : 'border-gray-200';

  return (
    <div
      className={`bg-white shadow-sm rounded-xl border ${borderClass} overflow-hidden ${className}`}
    >
      <div className={`px-8 py-6 border-b ${borderClass} ${headerClass}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {icon && (
              <div className="flex-shrink-0">
                <div className={`w-6 h-6 ${iconClass}`}>{icon}</div>
              </div>
            )}
            <div className={icon ? 'ml-3' : ''}>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">{title}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
            </div>
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      </div>
      <div className="px-8 py-8">{children}</div>
    </div>
  );
}
