import React from 'react';
import { Button } from '@/components/ui/button';
import { Order } from '@prisma/client';

// Extend Order type to include items
interface ExtendedOrder extends Order {
  items: any[];
}

interface CashPaymentDetailsProps {
  order: ExtendedOrder;
}

export const CashPaymentDetails: React.FC<CashPaymentDetailsProps> = ({ order }) => {
  const amount = parseFloat(order.total.toString());
  const storeAddress = process.env.NEXT_PUBLIC_STORE_ADDRESS || '123 Main Street, San Francisco, CA 94110';
  const storeHours = process.env.NEXT_PUBLIC_STORE_HOURS || 'Mon-Fri: 9am-6pm, Sat-Sun: 10am-5pm';
  
  return (
    <div className="space-y-6">
      <div className="p-4 bg-yellow-50 rounded-lg">
        <p className="text-sm text-yellow-700">
          You have selected to pay with cash at our store. Please bring the exact amount and
          reference your order number. Your order will be prepared after payment is received.
        </p>
      </div>
      
      <div className="space-y-4">
        <h3 className="font-medium">Payment Details:</h3>
        <ul className="space-y-1">
          <li className="flex justify-between">
            <span>Order Reference:</span>
            <span className="font-medium">#{order.id.substring(0, 8)}</span>
          </li>
          <li className="flex justify-between">
            <span>Amount Due:</span>
            <span className="font-medium">${amount.toFixed(2)}</span>
          </li>
        </ul>
      </div>
      
      <div className="space-y-3">
        <h3 className="font-medium">Store Information:</h3>
        <div className="space-y-1">
          <p>{storeAddress}</p>
          <p className="text-sm">{storeHours}</p>
        </div>
      </div>
      
      <div className="border-t pt-6 mt-6">
        <h3 className="font-medium mb-3">Important Information</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
          <li>Please bring your order reference number when you visit our store.</li>
          <li>Cash payments must be made before we can process your order.</li>
          <li>Your items will be prepared after payment is confirmed.</li>
          <li>Unpaid orders will be automatically canceled after 48 hours.</li>
        </ul>
        
        <div className="flex gap-4 mt-6">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
          >
            Return to Home
          </Button>
          
          <Button
            variant="outline" 
            onClick={() => window.location.href = `/order-status/${order.id}`}
          >
            Check Order Status
          </Button>
        </div>
      </div>
    </div>
  );
}; 