// Admin Layout Utility Functions
// This file provides utility functions for responsive layout management

import { ResponsiveValue, DEFAULT_BREAKPOINTS } from '@/types/admin-layout';

/**
 * Get responsive value based on current breakpoint
 */
export function getResponsiveValue<T>(
  responsiveValue: ResponsiveValue<T>,
  breakpoint: 'mobile' | 'tablet' | 'desktop' | 'wide' = 'mobile'
): T {
  switch (breakpoint) {
    case 'wide':
      return responsiveValue.wide || responsiveValue.desktop;
    case 'desktop':
      return responsiveValue.desktop;
    case 'tablet':
      return responsiveValue.tablet;
    case 'mobile':
    default:
      return responsiveValue.mobile;
  }
}

/**
 * Generate responsive CSS classes for a responsive value
 */
export function generateResponsiveClasses(
  baseClass: string,
  responsiveValue: ResponsiveValue<string>
): string {
  const classes = [
    `${baseClass}-${responsiveValue.mobile}`,
    `md:${baseClass}-${responsiveValue.tablet}`,
    `lg:${baseClass}-${responsiveValue.desktop}`,
  ];

  if (responsiveValue.wide) {
    classes.push(`xl:${baseClass}-${responsiveValue.wide}`);
  }

  return classes.join(' ');
}

/**
 * Generate responsive padding classes
 */
export function getResponsivePadding(padding: ResponsiveValue<string>): string {
  return generateResponsiveClasses('p', padding);
}

/**
 * Generate responsive margin classes
 */
export function getResponsiveMargin(margin: ResponsiveValue<string>): string {
  return generateResponsiveClasses('m', margin);
}

/**
 * Generate responsive width classes
 */
export function getResponsiveWidth(width: ResponsiveValue<string>): string {
  return generateResponsiveClasses('w', width);
}

/**
 * Generate responsive height classes
 */
export function getResponsiveHeight(height: ResponsiveValue<string>): string {
  return generateResponsiveClasses('h', height);
}

/**
 * Generate responsive text size classes
 */
export function getResponsiveTextSize(textSize: ResponsiveValue<string>): string {
  return generateResponsiveClasses('text', textSize);
}

/**
 * Generate responsive gap classes
 */
export function getResponsiveGap(gap: ResponsiveValue<string>): string {
  return generateResponsiveClasses('gap', gap);
}

/**
 * Generate responsive spacing classes
 */
export function getResponsiveSpacing(spacing: ResponsiveValue<string>): string {
  return generateResponsiveClasses('space', spacing);
}

/**
 * Check if current viewport matches a breakpoint
 */
export function isBreakpoint(
  breakpoint: 'mobile' | 'tablet' | 'desktop' | 'wide',
  currentWidth: number
): boolean {
  const breakpoints = {
    mobile: 0,
    tablet: 768,
    desktop: 1024,
    wide: 1280,
  };

  switch (breakpoint) {
    case 'mobile':
      return currentWidth < breakpoints.tablet;
    case 'tablet':
      return currentWidth >= breakpoints.tablet && currentWidth < breakpoints.desktop;
    case 'desktop':
      return currentWidth >= breakpoints.desktop && currentWidth < breakpoints.wide;
    case 'wide':
      return currentWidth >= breakpoints.wide;
    default:
      return false;
  }
}

/**
 * Get current breakpoint based on window width
 */
export function getCurrentBreakpoint(width: number): 'mobile' | 'tablet' | 'desktop' | 'wide' {
  if (width >= 1280) return 'wide';
  if (width >= 1024) return 'desktop';
  if (width >= 768) return 'tablet';
  return 'mobile';
}

/**
 * Generate container classes with responsive max-width
 */
export function getContainerClasses(maxWidth: ResponsiveValue<string>): string {
  const classes = ['mx-auto', 'w-full'];
  
  if (maxWidth.mobile !== '100%') {
    classes.push(`max-w-[${maxWidth.mobile}]`);
  }
  if (maxWidth.tablet !== '100%') {
    classes.push(`md:max-w-[${maxWidth.tablet}]`);
  }
  if (maxWidth.desktop !== '100%') {
    classes.push(`lg:max-w-[${maxWidth.desktop}]`);
  }
  if (maxWidth.wide && maxWidth.wide !== '100%') {
    classes.push(`xl:max-w-[${maxWidth.wide}]`);
  }

  return classes.join(' ');
}

