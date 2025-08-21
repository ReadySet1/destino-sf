'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import Image from 'next/image';
import type { SortableItemProps } from './types';

export function SortableItem({ product, disabled = false }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: product.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4
        ${isDragging ? 'opacity-50' : ''}
        ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-default'}
        shadow-sm hover:shadow-md transition-shadow
      `}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className={`
          p-2 rounded cursor-grab active:cursor-grabbing
          ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-100'}
        `}
      >
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>

      {/* Product Image */}
      <div className="w-16 h-16 relative bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
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
        <h3 className="font-medium text-gray-900 truncate">
          {product.name}
        </h3>
        <p className="text-sm text-gray-500">
          ${product.price.toFixed(2)}
        </p>
        <p className="text-xs text-gray-400">
          Order: {product.ordinal}
        </p>
      </div>

      {/* Status Badge */}
      <div className="flex-shrink-0">
        <span
          className={`
            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
            ${product.active 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
            }
          `}
        >
          {product.active ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>
  );
}
