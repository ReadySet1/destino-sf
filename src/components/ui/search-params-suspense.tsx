'use client';

import { Suspense, ReactNode } from 'react';

interface SearchParamsSuspenseProps {
  children: ReactNode;
  fallback?: ReactNode;
}

const DefaultFallback = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
  </div>
);

export function SearchParamsSuspense({ children, fallback }: SearchParamsSuspenseProps) {
  return <Suspense fallback={fallback || <DefaultFallback />}>{children}</Suspense>;
}
