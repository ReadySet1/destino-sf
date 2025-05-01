// Remove 'use client' - this is now a Server Component
// import { useState, useEffect } from 'react'; // Remove client hooks
// import { useRouter } from 'next/navigation'; // Remove client hooks
// import { useForm, Controller, FieldErrors, UseFormReturn } from 'react-hook-form'; // Move to CheckoutForm
// import { zodResolver } from '@hookform/resolvers/zod'; // Move to CheckoutForm
// import * as z from 'zod'; // Move schema definition if fully contained in CheckoutForm

// --- Keep necessary server imports ---
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server'; // Use server client
import { prisma } from '@/lib/prisma'; // Import Prisma
// import { cookies } from 'next/headers'; // No longer needed here

// --- Import Components ---
// Import the new client component
import { CheckoutForm } from '@/components/Store/CheckoutForm'; 
// CheckoutSummary will be rendered inside CheckoutForm now
// import { CheckoutSummary } from '@/components/Store/CheckoutSummary'; 
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserIcon, LogInIcon, UserPlusIcon } from 'lucide-react';
// Date utils might not be needed here anymore if form defaults handled in client component
// import { format } from 'date-fns'; 
// import { getEarliestPickupDate, getPickupTimeSlots } from '@/lib/dateUtils';

// --- Remove client-side state hooks and schema definitions ---
// These are moved to CheckoutForm.tsx

// --- Define the Page Component (async for data fetching) ---
export default async function CheckoutPage() {
  // const cookieStore = cookies(); // No longer needed here
  // Call server client without arguments and await it
  const supabase = await createClient(); 

  // --- Server-side data fetching ---
  let initialUserData: { id: string; email: string; name: string | null; phone: string | null; } | null = null;
  
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          email: true, // Fetch email from profile as well, might be more up-to-date
          name: true,
          phone: true,
        }
      });
      if (profile) {
        initialUserData = {
            id: profile.id,
            // Prioritize profile email, fallback to auth email if profile email is null/missing
            email: profile.email || session.user.email || '', 
            name: profile.name,
            phone: profile.phone,
        };
      } else {
          // Handle case where profile doesn't exist but user does
          initialUserData = {
              id: session.user.id,
              email: session.user.email || '',
              name: null,
              phone: null,
          };
          console.warn(`No profile found for user ID: ${session.user.id}. Using auth email only.`);
      }
    } catch (error) {
        console.error("Error fetching profile data with Prisma:", error);
        // Fallback to using only auth data if Prisma fails
         initialUserData = {
             id: session.user.id,
             email: session.user.email || '',
             name: null,
             phone: null,
         };
    }
  }
  // --- End server-side data fetching ---

  // --- Remove client-side logic (effects, form handling, state) ---
  // This logic is now in CheckoutForm.tsx

  // --- Render Page Structure ---
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>

      {/* Authentication Status Alerts (using server-fetched data) */}
      {!initialUserData ? (
        <Alert variant="default" className="mb-6 bg-blue-50 border-blue-200">
          <UserIcon className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            Have an account?{' '}
            <Link href="/login?redirect=/checkout" className="font-medium text-blue-600 hover:underline">
              <LogInIcon className="inline h-4 w-4 mr-1" />Log in
            </Link>
            {' '}for faster checkout or{' '}
            <Link href="/signup?redirect=/checkout" className="font-medium text-blue-600 hover:underline">
              <UserPlusIcon className="inline h-4 w-4 mr-1" />Sign up
            </Link>.
            You can also continue as a guest.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="default" className="mb-6 bg-green-50 border-green-200">
          <UserIcon className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            Logged in as {initialUserData.email}. Your details have been pre-filled.
          </AlertDescription>
        </Alert>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Render the Client Component with initial data */}
        {/* The CheckoutForm now likely includes the CheckoutSummary internally */}
        <CheckoutForm initialUserData={initialUserData} />

        {/* Checkout Summary is now part of CheckoutForm which needs client-side cart state */}
         {/* <div className="lg:col-span-1"> */}
           {/* {isMounted ? ( // isMounted needs to be handled in client component */}
             {/* <CheckoutSummary items={items} includeServiceFee={true} /> */}
           {/* ) : ( */}
             {/* <p>Loading cart summary...</p> */}
           {/* )} */}
         {/* </div> */}
      </div>
    </div>
  );
}
