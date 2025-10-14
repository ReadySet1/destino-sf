// TrustSignalCard Component
// Displays a single trust signal with icon, title, and description
// Used below the "You Might Also Like" section on product detail pages

import React from 'react';
import { getIconComponent } from '@/lib/utils/icon-mapper';
import type { TrustSignal } from '@/types/trust-signals';

interface TrustSignalCardProps {
  signal: TrustSignal;
}

export function TrustSignalCard({ signal }: TrustSignalCardProps) {
  const IconComponent = getIconComponent(signal.icon);

  // Map color names to Tailwind classes
  const iconColorClass = `text-${signal.iconColor}-600`;
  const bgColorClass = `bg-${signal.bgColor}`;

  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-12 h-12 ${bgColorClass} rounded-full flex items-center justify-center mb-2`}
      >
        <IconComponent className={`w-6 h-6 ${iconColorClass}`} />
      </div>
      <h3 className="font-semibold text-gray-900 mb-1 text-center">{signal.title}</h3>
      <p className="text-gray-600 text-sm text-center">{signal.description}</p>
    </div>
  );
}

// Loading skeleton for trust signal cards
export function TrustSignalCardSkeleton() {
  return (
    <div className="flex flex-col items-center animate-pulse">
      <div className="w-12 h-12 bg-gray-200 rounded-full mb-2" />
      <div className="h-4 bg-gray-200 rounded w-32 mb-1" />
      <div className="h-3 bg-gray-200 rounded w-48" />
    </div>
  );
}
