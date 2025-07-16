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

// Delivery Zones for Minimum Purchase Requirements
export enum DeliveryZone {
  SAN_FRANCISCO = 'SAN_FRANCISCO',
  SOUTH_BAY = 'SOUTH_BAY', 
  LOWER_PENINSULA = 'LOWER_PENINSULA',
  PENINSULA = 'PENINSULA'
}

// Zone Configuration Interface
export interface ZoneMinimumConfig {
  zone: DeliveryZone;
  name: string;
  minimumAmount: number;
  description?: string;
  deliveryFee?: number;
  estimatedDeliveryTime?: string;
  active: boolean;
}

// Default Zone Minimums Configuration
export const DELIVERY_ZONE_MINIMUMS: Record<DeliveryZone, ZoneMinimumConfig> = {
  [DeliveryZone.SAN_FRANCISCO]: {
    zone: DeliveryZone.SAN_FRANCISCO,
    name: 'San Francisco',
    minimumAmount: 250.00,
    description: 'San Francisco and surrounding areas',
    deliveryFee: 50.00,
    estimatedDeliveryTime: '1-2 hours',
    active: true
  },
  [DeliveryZone.SOUTH_BAY]: {
    zone: DeliveryZone.SOUTH_BAY,
    name: 'South Bay',
    minimumAmount: 350.00,
    description: 'San José, Santa Clara, Sunnyvale and surrounding areas',
    deliveryFee: 75.00,
    estimatedDeliveryTime: '2-3 hours',
    active: true
  },
  [DeliveryZone.LOWER_PENINSULA]: {
    zone: DeliveryZone.LOWER_PENINSULA,
    name: 'Lower Peninsula',
    minimumAmount: 400.00,
    description: 'Redwood City, Palo Alto, Mountain View and surrounding areas',
    deliveryFee: 100.00,
    estimatedDeliveryTime: '2-3 hours',
    active: true
  },
  [DeliveryZone.PENINSULA]: {
    zone: DeliveryZone.PENINSULA,
    name: 'Peninsula',
    minimumAmount: 500.00,
    description: 'San Ramón, Walnut Creek and far Peninsula areas',
    deliveryFee: 150.00,
    estimatedDeliveryTime: '3-4 hours',
    active: true
  }
};

