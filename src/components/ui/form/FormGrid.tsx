'use client';

import { ReactNode } from 'react';

interface FormGridProps {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4;
  gap?: 4 | 6 | 8;
  className?: string;
}

const colClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 lg:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
};

const gapClasses = {
  4: 'gap-4',
  6: 'gap-6',
  8: 'gap-8',
};

/**
 * Responsive grid container for form fields
 */
export function FormGrid({ children, cols = 2, gap = 8, className = '' }: FormGridProps) {
  const gridClasses = `grid ${colClasses[cols]} ${gapClasses[gap]} ${className}`;

  return <div className={gridClasses}>{children}</div>;
}
