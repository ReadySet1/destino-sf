'use client';

import { InputHTMLAttributes } from 'react';

interface FormCheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> {
  label: string;
  description?: string;
  error?: boolean;
  className?: string;
}

/**
 * Standard form checkbox with label and description
 */
export function FormCheckbox({
  label,
  description,
  error = false,
  className = '',
  ...props
}: FormCheckboxProps) {
  const checkboxClasses = error
    ? 'mt-1 h-5 w-5 rounded border-red-300 text-red-600 focus:ring-red-500'
    : 'mt-1 h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500';

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-start">
        <input type="checkbox" {...props} className={checkboxClasses} />
        <div className="ml-3">
          <label
            htmlFor={props.id}
            className="text-base font-semibold text-gray-700 cursor-pointer"
          >
            {label}
          </label>
          {description && (
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
