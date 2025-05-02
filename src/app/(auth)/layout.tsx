'use client';

import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // Auth layout should be minimal and not duplicate HTML structure
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
