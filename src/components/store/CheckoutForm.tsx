'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, FieldErrors, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
// --- Date/Time Imports ---
import { format, addDays, parseISO, formatISO } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/slug';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { CheckoutSummary } from '@/components/store/CheckoutSummary';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserIcon, LogInIcon, UserPlusIcon } from 'lucide-react';
import {
  FulfillmentSelector,
  FulfillmentMethod as AppFulfillmentMethod,
} from '@/components/store/FulfillmentSelector';
import { AddressForm } from '@/components/store/AddressForm';
import {
  createOrderAndGenerateCheckoutUrl,
  getShippingRates,
  createManualPaymentOrder,
} from '@/app/actions';
import { updateOrderWithManualPayment } from '@/app/actions/createManualOrder';
import type { ShippingRate } from '@/app/actions';
import { checkForDuplicateOrders } from '@/app/actions/duplicate-prevention';
import PendingOrderAlert from './PendingOrderAlert';
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
// Import the delivery fee utilities
import {
  calculateDeliveryFeeAction,
  getDeliveryFeeMessage,
  DeliveryFeeResult,
} from '@/lib/deliveryUtils';
import { PaymentMethodSelector } from '@/components/store/PaymentMethodSelector';
import { validateOrderMinimums } from '@/lib/cart-helpers';
import { saveCateringContactInfo } from '@/actions/catering';
import { PaymentMethod } from '@prisma/client';

// --- Simplify Fulfillment Method Type ---
type FulfillmentMethod = 'pickup' | 'local_delivery' | 'nationwide_shipping';

// --- Weight calculation is now handled dynamically in shipping utils ---

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

// Shipping address schema with required recipient name
const shippingAddressSchema = z.object({
  recipientName: z.string().min(1, 'Recipient name is required'),
  street: z.string().min(1, 'Street address is required'),
  street2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(5, 'Valid postal code is required'),
  country: z.string().optional(),
});

// Phone number validation schema
const phoneSchema = z
  .string()
  .min(10, 'Phone number must be at least 10 digits')
  .max(20, 'Phone number is too long')
  .refine(
    phone => {
      // Remove all non-digit characters for validation
      const digitsOnly = phone.replace(/\D/g, '');
      return digitsOnly.length >= 10 && digitsOnly.length <= 15;
    },
    {
      message: 'Please enter a valid phone number (10-15 digits)',
    }
  );

const pickupSchema = z.object({
  fulfillmentMethod: z.literal('pickup'),
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: phoneSchema,
  pickupDate: z.string().min(1, 'Pickup date is required'),
  pickupTime: z.string().min(1, 'Pickup time is required'),
  paymentMethod: z.nativeEnum(PaymentMethod),
});

const localDeliverySchema = z.object({
  fulfillmentMethod: z.literal('local_delivery'),
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: phoneSchema,
  deliveryAddress: addressSchema.refine(data => data.state === 'CA', {
    message: 'Local delivery is only available in California (CA)',
    path: ['state'],
  }),
  deliveryDate: z.string().min(1, 'Delivery date is required'),
  deliveryTime: z.string().min(1, 'Delivery time is required'),
  deliveryInstructions: z.string().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod),
});

const nationwideShippingSchema = z.object({
  fulfillmentMethod: z.literal('nationwide_shipping'),
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: phoneSchema,
  shippingAddress: shippingAddressSchema,
  rateId: z.string().min(1, 'Please select a shipping method.'),
  paymentMethod: z.nativeEnum(PaymentMethod),
});

