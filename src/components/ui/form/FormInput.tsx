'use client';

import { InputHTMLAttributes } from 'react';

interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  variant?: 'default' | 'currency' | 'monospace';
  error?: boolean;
  leftIcon?: string;
  className?: string;
}

/**
 * Standard form input with consistent styling
 * Supports different variants and states
 */
export function FormInput({
  variant = 'default',
  error = false,
  leftIcon,
  className = '',
  ...props
}: FormInputProps) {
  const baseClasses =
    'block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4 transition-all duration-200';

  const variantClasses = {
    default: '',
    currency: 'pl-8',
    monospace: 'font-mono',
  };

  const errorClasses = error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : '';

  const inputClasses = `${baseClasses} ${variantClasses[variant]} ${errorClasses} ${className}`;

  if (variant === 'currency') {
    return (
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <span className="text-gray-500 text-base font-medium">$</span>
        </div>
        <input {...props} className={inputClasses} />
      </div>
    );
  }

  return <input {...props} className={inputClasses} />;
}
