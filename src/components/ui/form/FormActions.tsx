'use client';

import { ReactNode } from 'react';

interface FormActionsProps {
  children: ReactNode;
  className?: string;
}

/**
 * Container for form action buttons
 * Provides consistent spacing and responsive layout
 */
export function FormActions({ children, className = '' }: FormActionsProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 px-8 py-6 ${className}`}>
      <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
        {children}
      </div>
    </div>
  );
}
