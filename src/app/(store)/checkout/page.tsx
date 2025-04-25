'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { useCartStore } from '@/store/cart';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckoutSummary } from '@/components/Store/CheckoutSummary';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserIcon, LogInIcon, UserPlusIcon } from 'lucide-react';
import { FulfillmentSelector, FulfillmentMethod } from '@/components/Store/FulfillmentSelector';
import { AddressForm } from '@/components/Store/AddressForm';
import { createOrderAndGenerateCheckoutUrl } from '@/app/actions';
import type { FulfillmentData } from '@/app/actions';

// Form validation schema
const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  street2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(5, 'Valid postal code is required'),
  country: z.string().min(2, 'Country is required'),
});

// Define schemas individually for discriminated union
const pickupSchema = z.object({
  fulfillmentMethod: z.literal('pickup'),
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  pickupDate: z.string().refine(date => {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  }, 'Date must be today or later'),
  pickupTime: z.string().min(1, 'Pickup time is required'),
});

const deliverySchema = z.object({
  fulfillmentMethod: z.literal('delivery'),
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  deliveryAddress: addressSchema,
  deliveryDate: z.string().refine(date => {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  }, 'Date must be today or later'),
  deliveryTime: z.string().min(1, 'Delivery time is required'),
  deliveryInstructions: z.string().optional(),
});

const shippingSchema = z.object({
  fulfillmentMethod: z.literal('shipping'),
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  shippingAddress: addressSchema,
  shippingMethod: z.string().min(1, 'Shipping method is required'),
});

// --- NEW: Local Delivery Schema ---
const localDeliverySchema = z.object({
  fulfillmentMethod: z.literal('local_delivery'),
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  deliveryAddress: addressSchema,
  deliveryDate: z.string().refine(date => {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  }, 'Date must be today or later'),
  deliveryTime: z.string().min(1, 'Delivery time is required'),
  deliveryInstructions: z.string().optional(),
});

// --- NEW: Nationwide Shipping Schema ---
const nationwideShippingSchema = z.object({
  fulfillmentMethod: z.literal('nationwide_shipping'),
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  shippingAddress: addressSchema,
  shippingMethod: z.string().min(1, 'Shipping method is required'),
});

const checkoutSchema = z.discriminatedUnion('fulfillmentMethod', [
  pickupSchema,
  deliverySchema,
  shippingSchema,
  localDeliverySchema,
  nationwideShippingSchema,
]);

