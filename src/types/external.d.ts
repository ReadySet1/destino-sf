// Sanity Types
export interface SanityDocument {
  _id: string;
  _type: string;
  _createdAt: string;
  _updatedAt: string;
  _rev: string;
}

export interface SanityImage {
  _type: 'image';
  asset: {
    _ref: string;
    _type: 'reference';
  };
}

/* SanityProduct removed
export interface SanityProduct extends SanityDocument {
  name: string;
  description?: string;
  image?: SanityImage;
  squareId?: string;
  price?: number;
  category?: {
    _ref: string;
    _type: 'reference';
  };
}
*/

export interface SanityCategory extends SanityDocument {
  name: string;
  description?: string;
  image?: SanityImage;
}

// Square Types
export interface SquareError {
  message: string;
  code: string;
}

export interface SquareResponse<T> {
  data?: T;
  error?: SquareError;
}

export interface SquareImage {
  id: string;
  type: string;
  url: string;
}

export interface SquareProduct {
  id: string;
  name: string;
  description?: string;
  images?: SquareImage[];
  category_id?: string;
  variations?: Array<{
    id: string;
    price_money?: {
      amount: number;
      currency: string;
    };
  }>;
}

export interface SquareCategory {
  id: string;
  name: string;
  description?: string;
} 