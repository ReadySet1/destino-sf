import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createOrderAndGenerateCheckoutUrl } from '@/app/actions'; // Import the server action
import type { FulfillmentData } from '@/app/actions';

// Define the PaymentMethod enum to match the Prisma schema
enum PaymentMethod {
  SQUARE = "SQUARE",
  CASH = "CASH"
}

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

// --- Define Fulfillment Details Type ---
// Adjust this based on the actual structure needed by the server action
// interface FulfillmentDetails { ... } // <-- REMOVE THIS IF PRESENT

interface CheckoutProps {
  productType: string;
  items: CartItem[];
  customerInfo: CustomerInfo; // Make customerInfo mandatory if always needed here
  fulfillment: FulfillmentData; // Use the imported type
}

// Define the expected return type from the server action
type ServerActionResult = {
    success: boolean;
    error: string | null;
    checkoutUrl: string | null;
    orderId: string | null;
  };

// --- Define exact fulfillment types to match server action expectations ---
type ExactPickupFulfillment = {
  method: "pickup";
  pickupTime: string;
};

type ExactLocalDeliveryFulfillment = {
  method: "local_delivery";
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    recipientName?: string;
    street2?: string;
  };
  deliveryDate: string;
  deliveryTime: string;
  deliveryInstructions?: string;
};

type ExactNationwideShippingFulfillment = {
  method: "nationwide_shipping";
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    recipientName?: string;
    street2?: string;
  };
  rateId: string;
  shippingMethod: string;
  shippingCarrier: string;
  shippingCost: number;
};

type ExactFulfillmentData = 
  | ExactPickupFulfillment 
  | ExactLocalDeliveryFulfillment 
  | ExactNationwideShippingFulfillment;

// --- Update Component Signature ---
const Checkout: React.FC<CheckoutProps> = ({ productType, items, customerInfo, fulfillment }) => {
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
      // --- Ensure fulfillment info is present ---
      if (!fulfillment) {
          toast.error('Fulfillment details are missing.');
          setIsLoading(false);
          return;
      }

      // --- Call Server Action instead of fetch ---
      console.log('Calling createOrderAndGenerateCheckoutUrl server action from Checkout component...');

      // Map the fulfillment data to the format expected by the server action
      let mappedFulfillment: ExactFulfillmentData;
      
      // Handle the different fulfillment methods and ensure the required fields are present
      if (fulfillment.method === 'pickup') {
        if (!fulfillment.pickupTime) {
          throw new Error('Pickup time is required for pickup fulfillment');
        }
        
        mappedFulfillment = {
          method: 'pickup',
          pickupTime: fulfillment.pickupTime
        };
      } 
      else if (fulfillment.method === 'local_delivery') {
        // Ensure we have all required fields for local delivery
        if ('deliveryAddress' in fulfillment && 
            'deliveryDate' in fulfillment && 
            'deliveryTime' in fulfillment && 
            fulfillment.deliveryAddress && 
            fulfillment.deliveryDate && 
            fulfillment.deliveryTime) {
          
          mappedFulfillment = {
            method: 'local_delivery',
            deliveryAddress: {
              street: fulfillment.deliveryAddress.street,
              city: fulfillment.deliveryAddress.city,
              state: fulfillment.deliveryAddress.state,
              postalCode: fulfillment.deliveryAddress.postalCode,
              country: fulfillment.deliveryAddress.country || 'US',
              recipientName: fulfillment.deliveryAddress.recipientName,
              street2: fulfillment.deliveryAddress.street2
            },
            deliveryDate: fulfillment.deliveryDate,
            deliveryTime: fulfillment.deliveryTime,
            deliveryInstructions: fulfillment.deliveryInstructions
          };
        } else {
          throw new Error('Missing required fields for local delivery fulfillment');
        }
      }
      else if (fulfillment.method === 'nationwide_shipping') {
        // Ensure we have all required fields for nationwide shipping with strict validation
        if ('shippingAddress' in fulfillment && 
            'rateId' in fulfillment && 
            'shippingMethod' in fulfillment && 
            'shippingCarrier' in fulfillment &&
            'shippingCost' in fulfillment && 
            fulfillment.shippingAddress && 
            fulfillment.rateId && 
            fulfillment.shippingMethod && 
            fulfillment.shippingCarrier && 
            typeof fulfillment.shippingCost === 'number') {
          
          mappedFulfillment = {
            method: 'nationwide_shipping',
            shippingAddress: {
              street: fulfillment.shippingAddress.street,
              city: fulfillment.shippingAddress.city,
              state: fulfillment.shippingAddress.state,
              postalCode: fulfillment.shippingAddress.postalCode,
              country: fulfillment.shippingAddress.country || 'US',
              recipientName: fulfillment.shippingAddress.recipientName,
              street2: fulfillment.shippingAddress.street2
            },
            rateId: fulfillment.rateId,
            shippingMethod: fulfillment.shippingMethod,
            shippingCarrier: fulfillment.shippingCarrier,
            shippingCost: fulfillment.shippingCost
          };
        } else {
          throw new Error('Missing required fields for nationwide shipping fulfillment');
        }
      }
      else {
        throw new Error(`Unsupported fulfillment method: ${fulfillment.method}`);
      }

      // --- Use the properly formatted fulfillment ---
      const actionPayload = {
          items: items, // Pass items directly
          customerInfo: customerInfo, // Pass customerInfo
          fulfillment: mappedFulfillment, // Use the correctly formatted fulfillment
          paymentMethod: PaymentMethod.SQUARE // Use the enum value correctly
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
        // --- Update disabled check ---
        disabled={isLoading || !customerInfo || items.length === 0 || !fulfillment}
        className="w-full mt-6"
      >
        {isLoading ? 'Processing...' : 'Proceed to Checkout'}
      </Button>
    </div>
  );
};

export default Checkout;