// Minimum Purchase Validation
export interface MinimumPurchaseValidation {
  isValid: boolean;
  currentAmount: number;
  minimumRequired: number;
  zone: DeliveryZone;
  shortfall?: number;
  message?: string;
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
  squareProductId?: string | null; // Square Product ID for tracking
  createdAt?: Date;
  updatedAt?: Date;
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
  deliveryZone?: DeliveryZone;
  deliveryAddress?: string | null;
  deliveryFee?: number;
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

// Function to group buffet items with cleaner category names
export function groupBuffetItemsByCategory(items: CateringItem[]): Record<string, CateringItem[]> {
  const result: Record<string, CateringItem[]> = {};
  
  // Define the category mapping for buffet items
  const buffetCategoryMapping: Record<string, string> = {
    'CATERING- BUFFET, STARTERS': 'Starters',
    'CATERING- BUFFET, ENTREES': 'Entrees', 
    'CATERING- BUFFET, SIDES': 'Sides',
    'CATERING- BUFFET DESSERTS': 'Desserts',
    'CATERING- DESSERTS': 'Desserts' // Some desserts might be under this category too
  };
  
  items.forEach(item => {
    if (!item.squareCategory) return;
    
    const cleanCategory = buffetCategoryMapping[item.squareCategory];
    if (!cleanCategory) return; // Skip items that don't belong to buffet categories
    
    if (!result[cleanCategory]) {
      result[cleanCategory] = [];
    }
    
    result[cleanCategory].push(item);
  });
  
  return result;
}

// Function to group lunch items with cleaner category names and proper ordering
export function groupLunchItemsByCategory(items: CateringItem[]): Record<string, CateringItem[]> {
  const result: Record<string, CateringItem[]> = {};
  
  // Define the category mapping for lunch items
  const lunchCategoryMapping: Record<string, string> = {
    'CATERING- LUNCH, STARTERS': 'Starters',
    'CATERING- LUNCH, ENTREES': 'Entrees', 
    'CATERING- LUNCH, SIDES': 'Sides',
    'CATERING- DESSERTS': 'Desserts' // Desserts are shared across categories
  };
  
  items.forEach(item => {
    if (!item.squareCategory) return;
    
    const cleanCategory = lunchCategoryMapping[item.squareCategory];
    if (!cleanCategory) return; // Skip items that don't belong to lunch categories
    
    if (!result[cleanCategory]) {
      result[cleanCategory] = [];
    }
    
    result[cleanCategory].push(item);
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
  [AddOnOption.INDIVIDUAL_SETUP]: {
    id: 'individual-setup',
    type: AddOnOption.INDIVIDUAL_SETUP,
    name: 'Individual Place Setting',
    price: 2.00,
    description: 'Bamboo cutlery with napkin and compostable plate'
  }
};

// Utility Functions for Delivery Zones and Minimum Purchase Requirements

/**
 * Get zone configuration by zone enum
 */
export function getZoneConfig(zone: DeliveryZone): ZoneMinimumConfig {
  return DELIVERY_ZONE_MINIMUMS[zone];
}

/**
 * Get all active delivery zones
 */
export function getActiveDeliveryZones(): ZoneMinimumConfig[] {
  return Object.values(DELIVERY_ZONE_MINIMUMS).filter(zone => zone.active);
}

/**
 * Validate minimum purchase amount for a given zone
 */
export function validateMinimumPurchase(
  orderAmount: number,
  zone: DeliveryZone
): MinimumPurchaseValidation {
  const zoneConfig = getZoneConfig(zone);
  const isValid = orderAmount >= zoneConfig.minimumAmount;
  
  const validation: MinimumPurchaseValidation = {
    isValid,
    currentAmount: orderAmount,
    minimumRequired: zoneConfig.minimumAmount,
    zone
  };

  if (!isValid) {
    validation.shortfall = zoneConfig.minimumAmount - orderAmount;
    validation.message = `Minimum order of $${zoneConfig.minimumAmount.toFixed(2)} required for ${zoneConfig.name}. You need $${validation.shortfall.toFixed(2)} more.`;
  }

  return validation;
}

/**
 * Calculate total order amount including delivery fee
 */
export function calculateOrderTotal(
  subtotal: number,
  zone: DeliveryZone,
  includeDeliveryFee: boolean = true
): number {
  const zoneConfig = getZoneConfig(zone);
  const deliveryFee = includeDeliveryFee ? (zoneConfig.deliveryFee || 0) : 0;
  return subtotal + deliveryFee;
}

/**
 * Get minimum purchase message for display
 */
export function getMinimumPurchaseMessage(zone: DeliveryZone): string {
  const zoneConfig = getZoneConfig(zone);
  return `Minimum order: $${zoneConfig.minimumAmount.toFixed(2)} for ${zoneConfig.name}`;
}

/**
 * Determine delivery zone based on postal code or city
 * This is a simplified implementation - in production you'd use a more sophisticated
 * geocoding service or ZIP code database
 */
export function determineDeliveryZone(postalCode: string, city?: string): DeliveryZone | null {
  const zipCode = postalCode.replace(/\D/g, '').substring(0, 5);
  const zipNumber = parseInt(zipCode);
  
  // San Francisco ZIP codes: 94102-94199
  if (zipNumber >= 94102 && zipNumber <= 94199) {
    return DeliveryZone.SAN_FRANCISCO;
  }
  
  // South Bay ZIP codes (San José area): 95110-95199
  if (zipNumber >= 95110 && zipNumber <= 95199) {
    return DeliveryZone.SOUTH_BAY;
  }
  
  // Lower Peninsula ZIP codes: 94000-94099 and 94301-94399
  // This includes San Carlos (94070), Belmont, Burlingame, Daly City, Menlo Park, 
  // Redwood City, San Bruno, South San Francisco, and other San Mateo County cities
  if ((zipNumber >= 94000 && zipNumber <= 94099) || (zipNumber >= 94301 && zipNumber <= 94399)) {
    return DeliveryZone.LOWER_PENINSULA;
  }
  
  // Peninsula ZIP codes: 94500-94599 (Far Peninsula, East Bay)
  if (zipNumber >= 94500 && zipNumber <= 94599) {
    return DeliveryZone.PENINSULA;
  }
  
  // If we can't determine from ZIP, try city name matching
  if (city) {
    const cityLower = city.toLowerCase();
    
    if (cityLower.includes('san francisco') || cityLower.includes('sf')) {
      return DeliveryZone.SAN_FRANCISCO;
    }
    
    if (cityLower.includes('san jose') || cityLower.includes('san josé') || 
        cityLower.includes('santa clara') || cityLower.includes('sunnyvale')) {
      return DeliveryZone.SOUTH_BAY;
    }
    
    if (cityLower.includes('palo alto') || cityLower.includes('mountain view') || 
        cityLower.includes('redwood city') || cityLower.includes('san carlos') ||
        cityLower.includes('belmont') || cityLower.includes('burlingame') ||
        cityLower.includes('menlo park') || cityLower.includes('san bruno') ||
        cityLower.includes('south san francisco') || cityLower.includes('daly city')) {
      return DeliveryZone.LOWER_PENINSULA;
    }
    
    if (cityLower.includes('san ramon') || cityLower.includes('san ramón') || 
        cityLower.includes('walnut creek')) {
      return DeliveryZone.PENINSULA;
    }
  }
  
  return null; // Unable to determine zone
}

// Smart Override System for Square vs Local Items (matches Prisma schema)
export interface CateringItemOverrides {
  id: string;
  itemId: string; // Reference to the catering item
  // Fields that can be overridden locally (Prisma uses null, not undefined)
  localDescription: string | null;
  localImageUrl: string | null;
  localIsVegetarian: boolean | null;
  localIsVegan: boolean | null;
  localIsGlutenFree: boolean | null;
  localServingSize: string | null;
  localDietaryOptions: string[];
  // Control flags
  overrideDescription: boolean;
  overrideImage: boolean;
  overrideDietary: boolean;
  overrideServingSize: boolean;
  // Meta
  createdAt: Date;
  updatedAt: Date;
}

export interface EnhancedCateringItem extends Omit<CateringItem, 'category'> {
  // Use category from this module instead of Prisma
  category: CateringItemCategory;
  // Indicate if this item is from Square
  isSquareItem: boolean;
  // Original Square data (preserved during sync)
  squareData?: {
    originalDescription?: string;
    originalImageUrl?: string;
    originalPrice: number;
    lastSyncedAt: Date;
  };
  // Override data if present
  overrides?: CateringItemOverrides;
  // Computed final values (either Square or local override)
  finalDescription: string;
  finalImageUrl?: string;
  finalIsVegetarian: boolean;
  finalIsVegan: boolean;
  finalIsGlutenFree: boolean;
  finalServingSize?: string;
}

export enum ItemSource {
  LOCAL = 'LOCAL',
  SQUARE = 'SQUARE'
}

export interface ItemEditCapabilities {
  canEditName: boolean;
  canEditDescription: boolean;
  canEditPrice: boolean;
  canEditCategory: boolean;
  canEditDietary: boolean;
  canEditImage: boolean;
  canEditServingSize: boolean;
  canEditActive: boolean;
  source: ItemSource;
  warnings?: string[];
} 