'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, FieldErrors, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
// --- Date/Time Imports ---
import { format, addDays, parseISO, formatISO } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// --- End Date/Time Imports ---
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
import { FulfillmentSelector, FulfillmentMethod as AppFulfillmentMethod } from '@/components/Store/FulfillmentSelector';
import { AddressForm } from '@/components/Store/AddressForm';
import { createOrderAndGenerateCheckoutUrl, getShippingRates } from '@/app/actions';
import type { FulfillmentData, ShippingRate } from '@/app/actions';
// --- Import Date Utilities ---
import {
  getEarliestPickupDate,
  getEarliestDeliveryDate,
  isBusinessDay,
  getPickupTimeSlots,
  getDeliveryTimeSlots,
  isValidPickupDateTime,
  isValidDeliveryDateTime,
} from '@/lib/dateUtils';

// --- Simplify Fulfillment Method Type ---
type FulfillmentMethod = 'pickup' | 'local_delivery' | 'nationwide_shipping';

// --- Add placeholder weight ---
const PLACEHOLDER_WEIGHT_LB = 1; // TODO: Replace with actual cart weight calculation

// Form validation schema
const addressSchema = z.object({
  recipientName: z.string().optional(),
  street: z.string().min(1, 'Street address is required'),
  street2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(5, 'Valid postal code is required'),
  country: z.string().min(2, 'Country is required').default('US'),
});

// --- Define Schemas Directly (No Base Schema) ---
const pickupSchema = z.object({
  fulfillmentMethod: z.literal('pickup'),
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  pickupDate: z.string().min(1, 'Pickup date is required'),
  pickupTime: z.string().min(1, 'Pickup time is required'),
});

const localDeliverySchema = z.object({
  fulfillmentMethod: z.literal('local_delivery'),
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  deliveryAddress: addressSchema,
  deliveryDate: z.string().min(1, 'Delivery date is required'),
  deliveryTime: z.string().min(1, 'Delivery time is required'),
  deliveryInstructions: z.string().optional(),
});

const nationwideShippingSchema = z.object({
  fulfillmentMethod: z.literal('nationwide_shipping'),
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  shippingAddress: addressSchema,
  rateId: z.string().optional(),
});

// --- Add .superRefine() for cross-field validation ---
const checkoutSchema = z.discriminatedUnion('fulfillmentMethod', [
  pickupSchema,
  localDeliverySchema,
  nationwideShippingSchema,
]).superRefine((data, ctx) => {
  if (data.fulfillmentMethod === 'pickup') {
    if (!isValidPickupDateTime(data.pickupDate, data.pickupTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selected pickup date/time is not available. Please choose a valid slot (Mon-Fri, 10AM-4PM, 2 business days notice).',
        path: ['pickupDate'], 
      });
    }
  } else if (data.fulfillmentMethod === 'local_delivery') {
    if (!isValidDeliveryDateTime(data.deliveryDate, data.deliveryTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selected delivery date/time is not available. Please choose a valid slot (Mon-Fri, 10AM-2PM, 2 business days notice).',
        path: ['deliveryDate'], 
      });
    }
  }
});

// --- Update FormData Types ---
type CheckoutFormData = z.infer<typeof checkoutSchema>;
type PickupFormData = z.infer<typeof pickupSchema>;
type LocalDeliveryFormData = z.infer<typeof localDeliverySchema>;
type NationwideShippingFormData = z.infer<typeof nationwideShippingSchema>;

