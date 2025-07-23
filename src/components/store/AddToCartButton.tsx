import { Button } from '@/components/ui/button';
import { useSmartCart } from '@/hooks/useSmartCart';
import { ShoppingCart, Check } from 'lucide-react';
import { useState } from 'react';
import { Product as ProductType } from '@/types/product';
import { serializeDecimal } from '@/utils/serialization';

interface AddToCartButtonProps {
  product: ProductType;
  quantity?: number;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function AddToCartButton({
  product,
  quantity = 1,
  variant = 'default',
  size = 'default',
  className = '',
}: AddToCartButtonProps) {
  const { addToCart, isInAnyCart } = useSmartCart();
  const [isAdded, setIsAdded] = useState(false);
  const alreadyInCart = isInAnyCart(product.id, product.variants?.[0]?.id);

  const handleAddToCart = () => {
    // Convert price to number if it's a Decimal
    const numericPrice = serializeDecimal(product.price) || 0;

    // Create a properly formatted product object
    const cartProduct = {
      ...product,
      price: numericPrice,
      // If product has variants, use the first one's price (if available)
      ...(product.variants &&
        product.variants.length > 0 && {
          variantId: product.variants[0].id,
          price: serializeDecimal(product.variants[0].price) || numericPrice,
        }),
    };

    addToCart(cartProduct, quantity);

    // Show visual feedback
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 1500);
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleAddToCart}
      disabled={isAdded}
    >
      {isAdded || alreadyInCart ? (
        <>
          <Check className="h-4 w-4 mr-2" />
          {alreadyInCart ? 'In Cart' : 'Added'}
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart
        </>
      )}
    </Button>
  );
}
