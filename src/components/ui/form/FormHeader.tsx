'use client';

import { ReactNode } from 'react';
import Link from 'next/link';

interface FormHeaderProps {
  title: string;
  description: string;
  backUrl?: string;
  backLabel?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * Standard header for admin forms
 * Includes title, description, back button, and optional actions
 */
export function FormHeader({
  title,
  description,
  backUrl,
  backLabel = 'Back',
  actions,
  className = '',
}: FormHeaderProps) {
  return (
    <div className={`mb-10 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
          <p className="text-base text-gray-600 leading-relaxed">{description}</p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-3">
          {backUrl && (
            <Link
              href={backUrl}
              className="inline-flex items-center px-5 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              {backLabel}
            </Link>
          )}
          {actions}
        </div>
      </div>
    </div>
  );
}
