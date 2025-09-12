'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { 
  Package, 
  Calendar, 
  Clock, 
  DollarSign, 
  Info,
  Minus,
  Plus,
  ShoppingCart
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { type PreOrderSettings } from '@/types/availability';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  price: number;
  images?: string[];
}

interface PreOrderButtonProps {
  product: Product;
  settings: PreOrderSettings;
  onAddToCart?: (productId: string, quantity: number, isPreOrder: boolean) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function PreOrderButton({
  product,
  settings,
  onAddToCart,
  disabled = false,
  className
}: PreOrderButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const maxQuantity = settings.maxQuantity || 10;
  const hasDeposit = settings.depositRequired && settings.depositAmount;
  const depositAmount = settings.depositAmount || 0;
  const totalPrice = product.price * quantity;
  const totalDeposit = hasDeposit ? depositAmount * quantity : 0;

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity);
    }
  };

  const handlePreOrder = async () => {
    if (!onAddToCart) {
      toast.error('Pre-order functionality not available');
      return;
    }

    try {
      setIsLoading(true);
      await onAddToCart(product.id, quantity, true);
      toast.success(`Pre-ordered ${quantity} ${product.name}${quantity > 1 ? 's' : ''}`);
      setIsDialogOpen(false);
      setQuantity(1);
    } catch (error) {
      toast.error('Failed to add pre-order to cart');
      console.error('Pre-order error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          disabled={disabled}
          className={cn(
            "flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white",
            className
          )}
        >
          <Package className="h-4 w-4" />
          Pre-Order Now
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Pre-Order: {product.name}
          </DialogTitle>
          <DialogDescription>
            {settings.message}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Summary */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            {product.images?.[0] && (
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-12 h-12 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <h4 className="font-medium text-sm">{product.name}</h4>
              <p className="text-sm text-muted-foreground">
                ${product.price.toFixed(2)} each
              </p>
            </div>
          </div>

          {/* Pre-order Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                Expected delivery: {format(new Date(settings.expectedDeliveryDate), 'MMMM d, yyyy')}
              </span>
            </div>

            {hasDeposit && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>
                  Deposit required: ${depositAmount.toFixed(2)} per item
                </span>
              </div>
            )}

            {settings.maxQuantity && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>
                  Maximum quantity: {settings.maxQuantity}
                </span>
              </div>
            )}
          </div>

          {/* Quantity Selector */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <Input
                id="quantity"
                type="number"
                min="1"
                max={maxQuantity}
                value={quantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                className="w-20 text-center"
              />
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={quantity >= maxQuantity}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>
            
            {hasDeposit && (
              <>
                <div className="flex justify-between text-sm text-amber-600">
                  <span>Deposit due now:</span>
                  <span>${totalDeposit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Remaining due on delivery:</span>
                  <span>${(totalPrice - totalDeposit).toFixed(2)}</span>
                </div>
              </>
            )}
            
            <div className="flex justify-between font-medium border-t pt-2">
              <span>{hasDeposit ? 'Due Now:' : 'Total:'}</span>
              <span>${(hasDeposit ? totalDeposit : totalPrice).toFixed(2)}</span>
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Pre-Order Notice</p>
                <p>
                  {hasDeposit 
                    ? `You will pay a ${depositAmount.toFixed(2)} deposit now. The remaining balance will be charged when your order is ready for delivery.`
                    : 'You will be charged the full amount when your order is ready for delivery.'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setIsDialogOpen(false)}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          
          <Button
            onClick={handlePreOrder}
            disabled={isLoading || quantity < 1}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </div>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4 mr-2" />
                {hasDeposit 
                  ? `Pay Deposit ($${totalDeposit.toFixed(2)})` 
                  : `Add to Cart ($${totalPrice.toFixed(2)})`
                }
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Compact pre-order button for product cards
 */
export function CompactPreOrderButton({
  product,
  settings,
  onAddToCart,
  className
}: PreOrderButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleQuickPreOrder = async () => {
    if (!onAddToCart) {
      toast.error('Pre-order functionality not available');
      return;
    }

    try {
      setIsLoading(true);
      await onAddToCart(product.id, 1, true);
      toast.success(`Pre-ordered ${product.name}`);
    } catch (error) {
      toast.error('Failed to add pre-order to cart');
      console.error('Pre-order error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleQuickPreOrder}
      disabled={isLoading}
      size="sm"
      className={cn(
        "bg-blue-600 hover:bg-blue-700 text-white",
        className
      )}
    >
      {isLoading ? (
        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          <Package className="h-4 w-4 mr-1" />
          Pre-Order
        </>
      )}
    </Button>
  );
}
