'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCateringCartStore } from '@/store/catering-cart';
import { CateringOrderForm } from '@/components/Catering/CateringOrderForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, Trash2, ArrowLeft, AlertCircle } from 'lucide-react';
import { SafeImage } from '@/components/ui/safe-image';
import Link from 'next/link';
import { addDays, format } from 'date-fns';
import { FulfillmentSelector } from '@/components/store/FulfillmentSelector';
import type { FulfillmentMethod } from '@/components/store/FulfillmentSelector';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn, toTitleCase } from '@/lib/utils';
import { PaymentMethodSelector } from '@/components/store/PaymentMethodSelector';
import { toast } from 'sonner';
import { createCateringOrderAndProcessPayment } from '@/actions/catering';
import { validateCateringOrderWithDeliveryZone } from '@/actions/catering';
import { getActiveDeliveryZones, type DeliveryAddress } from '@/types/catering';
import { US_STATES, CA_ONLY_STATES } from '@/lib/constants/us-states';

// Define the PaymentMethod enum to match the Prisma schema
enum PaymentMethod {
  SQUARE = 'SQUARE',
  CASH = 'CASH',
}

// Tax and fee constants to match server-side calculations
const TAX_RATE = 0.0825; // 8.25% SF sales tax
const SERVICE_FEE_RATE = 0.035; // 3.5% service fee

interface CateringCheckoutClientProps {
  userData: { id?: string; name?: string; email?: string; phone?: string } | null;
  isLoggedIn: boolean;
}

type CheckoutStep = 'customer-info' | 'fulfillment' | 'payment' | 'review';

