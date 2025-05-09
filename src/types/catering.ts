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