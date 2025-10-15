'use client';

import { DragOverlay as DndDragOverlay } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import Image from 'next/image';
import type { DragOverlayProps } from './types';

export function DragOverlay({ activeProduct }: DragOverlayProps) {
  if (!activeProduct) return null;

  return (
    <DndDragOverlay>
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4 shadow-lg opacity-95 transform rotate-3">
        {/* Drag Handle */}
        <div className="p-2 rounded bg-gray-100">
          <GripVertical className="w-4 h-4 text-gray-600" />
        </div>

        {/* Product Image */}
        <div className="w-16 h-16 relative bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
          {activeProduct.imageUrl ? (
            <Image
              src={activeProduct.imageUrl}
              alt={activeProduct.name}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
              No Image
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{activeProduct.name}</h3>
          <p className="text-sm text-gray-500">${activeProduct.price.toFixed(2)}</p>
          <p className="text-xs text-gray-400">Order: {activeProduct.ordinal}</p>
        </div>

        {/* Status Badges */}
        <div className="flex-shrink-0 flex flex-col gap-1">
          {/* Primary Status - Use hierarchy to show most important status */}
          {(() => {
            // Determine the primary status with clear hierarchy
            if (!activeProduct.active) {
              return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Inactive
                </span>
              );
            }

            if (activeProduct.visibility === 'PRIVATE') {
              return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Hidden
                </span>
              );
            }

            if (activeProduct.isAvailable === false) {
              return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Unavailable
                </span>
              );
            }

            if (activeProduct.itemState === 'SEASONAL') {
              return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Seasonal
                </span>
              );
            }

            if (activeProduct.itemState === 'ARCHIVED') {
              return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Archived
                </span>
              );
            }

            if (activeProduct.itemState === 'INACTIVE') {
              return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Inactive State
                </span>
              );
            }

            // Default to active
            return (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            );
          })()}

          {/* Secondary badges for additional info */}
          {activeProduct.isPreorder === true &&
            activeProduct.active &&
            activeProduct.isAvailable !== false && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Pre-order
              </span>
            )}
        </div>
      </div>
    </DndDragOverlay>
  );
}
