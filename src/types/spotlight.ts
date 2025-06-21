export interface SpotlightPick {
  id?: string;
  position: 1 | 2 | 3 | 4;
  productId?: string | null;
  customTitle?: string | null;
  customDescription?: string | null;
  customImageUrl?: string | null;
  customPrice?: number | null;
  isCustom: boolean;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  
  // Joined product data when not custom
  product?: {
    id: string;
    name: string;
    description?: string | null;
    images: string[];
    price: number;
    slug?: string | null;
    category?: {
      name: string;
      slug?: string | null;
    };
  } | null;
}

export interface SpotlightPicksManagerProps {
  initialPicks: SpotlightPick[];
}

export interface SpotlightPickFormData {
  position: 1 | 2 | 3 | 4;
  isCustom: boolean;
  productId?: string;
  customTitle?: string;
  customDescription?: string;
  customImageUrl?: string;
  customPrice?: number;
  isActive: boolean;
}

export interface SpotlightPickModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pick: SpotlightPickFormData) => Promise<void>;
  currentPick?: SpotlightPick | null;
  position: 1 | 2 | 3 | 4;
  categories: Array<{
    id: string;
    name: string;
    slug?: string | null;
  }>;
}

export interface SpotlightUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface SpotlightAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
} 