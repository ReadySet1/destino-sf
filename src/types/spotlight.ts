export interface SpotlightPick {
  id?: string;
  position: 1 | 2 | 3 | 4;
  productId: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  
  // Product data (required)
  product: {
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
  };
}

export interface SpotlightPickFormData {
  position: 1 | 2 | 3 | 4;
  productId: string;
  isActive: boolean;
}

export interface SpotlightPicksManagerProps {
  initialPicks: SpotlightPick[];
}

export interface SpotlightAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
} 