const checkoutSchema = z
  .discriminatedUnion('fulfillmentMethod', [
    pickupSchema,
    localDeliverySchema,
    nationwideShippingSchema,
  ])
  .superRefine((data, ctx) => {
    if (data.fulfillmentMethod === 'pickup') {
      if (!isValidPickupDateTime(data.pickupDate, data.pickupTime)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Selected pickup date/time is not available. Please choose a valid slot (Mon-Fri, 10AM-4PM, 2 business days notice).',
          path: ['pickupDate'],
        });
      }
    } else if (data.fulfillmentMethod === 'local_delivery') {
      if (!isValidDeliveryDateTime(data.deliveryDate, data.deliveryTime)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Selected delivery date/time is not available. Please choose a valid slot (Mon-Fri, 10AM-2PM, 2 business days notice).',
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

  // Get saved checkout data from localStorage
  const getSavedCheckoutData = useCallback(() => {
    if (typeof window !== 'undefined') {
      const savedData = localStorage.getItem('regularCheckoutData');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);

          // SECURITY FIX: Validate that saved data belongs to current user
          // If user is logged in, saved data must match their ID
          if (initialUserData?.id) {
            // If saved data has a userId and it doesn't match, clear it
            if (parsed.userId && parsed.userId !== initialUserData.id) {
              console.log('Clearing stale checkout data from different user session');
              localStorage.removeItem('regularCheckoutData');
              return null;
            }
            // If saved data doesn't have userId, it's old format - clear it for logged-in users
            if (!parsed.userId) {
              console.log('Clearing legacy checkout data without userId for logged-in user');
              localStorage.removeItem('regularCheckoutData');
              return null;
            }
          }

          return parsed;
        } catch (error) {
          console.error('Error parsing saved checkout data:', error);
          localStorage.removeItem('regularCheckoutData');
        }
      }
    }
    return null;
  }, [initialUserData?.id]);

  const savedCheckoutData = getSavedCheckoutData();

  // User state is now derived from initialUserData prop
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>(() => {
    return savedCheckoutData?.fulfillmentMethod || 'pickup';
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => {
    return savedCheckoutData?.paymentMethod || PaymentMethod.SQUARE;
  });
  const [isMounted, setIsMounted] = useState(false);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [shippingLoading, setShippingLoading] = useState<boolean>(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  // New state for delivery fee
  const [deliveryFee, setDeliveryFee] = useState<DeliveryFeeResult | null>(null);
  // Contact info saving state
  const [contactSaved, setContactSaved] = useState(false);
  // Duplicate order prevention state
  const [pendingOrderCheck, setPendingOrderCheck] = useState<{
    isChecking: boolean;
    hasPendingOrder: boolean;
    existingOrder?: {
      id: string;
      total: number;
      createdAt: Date;
      paymentUrl?: string;
      paymentUrlExpiresAt?: Date;
      retryCount: number;
    };
  }>({
    isChecking: false,
    hasPendingOrder: false,
  });
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  // DES-52: Add session state tracking
  const [sessionError, setSessionError] = useState<string | null>(null);
  // Client Supabase for session checking
  const supabase = createClient();

  // Functions to save and clear checkout data in localStorage
  const saveCheckoutDataToLocalStorage = useCallback(
    (data: any) => {
      if (typeof window !== 'undefined') {
        try {
          const existingData = getSavedCheckoutData() || {};
          const updatedData = {
            ...existingData,
            ...data,
            // SECURITY FIX: Always save userId with checkout data for validation
            userId: initialUserData?.id || null,
          };
          localStorage.setItem('regularCheckoutData', JSON.stringify(updatedData));
        } catch (error) {
          console.error('Error saving checkout data to localStorage:', error);
        }
      }
    },
    [initialUserData?.id, getSavedCheckoutData]
  );

  const clearCheckoutDataFromLocalStorage = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('regularCheckoutData');
      } catch (error) {
        console.error('Error clearing checkout data from localStorage:', error);
      }
    }
  };

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    // --- SECURITY FIX: Prioritize initialUserData (server-side) over savedCheckoutData (localStorage) ---
    // For logged-in users, always use their profile data to prevent data leakage between accounts
    defaultValues: {
      fulfillmentMethod: savedCheckoutData?.fulfillmentMethod || 'pickup',
      paymentMethod: savedCheckoutData?.paymentMethod || PaymentMethod.SQUARE,
      // CRITICAL: Use initialUserData first if user is logged in
      name: initialUserData?.name || savedCheckoutData?.name || '',
      email: initialUserData?.email || savedCheckoutData?.email || '',
      phone: initialUserData?.phone || savedCheckoutData?.phone || '',
      pickupDate: savedCheckoutData?.pickupDate || format(defaultPickupDate, 'yyyy-MM-dd'),
      pickupTime: savedCheckoutData?.pickupTime || defaultPickupTime,
      deliveryDate: savedCheckoutData?.deliveryDate || format(defaultDeliveryDate, 'yyyy-MM-dd'),
      deliveryTime: savedCheckoutData?.deliveryTime || defaultDeliveryTime,
      deliveryInstructions: savedCheckoutData?.deliveryInstructions || '',
      rateId: savedCheckoutData?.rateId || '',
      // Initialize address fields with saved data if available
      ...(savedCheckoutData?.deliveryAddress && {
        deliveryAddress: savedCheckoutData.deliveryAddress,
      }),
      ...(savedCheckoutData?.shippingAddress && {
        shippingAddress: savedCheckoutData.shippingAddress,
      }),
      // Initialize other fields based on the default fulfillment method ('pickup')
      // We don't need to initialize all possible fields here, the reset effect handles it
    } as Partial<CheckoutFormData>,
    mode: 'onChange',
  });

  const typedForm = form as UseFormReturn<CheckoutFormData>;
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, touchedFields, isValid },
    control,
    trigger,
    getValues,
  } = typedForm;

  const currentMethod = watch('fulfillmentMethod');
  const currentPaymentMethod = watch('paymentMethod');
  const currentRateId = watch('rateId');

  // Function to save contact info immediately
  const saveContactInfoImmediately = useCallback(
    async (name: string, email: string, phone: string) => {
      if (!name.trim() || !email.trim() || !phone.trim()) {
        return; // Don't save incomplete info
      }

      // Basic validation before saving
      if (name.length < 2 || !email.includes('@') || phone.length < 10) {
        return; // Don't save invalid info
      }

      try {
        const result = await saveCateringContactInfo({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
        });

        if (result.success) {
          setContactSaved(true);
          console.log('✅ Contact info saved successfully:', result.message);
        } else {
          console.error('❌ Failed to save contact info:', result.message);
        }
      } catch (error) {
        console.error('❌ Error saving contact info:', error);
      }
    },
    []
  );

  // --- Effect to Reset Form Based on Fulfillment Method ---
  // Keep this effect, but initialize based on potentially pre-filled common data
  useEffect(() => {
    reset(currentValues => {
      // SECURITY FIX: Prioritize initialUserData over savedCheckoutData for logged-in users
      const commonData = {
        name: currentValues.name || initialUserData?.name || savedCheckoutData?.name || '',
        email: currentValues.email || initialUserData?.email || savedCheckoutData?.email || '',
        phone: currentValues.phone || initialUserData?.phone || savedCheckoutData?.phone || '',
        paymentMethod:
          currentValues.paymentMethod || savedCheckoutData?.paymentMethod || PaymentMethod.SQUARE,
      };

      let recipientName = commonData.name;
      if (
        currentValues.fulfillmentMethod === 'local_delivery' &&
        currentValues.deliveryAddress?.recipientName
      ) {
        recipientName = currentValues.deliveryAddress.recipientName;
      } else if (
        currentValues.fulfillmentMethod === 'nationwide_shipping' &&
        currentValues.shippingAddress?.recipientName
      ) {
        recipientName = currentValues.shippingAddress.recipientName;
      }

      if (fulfillmentMethod === 'pickup') {
        return {
          fulfillmentMethod: 'pickup',
          ...commonData,
          pickupDate: format(defaultPickupDate, 'yyyy-MM-dd'),
          pickupTime: defaultPickupTime,
        };
      } else if (fulfillmentMethod === 'local_delivery') {
        return {
          fulfillmentMethod: 'local_delivery',
          ...commonData,
          deliveryAddress:
            currentValues.fulfillmentMethod === 'local_delivery'
              ? currentValues.deliveryAddress
              : savedCheckoutData?.deliveryAddress || {
                  recipientName: recipientName,
                  street: '',
                  street2: '',
                  city: '',
                  state: 'CA', // Default to CA for local delivery
                  postalCode: '',
                  country: 'US',
                },
          deliveryDate: format(defaultDeliveryDate, 'yyyy-MM-dd'),
          deliveryTime: defaultDeliveryTime,
          deliveryInstructions:
            currentValues.fulfillmentMethod === 'local_delivery'
              ? currentValues.deliveryInstructions
              : '',
          // Don't allow cash for delivery
          paymentMethod:
            currentValues.paymentMethod === PaymentMethod.CASH
              ? PaymentMethod.SQUARE
              : currentValues.paymentMethod || PaymentMethod.SQUARE,
        };
      } else {
        return {
          fulfillmentMethod: 'nationwide_shipping',
          ...commonData,
          shippingAddress:
            currentValues.fulfillmentMethod === 'nationwide_shipping'
              ? currentValues.shippingAddress
              : savedCheckoutData?.shippingAddress || {
                  recipientName: recipientName,
                  street: '',
                  street2: '',
                  city: '',
                  state: '',
                  postalCode: '',
                  country: 'US',
                },
          rateId:
            currentValues.fulfillmentMethod === 'nationwide_shipping' ? currentValues.rateId : '',
          // Don't allow cash for shipping
          paymentMethod:
            currentValues.paymentMethod === PaymentMethod.CASH
              ? PaymentMethod.SQUARE
              : currentValues.paymentMethod || PaymentMethod.SQUARE,
        };
      }
    });

    // Required effect only on formMethod change, with deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fulfillmentMethod,
    reset,
    initialUserData?.name,
    initialUserData?.email,
    initialUserData?.phone,
  ]);

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

  // DES-52: Check session status on mount and periodically
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ [SESSION-CHECK] Error getting session:', error);
          setSessionError('Your session has expired. Please log in to continue.');
          return;
        }

        if (!session && initialUserData) {
          // User was logged in but session is now expired
          console.warn('⚠️ [SESSION-CHECK] Session expired during checkout');
          setSessionError('Your session has expired. Please log in to continue.');
        } else {
          // Session is valid or user is guest
          setSessionError(null);
        }
      } catch (error) {
        console.error('❌ [SESSION-CHECK] Unexpected error:', error);
      }
    };

    if (isMounted) {
      checkSession();
      // Check session every 60 seconds
      const interval = setInterval(checkSession, 60000);
      return () => clearInterval(interval);
    }
  }, [isMounted, supabase, initialUserData]);

  // Watch form values and save to localStorage
  useEffect(() => {
    const subscription = form.watch(value => {
      // Only save if component is mounted and form has values
      if (isMounted && value) {
        // Debounce the save operation
        const timeoutId = setTimeout(() => {
          saveCheckoutDataToLocalStorage(value);
        }, 500); // Wait 500ms after user stops typing

        return () => clearTimeout(timeoutId);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, isMounted, saveCheckoutDataToLocalStorage]);

  // Custom handler for fulfillment method change that saves to localStorage
  const handleFulfillmentMethodChange = (method: FulfillmentMethod) => {
    setFulfillmentMethod(method);
    saveCheckoutDataToLocalStorage({ fulfillmentMethod: method });
  };

  // Custom handler for payment method change that saves to localStorage
  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
    saveCheckoutDataToLocalStorage({ paymentMethod: method });
  };

  // --- REMOVE useEffect for getUser() ---
  // This data is now passed via props (initialUserData)

  // --- Keep fetchShippingRates function ---
  const fetchShippingRates = async () => {
    const address = typedForm.getValues('shippingAddress') as z.infer<typeof shippingAddressSchema>;
    if (
      !address ||
      !address.recipientName ||
      !address.recipientName.trim() ||
      !address.street ||
      !address.city ||
      !address.state ||
      !address.postalCode ||
      !address.country
    ) {
      setShippingError(
        'Please complete all shipping address fields, including recipient name, to fetch rates.'
      );
      setShippingRates([]);
      return;
    }
    setShippingLoading(true);
    setShippingError(null);
    setShippingRates([]);
    setValue('rateId', '', { shouldValidate: true });

    try {
      console.log('Fetching shipping rates for address:', address);

      // Convert cart items to the enhanced format expected by shipping calculation
      const cartItems = items.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        variantId: item.variantId,
        price: item.price, // Include price for insurance and customs calculations
      }));

      console.log(`Using dynamic weight calculation for ${cartItems.length} cart items`);
      const enhancedAddress = {
        recipientName: address.recipientName,
        street: address.street,
        street2: address.street2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country || 'US',
        phone: undefined,
        email: undefined,
      };

      const result = await getShippingRates({
        shippingAddress: enhancedAddress,
        cartItems: cartItems,
        estimatedLengthIn: 10,
        estimatedWidthIn: 8,
        estimatedHeightIn: 4,
      });

      if (result.success && result.rates) {
        console.log('Received rates:', result.rates);
        if (result.rates.length === 0) {
          setShippingError('No shipping rates found for this address.');
          setShippingRates([]);
        } else {
          // Filter rates to ensure they have valid IDs for React keys
          const validRates = (result.rates as ShippingRate[]).filter(
            rate => rate.id && rate.id.trim() !== ''
          );
          console.log(
            'Valid rates with IDs:',
            validRates.map(r => ({ id: r.id, name: r.name }))
          );
          if (validRates.length === 0) {
            setShippingError('No valid shipping rates found.');
            setShippingRates([]);
          } else {
            setShippingRates(validRates);
          }
        }
      } else {
        console.error('Failed to fetch shipping rates:', result.error);
        setShippingError(result.error || 'Failed to fetch shipping rates.');
        setShippingRates([]);
      }
    } catch (err: any) {
      console.error('Error calling getShippingRates action:', err);
      setShippingError(err.message || 'An unexpected error occurred.');
      setShippingRates([]);
    } finally {
      setShippingLoading(false);
    } // Should be setShippingLoading(false)
  };
  // --- End fetchShippingRates ---

  // --- Effect to update form based on payment method changes ---
  useEffect(() => {
    // Limit payment methods for certain fulfillment types
    if (fulfillmentMethod === 'pickup') {
      // Pickup allows all payment methods
      setValue('paymentMethod', currentPaymentMethod);
    } else {
      // No cash option for delivery or shipping
      if (currentPaymentMethod === PaymentMethod.CASH) {
        setValue('paymentMethod', PaymentMethod.SQUARE);
        setPaymentMethod(PaymentMethod.SQUARE);
      }
    }
  }, [fulfillmentMethod, currentPaymentMethod, setValue, setPaymentMethod]);

  // --- Effect to save contact information automatically ---
  useEffect(() => {
    const subscription = watch((value, { name: fieldName }) => {
      // Only save when all contact fields are filled and not already saved
      if (!contactSaved && fieldName && ['name', 'email', 'phone'].includes(fieldName)) {
        const { name, email, phone } = value;

        // Debounce the save operation
        const timeoutId = setTimeout(() => {
          if (name && email && phone) {
            saveContactInfoImmediately(name, email, phone);
          }
        }, 1000); // Wait 1 second after user stops typing

        return () => clearTimeout(timeoutId);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, contactSaved, saveContactInfoImmediately]);

  // Function to check for duplicate orders with timeout and retry logic
  const checkForDuplicates = async (email: string, isRetry: boolean = false): Promise<boolean> => {
    console.log('🔍 [DUPLICATE-CHECK] Starting duplicate check for:', email, isRetry ? '(retry)' : '');
    setPendingOrderCheck(prev => ({ ...prev, isChecking: true }));

    // Set up 10-second timeout protection
    const timeoutId = setTimeout(() => {
      console.warn('⏱️ [DUPLICATE-CHECK] Timeout after 10 seconds');
      setPendingOrderCheck({
        isChecking: false,
        hasPendingOrder: false,
      });
      toast.error('Duplicate check timed out. Please try again.');
    }, 10000);

    try {
      const duplicateCheck = await checkForDuplicateOrders(items, email);
      clearTimeout(timeoutId); // Clear timeout on success
      console.log('📊 [DUPLICATE-CHECK] Result:', duplicateCheck);

      if (duplicateCheck.success && duplicateCheck.hasDuplicate && duplicateCheck.existingOrder) {
        console.log('⚠️ [DUPLICATE-CHECK] Found existing order:', duplicateCheck.existingOrder.id);
        setPendingOrderCheck({
          isChecking: false,
          hasPendingOrder: true,
          existingOrder: duplicateCheck.existingOrder,
        });
        setShowDuplicateAlert(true);
        return true; // Has duplicate
      }

      console.log('✅ [DUPLICATE-CHECK] No duplicates found');
      setPendingOrderCheck({
        isChecking: false,
        hasPendingOrder: false,
      });
      return false; // No duplicate
    } catch (error) {
      clearTimeout(timeoutId); // Clear timeout on error
      console.error('❌ [DUPLICATE-CHECK] Error checking for duplicates:', error);

      // If there's a session error and this isn't a retry, attempt session refresh
      if (sessionError && !isRetry) {
        console.log('🔄 [DUPLICATE-CHECK] Attempting session refresh...');
        try {
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError) {
            console.log('✅ [DUPLICATE-CHECK] Session refreshed successfully, retrying check...');
            // Clear session error state
            setSessionError(null);
            // Retry the duplicate check once with fresh session
            return checkForDuplicates(email, true);
          } else {
            console.error('❌ [DUPLICATE-CHECK] Session refresh failed:', refreshError);
          }
        } catch (refreshErr) {
          console.error('❌ [DUPLICATE-CHECK] Session refresh exception:', refreshErr);
        }
      }

      // Always clear the checking state, even on error
      setPendingOrderCheck({
        isChecking: false,
        hasPendingOrder: false,
      });

      // If there's still a session error after refresh attempt, block checkout
      if (sessionError) {
        toast.error('Please log in again to continue with checkout');
        return true; // Block checkout
      }

      // For other errors, allow checkout to proceed
      return false;
    }
  };

  // Handlers for pending order alert
  const handleContinueExisting = () => {
    const orderId = pendingOrderCheck.existingOrder?.id;
    if (orderId) {
      router.push(`/orders/${orderId}`);
    }
  };

  const handleCreateNew = async () => {
    setShowDuplicateAlert(false);
    setPendingOrderCheck({
      isChecking: false,
      hasPendingOrder: false,
    });

    // Validate form and get current values
    const isValid = await form.trigger();
    if (isValid) {
      const formData = form.getValues();
      // Call submitOrder directly with form data, bypassing duplicate check
      await submitOrderWithoutDuplicateCheck(formData);
    } else {
      // If form is invalid, the validation errors will be shown automatically
      console.log('Form validation failed');
    }
  };

  // Helper function to submit order without duplicate checking
  const submitOrderWithoutDuplicateCheck = async (formData: CheckoutFormData) => {
    setIsSubmitting(true);
    setError('');

    try {
      // First check if cart is empty
      if (!items || items.length === 0) {
        setError('Your cart is empty.');
        toast.error('Your cart is empty.');
        setIsSubmitting(false);
        return;
      }

      // Skip duplicate check since user explicitly chose to create new order

      // Validate minimum order requirements
      const orderValidation = await validateOrderMinimums(items);
      if (!orderValidation.isValid) {
        setError(orderValidation.errorMessage || 'Order does not meet minimum requirements');
        toast.error(orderValidation.errorMessage || 'Order does not meet minimum requirements');
        setIsSubmitting(false);
        return;
      }

      // Continue with the rest of the submission logic from onSubmit
      let fulfillmentData: any = null;
      let customerInfo: { name: string; email: string; phone: string };

      console.log('Form data submitted:', formData);
      if (formData.fulfillmentMethod === 'pickup') {
        if (!formData.pickupDate || !formData.pickupTime)
          throw new Error('Missing pickup date or time.');
        fulfillmentData = {
          method: 'pickup',
          pickupTime: formatISO(parseISO(`${formData.pickupDate}T${formData.pickupTime}:00`)),
        };
        customerInfo = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        };
      } else if (formData.fulfillmentMethod === 'local_delivery') {
        if (!formData.deliveryDate || !formData.deliveryTime || !formData.deliveryAddress)
          throw new Error('Missing delivery details.');
        fulfillmentData = {
          method: 'local_delivery',
          deliveryDate: formData.deliveryDate,
          deliveryTime: formData.deliveryTime,
          deliveryAddress: { ...formData.deliveryAddress, country: 'US' },
          deliveryInstructions: formData.deliveryInstructions,
        };
        customerInfo = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        };
      } else if (formData.fulfillmentMethod === 'nationwide_shipping') {
        const selectedRate = shippingRates.find(rate => rate.id === formData.rateId);
        if (!selectedRate) {
          throw new Error('Please select a shipping method');
        }

        fulfillmentData = {
          method: 'nationwide_shipping',
          shippingAddress: {
            recipientName: formData.shippingAddress?.recipientName || formData.name,
            street: formData.shippingAddress!.street,
            street2: formData.shippingAddress?.street2,
            city: formData.shippingAddress!.city,
            state: formData.shippingAddress!.state,
            postalCode: formData.shippingAddress!.postalCode,
            country: formData.shippingAddress?.country || 'US',
          },
          shippingMethod: selectedRate.serviceLevelToken,
          shippingCarrier: selectedRate.carrier || 'Unknown',
          shippingCost: Math.round(selectedRate.amount * 100), // Convert to cents
          rateId: selectedRate.id,
        };
        customerInfo = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        };
      } else {
        throw new Error('Invalid fulfillment method');
      }

      if (!fulfillmentData) {
        throw new Error('Fulfillment data is required');
      }

      // Proceed with order creation
      let result;
      if (formData.paymentMethod === PaymentMethod.CASH) {
        const manualPaymentPayload = {
          customerInfo,
          fulfillment: fulfillmentData,
          paymentMethod: formData.paymentMethod,
          items: items.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            variantId: item.variantId,
          })),
        };
        result = await createManualPaymentOrder(manualPaymentPayload);
      } else {
        const actionPayload = {
          customerInfo,
          fulfillment: fulfillmentData,
          paymentMethod: formData.paymentMethod,
          items: items.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            variantId: item.variantId,
          })),
        };
        result = await createOrderAndGenerateCheckoutUrl(actionPayload);
      }

      if (result.success) {
        if (formData.paymentMethod === PaymentMethod.CASH && result.orderId) {
          toast.success('Manual order created successfully!');
          clearCart();
          localStorage.removeItem('regularCheckoutData');
          router.push(`/orders/${result.orderId}`);
        } else if (result.checkoutUrl) {
          toast.success('Redirecting to payment...');

          console.log(
            '✅ [DUPLICATE-CHECK] About to redirect to Square Checkout:',
            result.checkoutUrl
          );

          // CRITICAL FIX: Use window.location.replace for immediate redirect
          // Don't clear cart/localStorage before redirect to prevent navigation interference
          try {
            console.log('🔄 [DUPLICATE-CHECK] Executing window.location.replace...');
            window.location.replace(result.checkoutUrl);
            console.log('✅ [DUPLICATE-CHECK] Redirect initiated successfully');
          } catch (redirectError) {
            console.error(
              '❌ [DUPLICATE-CHECK] Redirect error, falling back to href:',
              redirectError
            );
            window.location.href = result.checkoutUrl;
          }

          // Exit immediately after redirect
          return;
        }
      } else {
        throw new Error(result.error || 'Failed to create order');
      }
    } catch (error) {
      console.error('Order creation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create order';
      setError(errorMessage);
      toast.error(errorMessage);
      setIsSubmitting(false);
    }
  };

  const handleDismissAlert = () => {
    setShowDuplicateAlert(false);
  };

  // Add effect to log form validation status for debugging (DES-52)
  useEffect(() => {
    if (isMounted) {
      console.log('📋 [CHECKOUT-DEBUG] Form Validation Status:', {
        isValid,
        fulfillmentMethod: currentMethod,
        hasShippingRate: currentMethod === 'nationwide_shipping' ? !!currentRateId : 'N/A',
        rateId: currentRateId,
        errors: Object.keys(errors).length > 0 ? errors : 'No errors',
      });
    }
  }, [isValid, currentMethod, currentRateId, errors, isMounted]);

  // --- Keep onSubmit function ---
  const onSubmit = async (formData: CheckoutFormData, event?: React.BaseSyntheticEvent) => {
    // Prevent any default form submission behavior
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    console.log('🚀 [CHECKOUT] Starting form submission...');
    setIsSubmitting(true);
    setError('');

    try {
      // First check if cart is empty
      if (!items || items.length === 0) {
        setError('Your cart is empty.');
        toast.error('Your cart is empty.');
        setIsSubmitting(false);
        return;
      }

      // Check for duplicate orders before proceeding
      const hasDuplicate = await checkForDuplicates(formData.email);
      if (hasDuplicate) {
        setIsSubmitting(false);
        return; // Stop here and show duplicate alert
      }

      // Validate minimum order requirements
      const orderValidation = await validateOrderMinimums(items);
      if (!orderValidation.isValid) {
        setError(orderValidation.errorMessage || 'Order does not meet minimum requirements');
        toast.error(orderValidation.errorMessage || 'Order does not meet minimum requirements');
        setIsSubmitting(false);
        return;
      }

      let fulfillmentData: any = null;
      let customerInfo: { name: string; email: string; phone: string };

      console.log('Form data submitted:', formData);
      if (formData.fulfillmentMethod === 'pickup') {
        if (!formData.pickupDate || !formData.pickupTime)
          throw new Error('Missing pickup date or time.');
        fulfillmentData = {
          method: 'pickup',
          pickupTime: formatISO(parseISO(`${formData.pickupDate}T${formData.pickupTime}:00`)),
        };
      } else if (formData.fulfillmentMethod === 'local_delivery') {
        if (!formData.deliveryDate || !formData.deliveryTime || !formData.deliveryAddress)
          throw new Error('Missing delivery details.');
        fulfillmentData = {
          method: 'local_delivery',
          deliveryDate: formData.deliveryDate,
          deliveryTime: formData.deliveryTime,
          deliveryAddress: { ...formData.deliveryAddress, country: 'US' },
          deliveryInstructions: formData.deliveryInstructions,
          // Include delivery fee information
          deliveryFee: deliveryFee?.fee || 0,
          deliveryZone: deliveryFee?.zone || null,
        };
      } else if (formData.fulfillmentMethod === 'nationwide_shipping') {
        if (!formData.rateId) {
          setError('Please select a shipping method.');
          toast.error('Please select a shipping method.');
          setIsSubmitting(false);
          return;
        }
        const selectedRate = shippingRates.find(rate => rate.id === formData.rateId);
        if (!selectedRate) {
          setError('Selected shipping rate not found.');
          toast.error('Selected shipping rate not found.');
          setShippingRates([]);
          setIsSubmitting(false);
          return;
        }
        if (!formData.shippingAddress) throw new Error('Missing shipping address.');
        // Convert shipping cost from dollars to cents (as integer) for Square API compatibility
        const shippingCostCents = Math.round(selectedRate.amount * 100);
        fulfillmentData = {
          method: 'nationwide_shipping',
          shippingAddress: { ...formData.shippingAddress, country: 'US' },
          rateId: selectedRate.id,
          shippingMethod: selectedRate.serviceLevelToken,
          shippingCarrier: selectedRate.carrier,
          shippingCost: shippingCostCents,
        };
      } else {
        throw new Error('Invalid fulfillment method.');
      }

      if (!fulfillmentData) throw new Error('Failed to determine fulfillment details.');

      customerInfo = { name: formData.name, email: formData.email, phone: formData.phone };

      console.log('Constructed fulfillment data:', fulfillmentData);
      console.log('Constructed customer info:', customerInfo);

      // Handle different payment methods
      if (formData.paymentMethod === PaymentMethod.SQUARE) {
        // Use existing Square checkout flow
        console.log('Using Square checkout');
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
          fulfillment: fulfillmentData,
          paymentMethod: formData.paymentMethod,
        };
        console.log('Server Action Payload:', JSON.stringify(actionPayload, null, 2));

        const result = await createOrderAndGenerateCheckoutUrl(actionPayload as any);
        console.log('Server action result:', result);

        if (!result.success || !result.checkoutUrl) {
          const errorMessage = result.error || 'Failed to create checkout session.';
          setError(errorMessage);
          toast.error(errorMessage);
          setIsSubmitting(false);
          return;
        }

        console.log('✅ [CHECKOUT] About to redirect to Square Checkout:', result.checkoutUrl);

        // CRITICAL FIX: Use window.location.replace for immediate redirect
        // This prevents the "Load failed" error by avoiding intermediate navigation
        try {
          console.log('🔄 [CHECKOUT] Executing window.location.replace...');
          window.location.replace(result.checkoutUrl);
          console.log('✅ [CHECKOUT] Redirect initiated successfully');
        } catch (redirectError) {
          console.error('❌ [CHECKOUT] Redirect error, falling back to href:', redirectError);
          window.location.href = result.checkoutUrl;
        }

        // Exit immediately after redirect
        return;
      } else {
        // Handle manual payment methods (Cash only)
        console.log(`Using manual checkout: ${formData.paymentMethod}`);

        // First, create order in database
        const actionPayload = {
          items: items.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            variantId: item.variantId,
          })),
          customerInfo: customerInfo,
          fulfillment: fulfillmentData,
        };

        const result = await createOrderAndGenerateCheckoutUrl(actionPayload as any);

        if (!result.success || !result.orderId) {
          const errorMessage = result.error || 'Failed to create order.';
          setError(errorMessage);
          toast.error(errorMessage);
          setIsSubmitting(false);
          return;
        }

        // Then update it with manual payment method using server action
        const updateResult = await updateOrderWithManualPayment(
          result.orderId,
          formData.paymentMethod
        );

        if (!updateResult.success) {
          const errorMessage = updateResult.error || 'Failed to process manual checkout.';
          setError(errorMessage);
          toast.error(errorMessage);
          setIsSubmitting(false);
          return;
        }

        // Clear cart and data before redirecting
        clearCart();
        clearCheckoutDataFromLocalStorage();

        // Use setTimeout to ensure the redirect happens after any state updates
        setTimeout(() => {
          window.location.href = `/checkout/success/manual?orderId=${result.orderId}&paymentMethod=${formData.paymentMethod}`;
        }, 100);
      }
    } catch (err: any) {
      console.error('Error during checkout process:', err);
      const message = err.message || 'An unexpected error occurred.';
      setError(message);
      toast.error(message);
      setIsSubmitting(false);
    }
  };
  // --- End onSubmit ---

  // --- Keep getErrorMessage helper ---
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
  // --- End getErrorMessage ---

  // Add a new function to calculate delivery fees
  const calculateLocalDeliveryFee = useCallback(async () => {
    if (currentMethod !== 'local_delivery') {
      setDeliveryFee(null);
      return;
    }

    const formValues = form.getValues();
    if (formValues.fulfillmentMethod === 'local_delivery' && formValues.deliveryAddress) {
      try {
        const address = formValues.deliveryAddress;
        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const feeResult = await calculateDeliveryFeeAction(address, subtotal);
        setDeliveryFee(feeResult);
      } catch (error) {
        console.error('Error calculating delivery fee:', error);
        setDeliveryFee(null);
      }
    }
  }, [currentMethod, form, items, setDeliveryFee]);

  // Add effect to update the delivery fee when address or cart changes
  useEffect(() => {
    if (isMounted && currentMethod === 'local_delivery') {
      calculateLocalDeliveryFee();
    }
  }, [currentMethod, isMounted, calculateLocalDeliveryFee]);

  // Update address selection handler to recalculate delivery fee
  const handleAddressChange = useCallback(() => {
    if (currentMethod === 'local_delivery') {
      calculateLocalDeliveryFee();
    }
  }, [currentMethod, calculateLocalDeliveryFee]);

  // Add new effect to trigger delivery fee calculation
  useEffect(() => {
    if (isMounted) {
      calculateLocalDeliveryFee();
    }
  }, [isMounted, calculateLocalDeliveryFee]);

  // --- Return Form JSX ---
  if (!isMounted) {
    return null;
  }

  return (
    <>
      {/* DES-52: Session Expiration Alert */}
      {sessionError && (
        <Alert variant="destructive" className="mb-6 bg-red-50/90 backdrop-blur-sm border-red-400 shadow-lg">
          <AlertDescription className="text-red-800 font-medium">
            <div className="flex flex-col gap-3">
              <div>
                <strong className="text-lg">⚠️ Session Expired</strong>
                <p className="mt-1">{sessionError}</p>
              </div>
              <Link
                href={`/sign-in?redirect=/checkout`}
                className="inline-flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
              >
                <LogInIcon className="w-4 h-4 mr-2" />
                Log In to Continue
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Pending Order Alert */}
      {showDuplicateAlert && pendingOrderCheck.existingOrder && (
        <div className="mb-6 relative z-10">
          <PendingOrderAlert
            existingOrder={pendingOrderCheck.existingOrder}
            onContinueExisting={handleContinueExisting}
            onCreateNew={handleCreateNew}
            onDismiss={handleDismissAlert}
            currentUserEmail={watch('email') || initialUserData?.email}
          />
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-2 space-y-6">
        {/* Fulfillment Method Selector */}
        <FulfillmentSelector
          selectedMethod={currentMethod as AppFulfillmentMethod}
          onSelectMethod={method => handleFulfillmentMethodChange(method as FulfillmentMethod)}
        />

        {/* Customer Information */}
        <div className="space-y-4 border-t border-destino-yellow/30 pt-6 bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-destino-charcoal">Contact Information</h2>
            {contactSaved && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Contact saved
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" {...register('name')} placeholder="John Doe" />
            {getErrorMessage('name') && (
              <p className="text-sm text-red-600 mt-1">{getErrorMessage('name')}</p>
            )}
          </div>
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" {...register('email')} placeholder="you@example.com" />
            {getErrorMessage('email') && (
              <p className="text-sm text-red-600 mt-1">{getErrorMessage('email')}</p>
            )}
          </div>
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              {...register('phone')}
              placeholder="+1 (555) 123-4567 or 555-123-4567"
            />
            {getErrorMessage('phone') && (
              <p className="text-sm text-red-600 mt-1">{getErrorMessage('phone')}</p>
            )}
          </div>
        </div>

        {/* Conditional Fields based on Fulfillment Method */}
        {currentMethod === 'pickup' && (
          <div className="space-y-4 border-t border-destino-yellow/30 pt-6 bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-destino-charcoal">Pickup Details</h2>
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
                        {field.value ? (
                          format(parseISO(field.value), 'PPP')
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value ? parseISO(field.value) : undefined}
                        onSelect={date => {
                          field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                          trigger(['pickupDate', 'pickupTime']);
                        }}
                        initialFocus
                        fromDate={getEarliestPickupDate()}
                        disabled={date => !isBusinessDay(date)}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {getErrorMessage('pickupDate') && (
                <p className="text-sm text-red-600 mt-1">{getErrorMessage('pickupDate')}</p>
              )}
            </div>
            <div>
              <Label htmlFor="pickupTime">Pickup Time</Label>
              <Controller
                name="pickupTime"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={value => {
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
              {getErrorMessage('pickupTime') && (
                <p className="text-sm text-red-600 mt-1">{getErrorMessage('pickupTime')}</p>
              )}
            </div>
          </div>
        )}

        {currentMethod === 'local_delivery' && (
          <>
            <div className="space-y-4 border-t border-destino-yellow/30 pt-6 bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-medium text-destino-charcoal">Delivery Address</h3>

              <AddressForm
                form={typedForm}
                prefix="deliveryAddress"
                title="Delivery Address"
                onAddressChange={handleAddressChange}
                fulfillmentMethod={currentMethod}
              />

              {/* Add delivery fee information message */}
              {deliveryFee && (
                <div className="text-sm mt-2 p-2 bg-gradient-to-r from-destino-yellow/20 to-yellow-100/30 border border-destino-yellow/40 rounded-lg backdrop-blur-sm">
                  {getDeliveryFeeMessage(deliveryFee)}
                </div>
              )}

              {!deliveryFee && isMounted && (
                <div className="text-sm mt-2 p-2 bg-gradient-to-r from-amber-50 to-destino-cream/30 border border-amber-300/50 rounded-lg backdrop-blur-sm">
                  Please enter a valid delivery address to see delivery fees.
                </div>
              )}

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
                            'w-full justify-start text-left font-normal border-destino-yellow/40 hover:bg-destino-cream/30 hover:border-destino-yellow/60 hover:text-destino-charcoal transition-all',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(parseISO(field.value), 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value ? parseISO(field.value) : undefined}
                          onSelect={date => {
                            field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                            trigger(['deliveryDate', 'deliveryTime']);
                          }}
                          initialFocus
                          fromDate={getEarliestDeliveryDate()}
                          disabled={date => !isBusinessDay(date)}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {getErrorMessage('deliveryDate') && (
                  <p className="text-sm text-red-600 mt-1">{getErrorMessage('deliveryDate')}</p>
                )}
              </div>

              <div>
                <Label htmlFor="deliveryTime">Delivery Time</Label>
                <Controller
                  name="deliveryTime"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={value => {
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
                {getErrorMessage('deliveryTime') && (
                  <p className="text-sm text-red-600 mt-1">{getErrorMessage('deliveryTime')}</p>
                )}
              </div>

              <div>
                <Label htmlFor="deliveryInstructions">Delivery Instructions (Optional)</Label>
                <textarea
                  id="deliveryInstructions"
                  className="w-full rounded-md border border-destino-yellow/40 focus:border-destino-orange focus:ring-2 focus:ring-destino-orange/20 p-2 mt-1 transition-all bg-white/80 backdrop-blur-sm"
                  placeholder="Gate code, delivery preferences, etc."
                  {...register('deliveryInstructions')}
                />
              </div>
            </div>
          </>
        )}

        {currentMethod === 'nationwide_shipping' && (
          <div className="space-y-4 border-t border-destino-yellow/30 pt-6 bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-destino-charcoal">Shipping Details</h2>
            <AddressForm
              form={typedForm}
              prefix="shippingAddress"
              title="Shipping Address"
              fulfillmentMethod={currentMethod}
            />
            {/* Shipping Rate Fetch Button */}
            <Button
              type="button"
              onClick={() => void fetchShippingRates()}
              disabled={shippingLoading}
              variant="outline"
              className="w-full border-destino-yellow hover:bg-destino-cream/50 hover:border-destino-orange hover:text-destino-charcoal transition-all"
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
                            {rate.name} - ${rate.amount.toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {getErrorMessage('rateId') && (
                  <p className="text-sm text-red-600 mt-1">{getErrorMessage('rateId')}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Payment Method Selector */}
        <div className="border-t border-destino-yellow/30 pt-6 bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg">
          <PaymentMethodSelector
            selectedMethod={currentPaymentMethod}
            onSelectMethod={method => {
              handlePaymentMethodChange(method as PaymentMethod);
              setValue('paymentMethod', method as PaymentMethod);
            }}
            showCash={currentMethod === 'pickup'}
          />
          {getErrorMessage('paymentMethod') && (
            <p className="text-sm text-red-600 mt-1">{getErrorMessage('paymentMethod')}</p>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="bg-red-50/80 backdrop-blur-sm border-red-300/50">
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {/* Form Validation Helper (DES-52 Fix) */}
        {!isValid && isMounted && !isSubmitting && !pendingOrderCheck.isChecking && items.length > 0 && (
          <Alert className="bg-amber-50/80 backdrop-blur-sm border-amber-300/50">
            <AlertDescription className="text-amber-800">
              {currentMethod === 'nationwide_shipping' && !currentRateId ? (
                <>
                  <strong>Missing shipping information:</strong> Please complete the shipping address,
                  click &quot;Fetch Shipping Rates&quot;, and select a shipping method before continuing.
                </>
              ) : (
                <>
                  <strong>Please complete all required fields.</strong> Check the form above for any
                  validation errors highlighted in red.
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full py-4 text-base font-semibold rounded-xl bg-gradient-to-r from-destino-yellow to-yellow-400 hover:from-yellow-400 hover:to-destino-yellow text-destino-charcoal shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={isSubmitting || pendingOrderCheck.isChecking || !isMounted || items.length === 0 || !isValid || !!sessionError}
        >
          {sessionError
            ? 'Session Expired - Please Log In'
            : pendingOrderCheck.isChecking
            ? 'Checking for existing orders...'
            : isSubmitting
              ? 'Processing...'
              : currentPaymentMethod === PaymentMethod.SQUARE
                ? 'Continue to Payment'
                : 'Place Order'}
        </Button>
      </form>

      <div className="lg:col-span-1">
        {isMounted ? (
          <CheckoutSummary
            items={items}
            includeServiceFee={currentPaymentMethod === PaymentMethod.SQUARE}
            deliveryFee={currentMethod === 'local_delivery' ? deliveryFee : undefined}
            shippingRate={
              currentMethod === 'nationwide_shipping' && watch('rateId')
                ? shippingRates.find(rate => rate.id === watch('rateId'))
                : undefined
            }
            fulfillmentMethod={currentMethod}
          />
        ) : (
          <p>Loading cart summary...</p>
        )}
      </div>
    </>
  );
}
