// src/types/product-archive.ts

export interface ArchiveStats {
  total: number;
  byCategory: Record<string, number>;
  byReason: Record<string, number>;
}

export interface ArchivedProduct {
  id: string;
  name: string;
  squareId: string;
  active: boolean;
  isArchived: boolean;
  archivedAt: Date | null;
  archivedReason: 'square_archived' | 'removed_from_square' | 'manual' | null;
  category?: {
    id: string;
    name: string;
  } | null;
  image?: string | null;
  price?: number | null;
}

export type ArchiveFilter = 'all' | 'active' | 'archived';
export type ArchiveReason = 'all' | 'square_archived' | 'removed_from_square' | 'manual';