// --- Get default date/time values ---
const defaultPickupDate = getEarliestPickupDate();
const defaultPickupTime = getPickupTimeSlots()[0];
const defaultDeliveryDate = getEarliestDeliveryDate();
const defaultDeliveryTime = getDeliveryTimeSlots()[0];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCartStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>('pickup');
  const [isMounted, setIsMounted] = useState(false);
  // --- Add State for Shipping Rates ---
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [shippingLoading, setShippingLoading] = useState<boolean>(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  // No need for selectedRateId state, react-hook-form will manage rateId field
  // --- End State for Shipping Rates ---
  const supabase = createClient();

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fulfillmentMethod: 'pickup',
      name: '',
      email: '',
      phone: '',
      pickupDate: format(defaultPickupDate, 'yyyy-MM-dd'),
      pickupTime: defaultPickupTime,
      rateId: undefined,
    } as Partial<CheckoutFormData>,
     mode: 'onBlur',
  });

  const typedForm = form as UseFormReturn<CheckoutFormData>; 
  const { register, handleSubmit, setValue, watch, reset, formState: { errors, touchedFields, isValid }, control, trigger } = typedForm;

  const currentMethod = watch('fulfillmentMethod');

  // Update form defaults when fulfillment method changes
  useEffect(() => {
    const currentValues = typedForm.getValues();
    const commonData = {
        name: currentValues.name,
        email: currentValues.email,
        phone: currentValues.phone,
    };

    if (fulfillmentMethod === 'pickup') {
      reset({
        ...commonData,
        fulfillmentMethod: 'pickup',
        pickupDate: format(getEarliestPickupDate(), 'yyyy-MM-dd'),
        pickupTime: getPickupTimeSlots()[0],
        rateId: undefined,
      } as Partial<CheckoutFormData>);
    } else if (fulfillmentMethod === 'local_delivery') {
      reset({
        ...commonData,
        fulfillmentMethod: 'local_delivery',
        deliveryDate: format(getEarliestDeliveryDate(), 'yyyy-MM-dd'),
        deliveryTime: getDeliveryTimeSlots()[0],
        deliveryAddress: { 
            recipientName: '', street: '', city: '', state: '', postalCode: '', country: 'US'
        },
        deliveryInstructions: '',
        rateId: undefined,
      } as Partial<CheckoutFormData>);
    } else if (fulfillmentMethod === 'nationwide_shipping') {
       reset({
        ...commonData,
        fulfillmentMethod: 'nationwide_shipping',
        shippingAddress: { 
            recipientName: '', street: '', city: '', state: '', postalCode: '', country: 'US'
        },
        rateId: undefined,
      } as Partial<CheckoutFormData>, { keepDefaultValues: false });
       setShippingRates([]);
       setShippingError(null);
    }
    trigger(); 
  }, [fulfillmentMethod, reset, typedForm, trigger]); 


  useEffect(() => {
    if (isMounted && items.length === 0) {
      toast.warning('Your cart is empty. Redirecting...');
      void router.push('/cart');
    }
  }, [items, router, isMounted]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    async function getUser() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
          const { data: profile } = await supabase
            .from('Profile')
            .select('name, phone') 
            .eq('id', session.user.id)
            .single();

          if (profile?.name) {
             setValue('name', profile.name, { shouldValidate: false, shouldDirty: false });
          }
          if (session.user.email) {
             setValue('email', session.user.email, { shouldValidate: false, shouldDirty: false });
          }
          if (profile?.phone) {
             setValue('phone', profile.phone, { shouldValidate: false, shouldDirty: false });
          }

        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      } finally {
        setLoading(false);
      }
    }

    void getUser();
  }, [supabase, setValue, reset, typedForm]); 


  // --- Add function to fetch shipping rates ---
  const fetchShippingRates = async () => {
    const address = typedForm.getValues('shippingAddress') as z.infer<typeof addressSchema>; 
    if (!address || !address.street || !address.city || !address.state || !address.postalCode || !address.country) {
        setShippingError("Please complete the shipping address to fetch rates.");
        setShippingRates([]);
        return;
    }

    setShippingLoading(true);
    setShippingError(null);
    setShippingRates([]);
    setValue('rateId', undefined, { shouldValidate: true }); 

    try {
      console.log("Fetching shipping rates for address:", address);
      const weightLb = PLACEHOLDER_WEIGHT_LB;
      console.log(`Using placeholder weight: ${weightLb} lbs`);

      const result = await getShippingRates({
        shippingAddress: address,
        estimatedWeightLb: weightLb,
        estimatedLengthIn: 10, 
        estimatedWidthIn: 8,   
        estimatedHeightIn: 4,  
      });

      if (result.success && result.rates) {
        console.log("Received rates:", result.rates);
        if (result.rates.length === 0) {
            setShippingError('No shipping rates found for this address/weight. Please check the details or contact support.');
            setShippingRates([]);
        } else {
            setShippingRates(result.rates);
        }
      } else {
        console.error("Failed to fetch shipping rates:", result.error);
        setShippingError(result.error || 'Failed to fetch shipping rates.');
        setShippingRates([]);
      }
    } catch (err: any) {
      console.error("Error calling getShippingRates action:", err);
      setShippingError(err.message || 'An unexpected error occurred while fetching rates.');
      setShippingRates([]);
    } finally {
      setShippingLoading(false);
    }
  };
  // --- End function to fetch shipping rates ---

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

    let fulfillmentData: FulfillmentData | null = null;
    let customerInfo: { name: string; email: string; phone: string; };

    try {
      console.log('Form data submitted:', formData);

      // --- Construct Fulfillment Data Directly ---
      if (formData.fulfillmentMethod === 'pickup') {
          if (!formData.pickupDate || !formData.pickupTime) {
              throw new Error("Missing pickup date or time.");
          }
          fulfillmentData = {
              method: 'pickup',
              // Format pickup time as required by the action (ISO string)
              pickupTime: formatISO(parseISO(`${formData.pickupDate}T${formData.pickupTime}:00`))
          };
      } else if (formData.fulfillmentMethod === 'local_delivery') {
          if (!formData.deliveryDate || !formData.deliveryTime || !formData.deliveryAddress) {
              throw new Error("Missing delivery details.");
          }
          fulfillmentData = {
              method: 'local_delivery',
              deliveryDate: formData.deliveryDate,
              deliveryTime: formData.deliveryTime,
              deliveryAddress: formData.deliveryAddress,
              deliveryInstructions: formData.deliveryInstructions,
          };
      } else if (formData.fulfillmentMethod === 'nationwide_shipping') {
          if (!formData.rateId) {
              // This check might be redundant if Zod validation is kept strict
              // but good defense if rateId is optional in schema
              setError("Please select a shipping method.");
              toast.error("Please select a shipping method.");
              setIsSubmitting(false);
              return;
          }
          const selectedRate = shippingRates.find(rate => rate.id === formData.rateId);
          if (!selectedRate) {
              setError("Selected shipping rate not found. Please re-select.");
              toast.error("Selected shipping rate not found. Please re-select.");
              setShippingRates([]); // Clear rates as they might be stale
              setIsSubmitting(false);
              return;
          }
          if (!formData.shippingAddress) {
              throw new Error("Missing shipping address.");
          }
          fulfillmentData = {
              method: 'nationwide_shipping',
              shippingAddress: formData.shippingAddress,
              rateId: selectedRate.id,
              shippingMethod: selectedRate.serviceLevelToken, // Use the token
              shippingCarrier: selectedRate.carrier,
              shippingCost: selectedRate.amount, // Amount in cents
              // shippingMethodName could be derived here if needed for DB: selectedRate.name
          };
      } else {
          throw new Error('Invalid fulfillment method.');
      }

      if (!fulfillmentData) {
          // This should ideally not be reached if the above logic is sound
          throw new Error("Failed to determine fulfillment details.");
      }
      // --- End Construct Fulfillment Data ---

      // Construct Customer Info (matches action input type)
      customerInfo = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          // pickupTime is not needed here, it's derived from fulfillmentData in the action
      };

      console.log('Constructed fulfillment data:', fulfillmentData);
      console.log('Constructed customer info:', customerInfo);
      console.log('Calling createOrderAndGenerateCheckoutUrl server action...');

      const actionPayload = {
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          variantId: item.variantId,
        })),
        customerInfo: customerInfo,
        fulfillment: fulfillmentData, // Pass the correctly typed object
      };

      console.log('Server Action Payload:', JSON.stringify(actionPayload, null, 2)); // Log the final payload

      // ---> Type Assertion to satisfy the complex action input type
      const result = await createOrderAndGenerateCheckoutUrl(actionPayload as any);
      console.log('Server action result:', result);

      if (!result.success || !result.checkoutUrl) {
        const errorMessage = result.error || 'Failed to create checkout session. Please try again.';
        setError(errorMessage);
        toast.error(errorMessage);
        setIsSubmitting(false);
        return;
      }

      clearCart();
      console.log('Redirecting to Square Checkout:', result.checkoutUrl);
      window.location.href = result.checkoutUrl;

    } catch (err: any) {
      console.error('Error during checkout process:', err);
      const message = err.message || 'An unexpected error occurred during checkout.';
      setError(message);
      toast.error(message);
      setIsSubmitting(false);
    }
  };

  // Helper to display validation errors
  const getErrorMessage = (field: keyof CheckoutFormData | string): string | undefined => {
    const fieldErrors = errors as FieldErrors<CheckoutFormData>;
    const keys = (field as string).split('.'); 
    let errorObj: any = fieldErrors;

    for (const key of keys) {
        if (errorObj && typeof errorObj === 'object' && key in errorObj) { 
            errorObj = errorObj[key];
        } else {
            errorObj = undefined;
            break;
        }
    }
    return errorObj?.message as string | undefined;
  };

  if (!isMounted || loading) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading checkout...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>

      {/* Authentication Status */}
      {!loading && !user && (
        <Alert variant="default" className="mb-6 bg-blue-50 border-blue-200">
          <UserIcon className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            Have an account?{' '}
            <Link href="/login?redirect=/checkout" className="font-medium text-blue-600 hover:underline">
              <LogInIcon className="inline h-4 w-4 mr-1" />Log in
            </Link>
            {' '}for faster checkout or{' '}
            <Link href="/signup?redirect=/checkout" className="font-medium text-blue-600 hover:underline">
              <UserPlusIcon className="inline h-4 w-4 mr-1" />Sign up
            </Link>.
            You can also continue as a guest.
          </AlertDescription>
        </Alert>
      )}
       {!loading && user && (
        <Alert variant="default" className="mb-6 bg-green-50 border-green-200">
          <UserIcon className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            Logged in as {user.email}. Your details have been pre-filled.
          </AlertDescription>
        </Alert>
      )}


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Checkout Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-2 space-y-6">
          {/* Fulfillment Method Selector */}
          <FulfillmentSelector
            selectedMethod={currentMethod as AppFulfillmentMethod} 
            onSelectMethod={(method) => setFulfillmentMethod(method as FulfillmentMethod)} 
          />

          {/* Customer Information */}
          <div className="space-y-4 border-t pt-6">
             <h2 className="text-xl font-semibold">Contact Information</h2>
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" {...register('name')} placeholder="John Doe" />
              {getErrorMessage('name') && <p className="text-sm text-red-600 mt-1">{getErrorMessage('name')}</p>}
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" {...register('email')} placeholder="you@example.com" />
              {getErrorMessage('email') && <p className="text-sm text-red-600 mt-1">{getErrorMessage('email')}</p>}
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" {...register('phone')} placeholder="555-123-4567" />
              {getErrorMessage('phone') && <p className="text-sm text-red-600 mt-1">{getErrorMessage('phone')}</p>}
            </div>
          </div>

          {/* Conditional Fields based on Fulfillment Method */}
          {currentMethod === 'pickup' && (
            <div className="space-y-4 border-t pt-6">
              <h2 className="text-xl font-semibold">Pickup Details</h2>
              <div>
                <Label htmlFor="pickupDate">Pickup Date</Label>
                <Controller
                  name="pickupDate"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(parseISO(field.value), 'PPP') : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value ? parseISO(field.value) : undefined}
                          onSelect={(date) => {
                            field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                            trigger(['pickupDate', 'pickupTime']); 
                          }}
                          initialFocus
                          fromDate={getEarliestPickupDate()} 
                          disabled={(date) => !isBusinessDay(date)}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {getErrorMessage('pickupDate') && <p className="text-sm text-red-600 mt-1">{getErrorMessage('pickupDate')}</p>}
              </div>

               <div>
                   <Label htmlFor="pickupTime">Pickup Time</Label>
                    <Controller
                        name="pickupTime"
                        control={control}
                        render={({ field }) => (
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value);
                                trigger(['pickupDate', 'pickupTime']); 
                              }}
                              value={field.value} 
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select pickup time" />
                                </SelectTrigger>
                                <SelectContent>
                                    {getPickupTimeSlots().map(time => (
                                        <SelectItem key={time} value={time}>
                                            {format(parseISO(`1970-01-01T${time}:00`), 'h:mm a')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                   {getErrorMessage('pickupTime') && <p className="text-sm text-red-600 mt-1">{getErrorMessage('pickupTime')}</p>}
               </div>
            </div>
          )}

          {currentMethod === 'local_delivery' && (
            <div className="space-y-4 border-t pt-6">
              <h2 className="text-xl font-semibold">Delivery Details</h2>
              <AddressForm
                 form={typedForm} 
                 prefix="deliveryAddress" 
                 title="Delivery Address" 
              />
              <div>
                <Label htmlFor="deliveryDate">Delivery Date</Label>
                <Controller
                  name="deliveryDate"
                  control={control}
                  render={({ field }) => (
                     <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(parseISO(field.value), 'PPP') : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value ? parseISO(field.value) : undefined}
                          onSelect={(date) => {
                              field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                              trigger(['deliveryDate', 'deliveryTime']); 
                          }}
                          initialFocus
                          fromDate={getEarliestDeliveryDate()} 
                          disabled={(date) => !isBusinessDay(date)} 
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {getErrorMessage('deliveryDate') && <p className="text-sm text-red-600 mt-1">{getErrorMessage('deliveryDate')}</p>}
              </div>
               <div>
                   <Label htmlFor="deliveryTime">Delivery Time</Label>
                    <Controller
                        name="deliveryTime"
                        control={control}
                        render={({ field }) => (
                           <Select 
                              onValueChange={(value) => {
                                field.onChange(value);
                                trigger(['deliveryDate', 'deliveryTime']);
                              }}
                              value={field.value} 
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select delivery time" />
                                </SelectTrigger>
                                <SelectContent>
                                    {getDeliveryTimeSlots().map(time => (
                                        <SelectItem key={time} value={time}>
                                            {format(parseISO(`1970-01-01T${time}:00`), 'h:mm a')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                   {getErrorMessage('deliveryTime') && <p className="text-sm text-red-600 mt-1">{getErrorMessage('deliveryTime')}</p>}
               </div>
              <div>
                <Label htmlFor="deliveryInstructions">Delivery Instructions (Optional)</Label>
                <Input id="deliveryInstructions" {...register('deliveryInstructions')} placeholder="e.g., leave at front door" />
                {getErrorMessage('deliveryInstructions') && <p className="text-sm text-red-600 mt-1">{getErrorMessage('deliveryInstructions')}</p>}
              </div>
            </div>
          )}

          {currentMethod === 'nationwide_shipping' && (
            <div className="space-y-4 border-t pt-6">
              <h2 className="text-xl font-semibold">Shipping Details</h2>
              <AddressForm
                form={typedForm} 
                prefix="shippingAddress" 
                title="Shipping Address" 
              />
               <div>
                  <Label htmlFor="rateId">Shipping Method</Label>
                   <Controller
                        name="rateId"
                        control={control}
                        render={({ field }) => (
                           <Select onValueChange={field.onChange} value={field.value}> 
                                <SelectTrigger>
                                    <SelectValue placeholder="Select shipping method" />
                                </SelectTrigger>
                                <SelectContent>
                                    {shippingRates.map(rate => (
                                        <SelectItem key={rate.id} value={rate.id}>
                                            {rate.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                  {getErrorMessage('rateId') && <p className="text-sm text-red-600 mt-1">{getErrorMessage('rateId')}</p>}
                </div> 
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isSubmitting || !isMounted || items.length === 0 || !isValid }>
            {isSubmitting ? 'Processing...' : 'Continue to Payment'}
          </Button>
        </form>

        {/* Order Summary */}
        <div className="lg:col-span-1">
           {isMounted ? (
             <CheckoutSummary items={items} includeServiceFee={true} />
           ) : (
             <p>Loading cart summary...</p> // Placeholder while mounting
           )}
        </div>
      </div>
    </div>
  );
}
