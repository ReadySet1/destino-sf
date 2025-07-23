'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { OrderConfirmationLayout } from '@/components/shared/OrderConfirmationLayout';
import type { CateringOrderData, CustomerInfo } from '@/types/confirmation';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  finalPrice?: number;
  image?: string;
  pricePerUnit?: number;
  totalPrice?: number;
  metadata?: {
    type: 'item' | 'package';
    minPeople?: number;
  };
}

interface OrderData {
  id: string;
  items: OrderItem[];
  totalAmount: number;
  eventDetails: {
    eventDate: string;
    specialRequests?: string;
  };
}

interface UserData {
  name?: string;
  email?: string;
  phone?: string;
}

function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Extract URL parameters
  const orderId = searchParams.get('orderId');
  const squareStatus = searchParams.get('status');
  const squareOrderId = searchParams.get('squareOrderId');
  const isSquareRedirect = !!(squareStatus && squareOrderId);

  // State
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUserData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setUserData({
            name: user.user_metadata?.name || '',
            email: user.email || '',
            phone: user.user_metadata?.phone || '',
          });
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

  // Transform orderData to match CateringOrderData interface
  const transformedOrderData: CateringOrderData | null = orderData
    ? {
        id: orderData.id,
        status: 'confirmed',
        total: orderData.totalAmount,
        customerName: userData?.name || '',
        createdAt: new Date().toISOString(),
        eventDetails: orderData.eventDetails,
        items: orderData.items,
        totalAmount: orderData.totalAmount,
      }
    : null;

  // Extract customer info
  const customerData: CustomerInfo = userData || {};

  // Payment details for Square redirect
  const paymentDetails = {
    isSquareRedirect,
    squareStatus: squareStatus || undefined,
    squareOrderId: squareOrderId || undefined,
  };

  return (
    <OrderConfirmationLayout
      orderType="catering"
      status={squareStatus === 'success' ? 'success' : 'confirmed'}
      orderData={transformedOrderData}
      customerData={customerData}
      paymentDetails={paymentDetails}
    />
  );
}

export default function CateringConfirmation() {
  return (
    <Suspense
      fallback={
        <div className="container py-12 text-center">
          <div className="animate-pulse">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-48 mx-auto mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
          </div>
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
