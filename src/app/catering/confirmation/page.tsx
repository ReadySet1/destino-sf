'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  User, 
  ShoppingBag, 
  CalendarDays, 
  FileText, 
  Eye,
  ArrowRight,
  Phone,
  Mail,
  Clock
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  finalPrice?: number;
  image?: string; // Add image field
  pricePerUnit?: number; // Added for price per unit display
  totalPrice?: number; // Added for total price display
  metadata?: {
    type: 'item' | 'package';
    minPeople?: number;
  };
}

interface OrderData {
  customerInfo: {
    name: string;
    email: string;
    phone: string;
  };
  eventDetails: {
    eventDate: string;
    specialRequests?: string;
  };
  items: OrderItem[];
  totalAmount: number;
}

function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userData, setUserData] = useState<{ name?: string; email?: string; phone?: string } | null>(null);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  
  // Check if this is a Square redirect
  const isSquareRedirect = searchParams.has('status') && searchParams.has('orderId');
  const squareStatus = searchParams.get('status');
  const squareOrderId = searchParams.get('orderId');
  const orderId = searchParams.get('orderId'); // Get order ID for details link

  useEffect(() => {
    async function loadUserData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Get user profile data from the profiles table
          const { data: profileData, error } = await supabase
            .from('Profile')
            .select('full_name, email, phone')
            .eq('id', session.user.id)
            .single();

          if (!error && profileData) {
            setUserData({
              name: profileData.full_name,
              email: profileData.email || session.user.email,
              phone: profileData.phone
            });
          } else {
            // Fallback to auth data if profile not found
            setUserData({
              email: session.user.email
            });
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    }

    function loadOrderData() {
      try {
        // Try to load order data from localStorage
        const savedOrderData = localStorage.getItem('cateringOrderData');
        if (savedOrderData) {
          setOrderData(JSON.parse(savedOrderData));
        } else if (!isSquareRedirect) {
          // No order data and not a Square redirect - redirect to catering
          router.push('/catering');
        }
      } catch (error) {
        console.error('Error loading order data:', error);
        if (!isSquareRedirect) {
          router.push('/catering');
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadUserData();
    
    // Only run in browser environment
    if (typeof window !== 'undefined') {
      loadOrderData();
    }
  }, [isSquareRedirect, router, supabase]);

  // Show loading state while we're waiting
  if (isLoading) {
    return (
      <div className="container py-12 text-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Thank You for Your Order!</h1>
          <p className="text-gray-600">Your catering order has been received and is being processed.</p>
        </div>

        {/* Payment Success Alert */}
        {isSquareRedirect && squareStatus === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-green-800">Your payment has been processed successfully!</span>
            </div>
            {squareOrderId && (
              <p className="text-sm text-green-700 mt-1">
                Order ID: <code className="bg-green-200 px-2 py-1 rounded text-xs">{squareOrderId}</code>
              </p>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Order Summary */}
          <div className="md:col-span-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orderData && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <CalendarDays className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="text-sm text-gray-600 font-medium">Event Date</p>
                        <p className="text-gray-900">{formatDate(new Date(orderData.eventDetails.eventDate))}</p>
                      </div>
                    </div>
                    
                    {orderData.eventDetails.specialRequests && (
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <FileText className="h-5 w-5 text-gray-600 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-600 font-medium">Special Requests</p>
                          <p className="text-gray-900 text-sm">{orderData.eventDetails.specialRequests}</p>
                        </div>
                      </div>
                    )}

                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Items Ordered</h4>
                      <div className="space-y-3">
                        {orderData.items.map((item, index) => {
                          // Debug: log the item to see what fields are available
                          console.log('Order item:', item);
                          
                          // Try different field names for price per unit and total
                          const pricePerUnit = item.pricePerUnit || item.price || 0;
                          const totalPrice = item.totalPrice || item.finalPrice || (pricePerUnit * item.quantity);
                          
                          return (
                            <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900">{item.name}</h5>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {item.metadata?.type === 'package' ? 'Package' : 'Item'}
                                  </Badge>
                                  <span className="text-sm text-gray-500">Qty: {item.quantity}</span>
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                <div className="text-sm text-gray-500">
                                  {formatCurrency(pricePerUnit)} each
                                </div>
                                <div className="font-semibold text-gray-900">
                                  {formatCurrency(totalPrice)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="border-t border-gray-200 mt-4 pt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-gray-900">Total:</span>
                          <span className="text-lg font-bold text-gray-900">{formatCurrency(orderData.totalAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Customer Info & Next Steps */}
          <div className="space-y-6">
            {/* Customer Information */}
            {userData && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {userData.name && (
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900">{userData.name}</span>
                      </div>
                    )}
                    {userData.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900">{userData.email}</span>
                      </div>
                    )}
                    {userData.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900">{userData.phone}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

                         {/* What&apos;s Next */}
            <Card className="shadow-sm">
              <CardHeader>
                                 <CardTitle className="flex items-center gap-2 text-lg">
                   <Clock className="h-5 w-5" />
                   What&apos;s Next?
                 </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  A member of our team will reach out to you within 24 hours to confirm 
                  all the details of your order and answer any questions you might have.
                </p>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <p>Please check your email for a confirmation of your order.</p>
                  <div className="pt-2 border-t border-gray-200">
                    <p className="font-medium text-gray-700 mb-1">For urgent inquiries:</p>
                    <div className="space-y-1">
                      <a href="tel:415-525-4448" className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors">
                        <Phone className="h-3 w-3" />
                        415-525-4448
                      </a>
                      <a href="mailto:catering@destinosf.com" className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors">
                        <Mail className="h-3 w-3" />
                        catering@destinosf.com
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {/* View Order Details Button - only show if we have an orderId */}
          {orderId && (
            <Link href={`/account/order/${orderId}`}>
              <Button 
                size="lg" 
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Eye className="mr-2 h-4 w-4" />
                View Order Details
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )}
          
          <Link href="/catering">
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              Return to Catering Menu
            </Button>
          </Link>
          
          <Link href="/">
            <Button 
              size="lg" 
              className="w-full sm:w-auto bg-[#2d3538] hover:bg-[#2d3538]/90 text-white"
            >
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CateringConfirmation() {
  return (
    <Suspense fallback={
      <div className="container py-12 text-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-48 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
        </div>
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
} 