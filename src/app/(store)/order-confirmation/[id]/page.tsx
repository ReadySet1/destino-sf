import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Check, Calendar, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/prisma';

interface OrderConfirmationPageProps {
  params: {
    id: string;
  };
}

export default async function OrderConfirmationPage({ params }: OrderConfirmationPageProps) {
  // Get order from database
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: true
    }
  });
  
  if (!order) {
    return notFound();
  }
  
  // Format pickup date and time
  const pickupDate = format(new Date(order.pickupTime), 'EEEE, MMMM d, yyyy');
  const pickupTime = format(new Date(order.pickupTime), 'h:mm a');
  
  return (
    <main className="container mx-auto py-12">
      <div className="mx-auto max-w-2xl rounded-lg border bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          
          <h1 className="mb-2 text-3xl font-bold">Order Confirmed!</h1>
          <p className="text-gray-600">
            Thank you for your order. Your confirmation number is:
          </p>
          <p className="mt-2 text-xl font-bold text-yellow-600">#{order.id.slice(-8).toUpperCase()}</p>
        </div>
        
        <div className="mb-8 rounded-lg bg-gray-50 p-6">
          <h2 className="mb-4 text-xl font-semibold">Pickup Details</h2>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <Calendar className="mr-3 h-5 w-5 flex-shrink-0 text-gray-500" />
              <div>
                <p className="font-medium">Date</p>
                <p className="text-gray-600">{pickupDate}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <Clock className="mr-3 h-5 w-5 flex-shrink-0 text-gray-500" />
              <div>
                <p className="font-medium">Time</p>
                <p className="text-gray-600">{pickupTime}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <MapPin className="mr-3 h-5 w-5 flex-shrink-0 text-gray-500" />
              <div>
                <p className="font-medium">Location</p>
                <p className="text-gray-600">DESTINO SF</p>
                <p className="text-gray-600">377 Cortland Ave</p>
                <p className="text-gray-600">San Francisco, CA 94110</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">Order Summary</h2>
          
          <div className="mb-4 space-y-2 divide-y rounded-lg border">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between p-4">
                <div>
                  <p className="font-medium">
                    {item.quantity} x Product Name
                  </p>
                  {item.variantId && (
                    <p className="text-sm text-gray-500">
                      {/* Display variant name if available */}
                    </p>
                  )}
                </div>
                <p className="font-medium">${item.price.toFixed(2)}</p>
              </div>
            ))}
          </div>
          
          <div className="space-y-2 rounded-lg border p-4">
            <div className="flex justify-between">
              <p>Subtotal</p>
              <p>${order.total.toFixed(2)}</p>
            </div>
            
            <div className="flex justify-between">
              <p>Tax</p>
              <p>${(order.total * 0.0825).toFixed(2)}</p>
            </div>
            
            <div className="flex justify-between border-t pt-2 font-bold">
              <p>Total</p>
              <p>${(order.total * 1.0825).toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          <p>
            A confirmation email has been sent to {order.email}. If you have any
            questions about your order, please contact us at james@destinosf.com or
            call (415) 757-0177.
          </p>
        </div>
        
        <div className="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full">
              Return to Home
            </Button>
          </Link>
          
          <Link href="/menu" className="flex-1">
            <Button className="w-full">
              Order More
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
