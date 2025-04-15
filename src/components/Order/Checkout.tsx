import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CheckoutProps {
  productType: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    variantId?: string;
  }>;
  customerInfo?: {
    name: string;
    email: string;
    phone: string;
  };
}

const Checkout: React.FC<CheckoutProps> = ({ productType, items, customerInfo }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    try {
      setIsLoading(true);
      
      // Call our backend API to create a Square Checkout link
      const response = await fetch('/api/square/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items,
          customerInfo,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }
      
      // Redirect to the Square-hosted checkout page
      window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to initiate checkout');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold mb-4">{productType} Checkout</h1>
      
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Order Summary</h2>
        <ul className="space-y-2 mb-4">
          {items.map((item) => (
            <li key={item.id + (item.variantId || '')} className="flex justify-between">
              <span>{item.quantity} × {item.name}</span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        
        <div className="border-t pt-2 font-bold flex justify-between">
          <span>Total:</span>
          <span>${items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}</span>
        </div>
      </div>
      
      <Button 
        onClick={handleCheckout} 
        disabled={isLoading} 
        className="w-full mt-6"
      >
        {isLoading ? 'Processing...' : 'Proceed to Checkout'}
      </Button>
    </div>
  );
};

export default Checkout;
