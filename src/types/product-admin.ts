// TypeScript types for admin product display order management

export interface ProductDisplayOrder {
  id: string;
  name: string;
  ordinal: number;
  categoryId: string;
  imageUrl?: string;
  price: number;
  active: boolean;
  // Additional fields for badge display
  isAvailable?: boolean | null;
  isPreorder?: boolean | null;
  visibility?: string | null;
  itemState?: string | null;
}

export interface ReorderRequest {
  categoryId: string;
  productOrders: Array<{
    productId: string;
    ordinal: number;
  }>;
}

export interface CategoryProductsResponse {
  categoryId: string;
  categoryName: string;
  products: ProductDisplayOrder[];
}

export interface ReorderUpdateItem {
  id: string;
  ordinal: number;
}

export interface ReorderResponse {
  success: boolean;
  message: string;
  updatedCount?: number;
}

export type ReorderStrategy =
  | 'ALPHABETICAL'
  | 'PRICE_ASC'
  | 'PRICE_DESC'
  | 'NEWEST_FIRST'
  | 'CUSTOM';

export interface QuickSortRequest {
  categoryId: string;
  strategy: ReorderStrategy;
}

export interface CategoryOption {
  id: string;
  name: string;
  productCount: number;
}

// For drag and drop operations
export interface DragEndResult {
  oldIndex: number;
  newIndex: number;
  productId: string;
}

// For bulk operations
export interface BulkReorderOperation {
  categoryId: string;
  updates: Array<{
    productId: string;
    newOrdinal: number;
  }>;
}
