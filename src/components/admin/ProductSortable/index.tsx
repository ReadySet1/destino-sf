'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { toast } from 'sonner';
import { SortableItem } from './SortableItem';
import { DragOverlay } from './DragOverlay';
import type { ProductSortableProps } from './types';
import type { ProductDisplayOrder } from '@/types/product-admin';

export function ProductSortable({
  products: initialProducts,
  onReorder,
  loading = false,
  disabled = false,
}: ProductSortableProps) {
  const [products, setProducts] = useState(initialProducts);
  const [isSaving, setIsSaving] = useState(false);
  const [activeProduct, setActiveProduct] = useState<ProductDisplayOrder | null>(null);

  // Sync internal state with props when initialProducts changes
  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  // Configure sensors for better touch and keyboard support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const activeProductItem = products.find(p => p.id === event.active.id);
    setActiveProduct(activeProductItem || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveProduct(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = products.findIndex(p => p.id === active.id);
    const newIndex = products.findIndex(p => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const newProducts = arrayMove(products, oldIndex, newIndex);

    // Update ordinals based on new positions
    const updatedProducts = newProducts.map((product, index) => ({
      ...product,
      ordinal: (index + 1) * 100,
    }));

    setProducts(updatedProducts);

    // Save to backend
    setIsSaving(true);
    try {
      await onReorder(updatedProducts);
      toast.success('Product order updated successfully');
    } catch (error) {
      // Revert on error
      setProducts(initialProducts);
      console.error('Failed to save order:', error);
      toast.error('Failed to update product order');
    } finally {
      setIsSaving(false);
    }
  };

  const isDisabled = loading || disabled || isSaving;

  return (
    <div className="space-y-4">
      {/* Status Indicator */}
      {isSaving && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-blue-700">Saving new order...</span>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!isDisabled && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-sm text-gray-600">
            Drag and drop products to reorder them. Changes are saved automatically.
          </p>
        </div>
      )}

      {/* Sortable List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext items={products.map(p => p.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {products.map(product => (
              <SortableItem key={product.id} product={product} disabled={isDisabled} />
            ))}
          </div>
        </SortableContext>

        <DragOverlay activeProduct={activeProduct} />
      </DndContext>

      {/* Empty State */}
      {products.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No products found in this category.</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-lg h-20 animate-pulse" />
          ))}
        </div>
      )}
    </div>
  );
}
