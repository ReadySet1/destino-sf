'use client';

import { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  helpText?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Standard form field wrapper
 * Provides consistent label styling, help text, and error states
 */
export function FormField({
  label,
  required = false,
  helpText,
  error,
  children,
  className = '',
}: FormFieldProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-semibold text-gray-700 mb-3">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {helpText && !error && (
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">{helpText}</p>
      )}
      {error && <p className="mt-2 text-sm text-red-600 leading-relaxed">{error}</p>}
    </div>
  );
}
