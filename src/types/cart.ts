/**
 * Represents an item in the shopping cart
 */
export interface CartItem {
  id: string; // Product ID
  name: string; // Product name
  price: number; // Price per unit
  quantity: number; // Number of items
  variantId?: string; // Optional variant ID if this is a variant
  categoryId?: string; // Optional category ID for categorization
  imageUrl?: string; // Optional image URL
}

/**
 * Represents a full shopping cart
 */
export interface Cart {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
}
