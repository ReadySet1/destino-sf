import DOMPurify from 'isomorphic-dompurify';
import { BoxedLunchItem, BoxedLunchModifier } from '@/types/catering';

/**
 * Extracts dietary preferences from description text
 * Looks for patterns like "-gf", "-vg", "-vegan", "gluten free", etc.
 */
export function extractDietaryInfo(description: string): {
  isGlutenFree: boolean;
  isVegan: boolean;
  isVegetarian: boolean;
} {
  const descLower = description.toLowerCase();
  
  const isGlutenFree = descLower.includes('-gf') || 
                      descLower.includes('gluten free') || 
                      descLower.includes('gluten-free');
  
  const isVegan = descLower.includes('-vg') || 
                 descLower.includes('vegan') ||
                 descLower.includes('-vegan');
  
  const isVegetarian = descLower.includes('vegetarian') || 
                      descLower.includes('-vegetarian') || 
                      isVegan; // Vegan items are also vegetarian

  return {
    isGlutenFree,
    isVegan,
    isVegetarian
  };
}

/**
 * Sanitizes description HTML and special characters
 */
export function sanitizeDescription(description: string): string {
  if (!description) return '';
  
  // First sanitize HTML
  const sanitized = DOMPurify.sanitize(description);
  
  // Clean up common special characters while preserving basic formatting
  return sanitized
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates the total price including selected modifiers
 */
export function calculateTotalPrice(item: BoxedLunchItem, selectedModifier?: BoxedLunchModifier): number {
  const basePrice = item.price;
  const modifierPrice = selectedModifier ? selectedModifier.price : 0;
  return basePrice + modifierPrice;
}

/**
 * Formats price for display with currency symbol
 */
export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

/**
 * Checks if an item is the Tropical Salad that needs modifiers
 */
export function isTropicalSaladItem(item: BoxedLunchItem): boolean {
  return item.name.toLowerCase().includes('tropical salad');
}

/**
 * Gets the modifier by ID for a given item
 */
export function getModifierById(item: BoxedLunchItem, modifierId: string): BoxedLunchModifier | undefined {
  return item.modifiers?.find(modifier => modifier.id === modifierId);
}

/**
 * Creates dietary preference badges for display
 */
export function getDietaryBadges(item: BoxedLunchItem): Array<{
  label: string;
  variant: 'default' | 'secondary' | 'outline';
  className?: string;
}> {
  const badges = [];
  
  if (item.isGlutenFree) {
    badges.push({
      label: 'GF',
      variant: 'outline' as const,
      className: 'border-blue-500 text-blue-700 bg-blue-50'
    });
  }
  
  if (item.isVegan) {
    badges.push({
      label: 'Vegan',
      variant: 'outline' as const,
      className: 'border-green-600 text-green-700 bg-green-50'
    });
  } else if (item.isVegetarian) {
    badges.push({
      label: 'Vegetarian',
      variant: 'outline' as const,
      className: 'border-green-500 text-green-700 bg-green-50'
    });
  }
  
  return badges;
}

/**
 * Default modifier options for Tropical Salad
 */
export const TROPICAL_SALAD_MODIFIERS: BoxedLunchModifier[] = [
  {
    id: 'queso_fresco',
    name: 'Add Queso Fresco (4oz)',
    price: 2.00,
    dietaryInfo: 'gf'
  },
  {
    id: 'sirloin_steak',
    name: 'Add Sirloin Steak (4oz)',
    price: 4.00,
    dietaryInfo: 'gf'
  },
  {
    id: 'chicken_mojo',
    name: 'Add Chicken Mojo (4oz)',
    price: 3.00,
    dietaryInfo: 'gf'
  }
];

/**
 * Validates modifier selection for an item
 */
export function validateModifierSelection(item: BoxedLunchItem, modifierId?: string): {
  isValid: boolean;
  error?: string;
} {
  if (!modifierId) {
    return { isValid: true }; // No modifier selected is valid
  }
  
  if (!item.modifiers || item.modifiers.length === 0) {
    return { 
      isValid: false, 
      error: 'This item does not support modifiers' 
    };
  }
  
  const modifier = getModifierById(item, modifierId);
  if (!modifier) {
    return { 
      isValid: false, 
      error: 'Invalid modifier selected' 
    };
  }
  
  return { isValid: true };
}

/**
 * Creates cart item data from boxed lunch item with optional modifier
 */
export function createCartItemFromBoxedLunch(
  item: BoxedLunchItem, 
  quantity: number = 1,
  selectedModifier?: BoxedLunchModifier
) {
  const totalPrice = calculateTotalPrice(item, selectedModifier);
  const displayName = selectedModifier 
    ? `${item.name} + ${selectedModifier.name}`
    : item.name;

  const metadata = {
    type: 'boxed-lunch',
    subType: 'database-item',
    itemId: item.id,
    squareId: item.squareId,
    basePrice: item.price,
    ...(selectedModifier && {
      modifier: {
        id: selectedModifier.id,
        name: selectedModifier.name,
        price: selectedModifier.price
      }
    })
  };

  return {
    id: `boxed-lunch-db-${item.id}${selectedModifier ? `-${selectedModifier.id}` : ''}`,
    name: displayName,
    price: totalPrice,
    quantity,
    variantId: JSON.stringify(metadata),
    image: item.imageUrl || undefined,
  };
}
