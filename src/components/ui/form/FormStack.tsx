'use client';

import { ReactNode } from 'react';

interface FormStackProps {
  children: ReactNode;
  spacing?: 4 | 6 | 8 | 10;
  className?: string;
}

const spacingClasses = {
  4: 'space-y-4',
  6: 'space-y-6',
  8: 'space-y-8',
  10: 'space-y-10',
};

/**
 * Vertical stack container with consistent spacing
 */
export function FormStack({ children, spacing = 8, className = '' }: FormStackProps) {
  const stackClasses = `${spacingClasses[spacing]} ${className}`;

  return <div className={stackClasses}>{children}</div>;
}
