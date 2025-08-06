'use client';

import { useState } from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Image from 'next/image';
import { ProductReorderItem, ReorderUpdate } from '@/types/product';
import { updateProductOrder } from '@/app/(dashboard)/admin/products/actions';

interface SortableItemProps {
  product: ProductReorderItem;
}

function SortableItem({ product }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 p-4 bg-white rounded-lg border hover:shadow-md cursor-move"
      {...attributes}
      {...listeners}
    >
      <div className="text-gray-400 text-lg">☰</div>
      {product.images[0] && (
        <Image
          src={product.images[0]}
          alt={product.name}
          width={60}
          height={60}
          className="rounded object-cover"
        />
      )}
      <span className="flex-1 font-medium">{product.name}</span>
      <span className="text-sm text-gray-500">Position: {product.displayOrder}</span>
    </div>
  );
}

export function ProductReorderPanel({ 
  products: initialProducts,
  categoryId,
  categoryName 
}: {
  products: ProductReorderItem[];
  categoryId: string;
  categoryName: string;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = products.findIndex(p => p.id === active.id);
      const newIndex = products.findIndex(p => p.id === over.id);
      
      const newProducts = arrayMove(products, oldIndex, newIndex);
      setProducts(newProducts);
      
      // Create updates with new display orders
      const updates: ReorderUpdate[] = newProducts.map((product, index) => ({
        productId: product.id,
        newOrder: (index + 1) * 10
      }));
      
      setSaving(true);
      setMessage(null);
      
      try {
        const result = await updateProductOrder(updates);
        
        if (result.success) {
          // Update local state with new display orders
          const updatedProducts = newProducts.map((product, index) => ({
            ...product,
            displayOrder: (index + 1) * 10
          }));
          setProducts(updatedProducts);
          setMessage({ type: 'success', text: `Successfully reordered ${result.updatedCount} products` });
        } else {
          // Revert on error
          setProducts(initialProducts);
          setMessage({ 
            type: 'error', 
            text: result.errors?.[0] || 'Failed to save order' 
          });
        }
      } catch (error) {
        // Revert on error
        setProducts(initialProducts);
        setMessage({ 
          type: 'error', 
          text: 'Failed to save order. Please try again.' 
        });
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{categoryName} Products</h3>
        <span className="text-sm text-gray-500">{products.length} items</span>
      </div>
      
      {message && (
        <div className={`p-3 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}
      
      <div className="text-sm text-gray-600 mb-4">
        Drag and drop products to reorder them. Changes are saved automatically.
      </div>
      
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={products.map(p => p.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {products.map(product => (
              <SortableItem key={product.id} product={product} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      
      {saving && (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            Saving changes...
          </div>
        </div>
      )}
    </div>
  );
}