type CheckoutFormData = z.infer<typeof checkoutSchema>;
type PickupFormData = z.infer<typeof pickupSchema>;
type DeliveryFormData = z.infer<typeof deliverySchema>;
type ShippingFormData = z.infer<typeof shippingSchema>;
// --- NEW Types ---
type LocalDeliveryFormData = z.infer<typeof localDeliverySchema>;
type NationwideShippingFormData = z.infer<typeof nationwideShippingSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCartStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>('pickup');
  const [isMounted, setIsMounted] = useState(false);
  const supabase = createClient();

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fulfillmentMethod: 'pickup',
      pickupDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      pickupTime: '12:00',
    } as PickupFormData,
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors }, control } = form;
  
  // Watch for changes in fulfillment method
  const currentMethod = watch('fulfillmentMethod');

  // Calculate min date for pickup/delivery (today)
  const minDate = format(new Date(), 'yyyy-MM-dd');

  // Update form when fulfillment method changes
  useEffect(() => {
    setValue('fulfillmentMethod', fulfillmentMethod);
  }, [fulfillmentMethod, setValue, reset, form]);

  // Redirect if cart is empty *after* component has mounted
  useEffect(() => {
    // Only run this check after the component has mounted on the client
    if (isMounted && items.length === 0) {
      toast.warning('Your cart is empty. Redirecting...');
      void router.push('/cart');
    }
  }, [items, router, isMounted]);

  // Set mounted state after initial render
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check if user is logged in
  useEffect(() => {
    async function getUser() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          
          // Try to get profile data to pre-fill form
          const { data: profile, error: profileError } = await supabase
            .from('Profile')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (profile) {
            // Pre-fill form with profile data
            if (profile.name) setValue('name', profile.name);
            if (profile.email) setValue('email', profile.email);
            if (profile.phone) setValue('phone', profile.phone);
          } else if (session.user.email) {
            // If no profile but user has email, pre-fill email
            setValue('email', session.user.email);
          }
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      } finally {
        setLoading(false);
      }
    }

    void getUser();
  }, [supabase, setValue]);

  // Helper function to prepare fulfillment data
  const prepareFulfillmentData = (formData: CheckoutFormData): FulfillmentData => {
    const baseData = {
      method: formData.fulfillmentMethod
    };

    if (formData.fulfillmentMethod === 'pickup') {
      const pickupData = formData as PickupFormData;
      return {
        ...baseData,
        method: 'pickup',
        pickupTime: `${pickupData.pickupDate}T${pickupData.pickupTime}:00`
      };
    } else if (formData.fulfillmentMethod === 'delivery') {
      const deliveryData = formData as DeliveryFormData;
      return {
        ...baseData,
        method: 'delivery',
        deliveryTime: `${deliveryData.deliveryDate}T${deliveryData.deliveryTime}:00`,
        deliveryAddress: deliveryData.deliveryAddress,
        deliveryInstructions: deliveryData.deliveryInstructions
      };
    } else if (formData.fulfillmentMethod === 'shipping') {
      const shippingData = formData as ShippingFormData;
      return {
        ...baseData,
        method: 'shipping',
        shippingAddress: shippingData.shippingAddress,
        shippingMethod: shippingData.shippingMethod || 'Standard'
      };
    } else if (formData.fulfillmentMethod === 'local_delivery') {
      const localDeliveryData = formData as LocalDeliveryFormData;
      return {
        ...baseData,
        method: 'local_delivery',
        deliveryAddress: localDeliveryData.deliveryAddress,
        deliveryDate: localDeliveryData.deliveryDate,
        deliveryTime: localDeliveryData.deliveryTime,
        deliveryInstructions: localDeliveryData.deliveryInstructions
      };
    } else if (formData.fulfillmentMethod === 'nationwide_shipping') {
      const nationwideShippingData = formData as NationwideShippingFormData;
      return {
        ...baseData,
        method: 'nationwide_shipping',
        shippingAddress: nationwideShippingData.shippingAddress,
        shippingMethod: nationwideShippingData.shippingMethod || 'Standard'
      };
    }
    throw new Error('Invalid fulfillment method');
  };

  // Restore original onSubmit logic, but call Server Action
  const onSubmit = async (formData: CheckoutFormData) => {
    console.log('CheckoutPage onSubmit triggered');
    setIsSubmitting(true);
    setError(null);

    if (!items || items.length === 0) {
      setError('Your cart is empty.');
      setIsSubmitting(false);
      toast.error('Cannot checkout with an empty cart.');
      return;
    }

    try {
      console.log('Form data:', formData);
      const fulfillmentData = prepareFulfillmentData(formData);
      console.log('Prepared fulfillment data:', fulfillmentData);

      // Pickup time string for customerInfo (only if pickup)
      let customerPickupTimeString : string | undefined = undefined;
      if (formData.fulfillmentMethod === 'pickup') {
        const pickupData = formData as PickupFormData; 
        customerPickupTimeString = `${pickupData.pickupDate}T${pickupData.pickupTime}:00`; 
        console.log('Calculated customer pickup time string:', customerPickupTimeString);
      }
      
      console.log('Calling createOrderAndGenerateCheckoutUrl server action...');

      // Prepare payload for the server action
      const actionPayload = {
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price, // Ensure this is in DOLLARS
          quantity: item.quantity,
          variantId: item.variantId,
        })),
        customerInfo: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          pickupTime: customerPickupTimeString, // Pass the string or undefined
        },
        fulfillment: fulfillmentData, // Pass the prepared fulfillment object
      };

      // Create an order and get Square Checkout URL via Server Action
      const result = await createOrderAndGenerateCheckoutUrl(actionPayload);
      console.log('Server action result:', result);

      if (!result.success || !result.checkoutUrl) {
        console.error('Server action error:', result.error);
        throw new Error(result.error || 'Failed to create checkout session');
      }

      // Clear cart on successful redirect initiation? (Consider moving to confirmation page)
      // clearCart();

      console.log('Attempting redirect to Square Checkout:', result.checkoutUrl);
      window.location.href = result.checkoutUrl;
      // Don't set isSubmitting to false here, page navigates away

    } catch (error) {
      console.error('Checkout error caught in onSubmit:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      toast.error('Failed to initialize checkout. Please try again.');
      setIsSubmitting(false); // Only set false on error
    }
  };

  // Revert to original getErrorMessage logic
  const getErrorMessage = (field: keyof CheckoutFormData | string): string | undefined => {
    // Access nested errors correctly
    const fieldParts = field.split('.');
    let currentError: any = errors;
    for (const part of fieldParts) {
      if (!currentError?.[part]) return undefined;
      currentError = currentError[part];
    }
    return currentError?.message;
  };

  if (items.length === 0) {
    return null; // Will redirect via useEffect
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Checkout</h1>

      {process.env.NODE_ENV === 'development' && (
        <div className="mb-8 rounded-lg border border-yellow-200 bg-yellow-50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-yellow-800">🔧 Test Mode Payment Information</h2>
          <div className="space-y-4 text-sm text-yellow-800">
            <div>
              <h3 className="font-medium">Test Card Numbers:</h3>
              <ul className="mt-2 space-y-2">
                <li>• Visa: <code className="rounded bg-white px-2 py-1">4111 1111 1111 1111</code></li>
                <li>• Mastercard: <code className="rounded bg-white px-2 py-1">5105 1051 0510 5100</code></li>
                <li>• American Express: <code className="rounded bg-white px-2 py-1">3782 822463 10005</code></li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium">Test Card Details:</h3>
              <ul className="mt-2 space-y-1">
                <li>• Expiration Date: Any future date</li>
                <li>• CVV: Any 3-4 digits</li>
                <li>• Postal Code: Any valid postal code</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium">Test Scenarios:</h3>
              <ul className="mt-2 space-y-1">
                <li>• Approved: Use any of the test cards above</li>
                <li>• Declined: Use card number <code className="rounded bg-white px-2 py-1">4000 0000 0000 0002</code></li>
                <li>• Network Error: Use card number <code className="rounded bg-white px-2 py-1">4000 0000 0000 0009</code></li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Customer Information Form */}
        <div>
          {!loading && (
            <div className="mb-6">
              {user ? (
                <Alert className="bg-green-50 border-green-200 mb-6">
                  <UserIcon className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    Logged in as <span className="font-medium">{user.email}</span>
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="p-4 border rounded-lg mb-6 bg-gray-50">
                  <p className="mb-3 text-gray-600">Already have an account?</p>
                  <div className="flex gap-3">
                    <Button variant="outline" asChild className="flex-1">
                      <Link href="/sign-in?redirect=/checkout">
                        <LogInIcon className="mr-2 h-4 w-4" />
                        Sign In
                      </Link>
                    </Button>
                    <Button variant="outline" asChild className="flex-1">
                      <Link href="/sign-up?redirect=/checkout">
                        <UserPlusIcon className="mr-2 h-4 w-4" />
                        Sign Up
                      </Link>
                    </Button>
                  </div>
                  <p className="mt-3 text-xs text-gray-500">
                    You can continue as a guest or sign in to access your order history
                  </p>
                </div>
              )}
            </div>
          )}

          <FulfillmentSelector
            selectedMethod={fulfillmentMethod}
            onChange={(method) => setFulfillmentMethod(method)}
          />

          <form
            onSubmit={handleSubmit(onSubmit, (errors) => {
              console.error("Form validation failed:", errors);
              toast.error("Please fix the errors in the form before submitting.");
            })}
            className="space-y-6"
          >
            {/* Customer Information */}
            <div className="space-y-4 mb-6">
              <h2 className="text-xl font-semibold">Contact Information</h2>
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" {...register("name")} placeholder="Jane Doe" />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
              </div>
              {/* ... other customer fields (email, phone) ... */}
               <div>
                   <Label htmlFor="email">Email</Label>
                   <Input id="email" type="email" {...register("email")} placeholder="jane@example.com" />
                   {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
               </div>
               <div>
                   <Label htmlFor="phone">Phone</Label>
                   <Input id="phone" type="tel" {...register("phone")} placeholder="555-123-4567" />
                   {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
               </div>
            </div>

            {/* Fulfillment Specific Fields */}
            <div className="space-y-4 mb-6">
              {currentMethod === 'pickup' && (
                <>
                  <h2 className="text-xl font-semibold">Pickup Details</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pickupDate">Pickup Date</Label>
                      <Input id="pickupDate" type="date" {...register("pickupDate")} min={minDate} />
                      {errors && 'pickupDate' in errors && errors.pickupDate && (
                        <p className="text-red-500 text-sm mt-1">{errors.pickupDate.message as string}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="pickupTime">Pickup Time</Label>
                      <Input id="pickupTime" type="time" {...register("pickupTime")} />
                      {errors && 'pickupTime' in errors && errors.pickupTime && (
                        <p className="text-red-500 text-sm mt-1">{errors.pickupTime.message as string}</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {currentMethod === 'delivery' && (
                <>
                  <h2 className="text-xl font-semibold">Delivery Details</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="deliveryDate">Delivery Date</Label>
                      <Input id="deliveryDate" type="date" {...register("deliveryDate")} min={minDate} />
                      {errors && 'deliveryDate' in errors && errors.deliveryDate && (
                        <p className="text-red-500 text-sm mt-1">{errors.deliveryDate.message as string}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="deliveryTime">Delivery Time</Label>
                      <Input id="deliveryTime" type="time" {...register("deliveryTime")} />
                      {errors && 'deliveryTime' in errors && errors.deliveryTime && (
                        <p className="text-red-500 text-sm mt-1">{errors.deliveryTime.message as string}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="deliveryInstructions">Delivery Instructions (optional)</Label>
                    <Input id="deliveryInstructions" {...register("deliveryInstructions")} />
                    {errors && 'deliveryInstructions' in errors && errors.deliveryInstructions && (
                      <p className="text-red-500 text-sm mt-1">{errors.deliveryInstructions.message as string}</p>
                    )}
                  </div>
                  {/* AddressForm for delivery */}
                  <AddressForm form={form} prefix="deliveryAddress" title="Delivery Address" />
                </>
              )}

              {currentMethod === 'shipping' && (
                <>
                  <h2 className="text-xl font-semibold">Shipping Details</h2>
                  {/* AddressForm for shipping */}
                  <AddressForm form={form} prefix="shippingAddress" title="Shipping Address" />
                  <div>
                    <Label htmlFor="shippingMethod">Shipping Method</Label>
                    <Input id="shippingMethod" {...register("shippingMethod")} placeholder="e.g., Standard Ground" />
                    {errors && 'shippingMethod' in errors && errors.shippingMethod && (
                      <p className="text-red-500 text-sm mt-1">{errors.shippingMethod.message as string}</p>
                    )}
                  </div>
                </>
              )}

              {/* --- NEW: Local Delivery Fields --- */}
              {currentMethod === 'local_delivery' && (
                <>
                  <h2 className="text-xl font-semibold">Local Delivery Details</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="deliveryDate">Delivery Date</Label>
                      <Input id="deliveryDate" type="date" {...register("deliveryDate")} min={minDate} />
                      {errors && 'deliveryDate' in errors && errors.deliveryDate && (
                        <p className="text-red-500 text-sm mt-1">{errors.deliveryDate.message as string}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="deliveryTime">Delivery Time</Label>
                      <Input id="deliveryTime" type="time" {...register("deliveryTime")} />
                      {errors && 'deliveryTime' in errors && errors.deliveryTime && (
                        <p className="text-red-500 text-sm mt-1">{errors.deliveryTime.message as string}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="deliveryInstructions">Delivery Instructions (optional)</Label>
                    <Input id="deliveryInstructions" {...register("deliveryInstructions")} />
                    {errors && 'deliveryInstructions' in errors && errors.deliveryInstructions && (
                      <p className="text-red-500 text-sm mt-1">{errors.deliveryInstructions.message as string}</p>
                    )}
                  </div>
                  {/* AddressForm for local delivery */}
                  <AddressForm form={form} prefix="deliveryAddress" title="Delivery Address" />
                </>
              )}

              {/* --- NEW: Nationwide Shipping Fields --- */}
              {currentMethod === 'nationwide_shipping' && (
                <>
                  <h2 className="text-xl font-semibold">Nationwide Shipping Details</h2>
                  {/* AddressForm for nationwide shipping */}
                  <AddressForm form={form} prefix="shippingAddress" title="Shipping Address" />
                  <div>
                    <Label htmlFor="shippingMethod">Shipping Method</Label>
                    <Input id="shippingMethod" {...register("shippingMethod")} placeholder="e.g., Standard Ground" />
                    {errors && 'shippingMethod' in errors && errors.shippingMethod && (
                      <p className="text-red-500 text-sm mt-1">{errors.shippingMethod.message as string}</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processing..." : "Continue to Payment"}
            </Button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:sticky lg:top-8">
          <CheckoutSummary items={items} />
        </div>
      </div>
    </main> 
  );
}
