'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { useCartStore } from '@/store/cart';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckoutSummary } from '@/components/store/CheckoutSummary';

interface SquareCard {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<{ status: string; token?: string; errors?: { message: string }[] }>;
  destroy: () => void;
}

interface OrderResponse {
  orderId: string;
  error?: string;
}

interface PaymentResponse {
  error?: string;
}

// Form validation schema
const checkoutSchema = z.object({
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

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCartStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [card, setCard] = useState<SquareCard | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      pickupDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      pickupTime: '12:00',
    },
  });

  // Calculate min date for pickup (today)
  const minDate = format(new Date(), 'yyyy-MM-dd');

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      void router.push('/cart');
    }
  }, [items, router]);

  // Initialize Square Web Payments SDK
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadSquare = async () => {
      // Load Square Web Payments SDK
      const script = document.createElement('script');
      script.src = 'https://sandbox.web.squarecdn.com/v1/square.js';
      script.async = true;

      script.onload = async () => {
        if (!window.Square) return;

        try {
          const squareInstance = window.Square;
          const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID;
          const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;

          if (!appId || !locationId) {
            throw new Error('Square configuration is missing');
          }

          const payments = squareInstance.payments(appId, locationId);
          const cardInstance = await payments.card();
          await cardInstance.attach('#card-container');
          setCard(cardInstance);
        } catch (error) {
          console.error('Error initializing Square:', error);
          setPaymentError('Failed to initialize payment form');
        }
      };

      document.body.appendChild(script);
    };

    void loadSquare();

    return () => {
      if (card) {
        card.destroy();
      }
    };
  }, [card]);

  const onSubmit = async (formData: CheckoutFormData) => {
    setIsSubmitting(true);
    setPaymentError(null);

    try {
      // 1. Validate that we have a card instance
      if (!card) {
        throw new Error('Payment form not initialized');
      }

      // 2. Create order on our backend
      const orderResponse = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            id: item.id,
            variantId: item.variantId,
            quantity: item.quantity,
          })),
          customerInfo: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            pickupTime: `${formData.pickupDate}T${formData.pickupTime}:00`,
          },
        }),
      });

      const orderData = (await orderResponse.json()) as OrderResponse;

      if (!orderResponse.ok || orderData.error) {
        throw new Error(orderData.error || 'Failed to create order');
      }

      // 3. Process payment with Square
      const tokenResult = await card.tokenize();

      if (tokenResult.status === 'OK' && tokenResult.token) {
        // 4. Complete payment on our backend
        const paymentResponse = await fetch('/api/checkout/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceId: tokenResult.token,
            orderId: orderData.orderId,
            amount: Math.round(totalPrice * 1.0825 * 100), // Total with tax in cents
          }),
        });

        const paymentData = (await paymentResponse.json()) as PaymentResponse;

        if (!paymentResponse.ok || paymentData.error) {
          throw new Error(paymentData.error || 'Payment processing failed');
        }

        // 5. Success! Clear cart and redirect to confirmation page
        clearCart();
        void router.push(`/order-confirmation/${orderData.orderId}`);
      } else {
        throw new Error(tokenResult.errors?.[0]?.message || 'Card tokenization failed');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setPaymentError(error instanceof Error ? error.message : 'An unexpected error occurred');
      toast.error('Payment processing failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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

                <div>
                  <Label htmlFor="pickupDate">Pickup Date</Label>
                  <Input
                    id="pickupDate"
                    type="date"
                    min={minDate}
                    {...register('pickupDate')}
                    className={errors.pickupDate ? 'border-red-500' : ''}
                  />
                  {errors.pickupDate && (
                    <p className="mt-1 text-sm text-red-500">{errors.pickupDate.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="pickupTime">Pickup Time</Label>
                  <Input
                    id="pickupTime"
                    type="time"
                    {...register('pickupTime')}
                    className={errors.pickupTime ? 'border-red-500' : ''}
                  />
                  {errors.pickupTime && (
                    <p className="mt-1 text-sm text-red-500">{errors.pickupTime.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold">Payment Information</h2>
              <div id="card-container"></div>
              {paymentError && <p className="mt-2 text-sm text-red-500">{paymentError}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : 'Place Order'}
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
