import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { db } from '@/lib/db';
import { CateringCheckoutClient } from '@/components/Catering/CateringCheckoutClient';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogInIcon, UserIcon } from 'lucide-react';
import Link from 'next/link';

export default async function CateringCheckoutPage() {
  const supabase = await createClient();
  let userData: { id?: string; name?: string; email?: string; phone?: string } | null = null;
  
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    try {
      const profile = await db.profile.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        }
      });
      
      if (profile) {
        userData = {
          id: profile.id,
          name: profile.name || '',
          email: profile.email || user.email || '',
          phone: profile.phone || '',
        };
      } else {
        userData = {
          id: user.id,
          email: user.email || '',
        };
        console.warn(`No profile found for user ID: ${user.id}. Using auth email only.`);
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);
      userData = {
        id: user.id,
        email: user.email || '',
      };
    }
  }

  const isLoggedIn = !!user;

  return (
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
              <Link href="/auth/login?redirect=/catering/checkout" className="font-medium underline">
                Log in to your account
              </Link> to pre-fill your contact information.
            </AlertDescription>
          </Alert>
        )}
        
        <CateringCheckoutClient userData={userData} isLoggedIn={isLoggedIn} />
      </div>
    </div>
  );
} 