/**
 * Generate sidebar classes with responsive behavior
 */
export function getSidebarClasses(
  isOpen: boolean,
  sidebarWidth: ResponsiveValue<string>
): string {
  const baseClasses = [
    'fixed',
    'inset-y-0',
    'left-0',
    'z-40',
    'bg-gray-50',
    'border-r',
    'border-gray-200',
    'transition-transform',
    'duration-300',
    'ease-in-out',
    'flex',
    'flex-col',
  ];

  // Mobile behavior - hidden by default, shown when open
  if (isOpen) {
    baseClasses.push('translate-x-0');
  } else {
    baseClasses.push('-translate-x-full');
  }

  // Desktop behavior - always visible (tablet and above)
  baseClasses.push('md:translate-x-0');

  // Responsive width
  baseClasses.push(`w-[${sidebarWidth.mobile}]`);
  baseClasses.push(`md:w-[${sidebarWidth.tablet}]`);
  baseClasses.push(`lg:w-[${sidebarWidth.desktop}]`);
  if (sidebarWidth.wide) {
    baseClasses.push(`xl:w-[${sidebarWidth.wide}]`);
  }

  return baseClasses.join(' ');
}

/**
 * Generate main content classes with responsive margin
 */
export function getMainContentClasses(sidebarWidth: ResponsiveValue<string>): string {
  const baseClasses = [
    'flex-1',
    'transition-all',
    'duration-300',
    'ease-in-out',
  ];

  // Mobile: no margin (sidebar is overlay)
  // Desktop: add margin to account for fixed sidebar
  baseClasses.push(`md:ml-[${sidebarWidth.tablet}]`);
  baseClasses.push(`lg:ml-[${sidebarWidth.desktop}]`);
  if (sidebarWidth.wide) {
    baseClasses.push(`xl:ml-[${sidebarWidth.wide}]`);
  }

  return baseClasses.join(' ');
}

/**
 * Generate mobile menu button classes
 */
export function getMobileMenuClasses(
  position: { top: string; right: string; left?: string }
): string {
  const baseClasses = [
    'fixed',
    'z-50',
    'md:hidden',
    'p-2',
    'rounded-md',
    'text-gray-500',
    'bg-white/80',
    'backdrop-blur-sm',
    'hover:text-gray-700',
    'hover:bg-gray-100',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-inset',
    'focus:ring-indigo-500',
    'transition-colors',
    'duration-200',
  ];

  // Position classes
  baseClasses.push(`top-[${position.top}]`);
  if (position.right) {
    baseClasses.push(`right-[${position.right}]`);
  }
  if (position.left) {
    baseClasses.push(`left-[${position.left}]`);
  }

  return baseClasses.join(' ');
}

/**
 * Generate backdrop classes
 */
export function getBackdropClasses(isOpen: boolean): string {
  const baseClasses = [
    'fixed',
    'inset-0',
    'bg-black',
    'bg-opacity-50',
    'z-30',
    'md:hidden',
    'transition-opacity',
    'duration-300',
    'ease-in-out',
  ];

  if (isOpen) {
    baseClasses.push('opacity-100', 'pointer-events-auto');
  } else {
    baseClasses.push('opacity-0', 'pointer-events-none');
  }

  return baseClasses.join(' ');
}

/**
 * Generate responsive table classes
 */
export function getResponsiveTableClasses(): string {
  return [
    'w-full',
    'overflow-x-auto',
    'md:overflow-x-visible',
    'border',
    'border-gray-200',
    'rounded-lg',
    'shadow-sm',
  ].join(' ');
}

/**
 * Generate responsive card classes
 */
export function getResponsiveCardClasses(): string {
  return [
    'bg-white',
    'rounded-lg',
    'border',
    'border-gray-200',
    'shadow-sm',
    'hover:shadow-md',
    'transition-shadow',
    'duration-200',
  ].join(' ');
}

/**
 * Generate responsive form classes
 */
export function getResponsiveFormClasses(): string {
  return [
    'space-y-4',
    'md:space-y-6',
  ].join(' ');
}

/**
 * Generate responsive button group classes
 */
export function getResponsiveButtonGroupClasses(): string {
  return [
    'flex',
    'flex-col',
    'sm:flex-row',
    'gap-2',
    'sm:gap-3',
  ].join(' ');
} 