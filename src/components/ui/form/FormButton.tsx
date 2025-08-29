'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';

interface BaseButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
}

interface ButtonProps extends BaseButtonProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> {
  href?: never;
}

interface LinkButtonProps extends BaseButtonProps {
  href: string;
  onClick?: never;
  type?: never;
  disabled?: never;
}

type FormButtonProps = ButtonProps | LinkButtonProps;

const variants = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent focus:ring-indigo-500',
  secondary: 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 focus:ring-indigo-500',
  danger: 'bg-red-600 hover:bg-red-700 text-white border-transparent focus:ring-red-500',
};

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-3 text-base',
};

/**
 * Standard form button with consistent styling
 * Can be rendered as button or Link component
 */
export function FormButton({ 
  children, 
  variant = 'primary', 
  size = 'md',
  leftIcon,
  rightIcon,
  className = '',
  ...props 
}: FormButtonProps) {
  const baseClasses = "inline-flex items-center justify-center border rounded-lg shadow-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200";
  const variantClasses = variants[variant];
  const sizeClasses = sizes[size];
  
  const buttonClasses = `${baseClasses} ${variantClasses} ${sizeClasses} ${className}`;

  const content = (
    <>
      {leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="ml-2">{rightIcon}</span>}
    </>
  );

  if ('href' in props && props.href) {
    return (
      <Link href={props.href} className={buttonClasses}>
        {content}
      </Link>
    );
  }

  return (
    <button {...(props as ButtonProps)} className={buttonClasses}>
      {content}
    </button>
  );
}
