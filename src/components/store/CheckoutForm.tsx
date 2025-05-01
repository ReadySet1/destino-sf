'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, FieldErrors, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
// --- Date/Time Imports ---
import { format, addDays, parseISO, formatISO } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/slug';
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
// Remove server client import if present, keep client one
// import { createClient as createServerClient } from '@/utils/supabase/server'; // REMOVE
import { createClient } from '@/utils/supabase/client'; // Keep client version if needed for client actions
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

// --- Define Schemas (keep these here as they define form structure) ---
const addressSchema = z.object({
  recipientName: z.string().optional(),
  street: z.string().min(1, 'Street address is required'),
  street2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(5, 'Valid postal code is required'),
  country: z.string().optional(),
});

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
  rateId: z.string().min(1, 'Please select a shipping method.'),
});

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

// --- Define Props for the Client Component ---
interface CheckoutFormProps {
  initialUserData?: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
  } | null;
}

// --- Get default date/time values ---
const defaultPickupDate = getEarliestPickupDate();
const defaultPickupTime = getPickupTimeSlots()[0];
const defaultDeliveryDate = getEarliestDeliveryDate();
const defaultDeliveryTime = getDeliveryTimeSlots()[0];

export function CheckoutForm({ initialUserData }: CheckoutFormProps) {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCartStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // User state is now derived from initialUserData prop
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>('pickup');
  const [isMounted, setIsMounted] = useState(false);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [shippingLoading, setShippingLoading] = useState<boolean>(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  // Client Supabase needed only if performing client-side auth actions, otherwise remove
  // const supabase = createClient(); 

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    // --- Set defaultValues using initialUserData ---
    defaultValues: {
      fulfillmentMethod: 'pickup',
      name: initialUserData?.name || '',
      email: initialUserData?.email || '',
      phone: initialUserData?.phone || '',
      pickupDate: format(defaultPickupDate, 'yyyy-MM-dd'),
      pickupTime: defaultPickupTime,
      rateId: '',
      // Initialize other fields based on the default fulfillment method ('pickup')
      // We don't need to initialize all possible fields here, the reset effect handles it
    } as Partial<CheckoutFormData>,
    mode: 'onChange',
  });

  const typedForm = form as UseFormReturn<CheckoutFormData>; 
  const { register, handleSubmit, setValue, watch, reset, formState: { errors, touchedFields, isValid }, control, trigger } = typedForm;

  const currentMethod = watch('fulfillmentMethod');

  // --- Effect to Reset Form Based on Fulfillment Method ---
  // Keep this effect, but initialize based on potentially pre-filled common data
  useEffect(() => {
    reset(currentValues => {
        const commonData = {
            name: currentValues.name || initialUserData?.name || '', // Prioritize current, then initial, then empty
            email: currentValues.email || initialUserData?.email || '',
            phone: currentValues.phone || initialUserData?.phone || '',
        };

        let recipientName = commonData.name;
        if (currentValues.fulfillmentMethod === 'local_delivery' && currentValues.deliveryAddress?.recipientName) {
             recipientName = currentValues.deliveryAddress.recipientName;
        } else if (currentValues.fulfillmentMethod === 'nationwide_shipping' && currentValues.shippingAddress?.recipientName) {
             recipientName = currentValues.shippingAddress.recipientName;
        }

        if (fulfillmentMethod === 'pickup') {
          return {
            ...commonData,
            fulfillmentMethod: 'pickup',
            pickupDate: format(getEarliestPickupDate(), 'yyyy-MM-dd'),
            pickupTime: getPickupTimeSlots()[0],
            deliveryAddress: undefined, deliveryDate: undefined, deliveryTime: undefined, deliveryInstructions: undefined, shippingAddress: undefined, rateId: '',
          };
        } else if (fulfillmentMethod === 'local_delivery') {
           return {
            ...commonData, fulfillmentMethod: 'local_delivery', deliveryDate: format(getEarliestDeliveryDate(), 'yyyy-MM-dd'), deliveryTime: getDeliveryTimeSlots()[0],
            deliveryAddress: { recipientName: recipientName, street: '', city: '', state: '', postalCode: '', country: 'US' },
            deliveryInstructions: '',
            pickupDate: undefined, pickupTime: undefined, shippingAddress: undefined, rateId: '',
          };
        } else if (fulfillmentMethod === 'nationwide_shipping') {
           return {
            ...commonData, fulfillmentMethod: 'nationwide_shipping',
            shippingAddress: { recipientName: recipientName, street: '', city: '', state: '', postalCode: '', country: 'US' },
            rateId: '', 
            pickupDate: undefined, pickupTime: undefined, deliveryAddress: undefined, deliveryDate: undefined, deliveryTime: undefined, deliveryInstructions: undefined,
          };
        }
        return { ...currentValues, fulfillmentMethod };
    }, { keepDefaultValues: false, keepDirty: true, keepErrors: false, keepIsValid: false });

    if (fulfillmentMethod === 'nationwide_shipping') {
       setShippingRates([]);
       setShippingError(null);
    }
    trigger(); 
  }, [fulfillmentMethod, reset, trigger, initialUserData]); // Add initialUserData dependency

  // --- Effect to Check Cart and Mount Status ---
  // Keep these effects
  useEffect(() => {
    if (isMounted && items.length === 0) {
      toast.warning('Your cart is empty. Redirecting...');
      void router.push('/cart');
    }
  }, [items, router, isMounted]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // --- REMOVE useEffect for getUser() ---
  // This data is now passed via props (initialUserData)

  // --- Keep fetchShippingRates function ---
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
    setValue('rateId', '', { shouldValidate: true }); 

    try {
      console.log("Fetching shipping rates for address:", address);
      const weightLb = PLACEHOLDER_WEIGHT_LB;
      console.log(`Using placeholder weight: ${weightLb} lbs`);
      const result = await getShippingRates({
        shippingAddress: address, estimatedWeightLb: weightLb, estimatedLengthIn: 10, estimatedWidthIn: 8, estimatedHeightIn: 4, 
      });

      if (result.success && result.rates) {
        console.log("Received rates:", result.rates);
        if (result.rates.length === 0) {
            setShippingError('No shipping rates found for this address/weight.'); setShippingRates([]);
        } else { setShippingRates(result.rates); }
      } else {
        console.error("Failed to fetch shipping rates:", result.error);
        setShippingError(result.error || 'Failed to fetch shipping rates.'); setShippingRates([]);
      }
    } catch (err: any) {
      console.error("Error calling getShippingRates action:", err);
      setShippingError(err.message || 'An unexpected error occurred.'); setShippingRates([]);
    } finally { setShippingLoading(false); } // Should be setShippingLoading(false)
  };
  // --- End fetchShippingRates ---

  // --- Keep onSubmit function ---
  const onSubmit = async (formData: CheckoutFormData) => {
    console.log('CheckoutForm onSubmit triggered');
    setIsSubmitting(true);
    setError(null);

    if (!items || items.length === 0) {
      setError('Your cart is empty.'); setIsSubmitting(false); toast.error('Cannot checkout with an empty cart.'); return;
    }

    let fulfillmentData: FulfillmentData | null = null;
    let customerInfo: { name: string; email: string; phone: string; };

    try {
      console.log('Form data submitted:', formData);
      if (formData.fulfillmentMethod === 'pickup') {
          if (!formData.pickupDate || !formData.pickupTime) throw new Error("Missing pickup date or time.");
          fulfillmentData = { method: 'pickup', pickupTime: formatISO(parseISO(`${formData.pickupDate}T${formData.pickupTime}:00`)) };
      } else if (formData.fulfillmentMethod === 'local_delivery') {
          if (!formData.deliveryDate || !formData.deliveryTime || !formData.deliveryAddress) throw new Error("Missing delivery details.");
          fulfillmentData = { method: 'local_delivery', deliveryDate: formData.deliveryDate, deliveryTime: formData.deliveryTime, deliveryAddress: {...formData.deliveryAddress, country: 'US'}, deliveryInstructions: formData.deliveryInstructions };
      } else if (formData.fulfillmentMethod === 'nationwide_shipping') {
          if (!formData.rateId) { setError("Please select a shipping method."); toast.error("Please select a shipping method."); setIsSubmitting(false); return; }
          const selectedRate = shippingRates.find(rate => rate.id === formData.rateId);
          if (!selectedRate) { setError("Selected shipping rate not found."); toast.error("Selected shipping rate not found."); setShippingRates([]); setIsSubmitting(false); return; }
          if (!formData.shippingAddress) throw new Error("Missing shipping address.");
          fulfillmentData = { method: 'nationwide_shipping', shippingAddress: {...formData.shippingAddress, country: 'US'}, rateId: selectedRate.id, shippingMethod: selectedRate.serviceLevelToken, shippingCarrier: selectedRate.carrier, shippingCost: selectedRate.amount };
      } else { throw new Error('Invalid fulfillment method.'); }

      if (!fulfillmentData) throw new Error("Failed to determine fulfillment details.");
      
      customerInfo = { name: formData.name, email: formData.email, phone: formData.phone };

      console.log('Constructed fulfillment data:', fulfillmentData);
      console.log('Constructed customer info:', customerInfo);
      console.log('Calling createOrderAndGenerateCheckoutUrl server action...');

      const actionPayload = {
        items: items.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity, variantId: item.variantId })),
        customerInfo: customerInfo,
        fulfillment: fulfillmentData, 
      };
      console.log('Server Action Payload:', JSON.stringify(actionPayload, null, 2)); 

      const result = await createOrderAndGenerateCheckoutUrl(actionPayload as any); // TODO: Improve type safety here if possible
      console.log('Server action result:', result);

      if (!result.success || !result.checkoutUrl) {
        const errorMessage = result.error || 'Failed to create checkout session.';
        setError(errorMessage); toast.error(errorMessage); setIsSubmitting(false); return;
      }
      clearCart();
      console.log('Redirecting to Square Checkout:', result.checkoutUrl);
      window.location.href = result.checkoutUrl;

    } catch (err: any) {
      console.error('Error during checkout process:', err);
      const message = err.message || 'An unexpected error occurred.';
      setError(message); toast.error(message); setIsSubmitting(false);
    }
  };
  // --- End onSubmit ---

  // --- Keep getErrorMessage helper ---
  const getErrorMessage = (field: keyof CheckoutFormData | string): string | undefined => {
    const fieldErrors = errors as FieldErrors<CheckoutFormData>;
    const keys = (field as string).split('.'); 
    let errorObj: any = fieldErrors;
    for (const key of keys) {
        if (errorObj && typeof errorObj === 'object' && key in errorObj) { errorObj = errorObj[key]; } 
        else { errorObj = undefined; break; }
    }
    return errorObj?.message as string | undefined;
  };
  // --- End getErrorMessage ---

  // --- Return Form JSX ---
  if (!isMounted) {
    return null; 
  }

  return (
    <>
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
              <Controller name="pickupDate" control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild><Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(parseISO(field.value), 'PPP') : <span>Pick a date</span>}</Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ? parseISO(field.value) : undefined} onSelect={(date) => { field.onChange(date ? format(date, 'yyyy-MM-dd') : ''); trigger(['pickupDate', 'pickupTime']); }} initialFocus fromDate={getEarliestPickupDate()} disabled={(date) => !isBusinessDay(date)} /></PopoverContent>
                  </Popover>
                )}
              />
              {getErrorMessage('pickupDate') && <p className="text-sm text-red-600 mt-1">{getErrorMessage('pickupDate')}</p>}
            </div>
             <div>
                 <Label htmlFor="pickupTime">Pickup Time</Label>
                  <Controller name="pickupTime" control={control}
                      render={({ field }) => (
                          <Select onValueChange={(value) => { field.onChange(value); trigger(['pickupDate', 'pickupTime']); }} value={field.value} >
                              <SelectTrigger><SelectValue placeholder="Select pickup time" /></SelectTrigger>
                              <SelectContent>{getPickupTimeSlots().map(time => (<SelectItem key={time} value={time}>{format(parseISO(`1970-01-01T${time}:00`), 'h:mm a')}</SelectItem>))}</SelectContent>
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
            <AddressForm form={typedForm} prefix="deliveryAddress" title="Delivery Address" />
            <div>
              <Label htmlFor="deliveryDate">Delivery Date</Label>
              <Controller name="deliveryDate" control={control}
                render={({ field }) => (
                   <Popover>
                    <PopoverTrigger asChild><Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(parseISO(field.value), 'PPP') : <span>Pick a date</span>}</Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ? parseISO(field.value) : undefined} onSelect={(date) => { field.onChange(date ? format(date, 'yyyy-MM-dd') : ''); trigger(['deliveryDate', 'deliveryTime']); }} initialFocus fromDate={getEarliestDeliveryDate()} disabled={(date) => !isBusinessDay(date)} /></PopoverContent>
                  </Popover>
                )}
              />
              {getErrorMessage('deliveryDate') && <p className="text-sm text-red-600 mt-1">{getErrorMessage('deliveryDate')}</p>}
            </div>
             <div>
                 <Label htmlFor="deliveryTime">Delivery Time</Label>
                  <Controller name="deliveryTime" control={control}
                      render={({ field }) => (
                         <Select onValueChange={(value) => { field.onChange(value); trigger(['deliveryDate', 'deliveryTime']); }} value={field.value} >
                              <SelectTrigger><SelectValue placeholder="Select delivery time" /></SelectTrigger>
                              <SelectContent>{getDeliveryTimeSlots().map(time => (<SelectItem key={time} value={time}>{format(parseISO(`1970-01-01T${time}:00`), 'h:mm a')}</SelectItem>))}</SelectContent>
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
            <AddressForm form={typedForm} prefix="shippingAddress" title="Shipping Address" />
            {/* Shipping Rate Fetch Button */}
            <Button 
              type="button" 
              onClick={() => void fetchShippingRates()} 
              disabled={shippingLoading}
              variant="outline"
              className="w-full"
            >
              {shippingLoading ? 'Fetching Rates...' : 'Fetch Shipping Rates'}
            </Button>
            {shippingError && <p className="text-sm text-red-600 mt-1">{shippingError}</p>}

             {/* Shipping Rate Selector - only show if rates exist */}
             {shippingRates.length > 0 && (
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
                                              {rate.name} - ${ (rate.amount / 100).toFixed(2)} 
                                          </SelectItem>
                                      ))}
                                  </SelectContent>
                              </Select>
                          )}
                      />
                    {getErrorMessage('rateId') && <p className="text-sm text-red-600 mt-1">{getErrorMessage('rateId')}</p>}
                  </div> 
             )}
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

      <div className="lg:col-span-1">
         <CheckoutSummary items={items} includeServiceFee={true} />
      </div>
    </>
  );
} 