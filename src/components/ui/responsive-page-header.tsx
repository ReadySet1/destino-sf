// Responsive Page Header Component
// This component provides consistent page headers across admin pages

'use client';

import { ReactNode } from 'react';
import { useResponsive } from '@/hooks/useResponsive';
import { DEFAULT_TYPOGRAPHY } from '@/types/admin-layout';

export interface ResponsivePageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: ReactNode;
  className?: string;
}

export function ResponsivePageHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
  className = '',
}: ResponsivePageHeaderProps) {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  const getTitleSize = () => {
    if (isMobile) return DEFAULT_TYPOGRAPHY.headings.h1.mobile;
    if (isTablet) return DEFAULT_TYPOGRAPHY.headings.h1.tablet;
    if (isDesktop) return DEFAULT_TYPOGRAPHY.headings.h1.desktop;
    return DEFAULT_TYPOGRAPHY.headings.h1.wide || DEFAULT_TYPOGRAPHY.headings.h1.desktop;
  };

  const getSubtitleSize = () => {
    if (isMobile) return DEFAULT_TYPOGRAPHY.body.mobile;
    if (isTablet) return DEFAULT_TYPOGRAPHY.body.tablet;
    if (isDesktop) return DEFAULT_TYPOGRAPHY.body.desktop;
    return DEFAULT_TYPOGRAPHY.body.wide || DEFAULT_TYPOGRAPHY.body.desktop;
  };

  return (
    <div className={`space-y-4 md:space-y-6 ${className}`}>
      {/* Breadcrumbs */}
      {breadcrumbs && (
        <nav className="flex" aria-label="Breadcrumb">
          {breadcrumbs}
        </nav>
      )}

      {/* Header Content */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className={`${getTitleSize()} font-bold tracking-tight text-gray-900`}>
            {title}
          </h1>
          {subtitle && (
            <p className={`${getSubtitleSize()} text-gray-600 mt-2`}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

// Breadcrumb Item Component
export function BreadcrumbItem({
  children,
  href,
  isCurrent = false,
  className = '',
}: {
  children: ReactNode;
  href?: string;
  isCurrent?: boolean;
  className?: string;
}) {
  const baseClasses = 'text-sm font-medium';
  const currentClasses = 'text-gray-500 cursor-default';
  const linkClasses = 'text-gray-400 hover:text-gray-500 transition-colors duration-200';

  if (isCurrent) {
    return (
      <span className={`${baseClasses} ${currentClasses} ${className}`}>
        {children}
      </span>
    );
  }

  if (href) {
    return (
      <a href={href} className={`${baseClasses} ${linkClasses} ${className}`}>
        {children}
      </a>
    );
  }

  return (
    <span className={`${baseClasses} ${currentClasses} ${className}`}>
      {children}
    </span>
  );
}

// Breadcrumb Separator Component
export function BreadcrumbSeparator({ className = '' }: { className?: string }) {
  return (
    <span className={`mx-2 text-gray-400 ${className}`}>
      /
    </span>
  );
} 