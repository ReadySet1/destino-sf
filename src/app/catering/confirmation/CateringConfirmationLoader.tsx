'use client';

import { useEffect, useState } from 'react';
import CateringConfirmationContent from './CateringConfirmationContent';
import { logger } from '@/utils/logger';

// Type for serialized catering order data from API
export type SerializableCateringOrderData = {
  id: string;
  status: string;
  totalAmount: number;
  name: string;
  email: string;
  phone: string;
  eventDate: Date;
  numberOfPeople: number;
  specialRequests: string | null;
  deliveryZone: string | null;
  deliveryAddress: string | null;
  deliveryAddressJson: any | null;
  createdAt: Date;
  paymentStatus: string;
  paymentMethod: string;
  squareOrderId: string | null;
  retryCount: number | null;
  lastRetryAt: Date | null;
  paymentUrl: string | null;
  paymentUrlExpiresAt: Date | null;
  items: {
    id: string;
    itemName: string;
    quantity: number;
    pricePerUnit: number;
    totalPrice: number;
    itemType: string;
    notes: string | null;
  }[];
} | null;

interface CateringConfirmationLoaderProps {
  urlStatus: string;
  orderId: string | null;
  squareOrderId: string | null;
}

export default function CateringConfirmationLoader({ 
  urlStatus, 
  orderId, 
  squareOrderId 
}: CateringConfirmationLoaderProps) {
  const [orderData, setOrderData] = useState<SerializableCateringOrderData>(null);
  const [actualStatus, setActualStatus] = useState<string>(urlStatus);
  const [loading, setLoading] = useState<boolean>(!!orderId);
  const [error, setError] = useState<string | null>(null);

  // Validate UUID format
  const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  useEffect(() => {
    async function fetchOrderData() {
      if (!orderId) {
        setLoading(false);
        if (urlStatus) {
          setActualStatus('invalid');
        }
        return;
      }

      // Validate UUID format before making request
      if (!isValidUUID(orderId)) {
        logger.warn(`[CATERING] Invalid UUID format for orderId: ${orderId}`);
        setActualStatus('not_found');
        setLoading(false);
        return;
      }

      try {
        logger.info(`[CATERING] Fetching catering order details for ID: ${orderId}`);
        
        // Create a timeout for the fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 12000); // 12 second timeout

        const response = await fetch(`/api/catering/order/${orderId}`, {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          
          if (response.status === 404) {
            setActualStatus('not_found');
          } else if (response.status === 504 || errorData.code === 'TIMEOUT') {
            setError('Request timed out. Please refresh the page to try again.');
            setActualStatus('error');
          } else {
            setError(errorData.error || 'Failed to load order data');
            setActualStatus('error');
          }
          return;
        }

        const data = await response.json();
        
        if (!data.order) {
          setActualStatus('not_found');
          return;
        }

        // Convert date strings back to Date objects
        const processedOrder = {
          ...data.order,
          eventDate: new Date(data.order.eventDate),
          createdAt: new Date(data.order.createdAt),
          lastRetryAt: data.order.lastRetryAt ? new Date(data.order.lastRetryAt) : null,
          paymentUrlExpiresAt: data.order.paymentUrlExpiresAt ? new Date(data.order.paymentUrlExpiresAt) : null,
        };

        setOrderData(processedOrder);
        setActualStatus(data.status);
        
        logger.info(`[CATERING] Successfully loaded order with ${data.order.items.length} items`);
        
      } catch (fetchError) {
        logger.error(`[CATERING] Error fetching catering order ${orderId}:`, fetchError);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          setError('Request timed out. Please refresh the page to try again.');
        } else {
          setError('Failed to load order data. Please try again.');
        }
        setActualStatus('error');
        
      } finally {
        setLoading(false);
      }
    }

    fetchOrderData();
  }, [orderId, urlStatus]);

  // Show loading state
  if (loading) {
    return (
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-lg rounded-lg border bg-white p-8 shadow-md">
          <div className="mb-8 text-center">
            <div className="mb-4 text-5xl">🔄</div>
            <h1 className="mb-4 text-2xl font-bold">Loading Catering Order Details...</h1>
            <p className="text-gray-600">Please wait while we retrieve your catering order information.</p>
          </div>
        </div>
      </main>
    );
  }

  // Show error state with retry option
  if (error) {
    return (
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-lg rounded-lg border bg-white p-8 shadow-md">
          <div className="mb-8 text-center">
            <div className="mb-4 text-5xl">⚠️</div>
            <h1 className="mb-4 text-2xl font-bold">Unable to Load Order</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/catering'}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
              >
                Back to Catering
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  logger.info(`[CATERING] Rendering confirmation with status: ${actualStatus}, Order: ${orderData ? 'Available' : 'Not available'}`);

  return (
    <CateringConfirmationContent 
      status={actualStatus} 
      orderData={orderData} 
      squareOrderId={squareOrderId}
    />
  );
}
