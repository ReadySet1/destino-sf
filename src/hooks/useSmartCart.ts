import { useCartStore, CartItem } from '@/store/cart';
import { useCateringCartStore, CateringCartItem } from '@/store/catering-cart';
import { isCateringProduct } from '@/utils/cart-helpers';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { Product as DbProduct } from '@/types/product';
import { serializeDecimal } from '@/utils/serialization';

// This is the simplified Product type for internal use
interface SimpleProduct {
  id: string;
  name: string;
  price: number;
  image?: string;
  variantId?: string;
  category?: {
    id?: string;
    name?: string;
  };
}

// Union type that accepts both our simple product and DB product
type ProductInput = SimpleProduct | DbProduct;

export function useSmartCart() {
  const regularCart = useCartStore();
  const cateringCart = useCateringCartStore();

  /**
   * Normalizes a product to ensure it has the correct shape for cart operations
   */
  const normalizeProduct = useCallback((product: ProductInput): SimpleProduct => {
    // If product is from DB (has variants property), convert price to number
    if ('variants' in product) {
      const dbProduct = product as DbProduct;
      const numericPrice = serializeDecimal(dbProduct.price) || 0;
      
      return {
        id: dbProduct.id,
        name: dbProduct.name,
        price: numericPrice,
        image: dbProduct.images?.[0],
        variantId: dbProduct.variants?.[0]?.id,
        category: {
          id: dbProduct.categoryId,
          name: dbProduct.category?.name,
        }
      };
    }
    
    // If it's already a simple product, return as is
    return product as SimpleProduct;
  }, []);

  /**
   * Adds a product to the appropriate cart based on its category
   */
  const addToCart = useCallback((product: ProductInput, quantity: number = 1) => {
    const normalizedProduct = normalizeProduct(product);
    const isCatering = isCateringProduct(normalizedProduct);
    
    const cartItem = {
      id: normalizedProduct.id,
      name: normalizedProduct.name,
      price: normalizedProduct.price,
      quantity: quantity,
      image: normalizedProduct.image,
      variantId: normalizedProduct.variantId,
    };

    if (isCatering) {
      cateringCart.addItem(cartItem as CateringCartItem);
      toast.success(`Added to catering cart: ${normalizedProduct.name}`);
    } else {
      regularCart.addItem(cartItem as CartItem);
      toast.success(`Added to cart: ${normalizedProduct.name}`);
    }

    return isCatering ? 'catering' : 'regular';
  }, [regularCart, cateringCart, normalizeProduct]);

  /**
   * Removes a product from both carts (useful when you're not sure which cart it's in)
   */
  const removeFromAllCarts = useCallback((productId: string, variantId?: string) => {
    regularCart.removeItem(productId, variantId);
    cateringCart.removeItem(productId, variantId);
  }, [regularCart, cateringCart]);

  /**
   * Gets the total number of items across both carts
   */
  const getTotalItemCount = useCallback(() => {
    return regularCart.totalItems + cateringCart.totalItems;
  }, [regularCart.totalItems, cateringCart.totalItems]);

  /**
   * Checks if a product is in either cart
   */
  const isInAnyCart = useCallback((productId: string, variantId?: string) => {
    const inRegularCart = regularCart.items.some(
      item => item.id === productId && item.variantId === variantId
    );
    
    const inCateringCart = cateringCart.items.some(
      item => item.id === productId && item.variantId === variantId
    );
    
    return inRegularCart || inCateringCart;
  }, [regularCart.items, cateringCart.items]);

  return {
    regularCart,
    cateringCart,
    addToCart,
    removeFromAllCarts,
    getTotalItemCount,
    isInAnyCart,
  };
} 