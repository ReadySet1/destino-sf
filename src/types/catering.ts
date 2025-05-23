// Define enums directly instead of importing from @prisma/client
// After running prisma generate, these imports can be replaced
export enum CateringPackageType {
  INDIVIDUAL = 'INDIVIDUAL',
  BUFFET = 'BUFFET',
  FAMILY_STYLE = 'FAMILY_STYLE',
  BOXED_LUNCH = 'BOXED_LUNCH' // New type for boxed lunches
}

export enum CateringItemCategory {
  STARTER = 'STARTER',
  ENTREE = 'ENTREE',
  SIDE = 'SIDE',
  SALAD = 'SALAD',
  DESSERT = 'DESSERT',
  BEVERAGE = 'BEVERAGE',
  // PROTEIN = 'PROTEIN', // New category for protein options - commented out due to DB migration issues
  // ADD_ON = 'ADD_ON' // New category for add-ons - commented out due to DB migration issues
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
  'APPETIZER_PACKAGES': 'lunch-packets', // Appetizer packages go in the lunch-packets tab
  
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

// New types for Boxed Lunch System
export enum BoxedLunchTier {
  TIER_1 = 'TIER_1', // $14.00 - 6oz protein, 2 sides
  TIER_2 = 'TIER_2', // $15.00 - 6oz protein, 2 sides  
  TIER_3 = 'TIER_3'  // $17.00 - 8oz protein, 2 sides
}

export enum ProteinOption {
  // Define your actual protein options
  CARNE_ASADA = 'CARNE_ASADA',
  POLLO_ASADO = 'POLLO_ASADO', 
  CARNITAS = 'CARNITAS',
  POLLO_AL_CARBON = 'POLLO_AL_CARBON',
  PESCADO = 'PESCADO',
  VEGETARIAN_OPTION = 'VEGETARIAN_OPTION'
}

export enum SideOption {
  ARROZ_ROJO = 'ARROZ_ROJO', // 4oz Arroz Rojo
  SAUTEED_VEGGIES = 'SAUTEED_VEGGIES', // 4oz Sauteed Veggies
  CHIPOTLE_POTATOES = 'CHIPOTLE_POTATOES', // 4oz Chipotle Potatoes
  KALE = 'KALE' // 4oz Kale
}

export enum SaladOption {
  ARUGULA_JICAMA = 'ARUGULA_JICAMA', // 3oz Arugula-Jicama Salad, Honey Vinaigrette
  STRAWBERRY_BEET = 'STRAWBERRY_BEET' // 3oz Strawberry-Beet Salad, Citrus Vinaigrette
}

export enum AddOnOption {
  BAMBOO_CUTLERY = 'BAMBOO_CUTLERY', // $1.50 - Individually wrapped bamboo cutlery w/ napkin
  COMPOSTABLE_SPOON = 'COMPOSTABLE_SPOON', // $1.50 - Compostable serving spoon
  INDIVIDUAL_SETUP = 'INDIVIDUAL_SETUP' // $2.00 - Bamboo cutlery w/ napkin, compostable plate
}

// Protein Configuration
export const PROTEIN_OPTIONS: Record<ProteinOption, { name: string; description: string; dietary: string[] }> = {
  [ProteinOption.CARNE_ASADA]: {
    name: 'Carne Asada',
    description: 'Grilled marinated beef',
    dietary: ['gluten-free']
  },
  [ProteinOption.POLLO_ASADO]: {
    name: 'Pollo Asado',
    description: 'Traditional roasted chicken',
    dietary: ['gluten-free']
  },
  [ProteinOption.CARNITAS]: {
    name: 'Carnitas',
    description: 'Slow-cooked pork shoulder',
    dietary: ['gluten-free']
  },
  [ProteinOption.POLLO_AL_CARBON]: {
    name: 'Pollo al Carbón',
    description: 'Charcoal-grilled chicken',
    dietary: ['gluten-free']
  },
  [ProteinOption.PESCADO]: {
    name: 'Pescado',
    description: 'Grilled seasonal fish',
    dietary: ['gluten-free', 'pescatarian']
  },
  [ProteinOption.VEGETARIAN_OPTION]: {
    name: 'Vegetarian Option',
    description: 'Plant-based protein alternative',
    dietary: ['vegetarian', 'vegan', 'gluten-free']
  }
};

// Boxed Lunch Configuration
export interface BoxedLunchTierConfig {
  tier: BoxedLunchTier;
  name: string;
  price: number;
  proteinSize: string; // "6oz" or "8oz"
  description: string;
  availableSides: SideOption[];
  availableProteins: ProteinOption[]; // Add available proteins per tier
}

export interface BoxedLunchPackage extends CateringPackage {
  type: CateringPackageType.BOXED_LUNCH;
  tier: BoxedLunchTier;
  proteinOptions: ProteinOption[];
  sideOptions: SideOption[];
  selectedProtein?: ProteinOption;
  selectedSides?: SideOption[];
}

export interface BoxedLunchAddOn {
  id: string;
  type: AddOnOption;
  name: string;
  price: number;
  description: string;
}

// Boxed Lunch Constants
export const BOXED_LUNCH_TIERS: Record<BoxedLunchTier, BoxedLunchTierConfig> = {
  [BoxedLunchTier.TIER_1]: {
    tier: BoxedLunchTier.TIER_1,
    name: 'Tier #1',
    price: 14.00,
    proteinSize: '6oz',
    description: 'Choice of protein, 2 sides: 4oz Arroz Rojo, 4oz Sautéed Veggies',
    availableSides: [SideOption.ARROZ_ROJO, SideOption.SAUTEED_VEGGIES],
    availableProteins: [ProteinOption.POLLO_ASADO, ProteinOption.CARNITAS, ProteinOption.VEGETARIAN_OPTION]
  },
  [BoxedLunchTier.TIER_2]: {
    tier: BoxedLunchTier.TIER_2,
    name: 'Tier #2',
    price: 15.00,
    proteinSize: '6oz',
    description: 'Choice of protein, 2 sides: 4oz Chipotle Potatoes, 4oz Kale',
    availableSides: [SideOption.CHIPOTLE_POTATOES, SideOption.KALE],
    availableProteins: [ProteinOption.CARNE_ASADA, ProteinOption.POLLO_AL_CARBON, ProteinOption.VEGETARIAN_OPTION]
  },
  [BoxedLunchTier.TIER_3]: {
    tier: BoxedLunchTier.TIER_3,
    name: 'Tier #3',
    price: 17.00,
    proteinSize: '8oz',
    description: 'Choice of protein, 2 sides: 4oz Sautéed Veggies, 4oz Chipotle Potatoes',
    availableSides: [SideOption.SAUTEED_VEGGIES, SideOption.CHIPOTLE_POTATOES],
    availableProteins: [ProteinOption.CARNE_ASADA, ProteinOption.POLLO_AL_CARBON, ProteinOption.PESCADO, ProteinOption.VEGETARIAN_OPTION]
  }
};

export const BOXED_LUNCH_SALADS: Record<SaladOption, { name: string; price: number; description: string }> = {
  [SaladOption.ARUGULA_JICAMA]: {
    name: 'Arugula-Jicama Salad',
    price: 3.75,
    description: '3oz Arugula-Jicama Salad with Honey Vinaigrette (side container of dressing)'
  },
  [SaladOption.STRAWBERRY_BEET]: {
    name: 'Strawberry-Beet Salad',
    price: 3.75,
    description: '3oz Strawberry-Beet Salad with Citrus Vinaigrette (side container of dressing)'
  }
};

export const BOXED_LUNCH_ADD_ONS: Record<AddOnOption, BoxedLunchAddOn> = {
  [AddOnOption.BAMBOO_CUTLERY]: {
    id: 'bamboo-cutlery',
    type: AddOnOption.BAMBOO_CUTLERY,
    name: 'Bamboo Cutlery Set',
    price: 1.50,
    description: 'Individually wrapped bamboo cutlery with napkin'
  },
  [AddOnOption.COMPOSTABLE_SPOON]: {
    id: 'compostable-spoon',
    type: AddOnOption.COMPOSTABLE_SPOON,
    name: 'Compostable Serving Spoon',
    price: 1.50,
    description: 'Compostable serving spoon for family style'
  },
  [AddOnOption.INDIVIDUAL_SETUP]: {
    id: 'individual-setup',
    type: AddOnOption.INDIVIDUAL_SETUP,
    name: 'Individual Place Setting',
    price: 2.00,
    description: 'Bamboo cutlery with napkin and compostable plate'
  }
}; 