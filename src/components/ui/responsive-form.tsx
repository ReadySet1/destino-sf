// Responsive Form Component
// This component provides responsive form functionality with consistent layouts

'use client';

import { ReactNode } from 'react';
import { useResponsive } from '@/hooks/useResponsive';
import { getResponsiveFormClasses, getResponsiveButtonGroupClasses } from '@/utils/admin-layout';
import { DEFAULT_FORM_CONFIG } from '@/types/admin-layout';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio';
  placeholder?: string;
  required?: boolean;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
  options?: Array<{ value: string; label: string }>;
  className?: string;
  mobileFullWidth?: boolean;
  tabletFullWidth?: boolean;
  desktopFullWidth?: boolean;
}

export interface ResponsiveFormProps {
  fields: FormField[];
  onSubmit: (data: Record<string, any>) => void;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  loading?: boolean;
  config?: Partial<typeof DEFAULT_FORM_CONFIG>;
  className?: string;
  children?: ReactNode;
}

export function ResponsiveForm({
  fields,
  onSubmit,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  onCancel,
  loading = false,
  config = DEFAULT_FORM_CONFIG,
  className = '',
  children,
}: ResponsiveFormProps) {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Record<string, any> = {};

    fields.forEach(field => {
      const value = formData.get(field.name);
      if (field.type === 'checkbox') {
        data[field.name] = formData.has(field.name);
      } else {
        data[field.name] = value;
      }
    });

    onSubmit(data);
  };

  const getFieldWidth = (field: FormField) => {
    if (isMobile && field.mobileFullWidth) return 'w-full';
    if (isTablet && field.tabletFullWidth) return 'w-full';
    if (isDesktop && field.desktopFullWidth) return 'w-full';
    return 'w-full sm:w-auto';
  };

  const labelClasses = ['block', 'text-sm', 'font-medium', 'text-gray-700', 'mb-1'];

  const renderField = (field: FormField) => {
    const baseClasses = [
      'block',
      'w-full',
      'px-3',
      'py-2',
      'border',
      'border-gray-300',
      'rounded-md',
      'shadow-sm',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-indigo-500',
      'focus:border-indigo-500',
      'transition-colors',
      'duration-200',
    ];

    const fieldClasses = [...baseClasses, field.className || ''].join(' ');

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            name={field.name}
            placeholder={field.placeholder}
            required={field.required}
            className={`${fieldClasses} resize-vertical min-h-[100px]`}
            {...field.validation}
          />
        );

      case 'select':
        return (
          <select name={field.name} required={field.required} className={fieldClasses}>
            <option value="">{field.placeholder || 'Select an option'}</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              name={field.name}
              required={field.required}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">{field.label}</label>
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map(option => (
              <div key={option.value} className="flex items-center">
                <input
                  type="radio"
                  name={field.name}
                  value={option.value}
                  required={field.required}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <label className="ml-2 block text-sm text-gray-900">{option.label}</label>
              </div>
            ))}
          </div>
        );

      default:
        return (
          <input
            type={field.type}
            name={field.name}
            placeholder={field.placeholder}
            required={field.required}
            className={fieldClasses}
            {...field.validation}
          />
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`${getResponsiveFormClasses()} ${className}`}>
      <div className="space-y-4 md:space-y-6">
        {fields.map(field => (
          <div key={field.name} className={getFieldWidth(field)}>
            {field.type !== 'checkbox' && field.type !== 'radio' && (
              <label htmlFor={field.name} className={labelClasses.join(' ')}>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
            {renderField(field)}
          </div>
        ))}

        {children}

        <div className={getResponsiveButtonGroupClasses()}>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? 'Loading...' : submitLabel}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 sm:flex-none px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
            >
              {cancelLabel}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

// Utility function to create form fields with consistent configuration
export function createFormField(
  name: string,
  label: string,
  type: FormField['type'],
  options: Partial<FormField> = {}
): FormField {
  return {
    name,
    label,
    type,
    required: false,
    mobileFullWidth: true,
    tabletFullWidth: false,
    desktopFullWidth: false,
    ...options,
  };
}
