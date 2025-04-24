import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createOrderAndGenerateCheckoutUrl } from '@/app/actions'; // Import the server action

// Define types more precisely if possible, aligning with server action schemas
interface CartItem {
    id: string;
    name: string;
    price: number; // Assuming dollars
    quantity: number;
    variantId?: string;
}

interface CustomerInfo {
    name: string;
    email: string;
    phone: string;
}

interface CheckoutProps {
  productType: string;
  items: CartItem[];
  customerInfo: CustomerInfo; // Make customerInfo mandatory if always needed here
}

// Define the expected return type from the server action
type ServerActionResult = {
    success: boolean;
    error: string | null;
    checkoutUrl: string | null;
    orderId: string | null;
  };

const Checkout: React.FC<CheckoutProps> = ({ productType, items, customerInfo }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
        // Ensure items and customerInfo are present
      if (!items || items.length === 0) {
        toast.error('Cart is empty.');
        setIsLoading(false);
        return;
      }
      if (!customerInfo) {
          toast.error('Customer information is missing.');
          setIsLoading(false);
          return;
      }

      // --- Call Server Action instead of fetch --- 
      console.log('Calling createOrderAndGenerateCheckoutUrl server action from Checkout component...');

      // !!! IMPORTANT: Create a default fulfillment object. !!!
      // This component doesn't receive fulfillment details, so we assume a default.
      // This might need adjustment based on how this component is used.
      const defaultFulfillment = {
          method: 'pickup' as const, // Defaulting to pickup
          // Add default address/time properties if required by the action's validation,
          // otherwise, keep it minimal based on what the action handles.
      };

      const actionPayload = {
          items: items, // Pass items directly
          customerInfo: customerInfo, // Pass customerInfo
          fulfillment: defaultFulfillment // Use the default fulfillment
      };

      // Explicitly type the result
      const result: ServerActionResult = await createOrderAndGenerateCheckoutUrl(actionPayload);
      console.log('Server action result from Checkout component:', result);

      if (!result.success || !result.checkoutUrl) {
        throw new Error(result.error || 'Failed to create checkout session via server action.');
      }

      // Redirect to the Square-hosted checkout page
      console.log('Redirecting to Square Checkout:', result.checkoutUrl);
      window.location.href = result.checkoutUrl;

    } catch (error) {
      console.error('Checkout error in Checkout component:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to initiate checkout');
      setIsLoading(false); // Ensure loading state is turned off on error
    } 
    // No finally block needed as success redirects away
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
        disabled={isLoading || !customerInfo || items.length === 0} // Add disabled checks
        className="w-full mt-6"
      >
        {isLoading ? 'Processing...' : 'Proceed to Checkout'}
      </Button>
    </div>
  );
};

export default Checkout;
