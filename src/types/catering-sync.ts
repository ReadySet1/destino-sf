// src/types/catering-sync.ts

export interface CateringItemSource {
  squareData?: {
    id: string;
    name: string;
    price: number;
    hasImage: boolean;
    imageUrl?: string;
  };
  pdfData?: {
    name: string;
    ingredients: string[];
    dietary: string[];
  };
}

export interface CateringItemMerged {
  // Core fields
  name: string;
  squareItemId?: string;
  
  // From Square
  price: number;
  imageUrl?: string;
  
  // From PDF
  ingredients: string[];
  dietaryTags: string[];
  description?: string;
  
  // Computed
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  
  // Metadata
  sourceType: 'SQUARE' | 'PDF' | 'MERGED';
  confidence: number; // 0-1 matching confidence
}

export interface CateringSyncConfig {
  targetCategory: string;
  enableAutoMatching: boolean;
  matchingThreshold: number; // 0-1, default 0.8
  preserveLocalOverrides: boolean;
  syncImages: boolean;
  dryRun: boolean;
}

export interface CateringSyncResult {
  itemsProcessed: number;
  itemsMatched: number;
  itemsCreated: number;
  itemsUpdated: number;
  unmatchedSquareItems: string[];
  unmatchedPdfItems: string[];
  requiresManualReview: Array<{
    squareName: string;
    pdfName: string;
    confidence: number;
  }>;
}

export interface CateringItemMappingReview {
  id: string;
  squareName: string;
  pdfName: string;
  confidence: number;
  isVerified: boolean;
  squareData?: {
    price: number;
    hasImage: boolean;
  };
  pdfData?: {
    ingredients: string[];
    dietary: string[];
  };
}

export interface CateringAppetizersPdfData {
  appetizers: Array<{
    name: string;
    ingredients: string[];
    dietary: string[];
  }>;
  empanadas: {
    options: Array<{
      name: string;
      ingredients: string[];
      dietary: string[];
    }>;
  };
}
