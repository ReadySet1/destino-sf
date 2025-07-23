import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BoxedLunchMenu } from '@/components/Catering/BoxedLunchMenu';
import CateringCartButton from '@/components/Catering/CateringCartButton';
import { Toaster } from 'react-hot-toast';

export const dynamic = 'force-dynamic';

const BrowseOptionsPage = () => {
  return (
    <div className="bg-white min-h-screen">
      {/* Add the CateringCartButton component */}
      <CateringCartButton />

      {/* Toaster for notifications */}
      <Toaster position="top-right" />

      {/* Header with navigation */}
      <div className="bg-gray-50 border-b">
        <div className="max-w-[1300px] mx-auto px-6 md:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link href="/catering">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Catering
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                Browse Catering Options
              </h1>
              <p className="text-gray-600 mt-1">
                Explore our complete selection of boxed lunch packages and add-ons
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-[1300px] mx-auto px-6 md:px-8 py-12">
        <BoxedLunchMenu />
      </main>

      {/* Call to Action Footer */}
      <div className="bg-gray-50 mt-16">
        <div className="max-w-[1300px] mx-auto px-6 md:px-8 py-12">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Ready to Place Your Order?</h3>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Have questions about our boxed lunch options or need help with a custom order? Our
              catering team is here to help make your event perfect.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/catering/checkout">
                <Button size="lg" className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3">
                  Proceed to Checkout
                </Button>
              </Link>
              <Link href="/contact-catering">
                <Button variant="outline" size="lg" className="px-8 py-3">
                  Contact Catering Team
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowseOptionsPage;
