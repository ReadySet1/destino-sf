import React from 'react';
import { CateringCheckoutClient } from '@/components/Catering/CateringCheckoutClient';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogInIcon, UserIcon } from 'lucide-react';
import Link from 'next/link';
import { getAuthenticatedUserProfile } from '@/app/actions/auth';
import { measurePerformance } from '@/utils/performance';
import { PageErrorBoundary } from '@/components/ErrorBoundary';

// Force dynamic rendering to allow cookie usage
export const dynamic = 'force-dynamic';

export default async function CateringCheckoutPage() {
  // Use the new Server Action to safely handle authentication and cookie operations
  const { isLoggedIn, userData, error } = await measurePerformance(
    'getAuthenticatedUserProfile',
    () => getAuthenticatedUserProfile()
  );

  console.log('📊 Auth profile fetch result:', { isLoggedIn, userData, error });

  return (
    <PageErrorBoundary>
      <div className="bg-gray-50 min-h-screen pb-20">
        <div className="bg-[#2d3538] py-6 mb-8">
          <div className="container mx-auto px-4">
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Complete Your Catering Order
            </h1>
            <p className="text-gray-300 mt-2">
              Please provide your details to complete your order.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4">
          {!isLoggedIn && (
            <Alert className="mb-6 bg-blue-50 border-blue-200">
              <UserIcon className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <Link href="/sign-in?redirect=/catering/checkout" className="font-medium underline">
                  Log in to your account
                </Link>{' '}
                to pre-fill your contact information.
              </AlertDescription>
            </Alert>
          )}

          <CateringCheckoutClient userData={userData} isLoggedIn={isLoggedIn} />
        </div>
      </div>
    </PageErrorBoundary>
  );
}
