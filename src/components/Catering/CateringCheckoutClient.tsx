'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart';
import { CateringOrderForm } from '@/components/Catering/CateringOrderForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, Trash2, ArrowLeft, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { addDays, format } from 'date-fns';
import { FulfillmentSelector } from '@/components/Store/FulfillmentSelector';
import type { FulfillmentMethod } from '@/components/Store/FulfillmentSelector';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentMethodSelector } from '@/components/Store/PaymentMethodSelector';
import { toast } from 'sonner';
import { createCateringOrderAndProcessPayment } from '@/actions/catering';
import { validateCateringOrderWithDeliveryZone } from '@/actions/catering';
import { getActiveDeliveryZones } from '@/types/catering';

// Define the PaymentMethod enum to match the Prisma schema
enum PaymentMethod {
  SQUARE = "SQUARE",
  CASH = "CASH"
}

interface CateringCheckoutClientProps {
  userData: { id?: string; name?: string; email?: string; phone?: string } | null;
  isLoggedIn: boolean;
}

type CheckoutStep = 'customer-info' | 'fulfillment' | 'payment' | 'review';

export function CateringCheckoutClient({ userData, isLoggedIn }: CateringCheckoutClientProps) {
  const router = useRouter();
  const { items, removeItem, clearCart } = useCartStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [peopleCount, setPeopleCount] = useState(10);
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('customer-info');
  
  // Customer info state
  const [customerInfo, setCustomerInfo] = useState({
    name: userData?.name || '',
    email: userData?.email || '',
    phone: userData?.phone || '',
    specialRequests: '',
    eventDate: addDays(new Date(), 3),
    peopleCount: 10,
  });
  
  // Fulfillment info state
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>('pickup');
  const [pickupDate, setPickupDate] = useState<Date>(addDays(new Date(), 3));
  const [pickupTime, setPickupTime] = useState<string>('10:00 AM');
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '',
    street2: '',
    city: '',
    state: '',
    postalCode: '',
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
  
  // Filter catering items from cart
  const cateringItems = items.filter(item => {
    try {
      const metadata = JSON.parse(item.variantId || '{}');
      return metadata.type === 'item' || metadata.type === 'package' || metadata.type === 'boxed-lunch';
    } catch {
      return false;
    }
  });

  // Redirect if cart is empty
  useEffect(() => {
    if (cateringItems.length === 0) {
      router.push('/catering');
    }
  }, [cateringItems.length, router]);

  // Validate delivery zone minimum when address changes
  useEffect(() => {
    const validateDeliveryZone = async () => {
      if (fulfillmentMethod !== 'local_delivery' || !deliveryAddress.city || !deliveryAddress.postalCode) {
        setDeliveryValidation(null);
        return;
      }

      setIsValidating(true);
      
      try {
        const validation = await validateCateringOrderWithDeliveryZone(
          cateringItems.map(item => ({
            id: item.id,
            quantity: item.quantity,
            price: item.price
          })),
          {
            city: deliveryAddress.city,
            postalCode: deliveryAddress.postalCode
          }
        );
        
        setDeliveryValidation(validation);
      } catch (error) {
        console.error('Error validating delivery zone:', error);
        setDeliveryValidation({
          isValid: false,
          errorMessage: 'Error validating delivery zone. Please try again.'
        });
      } finally {
        setIsValidating(false);
      }
    };

    // Debounce validation
    const timeoutId = setTimeout(validateDeliveryZone, 500);
    return () => clearTimeout(timeoutId);
  }, [fulfillmentMethod, deliveryAddress.city, deliveryAddress.postalCode, cateringItems]);

  // Calculate total with delivery fee
  const calculateTotal = () => {
    const subtotal = cateringItems.reduce((sum, item) => {
      const metadata = JSON.parse(item.variantId || '{}');
      if (metadata.type === 'package') {
        return sum + (item.price * customerInfo.peopleCount * item.quantity);
      }
      return sum + (item.price * item.quantity);
    }, 0);
    
    const deliveryFee = deliveryValidation?.deliveryFee || 0;
    return subtotal + (fulfillmentMethod === 'local_delivery' ? deliveryFee : 0);
  };

  // Handle customer info form submission
  const handleCustomerInfoSubmit = (values: any) => {
    setCustomerInfo({
      name: values.name,
      email: values.email,
      phone: values.phone,
      specialRequests: values.specialRequests || '',
      eventDate: values.eventDate,
      peopleCount: values.peopleCount,
    });
    setPeopleCount(values.peopleCount);
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

  // Handle final order submission
  const handleCompleteOrder = async () => {
    setIsSubmitting(true);
    
    try {
      // Store the original form data in localStorage for reference
      const orderData = {
        customerInfo: {
          name: customerInfo.name,
          email: customerInfo.email,
          phone: customerInfo.phone
        },
        eventDetails: {
          eventDate: format(customerInfo.eventDate, 'yyyy-MM-dd'),
          peopleCount: customerInfo.peopleCount,
          specialRequests: customerInfo.specialRequests
        },
        fulfillment: {
          method: fulfillmentMethod as 'pickup' | 'local_delivery',
          ...(fulfillmentMethod === 'pickup' ? {
            pickupDate: format(pickupDate, 'yyyy-MM-dd'),
            pickupTime
          } : {
            deliveryAddress,
            deliveryDate: format(pickupDate, 'yyyy-MM-dd'),
            deliveryTime: pickupTime
          })
        },
        payment: {
          method: paymentMethod
        },
        items: cateringItems.map(item => {
          const metadata = JSON.parse(item.variantId || '{}');
          return {
            ...item,
            metadata,
            finalPrice: metadata.type === 'package' 
              ? item.price * customerInfo.peopleCount * item.quantity
              : item.price * item.quantity
          };
        }),
        totalAmount: calculateTotal()
      };
      
      localStorage.setItem('cateringOrderData', JSON.stringify(orderData));
      
      // Create the order in the database using the server action
      const formattedItems = cateringItems.map(item => {
        const metadata = JSON.parse(item.variantId || '{}');
        const isPackage = metadata.type === 'package';
        const pricePerUnit = item.price;
        const totalPrice = isPackage 
          ? item.price * customerInfo.peopleCount * item.quantity
          : item.price * item.quantity;

        return {
          itemType: metadata.type || 'item',
          itemId: item.id,
          name: item.name,
          quantity: item.quantity,
          pricePerUnit,
          totalPrice,
          notes: null
        };
      });

      // If we have a user ID, include it, otherwise it's a guest checkout
      const customerId = userData?.id || null;
      
      // Format event date as string in full ISO format
      const formattedEventDate = customerInfo.eventDate.toISOString();
      
      const result = await createCateringOrderAndProcessPayment({
        customerInfo: {
          name: customerInfo.name,
          email: customerInfo.email,
          phone: customerInfo.phone,
          customerId: userData?.id
        },
        eventDetails: {
          eventDate: formattedEventDate as unknown as Date,
          numberOfPeople: customerInfo.peopleCount,
          specialRequests: customerInfo.specialRequests || null
        },
        fulfillment: {
          method: fulfillmentMethod as 'pickup' | 'local_delivery',
          ...(fulfillmentMethod === 'pickup' ? {
            pickupDate: format(pickupDate, 'yyyy-MM-dd'),
            pickupTime
          } : {
            deliveryAddress,
            deliveryDate: format(pickupDate, 'yyyy-MM-dd'),
            deliveryTime: pickupTime
          })
        },
        items: formattedItems,
        totalAmount: calculateTotal(),
        paymentMethod: paymentMethod
      });

      if (result.success) {
        // Clear the cart
        clearCart();
        
        // If there's a checkout URL (Square payment), redirect to it
        if (result.data.checkoutUrl) {
          window.location.href = result.data.checkoutUrl;
        } else {
          // Otherwise go to the confirmation page
          router.push(`/catering/confirmation?orderId=${result.data.orderId}`);
        }
      } else {
        // Handle error
        toast.error(`Error creating order: ${result.error}`);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      toast.error('Failed to process your order. Please try again.');
      setIsSubmitting(false);
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
              peopleCount: peopleCount,
              eventDate: addDays(new Date(), 3)
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
              onSelectMethod={setFulfillmentMethod}
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
                      <h4 className="font-semibold text-blue-800 mb-2">Delivery Zones & Minimums</h4>
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
                          onChange={(e) => setDeliveryAddress({...deliveryAddress, street: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="street2">Apartment, suite, etc. (optional)</Label>
                        <Input
                          id="street2"
                          placeholder="Apt #42"
                          value={deliveryAddress.street2}
                          onChange={(e) => setDeliveryAddress({...deliveryAddress, street2: e.target.value})}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            placeholder="San Francisco"
                            value={deliveryAddress.city}
                            onChange={(e) => setDeliveryAddress({...deliveryAddress, city: e.target.value})}
                            required
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="state">State</Label>
                          <Input
                            id="state"
                            placeholder="CA"
                            value={deliveryAddress.state}
                            onChange={(e) => setDeliveryAddress({...deliveryAddress, state: e.target.value})}
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="postalCode">Postal Code</Label>
                        <Input
                          id="postalCode"
                          placeholder="94110"
                          value={deliveryAddress.postalCode}
                          onChange={(e) => setDeliveryAddress({...deliveryAddress, postalCode: e.target.value})}
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
                        <div className={`p-3 rounded-lg border ${
                          deliveryValidation.isValid 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex items-start gap-2">
                            <AlertCircle className={`w-4 h-4 mt-0.5 ${
                              deliveryValidation.isValid ? 'text-green-600' : 'text-red-600'
                            }`} />
                            <div className="flex-1">
                              {deliveryValidation.isValid ? (
                                <div>
                                  <p className="text-green-800 text-sm font-medium">
                                    ✓ Valid delivery zone
                                  </p>
                                  {deliveryValidation.deliveryZone && (
                                    <p className="text-green-700 text-sm mt-1">
                                      Delivering to: {deliveryValidation.deliveryZone.replace('_', ' ')}
                                      {deliveryValidation.deliveryFee && deliveryValidation.deliveryFee > 0 && (
                                        <span className="ml-2">
                                          (+${deliveryValidation.deliveryFee.toFixed(2)} delivery fee)
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
                                  {deliveryValidation.minimumRequired && deliveryValidation.currentAmount && (
                                    <p className="text-red-700 text-sm mt-1">
                                      Current order: ${deliveryValidation.currentAmount.toFixed(2)} | 
                                      Required: ${deliveryValidation.minimumRequired.toFixed(2)}
                                    </p>
                                  )}
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
                                  "w-full pl-3 text-left font-normal",
                                  !pickupDate && "text-muted-foreground"
                                )}
                              >
                                {pickupDate ? (
                                  format(pickupDate, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={pickupDate}
                                onSelect={(date) => date && setPickupDate(date)}
                                initialFocus
                                disabled={(date) => {
                                  const today = new Date();
                                  const minDate = addDays(today, 2);
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
                        <Select
                          value={pickupTime}
                          onValueChange={setPickupTime}
                        >
                          <SelectTrigger id="deliveryTime">
                            <SelectValue placeholder="Select a time" />
                          </SelectTrigger>
                          <SelectContent>
                            {['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM'].map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-red-500">
                      We currently do not support nationwide shipping for catering orders. 
                      Please select pickup or local delivery.
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
                  (!deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.state || !deliveryAddress.postalCode)) ||
                fulfillmentMethod === 'nationwide_shipping' ||
                (fulfillmentMethod === 'local_delivery' && deliveryValidation && !deliveryValidation.isValid) ||
                (fulfillmentMethod === 'local_delivery' && isValidating)
              }
            >
              {fulfillmentMethod === 'local_delivery' && isValidating 
                ? "Validating..." 
                : "Continue to Payment"
              }
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
                      <p>People: {customerInfo.peopleCount}</p>
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
                          <p>Address: {deliveryAddress.street} {deliveryAddress.street2} {deliveryAddress.city}, {deliveryAddress.state} {deliveryAddress.postalCode}</p>
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
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processing..." : "Complete Order"}
            </Button>
          </div>
        )}
      </div>
      
      {/* Right column - Order Summary */}
      <div>
        <Card className="bg-white sticky top-4">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            
            <div className="space-y-4 mb-6">
              {cateringItems.map((item) => {
                const metadata = JSON.parse(item.variantId || '{}');
                const isPackage = metadata.type === 'package';
                
                return (
                  <div key={`${item.id}-${item.variantId}`} className="flex gap-3">
                    <div className="relative h-16 w-16 flex-shrink-0 rounded-md overflow-hidden">
                      {item.image ? (
                        <Image 
                          src={item.image} 
                          alt={item.name}
                          width={64}
                          height={64} 
                          className="object-cover" 
                        />
                      ) : (
                        <div className="bg-gray-200 w-full h-full flex items-center justify-center">
                          <span className="text-xs text-gray-500">No image</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h3 className="font-medium line-clamp-2">{item.name}</h3>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 ml-2"
                          onClick={() => removeItem(item.id, item.variantId)}
                        >
                          <Trash2 className="h-4 w-4 text-gray-500" />
                        </Button>
                      </div>
                      
                      <div className="text-sm text-gray-500">
                        Qty: {item.quantity}
                      </div>
                      
                      <div className="flex justify-between items-center mt-1">
                        <div className="text-sm">
                          {isPackage ? (
                            <span>${item.price.toFixed(2)} per person</span>
                          ) : (
                            <span>${item.price.toFixed(2)} each</span>
                          )}
                        </div>
                        
                        <div className="font-medium">
                          {isPackage ? (
                            <span>${(item.price * customerInfo.peopleCount * item.quantity).toFixed(2)}</span>
                          ) : (
                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>${cateringItems.reduce((sum, item) => {
                  const metadata = JSON.parse(item.variantId || '{}');
                  if (metadata.type === 'package') {
                    return sum + (item.price * customerInfo.peopleCount * item.quantity);
                  }
                  return sum + (item.price * item.quantity);
                }, 0).toFixed(2)}</span>
              </div>
              
              {fulfillmentMethod === 'local_delivery' && deliveryValidation?.deliveryFee && deliveryValidation.deliveryFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Delivery Fee</span>
                  <span>${deliveryValidation.deliveryFee.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-base font-medium border-t border-gray-200 pt-2">
                <span>Total</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 