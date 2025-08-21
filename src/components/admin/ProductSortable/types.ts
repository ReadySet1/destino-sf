// Types for ProductSortable components

import type { ProductDisplayOrder } from '@/types/product-admin';

export interface SortableItemProps {
  product: ProductDisplayOrder;
  disabled?: boolean;
}

export interface ProductSortableProps {
  products: ProductDisplayOrder[];
  onReorder: (products: ProductDisplayOrder[]) => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
}

export interface DragOverlayProps {
  activeProduct: ProductDisplayOrder | null;
}

export interface ProductCardProps {
  product: ProductDisplayOrder;
  isDragging?: boolean;
  isOverlay?: boolean;
  disabled?: boolean;
}
