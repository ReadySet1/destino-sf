'use client';

import { TextareaHTMLAttributes } from 'react';

interface FormTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  error?: boolean;
  className?: string;
}

/**
 * Standard form textarea with consistent styling
 */
export function FormTextarea({ 
  error = false, 
  className = '',
  rows = 5,
  ...props 
}: FormTextareaProps) {
  const baseClasses = "block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4 transition-all duration-200 resize-none";
  
  const errorClasses = error 
    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
    : '';

  const textareaClasses = `${baseClasses} ${errorClasses} ${className}`;

  return (
    <textarea
      {...props}
      rows={rows}
      className={textareaClasses}
    />
  );
}
