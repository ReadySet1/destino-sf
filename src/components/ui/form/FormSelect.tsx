'use client';

import { SelectHTMLAttributes, ReactNode } from 'react';

interface FormSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  error?: boolean;
  placeholder?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Standard form select with consistent styling
 */
export function FormSelect({
  error = false,
  placeholder,
  children,
  className = '',
  ...props
}: FormSelectProps) {
  const baseClasses =
    'block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4 transition-all duration-200';

  const errorClasses = error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : '';

  const selectClasses = `${baseClasses} ${errorClasses} ${className}`;

  return (
    <select {...props} className={selectClasses}>
      {placeholder && <option value="">{placeholder}</option>}
      {children}
    </select>
  );
}
