'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
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
import { CheckoutSummary } from '@/components/store/CheckoutSummary';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserIcon, LogInIcon, UserPlusIcon } from 'lucide-react';
import { FulfillmentSelector, FulfillmentMethod } from '@/components/store/FulfillmentSelector';
import { AddressForm } from '@/components/store/AddressForm';

// Form validation schema with conditional fields based on fulfillment method
const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  street2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(5, 'Valid postal code is required'),
  country: z.string().min(2, 'Country is required'),
});

const baseCheckoutSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  fulfillmentMethod: z.enum(['pickup', 'delivery', 'shipping']),
});

// Extended schema with conditional validation
const pickupSchema = baseCheckoutSchema.extend({
  fulfillmentMethod: z.literal('pickup'),
  pickupDate: z.string().refine(date => {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  }, 'Date must be today or later'),
  pickupTime: z.string().min(1, 'Pickup time is required'),
});

const deliverySchema = baseCheckoutSchema.extend({
  fulfillmentMethod: z.literal('delivery'),
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

const shippingSchema = baseCheckoutSchema.extend({
  fulfillmentMethod: z.literal('shipping'),
  shippingAddress: addressSchema,
  shippingMethod: z.string().min(1, 'Shipping method is required'),
});

const checkoutSchema = z.discriminatedUnion('fulfillmentMethod', [
  pickupSchema,
  deliverySchema,
  shippingSchema,
]);

type CheckoutFormData = z.infer<typeof checkoutSchema>;
type PickupFormData = z.infer<typeof pickupSchema>;
type DeliveryFormData = z.infer<typeof deliverySchema>;
type ShippingFormData = z.infer<typeof shippingSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice } = useCartStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>('pickup');
  const supabase = createClient();

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fulfillmentMethod: 'pickup',
      pickupDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      pickupTime: '12:00',
    } as PickupFormData,
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = form;
  
  // Watch for changes in fulfillment method
  const currentMethod = watch('fulfillmentMethod');

  // Calculate min date for pickup/delivery (today)
  const minDate = format(new Date(), 'yyyy-MM-dd');

  // Update form when fulfillment method changes
  useEffect(() => {
    setValue('fulfillmentMethod', fulfillmentMethod);
    
    // Reset form when method changes to remove irrelevant fields
    if (fulfillmentMethod === 'pickup') {
      reset({
        fulfillmentMethod: 'pickup',
        pickupDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        pickupTime: '12:00',
        name: form.getValues('name'),
        email: form.getValues('email'),
        phone: form.getValues('phone'),
      } as PickupFormData);
    } else if (fulfillmentMethod === 'delivery') {
      reset({
        fulfillmentMethod: 'delivery',
        deliveryDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        deliveryTime: '12:00',
        name: form.getValues('name'),
        email: form.getValues('email'),
        phone: form.getValues('phone'),
        deliveryAddress: {
          street: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'US',
        },
      } as DeliveryFormData);
    } else if (fulfillmentMethod === 'shipping') {
      reset({
        fulfillmentMethod: 'shipping',
        name: form.getValues('name'),
        email: form.getValues('email'),
        phone: form.getValues('phone'),
        shippingAddress: {
          street: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'US',
        },
        shippingMethod: '',
      } as ShippingFormData);
    }
  }, [fulfillmentMethod, setValue, reset, form]);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      void router.push('/cart');
    }
  }, [items, router]);

  // Check if user is logged in
  useEffect(() => {
    async function getUser() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          
          // Try to get profile data to pre-fill form
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, email, phone')
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

  const prepareFulfillmentData = (formData: CheckoutFormData) => {
    const { fulfillmentMethod } = formData;
    
    if (fulfillmentMethod === 'pickup') {
      const pickupData = formData as PickupFormData;
      return {
        method: 'pickup',
        pickupTime: `${pickupData.pickupDate}T${pickupData.pickupTime}:00`,
      };
    } else if (fulfillmentMethod === 'delivery') {
      const deliveryData = formData as DeliveryFormData;
      return {
        method: 'delivery',
        deliveryAddress: deliveryData.deliveryAddress,
        deliveryTime: `${deliveryData.deliveryDate}T${deliveryData.deliveryTime}:00`,
        deliveryInstructions: deliveryData.deliveryInstructions,
      };
    } else {
      const shippingData = formData as ShippingFormData;
      return {
        method: 'shipping',
        shippingAddress: shippingData.shippingAddress,
        shippingMethod: shippingData.shippingMethod,
      };
    }
  };

  const onSubmit = async (formData: CheckoutFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const fulfillmentData = prepareFulfillmentData(formData);
      
      let pickupTimeValue = format(new Date(), 'yyyy-MM-dd') + 'T12:00:00'; // Default time
      
      if (formData.fulfillmentMethod === 'pickup') {
        const pickupData = formData as PickupFormData;
        pickupTimeValue = `${pickupData.pickupDate}T${pickupData.pickupTime}:00`;
      }
      
      // Create a Square Checkout session via our API
      const response = await fetch('/api/square/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            variantId: item.variantId,
          })),
          customerInfo: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            pickupTime: pickupTimeValue,
          },
          fulfillment: fulfillmentData,
        }),
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.success) {
        throw new Error(responseData.error || 'Failed to create checkout session');
      }

      // Redirect to Square's hosted checkout page
      window.location.href = responseData.checkoutUrl;
    } catch (error) {
      console.error('Checkout error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      toast.error('Failed to initialize checkout. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to safely get error messages based on fulfillment method
  const getErrorMessage = (field: string): string | undefined => {
    if (fulfillmentMethod === 'pickup') {
      return errors[field as keyof typeof errors]?.message;
    } else if (fulfillmentMethod === 'delivery') {
      if (field === 'deliveryDate' || field === 'deliveryTime') {
        return errors[field as keyof typeof errors]?.message;
      }
    } else if (fulfillmentMethod === 'shipping') {
      if (field === 'shippingMethod') {
        return errors[field as keyof typeof errors]?.message;
      }
    }
    return undefined;
  };

  if (items.length === 0) {
    return null; // Will redirect via useEffect
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Checkout</h1>

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

          <form onSubmit={void handleSubmit(onSubmit)} className="space-y-6">
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold">Customer Information</h2>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...register('phone')}
                    className={errors.phone ? 'border-red-500' : ''}
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Fulfillment details based on selected method */}
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              {fulfillmentMethod === 'pickup' && (
                <>
                  <h2 className="mb-4 text-xl font-semibold">Pickup Details</h2>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="pickupDate">Pickup Date</Label>
                      <Input
                        id="pickupDate"
                        type="date"
                        min={minDate}
                        {...register('pickupDate')}
                        className={getErrorMessage('pickupDate') ? 'border-red-500' : ''}
                      />
                      {getErrorMessage('pickupDate') && (
                        <p className="mt-1 text-sm text-red-500">{getErrorMessage('pickupDate')}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="pickupTime">Pickup Time</Label>
                      <Input
                        id="pickupTime"
                        type="time"
                        {...register('pickupTime')}
                        className={getErrorMessage('pickupTime') ? 'border-red-500' : ''}
                      />
                      {getErrorMessage('pickupTime') && (
                        <p className="mt-1 text-sm text-red-500">{getErrorMessage('pickupTime')}</p>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">
                        Please be prepared to show your order confirmation and ID when picking up.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {fulfillmentMethod === 'delivery' && (
                <>
                  <h2 className="mb-4 text-xl font-semibold">Delivery Details</h2>
                  <div className="space-y-6">
                    <AddressForm
                      form={form}
                      prefix="deliveryAddress"
                      title="Delivery Address"
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="deliveryDate">Delivery Date</Label>
                        <Input
                          id="deliveryDate"
                          type="date"
                          min={minDate}
                          {...register('deliveryDate')}
                          className={getErrorMessage('deliveryDate') ? 'border-red-500' : ''}
                        />
                        {getErrorMessage('deliveryDate') && (
                          <p className="mt-1 text-sm text-red-500">{getErrorMessage('deliveryDate')}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="deliveryTime">Delivery Time</Label>
                        <Input
                          id="deliveryTime"
                          type="time"
                          {...register('deliveryTime')}
                          className={getErrorMessage('deliveryTime') ? 'border-red-500' : ''}
                        />
                        {getErrorMessage('deliveryTime') && (
                          <p className="mt-1 text-sm text-red-500">{getErrorMessage('deliveryTime')}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="deliveryInstructions">Delivery Instructions (optional)</Label>
                      <Input
                        id="deliveryInstructions"
                        {...register('deliveryInstructions')}
                      />
                    </div>
                  </div>
                </>
              )}

              {fulfillmentMethod === 'shipping' && (
                <>
                  <h2 className="mb-4 text-xl font-semibold">Shipping Details</h2>
                  <div className="space-y-6">
                    <AddressForm
                      form={form}
                      prefix="shippingAddress"
                      title="Shipping Address"
                    />

                    <div>
                      <Label htmlFor="shippingMethod">Shipping Method</Label>
                      <select
                        id="shippingMethod"
                        {...register('shippingMethod')}
                        className={`w-full rounded-md border px-3 py-2 ${getErrorMessage('shippingMethod') ? 'border-red-500' : 'border-gray-300'}`}
                      >
                        <option value="">Select a shipping method</option>
                        <option value="standard">Standard Shipping (3-5 business days)</option>
                        <option value="express">Express Shipping (1-2 business days)</option>
                      </select>
                      {getErrorMessage('shippingMethod') && (
                        <p className="mt-1 text-sm text-red-500">{getErrorMessage('shippingMethod')}</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : 'Continue to Payment'}
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
