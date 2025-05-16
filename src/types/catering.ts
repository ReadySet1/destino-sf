// Define enums directly instead of importing from @prisma/client
// After running prisma generate, these imports can be replaced
export enum CateringPackageType {
  INDIVIDUAL = 'INDIVIDUAL',
  BUFFET = 'BUFFET',
  FAMILY_STYLE = 'FAMILY_STYLE'
}

export enum CateringItemCategory {
  STARTER = 'STARTER',
  ENTREE = 'ENTREE',
  SIDE = 'SIDE',
  SALAD = 'SALAD',
  DESSERT = 'DESSERT',
  BEVERAGE = 'BEVERAGE'
}

export enum CateringStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

// Definimos un mapeo de categorías de Square a nuestras pestañas
export const SQUARE_CATEGORY_MAPPING: Record<string, string> = {
  'CATERING- APPETIZERS': 'appetizers',
  'CATERING- SHARE PLATTERS': 'appetizers',
  'CATERING- DESSERTS': 'appetizers', // También aparece en buffet
  
  'CATERING- BUFFET, STARTERS': 'buffet',
  'CATERING- BUFFET, ENTREES': 'buffet',
  'CATERING- BUFFET, SIDES': 'buffet',
  'CATERING- BUFFET DESSERTS': 'buffet', // Los postres también van en buffet
  
  'CATERING- LUNCH, STARTERS': 'lunch',
  'CATERING- LUNCH, ENTREES': 'lunch',
  'CATERING- LUNCH, SIDES': 'lunch',
  
  'LUNCH PACKETS': 'lunch-packets'
};

export interface CateringPackage {
  id: string;
  name: string;
  description?: string | null;
  minPeople: number;
  pricePerPerson: number;
  type: CateringPackageType;
  imageUrl?: string | null;
  isActive: boolean;
  featuredOrder?: number | null;
  dietaryOptions: string[];
  ratings?: CateringRating[];
  items?: CateringPackageItem[];
  squareCategory?: string; // Categoría de Square
}

export interface CateringItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  category: CateringItemCategory;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  servingSize?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  squareCategory?: string; // Categoría de Square
}

export interface CateringPackageItem {
  id: string;
  packageId: string;
  itemId: string;
  quantity: number;
  cateringItem?: CateringItem;
}

export interface CateringRating {
  id: string;
  packageId: string;
  rating: number;
  review?: string | null;
  reviewerName?: string | null;
}

export interface CateringOrder {
  id: string;
  customerId?: string | null;
  email: string;
  name: string;
  phone: string;
  eventDate: Date;
  numberOfPeople: number;
  totalAmount: number;
  status: CateringStatus;
  notes?: string | null;
  specialRequests?: string | null;
  items: CateringOrderItem[];
}

export interface CateringOrderItem {
  id: string;
  orderId: string;
  itemType: string; // "package" or "item"
  itemId: string;
  name: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  notes?: string | null;
}

export interface CateringFormData {
  email: string;
  name: string;
  phone: string;
  eventDate: Date;
  numberOfPeople: number;
  notes?: string;
  specialRequests?: string;
}

// Funciones de utilidad para trabajar con categorías de Square
export function getItemsForTab(items: CateringItem[], tabId: string): CateringItem[] {
  return items.filter(item => {
    if (!item.squareCategory) return false;
    return SQUARE_CATEGORY_MAPPING[item.squareCategory] === tabId;
  });
}

export function groupItemsBySubcategory(items: CateringItem[]): Record<string, CateringItem[]> {
  const result: Record<string, CateringItem[]> = {};
  
  items.forEach(item => {
    if (!item.squareCategory) return;
    
    if (!result[item.squareCategory]) {
      result[item.squareCategory] = [];
    }
    
    result[item.squareCategory].push(item);
  });
  
  return result;
} 