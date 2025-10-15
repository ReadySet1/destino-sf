'use client';

import { ReactNode } from 'react';

interface FormContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Main container for admin forms
 * Provides consistent layout, spacing, and background
 */
export function FormContainer({ children, className = '' }: FormContainerProps) {
  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
    </div>
  );
}
