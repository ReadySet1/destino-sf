'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, User, ShoppingBag, CalendarDays, FileText } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  finalPrice?: number;
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

  useEffect(() => {
    async function loadUserData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Get user profile data from the profiles table
          const { data: profileData, error } = await supabase
            .from('profiles')
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
        <p>Loading confirmation...</p>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="max-w-lg mx-auto text-center">
        <Card className="border-2 border-green-100 shadow-md">
          <CardHeader className="pb-2">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Thank You for Your Order!</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            {userData && (
              <div className="bg-blue-50 p-4 rounded-md mb-4 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-blue-500" />
                  <h3 className="font-semibold text-blue-800">Order Placed By</h3>
                </div>
                <div className="text-sm text-blue-700 space-y-1">
                  {userData.name && <p><span className="font-medium">Name:</span> {userData.name}</p>}
                  {userData.email && <p><span className="font-medium">Email:</span> {userData.email}</p>}
                  {userData.phone && <p><span className="font-medium">Phone:</span> {userData.phone}</p>}
                </div>
              </div>
            )}
            
            {orderData && (
              <div className="bg-green-50 p-4 rounded-md mb-4 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingBag className="h-4 w-4 text-green-600" />
                  <h3 className="font-semibold text-green-800">Order Details</h3>
                </div>
                
                <div className="text-sm text-green-700 space-y-1 mb-3">
                  <div className="flex items-start">
                    <div className="bg-green-100 p-1 rounded-full mr-2">
                      <CalendarDays className="text-green-700 h-3 w-3" />
                    </div>
                    <p><span className="font-medium">Event Date:</span> {formatDate(new Date(orderData.eventDetails.eventDate))}</p>
                  </div>
                  
                  {orderData.eventDetails.specialRequests && (
                    <div className="flex items-start">
                      <div className="bg-green-100 p-1 rounded-full mr-2">
                        <FileText className="text-green-700 h-3 w-3" />
                      </div>
                      <p><span className="font-medium">Special Requests:</span> {orderData.eventDetails.specialRequests}</p>
                    </div>
                  )}
                </div>
                
                <div className="border-t border-green-200 pt-2">
                  <h4 className="font-medium text-green-800 mb-1">Items Ordered:</h4>
                  <ul className="space-y-1">
                    {orderData.items.map((item, index) => (
                      <li key={index} className="flex justify-between">
                        <span>{item.quantity}x {item.name}</span>
                        <span>{formatCurrency(item.finalPrice || (item.price * item.quantity))}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-green-200 mt-2 pt-2 font-medium flex justify-between">
                    <span>Total:</span>
                    <span>{formatCurrency(orderData.totalAmount)}</span>
                  </div>
                </div>
              </div>
            )}
            
            {isSquareRedirect && squareStatus === 'success' && (
              <div className="bg-green-50 p-4 rounded-md mb-4 text-left">
                <p className="text-green-800 font-medium">Your payment has been processed successfully!</p>
                <p className="text-sm text-green-700 mt-1">Order ID: {squareOrderId}</p>
              </div>
            )}
            
            <p className="text-gray-600 mb-4">
              Your catering order has been received and is being processed.
            </p>
            
            <div className="bg-gray-50 p-4 rounded-md mb-4">
              <h3 className="font-semibold mb-1">What&apos;s Next?</h3>
              <p className="text-sm text-gray-600">
                A member of our team will reach out to you within 24 hours to confirm 
                all the details of your order and answer any questions you might have.
              </p>
            </div>
            
            <div className="text-sm text-gray-600 space-y-1">
              <p>Please check your email for a confirmation of your order.</p>
              <p>
                For urgent inquiries, contact us at <span className="font-semibold">415-525-4448</span> or email us at{' '}
                <a href="mailto:catering@destinosf.com" className="text-blue-600 hover:underline">
                  catering@destinosf.com
                </a>
              </p>
            </div>
          </CardContent>
          <CardFooter className="justify-center space-x-4 pt-2">
            <Link href="/catering">
              <Button variant="outline">Return to Catering Menu</Button>
            </Link>
            <Link href="/">
              <Button className="bg-[#2d3538] hover:bg-[#2d3538]/90">Back to Home</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function CateringConfirmation() {
  return (
    <Suspense fallback={<div className="container py-12 text-center">Loading...</div>}>
      <ConfirmationContent />
    </Suspense>
  );
} 