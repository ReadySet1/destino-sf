import React from 'react';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { updateOrderPayment } from '@/app/actions/orders';
import { QRCodeSVG } from 'qrcode.react';
import { Order } from '@prisma/client';

// Extend Order type to include items
interface ExtendedOrder extends Order {
  items: any[];
}

interface VenmoPaymentDetailsProps {
  order: ExtendedOrder;
}

export const VenmoPaymentDetails: React.FC<VenmoPaymentDetailsProps> = ({ order }) => {
  // Business Venmo username
  const venmoUsername = process.env.NEXT_PUBLIC_VENMO_USERNAME || 'destinosf';
  
  // Create a Venmo deep link
  const amount = parseFloat(order.total.toString());
  const note = `Order #${order.id.substring(0, 8)}`;
  
  // Encode for URL
  const encodedNote = encodeURIComponent(note);
  
  // Build Venmo deep link URL for mobile
  const venmoAppUrl = `venmo://paycharge?txn=pay&recipients=${venmoUsername}&amount=${amount}&note=${encodedNote}`;
  
  // Build Venmo web URL for desktop
  const venmoWebUrl = `https://venmo.com/?txn=pay&audience=private&recipients=${venmoUsername}&amount=${amount}&note=${encodedNote}`;
  
  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          After sending payment via Venmo, our team will manually verify and confirm your order.
          You&apos;ll receive an email confirmation once your payment is processed.
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Image 
            src="/images/venmo-logo.png" 
            alt="Venmo Logo" 
            width={32} 
            height={32}
            className="rounded"
          />
          <span className="font-medium">Send payment to: @{venmoUsername}</span>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <p className="font-medium">Payment Details:</p>
            <ul className="space-y-1 text-sm">
              <li><span className="font-medium">Amount:</span> ${amount.toFixed(2)}</li>
              <li><span className="font-medium">Reference:</span> {note}</li>
              <li className="text-red-500 font-medium">Please include the order reference in the note!</li>
            </ul>
            
            <div className="space-y-2 pt-3">
              <a
                href={venmoAppUrl}
                className="block w-full bg-[#3D95CE] hover:bg-[#3687BA] text-white py-3 rounded text-center"
              >
                Open in Venmo App
              </a>
              
              <a
                href={venmoWebUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 rounded text-center"
              >
                Pay on Venmo Website
              </a>
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center p-4 bg-white border rounded-lg">
            <p className="mb-3 text-sm text-center">Scan with your phone camera</p>
            <QRCodeSVG value={venmoWebUrl} size={180} />
          </div>
        </div>
      </div>
      
      <div className="border-t pt-6 mt-6">
        <h3 className="font-medium mb-3">Already Sent Payment?</h3>
        <p className="text-sm text-gray-600 mb-4">
          If you&apos;ve already sent payment via Venmo, please check your email for a confirmation. 
          Our team will verify the payment and update your order status.
        </p>
        
        <div className="flex gap-4">
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