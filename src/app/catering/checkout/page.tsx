import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { CateringCheckoutClient } from '@/components/Catering/CateringCheckoutClient';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogInIcon, UserIcon } from 'lucide-react';
import Link from 'next/link';
import { getUserProfile } from '@/utils/auth-optimized';
import { measurePerformance } from '@/utils/performance';
import { PageErrorBoundary } from '@/components/ErrorBoundary';

export default async function CateringCheckoutPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  console.log('🔍 Catering Checkout - User from Supabase:', user ? { id: user.id, email: user.email } : 'No user found');
  
  let userData = null;
  let isLoggedIn = false;

  if (user) {
    // Use the optimized cached profile function with performance monitoring
    const profileResult = await measurePerformance(
      'getUserProfile',
      () => getUserProfile(user.id)
    );
    
    isLoggedIn = profileResult.isLoggedIn;
    userData = profileResult.userData;
    
    // Fallback to auth email if no profile email
    if (userData && !userData.email && user.email) {
      userData.email = user.email;
    }
    
    console.log('📊 Optimized profile fetch result:', { isLoggedIn, userData });
  }

  return (
    <PageErrorBoundary>
      <div className="bg-gray-50 min-h-screen pb-20">
        <div className="bg-[#2d3538] py-6 mb-8">
          <div className="container mx-auto px-4">
            <h1 className="text-2xl md:text-3xl font-bold text-white">Complete Your Catering Order</h1>
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
                </Link> to pre-fill your contact information.
              </AlertDescription>
            </Alert>
          )}
          
          <CateringCheckoutClient userData={userData} isLoggedIn={isLoggedIn} />
        </div>
      </div>
    </PageErrorBoundary>
  );
} 