export function CateringCheckoutClient({ userData, isLoggedIn }: CateringCheckoutClientProps) {
  const router = useRouter();
  const { items, removeItem, clearCart } = useCateringCartStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('customer-info');

  // Customer info state with localStorage persistence
  const [customerInfo, setCustomerInfo] = useState(() => {
    // Try to load from localStorage first, then fallback to userData
    if (typeof window !== 'undefined') {
      const savedCustomerInfo = localStorage.getItem('cateringCustomerInfo');
      if (savedCustomerInfo) {
        try {
          const parsed = JSON.parse(savedCustomerInfo);
          return {
            name: parsed.name || userData?.name || '',
            email: parsed.email || userData?.email || '',
            phone: parsed.phone || userData?.phone || '',
            specialRequests: parsed.specialRequests || '',
            eventDate: parsed.eventDate ? new Date(parsed.eventDate) : addDays(new Date(), 5),
          };
        } catch (error) {
          console.error('Error parsing saved customer info:', error);
        }
      }
    }
    
    // Fallback to default values
    return {
      name: userData?.name || '',
      email: userData?.email || '',
      phone: userData?.phone || '',
      specialRequests: '',
      eventDate: addDays(new Date(), 5),
    };
  });

  // Fulfillment info state with localStorage persistence
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>(() => {
    // Try to load fulfillment method from localStorage
    if (typeof window !== 'undefined') {
      const savedFulfillmentInfo = localStorage.getItem('cateringFulfillmentInfo');
      if (savedFulfillmentInfo) {
        try {
          const parsed = JSON.parse(savedFulfillmentInfo);
          return parsed.method || 'pickup';
        } catch (error) {
          console.error('Error parsing saved fulfillment info:', error);
        }
      }
    }
    return 'pickup';
  });
  
  const [pickupDate, setPickupDate] = useState<Date>(() => {
    // Try to load pickup date from localStorage
    if (typeof window !== 'undefined') {
      const savedFulfillmentInfo = localStorage.getItem('cateringFulfillmentInfo');
      if (savedFulfillmentInfo) {
        try {
          const parsed = JSON.parse(savedFulfillmentInfo);
          return parsed.pickupDate ? new Date(parsed.pickupDate) : addDays(new Date(), 5);
        } catch (error) {
          console.error('Error parsing saved fulfillment info:', error);
        }
      }
    }
    return addDays(new Date(), 5);
  });
  
  const [pickupTime, setPickupTime] = useState<string>(() => {
    // Try to load pickup time from localStorage
    if (typeof window !== 'undefined') {
      const savedFulfillmentInfo = localStorage.getItem('cateringFulfillmentInfo');
      if (savedFulfillmentInfo) {
        try {
          const parsed = JSON.parse(savedFulfillmentInfo);
          return parsed.pickupTime || '10:00 AM';
        } catch (error) {
          console.error('Error parsing saved fulfillment info:', error);
        }
      }
    }
    return '10:00 AM';
  });
  const [deliveryAddress, setDeliveryAddress] = useState(() => {
    // Try to load delivery address from localStorage
    if (typeof window !== 'undefined') {
      const savedDeliveryAddress = localStorage.getItem('cateringDeliveryAddress');
      if (savedDeliveryAddress) {
        try {
          const parsed = JSON.parse(savedDeliveryAddress);
          return {
            street: parsed.street || '',
            street2: parsed.street2 || '',
            city: parsed.city || '',
            state: parsed.state || '',
            postalCode: parsed.postalCode || '',
          };
        } catch (error) {
          console.error('Error parsing saved delivery address:', error);
        }
      }
    }
    
    // Fallback to default empty values
    return {
      street: '',
      street2: '',
      city: '',
      state: '',
      postalCode: '',
    };
  });

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.SQUARE);

  // Delivery zone validation state
  const [deliveryValidation, setDeliveryValidation] = useState<{
    isValid: boolean;
    errorMessage?: string;
    deliveryZone?: string;
    minimumRequired?: number;
    currentAmount?: number;
    deliveryFee?: number;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [activeDeliveryZones] = useState(getActiveDeliveryZones());

  // Use catering cart items directly instead of filtering
  const cateringItems = items;

  // Generate idempotency key on mount
  useEffect(() => {
    if (!idempotencyKey) {
      const key = `catering-checkout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setIdempotencyKey(key);
    }
  }, [idempotencyKey]);

  // Redirect if cart is empty
  useEffect(() => {
    if (cateringItems.length === 0) {
      router.push('/catering');
    }
  }, [cateringItems.length, router]);

  // Function to save delivery address to localStorage
  const saveDeliveryAddressToLocalStorage = useCallback((address: typeof deliveryAddress) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('cateringDeliveryAddress', JSON.stringify(address));
      } catch (error) {
        console.error('Error saving delivery address to localStorage:', error);
      }
    }
  }, []);

  // Custom function to update delivery address and save to localStorage
  const updateDeliveryAddress = useCallback((newAddress: typeof deliveryAddress | ((prev: typeof deliveryAddress) => typeof deliveryAddress)) => {
    setDeliveryAddress(prevAddress => {
      const updatedAddress = typeof newAddress === 'function' ? newAddress(prevAddress) : newAddress;
      saveDeliveryAddressToLocalStorage(updatedAddress);
      return updatedAddress;
    });
  }, [saveDeliveryAddressToLocalStorage]);

  // Auto-select CA for local delivery
  useEffect(() => {
    if (fulfillmentMethod === 'local_delivery' && !deliveryAddress.state) {
      updateDeliveryAddress(prev => ({ ...prev, state: 'CA' }));
    }
  }, [fulfillmentMethod, deliveryAddress.state, updateDeliveryAddress]);

  // Validate delivery zone minimum when address changes
  useEffect(() => {
    const validateDeliveryZone = async () => {
      if (
        fulfillmentMethod !== 'local_delivery' ||
        !deliveryAddress.city ||
        !deliveryAddress.postalCode
      ) {
        setDeliveryValidation(null);
        return;
      }

      setIsValidating(true);

      try {
        // Calculate total amount
        const totalAmount = cateringItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const validation = await validateCateringOrderWithDeliveryZone(
          `${deliveryAddress.city}, ${deliveryAddress.postalCode}`,
          totalAmount
        );

        // Transform the response to match the expected format
        setDeliveryValidation({
          isValid: validation.success,
          errorMessage: validation.error,
          deliveryZone: validation.deliveryZone?.toString(),
          minimumRequired: validation.minimumPurchase,
          currentAmount: totalAmount,
          deliveryFee: validation.deliveryFee,
        });
      } catch (error) {
        console.error('Error validating delivery zone:', error);
        setDeliveryValidation({
          isValid: false,
          errorMessage: 'Error validating delivery zone. Please try again.',
        });
      } finally {
        setIsValidating(false);
      }
    };

    // Debounce validation
    const timeoutId = setTimeout(validateDeliveryZone, 500);
    return () => clearTimeout(timeoutId);
  }, [fulfillmentMethod, deliveryAddress.city, deliveryAddress.postalCode, cateringItems]);

  // Function to save customer info to localStorage
  const saveCustomerInfoToLocalStorage = (info: typeof customerInfo) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('cateringCustomerInfo', JSON.stringify({
          ...info,
          eventDate: info.eventDate.toISOString(),
        }));
      } catch (error) {
        console.error('Error saving customer info to localStorage:', error);
      }
    }
  };

  // Function to clear customer info from localStorage (when order is completed)
  const clearCustomerInfoFromLocalStorage = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('cateringCustomerInfo');
      } catch (error) {
        console.error('Error clearing customer info from localStorage:', error);
      }
    }
  };

  // Function to clear delivery address from localStorage (when order is completed)
  const clearDeliveryAddressFromLocalStorage = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('cateringDeliveryAddress');
      } catch (error) {
        console.error('Error clearing delivery address from localStorage:', error);
      }
    }
  };

  // Function to save fulfillment info to localStorage
  const saveFulfillmentInfoToLocalStorage = (method: FulfillmentMethod, date: Date, time: string) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('cateringFulfillmentInfo', JSON.stringify({
          method,
          pickupDate: date.toISOString(),
          pickupTime: time,
        }));
      } catch (error) {
        console.error('Error saving fulfillment info to localStorage:', error);
      }
    }
  };

  // Function to clear fulfillment info from localStorage
  const clearFulfillmentInfoFromLocalStorage = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('cateringFulfillmentInfo');
      } catch (error) {
        console.error('Error clearing fulfillment info from localStorage:', error);
      }
    }
  };

  // Custom functions to update fulfillment info and save to localStorage
  const updateFulfillmentMethod = (method: FulfillmentMethod) => {
    setFulfillmentMethod(method);
    saveFulfillmentInfoToLocalStorage(method, pickupDate, pickupTime);
  };

  const updatePickupDate = (date: Date) => {
    setPickupDate(date);
    saveFulfillmentInfoToLocalStorage(fulfillmentMethod, date, pickupTime);
  };

  const updatePickupTime = (time: string) => {
    setPickupTime(time);
    saveFulfillmentInfoToLocalStorage(fulfillmentMethod, pickupDate, time);
  };

  // Calculate pricing breakdown with detailed fees
  const calculatePricingBreakdown = () => {
    const subtotal = cateringItems.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);

    const deliveryFee = deliveryValidation?.deliveryFee || 0;
    const actualDeliveryFee = fulfillmentMethod === 'local_delivery' ? deliveryFee : 0;
    
    // Calculate tax on subtotal + delivery fee (catering items are taxable)
    const taxableAmount = subtotal + actualDeliveryFee;
    const taxAmount = taxableAmount * TAX_RATE;
    
    // Calculate service fee on subtotal + delivery fee + tax
    const totalBeforeServiceFee = subtotal + actualDeliveryFee + taxAmount;
    const serviceFee = totalBeforeServiceFee * SERVICE_FEE_RATE;
    
    // Final total
    const total = totalBeforeServiceFee + serviceFee;
    
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      deliveryFee: Math.round(actualDeliveryFee * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      serviceFee: Math.round(serviceFee * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  };

  // Calculate total (for backward compatibility)
  const calculateTotal = () => {
    return calculatePricingBreakdown().total;
  };

  // Handle customer info form submission
  const handleCustomerInfoSubmit = (values: any) => {
    const newCustomerInfo = {
      name: values.name,
      email: values.email,
      phone: values.phone,
      specialRequests: values.specialRequests || '',
      eventDate: values.eventDate,
    };
    
    setCustomerInfo(newCustomerInfo);
    saveCustomerInfoToLocalStorage(newCustomerInfo);
    setCurrentStep('fulfillment');
  };

  // Handle fulfillment selection form submission
  const handleFulfillmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep('payment');
  };

  // Handle payment method selection form submission
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep('review');
  };

  // Enhanced submission state management
  const [submissionAttempts, setSubmissionAttempts] = useState(0);
  const isSubmittingRef = useRef(false);

  // Handle final order submission
  const handleCompleteOrder = async () => {
    // Prevent any submission if already in progress
    if (isSubmittingRef.current || isSubmitting) {
      console.log('⚠️ Submission already in progress, ignoring click');
      return;
    }

    // Set ref immediately to prevent race conditions
    isSubmittingRef.current = true;
    
    // Track submission attempts
    setSubmissionAttempts(prev => prev + 1);
    console.log(`📤 Catering checkout submission attempt #${submissionAttempts + 1}`);
    
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Store the original form data in localStorage for reference
      const orderData = {
        customerInfo: {
          name: customerInfo.name,
          email: customerInfo.email,
          phone: customerInfo.phone,
        },
        eventDetails: {
          eventDate: format(customerInfo.eventDate, 'yyyy-MM-dd'),
          specialRequests: customerInfo.specialRequests,
        },
        fulfillment: {
          method: fulfillmentMethod as 'pickup' | 'local_delivery',
          ...(fulfillmentMethod === 'pickup'
            ? {
                pickupDate: format(pickupDate, 'yyyy-MM-dd'),
                pickupTime,
              }
            : {
                deliveryAddress,
                deliveryDate: format(pickupDate, 'yyyy-MM-dd'),
                deliveryTime: pickupTime,
              }),
        },
        payment: {
          method: paymentMethod,
        },
        items: cateringItems.map(item => {
                  // Safely parse metadata with error handling
        let metadata: { type?: string; itemId?: string; name?: string; selectedProtein?: string; productName?: string; variationName?: string } = {};
        try {
          metadata = JSON.parse(item.variantId || '{}');
        } catch (error) {
          console.warn('Failed to parse item metadata in order submission:', item.variantId, error);
          // If variantId is not JSON, treat it as a simple name
          metadata = { name: item.variantId, type: 'item' };
        }
          const pricePerUnit = item.price;
          const totalPrice = item.price * item.quantity;

          // Determine if this is a real CateringItem or a synthetic item
          const isRealCateringItem = metadata.type === 'item' && metadata.itemId;
          const isPackage = metadata.type === 'package';

          // Only set itemId for real CateringItems, use null for synthetic items
          let itemId = null;
          let packageId = null;

          if (isRealCateringItem) {
            // For real catering items, use the itemId from metadata
            itemId = metadata.itemId;
          } else if (isPackage) {
            // For packages, set packageId
            packageId = item.id;
          }
          // For synthetic items (lunch packets, service add-ons, etc.), leave both as null

          return {
            itemType: metadata.type || 'item',
            itemId: itemId,
            packageId: packageId,
            name: item.name,
            quantity: item.quantity,
            pricePerUnit,
            totalPrice,
            notes: null,
            image: item.image, // AÑADIR LA IMAGEN!
          };
        }),
        totalAmount: calculateTotal(),
      };

      localStorage.setItem('cateringOrderData', JSON.stringify(orderData));

      // Create the order in the database using the server action
      const formattedItems = cateringItems.map(item => {
        // Safely parse metadata with error handling
        let metadata: { type?: string; itemId?: string; name?: string; selectedProtein?: string; nameLabel?: string; notes?: string; productName?: string; variationName?: string } = {};
        try {
          metadata = JSON.parse(item.variantId || '{}');
        } catch (error) {
          console.warn('Failed to parse item metadata in formatted items:', item.variantId, error);
          // If variantId is not JSON, treat it as a simple name
          metadata = { name: item.variantId, type: 'item' };
        }
        const pricePerUnit = item.price;
        const totalPrice = item.price * item.quantity;

        // Determine if this is a real CateringItem or a synthetic item
        const isRealCateringItem = metadata.type === 'item' && metadata.itemId;
        const isPackage = metadata.type === 'package';

        // Only set itemId for real CateringItems, use null for synthetic items
        let itemId = null;
        let packageId = null;

        if (isRealCateringItem) {
          // For real catering items, use the itemId from metadata
          itemId = metadata.itemId;
        } else if (isPackage) {
          // For packages, set packageId
          packageId = item.id;
        }
        // For synthetic items (lunch packets, service add-ons, etc.), leave both as null

        // Combine customizations from cart item and metadata
        const customizations = {
          ...(item.customizations || {}),
          ...(metadata.nameLabel && { nameLabel: metadata.nameLabel }),
          ...(metadata.notes && { notes: metadata.notes })
        };

        // Create formatted notes that include all customizations
        let formattedNotes = null;
        if (customizations.nameLabel || customizations.notes) {
          const notesParts = [];
          if (customizations.nameLabel) {
            notesParts.push(`Name Label: ${customizations.nameLabel}`);
          }
          if (customizations.notes) {
            notesParts.push(`Special Instructions: ${customizations.notes}`);
          }
          formattedNotes = notesParts.join(' | ');
        }

        // Ensure we have a proper item name, with fallbacks for edge cases
        let itemName = item.name;
        
        // If the name is just a size/variation (like "Large") and we have product name in metadata, combine them
        if (metadata.productName && (itemName === metadata.variationName || itemName?.toLowerCase().match(/^(small|medium|large|regular)$/))) {
          itemName = metadata.variationName ? `${metadata.productName} - ${metadata.variationName}` : metadata.productName;
        }
        
        // Additional fallback: if name is still just a variant name and we have more metadata
        if (!itemName || itemName.toLowerCase().match(/^(small|medium|large|regular)$/)) {
          itemName = metadata.name || metadata.productName || item.name || 'Unknown Item';
        }

        return {
          itemType: metadata.type || 'item',
          itemId: itemId,
          packageId: packageId,
          name: itemName,
          quantity: item.quantity,
          pricePerUnit,
          totalPrice,
          notes: formattedNotes,
        };
      });

      // If we have a user ID, include it, otherwise it's a guest checkout
      const customerId = userData?.id || null;

      // Format event date as string in full ISO format
      const formattedEventDate = customerInfo.eventDate.toISOString();

      const result = await createCateringOrderAndProcessPayment({
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        eventDate: formattedEventDate,
        numberOfPeople: 1, // Default value since we removed people count
        packageType: 'A_LA_CARTE', // Default package type for a-la-carte orders
        specialRequests: customerInfo.specialRequests,
        ...(fulfillmentMethod === 'local_delivery' && {
          deliveryAddress: {
            street: deliveryAddress.street,
            street2: deliveryAddress.street2,
            city: deliveryAddress.city,
            state: deliveryAddress.state,
            postalCode: deliveryAddress.postalCode,
            deliveryDate: format(pickupDate, 'yyyy-MM-dd'),
            deliveryTime: pickupTime,
          },
          deliveryZone: deliveryValidation?.deliveryZone || 'UNKNOWN',
          deliveryFee: deliveryValidation?.deliveryFee || 0,
        }),
        totalAmount: calculateTotal(),
        paymentMethod: paymentMethod,
        customerId: customerId, // Pass the user ID to associate the order with the logged-in user
        items: formattedItems, // Pass the catering order items
        idempotencyKey: idempotencyKey, // Add idempotency protection
      });

      if (result.success) {
        // Clear the cart
        clearCart();
        
        // Clear all saved data from localStorage since order was successful
        clearCustomerInfoFromLocalStorage();
        clearDeliveryAddressFromLocalStorage();
        clearFulfillmentInfoFromLocalStorage();

        // Reset submission state immediately on success
        isSubmittingRef.current = false;
        setIsSubmitting(false);

        // If there's a checkout URL (Square payment), redirect to it
        if (result.checkoutUrl) {
          window.location.href = result.checkoutUrl;
        } else {
          // Otherwise go to the confirmation page
          router.push(`/catering/confirmation?orderId=${result.orderId}`);
        }
      } else {
        // Handle error - store the error and provide better user feedback
        const errorMessage = result.error || 'Failed to create order';
        setSubmitError(errorMessage);
        toast.error(`Error creating order: ${errorMessage}`);
        
        // Add a delay before allowing retry to prevent rapid submissions
        setTimeout(() => {
          isSubmittingRef.current = false;
          setIsSubmitting(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      const errorMessage = 'Failed to process your order. Please try again.';
      setSubmitError(errorMessage);
      toast.error(errorMessage);
      
      // Add a delay before allowing retry
      setTimeout(() => {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }, 3000);
    }
  };

  if (cateringItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
          <ShoppingCart className="h-10 w-10 text-gray-400" />
        </div>

        <h1 className="mb-2 text-2xl font-bold">Your catering cart is empty</h1>
        <p className="mb-8 text-gray-500">
          You haven&apos;t added any catering items to your cart yet.
        </p>

        <Link href="/catering">
          <Button size="lg">Browse Catering Menu</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column - Form Steps */}
      <div className="lg:col-span-2">
        {currentStep === 'customer-info' && (
          <CateringOrderForm
            defaultValues={{
              name: userData?.name || '',
              email: userData?.email || '',
              phone: userData?.phone || '',
              eventDate: addDays(new Date(), 5),
            }}
            onSubmit={handleCustomerInfoSubmit}
            isSubmitting={false}
          />
        )}

        {currentStep === 'fulfillment' && (
          <form onSubmit={handleFulfillmentSubmit} className="space-y-6">
            <Button
              type="button"
              variant="ghost"
              className="flex items-center mb-2 text-sm font-medium"
              onClick={() => setCurrentStep('customer-info')}
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to customer info
            </Button>

            <FulfillmentSelector
              selectedMethod={fulfillmentMethod}
              onSelectMethod={updateFulfillmentMethod}
            />

            <Card>
              <CardContent className="p-6">
                {fulfillmentMethod === 'pickup' ? (
                  <>
                    <h3 className="text-lg font-medium mb-4">Pickup Details</h3>
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">
                        Pick up your catering order at our restaurant location.
                      </p>
                    </div>
                  </>
                ) : fulfillmentMethod === 'local_delivery' ? (
                  <>
                    <h3 className="text-lg font-medium mb-4">Delivery Details</h3>

                    {/* Delivery Zones Information */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <h4 className="font-semibold text-blue-800 mb-2">
                        Delivery Zones & Minimums
                      </h4>
                      <div className="grid gap-2 text-sm">
                        {activeDeliveryZones.map(zone => (
                          <div key={zone.zone} className="flex justify-between">
                            <span className="text-blue-700">{zone.name}:</span>
                            <span className="font-medium text-blue-800">
                              ${zone.minimumAmount.toFixed(2)} minimum
                              {zone.deliveryFee && ` (+$${zone.deliveryFee.toFixed(2)} delivery)`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <div>
                        <Label htmlFor="street">Street Address</Label>
                        <Input
                          id="street"
                          placeholder="123 Main St"
                          value={deliveryAddress.street}
                          onChange={e =>
                            updateDeliveryAddress({ ...deliveryAddress, street: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="street2">Apartment, suite, etc. (optional)</Label>
                        <Input
                          id="street2"
                          placeholder="Apt #42"
                          value={deliveryAddress.street2}
                          onChange={e =>
                            updateDeliveryAddress({ ...deliveryAddress, street2: e.target.value })
                          }
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            placeholder="San Francisco"
                            value={deliveryAddress.city}
                            onChange={e =>
                              updateDeliveryAddress({ ...deliveryAddress, city: e.target.value })
                            }
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="state">State</Label>
                          <Select
                            value={deliveryAddress.state}
                            onValueChange={(value) =>
                              updateDeliveryAddress({ ...deliveryAddress, state: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent>
                              {CA_ONLY_STATES.map((state) => (
                                <SelectItem key={state.code} value={state.code}>
                                  {state.code} - {state.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="postalCode">Postal Code</Label>
                        <Input
                          id="postalCode"
                          placeholder="94110"
                          value={deliveryAddress.postalCode}
                          onChange={e =>
                            updateDeliveryAddress({ ...deliveryAddress, postalCode: e.target.value })
                          }
                          required
                        />
                      </div>

                      {/* Delivery Zone Validation Messages */}
                      {isValidating && deliveryAddress.city && deliveryAddress.postalCode && (
                        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                          <span className="text-yellow-800 text-sm">Checking delivery zone...</span>
                        </div>
                      )}

                      {deliveryValidation && !isValidating && (
                        <div
                          className={`p-3 rounded-lg border ${
                            deliveryValidation.isValid
                              ? 'bg-green-50 border-green-200'
                              : 'bg-red-50 border-red-200'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <AlertCircle
                              className={`w-4 h-4 mt-0.5 ${
                                deliveryValidation.isValid ? 'text-green-600' : 'text-red-600'
                              }`}
                            />
                            <div className="flex-1">
                              {deliveryValidation.isValid ? (
                                <div>
                                  <p className="text-green-800 text-sm font-medium">
                                    ✓ Valid delivery zone
                                  </p>
                                  {deliveryValidation.deliveryZone && (
                                    <p className="text-green-700 text-sm mt-1">
                                      Delivering to:{' '}
                                      {deliveryValidation.deliveryZone.replace('_', ' ')}
                                      {deliveryValidation.deliveryFee &&
                                        deliveryValidation.deliveryFee > 0 && (
                                          <span className="ml-2">
                                            (+${deliveryValidation.deliveryFee.toFixed(2)} delivery
                                            fee)
                                          </span>
                                        )}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <p className="text-red-800 text-sm font-medium">
                                    {deliveryValidation.errorMessage}
                                  </p>
                                  {deliveryValidation.minimumRequired &&
                                    deliveryValidation.currentAmount && (
                                      <p className="text-red-700 text-sm mt-1">
                                        Current order: $
                                        {deliveryValidation.currentAmount.toFixed(2)} | Required: $
                                        {deliveryValidation.minimumRequired.toFixed(2)}
                                      </p>
                                    )}
                                  <div className="mt-3">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                                      onClick={() => (window.location.href = '/catering')}
                                    >
                                      Add More Items
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <Label htmlFor="deliveryDate">Delivery Date</Label>
                        <div className="mt-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                id="deliveryDate"
                                variant="outline"
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !pickupDate && 'text-muted-foreground'
                                )}
                              >
                                {pickupDate ? format(pickupDate, 'PPP') : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={pickupDate}
                                onSelect={date => date && updatePickupDate(date)}
                                initialFocus
                                disabled={date => {
                                  const today = new Date();
                                  const minDate = addDays(today, 5);
                                  minDate.setHours(0, 0, 0, 0);
                                  return date < minDate;
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="deliveryTime">Delivery Time</Label>
                        <Select value={pickupTime} onValueChange={updatePickupTime}>
                          <SelectTrigger id="deliveryTime">
                            <SelectValue placeholder="Select a time" />
                          </SelectTrigger>
                          <SelectContent>
                            {['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM'].map(
                              time => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-red-500">
                      We currently do not support nationwide shipping for catering orders. Please
                      select pickup or local delivery.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              type="submit"
              className="w-full bg-[#2d3538] hover:bg-[#2d3538]/90 py-6 text-lg"
              disabled={
                (fulfillmentMethod === 'local_delivery' &&
                  (!deliveryAddress.street ||
                    !deliveryAddress.city ||
                    !deliveryAddress.state ||
                    !deliveryAddress.postalCode)) ||
                fulfillmentMethod === 'nationwide_shipping' ||
                (fulfillmentMethod === 'local_delivery' &&
                  deliveryValidation &&
                  !deliveryValidation.isValid) ||
                (fulfillmentMethod === 'local_delivery' && isValidating)
              }
            >
              {fulfillmentMethod === 'local_delivery' && isValidating
                ? 'Validating...'
                : 'Continue to Payment'}
            </Button>
          </form>
        )}

        {currentStep === 'payment' && (
          <form onSubmit={handlePaymentSubmit} className="space-y-6">
            <Button
              type="button"
              variant="ghost"
              className="flex items-center mb-2 text-sm font-medium"
              onClick={() => setCurrentStep('fulfillment')}
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to fulfillment options
            </Button>

            <Card>
              <CardContent className="pt-6 pb-6">
                <PaymentMethodSelector
                  selectedMethod={paymentMethod}
                  onSelectMethod={setPaymentMethod}
                  showCash={fulfillmentMethod === 'pickup'} // Only show cash option for pickup
                />
              </CardContent>
            </Card>

            <Button
              type="submit"
              className="w-full bg-[#2d3538] hover:bg-[#2d3538]/90 py-6 text-lg"
            >
              Continue to Review
            </Button>
          </form>
        )}

        {currentStep === 'review' && (
          <div className="space-y-6">
            <Button
              type="button"
              variant="ghost"
              className="flex items-center mb-2 text-sm font-medium"
              onClick={() => setCurrentStep('payment')}
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to payment options
            </Button>

            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-medium mb-4">Order Review</h3>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm text-gray-500">Customer Information</h4>
                    <div className="mt-1">
                      <p>{customerInfo.name}</p>
                      <p>{customerInfo.email}</p>
                      <p>{customerInfo.phone}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-gray-500">Event Details</h4>
                    <div className="mt-1">
                      <p>Date: {format(customerInfo.eventDate, 'PPP')}</p>
                      {customerInfo.specialRequests && (
                        <p>Special Requests: {customerInfo.specialRequests}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-gray-500">Fulfillment Method</h4>
                    <div className="mt-1">
                      {fulfillmentMethod === 'pickup' ? (
                        <>
                          <p>Pickup</p>
                          <p>Date: {format(pickupDate, 'PPP')}</p>
                          <p>Time: {pickupTime}</p>
                        </>
                      ) : (
                        <>
                          <p>Local Delivery</p>
                          <p>Date: {format(pickupDate, 'PPP')}</p>
                          <p>Time: {pickupTime}</p>
                          <p>
                            Address: {deliveryAddress.street} {deliveryAddress.street2}{' '}
                            {deliveryAddress.city}, {deliveryAddress.state}{' '}
                            {deliveryAddress.postalCode}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-gray-500">Payment Method</h4>
                    <div className="mt-1">
                      {paymentMethod === PaymentMethod.SQUARE && <p>Credit Card</p>}
                      {paymentMethod === PaymentMethod.CASH && <p>Cash</p>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleCompleteOrder}
              className="w-full bg-[#2d3538] hover:bg-[#2d3538]/90 py-6 text-lg"
              disabled={isSubmitting || isSubmittingRef.current || !idempotencyKey}
              style={{ pointerEvents: isSubmitting || isSubmittingRef.current ? 'none' : 'auto' }}
            >
              {isSubmitting || isSubmittingRef.current ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                  Processing Order...
                </span>
              ) : submitError ? (
                'Retry Order'
              ) : (
                'Complete Order'
              )}
            </Button>
            {submitError && (
              <div className="mt-2 text-sm text-red-600 text-center">
                {submitError}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right column - Order Summary */}
      <div>
        <Card className="bg-white sticky top-4">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>

            <div className="space-y-4 mb-6">
              {cateringItems.map(item => {
                        // Safely parse metadata with error handling
        let metadata: { type?: string; itemId?: string; name?: string; selectedProtein?: string; productName?: string; variationName?: string } = {};
        try {
          metadata = JSON.parse(item.variantId || '{}');
        } catch (error) {
          console.warn('Failed to parse item metadata:', item.variantId, error);
          // If variantId is not JSON, treat it as a simple name
          metadata = { name: item.variantId, type: 'item' };
        }
                const isPackage = metadata.type === 'package';

                // Function to get the correct image URL with better fallbacks
                const getImageUrl = (imageUrl: string | undefined): string => {
                  if (!imageUrl) {
                    // Handle boxed lunch items with protein selection
                    if (metadata.type === 'boxed-lunch' && metadata.selectedProtein) {
                      const proteinImageMap: Record<string, string> = {
                        CARNE_ASADA: '/images/boxedlunches/carne-asada.png',
                        POLLO_AL_CARBON: '/images/boxedlunches/pollo-carbon.png',
                        CARNITAS: '/images/boxedlunches/carnitas.png',
                        POLLO_ASADO: '/images/boxedlunches/pollo-asado.png',
                        PESCADO: '/images/boxedlunches/pescado.png',
                        VEGETARIAN_OPTION: '/images/boxedlunches/vegetarian-option.png',
                      };

                      const proteinImage = proteinImageMap[metadata.selectedProtein];
                      if (proteinImage) {
                        return proteinImage;
                      }
                    }

                    // Check if it's an appetizer package or item
                    if (
                      metadata.type === 'appetizer-package' ||
                      item.name.toLowerCase().includes('appetizer')
                    ) {
                      return '/images/catering/appetizer-selection.jpg';
                    }
                    // Other fallbacks based on item type
                    if (item.name.toLowerCase().includes('platter')) {
                      return '/images/catering/default-item.jpg';
                    }
                    if (
                      item.name.toLowerCase().includes('dessert') ||
                      item.name.toLowerCase().includes('alfajor')
                    ) {
                      return '/images/catering/default-item.jpg';
                    }
                    return '/images/catering/default-item.jpg';
                  }

                  // If URL exists but doesn't start with http/https or /, make it absolute
                  if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
                    return `/${imageUrl}`;
                  }

                  return imageUrl;
                };

                return (
                  <div key={`${item.id}-${item.variantId}`} className="flex gap-3">
                    <div className="relative h-16 w-16 flex-shrink-0 rounded-md overflow-hidden">
                      <SafeImage
                        src={getImageUrl(item.image)}
                        alt={toTitleCase(item.name)}
                        width={64}
                        height={64}
                        className="object-cover"
                        fallbackSrc="/images/catering/default-item.jpg"
                        maxRetries={0}
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h3 className="font-medium line-clamp-2">{toTitleCase(item.name)}</h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 ml-2"
                          onClick={() => removeItem(item.id, item.variantId)}
                        >
                          <Trash2 className="h-4 w-4 text-gray-500" />
                        </Button>
                      </div>

                      <div className="text-sm text-gray-500">Qty: {item.quantity}</div>

                      <div className="flex justify-between items-center mt-1">
                        <div className="text-sm">
                          <span>${item.price.toFixed(2)} each</span>
                        </div>

                        <div className="font-medium">
                          <span>${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-2">
              {(() => {
                const pricing = calculatePricingBreakdown();
                return (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>${pricing.subtotal.toFixed(2)}</span>
                    </div>

                    {pricing.deliveryFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Delivery Fee</span>
                        <span>${pricing.deliveryFee.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm">
                      <span>Tax ({(TAX_RATE * 100).toFixed(2)}%)</span>
                      <span>${pricing.taxAmount.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span>Service Fee ({(SERVICE_FEE_RATE * 100).toFixed(1)}%)</span>
                      <span>${pricing.serviceFee.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-base font-medium border-t border-gray-200 pt-2">
                      <span>Total</span>
                      <span>${pricing.total.toFixed(2)}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading overlay when submitting */}
      {(isSubmitting || isSubmittingRef.current) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-sm mx-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d3538] mx-auto" />
            <p className="mt-4 text-lg font-medium text-center">Processing your catering order...</p>
            <p className="mt-2 text-sm text-gray-500 text-center">Please do not close this window</p>
            {submissionAttempts > 1 && (
              <p className="mt-2 text-xs text-orange-600 text-center">
                Attempt #{submissionAttempts}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
