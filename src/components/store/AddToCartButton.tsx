import { Button } from '@/components/ui/button';
import { useSmartCart } from '@/hooks/useSmartCart';
import { ShoppingCart, Check, Eye, Calendar, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { Product as ProductType } from '@/types/product';
import { serializeDecimal } from '@/utils/serialization';
import { useAvailability } from '@/hooks/useAvailability';
import { PreOrderButton } from './PreOrderButton';
import { AvailabilityState } from '@/types/availability';
import { toast } from 'sonner';

interface AddToCartButtonProps {
  product: ProductType;
  quantity?: number;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  showAvailabilityMessages?: boolean;
}

export function AddToCartButton({
  product,
  quantity = 1,
  variant = 'default',
  size = 'default',
  className = '',
  showAvailabilityMessages = true,
}: AddToCartButtonProps) {
  const { addToCart, isInAnyCart } = useSmartCart();
  const [isAdded, setIsAdded] = useState(false);
  const alreadyInCart = isInAnyCart(product.id, product.variants?.[0]?.id);
  
  // Get availability state for this product
  const {
    currentState,
    isAvailable,
    isPreOrder,
    isViewOnly,
    isHidden,
    preOrderSettings,
    viewOnlySettings,
    isLoading: availabilityLoading,
    error: availabilityError
  } = useAvailability(product.id);

  const handleAddToCart = async (productId: string, qty: number, isPreOrderItem: boolean = false) => {
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
      // Add pre-order metadata
      ...(isPreOrderItem && {
        isPreOrder: true,
        preOrderSettings
      })
    };

    addToCart(cartProduct, qty);

    // Show visual feedback
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 1500);

    if (isPreOrderItem) {
      toast.success(`Pre-order added to cart: ${product.name}`);
    }
  };

  const handleRegularAddToCart = () => {
    handleAddToCart(product.id, quantity, false);
  };

  // Handle loading state
  if (availabilityLoading) {
    return (
      <Button
        variant="outline"
        size={size}
        className={className}
        disabled
      >
        <div className="h-4 w-4 mr-2 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
        Loading...
      </Button>
    );
  }

  // Handle error state (fallback to basic add to cart)
  if (availabilityError) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleRegularAddToCart}
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

  // Handle different availability states
  switch (currentState) {
    case AvailabilityState.HIDDEN:
      // Don't render anything for hidden products
      return null;

    case AvailabilityState.PRE_ORDER:
      // Render pre-order button if we have settings
      if (preOrderSettings) {
        return (
          <PreOrderButton
            product={{
              id: product.id,
              name: product.name,
              price: serializeDecimal(product.price) || 0,
              images: product.images
            }}
            settings={preOrderSettings}
            onAddToCart={handleAddToCart}
            className={className}
          />
        );
      }
      // Fallback to disabled button
      return (
        <Button
          variant="outline"
          size={size}
          className={className}
          disabled
        >
          <Calendar className="h-4 w-4 mr-2" />
          Pre-Order Only
        </Button>
      );

    case AvailabilityState.VIEW_ONLY:
      // Render view-only message
      return (
        <div className="space-y-2">
          <Button
            variant="outline"
            size={size}
            className={className}
            disabled
          >
            <Eye className="h-4 w-4 mr-2" />
            View Only
          </Button>
          {showAvailabilityMessages && viewOnlySettings?.message && (
            <p className="text-xs text-muted-foreground">
              {viewOnlySettings.message}
            </p>
          )}
        </div>
      );

    case AvailabilityState.COMING_SOON:
      return (
        <Button
          variant="outline"
          size={size}
          className={className}
          disabled
        >
          <Calendar className="h-4 w-4 mr-2" />
          Coming Soon
        </Button>
      );

    case AvailabilityState.SOLD_OUT:
      return (
        <Button
          variant="outline"
          size={size}
          className={className}
          disabled
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Sold Out
        </Button>
      );

    case AvailabilityState.RESTRICTED:
      return (
        <Button
          variant="outline"
          size={size}
          className={className}
          disabled
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Restricted
        </Button>
      );

    case AvailabilityState.AVAILABLE:
    default:
      // Standard add to cart button for available items
      return (
        <Button
          variant={variant}
          size={size}
          className={className}
          onClick={handleRegularAddToCart}
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
}
